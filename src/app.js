// src/app.js
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import authRouter from './routes/auth.js';
import peopleRouter from './routes/people.js';
import expensesRouter from './routes/expenses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(express.json());

  // Trust Render's proxy so secure cookies work in production.
  app.set('trust proxy', 1);

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
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    })
  );

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/people', peopleRouter);
  app.use('/api/expenses', expensesRouter);

  // Static frontend (production build)
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

  // SPA fallback: any non-API GET serves index.html
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });

  // Error handler — last
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}