'use client';

const TOKEN_KEY = 'commandatlas_auth_token';
const USER_KEY = 'commandatlas_auth_user';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(user, token) {
  if (typeof window === 'undefined') return;
  if (user && token) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);

    // Import dynamically or execute sync/merge
    import('./db/sync.js').then(({ performAccountMerge, triggerSync }) => {
      performAccountMerge(token).then((res) => {
        if (res && res.mergedCount > 0) {
          localStorage.setItem('commandatlas_last_merged_count', res.mergedCount.toString());
        }
        triggerSync();
      });
    });
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
