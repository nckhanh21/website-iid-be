/**
 * Idempotent seed.
 *
 * - Always ensures the admin user exists (password from ADMIN_PASSWORD).
 * - For each content table, inserts the default dataset ONLY when the table is
 *   empty, so an already-populated data.db is never overwritten.
 *
 * The default content mirrors the original hard-coded frontend data so a fresh
 * checkout renders the same site.
 */
import 'dotenv/config'
import bcrypt from 'bcrypt'

import { db } from './db.js'

function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@iid.org.vn').trim()
  const password = process.env.ADMIN_PASSWORD || 'iid@admin2026'
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    console.log(`✓ admin user already exists: ${email}`)
    return
  }
  const hash = bcrypt.hashSync(password, 10)
  db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hash)
  console.log(`✓ created admin user: ${email}`)
}

function isEmpty(table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n === 0
}

function seedTable(table, columns, rows, transform = (r) => r) {
  if (!isEmpty(table)) {
    console.log(`• ${table}: already has data, skipping`)
    return
  }
  const placeholders = columns.map(() => '?').join(', ')
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
  const insertMany = db.transaction((items) => {
    items.forEach((item, i) => {
      const r = transform({ ...item, sort_order: item.sort_order ?? i })
      stmt.run(...columns.map((c) => (r[c] === undefined ? null : r[c])))
    })
  })
  insertMany(rows)
  console.log(`✓ seeded ${table}: ${rows.length} rows`)
}

const json = (v) => (v == null ? null : JSON.stringify(v))

// --- datasets ---------------------------------------------------------------

const leaders = [
  { name: 'Truong Thi Nam Thang', role: 'Lead Researcher', bio: 'Expertise in sustainable development ecosystems and academic-industry partnerships.', image: '/stitch/co-Thang.jpg' },
  { name: 'Vo Dai Luoc', role: 'Founder', bio: 'Pioneering vision in economic research and institutional foundation building.', image: '/stitch/leader-luoc.png' },
  { name: 'Chu Van Thang', role: 'Director', bio: 'Leading operational strategy and national policy alignment for innovation integration.', image: '/stitch/chu-van-thang.png' },
]

const partners = [
  { name: 'Đại học Kinh tế Quốc dân (NEU)', logo: '/partners/NEU.png' },
  { name: 'VNEI', logo: '/partners/VNEI.png' },
  { name: 'UKAS Education', logo: '/partners/UKAS.png' },
  { name: 'Học viện Ngoại giao (DAV)', logo: '/partners/DAV.png' },
  { name: 'Đại học Quốc gia Hà Nội', logo: '/partners/DHQGHN.png' },
  { name: 'Đại học Bách Khoa', logo: '/partners/DHBK.png' },
]

const reports = [
  { year: '2025', title: 'Scaling Sustainable Technologies', body: 'A comprehensive review of deployment metrics for low-carbon technologies across our pilot regions in Southeast Asia.', file_label: 'Download PDF (4.2 MB)', file_url: '#' },
  { year: '2024', title: 'Community Forestry Baselines', body: 'Initial data establishing socio-economic and ecological baselines for our core intervention zones.', file_label: 'Download PDF (3.8 MB)', file_url: '#' },
]

const events = [
  { when_text: 'OCT 12-14, 2024 • HANOI', title: 'Regional Symposium on Applied Sustainability', body: 'Bringing together policymakers, researchers, and community leaders to translate scientific findings into actionable local policies.', image: '/stitch/edu-hero.png', active: 1 },
  { when_text: 'NOV 05, 2024 • VIRTUAL', title: 'Masterclass: Circular Economy Metrics', body: 'An open session for entrepreneurs detailing our new assessment framework.', image: '/stitch/edu-hero.png', active: 0 },
]

seedAdmin()
seedTable('leaders', ['name', 'role', 'bio', 'image', 'sort_order'], leaders)
seedTable('partners', ['name', 'logo', 'sort_order'], partners)
seedTable('impact_reports', ['year', 'title', 'body', 'file_label', 'file_url', 'sort_order'], reports)
seedTable('events', ['when_text', 'title', 'body', 'image', 'active', 'sort_order'], events)

console.log('\nNote: publications, programmes, and press_articles are preserved from the existing data.db.')
console.log('If those tables are empty on a fresh DB, add them via the admin panel or extend this seed.')
console.log('\nSeed complete.')
