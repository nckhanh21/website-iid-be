/**
 * Auth routes: email/password login that returns a JWT, plus a `me` endpoint
 * used by the frontend to restore a session on reload.
 */
import { Router } from 'express'
import bcrypt from 'bcrypt'

import { db } from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim())
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken({ id: user.id, email: user.email })
  res.json({ token, user: { id: user.id, email: user.email } })
})

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ user })
})

export default router
