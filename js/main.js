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
    const searchField = document.getElementById('search');
    if (searchField) searchField.placeholder = 'Find';
    const filterGraphic = document.querySelector('.filter-icon svg');
    if (filterGraphic) {
      filterGraphic.innerHTML = '<path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h3m4 0h9"/><path d="M9 3v6M13 9v6M7 15v6"/>';
    }
    const cardMeta = document.querySelector('.cardmeta');
    const previousButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');
    const partOfSpeech = document.getElementById('pos');
    const shuffleButton = document.getElementById('shuffle');
    const positionLabel = document.getElementById('position');
    const counter = document.getElementById('counter');
    const oldNavigation = document.querySelector('.navigation');
    if (cardMeta && previousButton && nextButton && partOfSpeech && shuffleButton && positionLabel) {
      const metaSummary = document.createElement('div');
      metaSummary.className = 'card-meta-summary';
      metaSummary.append(positionLabel, partOfSpeech);
      const inlineNavigation = document.createElement('nav');
      inlineNavigation.className = 'inline-card-nav';
      inlineNavigation.setAttribute('aria-label', 'Flashcard navigation');
      previousButton.textContent = '←';
      previousButton.setAttribute('aria-label', 'Previous word');
      nextButton.textContent = '→';
      nextButton.setAttribute('aria-label', 'Next word');
      shuffleButton.textContent = '↻';
      shuffleButton.setAttribute('aria-label', 'Shuffle words');
      inlineNavigation.append(previousButton, shuffleButton, nextButton);
      cardMeta.replaceChildren(metaSummary, inlineNavigation);
      counter?.classList.add('sr-only');
      oldNavigation?.remove();
    }
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
