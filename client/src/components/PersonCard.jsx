import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import { formatMoney, personTotal } from '../utils/money';

export default function PersonCard({
  person,
  onAddExpense,
  onDeleteExpense,
  onDelete,
}) {
  return (
    <section className="card">
      <header>
        <h2>{person.name}</h2>
        <div>
          <span className="total">
            Total: {formatMoney(personTotal(person))}
          </span>
          <button
            type="button"
            className="icon"
            title="Delete person"
            onClick={() => onDelete(person)}
          >
            ×
          </button>
        </div>
      </header>

      <ExpenseList
        expenses={person.expenses}
        onDelete={(id) => onDeleteExpense(id)}
      />

      <ExpenseForm onSubmit={(exp) => onAddExpense(person.id, exp)} />
    </section>
  );
}