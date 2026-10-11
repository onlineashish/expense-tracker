import ExpenseRow from './ExpenseRow';

export default function ExpenseList({ expenses, onDelete, onEdit }) {
  if (expenses.length === 0) {
    return <p className="muted">No expenses yet</p>;
  }

  return (
    <ul className="expenses">
      {expenses.map((exp) => (
        <ExpenseRow
          key={exp.id}
          expense={exp}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}