import { byId, element } from './dom.js';
import { getWordProgress } from './progress.js';

export function initQuiz(words) {
  const quizContent = byId('quizContent');
  const quizLaunch = byId('quizLaunch');
  let questions = [];
  let choicePool = [];
  let questionIndex = 0;
  let score = 0;
  let mistakes = [];
  let selectedWord = null;
  let answered = false;

  const shuffled = list => {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  };

  const button = (label, className = 'btn') => {
    const item = element('button', className, label);
    item.type = 'button';
    return item;
  };

  function leaveQuiz() {
    document.body.classList.remove('quiz-mode');
    quizContent.replaceChildren();
    quizLaunch.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startQuiz(retryWords = null) {
    choicePool = words.filter(word => getWordProgress(word.word).learned);
    document.body.classList.add('quiz-mode');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (choicePool.length < 4) {
      renderGate();
      return;
    }

    const source = retryWords?.length ? retryWords : choicePool;
    questions = shuffled(source).slice(0, Math.min(10, source.length));
    questionIndex = 0;
    score = 0;
    mistakes = [];
    renderQuestion();
  }

  function renderGate() {
    quizContent.replaceChildren();
    const box = element('div', 'quiz-result');
    const heading = element('h2', '', 'Learn four words to begin');
    heading.id = 'quizHeading';
    const actions = element('div', 'quiz-actions');
    const back = button('Return to study');
    back.addEventListener('click', leaveQuiz);
    actions.append(back);
    box.append(
      element('div', 'quiz-kicker', 'Learned words quiz'),
      heading,
      element('p', 'meta-note', `You have marked ${choicePool.length} of the four words needed for a fair multiple-choice quiz.`),
      actions,
    );
    quizContent.append(box);
  }

  function buildChoices(question) {
    const usedMeanings = new Set([question.meaning]);
    const choices = [question];
    const candidates = [
      ...shuffled(choicePool.filter(word => word.word !== question.word)),
      ...shuffled(words.filter(word => !getWordProgress(word.word).learned)),
    ];

    for (const candidate of candidates) {
      if (usedMeanings.has(candidate.meaning)) continue;
      choices.push(candidate);
      usedMeanings.add(candidate.meaning);
      if (choices.length === 4) break;
    }
    return shuffled(choices);
  }

  function renderQuestion() {
    selectedWord = null;
    answered = false;
    quizContent.replaceChildren();

    const question = questions[questionIndex];
    const top = element('div', 'quiz-top');
    const left = element('div');
    left.append(
      element('div', 'quiz-kicker', 'Learned words quiz'),
      element('div', 'quiz-score', `Score: ${score}`),
    );
    top.append(left, element('div', 'quiz-progress', `${questionIndex + 1} / ${questions.length}`));

    const heading = element('h1', 'quiz-question');
    heading.id = 'quizHeading';
    heading.append('What does “', element('span', 'quiz-word', question.word), '” mean?');

    const options = element('div', 'quiz-options');
    const submit = button('Submit answer', 'btn primary');
    submit.disabled = true;

    buildChoices(question).forEach((choice, index) => {
      const option = element('button', 'quiz-option');
      option.type = 'button';
      option.dataset.word = choice.word;
      option.append(
        element('span', 'quiz-letter', 'ABCD'[index]),
        element('span', '', choice.meaning),
      );
      option.addEventListener('click', () => {
        if (answered) return;
        selectedWord = choice.word;
        options.querySelectorAll('.quiz-option').forEach(item => {
          item.classList.toggle('selected', item === option);
        });
        submit.disabled = false;
      });
      options.append(option);
    });

    const actions = element('div', 'quiz-actions');
    const exit = button('Exit quiz');
    exit.addEventListener('click', leaveQuiz);
    submit.addEventListener('click', () => submitAnswer(question, options, actions));
    actions.append(exit, submit);
    quizContent.append(top, heading, options, actions);
  }

  function submitAnswer(question, options, actions) {
    if (!selectedWord || answered) return;
    answered = true;
    const correct = selectedWord === question.word;
    if (correct) score += 1;
    else mistakes.push(question);

    options.querySelectorAll('.quiz-option').forEach(option => {
      option.disabled = true;
      option.classList.remove('selected');
      if (option.dataset.word === question.word) option.classList.add('correct');
      else if (option.dataset.word === selectedWord) option.classList.add('wrong');
    });

    const chosen = words.find(word => word.word === selectedWord);
    const feedback = element('div', `quiz-feedback ${correct ? 'good' : 'bad'}`);
    feedback.setAttribute('role', 'status');
    feedback.append(element('h3', '', correct ? '✓ Correct!' : '✕ Not quite'));
    if (correct) {
      feedback.append(element('p', '', `${question.word} — ${question.meaning}`));
    } else {
      feedback.append(
        element('p', '', `Your answer: ${chosen?.meaning || ''}`),
        element('p', '', `Correct answer: ${question.meaning}`),
      );
    }
    feedback.append(element('p', 'bn', question.bn));
    const example = question.examples?.[0];
    if (example) {
      feedback.append(element('p', 'meta-note', `“${example.sentence}” ${example.explanation || ''}`));
    }
    quizContent.insertBefore(feedback, actions);

    actions.replaceChildren();
    const exit = button('Exit quiz');
    const next = button(
      questionIndex === questions.length - 1 ? 'See results' : 'Next question',
      'btn primary',
    );
    exit.addEventListener('click', leaveQuiz);
    next.addEventListener('click', () => {
      questionIndex += 1;
      if (questionIndex >= questions.length) renderResults();
      else renderQuestion();
    });
    actions.append(exit, next);
    next.focus();
  }

  function renderResults() {
    quizContent.replaceChildren();
    const accuracy = Math.round((score / questions.length) * 100);
    const box = element('div', 'quiz-result');
    const heading = element(
      'h2',
      '',
      accuracy >= 80 ? 'Great work!' : accuracy >= 60 ? 'Good progress!' : 'Keep practising!',
    );
    heading.id = 'quizHeading';

    const metrics = element('div', 'quiz-result-grid');
    metrics.append(
      element('span', '', `Correct: ${score}`),
      element('span', '', `Incorrect: ${questions.length - score}`),
      element('span', '', `Accuracy: ${accuracy}%`),
    );

    const actions = element('div', 'quiz-actions');
    if (mistakes.length) {
      const retry = button(
        `Retry ${mistakes.length} mistake${mistakes.length === 1 ? '' : 's'}`,
        'btn primary',
      );
      retry.addEventListener('click', () => startQuiz(mistakes));
      actions.append(retry);
    }

    const again = button('New quiz');
    const back = button('Return to study');
    again.addEventListener('click', () => startQuiz());
    back.addEventListener('click', leaveQuiz);
    actions.append(again, back);

    box.append(
      element('div', 'quiz-kicker', 'Quiz complete'),
      heading,
      element('div', 'quiz-result-number', `${score} / ${questions.length}`),
      metrics,
      actions,
    );
    quizContent.append(box);
  }

  quizLaunch.addEventListener('click', () => startQuiz());
}
