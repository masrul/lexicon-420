import { byId } from './dom.js';
import {
  getProgress,
  getUpdatedAt,
  replaceProgress,
  subscribeToProgress,
} from './progress.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBE7mYIVux7yXjGaiCXM06ah8VAgKMWyQQ',
  authDomain: 'vocab-333.firebaseapp.com',
  projectId: 'vocab-333',
  storageBucket: 'vocab-333.firebasestorage.app',
  messagingSenderId: '522631605296',
  appId: '1:522631605296:web:9d507f8ebb82c1b2c911f5',
};

export async function initFirebaseSync() {
  const authButton = byId('authButton');
  const syncStatus = byId('syncStatus');
  const setStatus = (message, tone = '') => {
    syncStatus.textContent = message;
    syncStatus.className = `sync-status${tone ? ` ${tone}` : ''}`;
  };

  try {
    const [{ initializeApp }, authSdk, firestoreSdk] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js'),
    ]);

    const app = initializeApp(FIREBASE_CONFIG);
    const auth = authSdk.getAuth(app);
    const database = firestoreSdk.getFirestore(app);
    const provider = new authSdk.GoogleAuthProvider();
    let currentUser = null;
    let syncTimer = null;
    let syncing = false;

    const userReference = () => firestoreSdk.doc(database, 'users', currentUser.uid);

    function paintUser(user) {
      if (!user) {
        authButton.textContent = '☁ Sign in to sync';
        authButton.setAttribute('aria-label', 'Sign in to synchronise progress');
        return;
      }

      authButton.replaceChildren();
      if (user.photoURL) {
        const photo = document.createElement('img');
        photo.className = 'avatar';
        photo.src = user.photoURL;
        photo.alt = '';
        authButton.append(photo);
      }
      const label = document.createElement('span');
      label.textContent = `${user.displayName?.split(' ')[0] || 'Account'} · Sign out`;
      authButton.append(label);
      authButton.setAttribute('aria-label', 'Signed in. Sign out of progress synchronisation');
    }

    async function syncNow() {
      if (!currentUser || syncing) return;
      syncing = true;
      setStatus('Synchronising progress…');
      try {
        await firestoreSdk.setDoc(userReference(), {
          progress: getProgress(),
          updatedAt: firestoreSdk.serverTimestamp(),
          updatedAtMs: Date.now(),
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
        }, { merge: true });
        setStatus('Progress synchronised across devices', 'good');
      } catch (error) {
        console.warn('Progress sync deferred:', error);
        setStatus('Saved in this browser · cloud sync will retry', 'warn');
      } finally {
        syncing = false;
      }
    }

    function queueSync() {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncNow, 650);
    }

    subscribeToProgress(({ origin }) => {
      if (origin === 'local' && currentUser) queueSync();
    });

    authButton.addEventListener('click', async () => {
      authButton.disabled = true;
      try {
        if (currentUser) await authSdk.signOut(auth);
        else await authSdk.signInWithPopup(auth, provider);
      } catch (error) {
        console.warn('Authentication:', error);
        setStatus(
          error.code === 'auth/popup-closed-by-user'
            ? 'Sign-in cancelled'
            : 'Could not sign in · progress remains in this browser',
          'warn',
        );
      } finally {
        authButton.disabled = false;
      }
    });

    authSdk.onAuthStateChanged(auth, async user => {
      currentUser = user;
      paintUser(user);
      if (!user) {
        setStatus('Progress is saved in this browser');
        return;
      }

      setStatus('Checking cloud progress…');
      try {
        const snapshot = await firestoreSdk.getDoc(userReference());
        if (!snapshot.exists()) {
          await syncNow();
          return;
        }

        const remote = snapshot.data();
        const remoteTime = Number(remote.updatedAtMs) || 0;
        if (remoteTime > getUpdatedAt()) {
          replaceProgress(remote.progress || {}, remoteTime);
          setStatus('Cloud progress restored', 'good');
        } else {
          await syncNow();
        }
      } catch (error) {
        console.warn('Initial progress sync:', error);
        setStatus('Signed in · using browser progress for now', 'warn');
      }
    });

    window.addEventListener('online', () => {
      if (currentUser) syncNow();
    });
  } catch (error) {
    console.warn('Firebase unavailable:', error);
    authButton.disabled = true;
    setStatus('Cloud sync is temporarily unavailable', 'warn');
  }
}
