import { useRef, useState } from 'react';

export default function ExpenseForm({ onSubmit }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const amountRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    const trimmed = description.trim();
    if (!isFinite(parsed) || parsed <= 0 || !trimmed || busy) return;

    setBusy(true);
    try {
      await onSubmit({ amount: parsed, description: trimmed });
      setAmount('');
      setDescription('');
      amountRef.current?.focus();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="expense-form" onSubmit={handleSubmit} autoComplete="off">
      <input
        ref={amountRef}
        type="number"
        step="0.01"
        min="0.01"
        inputMode="decimal"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <button type="submit" disabled={busy}>
        Add
      </button>
    </form>
  );
}