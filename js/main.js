import { loadWords } from './data.js';
import { initStudy } from './study.js?v=20261104-4';
import { initQuiz } from './quiz.js';
import { initFirebaseSync } from './firebase-sync.js?v=20261103-2';

async function start() {
  try {
    const words = await loadWords();
    const wordLine = document.querySelector('.word-line');
    if (wordLine && !document.getElementById('pronounce')) {
      const pronounceButton = document.createElement('button');
      pronounceButton.className = 'pronounce';
      pronounceButton.id = 'pronounce';
      pronounceButton.type = 'button';
      pronounceButton.textContent = '🔊';
      pronounceButton.setAttribute('aria-label', 'Hear pronunciation');
      pronounceButton.title = 'Hear pronunciation';
      wordLine.append(pronounceButton);
    }
    const filterControl = document.querySelector('.filter-icon');
    const filterSelect = document.getElementById('filter');
    const filterLabel = document.getElementById('filterLabel');
    if (filterControl && filterSelect && filterLabel) {
      const filterMenu = document.createElement('details');
      filterMenu.className = 'filter-menu';
      const summary = document.createElement('summary');
      summary.setAttribute('aria-label', 'Filter words');
      const icon = filterControl.querySelector('svg')?.cloneNode(true);
      if (icon) summary.append(icon);
      summary.append(filterLabel);
      const panel = document.createElement('div');
      panel.className = 'filter-panel';
      Array.from(filterSelect.options).forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.filter = option.value;
        button.textContent = option.textContent;
        button.addEventListener('click', () => {
          filterSelect.value = option.value;
          filterSelect.dispatchEvent(new Event('change', { bubbles: true }));
          filterMenu.removeAttribute('open');
        });
        panel.append(button);
      });
      filterSelect.classList.add('sr-only');
      filterMenu.append(summary, panel, filterSelect);
      filterControl.replaceWith(filterMenu);
      document.querySelector('.control-wrap')?.append(filterMenu);
      filterMenu.addEventListener('toggle', () => {
        if (filterMenu.open) document.getElementById('appMenu')?.removeAttribute('open');
      });
      document.addEventListener('click', event => {
        if (!filterMenu.contains(event.target)) filterMenu.removeAttribute('open');
      });
    }
    initStudy(words);
    initQuiz(words);
    initFirebaseSync();
    const card = document.getElementById('card');
    const wordIndex = document.querySelector('.side');
    const syncWordIndexHeight = () => {
      if (window.innerWidth > 800 && card && wordIndex && !card.classList.contains('hidden')) {
        wordIndex.style.height = `${card.offsetHeight}px`;
      } else {
        wordIndex?.style.removeProperty('height');
      }
    };
    if (card && wordIndex) {
      new ResizeObserver(syncWordIndexHeight).observe(card);
      window.addEventListener('resize', syncWordIndexHeight);
      syncWordIndexHeight();
    }
    const appMenu = document.getElementById('appMenu');
    appMenu?.addEventListener('toggle', () => {
      if (appMenu.open) document.querySelector('.filter-menu')?.removeAttribute('open');
    });
    appMenu?.addEventListener('click', event => {
      if (event.target.closest('button')) appMenu.removeAttribute('open');
    });
    document.addEventListener('click', event => {
      const accountIndicator = document.getElementById('accountIndicator');
      if (
        appMenu?.open
        && !appMenu.contains(event.target)
        && !accountIndicator?.contains(event.target)
      ) {
        appMenu.removeAttribute('open');
      }
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
