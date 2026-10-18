// src/routes/expenses.js
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { parseId } from '../lib/validate.js';

const router = Router();

router.use(requireAuth);

router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid expense id' });

    const amount = req.body.amount !== undefined ? Number(req.body.amount) : undefined;
    const description =
      req.body.description !== undefined ? String(req.body.description).trim() : undefined;

    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (description !== undefined && !description) {
      return res.status(400).json({ error: 'Description cannot be empty' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (amount !== undefined) {
      fields.push(`amount = $${idx++}`);
      values.push(amount);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const idPlaceholder = idx++;
    const userPlaceholder = idx++;
    values.push(id, req.session.userId);

    const { rows } = await pool.query(
      `UPDATE expenses e
       SET ${fields.join(', ')}
       FROM people p
       WHERE e.id = $${idPlaceholder}
         AND e.person_id = p.id
         AND p.user_id = $${userPlaceholder}
       RETURNING e.id, e.amount, e.description, e.created_at`,
      values
    );

    if (!rows[0]) return res.status(404).json({ error: 'Expense not found' });
    res.json({ ...rows[0], amount: Number(rows[0].amount) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid expense id' });

    const { rowCount } = await pool.query(
      `DELETE FROM expenses e
       USING people p
       WHERE e.id = $1
         AND e.person_id = p.id
         AND p.user_id = $2`,
      [id, req.session.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Expense not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;