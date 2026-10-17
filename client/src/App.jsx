// client/src/App.jsx
import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import { AuthProvider, useAuth } from './AuthContext';
import AuthPage from './AuthPage';
import PersonForm from './components/PersonForm';
import PersonCard from './components/PersonCard';
import { personTotal, formatMoney } from './utils/money';
import './App.css';

function MainApp() {
  const { user, logout } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listPeople();
      setPeople(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAddPerson = async (name) => {
    await api.addPerson(name);
    await refresh();
  };

  const handleDeletePerson = async (person) => {
    if (!confirm(`Delete "${person.name}" and all their expenses?`)) return;
    await api.deletePerson(person.id);
    await refresh();
  };

  const handleAddExpense = async (personId, expense) => {
    await api.addExpense(personId, expense);
    await refresh();
  };

  const handleEditExpense = async (expenseId, fields) => {
    await api.updateExpense(expenseId, fields);
    await refresh();
  };

  const handleDeleteExpense = async (expenseId) => {
    await api.deleteExpense(expenseId);
    await refresh();
  };

  const grandTotal = people.reduce((sum, p) => sum + personTotal(p), 0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>💸 Expense Tracker</h1>
        <div className="user-info">
          <span>{user.email}</span>
          <button type="button" className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <PersonForm onAdd={handleAddPerson} />

      {people.length > 0 && (
        <p className="summary">Overall total: {formatMoney(grandTotal)}</p>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : error ? (
        <p className="empty">Could not load data: {error}</p>
      ) : people.length === 0 ? (
        <p className="empty">No people yet — add someone above to get started.</p>
      ) : (
        people.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            onAddExpense={handleAddExpense}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onDelete={handleDeletePerson}
          />
        ))
      )}
    </div>
  );
}

function Gated() {
  const { user, loading } = useAuth();

  if (loading) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (!user) return <AuthPage />;
  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gated />
    </AuthProvider>
  );
}