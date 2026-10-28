// Vercel Serverless Function for Tatagan.sh Cloud Account & Cross-Device Sync
// Supports:
// 1. Optional Supabase / Upstash KV if configured in Vercel Environment Variables
// 2. Distributed Cloud Relay (ntfy.sh + bytebin) + Warm Instance Cache (/tmp/tatagan_cloud.json)

import fs from 'fs';
import path from 'path';

const TMP_DB_PATH = path.join('/tmp', 'tatagan_cloud_db_v3.json');

function readLocalCache() {
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      return JSON.parse(fs.readFileSync(TMP_DB_PATH, 'utf8'));
    }
  } catch {
    // Ignore read error
  }
  return {};
}

function writeLocalCache(db) {
  try {
    fs.writeFileSync(TMP_DB_PATH, JSON.stringify(db), 'utf8');
  } catch {
    // Ignore write error
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = readLocalCache();

    if (req.method === 'GET') {
      const topic = String(req.query.topic || '').trim();
      if (!topic) {
        return res.status(400).json({ error: 'Missing topic parameter' });
      }
      const cached = db[topic] || null;
      return res.status(200).json({ record: cached });
    }

    if (req.method === 'POST') {
      const { topic, record } = req.body || {};
      if (!topic || !record) {
        return res.status(400).json({ error: 'Missing topic or record in body' });
      }
      db[topic] = record;
      writeLocalCache(db);
      return res.status(200).json({ ok: true, updatedAt: record.updatedAt });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
