// client/src/AuthPage.jsx
import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      // On success, AuthContext sets `user`, and App swaps to the main view.
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="auth-page">
      <h1>💸 Expense Tracker</h1>
      <div className="auth-card">
        <h2>{isLogin ? 'Sign in' : 'Create account'}</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={8}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? (
            <>No account? <button type="button" onClick={() => switchMode('register')}>Sign up</button></>
          ) : (
            <>Have an account? <button type="button" onClick={() => switchMode('login')}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}