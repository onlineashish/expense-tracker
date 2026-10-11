import { useState } from "react";
import { formatMoney } from "../utils/money";
import { formatExpenseDate, formatExpenseFullDate } from "../utils/dates";

export default function ExpenseRow({ expense, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftAmount, setDraftAmount] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [busy, setBusy] = useState(false);

  function startEditing() {
    // Seed the drafts from the *current* props, not from mount time.
    setDraftAmount(String(expense.amount));
    setDraftDesc(expense.description);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    // drafts will be re-seeded next time startEditing runs
  }

  async function save() {
    const parsed = parseFloat(draftAmount);
    const trimmed = draftDesc.trim();

    if (!isFinite(parsed) || parsed <= 0 || !trimmed) return;

    // If nothing changed, just exit edit mode without a round-trip.
    if (parsed === expense.amount && trimmed === expense.description) {
      setIsEditing(false);
      return;
    }

    setBusy(true);
    try {
      await onEdit(expense.id, { amount: parsed, description: trimmed });
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  }

  if (!isEditing) {
    return (
      <li className="expense">
        <span className="desc">{expense.description}</span>
        <time
          className="when"
          dateTime={expense.createdAt}
          title={formatExpenseFullDate(expense.createdAt)}
        >
          {formatExpenseDate(expense.createdAt)}
        </time>
        <span className="amt">{formatMoney(expense.amount)}</span>
        <button
          type="button"
          className="icon"
          title="Edit expense"
          onClick={startEditing}
        >
          ✎
        </button>
        <button
          type="button"
          className="icon"
          title="Delete expense"
          onClick={() => onDelete(expense.id)}
        >
          ×
        </button>
      </li>
    );
  }

  return (
    <li className="expense expense--editing">
      <input
        className="desc-input"
        type="text"
        value={draftDesc}
        onChange={(e) => setDraftDesc(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        disabled={busy}
      />
      <input
        className="amt-input"
        type="number"
        step="0.01"
        min="0.01"
        inputMode="decimal"
        value={draftAmount}
        onChange={(e) => setDraftAmount(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
      />
      <button
        type="button"
        className="icon"
        title="Save"
        onClick={save}
        disabled={busy}
      >
        ✓
      </button>
      <button
        type="button"
        className="icon"
        title="Cancel"
        onClick={cancelEditing}
        disabled={busy}
      >
        ×
      </button>
    </li>
  );
}
