import { formatMoney } from '../utils/money';

export default function ExpenseList({ expenses, onDelete }) {
  if (expenses.length === 0) {
    return <p className="muted">No expenses yet</p>;
  }

  return (
    <ul className="expenses">
      {expenses.map((exp) => (
        <li key={exp.id} className="expense">
          <span className="desc">{exp.description}</span>
          <span className="amt">{formatMoney(exp.amount)}</span>
          <button
            type="button"
            className="icon"
            title="Delete expense"
            onClick={() => onDelete(exp.id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}