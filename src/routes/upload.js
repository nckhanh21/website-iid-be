/**
 * Image upload route (admin only).
 *
 * Stores files under /uploads with a timestamped, sanitized name and returns
 * a public URL ("/uploads/<file>") that the frontend can drop straight into
 * an <img src>. Only common image mime types are accepted, capped at 5 MB.
 */
import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { requireAuth } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Save into the project-root /uploads folder — the same directory index.js
// serves statically at /uploads. (This file lives in src/routes, so go up two
// levels.) Keeping these in sync is what makes the returned URL resolvable.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .toLowerCase()
    cb(null, `${Date.now()}-${base || 'image'}${ext}`)
  },
})

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Unsupported file type'))
  },
})

// Separate uploader for PDF documents (publications), capped at 20 MB.
const uploadPdf = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true)
    cb(new Error('Chỉ chấp nhận tệp PDF'))
  },
})

const router = Router()

router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    res.status(201).json({ url: `/uploads/${req.file.filename}` })
  })
})

router.post('/pdf', requireAuth, (req, res) => {
  uploadPdf.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    res.status(201).json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname })
  })
})

export default router
