// ===== FULLSCREEN BUTTON =====
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnFullscreenIcon = btnFullscreen.querySelector('.btn-fullscreen-icon');
const btnFullscreenLabel = btnFullscreen.querySelector('.btn-fullscreen-label');

function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function updateFullscreenButton() {
  if (isFullscreen()) {
    btnFullscreenIcon.textContent = '✕';
    btnFullscreenLabel.textContent = 'Verlaat scherm';
    btnFullscreen.title = 'Verlaat volledig scherm';
    btnFullscreen.setAttribute('aria-label', 'Verlaat volledig scherm');
  } else {
    btnFullscreenIcon.textContent = '⛶';
    btnFullscreenLabel.textContent = 'Volledig scherm';
    btnFullscreen.title = 'Volledig scherm';
    btnFullscreen.setAttribute('aria-label', 'Volledig scherm');
  }
}

btnFullscreen.addEventListener('click', () => {
  if (!isFullscreen()) {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
});

document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
document.addEventListener('mozfullscreenchange', updateFullscreenButton);
document.addEventListener('MSFullscreenChange', updateFullscreenButton);

// Hide the fullscreen button when the browser doesn't support the fullscreen API (e.g. iOS Safari).
if (
  !document.documentElement.requestFullscreen &&
  !document.documentElement.webkitRequestFullscreen &&
  !document.documentElement.mozRequestFullScreen &&
  !document.documentElement.msRequestFullscreen
) {
  btnFullscreen.style.display = 'none';
}

// ===== TOGGLE BUTTONS & SELECT ALL =====
const btnPlay = document.getElementById('btn-play');

function updatePlayButton() {
  const anySelected = document.querySelector('.toggle-btn.selected') !== null;
  btnPlay.disabled = !anySelected;
}

function updateSelectAll(type) {
  const checkboxId = type === 'multiply' ? 'select-all-multiply' : 'select-all-divide';
  const checkbox = document.getElementById(checkboxId);
  const buttons = document.querySelectorAll(`.toggle-btn[data-type="${type}"]`);
  const allSelected = Array.from(buttons).every(b => b.classList.contains('selected'));
  const noneSelected = Array.from(buttons).every(b => !b.classList.contains('selected'));
  checkbox.checked = allSelected;
  checkbox.indeterminate = !allSelected && !noneSelected;
}

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('selected');
    updateSelectAll(btn.dataset.type);
    updatePlayButton();
  });
});

document.getElementById('select-all-multiply').addEventListener('change', function () {
  document.querySelectorAll('.toggle-btn[data-type="multiply"]').forEach(btn => {
    btn.classList.toggle('selected', this.checked);
  });
  updatePlayButton();
});

document.getElementById('select-all-divide').addEventListener('change', function () {
  document.querySelectorAll('.toggle-btn[data-type="divide"]').forEach(btn => {
    btn.classList.toggle('selected', this.checked);
  });
  updatePlayButton();
});

// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===== GAME STATE =====
let questions = [];
let currentQ = 0;
let scoreCorrect = 0;
let scoreTotal = 0;
let answeredCurrent = false;

// ===== QUESTION GENERATION =====
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateQuestions() {
  const count = parseInt(document.getElementById('question-count').value) || 10;

  const multiplyValues = Array.from(
    document.querySelectorAll('.toggle-btn[data-type="multiply"].selected')
  ).map(b => parseInt(b.dataset.value));

  const divideValues = Array.from(
    document.querySelectorAll('.toggle-btn[data-type="divide"].selected')
  ).map(b => parseInt(b.dataset.value));

  const pool = [];

  multiplyValues.forEach(table => {
    for (let i = 1; i <= 10; i++) {
      pool.push({ type: 'multiply', a: table, b: i, answer: table * i });
    }
  });

  divideValues.forEach(table => {
    for (let i = 2; i <= 10; i++) {
      pool.push({ type: 'divide', a: table * i, b: table, answer: i });
    }
  });

  return shuffle(pool).slice(0, count);
}

function getQuestionText(q) {
  return q.type === 'multiply' ? `${q.a} × ${q.b} = ?` : `${q.a} ÷ ${q.b} = ?`;
}

function getWrongAnswers(correct, count) {
  const wrongs = new Set();
  let attempts = 0;
  while (wrongs.size < count && attempts < 100) {
    attempts++;
    const delta = Math.floor(Math.random() * 10) + 1;
    const candidate = correct + (Math.random() < 0.5 ? delta : -delta);
    if (candidate !== correct && candidate > 0) {
      wrongs.add(candidate);
    }
  }
  return Array.from(wrongs);
}

// ===== ON-SCREEN KEYBOARD =====
// The current string value being typed via the on-screen keyboard.
let oskValue = '';
// Callback invoked when the user presses OK/Enter on the keyboard.
let oskSubmitFn = null;

/** Reflects oskValue in the fill-input display element. */
function oskUpdateDisplay() {
  const display = document.getElementById('fill-input');
  // Use DOM APIs instead of innerHTML to manage the placeholder safely.
  let placeholder = display.querySelector('.fill-input-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('span');
    placeholder.className = 'fill-input-placeholder';
    placeholder.textContent = '?';
  }

  if (oskValue === '') {
    // Show only the placeholder when there is no value.
    display.textContent = '';
    display.appendChild(placeholder);
  } else {
    // Show the typed value as plain text.
    display.textContent = oskValue;
  }
}

/** Shows the on-screen keyboard and resets the typed value. */
function oskShow() {
  oskValue = '';
  oskUpdateDisplay();
  document.getElementById('fill-input').classList.add('active');
  document.getElementById('on-screen-keyboard').classList.remove('hidden');
  // Push the game content up so it isn't obscured by the fixed keyboard.
  document.getElementById('screen-game').classList.add('osk-open');
}

/** Hides the on-screen keyboard and clears the active state. */
function oskHide() {
  document.getElementById('on-screen-keyboard').classList.add('hidden');
  document.getElementById('screen-game').classList.remove('osk-open');
  document.getElementById('fill-input').classList.remove('active');
  oskSubmitFn = null;
}

// Handle clicks/taps on the on-screen keyboard buttons.
document.getElementById('on-screen-keyboard').addEventListener('click', e => {
  const keyEl = e.target.closest('[data-key]');
  if (!keyEl) return;
  const k = keyEl.dataset.key;

  if (k === 'clear') {
    // Clear: remove all typed characters.
    oskValue = '';
  } else if (k === 'backspace') {
    // Backspace: remove the last character.
    oskValue = oskValue.slice(0, -1);
  } else if (k === 'ok') {
    // OK/Enter: submit the current value via the registered callback.
    if (oskSubmitFn) oskSubmitFn();
    return;
  } else {
    // Digit key: append digit (max 4 digits to cover answers up to 9999).
    if (oskValue.length < 4) oskValue += k;
  }

  oskUpdateDisplay();
});

// Also handle physical keyboard input while the OSK is visible (desktop / accessibility).
document.addEventListener('keydown', e => {
  const osk = document.getElementById('on-screen-keyboard');
  if (osk.classList.contains('hidden')) return;

  if (e.key.length === 1 && e.key >= '0' && e.key <= '9') {
    if (oskValue.length < 4) oskValue += e.key;
    oskUpdateDisplay();
    e.preventDefault();
  } else if (e.key === 'Backspace') {
    oskValue = oskValue.slice(0, -1);
    oskUpdateDisplay();
    e.preventDefault();
  } else if (e.key === 'Delete') {
    oskValue = '';
    oskUpdateDisplay();
    e.preventDefault();
  } else if (e.key === 'Enter') {
    if (oskSubmitFn) oskSubmitFn();
    e.preventDefault();
  }
});

// ===== GAME PLAY =====
function startGame() {
  questions = generateQuestions();
  currentQ = 0;
  scoreCorrect = 0;
  scoreTotal = 0;
  showScreen('screen-game');
  showQuestion();
}

function showQuestion() {
  answeredCurrent = false;
  const q = questions[currentQ];
  const useMultipleChoice = Math.random() < 0.5;

  document.getElementById('question-label').textContent =
    `Vraag ${currentQ + 1} van ${questions.length}`;
  document.getElementById('score-correct').textContent = scoreCorrect;
  document.getElementById('score-total').textContent = scoreTotal;
  document.getElementById('question-text').textContent = getQuestionText(q);

  const feedback = document.getElementById('feedback');
  feedback.className = 'feedback hidden';

  if (useMultipleChoice) {
    showMultipleChoice(q);
  } else {
    showFillIn(q);
  }
}

function showMultipleChoice(q) {
  document.getElementById('mc-area').classList.remove('hidden');
  document.getElementById('fill-area').classList.add('hidden');
  // Make sure the on-screen keyboard is hidden for multiple-choice questions.
  oskHide();

  const options = shuffle([q.answer, ...getWrongAnswers(q.answer, 3)]);

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`mc-btn-${i}`);
    btn.textContent = options[i];
    btn.disabled = false;
    btn.className = 'mc-btn';
    btn.onclick = () => handleMCAnswer(options[i], q.answer);
  }
}

function showFillIn(q) {
  document.getElementById('mc-area').classList.add('hidden');
  document.getElementById('fill-area').classList.remove('hidden');

  // Reset on-screen keyboard and show it; the fill-submit button is not needed
  // because the keyboard's own OK key handles submission.
  oskShow();

  const submitAnswer = () => {
    const val = parseInt(oskValue, 10);
    if (!isNaN(val)) handleFillAnswer(val, q.answer);
  };

  // Store the submit callback so the OSK OK key can trigger it.
  oskSubmitFn = submitAnswer;
}

function handleMCAnswer(selected, correct) {
  if (answeredCurrent) return;
  answeredCurrent = true;
  scoreTotal++;
  if (selected === correct) scoreCorrect++;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`mc-btn-${i}`);
    btn.disabled = true;
    const val = parseInt(btn.textContent);
    if (val === correct) btn.classList.add('correct');
    else if (val === selected) btn.classList.add('wrong');
  }

  showFeedback(selected === correct, correct);
}

function handleFillAnswer(selected, correct) {
  if (answeredCurrent) return;
  answeredCurrent = true;
  scoreTotal++;
  if (selected === correct) scoreCorrect++;

  // Hide the on-screen keyboard now that the answer is submitted.
  oskHide();

  showFeedback(selected === correct, correct);
}

function showFeedback(isCorrect, correct) {
  document.getElementById('score-correct').textContent = scoreCorrect;
  document.getElementById('score-total').textContent = scoreTotal;

  const feedback = document.getElementById('feedback');
  const icon = document.getElementById('feedback-icon');
  const text = document.getElementById('feedback-text');

  feedback.className = `feedback ${isCorrect ? 'correct-fb' : 'wrong-fb'}`;

  if (isCorrect) {
    icon.textContent = '🏀';
    text.textContent = 'Goed gedaan!';
    showSwoosh('🏀');
  } else {
    icon.textContent = '😅';
    text.textContent = `Het antwoord is ${correct}`;
  }

  setTimeout(() => {
    currentQ++;
    if (currentQ >= questions.length) {
      showEndScreen();
    } else if (isCorrect && scoreCorrect % 5 === 0) {
      showMiniGame();
    } else {
      showQuestion();
    }
  }, 1500);
}

function showSwoosh(emoji) {
  const swoosh = document.createElement('div');
  swoosh.className = 'swoosh-overlay';
  swoosh.textContent = emoji;
  document.body.appendChild(swoosh);
  setTimeout(() => swoosh.remove(), 700);
}

// ===== MINI-GAME =====
let miniGameTaps = 0;
let miniGameInterval = null;

function showMiniGame() {
  showScreen('screen-minigame');
  miniGameTaps = 0;

  const countEl = document.getElementById('minigame-count');
  const timerEl = document.getElementById('minigame-timer');
  const ball = document.getElementById('minigame-ball');
  const result = document.getElementById('minigame-result');
  const subtitle = document.getElementById('minigame-subtitle');

  countEl.textContent = '0';
  timerEl.textContent = '5';
  ball.disabled = false;
  result.classList.add('hidden');
  subtitle.textContent = `${scoreCorrect} goed! Tik zo snel mogelijk op de bal!`;

  ball.onclick = () => {
    if (ball.disabled) return;
    miniGameTaps++;
    countEl.textContent = miniGameTaps;
    ball.classList.remove('tap-anim');
    void ball.offsetWidth; // force reflow to restart animation
    ball.classList.add('tap-anim');
  };

  let timeLeft = 5;
  miniGameInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(miniGameInterval);
      miniGameInterval = null;
      endMiniGame();
    }
  }, 1000);
}

function endMiniGame() {
  const ball = document.getElementById('minigame-ball');
  const result = document.getElementById('minigame-result');
  const resultText = document.getElementById('minigame-result-text');

  ball.disabled = true;
  ball.onclick = null;

  let message;
  if (miniGameTaps === 0) {
    message = 'Niet getikt! Probeer het de volgende keer! 😅';
  } else if (miniGameTaps < 5) {
    message = `${miniGameTaps} tikken! Goed geprobeerd! 👍`;
  } else if (miniGameTaps < 10) {
    message = `${miniGameTaps} tikken! Lekker bezig! 🏀`;
  } else if (miniGameTaps < 15) {
    message = `${miniGameTaps} tikken! Wauw, supersnel! ⚡`;
  } else {
    message = `${miniGameTaps} tikken! Ongelofelijk! 🌟`;
  }

  resultText.textContent = message;
  result.classList.remove('hidden');

  setTimeout(() => {
    showScreen('screen-game');
    showQuestion();
  }, 2500);
}

function showEndScreen() {
  showScreen('screen-end');

  const pct = Math.round((scoreCorrect / questions.length) * 100);
  document.getElementById('end-score').textContent =
    `${scoreCorrect} / ${questions.length} (${pct}%)`;

  let title, message;
  if (pct === 100) {
    title = 'Perfect! 🌟';
    message = 'Wow, alles goed! Je bent een echte kampioen!';
  } else if (pct >= 80) {
    title = 'Super gedaan! 🏆';
    message = 'Geweldig! Je bent er bijna. Blijf oefenen!';
  } else if (pct >= 60) {
    title = 'Goed bezig! 👍';
    message = 'Je bent goed op weg. Nog even oefenen!';
  } else {
    title = 'Blijf oefenen! 💪';
    message = 'Elke keer beter! Probeer het nog eens.';
  }

  document.getElementById('end-title').textContent = title;
  document.getElementById('end-message').textContent = message;
}

// ===== PLAY BUTTON =====
btnPlay.addEventListener('click', startGame);

// ===== END SCREEN BUTTONS =====
document.getElementById('btn-replay-same').addEventListener('click', startGame);
document.getElementById('btn-replay-new').addEventListener('click', () => showScreen('screen-welcome'));