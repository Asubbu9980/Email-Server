import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { loadSites } from '../src/config/sites.js';
import { createTransporters } from '../src/mailer.js';

const env = {
  MOTIVITYLABS_SMTP_USER: 'motivitylabs@gmail.com',
  MOTIVITYLABS_SMTP_PASS: 'app-pass-1',
  WEEMRIDE_SMTP_USER: 'weemride@gmail.com',
  WEEMRIDE_SMTP_PASS: 'app-pass-2',
  ANKLEIT_SMTP_USER: 'ankleit@gmail.com',
  ANKLEIT_SMTP_PASS: 'app-pass-3',
  MOTIVITYLABS_TO_EMAILS: 'sales.motivity@gmail.com, ceo.motivity@gmail.com',
  MOTIVITYLABS_ALLOWED_ORIGINS: 'https://motivitylabs.test',
  WEEMRIDE_ALLOWED_ORIGINS: 'https://weemride.test',
  ANKLEIT_TO_EMAILS: 'leads@ankleit.test',
  ANKLEIT_ALLOWED_ORIGINS: 'https://ankleit.test',
  RATE_LIMIT_MAX: '3',
};

const sent = [];
let failNext = null;
// One fake transport per site, tagging each message with the account it used.
const fakeTransport = (account) => ({
  async sendMail(msg) {
    if (failNext && failNext(msg)) throw new Error('smtp down');
    sent.push({ ...msg, account });
    return { messageId: String(sent.length) };
  },
});
const sites = loadSites(env);
const transporters = Object.fromEntries(Object.values(sites).map((s) => [s.id, fakeTransport(s.smtp.user)]));
const logger = { info() {}, warn() {}, error() {} };

// Fresh app per test so rate-limit counters don't leak between tests.
let server;
let baseUrl;
beforeEach(async () => {
  sent.length = 0;
  failNext = null;
  server?.close();
  const app = createApp({ sites, transporters, env, logger });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

const post = (site, body, origin) =>
  fetch(`${baseUrl}/api/contact/${site}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin && { Origin: origin }) },
    body: JSON.stringify(body),
  });

const valid = { name: 'Asha <b>', email: 'asha@example.com', message: 'Hello\nthere', company: 'Acme' };

test('sends team notification and user acknowledgement to the right addresses', async () => {
  const res = await post('motivitylabs', valid, 'https://motivitylabs.test');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://motivitylabs.test');

  assert.equal(sent.length, 2);
  const [admin, user] = sent;
  assert.deepEqual(admin.to, ['sales.motivity@gmail.com', 'ceo.motivity@gmail.com']);
  assert.equal(admin.replyTo.address, 'asha@example.com');
  assert.deepEqual(admin.from, { name: 'Motivity Labs', address: 'motivitylabs@gmail.com' });
  assert.equal(admin.account, 'motivitylabs@gmail.com');
  assert.match(admin.subject, /Motivity Labs/);
  assert.match(admin.html, /Asha &lt;b&gt;/, 'user input is HTML-escaped');
  assert.match(admin.html, /Hello<br>there/);
  assert.match(admin.html, /Acme/);

  assert.equal(user.to.address, 'asha@example.com');
  assert.equal(user.replyTo, 'sales.motivity@gmail.com');
});

test('each site routes to its own recipients and template', async () => {
  await post('weemride', { ...valid, city: 'Hyderabad', enquiryType: 'Driver' }, 'https://weemride.test');
  await post('ankleit', { ...valid, service: 'Cloud' }, 'https://ankleit.test');
  // No WEEMRIDE_TO_EMAILS: defaults to the site's own Gmail inbox.
  assert.deepEqual(sent[0].to, ['weemride@gmail.com']);
  assert.equal(sent[0].account, 'weemride@gmail.com');
  assert.match(sent[0].subject, /\[Driver\].*WeemRide.*Hyderabad/);
  assert.deepEqual(sent[2].to, ['leads@ankleit.test']);
  assert.equal(sent[2].from.address, 'ankleit@gmail.com');
  assert.match(sent[2].subject, /AnkleIT lead.*Cloud/);
  // Fields from another site are ignored.
  assert.doesNotMatch(sent[2].html, /Hyderabad/);
});

test('rejects invalid input with field errors', async () => {
  const res = await post('ankleit', { email: 'nope', message: '' }, 'https://ankleit.test');
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.deepEqual(Object.keys(body.errors).sort(), ['email', 'message', 'name']);
  assert.equal(sent.length, 0);
});

test('blocks origins that belong to another site', async () => {
  const res = await post('ankleit', valid, 'https://weemride.test');
  assert.equal(res.status, 403);
  assert.equal(sent.length, 0);
});

test('answers CORS preflight for allowed origin', async () => {
  const res = await fetch(`${baseUrl}/api/contact/weemride`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://weemride.test', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://weemride.test');
});

test('unknown site returns 404', async () => {
  const res = await post('nosuchsite', valid);
  assert.equal(res.status, 404);
});

test('honeypot submissions look successful but send nothing', async () => {
  const res = await post('motivitylabs', { ...valid, website: 'http://spam' }, 'https://motivitylabs.test');
  assert.equal(res.status, 200);
  assert.equal(sent.length, 0);
});

test('returns 502 if the team notification fails, 200 if only the ack fails', async () => {
  failNext = (msg) => Array.isArray(msg.to);
  let res = await post('weemride', valid, 'https://weemride.test');
  assert.equal(res.status, 502);

  failNext = (msg) => !Array.isArray(msg.to);
  res = await post('weemride', valid, 'https://weemride.test');
  assert.equal(res.status, 200);
});

test('rate limits per site and IP', async () => {
  for (let i = 0; i < 3; i++) assert.equal((await post('ankleit', valid, 'https://ankleit.test')).status, 200);
  assert.equal((await post('ankleit', valid, 'https://ankleit.test')).status, 429);
  // Another site has its own budget.
  assert.equal((await post('weemride', valid, 'https://weemride.test')).status, 200);
});

test('accepts classic form-urlencoded posts', async () => {
  const res = await fetch(`${baseUrl}/api/contact/ankleit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(valid),
  });
  assert.equal(res.status, 200);
});

test('malformed JSON returns 400', async () => {
  const res = await fetch(`${baseUrl}/api/contact/ankleit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad',
  });
  assert.equal(res.status, 400);
});

test('shared SMTP_USER is the fallback and sites sharing a login share a transport', () => {
  const shared = loadSites({ SMTP_USER: 'all@gmail.com', SMTP_PASS: 'x', ANKLEIT_SMTP_USER: 'ankleit@gmail.com', ANKLEIT_SMTP_PASS: 'y' });
  assert.equal(shared.weemride.fromEmail, 'all@gmail.com');
  assert.deepEqual(shared.weemride.toEmails, ['all@gmail.com']);
  assert.equal(shared.ankleit.fromEmail, 'ankleit@gmail.com');

  const t = createTransporters(shared, {});
  assert.equal(t.weemride, t.motivitylabs);
  assert.notEqual(t.ankleit, t.weemride);
  assert.equal(t.ankleit.options.host, 'smtp.gmail.com');
  assert.equal(t.ankleit.options.secure, true);
  for (const tr of new Set(Object.values(t))) tr.close();
});

test('missing Gmail credentials returns a clear 500', async () => {
  const bare = loadSites({ ANKLEIT_ALLOWED_ORIGINS: 'https://ankleit.test' });
  const app = createApp({ sites: bare, transporters: {}, env, logger });
  const srv = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const res = await fetch(`http://127.0.0.1:${srv.address().port}/api/contact/ankleit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(valid),
  });
  srv.close();
  assert.equal(res.status, 500);
});
