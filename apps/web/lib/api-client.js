/**
 * Shared API Client Helper for CommandAtlas Web App
 * Centralizes the Express Backend Base URL configuration.
 */

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(
  /\/$/,
  ''
);

/**
 * Standard fetch wrapper that prepends API_BASE_URL for relative /api/ endpoints.
 * @param {string} endpoint - Relative path (e.g. '/api/auth/login') or full URL
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  return fetch(url, options);
}
