import { getClientAuth } from "./firebase-client";
import { authApi, AuthApiError } from "./api";
import type { RegistrationProfile } from "./types";

export async function loginWithEmail(email: string, password: string, remember: boolean) {
  const [auth, { signInWithEmailAndPassword, signOut }] = await Promise.all([getClientAuth(), import("firebase/auth")]);
  let needsProfile = false;
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return await authApi.login(await user.getIdToken(), remember);
  } catch (error) {
    // Retain only the in-memory Firebase state needed to complete a missing profile.
    needsProfile = error instanceof AuthApiError && error.code === "PROFILE_INCOMPLETE";
    throw error;
  } finally {
    if (!needsProfile) await signOut(auth);
  }
}

export async function registerWithEmail(email: string, password: string, profile: RegistrationProfile) {
  const [auth, { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }] = await Promise.all([
    getClientAuth(), import("firebase/auth"),
  ]);
  try {
    let credential;
    try { credential = await createUserWithEmailAndPassword(auth, email, password); }
    catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "auth/email-already-in-use")) throw error;
      // Recover after Firebase account creation succeeded but the profile/session failed.
      credential = await signInWithEmailAndPassword(auth, email, password);
    }
    return await authApi.register(await credential.user.getIdToken(), profile);
  } finally { await signOut(auth); }
}

export async function completeProfile(profile: RegistrationProfile, remember: boolean) {
  const auth = await getClientAuth();
  if (!auth.currentUser) throw new AuthApiError("UNAUTHENTICATED", 401);
  const user = await authApi.register(await auth.currentUser.getIdToken(), profile, remember);
  await clearFirebaseIdentity();
  return user;
}

export async function clearFirebaseIdentity() {
  const [auth, { signOut }] = await Promise.all([getClientAuth(), import("firebase/auth")]);
  await signOut(auth);
}

export async function sendPasswordReset(email: string) {
  const [auth, { sendPasswordResetEmail }] = await Promise.all([getClientAuth(), import("firebase/auth")]);
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    // Projects without enumeration protection may disclose an unknown address.
    if (!(error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found")) throw error;
  }
}
