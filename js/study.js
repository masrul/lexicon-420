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
  let suggestionIndex = -1;
  let focusCardAfterRender = false;

  const search = byId('search');
  const searchWrap = search.closest('.control-wrap');
  const suggestions = element('div', 'search-suggestions hidden');
  suggestions.id = 'searchSuggestions';
  suggestions.setAttribute('role', 'listbox');
  suggestions.setAttribute('aria-label', 'Word suggestions');
  searchWrap.append(suggestions);
  search.setAttribute('role', 'combobox');
  search.setAttribute('aria-autocomplete', 'list');
  search.setAttribute('aria-controls', suggestions.id);
  search.setAttribute('aria-expanded', 'false');

  function applyFilters(keepSelection = true) {
    const selectedWord = keepSelection ? visible[index]?.word : null;
    const filter = byId('filter').value;

    visible = words.filter(word => {
      const status = getWordProgress(word.word);
      const matchesFilter = filter === 'all'
        || (filter === 'learned' && status.learned)
        || (filter === 'unlearned' && !status.learned)
        || (filter === 'bookmarked' && status.bookmark);
      return matchesFilter;
    });

    const selectedIndex = visible.findIndex(word => word.word === selectedWord);
    index = selectedIndex < 0 ? 0 : selectedIndex;
    revealed = false;
    render();
  }

  function goTo(nextIndex, focusCard = false, scrollCard = true) {
    if (nextIndex < 0 || nextIndex >= visible.length) return;
    index = nextIndex;
    revealed = false;
    focusCardAfterRender = focusCard;
    render();
    if (focusCard) {
      const card = byId('card');
      card.classList.remove('finder-focus-glow');
      void card.offsetWidth;
      card.classList.add('finder-focus-glow');
      setTimeout(() => card.classList.remove('finder-focus-glow'), 2100);
    } else if (scrollCard && window.innerWidth < 761) {
      const card = byId('card');
      const cardTop = window.scrollY + card.getBoundingClientRect().top - 12;
      window.scrollTo({ top: cardTop, left: window.scrollX, behavior: 'smooth' });
    }
    focusCardAfterRender = false;
  }

  function closeSuggestions() {
    suggestions.classList.add('hidden');
    suggestionIndex = -1;
    search.setAttribute('aria-expanded', 'false');
    search.removeAttribute('aria-activedescendant');
  }

  function chooseSuggestion(word) {
    search.value = word.word;
    byId('filter').value = 'all';
    applyFilters(false);
    const wordIndex = visible.findIndex(item => item.word === word.word);
    if (wordIndex >= 0) goTo(wordIndex, true);
    closeSuggestions();
  }

  function updateSuggestions() {
    const query = search.value.trim().toLocaleLowerCase();
    suggestions.replaceChildren();
    suggestionIndex = -1;
    if (!query) {
      closeSuggestions();
      return;
    }

    const matches = words
      .filter(item => item.word.toLocaleLowerCase().includes(query))
      .sort((a, b) => {
        const aPrefix = a.word.toLocaleLowerCase().startsWith(query) ? 0 : 1;
        const bPrefix = b.word.toLocaleLowerCase().startsWith(query) ? 0 : 1;
        return aPrefix - bPrefix || a.word.localeCompare(b.word);
      })
      .slice(0, 5);

    if (!matches.length) {
      closeSuggestions();
      return;
    }

    matches.forEach((item, matchIndex) => {
      const button = element('button', 'search-suggestion');
      const lowerWord = item.word.toLocaleLowerCase();
      const matchStart = lowerWord.indexOf(query);
      button.type = 'button';
      button.id = `searchSuggestion${matchIndex}`;
      button.setAttribute('role', 'option');
      button.dataset.word = item.word;
      if (matchStart > 0) button.append(document.createTextNode(item.word.slice(0, matchStart)));
      button.append(element('mark', '', item.word.slice(matchStart, matchStart + query.length)));
      if (matchStart + query.length < item.word.length) {
        button.append(document.createTextNode(item.word.slice(matchStart + query.length)));
      }
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => chooseSuggestion(item));
      suggestions.append(button);
    });
    suggestions.classList.remove('hidden');
    search.setAttribute('aria-expanded', 'true');
  }

  function moveSuggestion(direction) {
    const options = Array.from(suggestions.querySelectorAll('.search-suggestion'));
    if (!options.length) return;
    suggestionIndex = (suggestionIndex + direction + options.length) % options.length;
    options.forEach((option, optionIndex) => {
      const active = optionIndex === suggestionIndex;
      option.classList.toggle('active', active);
      option.setAttribute('aria-selected', String(active));
    });
    search.setAttribute('aria-activedescendant', options[suggestionIndex].id);
  }

  function renderStats() {
    const learned = words.filter(word => getWordProgress(word.word).learned).length;
    const bookmarked = words.filter(word => getWordProgress(word.word).bookmark).length;
    const counts = {
      all: words.length,
      unlearned: words.length - learned,
      learned,
      bookmarked,
    };
    const labels = {
      all: 'All words',
      unlearned: 'Not learned',
      learned: 'Learned',
      bookmarked: 'Bookmarked',
    };
    const filter = byId('filter');
    Array.from(filter.options).forEach(option => {
      option.textContent = `${labels[option.value]} (${counts[option.value]})`;
    });
    byId('filterLabel').textContent = `${labels[filter.value]} (${counts[filter.value]})`;
    document.querySelectorAll('[data-filter]').forEach(button => {
      const value = button.dataset.filter;
      button.textContent = `${labels[value]} (${counts[value]})`;
      button.classList.toggle('active', value === filter.value);
      if (value === filter.value) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
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
    if (!focusCardAfterRender) {
      const current = list.querySelector('.current');
      if (current) {
        const itemTop = current.offsetTop;
        const itemBottom = itemTop + current.offsetHeight;
        if (itemTop < list.scrollTop) list.scrollTop = itemTop;
        else if (itemBottom > list.scrollTop + list.clientHeight) {
          list.scrollTop = itemBottom - list.clientHeight;
        }
      }
    }
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
    byId('pos').textContent = `(${word.pos || 'vocabulary'})`;
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
      ? 'Hide'
      : 'Reveal';
    byId('reveal').setAttribute('aria-expanded', String(revealed));
    byId('learned').textContent = status.learned ? '✓ Learned' : '✓ Mark learned';
    byId('learned').classList.toggle('active', Boolean(status.learned));
    byId('bookmark').textContent = status.bookmark ? '★ Bookmarked' : '☆ Bookmark';
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

  byId('prev').addEventListener('click', () => goTo(index - 1, false, false));
  byId('next').addEventListener('click', () => goTo(index + 1, false, false));

  function shuffleVisible() {
    if (visible.length < 2) return;
    const randomIndex = Math.floor(Math.random() * (visible.length - 1));
    goTo(randomIndex >= index ? randomIndex + 1 : randomIndex, false, false);
  }

  const flashcard = byId('card').querySelector('.flash');
  let swipeStart = null;
  let lastCardTap = null;

  function resetSwipeCard() {
    flashcard.classList.remove('swiping', 'swipe-left', 'swipe-right', 'swipe-away');
    flashcard.style.removeProperty('--swipe-x');
    flashcard.style.removeProperty('--swipe-rotate');
    flashcard.style.removeProperty('--swipe-opacity');
  }

  function finishSwipe(direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= visible.length) {
      flashcard.classList.add('swipe-snapback');
      resetSwipeCard();
      setTimeout(() => flashcard.classList.remove('swipe-snapback'), 260);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resetSwipeCard();
      goTo(nextIndex, false, false);
      return;
    }

    const flyRight = direction < 0;
    flashcard.classList.add('swipe-away', flyRight ? 'swipe-right' : 'swipe-left');
    flashcard.style.setProperty('--swipe-x', flyRight ? '115vw' : '-115vw');
    flashcard.style.setProperty('--swipe-rotate', flyRight ? '16deg' : '-16deg');
    flashcard.style.setProperty('--swipe-opacity', '0');
    setTimeout(() => {
      resetSwipeCard();
      goTo(nextIndex, false, false);
    }, 220);
  }

  flashcard.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || event.target.closest('button, a, input, select')) return;
    flashcard.classList.remove('swipe-snapback');
    swipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
  });

  flashcard.addEventListener('pointermove', event => {
    if (!swipeStart || swipeStart.id !== event.pointerId) return;
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    if (!swipeStart.dragging) {
      if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
        swipeStart = null;
        return;
      }
      if (Math.abs(deltaX) < 8) return;
      swipeStart.dragging = true;
      flashcard.setPointerCapture(event.pointerId);
      flashcard.classList.add('swiping');
    }
    event.preventDefault();
    const limitedX = Math.max(-window.innerWidth * .72, Math.min(window.innerWidth * .72, deltaX));
    const strength = Math.min(Math.abs(limitedX) / 150, 1);
    flashcard.classList.toggle('swipe-left', limitedX < 0);
    flashcard.classList.toggle('swipe-right', limitedX > 0);
    flashcard.style.setProperty('--swipe-x', `${limitedX}px`);
    flashcard.style.setProperty('--swipe-rotate', `${limitedX / 22}deg`);
    flashcard.style.setProperty('--swipe-opacity', String(1 - strength * .18));
  });

  flashcard.addEventListener('pointerup', event => {
    if (!swipeStart || swipeStart.id !== event.pointerId) return;
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    const wasDragging = swipeStart.dragging;
    swipeStart = null;
    if (!wasDragging) {
      const now = performance.now();
      const isDoubleTap = lastCardTap
        && now - lastCardTap.time < 340
        && Math.hypot(event.clientX - lastCardTap.x, event.clientY - lastCardTap.y) < 28;
      if (isDoubleTap) {
        event.preventDefault();
        lastCardTap = null;
        shuffleVisible();
      } else {
        lastCardTap = { time: now, x: event.clientX, y: event.clientY };
      }
      return;
    }
    lastCardTap = null;
    if (flashcard.hasPointerCapture(event.pointerId)) flashcard.releasePointerCapture(event.pointerId);
    event.preventDefault();
    if (Math.abs(deltaX) >= 82 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      finishSwipe(deltaX < 0 ? 1 : -1);
    } else {
      flashcard.classList.add('swipe-snapback');
      resetSwipeCard();
      setTimeout(() => flashcard.classList.remove('swipe-snapback'), 260);
    }
  });

  flashcard.addEventListener('pointercancel', () => {
    swipeStart = null;
    lastCardTap = null;
    flashcard.classList.add('swipe-snapback');
    resetSwipeCard();
    setTimeout(() => flashcard.classList.remove('swipe-snapback'), 260);
  });

  flashcard.addEventListener('dblclick', event => {
    if (event.sourceCapabilities?.firesTouchEvents) return;
    if (event.target.closest('button, a, input, select')) return;
    if (!window.getSelection()?.isCollapsed) return;
    event.preventDefault();
    shuffleVisible();
  });
  search.addEventListener('input', () => {
    updateSuggestions();
  });
  search.addEventListener('keydown', event => {
    if (suggestions.classList.contains('hidden')) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveSuggestion(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && suggestionIndex >= 0) {
      event.preventDefault();
      const selected = suggestions.querySelectorAll('.search-suggestion')[suggestionIndex];
      const word = words.find(item => item.word === selected?.dataset.word);
      if (word) chooseSuggestion(word);
    } else if (event.key === 'Escape') {
      closeSuggestions();
    }
  });
  search.addEventListener('focus', updateSuggestions);
  search.addEventListener('blur', closeSuggestions);
  byId('filter').addEventListener('change', () => applyFilters(false));
  byId('shuffle').addEventListener('click', shuffleVisible);

  const pronounceButton = byId('pronounce');
  if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
    pronounceButton.addEventListener('click', () => {
      const word = visible[index];
      if (!word) return;
      const speaker = window.speechSynthesis;
      speaker.cancel();
      pronounceButton.classList.add('speaking');
      pronounceButton.setAttribute('aria-label', `Playing pronunciation for ${word.word}`);
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(word.word);
        const englishVoices = speaker.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('en'));
        utterance.voice = englishVoices.find(voice => voice.lang.toLowerCase() === 'en-us') || englishVoices[0] || null;
        utterance.lang = utterance.voice?.lang || 'en-US';
        utterance.rate = 0.78;
        utterance.pitch = 1;
        utterance.volume = 1;
        const finish = () => {
          pronounceButton.classList.remove('speaking');
          pronounceButton.setAttribute('aria-label', 'Hear pronunciation');
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        speaker.speak(utterance);
        speaker.resume();
      }, 80);
    });
  } else {
    pronounceButton.disabled = true;
    pronounceButton.title = 'Pronunciation is not supported by this browser';
  }

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
