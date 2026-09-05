import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the shipped choice, Continue, Back, step-entry, and close handlers with
// a deterministic clock. No browser, network, or real form submission is needed.
const source = readFileSync(process.env.DEMIGOD_FOOT_SOURCE || new URL('./foot-latest.js', import.meta.url), 'utf8');
const between = (start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing runtime boundaries: ${start}`);
  return source.slice(from, to);
};
const helpers = between('/* ==== SECTION: WIZ runtime', '/* === WIZ BUILD & OWNERSHIP');
const config = between('var WIZ_CFG=', '/* ==== SECTION: WIZ_Q');
const choice = source.match(/b\.addEventListener\('click', function\(\)\{([\s\S]*?)\n            \}\);/);
assert.ok(choice, 'Missing choice click handler');
const next = between('  nextBtn.onclick = function(ev)', '  backBtn.onclick');
const back = source.match(/^  backBtn\.onclick = .*$/m)?.[0];
const hide = source.match(/^function hide\(f\).*$/m)?.[0];
assert.ok(back && hide, 'Missing Back or modal-close handler');
const stepEntry = between('  function showStep(idx) {', '    try {');

function fixture(kind = 'startup', editing = false) {
  let time = 0, timerId = 0, clicks = 0, sends = 0;
  const timers = new Map();
  const modal = {
    id: kind === 'startup' ? 'startup-modal' : 'jobseeker-modal',
    inert: false,
    hidden: 'false',
    getAttribute() { return this.hidden; },
    setAttribute(name, value) { if (name === 'aria-hidden') this.hidden = value; },
    style: { setProperty() {} },
  };
  const select = {
    name: kind === 'startup' ? 'salary-range' : 'salary-expectation',
    value: '160-190k', tagName: 'SELECT', type: 'select-one',
    checkValidity: () => true, dispatchEvent() {},
  };
  const form = {
    dataset: { dgWizKey: select.name },
    isConnected: true,
    closest: () => modal,
    querySelector: (selector) => selector.includes('[name="') ? select : null,
  };
  const nextBtn = {
    disabled: false,
    focus() {},
    click() {
      clicks++;
      // A delayed click on review is exactly the unintended send under test.
      if (form.dataset.dgWizKey === '__submit__') sends++;
      else this.onclick({ preventDefault() {} });
    },
  };
  const context = vm.createContext({
    form, stepSelect: select, nextBtn, backBtn: {}, kind,
    OPEN: '#' + modal.id, S: '#startup-modal', J: '#jobseeker-modal',
    opt: { value: select.value }, box: {},
    qa: (selector) => selector === 'form' ? [form] : [],
    q: (selector) => selector === '#' + modal.id ? modal : null,
    collect() {}, normalizeUrl() {}, restoreModalBackground() {}, detachTrap() {},
    document: { body: null, documentElement: null },
    Event: class {}, STARTUP_OK: '', ENGINEER_OK: '',
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { callback, due: time + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  });
  vm.runInContext(config + helpers, context);
  context.steps = context.WIZ_CFG[kind].steps;
  context.cfg = context.WIZ_CFG[kind];
  context.current = context.steps.findIndex(([key]) => key === select.name);
  context.reviewReturn = editing ? context.steps.findIndex(([key]) => key === '__submit__') : -1;
  context.reviewEditStep = editing ? context.current : -1;
  // Run the real entry logic; presentation after collect() is irrelevant here.
  vm.runInContext(stepEntry + 'form.dataset.dgWizKey = steps[current][0];\n}\n' + next + back + hide, context);
  const choose = () => vm.runInContext('(function(){' + choice[1] + '})()', context);
  const advance = (ms) => {
    const target = time + ms;
    while (true) {
      const ready = [...timers].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
      if (!ready) break;
      const [id, timer] = ready;
      time = timer.due;
      timers.delete(id);
      timer.callback();
    }
    time = target;
  };
  return {
    context, form, modal, select, nextBtn, choose, advance, timers,
    next: () => nextBtn.click(),
    back: () => context.backBtn.onclick({ preventDefault() {} }),
    close: () => context.hide(true),
    get clicks() { return clicks; },
    get sends() { return sends; },
  };
}

for (const kind of ['startup', 'engineer']) {
  test(`${kind}: a choice advances one question after 200ms`, () => {
    const f = fixture(kind);
    f.choose();
    f.advance(199);
    assert.equal(f.clicks, 0);
    f.advance(1);
    assert.equal(f.form.dataset.dgWizKey, kind === 'startup' ? 'contact-email' : 'resume');
    f.advance(500);
    assert.equal(f.clicks, 1);
    assert.equal(f.sends, 0);
  });

  test(`${kind}: editing a choice returns to review without sending`, () => {
    const f = fixture(kind, true);
    f.choose();
    f.advance(500);
    assert.equal(f.form.dataset.dgWizKey, '__submit__');
    assert.equal(f.clicks, 1);
    assert.equal(f.sends, 0);
  });

  test(`${kind}: quick Continue after a choice cannot submit from review`, () => {
    const f = fixture(kind, true);
    f.choose();
    f.next();
    assert.equal(f.form.dataset.dgWizKey, '__submit__');
    f.advance(500);
    assert.equal(f.clicks, 1);
    assert.equal(f.sends, 0);
    f.next();
    assert.equal(f.sends, 1, 'an explicit Send on review remains available');
  });
}

test('Back cancels the pending choice instead of undoing navigation', () => {
  const f = fixture();
  f.choose();
  f.back();
  const previous = f.form.dataset.dgWizKey;
  f.advance(500);
  assert.equal(f.form.dataset.dgWizKey, previous);
  assert.equal(f.clicks, 0);
});

test('leaving and returning to the same question does not revive its timer', () => {
  const f = fixture();
  f.choose();
  const step = f.context.current;
  f.context.showStep(step - 1);
  f.context.showStep(step);
  f.advance(500);
  assert.equal(f.clicks, 0);
});

test('closing and reopening the same form cancels its pending advance', () => {
  const f = fixture();
  f.choose();
  f.close();
  f.modal.inert = false;
  f.modal.hidden = 'false';
  f.advance(500);
  assert.equal(f.clicks, 0);
});

test('a superseded callback cannot advance or cancel the newer choice', () => {
  const f = fixture();
  f.choose();
  const stale = f.timers.get(f.form._dgChoiceAdvance).callback;
  f.context.opt.value = '190-220k';
  f.choose();
  stale();
  assert.equal(f.clicks, 0);
  f.advance(200);
  assert.equal(f.clicks, 1);
  assert.equal(f.select.value, '190-220k');
});

const staleStates = {
  'review reached elsewhere': f => { f.form.dataset.dgWizKey = '__submit__'; },
  'different selected answer': f => { f.select.value = '190-220k'; },
  'detached form': f => { f.form.isConnected = false; },
  'another modal opened': f => { f.context.OPEN = '#jobseeker-modal'; },
  'hidden modal': f => { f.modal.hidden = 'true'; },
  'inert modal': f => { f.modal.inert = true; },
  'submission pending': f => { f.form.dataset.dgSubmitting = '1'; },
  'disabled Continue': f => { f.nextBtn.disabled = true; },
};
for (const [name, change] of Object.entries(staleStates)) {
  test(`a queued choice is ignored when ${name}`, () => {
    const f = fixture();
    f.choose();
    change(f);
    f.advance(500);
    assert.equal(f.clicks, 0);
    assert.equal(f.sends, 0);
  });
}

for (const key of ['welcome', '__submit__', '__thanks__']) {
  test(`${key} cannot schedule a choice advance`, () => {
    const f = fixture();
    f.form.dataset.dgWizKey = key;
    f.choose();
    f.advance(500);
    assert.equal(f.clicks, 0);
  });
}
