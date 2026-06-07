/**
 * Generic CRUD router factory.
 *
 * Given a RESOURCES entry, builds an Express router with:
 *   GET    /            list (public)
 *   GET    /:id         read one (public)
 *   POST   /            create (admin)
 *   PUT    /:id         update (admin)
 *   DELETE /:id         delete (admin)
 *
 * JSON columns are stringified on write and parsed on read. This keeps each
 * content type to a single line of wiring instead of a bespoke file.
 */
import { Router } from 'express'

import { db, deserializeRow } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

export function createCrudRouter(resource) {
  const router = Router()
  const { table, columns, required, jsonColumns, intColumns, orderBy } = resource

  const listStmt = db.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`)
  const getStmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`)
  const delStmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`)

  // --- helpers ---------------------------------------------------------------
  function coerce(col, value) {
    if (jsonColumns.includes(col)) {
      if (value == null) return null
      // Accept either a pre-stringified value or an object/array.
      return typeof value === 'string' ? value : JSON.stringify(value)
    }
    if (intColumns.includes(col)) {
      if (value === '' || value == null) return null
      const n = Number(value)
      return Number.isFinite(n) ? Math.trunc(n) : null
    }
    return value === undefined ? null : value
  }

  function validate(body, { partial }) {
    const missing = []
    for (const col of required) {
      const provided = Object.prototype.hasOwnProperty.call(body, col)
      if (partial && !provided) continue
      const val = body[col]
      if (val == null || String(val).trim() === '') missing.push(col)
    }
    return missing
  }

  // --- routes ----------------------------------------------------------------
  router.get('/', (req, res) => {
    const rows = listStmt.all().map((r) => deserializeRow(r, resource))
    res.json(rows)
  })

  router.get('/:id', (req, res) => {
    const row = getStmt.get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(deserializeRow(row, resource))
  })

  router.post('/', requireAuth, (req, res) => {
    const body = req.body || {}
    const missing = validate(body, { partial: false })
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` })
    }

    const cols = columns.filter((c) => Object.prototype.hasOwnProperty.call(body, c))
    if (!cols.length) return res.status(400).json({ error: 'No valid fields provided' })

    const placeholders = cols.map(() => '?').join(', ')
    const values = cols.map((c) => coerce(c, body[c]))
    try {
      const info = db
        .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
        .run(...values)
      const row = getStmt.get(info.lastInsertRowid)
      res.status(201).json(deserializeRow(row, resource))
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  router.put('/:id', requireAuth, (req, res) => {
    const existing = getStmt.get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })

    const body = req.body || {}
    const missing = validate(body, { partial: true })
    if (missing.length) {
      return res.status(400).json({ error: `Fields cannot be empty: ${missing.join(', ')}` })
    }

    const cols = columns.filter((c) => Object.prototype.hasOwnProperty.call(body, c))
    if (!cols.length) return res.status(400).json({ error: 'No valid fields provided' })

    const assignments = cols.map((c) => `${c} = ?`).join(', ')
    const values = cols.map((c) => coerce(c, body[c]))
    try {
      db.prepare(
        `UPDATE ${table} SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(...values, req.params.id)
      const row = getStmt.get(req.params.id)
      res.json(deserializeRow(row, resource))
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  router.delete('/:id', requireAuth, (req, res) => {
    const info = delStmt.run(req.params.id)
    if (!info.changes) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true, id: Number(req.params.id) })
  })

  return router
}
