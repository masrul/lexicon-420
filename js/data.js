export async function loadWords() {
  const response = await fetch('data/words.json');
  if (!response.ok) throw new Error(`Vocabulary data failed to load (${response.status})`);
  const words = await response.json();
  if (!Array.isArray(words) || words.length !== 333) {
    throw new Error('Vocabulary data is incomplete');
  }
  return words;
}

