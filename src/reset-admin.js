/**
 * Reset (or create) the admin user from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
 * Run with `npm run reset-admin` whenever the admin password needs changing.
 */
import 'dotenv/config'
import bcrypt from 'bcrypt'

import { db } from './db.js'

const email = (process.env.ADMIN_EMAIL || 'admin@iid.org.vn').trim()
const password = process.env.ADMIN_PASSWORD || 'iid@admin2026'

const hash = await bcrypt.hash(password, 10)

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
if (existing) {
  db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hash, email)
  console.log(`Updated password for admin user: ${email}`)
} else {
  db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hash)
  console.log(`Created admin user: ${email}`)
}
