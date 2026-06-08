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
    when_text TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    image TEXT,
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
    required: ['slug', 'title'],
    jsonColumns: ['list', 'outputs'],
    intColumns: ['banner_width', 'banner_height', 'image_width', 'image_height', 'sort_order'],
    orderBy: 'sort_order ASC, id ASC',
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
    columns: ['slug', 'title', 'image', 'image_alt', 'quotes', 'sort_order'],
    required: ['slug', 'title'],
    jsonColumns: ['quotes'],
    intColumns: ['sort_order'],
    orderBy: 'sort_order ASC, id ASC',
  },
  events: {
    table: 'events',
    route: 'events',
    columns: ['when_text', 'title', 'body', 'image', 'active', 'sort_order'],
    required: ['when_text', 'title'],
    jsonColumns: [],
    intColumns: ['active', 'sort_order'],
    orderBy: 'sort_order ASC, id ASC',
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
