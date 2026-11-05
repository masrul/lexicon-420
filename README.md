# Lexicon 420

A bilingual vocabulary study app with 420 contextual flashcards, search, filtering,
learned and bookmarked progress, quizzes, pronunciation, and optional cloud sync.

The 420-word collection is compiled from the project owner's combined GRE study list.
Existing reviewed cards were preserved during the migration from Vocab 333, and progress
continues to use each word as its stable key.

## Features

- English meanings with বাংলা support
- Three explained examples for every word
- Synonyms, antonyms, and memory cues
- Search, filters, shuffle, bookmarks, and learned-word tracking
- Responsive design for phones, tablets, and computers
- Optional Google sign-in for cross-device progress synchronisation
- Learned-words quiz with feedback, scoring, and retry support
- Modular HTML, CSS, JavaScript, JSON data, and image assets

**Tagline:** Learn the words. Understand the context.

**Live app:** https://masrul.github.io/lexicon-420/

## Project structure

```text
index.html             App interface
css/styles.css         Responsive styling and animations
data/words.json        Vocabulary content
js/main.js             App startup
js/study.js            Flashcards, search, filters, and navigation
js/quiz.js             Learned-words quiz
js/progress.js         Browser progress storage
js/firebase-sync.js    Google sign-in and cloud synchronisation
js/data.js             Vocabulary loading and validation
js/dom.js              Shared DOM helpers
```

Created by [Masrul Huda](https://www.linkedin.com/in/masrulhuda/).
