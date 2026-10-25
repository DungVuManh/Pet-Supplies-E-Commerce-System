import type { Auth } from "firebase/auth";

let authPromise: Promise<Auth> | undefined;

export function getClientAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
        throw Object.assign(new Error("Firebase configuration missing"), { code: "FIREBASE_CONFIG_MISSING" });
      }
      const [{ getApps, initializeApp }, { initializeAuth, getAuth, inMemoryPersistence }] = await Promise.all([
        import("firebase/app"), import("firebase/auth"),
      ]);
      const existing = getApps().find((app) => app.name === "petjoy-web-auth");
      return existing ? getAuth(existing) : initializeAuth(initializeApp(config, "petjoy-web-auth"), {
        persistence: inMemoryPersistence,
      });
    })().catch((error) => { authPromise = undefined; throw error; });
  }
  return authPromise;
}
