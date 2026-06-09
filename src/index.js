/**
 * Express entrypoint for the IID backend.
 *
 * Small by design: a generic CRUD router (built from RESOURCES) serves every
 * content type, with dedicated routers for auth, newsletter, and uploads.
 * Static /uploads serves admin-uploaded images.
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { RESOURCES } from './db.js'
import { createCrudRouter } from './lib/crudRouter.js'
import authRoutes from './routes/auth.js'
import newsletterRoutes from './routes/newsletter.js'
import uploadRoutes from './routes/upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 3001

// CORS_ORIGIN may be a comma-separated list (e.g. "http://localhost:5174,https://new-iid.iid.org.vn").
// Split it into an array so the `cors` package reflects only the matching origin
// per request — passing the raw comma-joined string would emit an invalid
// multi-value Access-Control-Allow-Origin header that browsers reject.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : true
app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '2mb' }))

// Admin-uploaded images.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/upload', uploadRoutes)

// One CRUD router per content resource.
for (const resource of Object.values(RESOURCES)) {
  app.use(`/api/${resource.route}`, createCrudRouter(resource))
}

// Fallback error handler.
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
})
