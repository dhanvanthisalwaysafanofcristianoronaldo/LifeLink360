const participantStorageKey = 'lifelink-demo-participant';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function participantId() {
  let id = sessionStorage.getItem(participantStorageKey);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(participantStorageKey, id);
  }
  return id;
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `The demo API returned ${response.status}.`);
  return body;
}

export function getDashboard() {
  return request(`/api/dashboard?participantId=${encodeURIComponent(participantId())}`);
}

export function createRequest(form) {
  return request('/api/requests', { method: 'POST', body: JSON.stringify(form) });
}

export function offerHelp(requestId) {
  return request(`/api/requests/${encodeURIComponent(requestId)}/offers`, {
    method: 'POST', body: JSON.stringify({ participantId: participantId() }),
  });
}

export function joinMission(slug) {
  return request(`/api/missions/${encodeURIComponent(slug)}/join`, {
    method: 'POST', body: JSON.stringify({ participantId: participantId() }),
  });
}
