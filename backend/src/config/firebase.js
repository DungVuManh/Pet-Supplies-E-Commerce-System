import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Called on demand: importing createApp must not read credentials or connect.
export function getFirebaseAuth(config) {
  const app = getApps().length ? getApp() : initializeApp({
    credential: applicationDefault(),
    projectId: config.FIREBASE_PROJECT_ID,
  });
  return getAuth(app);
}
