import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

function emptyDb() {
  return { biddings: {}, meta: { lastScanAt: null, lastSource: null, lastNote: null, totalScans: 0 }, updatedAt: new Date().toISOString() };
}

function ensureStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(emptyDb(), null, 2), 'utf8');
  }
  try {
    const db = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    if (!db.biddings) db.biddings = {};
    if (!db.meta) db.meta = emptyDb().meta;
    return db;
  } catch {
    return emptyDb();
  }
}

function persist(db) {
  try {
    ensureStore();
    db.updatedAt = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {}
}

export function upsertBidding(bidding) {
  if (!bidding || !bidding.id) return null;
  const db = ensureStore();
  db.biddings[bidding.id] = { ...db.biddings[bidding.id], ...bidding, updatedAt: new Date().toISOString() };
  persist(db);
  return db.biddings[bidding.id];
}

export function upsertMany(biddings = []) {
  const db = ensureStore();
  let added = 0;
  for (const b of biddings) {
    if (!b || !b.id) continue;
    if (!db.biddings[b.id]) added += 1;
    db.biddings[b.id] = { ...db.biddings[b.id], ...b, updatedAt: new Date().toISOString() };
  }
  persist(db);
  return { total: Object.keys(db.biddings).length, added };
}

export function markScan({ source, note }) {
  const db = ensureStore();
  db.meta = {
    lastScanAt: new Date().toISOString(),
    lastSource: source || null,
    lastNote: note || null,
    totalScans: (db.meta?.totalScans || 0) + 1
  };
  persist(db);
  return db.meta;
}

export function getMeta() {
  const db = ensureStore();
  return db.meta || emptyDb().meta;
}

export function getBidding(id) {
  const db = ensureStore();
  return db.biddings[id] || null;
}

export function listBiddings() {
  const db = ensureStore();
  return Object.values(db.biddings || {});
}

export function hasStoreData() {
  const db = ensureStore();
  return Object.keys(db.biddings || {}).length > 0;
}
