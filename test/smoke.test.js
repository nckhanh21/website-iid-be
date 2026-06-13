/**
 * Smoke test: exercises the live backend over HTTP.
 * Assumes the server is running on PORT (default 3001).
 * Run: `node test/smoke.test.js` (after `npm start` in another shell).
 */
import test from 'node:test'
import assert from 'node:assert/strict'

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001'
const EMAIL = process.env.ADMIN_EMAIL || 'admin@iid.org.vn'
const PASSWORD = process.env.ADMIN_PASSWORD || 'iid@admin2026'

let token = ''

test('health check', async () => {
  const r = await fetch(`${BASE}/api/health`)
  assert.equal(r.status, 200)
  const j = await r.json()
  assert.equal(j.ok, true)
})

test('login returns a token', async () => {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  assert.equal(r.status, 200)
  const j = await r.json()
  assert.ok(j.token)
  token = j.token
})

test('login rejects bad credentials', async () => {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: 'wrong' }),
  })
  assert.equal(r.status, 401)
})

test('public GET leaders works without auth', async () => {
  const r = await fetch(`${BASE}/api/leaders`)
  assert.equal(r.status, 200)
  assert.ok(Array.isArray(await r.json()))
})

test('create requires auth', async () => {
  const r = await fetch(`${BASE}/api/leaders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x', role: 'y' }),
  })
  assert.equal(r.status, 401)
})

test('CRUD lifecycle on a leader', async () => {
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // create
  const c = await fetch(`${BASE}/api/leaders`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: 'Smoke Test Leader', role: 'QA', bio: 'temp', sort_order: 99 }),
  })
  assert.equal(c.status, 201)
  const created = await c.json()
  assert.ok(created.id)

  // update
  const u = await fetch(`${BASE}/api/leaders/${created.id}`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({ role: 'QA Lead' }),
  })
  assert.equal(u.status, 200)
  assert.equal((await u.json()).role, 'QA Lead')

  // delete
  const d = await fetch(`${BASE}/api/leaders/${created.id}`, { method: 'DELETE', headers: auth })
  assert.equal(d.status, 200)
})

test('JSON column round-trips on a publication', async () => {
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const slug = `smoke-pub-${Date.now()}`
  const c = await fetch(`${BASE}/api/publications`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      slug,
      title: 'Smoke Pub',
      files: [{ url: '/uploads/smoke.pdf', name: 'Smoke PDF' }],
    }),
  })
  assert.equal(c.status, 201)
  const created = await c.json()
  assert.ok(Array.isArray(created.files))
  assert.equal(created.files[0].name, 'Smoke PDF')
  await fetch(`${BASE}/api/publications/${created.id}`, { method: 'DELETE', headers: auth })
})

test('programme detail fields round-trip', async () => {
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const c = await fetch(`${BASE}/api/programmes`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      title: `Smoke Programme ${Date.now()}`,
      overline: 'June 2026 - November 2026',
      intro: 'Programme intro',
      purpose_image: '/uploads/purpose.png',
      purpose_image_alt: 'Purpose image',
      purpose: 'Programme purpose',
      benefits: [{ icon: 'emoji_events', title: 'Top cases', description: 'Published' }],
      join_title: 'Join now',
      join_image: '/uploads/join.png',
      join_image_alt: 'Join image',
      join_button_text: 'Register',
      join_button_link: 'https://example.com/register',
      detail: '<p>Rich content</p>',
      schedule_image: '/uploads/schedule.png',
      schedule_image_alt: 'Schedule image',
      partners_title: 'Partners',
      programme_partners: [{ name: 'IID', logo: '/uploads/iid.png', link: 'https://iid.org.vn' }],
      support_title: 'Support',
      support_content: '<p>Email: hello@iid.org.vn</p>',
    }),
  })
  assert.equal(c.status, 201)
  const created = await c.json()
  assert.ok(created.slug)
  assert.ok(Array.isArray(created.benefits))
  assert.equal(created.benefits[0].title, 'Top cases')
  assert.equal(created.purpose_image, '/uploads/purpose.png')
  assert.equal(created.join_title, 'Join now')
  assert.equal(created.join_image, '/uploads/join.png')
  assert.equal(created.schedule_image, '/uploads/schedule.png')
  assert.equal(created.partners_title, 'Partners')
  assert.ok(Array.isArray(created.programme_partners))
  assert.equal(created.programme_partners[0].logo, '/uploads/iid.png')
  assert.equal(created.support_content, '<p>Email: hello@iid.org.vn</p>')

  await fetch(`${BASE}/api/programmes/${created.id}`, { method: 'DELETE', headers: auth })
})

test('newsletter subscribe is public and idempotent', async () => {
  const email = `smoke+${Date.now()}@example.com`
  const r1 = await fetch(`${BASE}/api/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  assert.equal(r1.status, 201)
  const r2 = await fetch(`${BASE}/api/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  assert.equal(r2.status, 201) // duplicate treated as success

  // list requires auth
  const noAuth = await fetch(`${BASE}/api/newsletter`)
  assert.equal(noAuth.status, 401)
})
