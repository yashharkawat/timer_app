const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders() {
  const token = localStorage.getItem('g-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('g-token');
    localStorage.removeItem('g-user');
    window.location.href = '/sign-in';
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // User
  getMe: () => req('GET', '/api/users/me'),

  // Schedules
  getSchedules: () => req('GET', '/api/schedules'),
  getActiveSchedule: () => req('GET', '/api/schedules/active'),
  createSchedule: (data) => req('POST', '/api/schedules', data),
  importSchedule: (data) => req('POST', '/api/schedules/import', data),
  importScheduleFromAI: (text) => req('POST', '/api/schedules/import-ai', { text }),
  getAIProvider: () => req('GET', '/api/schedules/ai-provider'),
  updateSchedule: (id, data) => req('PUT', `/api/schedules/${id}`, data),
  deleteSchedule: (id) => req('DELETE', `/api/schedules/${id}`),
  activateSchedule: (id) => req('POST', `/api/schedules/${id}/activate`),

  // Days
  createDay: (scheduleId, data) => req('POST', `/api/days/schedules/${scheduleId}/days`, data),
  updateDay: (id, data) => req('PUT', `/api/days/${id}`, data),
  deleteDay: (id) => req('DELETE', `/api/days/${id}`),
  reorderSteps: (dayId, stepIds) => req('POST', `/api/days/${dayId}/reorder`, { stepIds }),

  // Steps
  createStep: (dayId, data) => req('POST', `/api/steps/days/${dayId}/steps`, data),
  updateStep: (id, data) => req('PUT', `/api/steps/${id}`, data),
  deleteStep: (id) => req('DELETE', `/api/steps/${id}`),

  // Sessions
  logSession: (data) => req('POST', '/api/sessions', data),
  getSessions: (page = 1) => req('GET', `/api/sessions?page=${page}`),
  getStreak: () => req('GET', '/api/sessions/streak'),

  // Settings
  getSettings: () => req('GET', '/api/settings'),
  updateSettings: (data) => req('PUT', '/api/settings', data),

  // Notifications
  subscribePush: (sub) => req('POST', '/api/notifications/subscribe', sub),
  unsubscribePush: (endpoint) => req('DELETE', '/api/notifications/subscribe', { endpoint }),
  testNotification: () => req('POST', '/api/notifications/test'),
};
