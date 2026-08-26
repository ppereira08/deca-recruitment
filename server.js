import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'deca-admin';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function getFields() {
  const { rows } = await pool.query(
    'SELECT id, label, type, required, options, placeholder FROM form_fields ORDER BY sort_order, id'
  );
  return rows.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    required: !!f.required,
    options: f.options ? f.options.split('\n').filter(Boolean) : [],
    placeholder: f.placeholder || ''
  }));
}

function validateSubmission(fields, body) {
  const values = {};
  const allowedLabels = new Set(fields.map((f) => f.label));
  for (const key of Object.keys(body)) {
    if (!allowedLabels.has(key)) return { error: `Unknown field: ${key}` };
  }
  for (const f of fields) {
    let v = body[f.label];
    if (f.type === 'checkbox-group') {
      v = Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
      const opts = new Set(f.options);
      for (const item of v) {
        if (!opts.has(item)) return { error: `Invalid option for ${f.label}` };
      }
      if (f.required && v.length === 0) return { error: `${f.label} is required` };
      values[f.label] = v;
      continue;
    }
    v = v == null ? '' : String(v).trim();
    if (f.required && !v) return { error: `${f.label} is required` };
    if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return { error: 'Please enter a valid email address' };
    }
    if (v && f.options.length && (f.type === 'select' || f.type === 'radio')) {
      if (!f.options.includes(v)) return { error: `Invalid option for ${f.label}` };
    }
    values[f.label] = v;
  }
  return { values };
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function sendFile(res, urlPath) {
  let filePath = path.normalize(path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    if (p === '/api/form' && req.method === 'GET') {
      return json(res, 200, { fields: await getFields() });
    }

    if (p === '/api/submit' && req.method === 'POST') {
      const body = await readBody(req);
      const fields = await getFields();
      const { values, error } = validateSubmission(fields, body);
      if (error) return json(res, 400, { error });
      await pool.query('INSERT INTO submissions (data) VALUES ($1)', [JSON.stringify(values)]);
      return json(res, 200, { ok: true });
    }

    const providedKey =
      req.headers['x-admin-key'] || url.searchParams.get('k') || '';
    const isAdmin = p.startsWith('/api/admin/') && providedKey === ADMIN_KEY;

    if (!isAdmin && p.startsWith('/api/admin/')) {
      return json(res, 401, { error: 'Unauthorized' });
    }

    if (p === '/api/admin/form' && req.method === 'PUT') {
      const body = await readBody(req);
      if (!Array.isArray(body.fields)) return json(res, 400, { error: 'fields array required' });
      const types = new Set(['text', 'email', 'tel', 'textarea', 'select', 'radio', 'checkbox-group']);
      const clean = [];
      for (const [i, f] of body.fields.entries()) {
        const label = String(f.label || '').trim();
        if (!label) return json(res, 400, { error: `Field ${i + 1} needs a label` });
        if (!types.has(f.type)) return json(res, 400, { error: `Field "${label}" has an invalid type` });
        clean.push({
          label,
          type: f.type,
          required: f.required ? 1 : 0,
          options:
            ['select', 'radio', 'checkbox-group'].includes(f.type)
              ? (Array.isArray(f.options) ? f.options : []).map((o) => String(o).trim()).filter(Boolean).join('\n')
              : null,
          placeholder: String(f.placeholder || '').trim() || null,
          sort_order: i
        });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM form_fields');
        for (const f of clean)
          await client.query(
            'INSERT INTO form_fields (label, type, required, options, placeholder, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
            [f.label, f.type, f.required, f.options, f.placeholder, f.sort_order]
          );
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      return json(res, 200, { fields: await getFields() });
    }

    if (p === '/api/admin/submissions' && req.method === 'GET') {
      const { rows } = await pool.query('SELECT id, data, created_at FROM submissions ORDER BY id DESC');
      return json(res, 200, {
        fields: await getFields(),
        submissions: rows.map((r) => ({
          id: r.id,
          created_at: new Date(r.created_at).toISOString(),
          data: JSON.parse(r.data)
        }))
      });
    }

    const delMatch = p.match(/^\/api\/admin\/submissions\/(\d+)$/);
    if (delMatch && req.method === 'DELETE') {
      await pool.query('DELETE FROM submissions WHERE id = $1', [Number(delMatch[1])]);
      return json(res, 200, { ok: true });
    }

    if (p === '/api/admin/export' && req.method === 'GET') {
      const fields = await getFields();
      const { rows } = await pool.query('SELECT id, data, created_at FROM submissions ORDER BY id ASC');
      const header = [...fields.map((f) => f.label), 'Submitted At'];
      const lines = [header.map(csvEscape).join(',')];
      for (const r of rows) {
        const data = JSON.parse(r.data);
        lines.push(
          [
            ...fields.map((f) => (Array.isArray(data[f.label]) ? data[f.label].join('; ') : data[f.label] ?? '')),
            new Date(r.created_at).toISOString()
          ]
            .map(csvEscape)
            .join(',')
        );
      }
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="deca-interest-submissions.csv"'
      });
      return res.end(lines.join('\n'));
    }

    if (p.startsWith('/api/')) {
      return json(res, 404, { error: 'Not found' });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    return sendFile(res, p);
  } catch (err) {
    return json(res, err.message === 'Invalid JSON' ? 400 : 500, { error: err.message || 'Server error' });
  }
}

export default handler;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer((req, res) => handler(req, res)).listen(PORT, () => {
    console.log(`DECA recruitment site running at http://localhost:${PORT}`);
    console.log(`Admin page: http://localhost:${PORT}/admin.html (key: set ADMIN_KEY env var, default "${ADMIN_KEY}")`);
  });
}
