# Expense Tracker

A web-based expense tracking application with a Node.js/Express backend, a frontend client, and a PostgreSQL database.

## 1. Prerequisites

Install the following on your local system:

- **Git** — to clone the repository.
- **Node.js 22.x** (version 22.12.0 or later) and npm 10 or later.
- **PostgreSQL** — for database storage.

Verify the installations:

```bash
git --version
node -v
npm -v
psql --version
```

## 2. Clone the Repository

```bash
git clone git@github.com:onlineashish/expense-tracker.git
cd expense-tracker
```

If SSH access to GitHub is not configured, clone using HTTPS instead:

```bash
git clone https://github.com/onlineashish/expense-tracker.git
cd expense-tracker
```

## 3. Configure PostgreSQL

1. Install and start PostgreSQL.
2. Create a database for the application.
3. Configure the database connection details in the project's environment configuration.

Example SQL:

```sql
CREATE DATABASE expense_tracker;
```

Create a `.env` file in the project root and add the connection settings expected by `server.js`.

Example:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_tracker
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

**Note:** The environment variable names must match those used by the application. Check `server.js` and any database configuration files before using this example. Apply any required database schema or migrations before starting the application.

## 4. Install Backend Dependencies

From the project root:

```bash
npm install
```

## 5. Install Frontend Dependencies

```bash
cd client
npm install
cd ..
```

If the repository contains a `package-lock.json` for the frontend, use `npm ci` instead of `npm install` for a reproducible installation.

## 6. Start the Application

Open two terminal windows.

**Terminal 1 — Start the backend**

```bash
cd expense-tracker
npm run dev
```

The backend should start at:

`http://localhost:3000`

**Terminal 2 — Start the frontend**

```bash
cd expense-tracker/client
npm run dev
```

Open the frontend URL printed by Vite in the terminal, usually:

`http://localhost:5173`

Keep both terminals running while using the application.

## 7. Troubleshooting

- **Node.js compatibility:** If you see errors involving `node:util`, `styleText`, or Vite/Rolldown, verify that you are using a compatible Node.js version.
- **Database connection errors:** Ensure PostgreSQL is running and the database credentials in `.env` are correct.
- **Missing dependencies:** Run `npm install` in the project root and in `client`.
- **Port already in use:** Stop the process using the port or configure the application to use another available port.

## 8. Development Commands

Run these commands from the project root unless specified otherwise.

| Command | Purpose |
|---|---|
| `npm run dev` | Start the backend in development mode |
| `npm start` | Start the backend normally |
| `npm run build` | Build the frontend, using the root build script |
| `cd client && npm run dev` | Start the frontend development server |

## Security Notes

- Do not commit `.env` files or database passwords to Git.
- Keep `.env` in `.gitignore`.
- Use a dedicated PostgreSQL user with only the permissions the application requires.
