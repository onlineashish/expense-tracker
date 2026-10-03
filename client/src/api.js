async function request(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      message = (await res.json()).error || message;
    } catch {
      // response wasn't JSON; keep the default message
    }
    throw new Error(message);
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  listPeople: () => request('/people'),
  addPerson: (name) =>
    request('/people', { method: 'POST', body: JSON.stringify({ name }) }),
  deletePerson: (id) =>
    request(`/people/${id}`, { method: 'DELETE' }),
  addExpense: (personId, expense) =>
    request(`/people/${personId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    }),
  deleteExpense: (id) =>
    request(`/expenses/${id}`, { method: 'DELETE' }),
};