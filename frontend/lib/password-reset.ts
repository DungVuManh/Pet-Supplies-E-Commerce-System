import { getClientAuth } from "./firebase-client";

/**
 * Asks Firebase to email a password reset link. The public forgot-password page
 * and the Admin user pages both use it, so it lives outside any feature.
 */
export async function sendPasswordReset(email: string) {
  const [auth, { sendPasswordResetEmail }] = await Promise.all([getClientAuth(), import("firebase/auth")]);
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    // Projects without enumeration protection may disclose an unknown address.
    if (!(error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found")) throw error;
  }
}
