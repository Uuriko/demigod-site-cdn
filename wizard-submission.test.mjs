import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Run the actual Send and Back handlers with fake Webflow status elements and a
// deterministic clock. Requests are counted locally and never leave this process.
const source = readFileSync(process.env.DEMIGOD_FOOT_SOURCE || new URL('./foot-latest.js', import.meta.url), 'utf8');
function between(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing runtime boundaries: ${start}`);
  return source.slice(from, to);
}
const helpers = between('/* ==== SECTION: WIZ runtime', '/* === WIZ BUILD & OWNERSHIP');
const config = between('var WIZ_CFG=', '/* ==== SECTION: WIZ_Q');
const next = between('  nextBtn.onclick = function(ev)', '  backBtn.onclick');
const back = source.match(/^  backBtn\.onclick = .*$/m)?.[0];
const stepEntry = between('  function showStep(idx) {', '    try {');

function fixture({ kind = 'startup', missing = false, disabled = false, throws = false, observerFails = false } = {}) {
  let time = 0, timerId = 0, requests = 0, rawSubmits = 0;
  const timers = new Map(), observers = [], fields = [], messages = [];
  const element = () => ({
    attributes: {}, textContent: '', disabled: false,
    style: { display: 'none', visibility: 'visible', removeProperty(name) { delete this[name]; } },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    focus() {},
    remove() { const i = messages.indexOf(this); if (i >= 0) messages.splice(i, 1); },
  });
  const done = element(), failed = element(), review = element(), live = element();
  const edit = element(), nextBtn = element(), backBtn = element();
  const statusQuery = selector => selector.includes('.w-form-done') ? done : selector.includes('.w-form-fail') ? failed : null;
  const modal = { id: kind === 'startup' ? 'startup-modal' : 'jobseeker-modal', querySelector: statusQuery };
  const wrapper = { querySelector: statusQuery, children: [], closest: () => null };
  done.parentElement = failed.parentElement = wrapper;
  const form = {
    ...element(), dataset: { dgWizKey: '__submit__' }, answers: { role: 'Founding engineer', result: 'Ship the first product release' },
    parentElement: wrapper, isConnected: true,
    closest: () => modal,
    querySelector(selector) {
      if (selector === '.dg-wiz-review') return review;
      if (selector === '.dg-wiz-err') return messages[0] || null;
      if (selector === '.dg-wiz-live') return live;
      const name = selector.match(/\[name="([^"]+)"\]/)?.[1];
      return fields.find(field => field.name === name) || null;
    },
    insertBefore(node) { node.parentNode = form; messages.push(node); },
    appendChild(node) { this.insertBefore(node); },
    submit() { rawSubmits++; },
  };
  wrapper.children = [form, done, failed];
  const nativeSub = missing ? null : {
    ...element(), disabled,
    click() { requests++; if (throws) throw new Error('Submission unavailable'); },
  };
  const context = vm.createContext({
    form, nativeSub, nextBtn, backBtn, kind, nav: { parentNode: form },
    reviewReturn: -1, reviewEditStep: -1,
    STARTUP_OK: '', ENGINEER_OK: '',
    Date: { now: () => time },
    qa(selector) {
      if (selector === 'input,select,textarea') return fields;
      if (selector === '.w-form-done,.w-form-fail') return [done, failed];
      if (selector === '.dg-wiz-edit') return [edit];
      return [];
    },
    collect() {}, normalizeUrl() {}, scrubTimeClaims() {}, successCta() {},
    wizInlineInvalid(field) { field.errorShown = true; },
    getComputedStyle: el => el.style,
    document: { createElement: element },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() { if (observerFails) throw new Error('Observer unavailable'); this.active = true; }
      disconnect() { this.active = false; }
    },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, due: time + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  vm.runInContext(config + helpers, context);
  context.steps = context.WIZ_CFG[kind].steps;
  context.cfg = context.WIZ_CFG[kind];
  context.current = context.steps.findIndex(([key]) => key === '__submit__');
  vm.runInContext(stepEntry + 'form.dataset.dgWizKey = steps[current][0];\n}\n' + next + back, context);
  const advance = ms => {
    const target = time + ms;
    while (true) {
      const ready = [...timers].filter(([, t]) => t.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
      if (!ready) break;
      const [id, timer] = ready;
      time = timer.due; timers.delete(id); timer.callback();
    }
    time = target;
  };
  return {
    form, nativeSub, nextBtn, backBtn, edit, fields, context, timers,
    send: () => nextBtn.onclick({ preventDefault() {} }),
    back: () => backBtn.onclick({ preventDefault() {} }),
    advance,
    result(state) {
      done.style.display = state === 'success' ? 'block' : 'none';
      failed.style.display = state === 'failed' ? 'block' : 'none';
      observers.filter(o => o.active).forEach(o => o.callback());
    },
    get message() { return messages[0]?.textContent || ''; },
    get requests() { return requests; },
    get rawSubmits() { return rawSubmits; },
  };
}

for (const kind of ['startup', 'engineer']) {
  test(`${kind}: a missing submit control never fabricates success or uses raw submit`, () => {
    const f = fixture({ kind, missing: true });
    f.send(); f.advance(15000);
    assert.equal(f.rawSubmits, 0);
    assert.equal(f.form.dataset.dgWizKey, '__submit__');
    assert.match(f.message, /not ready/);
    assert.equal(f.nextBtn.disabled, false);
  });

  test(`${kind}: only confirmed Webflow success reaches thanks`, () => {
    const f = fixture({ kind });
    f.send(); f.advance(1000);
    assert.equal(f.requests, 1);
    assert.equal(f.form.dataset.dgWizKey, '__submit__');
    assert.equal(f.form.attributes['aria-busy'], 'true');
    f.result('success'); f.advance(250);
    assert.equal(f.form.dataset.dgWizKey, '__thanks__');
    assert.equal(f.form.dataset.dgSubmitting, undefined);
    assert.equal(f.form.attributes['aria-busy'], undefined);
    assert.equal(f.requests, 1);
  });
}

test('slow responses keep Send locked rather than permitting a duplicate', () => {
  const f = fixture();
  f.send(); f.advance(7000); f.send(); f.advance(100);
  assert.equal(f.requests, 1);
  assert.equal(f.form.dataset.dgSubmitting, '1');
  assert.equal(f.nextBtn.disabled, true);
});

test('an unconfirmed send remains locked and a late response can still confirm it', () => {
  const f = fixture();
  f.send(); f.advance(35000);
  assert.equal(f.form.dataset.dgSubmitState, 'unconfirmed');
  assert.match(f.message, /waiting for confirmation/);
  assert.equal(f.form.dataset.dgWizKey, '__submit__');
  f.send();
  assert.equal(f.requests, 1);
  f.result('success'); f.advance(1000);
  assert.equal(f.form.dataset.dgWizKey, '__thanks__');
  assert.equal(f.form.dataset.dgSubmitState, 'success');
});

test('confirmed failure preserves answers and permits one explicit retry', () => {
  const f = fixture();
  const answers = JSON.stringify(f.form.answers);
  f.send(); f.advance(250); f.result('failed'); f.advance(250);
  assert.equal(f.form.dataset.dgWizKey, '__submit__');
  assert.equal(JSON.stringify(f.form.answers), answers);
  assert.equal(f.nextBtn.disabled, false);
  assert.match(f.message, /failed/);
  f.send(); f.advance(100);
  assert.equal(f.requests, 2);
  assert.equal(f.form.dataset.dgSubmitting, '1');
});

test('a previous attempt cannot unlock a later in-flight retry', () => {
  const f = fixture();
  f.send(); f.advance(250); f.result('failed'); f.advance(250);
  f.send(); f.advance(11500);
  assert.equal(f.form.dataset.dgSubmitting, '1');
  f.send();
  assert.equal(f.requests, 2);
});

test('a throwing submit control does not fall back to raw form submission', () => {
  const f = fixture({ throws: true });
  f.send(); f.advance(1000);
  assert.equal(f.rawSubmits, 0);
  assert.equal(f.form.dataset.dgWizKey, '__submit__');
  assert.equal(f.form.dataset.dgSubmitting, undefined);
  assert.equal(f.nextBtn.disabled, false);
  assert.match(f.message, /failed/);
});

test('an upload-disabled native submit is not treated as a sent request', () => {
  const f = fixture({ disabled: true });
  f.send(); f.advance(1000);
  assert.equal(f.requests, 0);
  assert.equal(f.form.dataset.dgSubmitting, undefined);
  assert.match(f.message, /upload/);
});

test('invalid restored answers return to their question before any request', () => {
  const f = fixture();
  const field = { name: 'contact-email', willValidate: true, validity: { valid: false }, validationMessage: 'Enter an email address.' };
  f.fields.push(field);
  f.send(); f.advance(1000);
  assert.equal(f.requests, 0);
  assert.equal(f.form.dataset.dgWizKey, 'contact-email');
  assert.equal(field.errorShown, true);
});

test('Back and step changes cannot move away from an in-flight review', () => {
  const f = fixture();
  f.send(); f.advance(100);
  assert.equal(f.backBtn.disabled, true);
  assert.equal(f.edit.disabled, true);
  f.back();
  assert.equal(f.form.dataset.dgWizKey, '__submit__');
  f.context.showStep(0);
  assert.equal(f.form.dataset.dgWizKey, '__submit__');
});

test('late results still resolve when the observer cannot start', () => {
  const f = fixture({ observerFails: true });
  f.send(); f.advance(35000);
  assert.equal(f.form.dataset.dgSubmitting, '1');
  f.result('success'); f.advance(1000);
  assert.equal(f.form.dataset.dgWizKey, '__thanks__');
  assert.equal(f.form.dataset.dgSubmitState, 'success');
});
