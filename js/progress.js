const STORAGE_KEY = 'lexicon420-progress-v1';
const LEGACY_STORAGE_KEY = 'gre333-complete-v2';
const UPDATED_KEY = `${STORAGE_KEY}-updatedAt`;
const listeners = new Set();

let progress = readStoredProgress();

function readStoredProgress() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (current) return current;
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)) || {};
    if (Object.keys(legacy).length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      const legacyUpdatedAt = localStorage.getItem(`${LEGACY_STORAGE_KEY}-updatedAt`);
      if (legacyUpdatedAt) localStorage.setItem(UPDATED_KEY, legacyUpdatedAt);
    }
    return legacy;
  } catch {
    return {};
  }
}

function persist(origin, updatedAt = Date.now()) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    localStorage.setItem(UPDATED_KEY, String(updatedAt));
  } catch (error) {
    console.warn('Browser progress could not be saved:', error);
  }
  listeners.forEach(listener => listener({ progress, updatedAt, origin }));
}

export function getProgress() {
  return progress;
}

export function getWordProgress(word) {
  return progress[word] || {};
}

export function getUpdatedAt() {
  return Number(localStorage.getItem(UPDATED_KEY)) || 0;
}

export function updateWordProgress(word, changes) {
  progress = {
    ...progress,
    [word]: { ...getWordProgress(word), ...changes },
  };
  persist('local');
}

export function replaceProgress(nextProgress, updatedAt = Date.now()) {
  progress = nextProgress && typeof nextProgress === 'object' ? nextProgress : {};
  persist('remote', updatedAt);
}

export function subscribeToProgress(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
