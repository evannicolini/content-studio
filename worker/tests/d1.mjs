// A small stand-in for Cloudflare D1 over Node's built-in SQLite (node:sqlite, Node 22.5+), so the Worker runs on this
// Mac with no Wrangler: prepare(sql).bind(...).first() / .all() / .run(), batch([...]), exec(sql). The migrations in
// worker/migrations/ are applied on open and written down in d1_migrations, the same table Wrangler uses.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

function values(params) {
  return params.map((v) => {
    if (v === undefined) throw new Error("D1_TYPE_ERROR: Type 'undefined' not supported for value 'undefined'");   // as D1 does
    return typeof v === "boolean" ? (v ? 1 : 0) : v;
  });
}
const plain = (row) => (row ? { ...row } : null);

class Statement {
  constructor(db, sql, params = []) { this.db = db; this.sql = sql; this.params = params; }
  bind(...params) { return new Statement(this.db, this.sql, values(params)); }
  #prepared() {
    try { return this.db.prepare(this.sql); } catch (e) { throw new Error("D1_ERROR: " + e.message); }
  }
  #wrap(fn) {
    try { return fn(); } catch (e) { throw new Error("D1_ERROR: " + e.message); }
  }
  async first(column) {
    const row = plain(this.#wrap(() => this.#prepared().get(...this.params)));
    if (!row) return null;
    return column ? (row[column] ?? null) : row;
  }
  async all() { return this.allSync(); }
  async run() { return this.runSync(); }
  async raw() { return this.#wrap(() => this.#prepared().all(...this.params)).map((r) => Object.values(r)); }
  allSync() {
    const results = this.#wrap(() => this.#prepared().all(...this.params)).map(plain);
    return { success: true, results, meta: { changes: 0, last_row_id: 0 } };
  }
  runSync() {
    const r = this.#wrap(() => this.#prepared().run(...this.params));
    return { success: true, results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

function migrate(db) {
  db.exec("CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT)");
  for (const name of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    if (db.prepare("SELECT 1 FROM d1_migrations WHERE name = ?").get(name)) continue;
    db.exec(readFileSync(join(MIGRATIONS, name), "utf8"));
    db.prepare("INSERT INTO d1_migrations (name, applied_at) VALUES (?, datetime('now'))").run(name);
  }
}

// d1() is a fresh database in memory; d1("path/to/file.sqlite") keeps it on disk.
export function d1(file = ":memory:") {
  const db = new DatabaseSync(file);
  migrate(db);
  return {
    sqlite: db,                                              // for tests that look at the rows directly
    prepare: (sql) => new Statement(db, sql),
    async batch(statements) {                                // one transaction, like D1
      db.exec("BEGIN");
      try {
        const out = statements.map((s) => (/^\s*(select|with)\b|\breturning\b/i.test(s.sql) ? s.allSync() : s.runSync()));
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async exec(sql) { db.exec(sql); return { count: 1, duration: 0 }; },
  };
}
