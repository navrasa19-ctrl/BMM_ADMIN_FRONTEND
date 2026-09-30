import { auth } from "./firebase.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

// Headers for backend admin APIs. Waits for Firebase to restore the
// session (e.g. after a page refresh) before reading the ID token.
export const getAdminAuthHeaders = async (extraHeaders = {}) => {
  await auth.authStateReady();

  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Session expired. Please log in again.");

  return { ...extraHeaders, Authorization: `Bearer ${idToken}` };
};

const getRequestUrl = (input) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input?.url || "";
};

// Attaches the admin's Firebase ID token to every request made to our own
// backend (VITE_API_BASE_URL). Requests to any other host are untouched, so
// the token never leaks to third parties.
export const installAdminFetchAuth = () => {
  if (!API_BASE_URL || window.__adminFetchAuthInstalled) return;
  window.__adminFetchAuthInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = getRequestUrl(input);

    if (url !== API_BASE_URL && !url.startsWith(`${API_BASE_URL}/`)) {
      return originalFetch(input, init);
    }

    const headers = new Headers(
      init.headers || (input instanceof Request ? input.headers : undefined)
    );

    if (!headers.has("Authorization")) {
      await auth.authStateReady();
      const idToken = await auth.currentUser?.getIdToken();
      if (idToken) headers.set("Authorization", `Bearer ${idToken}`);
    }

    return originalFetch(input, { ...init, headers });
  };
};
