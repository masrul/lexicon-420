import { loadWords } from './data.js';
import { initStudy } from './study.js';
import { initQuiz } from './quiz.js';
import { initFirebaseSync } from './firebase-sync.js';

async function start() {
  try {
    const words = await loadWords();
    initStudy(words);
    initQuiz(words);
    initFirebaseSync();
    const appMenu = document.getElementById('appMenu');
    appMenu?.addEventListener('click', event => {
      if (event.target.closest('button')) appMenu.removeAttribute('open');
    });
  } catch (error) {
    console.error(error);
    const empty = document.getElementById('empty');
    const card = document.getElementById('card');
    card?.classList.add('hidden');
    if (empty) {
      empty.textContent = 'The vocabulary data could not be loaded. Please refresh the page.';
      empty.classList.remove('hidden');
    }
  }
}

start();
