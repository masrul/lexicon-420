import { byId, element } from './dom.js';
import {
  getWordProgress,
  subscribeToProgress,
  updateWordProgress,
} from './progress.js';

export function initStudy(words) {
  let visible = [];
  let index = 0;
  let revealed = false;

  const matching = (word, query) => [
    word.word,
    word.meaning,
    word.bn,
    word.simple,
    word.syn || '',
    word.ant || '',
  ].some(value => value.toLocaleLowerCase().includes(query));

  function applyFilters(keepSelection = true) {
    const selectedWord = keepSelection ? visible[index]?.word : null;
    const query = byId('search').value.trim().toLocaleLowerCase();
    const filter = byId('filter').value;

    visible = words.filter(word => {
      const status = getWordProgress(word.word);
      const matchesFilter = filter === 'all'
        || (filter === 'learned' && status.learned)
        || (filter === 'unlearned' && !status.learned)
        || (filter === 'bookmarked' && status.bookmark);
      return matching(word, query) && matchesFilter;
    });

    const selectedIndex = visible.findIndex(word => word.word === selectedWord);
    index = selectedIndex < 0 ? 0 : selectedIndex;
    revealed = false;
    render();
  }

  function goTo(nextIndex) {
    if (nextIndex < 0 || nextIndex >= visible.length) return;
    index = nextIndex;
    revealed = false;
    render();
    if (window.innerWidth < 761) {
      byId('card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderStats() {
    const learned = words.filter(word => getWordProgress(word.word).learned).length;
    const bookmarked = words.filter(word => getWordProgress(word.word).bookmark).length;
    byId('progressLabel').textContent = `${learned} / ${words.length} learned`;
    byId('progressFill').style.width = `${(learned / words.length) * 100}%`;
    byId('bookmarkCount').textContent = `${bookmarked} bookmarked`;
    byId('resultCount').textContent = `${visible.length} matching`;
    byId('sideCount').textContent = `${visible.length} words`;
  }

  function renderWordList() {
    const list = byId('wordlist');
    const fragment = document.createDocumentFragment();
    list.replaceChildren();

    visible.forEach((word, wordIndex) => {
      const button = element('button', `worditem${wordIndex === index ? ' current' : ''}`);
      button.type = 'button';
      button.append(
        element('span', 'num', String(word.id).padStart(3, '0')),
        element('span', '', word.word),
      );
      if (getWordProgress(word.word).learned) button.append(element('span', 'check', '✓'));
      button.addEventListener('click', () => goTo(wordIndex));
      fragment.append(button);
    });

    list.append(fragment);
    list.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
  }

  function renderCard() {
    const hasWords = visible.length > 0;
    byId('card').classList.toggle('hidden', !hasWords);
    byId('empty').classList.toggle('hidden', hasWords);
    byId('prev').disabled = index === 0;
    byId('next').disabled = index >= visible.length - 1;
    byId('counter').textContent = hasWords ? `${index + 1} of ${visible.length}` : 'No results';
    if (!hasWords) return;

    const word = visible[index];
    const status = getWordProgress(word.word);
    byId('position').textContent = `WORD ${String(word.id).padStart(3, '0')} / ${words.length}`;
    byId('pos').textContent = word.pos || 'Vocabulary';
    byId('word').textContent = word.word;
    byId('meaning').textContent = word.meaning;
    byId('bangla').textContent = word.bn;
    byId('simple').textContent = word.simple;

    const examples = byId('examples');
    examples.replaceChildren();
    word.examples.forEach(example => {
      const box = element('div', 'example');
      box.append(
        element('div', 'label', example.kind),
        element('p', 'sentence', `“${example.sentence}”`),
      );
      if (example.explanation) box.append(element('p', 'explain', example.explanation));
      examples.append(box);
    });

    byId('extras').classList.toggle('hidden', !word.syn);
    if (word.syn) {
      byId('syn').textContent = word.syn;
      byId('ant').textContent = word.ant;
      byId('memory').textContent = word.memory;
    }

    byId('answer').classList.toggle('hidden', !revealed);
    byId('details').classList.toggle('hidden', !revealed);
    byId('reveal').textContent = revealed
      ? 'Hide meaning & explanation'
      : 'Reveal meaning & explanation';
    byId('reveal').setAttribute('aria-expanded', String(revealed));
    byId('learned').textContent = status.learned ? '✓ Learned' : '✓ Mark learned';
    byId('learned').classList.toggle('active', Boolean(status.learned));
    byId('bookmark').textContent = status.bookmark ? '★ Bookmarked' : '☆ Save card';
    byId('bookmark').classList.toggle('active', Boolean(status.bookmark));
  }

  function render() {
    renderStats();
    renderWordList();
    renderCard();
  }

  function celebrateReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const flash = document.querySelector('.flash');
    const word = byId('word');
    const answer = byId('answer');
    word.classList.remove('aha-bounce');
    answer.classList.remove('aha-answer');
    void word.offsetWidth;
    word.classList.add('aha-bounce');
    answer.classList.add('aha-answer');

    const bursts = [[-128, -80], [128, -72], [-158, 2], [158, 8], [-110, 86], [112, 92], [-38, -116], [42, -112]];
    bursts.forEach(([x, y], burstIndex) => {
      const spark = element('span', 'aha-spark', ['✦', '★', '•'][burstIndex % 3]);
      spark.style.setProperty('--x', `${x}px`);
      spark.style.setProperty('--y', `${y}px`);
      spark.style.setProperty('--delay', `${burstIndex * 0.035}s`);
      flash.append(spark);
      setTimeout(() => spark.remove(), 950);
    });

    setTimeout(() => {
      word.classList.remove('aha-bounce');
      answer.classList.remove('aha-answer');
    }, 950);
  }

  byId('reveal').addEventListener('click', () => {
    if (!visible[index]) return;
    revealed = !revealed;
    renderCard();
    if (revealed) celebrateReveal();
  });

  byId('learned').addEventListener('click', () => {
    const word = visible[index];
    if (!word) return;
    updateWordProgress(word.word, { learned: !getWordProgress(word.word).learned });
  });

  byId('bookmark').addEventListener('click', () => {
    const word = visible[index];
    if (!word) return;
    updateWordProgress(word.word, { bookmark: !getWordProgress(word.word).bookmark });
  });

  byId('prev').addEventListener('click', () => goTo(index - 1));
  byId('next').addEventListener('click', () => goTo(index + 1));
  byId('search').addEventListener('input', () => applyFilters(false));
  byId('filter').addEventListener('change', () => applyFilters(false));
  byId('shuffle').addEventListener('click', () => {
    if (visible.length < 2) return;
    const randomIndex = Math.floor(Math.random() * (visible.length - 1));
    goTo(randomIndex >= index ? randomIndex + 1 : randomIndex);
  });

  document.addEventListener('keydown', event => {
    if (document.body.classList.contains('quiz-mode')) return;
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName)) return;
    if (event.key === 'ArrowRight') goTo(index + 1);
    if (event.key === 'ArrowLeft') goTo(index - 1);
    if (event.code === 'Space') {
      event.preventDefault();
      byId('reveal').click();
    }
  });

  subscribeToProgress(() => {
    if (byId('filter').value === 'all') render();
    else applyFilters();
  });

  applyFilters(false);
}
