import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(process.env.DEMIGOD_FOOT_SOURCE || new URL('./foot-latest.js', import.meta.url), 'utf8');
function between(start, end, optional = false) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  if (optional && from < 0) return '';
  assert.ok(from >= 0 && to > from, `Missing runtime boundaries: ${start}`);
  return source.slice(from, to);
}
const helpers = between('/* ==== SECTION: WIZ runtime', '/* === WIZ BUILD & OWNERSHIP');
const config = between('var WIZ_CFG=', '/* ==== SECTION: WIZ_Q');
const restore = between('  var resumeStep = 0;', "  var head = document.createElement('div');");
const collect = between('  function collect() {', '  /* === WIZ STEP STATE');
const stepEntry = between('  function showStep(idx) {', '    try {');
const restart = between('  form.__dgWizRestart = function(){', '  form.__dgWizShow', true);
const toast = between('function wizResumeToast(modal){', 'function wireLogoHome(){');
const next = between('  nextBtn.onclick = function(ev)', '  backBtn.onclick');
const thanks = source.match(/\} else if \(key === '__thanks__'\) \{([\s\S]*?)\n    \} else \{/);
assert.ok(thanks, 'Missing confirmed-success draft cleanup');

function fixture({ kind = 'engineer', uploaded = false, session = new Map(), local = new Map(), blocked = '' } = {}) {
  const created = [], cancelled = [];
  let rebuilds = 0, removedUploads = 0;
  const element = () => ({
    style: {}, children: [], attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    appendChild(child) { this.children.push(child); },
    addEventListener(name, callback) { this[name] = callback; },
    remove() { this.removed = true; }, focus() {},
  });
  const field = (name, type, value) => ({
    name, id: name, type, value, tagName: type === 'select-one' ? 'SELECT' : 'INPUT',
    checked: false, validationMessage: '', checkValidity: () => true,
    setCustomValidity(value) { this.validationMessage = value; },
  });
  const text = field(kind === 'startup' ? 'role-title' : 'full-name', 'text', 'Example answer');
  const token = field('cf-turnstile-response', 'hidden', 'current-session-token');
  const version = field('form_version', 'hidden', 'v1109');
  const file = field('resume', 'file', '');
  file.files = uploaded ? [{ name: 'example-resume.pdf' }] : [];
  file.dataValue = uploaded ? 'example-upload-id' : null;
  Object.defineProperty(file, 'value', { get() { return this.files.length ? 'selected' : ''; }, set(value) { if (!value) this.files = []; } });
  file.getAttribute = name => name === 'data-value' ? file.dataValue : null;
  file.removeAttribute = name => { if (name === 'data-value') file.dataValue = null; };
  file.closest = () => ({ querySelector: () => ({ click() { removedUploads++; file.value = ''; file.dataValue = null; } }) });
  const url = field('resume-url', 'url', '');
  const fields = kind === 'engineer' ? [text, token, version, file, url] : [text, token, version];
  const form = {
    id: kind === 'engineer' ? 'engineer-join' : 'startup-hire',
    dataset: { dgWizBuilt: '1', dgWizResumed: '1', dgWizKey: '__submit__' },
    querySelectorAll: () => fields,
    querySelector(selector) {
      const name = selector.match(/\[name="([^"]+)"\]/)?.[1];
      return fields.find(f => f.name === name) || null;
    },
    closest: selector => kind === 'engineer' && selector === '#jobseeker-modal' ? {} : null,
  };
  const head = { parentNode: { insertBefore() {} } };
  const modal = { querySelector(selector) { if (selector === 'form') return form; if (selector === '.dg-wiz-head') return head; return null; }, prepend() {} };
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) });
  const context = vm.createContext({
    form, kind, answers: {}, resumeFiles: [], SAVE_KEY: 'dgWizSave_' + kind,
    reviewReturn: -1, reviewEditStep: -1,
    nextBtn: { disabled: false, style: {} }, backBtn: { disabled: false, style: {} }, nativeSub: { disabled: false },
    STARTUP_OK: '', ENGINEER_OK: '',
    qa: selector => selector === 'input[type="file"]' ? fields.filter(f => f.type === 'file') : selector === 'input,select,textarea' ? fields : [],
    normalizeUrl() {}, enhanceWIZ() {}, wizInlineInvalid() {},
    clearTimeout: id => cancelled.push(id), setTimeout() {},
    wizBuild() { rebuilds++; },
    document: { createElement() { const el = element(); created.push(el); return el; } },
    sessionStorage: storage(session), localStorage: storage(local),
  });
  if (blocked) Object.defineProperty(context, blocked, { get() { throw new Error('Storage blocked'); } });
  vm.runInContext(config + helpers, context);
  context.cfg = context.WIZ_CFG[kind];
  context.steps = context.cfg.steps;
  context.current = context.steps.findIndex(([key]) => key === '__submit__');
  vm.runInContext(collect + stepEntry + 'form.dataset.dgWizKey = steps[current][0];\n}\n' + restart + toast + next, context);
  return {
    context, form, fields, file, url, text, token, version, session, local, cancelled,
    collect: () => context.collect(),
    restore: () => vm.runInContext(restore, context),
    thanks: () => vm.runInContext('(function(){' + thanks[1] + '})()', context),
    startOver() {
      context.wizResumeToast(modal);
      const button = created.find(el => el.className === 'dg-wiz-restart');
      assert.ok(button, 'Start over control should be available');
      button.click();
    },
    get rebuilds() { return rebuilds; },
    get removedUploads() { return removedUploads; },
    get draft() { return JSON.parse(session.get(context.SAVE_KEY) || 'null'); },
  };
}

for (const kind of ['startup', 'engineer']) {
  test(`${kind}: Start over resets this form without erasing the other draft or rebuilding handlers`, () => {
    const f = fixture({ kind, uploaded: kind === 'engineer' });
    const otherKey = 'dgWizSave_' + (kind === 'engineer' ? 'startup' : 'engineer');
    const other = JSON.stringify({ answers: { example: 'Keep this answer' }, step: 2 });
    f.session.set(otherKey, other);
    f.collect();
    f.form._dgChoiceAdvance = 42;
    f.startOver();
    assert.equal(f.session.get(otherKey), other);
    assert.equal(f.rebuilds, 0);
    assert.equal(f.form.dataset.dgWizBuilt, '1');
    assert.equal(f.form.dataset.dgWizKey, 'welcome');
    assert.equal(f.text.value, '');
    assert.equal(f.token.value, 'current-session-token');
    assert.equal(f.version.value, 'v1109');
    assert.ok(f.cancelled.includes(42));
    assert.deepEqual(f.draft.answers, {});
    if (kind === 'engineer') {
      assert.equal(f.file.files.length, 0);
      assert.equal(f.file.dataValue, null);
      assert.equal(f.removedUploads, 1);
    }
  });
}

test('Start over cannot discard an in-flight submission', () => {
  const f = fixture();
  f.collect();
  const before = f.session.get(f.context.SAVE_KEY);
  f.form.dataset.dgSubmitting = '1';
  f.startOver();
  assert.equal(f.text.value, 'Example answer');
  assert.equal(f.session.get(f.context.SAVE_KEY), before);
  assert.equal(f.rebuilds, 0);
});

test('Start over waits for an active upload', () => {
  const f = fixture({ uploaded: true });
  f.collect();
  const before = f.session.get(f.context.SAVE_KEY);
  f.context.nativeSub.disabled = true;
  f.startOver();
  assert.equal(f.file.files.length, 1);
  assert.equal(f.session.get(f.context.SAVE_KEY), before);
  assert.equal(f.removedUploads, 0);
});

test('upload recovery saves only field names and returns to the upload question after refresh', () => {
  const f = fixture({ uploaded: true });
  f.collect();
  const saved = f.session.get(f.context.SAVE_KEY);
  assert.ok(!saved.includes('example-resume.pdf'));
  assert.ok(!saved.includes('example-upload-id'));
  assert.ok(!saved.includes('current-session-token'));
  assert.deepEqual(f.draft.filesNeedingUpload, ['resume']);
  const refreshed = fixture({ session: f.session });
  refreshed.restore();
  assert.equal(refreshed.context.steps[refreshed.context.resumeStep][0], 'resume');
  assert.equal(refreshed.context.answers['full-name'], 'Example answer');
  assert.equal(refreshed.context.answers.resume, undefined);
  const refreshedAgain = fixture({ session: f.session });
  refreshedAgain.restore();
  assert.equal(refreshedAgain.context.steps[refreshedAgain.context.resumeStep][0], 'resume');
});

test('a resume-link-only draft keeps its review step after refresh', () => {
  const f = fixture();
  f.url.value = 'https://example.com/resume';
  f.collect();
  const refreshed = fixture({ session: f.session });
  refreshed.restore();
  assert.equal(refreshed.context.steps[refreshed.context.resumeStep][0], '__submit__');
  assert.equal(refreshed.context.answers['resume-url'], 'https://example.com/resume');
});

test('explicitly skipping a lost optional upload clears its reselection marker', () => {
  const f = fixture();
  f.context.current = f.context.steps.findIndex(([key]) => key === 'resume');
  f.context.resumeFiles = ['resume'];
  f.context.nextBtn.onclick({ preventDefault() {} });
  assert.equal(f.form.dataset.dgWizKey, '__submit__');
  assert.deepEqual(f.draft.filesNeedingUpload, []);
});

for (const blocked of ['localStorage', 'sessionStorage']) {
  test(`confirmed success clears available storage even when ${blocked} is blocked`, () => {
    const f = fixture({ blocked });
    f.session.set(f.context.SAVE_KEY, 'old session draft');
    f.local.set(f.context.SAVE_KEY, 'old local draft');
    f.thanks();
    const available = blocked === 'localStorage' ? f.session : f.local;
    assert.equal(available.has(f.context.SAVE_KEY), false);
  });
}

test('a completed form cannot recreate its draft on later input or reopen collection', () => {
  const f = fixture();
  f.collect();
  f.form.dataset.dgSubmitState = 'success';
  f.thanks();
  f.collect();
  assert.equal(f.draft, null);
});

test('a leftover terminal draft is discarded rather than restoring a blank thanks screen', () => {
  const f = fixture();
  const step = f.context.steps.findIndex(([key]) => key === '__thanks__');
  f.session.set(f.context.SAVE_KEY, JSON.stringify({ answers: { 'full-name': 'Old answer' }, step }));
  f.restore();
  assert.equal(f.context.resumeStep, 0);
  assert.equal(Object.keys(f.context.answers).length, 0);
  assert.equal(f.draft, null);
});
