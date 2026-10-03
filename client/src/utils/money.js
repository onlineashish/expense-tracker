export const CURRENCY = ''; // e.g. '$', '₹', '€'

export function formatMoney(n) {
  return (
    CURRENCY +
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function personTotal(person) {
  return person.expenses.reduce((sum, e) => sum + e.amount, 0);
}