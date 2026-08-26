import { Pool } from '@neondatabase/serverless';
import { defaultFields } from './seed-data.mjs';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to .env.local or your environment.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS form_fields (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      required INTEGER NOT NULL DEFAULT 0,
      options TEXT,
      placeholder TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM form_fields');
  if (rows[0].n > 0) {
    console.log(`form_fields already has ${rows[0].n} row(s), skipping seed`);
  } else {
    const ins =
      'INSERT INTO form_fields (label, type, required, options, placeholder, sort_order) VALUES ($1, $2, $3, $4, $5, $6)';
    for (const [i, f] of defaultFields.entries()) {
      await pool.query(ins, [
        f.label,
        f.type,
        f.required ?? 0,
        f.options ? f.options.join('\n') : null,
        f.placeholder || null,
        i
      ]);
    }
    console.log(`Seeded ${defaultFields.length} default form fields`);
  }
  console.log('Schema ready');
} finally {
  await pool.end();
}
