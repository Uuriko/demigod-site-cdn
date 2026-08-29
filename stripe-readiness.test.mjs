import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const foot = readFileSync(new URL('./foot-latest.js', import.meta.url), 'utf8');

const required = [
  "window.__dgFootVer='1108'",
  '10% of the hire\\\'s first-year base salary in United States dollars (USD)',
  'No physical goods are sold',
  'id="terms"',
  'id="payments"',
  'id="cancellation"',
  'id="fulfillment"',
  'id="refunds"',
  'id="privacy"',
  'id="referrals"',
  'id="cookies"',
  'id="security"',
  'id="contact"',
  "'/refund': 'legal'",
  "'/cancellation': 'legal'",
  "'/fulfillment': 'legal'",
  'href="/legal#terms"',
  'href="/legal#privacy"',
  'href="/legal#refunds"',
  'href="/legal#cancellation"',
  'href="/legal#fulfillment"',
  'href="/legal#referrals"',
  'href="/legal#cookies"',
  'href="/legal#security"',
  'policyTarget.scrollIntoView',
  'does not offer cryptocurrency, investment, exchange, custody, or other financial services',
  'if(/^(?:10%|\\$0)$/.test(tx))',
];

for (const text of required) {
  assert.ok(foot.includes(text), `missing Stripe-readiness contract: ${text}`);
}

const forbidden = [
  'Stripe and Twilio are pending',
  'data-dg-page="bounties"',
  "'/bounties': 'bounties'",
  "'/tryouts': 'bounties'",
  'Declared USDC bounties',
  'DG_USDC_SOL',
  'DG_USDC_BASE',
  'Demigod bounty:',
  '518 Laguna',
  'first-year cash',
];

for (const text of forbidden) {
  assert.ok(!foot.includes(text), `forbidden Stripe-readiness text remains: ${text}`);
}

assert.match(foot, /href="\/how" data-dg-page="how"/);
assert.match(foot, /href="\/pricing" data-dg-page="pricing"/);
assert.match(foot, /href="\/faq" data-dg-page="faq"/);

console.log('Stripe-readiness source contract passed');
