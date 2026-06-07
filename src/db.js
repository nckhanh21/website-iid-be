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
    "INSERT INTO leaders (name, role, type, sort_order) VALUES (?, ?, 'associate', ?)"
  )
  const defaultAssociates = [
    ['Le Thi Kim Cuc', 'M.Sc.'],
    ['Luu Thu Giang', 'M.Sc.'],
    ['Hoang Thi Thu Phuong', 'Ph.D.'],
    ['Ngo Kim Tu', 'M.Sc.'],
    ['Dinh Anh Tuan', 'Ph.D.'],
    ['Duong Phuong Thao', 'M.Sc.'],
    ['Le Thanh Huyen', 'M.Sc.'],
  ]
  const seedAssociates = db.transaction(() => {
    defaultAssociates.forEach(([name, role], i) => insertAssociate.run(name, role, i))
  })
  seedAssociates()
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
    columns: [
      'slug', 'overline', 'title', 'subtitle', 'image',
      'image_width', 'image_height', 'image_alt', 'body',
      'links', 'blocks', 'sort_order',
    ],
    required: ['slug', 'title'],
    jsonColumns: ['links', 'blocks'],
    intColumns: ['image_width', 'image_height', 'sort_order'],
    orderBy: 'sort_order ASC, id ASC',
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
