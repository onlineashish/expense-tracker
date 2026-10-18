// src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { loginLimiter, registerLimiter } from '../middleware/limiters.js';

const router = Router();

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (password.length > 72) {
      return res.status(400).json({ error: 'Password must be at most 72 characters' });
    }

    const hash = await bcrypt.hash(password, 12);

    let userId;
    try {
      const { rows } = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        [email, hash]
      );
      userId = rows[0].id;
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw err;
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = userId;
      req.session.save((err) => {
        if (err) return next(err);
        res.status(201).json({ user: { id: userId, email } });
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    const { rows } = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) return next(err);
        res.json({ user: { id: user.id, email: user.email } });
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

router.get('/me', async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (!rows[0]) {
      return req.session.destroy(() =>
        res.status(401).json({ error: 'Not authenticated' })
      );
    }
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;