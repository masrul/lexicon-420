export async function loadWords() {
  const response = await fetch('data/words.json?v=20261104-editorial1');
  if (!response.ok) throw new Error(`Vocabulary data failed to load (${response.status})`);
  const words = await response.json();
  if (!Array.isArray(words) || words.length !== 420) {
    throw new Error('Vocabulary data is incomplete');
  }
  return words;
}
