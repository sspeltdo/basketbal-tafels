// ===== STATE =====
let selectedSeries = [];     // e.g. [{type:'multiply', value:5}, {type:'divide', value:3}]
let totalQuestions = 10;
let questions = [];
let currentIndex = 0;
let correctCount = 0;
let answerLocked = false;    // prevent double-clicks while feedback is shown

// ===== DOM REFERENCES =====
const screenWelcome = document.getElementById('screen-welcome');
const screenGame    = document.getElementById('screen-game');
const screenEnd     = document.getElementById('screen-end');

const btnPlay       = document.getElementById('btn-play');
const questionCount = document.getElementById('question-count');

const questionLabel = document.getElementById('question-label');
const scoreCorrect  = document.getElementById('score-correct');
const scoreTotal    = document.getElementById('score-total');
const questionText  = document.getElementById('question-text');

const mcArea        = document.getElementById('mc-area');
const mcBtns        = [0,1,2,3].map(i => document.getElementById('mc-btn-' + i));
const fillArea      = document.getElementById('fill-area');
const fillInput     = document.getElementById('fill-input');
const fillSubmit    = document.getElementById('fill-submit');

const feedback      = document.getElementById('feedback');
const feedbackIcon  = document.getElementById('feedback-icon');
const feedbackText  = document.getElementById('feedback-text');

const endTitle      = document.getElementById('end-title');
const endScore      = document.getElementById('end-score');
const endMessage    = document.getElementById('end-message');
const btnReplaySame = document.getElementById('btn-replay-same');
const btnReplayNew  = document.getElementById('btn-replay-new');

// ===== WELCOME SCREEN LOGIC =====

// Toggle series buttons
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('selected');
    updatePlayButton();
  });
});

function updatePlayButton() {
  const anySelected = document.querySelectorAll('.toggle-btn.selected').length > 0;
  btnPlay.disabled = !anySelected;
}

// Clamp question count on input
questionCount.addEventListener('input', () => {
  let v = parseInt(questionCount.value, 10);
  if (isNaN(v)) return;
  if (v < 5)  questionCount.value = 5;
  if (v > 20) questionCount.value = 20;
});

// Play button
btnPlay.addEventListener('click', () => {
  selectedSeries = [];
  document.querySelectorAll('.toggle-btn.selected').forEach(btn => {
    selectedSeries.push({ type: btn.dataset.type, value: parseInt(btn.dataset.value, 10) });
  });
  totalQuestions = parseInt(questionCount.value, 10) || 10;
  totalQuestions = Math.max(5, Math.min(20, totalQuestions));
  startGame();
});

// ===== QUESTION GENERATION =====

/**
 * Generate all multiplication facts for a given multiplier (1–10).
 * Returns array of { question, answer } objects.
 */
function generateMultiplyQuestions(value) {
  const qs = [];
  for (let i = 1; i <= 10; i++) {
    qs.push({ question: `${value} × ${i} = ?`, answer: value * i });
  }
  return qs;
}

/**
 * Generate division questions: for divisor d, produce (d*i) ÷ d = i for i = 1..10.
 */
function generateDivideQuestions(value) {
  const qs = [];
  for (let i = 1; i <= 10; i++) {
    qs.push({ question: `${value * i} ÷ ${value} = ?`, answer: i });
  }
  return qs;
}

/**
 * Build and shuffle the questions list for the current game.
 */
function buildQuestions() {
  let pool = [];
  selectedSeries.forEach(series => {
    if (series.type === 'multiply') {
      pool = pool.concat(generateMultiplyQuestions(series.value));
    } else {
      pool = pool.concat(generateDivideQuestions(series.value));
    }
  });

  // Shuffle pool
  shuffle(pool);

  // Pick totalQuestions from pool, cycling if needed
  questions = [];
  for (let i = 0; i < totalQuestions; i++) {
    questions.push(pool[i % pool.length]);
  }

  // Assign question type: alternate or random (50/50)
  questions = questions.map(q => ({
    ...q,
    type: Math.random() < 0.5 ? 'mc' : 'fill'
  }));
}

/** Fisher-Yates shuffle in place */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Generate 3 wrong but plausible answers for a given correct answer.
 */
function generateWrongAnswers(correctAnswer) {
  const wrongs = new Set();
  const range = Math.max(4, Math.floor(correctAnswer * 0.5));

  while (wrongs.size < 3) {
    // Pick a neighbour offset between -range and +range (not 0)
    let offset = Math.floor(Math.random() * range * 2 + 1) - range;
    if (offset === 0) offset = 1;
    const candidate = correctAnswer + offset;
    if (candidate > 0 && candidate !== correctAnswer && !wrongs.has(candidate)) {
      wrongs.add(candidate);
    }
  }
  return [...wrongs];
}

// ===== GAME FLOW =====

function startGame() {
  buildQuestions();
  currentIndex = 0;
  correctCount = 0;
  answerLocked = false;

  showScreen(screenGame);
  updateScoreboard();
  showQuestion();
}

function showQuestion() {
  answerLocked = false;
  const q = questions[currentIndex];

  // Update header
  questionLabel.textContent = `Vraag ${currentIndex + 1} van ${totalQuestions}`;
  updateScoreboard();

  // Update progress bar
  updateProgressBar();

  // Show question text
  questionText.textContent = q.question;

  // Reset feedback
  feedback.classList.add('hidden');
  feedback.classList.remove('correct-fb', 'wrong-fb');

  if (q.type === 'mc') {
    showMultipleChoice(q);
  } else {
    showFillIn();
  }
}

function showMultipleChoice(q) {
  mcArea.classList.remove('hidden');
  fillArea.classList.add('hidden');

  const wrongAnswers = generateWrongAnswers(q.answer);
  const allAnswers = [q.answer, ...wrongAnswers];
  shuffle(allAnswers);

  mcBtns.forEach((btn, i) => {
    btn.textContent = allAnswers[i];
    btn.dataset.answer = allAnswers[i];
    btn.disabled = false;
    btn.classList.remove('correct', 'wrong');

    btn.onclick = () => {
      if (answerLocked) return;
      handleMCAnswer(parseInt(btn.dataset.answer, 10), q.answer, btn);
    };
  });
}

function showFillIn() {
  mcArea.classList.add('hidden');
  fillArea.classList.remove('hidden');

  fillInput.value = '';
  fillInput.disabled = false;
  fillSubmit.disabled = false;
  fillInput.focus();

  // Submit on button click
  fillSubmit.onclick = () => submitFillIn();

  // Submit on Enter key
  fillInput.onkeydown = (e) => {
    if (e.key === 'Enter') submitFillIn();
  };
}

function submitFillIn() {
  if (answerLocked) return;
  const val = parseInt(fillInput.value, 10);
  if (isNaN(val)) {
    fillInput.focus();
    return;
  }
  const q = questions[currentIndex];
  handleFillAnswer(val, q.answer);
}

function handleMCAnswer(chosen, correct, clickedBtn) {
  answerLocked = true;
  mcBtns.forEach(b => { b.disabled = true; });

  if (chosen === correct) {
    clickedBtn.classList.add('correct');
    showFeedback(true, correct);
    correctCount++;
  } else {
    clickedBtn.classList.add('wrong');
    // Highlight the correct answer
    mcBtns.forEach(b => {
      if (parseInt(b.dataset.answer, 10) === correct) b.classList.add('correct');
    });
    showFeedback(false, correct);
  }

  scheduleNextQuestion();
}

function handleFillAnswer(given, correct) {
  answerLocked = true;
  fillInput.disabled = true;
  fillSubmit.disabled = true;

  if (given === correct) {
    fillInput.style.borderColor = 'var(--green)';
    fillInput.style.background = 'rgba(39,174,96,0.2)';
    showFeedback(true, correct);
    correctCount++;
  } else {
    fillInput.style.borderColor = 'var(--red)';
    fillInput.style.background = 'rgba(231,76,60,0.2)';
    showFeedback(false, correct);
  }

  // Reset fill input styles for next question
  setTimeout(() => {
    fillInput.style.borderColor = '';
    fillInput.style.background = '';
  }, 1600);

  scheduleNextQuestion();
}

const correctMessages = [
  'SWOOSH! 🏀', 'Yes! Goed zo! 🌟', 'Super! 🔥', 'Geweldig! 💪',
  'Raak! 🏀', 'Briljant! ⭐', 'Toptafel! 🏆', 'Knap gedaan! 👏'
];

const wrongMessages = [
  'Bijna! Probeer opnieuw! 💪', 'Niet getreurd, volgende keer! 😊',
  'Oeps! Dat was anders. 🤔', 'Blijf trainen! 🏋️'
];

function showFeedback(isCorrect, correctAnswer) {
  feedback.classList.remove('hidden', 'correct-fb', 'wrong-fb');

  if (isCorrect) {
    feedback.classList.add('correct-fb');
    const msg = correctMessages[Math.floor(Math.random() * correctMessages.length)];
    feedbackIcon.textContent = '✅';
    feedbackText.textContent = msg;
    showSwoosh();
  } else {
    feedback.classList.add('wrong-fb');
    const msg = wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
    feedbackIcon.textContent = '❌';
    feedbackText.textContent = `${msg} Het antwoord was ${correctAnswer}.`;
  }
}

function showSwoosh() {
  const el = document.createElement('div');
  el.className = 'swoosh-overlay';
  el.textContent = '🏀';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function scheduleNextQuestion() {
  updateScoreboard();
  setTimeout(() => {
    currentIndex++;
    if (currentIndex >= totalQuestions) {
      showEndScreen();
    } else {
      showQuestion();
    }
  }, 1600);
}

function updateScoreboard() {
  scoreCorrect.textContent = correctCount;
  scoreTotal.textContent = Math.min(currentIndex + 1, totalQuestions);
}

function updateProgressBar() {
  let bar = document.querySelector('.progress-bar');
  if (!bar) {
    // Create progress bar if it doesn't exist
    const container = document.createElement('div');
    container.className = 'progress-bar-container';
    bar = document.createElement('div');
    bar.className = 'progress-bar';
    container.appendChild(bar);
    screenGame.insertBefore(container, screenGame.querySelector('.question-area'));
  }
  const pct = (currentIndex / totalQuestions) * 100;
  bar.style.width = pct + '%';
}

// ===== END SCREEN =====

function showEndScreen() {
  const pct = correctCount / totalQuestions;
  let title, message;

  if (pct === 1) {
    title = 'Perfecte wedstrijd! 🏆';
    message = 'Je bent een echte kampioen! Perfecte score! 🏆🏀';
  } else if (pct >= 0.8) {
    title = 'Geweldig gespeeld! 🌟';
    message = 'Bijna perfect! Je bent super goed bezig! 🌟🏀';
  } else if (pct >= 0.6) {
    title = 'Goed gedaan! 👍';
    message = 'Goed gedaan! Blijf oefenen en je wordt nóg beter! 👍';
  } else {
    title = 'Blijf trainen! 💪';
    message = 'Blijf trainen, je wordt elke dag beter! 💪🏀';
  }

  endTitle.textContent = title;
  endScore.textContent = `${correctCount} van ${totalQuestions}`;
  endMessage.textContent = message;

  showScreen(screenEnd);
}

// Replay buttons
btnReplaySame.addEventListener('click', () => {
  startGame();
});

btnReplayNew.addEventListener('click', () => {
  showScreen(screenWelcome);
});

// ===== SCREEN NAVIGATION =====

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}
