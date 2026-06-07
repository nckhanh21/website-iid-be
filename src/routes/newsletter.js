/**
 * Newsletter routes.
 *   POST /          public — store a subscriber email (idempotent on duplicates)
 *   GET  /          admin  — list subscribers (newest first)
 *   DELETE /:id     admin  — remove a subscriber
 */
import { Router } from 'express'

import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }
  try {
    db.prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)').run(email)
  } catch (err) {
    // UNIQUE violation → treat as success so the UX is idempotent.
    if (!String(err.message).includes('UNIQUE')) {
      return res.status(500).json({ error: 'Could not subscribe' })
    }
  }
  res.status(201).json({ ok: true })
})

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT id, email, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC, id DESC')
    .all()
  res.json(rows)
})

router.delete('/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').run(req.params.id)
  if (!info.changes) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true, id: Number(req.params.id) })
})

export default router
