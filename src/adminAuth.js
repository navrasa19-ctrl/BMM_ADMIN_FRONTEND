import { auth } from "./firebase.js";

// Headers for backend admin APIs. Waits for Firebase to restore the
// session (e.g. after a page refresh) before reading the ID token.
export const getAdminAuthHeaders = async (extraHeaders = {}) => {
  await auth.authStateReady();

  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Session expired. Please log in again.");

  return { ...extraHeaders, Authorization: `Bearer ${idToken}` };
};
