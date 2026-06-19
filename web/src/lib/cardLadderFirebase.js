import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const CL_APP_NAME = 'cardladder';
const CL_PROJECT_ID = 'cardladder-71d53';

function getCardLadderApp() {
  const apiKey = import.meta.env.VITE_CARDLADDER_FIREBASE_API_KEY;
  if (!apiKey) return null;
  const existing = getApps().find(app => app.name === CL_APP_NAME);
  return existing || initializeApp({
    apiKey,
    authDomain: `${CL_PROJECT_ID}.firebaseapp.com`,
    projectId: CL_PROJECT_ID,
  }, CL_APP_NAME);
}

export async function signInWithGoogleForCardLadder() {
  const app = getCardLadderApp();
  if (!app) throw new Error('VITE_CARDLADDER_FIREBASE_API_KEY is not set');

  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  return result.user.refreshToken;
}
