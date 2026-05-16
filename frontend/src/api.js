const jsonHeaders = { 'Content-Type': 'application/json' };

export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? jsonHeaders : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'No se pudo completar la operación');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const money = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

export function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
