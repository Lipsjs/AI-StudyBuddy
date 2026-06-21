const EXAMPLE_NOTES = `Photosynthesis is the process plants use to convert light energy into chemical energy. It happens mainly in the chloroplasts of plant cells, using a pigment called chlorophyll that absorbs light, especially in the red and blue wavelengths.

The process has two main stages. The light-dependent reactions happen in the thylakoid membrane and use sunlight to split water molecules, releasing oxygen as a byproduct and producing ATP and NADPH. The light-independent reactions, also called the Calvin cycle, happen in the stroma and use that ATP and NADPH to convert carbon dioxide into glucose.

The overall chemical equation is: 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2. Photosynthesis is essential to life on Earth because it produces the oxygen most organisms breathe and forms the base of nearly every food chain.`;

const state = {
  mode: 'flashcards',
  data: null,
  cardIndex: 0,
  isFlipped: false,
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false
};

const el = {
  notesInput: document.getElementById('notesInput'),
  charCount: document.getElementById('charCount'),
  exampleBtn: document.getElementById('exampleBtn'),
  modeTabs: document.querySelectorAll('.mode-tab'),
  generateBtn: document.getElementById('generateBtn'),
  generateLabel: document.getElementById('generateLabel'),
  errorMsg: document.getElementById('errorMsg'),
  intakeSection: document.getElementById('intakeSection'),
  resultsSection: document.getElementById('resultsSection'),
  resultsContent: document.getElementById('resultsContent'),
  backBtn: document.getElementById('backBtn')
};

el.notesInput.addEventListener('input', () => {
  el.charCount.textContent = `${el.notesInput.value.length} characters`;
});

el.exampleBtn.addEventListener('click', () => {
  el.notesInput.value = EXAMPLE_NOTES;
  el.charCount.textContent = `${EXAMPLE_NOTES.length} characters`;
  el.notesInput.focus();
});

el.modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    state.mode = tab.dataset.mode;
    el.modeTabs.forEach((t) => t.setAttribute('aria-pressed', t === tab ? 'true' : 'false'));
  });
});

el.backBtn.addEventListener('click', () => {
  el.resultsSection.hidden = true;
  el.intakeSection.hidden = false;
});

el.generateBtn.addEventListener('click', generate);

async function generate() {
  const content = el.notesInput.value.trim();
  el.errorMsg.textContent = '';

  if (!content) {
    el.errorMsg.textContent = 'Paste some notes first.';
    return;
  }

  el.generateBtn.disabled = true;
  el.generateLabel.textContent = 'generating…';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, mode: state.mode })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    state.data = data;
    state.cardIndex = 0;
    state.isFlipped = false;
    state.quizIndex = 0;
    state.quizScore = 0;
    state.quizAnswered = false;

    el.intakeSection.hidden = true;
    el.resultsSection.hidden = false;
    render();
  } catch (err) {
    el.errorMsg.textContent = err.message;
  } finally {
    el.generateBtn.disabled = false;
    el.generateLabel.textContent = 'generate';
  }
}

function render() {
  if (state.mode === 'flashcards') renderFlashcards();
  else if (state.mode === 'quiz') renderQuiz();
  else renderSummary();
}

/* ---------------- flashcards ---------------- */

function renderFlashcards() {
  const cards = state.data.cards || [];
  if (!cards.length) {
    el.resultsContent.innerHTML = `<p class="skeleton">No cards came back. Try again with more detailed notes.</p>`;
    return;
  }
  const card = cards[state.cardIndex];

  el.resultsContent.innerHTML = `
    <p class="card-counter">card ${state.cardIndex + 1} of ${cards.length} · tap to flip</p>
    <div class="flip-stage">
      <div class="flip-card ${state.isFlipped ? 'is-flipped' : ''}" id="flipCard">
        <div class="flip-card-inner">
          <div class="flip-face front">${escapeHtml(card.front)}</div>
          <div class="flip-face back">${escapeHtml(card.back)}</div>
        </div>
      </div>
    </div>
    <p class="flip-hint">click the card to reveal the answer</p>
    <div class="card-nav">
      <button id="prevCard" ${state.cardIndex === 0 ? 'disabled' : ''}>previous</button>
      <button id="nextCard" ${state.cardIndex === cards.length - 1 ? 'disabled' : ''}>next</button>
    </div>
  `;

  document.getElementById('flipCard').addEventListener('click', () => {
    state.isFlipped = !state.isFlipped;
    renderFlashcards();
  });
  document.getElementById('prevCard').addEventListener('click', () => {
    state.cardIndex = Math.max(0, state.cardIndex - 1);
    state.isFlipped = false;
    renderFlashcards();
  });
  document.getElementById('nextCard').addEventListener('click', () => {
    state.cardIndex = Math.min(cards.length - 1, state.cardIndex + 1);
    state.isFlipped = false;
    renderFlashcards();
  });
}

/* ---------------- quiz ---------------- */

function renderQuiz() {
  const questions = state.data.questions || [];
  if (!questions.length) {
    el.resultsContent.innerHTML = `<p class="skeleton">No questions came back. Try again with more detailed notes.</p>`;
    return;
  }

  if (state.quizIndex >= questions.length) {
    el.resultsContent.innerHTML = `
      <div class="quiz-card quiz-score">
        <span class="big">${state.quizScore} / ${questions.length}</span>
        <p>want to try it again?</p>
        <button class="quiz-next" id="retryQuiz">retry quiz</button>
      </div>
    `;
    document.getElementById('retryQuiz').addEventListener('click', () => {
      state.quizIndex = 0;
      state.quizScore = 0;
      state.quizAnswered = false;
      renderQuiz();
    });
    return;
  }

  const q = questions[state.quizIndex];
  const dots = questions.map((_, i) => {
    let cls = 'quiz-dot';
    if (i < state.quizIndex) cls += ' done';
    if (i === state.quizIndex) cls += ' current';
    return `<span class="${cls}"></span>`;
  }).join('');

  el.resultsContent.innerHTML = `
    <div class="quiz-progress">${dots}</div>
    <div class="quiz-card">
      <p class="quiz-question">${escapeHtml(q.question)}</p>
      ${q.options.map((opt, i) => `<button class="quiz-option" data-i="${i}">${escapeHtml(opt)}</button>`).join('')}
      <div id="quizFeedback"></div>
    </div>
  `;

  el.resultsContent.querySelectorAll('.quiz-option').forEach((btn) => {
    btn.addEventListener('click', () => handleQuizAnswer(q, Number(btn.dataset.i)));
  });
}

function handleQuizAnswer(question, chosenIndex) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  const buttons = el.resultsContent.querySelectorAll('.quiz-option');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === question.correctIndex) btn.classList.add('correct');
    else if (i === chosenIndex) btn.classList.add('incorrect');
  });

  if (chosenIndex === question.correctIndex) state.quizScore += 1;

  const feedback = document.getElementById('quizFeedback');
  feedback.innerHTML = `
    <p class="quiz-explanation">${escapeHtml(question.explanation || '')}</p>
    <button class="quiz-next" id="nextQuestion">next question</button>
  `;
  document.getElementById('nextQuestion').addEventListener('click', () => {
    state.quizIndex += 1;
    state.quizAnswered = false;
    renderQuiz();
  });
}

/* ---------------- summary ---------------- */

function renderSummary() {
  const { summary, keyPoints } = state.data;
  el.resultsContent.innerHTML = `
    <div class="summary-page">
      <h2 class="summary-heading">TL;DR</h2>
      <p class="summary-text">${escapeHtml(summary || '')}</p>
      <ul class="key-points">
        ${(keyPoints || []).map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
    </div>
  `;
}

/* ---------------- helpers ---------------- */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
