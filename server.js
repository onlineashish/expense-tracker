// server.js
import 'dotenv/config';
import { pool } from './src/db.js';
import { createApp } from './src/app.js';

try {
  const { rows } = await pool.query('SELECT 1 AS ok');
  if (rows[0].ok !== 1) throw new Error('unexpected response');
  console.log('✓ Database connection OK');
} catch (err) {
  console.error('✗ Could not connect to PostgreSQL:', err.message);
  process.exit(1);
}

const app = createApp();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));