// server.js
import express from 'express';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Fail fast if the DB is unreachable at boot
try {
  const { rows } = await pool.query('SELECT 1 AS ok');
  if (rows[0].ok !== 1) throw new Error('unexpected response');
  console.log('✓ Database connection OK');
} catch (err) {
  console.error('✗ Could not connect to PostgreSQL:', err.message);
  process.exit(1);
}

const app = express();
app.use(express.json());

// In production, serve the built React app.
// In dev, Vite handles the frontend and this is a no-op.
app.use(express.static('client/dist'));

// SPA fallback: send index.html for any non-API GET request.
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(new URL('./client/dist/index.html', import.meta.url).pathname);
});

/* ---------------- People ---------------- */

app.get('/api/people', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.name,
             e.id AS expense_id, e.amount, e.description
      FROM people p
      LEFT JOIN expenses e ON e.person_id = p.id
      ORDER BY p.id ASC, e.id ASC
    `);

    const byId = new Map();
    for (const r of rows) {
      if (!byId.has(r.id)) byId.set(r.id, { id: r.id, name: r.name, expenses: [] });
      if (r.expense_id) {
        byId.get(r.id).expenses.push({
          id: r.expense_id,
          amount: Number(r.amount),
          description: r.description
        });
      }
    }
    res.json([...byId.values()]);
  } catch (err) {
    next(err);
  }
});

app.post('/api/people', async (req, res, next) => {
  try {
    const name = String(req.body.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { rows } = await pool.query(
      'INSERT INTO people (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.status(201).json({ ...rows[0], expenses: [] });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/people/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM people WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Person not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ---------------- Expenses ---------------- */

app.post('/api/people/:id/expenses', async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const description = String(req.body.description ?? '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO expenses (person_id, amount, description)
       VALUES ($1, $2, $3)
       RETURNING id, amount, description`,
      [req.params.id, amount, description]
    );
    res.status(201).json({ ...rows[0], amount: Number(rows[0].amount) });
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'Person not found' });
    next(err);
  }
});

app.delete('/api/expenses/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Expense not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ---------------- Errors ---------------- */

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
