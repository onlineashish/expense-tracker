// src/routes/people.js
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { parseId } from '../lib/validate.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.name,
             e.id AS expense_id, e.amount, e.description, e.created_at
      FROM people p
      LEFT JOIN expenses e ON e.person_id = p.id
      WHERE p.user_id = $1
      ORDER BY p.id ASC, e.id ASC
    `, [req.session.userId]);

    const byId = new Map();
    for (const r of rows) {
      if (!byId.has(r.id)) byId.set(r.id, { id: r.id, name: r.name, expenses: [] });
      if (r.expense_id) {
        byId.get(r.id).expenses.push({
          id: r.expense_id,
          amount: Number(r.amount),
          description: r.description,
          createdAt: r.created_at,
        });
      }
    }
    res.json([...byId.values()]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { rows } = await pool.query(
      'INSERT INTO people (name, user_id) VALUES ($1, $2) RETURNING id, name',
      [name, req.session.userId]
    );
    res.status(201).json({ ...rows[0], expenses: [] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid person id' });

    const { rowCount } = await pool.query(
      'DELETE FROM people WHERE id = $1 AND user_id = $2',
      [id, req.session.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Person not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Nested resource: create an expense for a person.
// URL: POST /api/people/:id/expenses
router.post('/:id/expenses', async (req, res, next) => {
  try {
    const personId = parseId(req.params.id);
    if (!personId) return res.status(400).json({ error: 'Invalid person id' });

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
       SELECT p.id, $2, $3
       FROM people p
       WHERE p.id = $1 AND p.user_id = $4
       RETURNING id, amount, description, created_at`,
      [personId, amount, description, req.session.userId]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Person not found' });
    res.status(201).json({ ...rows[0], amount: Number(rows[0].amount) });
  } catch (err) {
    next(err);
  }
});

export default router;