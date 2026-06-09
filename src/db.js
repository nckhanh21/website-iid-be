/**
 * SQLite data layer (better-sqlite3).
 *
 * - Opens (or creates) data.db next to the project root.
 * - Runs idempotent CREATE TABLE IF NOT EXISTS so an existing, seeded DB is
 *   preserved while a fresh checkout still bootstraps.
 * - Exposes a `RESOURCES` config that describes each content table so the
 *   generic CRUD router can serialize JSON columns and validate fields without
 *   bespoke code per resource (keeps the backend small).
 */
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leaders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    bio TEXT,
    image TEXT,
    type TEXT DEFAULT 'leadership',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    overline TEXT,
    title TEXT NOT NULL,
    subtitle TEXT,
    image TEXT,
    image_width INTEGER,
    image_height INTEGER,
    image_alt TEXT,
    body TEXT,
    links TEXT,
    blocks TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS programmes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    overline TEXT,
    title TEXT NOT NULL,
    subtitle TEXT,
    banner TEXT,
    banner_width INTEGER,
    banner_height INTEGER,
    banner_alt TEXT,
    image TEXT,
    image_width INTEGER,
    image_height INTEGER,
    image_alt TEXT,
    intro TEXT,
    detail TEXT,
    list_heading TEXT,
    list TEXT,
    note TEXT,
    outputs_heading TEXT,
    outputs TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS impact_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    file_url TEXT,
    file_label TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS press_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    image TEXT,
    image_alt TEXT,
    quotes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT,
    when_text TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    image TEXT,
    image_alt TEXT,
    content TEXT,
    active INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

/**
 * Lightweight idempotent migrations for existing databases.
 * CREATE TABLE IF NOT EXISTS does not add new columns to an already-created
 * table, so we ALTER-add any missing columns here. Safe to run on every boot.
 */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

// `type` distinguishes leadership entries from research associates (same table).
ensureColumn('leaders', 'type', "TEXT DEFAULT 'leadership'")

// Backfill the original Research Associates once (only if none exist yet) so
// they are editable in the admin alongside leadership.
const associateCount = db
  .prepare("SELECT COUNT(*) AS n FROM leaders WHERE type = 'associate'")
  .get().n
if (associateCount === 0) {
  const insertAssociate = db.prepare(
    "INSERT INTO leaders (name, role, bio, type, sort_order) VALUES (?, ?, ?, 'associate', ?)"
  )
  const defaultAssociates = [
    {
      name: 'Le Thi Kim Cuc',
      role: 'M.Sc.',
      bio: "Lê Thị Kim Cúc is a Lecturer at Swinburne University of Technology and a recipient of the prestigious Australia Awards Scholarship (AAS). As a Research Associate at IID, she drives impactful insights as a core team member of Policy Research, the Working Paper Series (WPS), and MEL, while also serving as an advisor for the WPS, Policy, and MEL portfolios.",
    },
    {
      name: 'Luu Thu Giang',
      role: 'M.Sc.',
      bio: "Lưu Thu Giang is a Lecturer at the Vietnam Women's Academy and an e-commerce consultant for numerous businesses. At IID, she serves as a Research Associate and the Supervisor for Rao thương. She focuses her core collaboration efforts on the Vietura and Hub Rừng projects, while providing advisory support for Rao thương, Vietura, and Hub rừng.",
    },
    {
      name: 'Hoang Thi Thu Phuong',
      role: 'Ph.D.',
      bio: "Dr. Hoàng Thị Thu Phương is a University Lecturer at British University Vietnam (BUV) and a Research Associate at IID, where she leads the Policy Research division. She is a core member driving the Working Paper Series (WPS), ESG, and MEL teams, and serves as an advisor for the ESG and MEL portfolios.",
    },
    {
      name: 'Ngo Kim Tu',
      role: 'M.Sc.',
      bio: "Ngô Kim Tú is a Lecturer at the University of Labour and Social Affairs and a Research Associate at IID, where she leads the ESG & Impact portfolio. She is a core member of the MEL (Monitoring, Evaluation, and Learning), Policy Research, and Mindlab teams. In her advisory capacity, she provides strategic insights across diverse initiatives, including Rao thương, imap, Mindlab, Hub rừng, Impactonomy, WPS, Policy, and MEL.",
    },
    {
      name: 'Dinh Anh Tuan',
      role: 'Ph.D.',
      bio: "Dr. Đinh Anh Tuấn is a Research Associate at IID, serving as the Lead for the imap initiative. He plays a key role as a core team member in Impactonomy, Policy Research, and the Working Paper Series (WPS). He also lends his expertise as an advisor to imap, Hub rừng, Impactonomy, WPS, and Policy.",
    },
    {
      name: 'Duong Phuong Thao',
      role: 'M.Sc.',
      bio: "Dương Phương Thảo is a Research Associate at IID and serves as the Supervisor for Vietura. Her core research and operational focus centers on Rao thương, Hub Rừng, and Mindlab. Additionally, she acts as a strategic advisor for several of IID's prominent programs, including Rao thương, Vietura, Mindlab, Hub rừng, Policy, and MEL.",
    },
    {
      name: 'Le Thanh Huyen',
      role: 'M.Sc.',
      bio: "Lê Thanh Huyền is a financial consultant for major enterprises and a Research Associate at IID, where she serves as the Lead for Mindlab. She contributes her specialized corporate and financial expertise as an advisor across multiple key pillars, including Rao thương, imap, Hub rừng, Impactonomy, and ESG.",
    },
  ]
  const seedAssociates = db.transaction(() => {
    defaultAssociates.forEach(({ name, role, bio }, i) =>
      insertAssociate.run(name, role, bio, i)
    )
  })
  seedAssociates()
}

// --- Publications: migrate to rich-text content + uploaded PDF -------------
ensureColumn('publications', 'content', 'TEXT')
ensureColumn('publications', 'pdf_url', 'TEXT')

/** Convert legacy publication `blocks` JSON into simple HTML for the editor. */
function blocksToHtml(blocks) {
  if (!Array.isArray(blocks)) return ''
  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const parts = []
  for (const b of blocks) {
    if (b?.heading) parts.push(`<h2>${esc(b.heading)}</h2>`)
    if (b?.subheading) parts.push(`<h3>${esc(b.subheading)}</h3>`)
    for (const p of b?.paragraphs || []) parts.push(`<p>${esc(p)}</p>`)
    if ((b?.items || []).length) {
      parts.push('<ul>' + b.items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ul>')
    }
  }
  return parts.join('\n')
}

// One-time backfill: build `content` from `blocks` for rows not yet migrated.
const pubsToMigrate = db
  .prepare(
    "SELECT id, blocks FROM publications WHERE (content IS NULL OR content = '') AND blocks IS NOT NULL AND blocks != ''"
  )
  .all()
if (pubsToMigrate.length) {
  const updateContent = db.prepare('UPDATE publications SET content = ? WHERE id = ?')
  const migrate = db.transaction(() => {
    for (const row of pubsToMigrate) {
      try {
        const html = blocksToHtml(JSON.parse(row.blocks))
        if (html) updateContent.run(html, row.id)
      } catch {
        /* skip malformed blocks */
      }
    }
  })
  migrate()
}

// Multi-file downloads (up to 3) — backfill the single pdf_url into `files`.
ensureColumn('publications', 'files', 'TEXT')
const pubsNeedFiles = db
  .prepare(
    "SELECT id, pdf_url FROM publications WHERE (files IS NULL OR files = '') AND pdf_url IS NOT NULL AND pdf_url != ''"
  )
  .all()
if (pubsNeedFiles.length) {
  const updFiles = db.prepare('UPDATE publications SET files = ? WHERE id = ?')
  const migrateFiles = db.transaction(() => {
    for (const row of pubsNeedFiles) {
      updFiles.run(JSON.stringify([{ url: row.pdf_url, name: 'Tải tài liệu (PDF)' }]), row.id)
    }
  })
  migrateFiles()
}

// --- Press: migrate structured `quotes` into rich-text `content` -----------
// Press articles are now authored with the rich editor. Fold any existing
// quotes (text + source link) into `content` as blockquotes once, then clear
// the quotes column so this only runs a single time.
ensureColumn('press_articles', 'content', 'TEXT')

function escPress(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const pressToMigrate = db
  .prepare(
    `SELECT id, content, quotes FROM press_articles
     WHERE (content IS NULL OR content = '') AND quotes IS NOT NULL AND quotes != '' AND quotes != '[]'`
  )
  .all()
if (pressToMigrate.length) {
  const updPress = db.prepare("UPDATE press_articles SET content = ?, quotes = '' WHERE id = ?")
  const migratePress = db.transaction(() => {
    for (const row of pressToMigrate) {
      let quotes = []
      try {
        quotes = JSON.parse(row.quotes)
      } catch {
        quotes = []
      }
      if (!Array.isArray(quotes) || !quotes.length) continue
      const html = quotes
        .map((q) => {
          const text = q?.text ? `&ldquo;${escPress(q.text)}&rdquo;` : ''
          const cite =
            q?.source && q?.url
              ? ` — <a href="${escPress(q.url)}">${escPress(q.source)}</a>`
              : q?.source
                ? ` — ${escPress(q.source)}`
                : ''
          return `<blockquote><p>${text}${cite}</p></blockquote>`
        })
        .join('\n')
      updPress.run(html, row.id)
    }
  })
  migratePress()
}

// --- Programmes: migrate plain-text `detail` to rich-text HTML -------------
/** Wrap plain text into <p> blocks (one per blank-line-separated chunk). */
function plainTextToHtml(text) {
  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return String(text)
    .split(/\n{2,}/) // blank line separates paragraphs
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// Rows whose `detail` is plain text (no HTML tags) get wrapped once. Rows that
// already contain markup (e.g. created via the rich editor) are left untouched.
const progsToMigrate = db
  .prepare(
    "SELECT id, detail FROM programmes WHERE detail IS NOT NULL AND detail != '' AND detail NOT LIKE '%<%>%'"
  )
  .all()
if (progsToMigrate.length) {
  const updDetail = db.prepare('UPDATE programmes SET detail = ? WHERE id = ?')
  const migrateDetail = db.transaction(() => {
    for (const row of progsToMigrate) {
      const html = plainTextToHtml(row.detail)
      if (html) updDetail.run(html, row.id)
    }
  })
  migrateDetail()
}

// --- Programmes: fold list / note / outputs into the rich-text `detail` -----
// These structured fields are now authored inline in `detail`. Move any
// existing content into the detail HTML once, then clear the source columns so
// this runs only once.
const escHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function parseJsonArray(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const progsToFold = db
  .prepare(
    `SELECT id, detail, list_heading, list, note, outputs_heading, outputs
     FROM programmes
     WHERE (list IS NOT NULL AND list != '' AND list != '[]')
        OR (note IS NOT NULL AND note != '')
        OR (outputs IS NOT NULL AND outputs != '' AND outputs != '[]')`
  )
  .all()
if (progsToFold.length) {
  const updFold = db.prepare(
    `UPDATE programmes
     SET detail = ?, list_heading = '', list = '', note = '',
         outputs_heading = '', outputs = ''
     WHERE id = ?`
  )
  const foldAll = db.transaction(() => {
    for (const row of progsToFold) {
      const parts = []
      const listItems = parseJsonArray(row.list)
      if (listItems.length) {
        if (row.list_heading) parts.push(`<h2>${escHtml(row.list_heading)}</h2>`)
        parts.push('<ol>' + listItems.map((i) => `<li>${escHtml(i)}</li>`).join('') + '</ol>')
      }
      if (row.note && String(row.note).trim()) {
        parts.push(`<blockquote>${escHtml(row.note)}</blockquote>`)
      }
      const outputItems = parseJsonArray(row.outputs)
      if (outputItems.length) {
        if (row.outputs_heading) parts.push(`<h2>${escHtml(row.outputs_heading)}</h2>`)
        parts.push('<ul>' + outputItems.map((o) => `<li>${escHtml(o)}</li>`).join('') + '</ul>')
      }
      const appended = parts.join('\n')
      const detail = [row.detail || '', appended].filter(Boolean).join('\n')
      updFold.run(detail, row.id)
    }
  })
  foldAll()
}

// --- Events: add detail-page columns + backfill slugs -----------------------
// Events now have their own detail page (like press articles), so they need a
// slug, an image alt, and rich-text content. Add the columns on existing DBs
// and generate a slug for any row missing one.
ensureColumn('events', 'slug', 'TEXT')
ensureColumn('events', 'image_alt', 'TEXT')
ensureColumn('events', 'content', 'TEXT')

/** Build a URL-safe slug from text (strips Vietnamese diacritics). */
function slugifyEvent(text, id) {
  const base = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base || 'event'}-${id}`
}

const eventsNeedSlug = db
  .prepare("SELECT id, title FROM events WHERE slug IS NULL OR slug = ''")
  .all()
if (eventsNeedSlug.length) {
  const updSlug = db.prepare('UPDATE events SET slug = ? WHERE id = ?')
  const backfillSlugs = db.transaction(() => {
    for (const row of eventsNeedSlug) {
      updSlug.run(slugifyEvent(row.title, row.id), row.id)
    }
  })
  backfillSlugs()
}


/**
 * Resource definitions consumed by the generic CRUD router.
 *
 *  - table:       SQLite table name
 *  - route:       URL segment under /api
 *  - columns:     writable columns (id/timestamps handled automatically)
 *  - required:    columns that must be present & non-empty on create
 *  - jsonColumns: columns stored as JSON text (parsed on read, stringified on write)
 *  - intColumns:  columns coerced to integers
 *  - orderBy:     default ordering for list responses
 */
export const RESOURCES = {
  leaders: {
    table: 'leaders',
    route: 'leaders',
    columns: ['name', 'role', 'bio', 'image', 'type', 'sort_order'],
    required: ['name'],
    jsonColumns: [],
    intColumns: ['sort_order'],
    orderBy: 'sort_order ASC, id ASC',
  },
  publications: {
    table: 'publications',
    route: 'publications',
    columns: ['slug', 'overline', 'title', 'body', 'image', 'content', 'files', 'sort_order'],
    required: ['title'],
    jsonColumns: ['files'],
    intColumns: ['sort_order'],
    orderBy: 'sort_order ASC, id ASC',
    // slug is auto-generated from the title on create (see crudRouter).
    autoSlug: { from: 'title' },
  },
  programmes: {
    table: 'programmes',
    route: 'programmes',
    columns: [
      'slug', 'overline', 'title', 'subtitle',
      'banner', 'banner_width', 'banner_height', 'banner_alt',
      'image', 'image_width', 'image_height', 'image_alt',
      'intro', 'detail', 'list_heading', 'list', 'note',
      'outputs_heading', 'outputs', 'sort_order',
    ],
    required: ['title'],
    jsonColumns: ['list', 'outputs'],
    intColumns: ['banner_width', 'banner_height', 'image_width', 'image_height', 'sort_order'],
    orderBy: 'sort_order ASC, id ASC',
    // slug is auto-generated from the title on create (see crudRouter).
    autoSlug: { from: 'title' },
  },
  partners: {
    table: 'partners',
    route: 'partners',
    columns: ['name', 'logo', 'sort_order'],
    required: ['name'],
    jsonColumns: [],
    intColumns: ['sort_order'],
    orderBy: 'sort_order ASC, id ASC',
  },
  reports: {
    table: 'impact_reports',
    route: 'reports',
    columns: ['year', 'title', 'body', 'file_url', 'file_label', 'sort_order'],
    required: ['year', 'title'],
    jsonColumns: [],
    intColumns: ['sort_order'],
    orderBy: 'sort_order ASC, year DESC, id ASC',
  },
  press: {
    table: 'press_articles',
    route: 'press',
    columns: ['slug', 'title', 'image', 'image_alt', 'content', 'sort_order'],
    required: ['slug', 'title'],
    jsonColumns: [],
    intColumns: ['sort_order'],
    orderBy: 'sort_order ASC, id ASC',
  },
  events: {
    table: 'events',
    route: 'events',
    columns: ['slug', 'when_text', 'title', 'body', 'image', 'image_alt', 'content', 'active', 'sort_order'],
    required: ['when_text', 'title'],
    jsonColumns: [],
    intColumns: ['active', 'sort_order'],
    orderBy: 'sort_order ASC, id ASC',
    // slug is auto-generated from the title on create (see crudRouter).
    autoSlug: { from: 'title' },
  },
}

/** Convert a stored DB row into an API row (parse JSON columns). */
export function deserializeRow(row, resource) {
  if (!row) return row
  const out = { ...row }
  for (const col of resource.jsonColumns) {
    if (out[col] == null || out[col] === '') {
      out[col] = null
      continue
    }
    try {
      out[col] = JSON.parse(out[col])
    } catch {
      out[col] = null
    }
  }
  return out
}
