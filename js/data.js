const MAGIC = 'LX42';
const PBKDF2_ITERATIONS = 120000;

async function decryptVocabulary(payload) {
  const bytes = new Uint8Array(payload);
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  if (magic !== MAGIC || bytes[4] !== 1) throw new Error('Vocabulary data format is invalid');

  const salt = bytes.slice(5, 21);
  const iv = bytes.slice(21, 33);
  const ciphertext = bytes.slice(33);
  // Key hint: her nickname. This is concealment for a public browser app, not a security boundary.
  const passphrase = String.fromCharCode(112, 114, 105, 116, 111, 109);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function loadWords() {
  const response = await fetch('data/lexicon.bin?v=20261104-encrypted1');
  if (!response.ok) throw new Error(`Vocabulary data failed to load (${response.status})`);
  const words = await decryptVocabulary(await response.arrayBuffer());
  if (!Array.isArray(words) || words.length !== 420) {
    throw new Error('Vocabulary data is incomplete');
  }
  return words;
}
