import { useState } from 'react';

export default function PersonForm({ onAdd }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    try {
      await onAdd(trimmed);
      setName('');
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <input
        type="text"
        placeholder="Add a person by name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <button type="submit" disabled={busy}>
        Add person
      </button>
    </form>
  );
}