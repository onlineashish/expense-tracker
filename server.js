// server.js
import express from 'express';
import pg from 'pg';
import 'dotenv/config';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcrypt';

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

app.set('trust proxy', 1); // trust first proxy (for secure cookies on render.com
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,        // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// In production, serve the built React app.
// In dev, Vite handles the frontend and this is a no-op.
app.use(express.static('client/dist'));

// SPA fallback: send index.html for any non-API GET request.
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(new URL('./client/dist/index.html', import.meta.url).pathname);
});

/* ---------------- Auth ---------------- */

// A valid-looking bcrypt hash. Used to run a compare even when the email
// doesn't exist, so login timing is similar for real and fake accounts.
// Generated once at startup.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

app.post('/api/auth/register', async (req, res, next) => {
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

    // Fresh session ID for the new login (prevents session fixation).
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

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    const { rows } = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];

    // Compare against a dummy hash if the user doesn't exist, so the response
    // time doesn't leak whether the email is registered.
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

app.post('/api/auth/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

app.get('/api/auth/me', async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (!rows[0]) {
      // Session points to a user that no longer exists. Clean up.
      return req.session.destroy(() => res.status(401).json({ error: 'Not authenticated' }));
    }
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ---------------- People ---------------- */

app.get('/api/people', requireAuth, async (req, res, next) => {
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

app.post('/api/people', requireAuth, async (req, res, next) => {
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

app.delete('/api/people/:id', requireAuth, async (req, res, next) => {
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

/* ---------------- Expenses ---------------- */

app.post('/api/people/:id/expenses', requireAuth, async (req, res, next) => {
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

    // Insert only if the person exists AND belongs to this user.
    // The SELECT-from-people pattern is atomic — no race between check and insert.
    const { rows } = await pool.query(
      `INSERT INTO expenses (person_id, amount, description)
       SELECT p.id, $2, $3
       FROM people p
       WHERE p.id = $1 AND p.user_id = $4
       RETURNING id, amount, description, created_at`,
      [personId, amount, description, req.session.userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.status(201).json({
      ...rows[0],
      amount: Number(rows[0].amount),
    });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/expenses/:id', requireAuth, async (req, res, next) => {
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

    // $idx is the expense id, $idx+1 is the user id.
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

    if (!rows[0]) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ ...rows[0], amount: Number(rows[0].amount) });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/expenses/:id', requireAuth, async (req, res, next) => {
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

/* ---------------- Errors ---------------- */

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
