// ===== FULLSCREEN BUTTON =====
const btnFullscreen = document.getElementById('btn-fullscreen');

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
    btnFullscreen.textContent = '✕ Verlaat scherm';
    btnFullscreen.title = 'Verlaat volledig scherm';
  } else {
    btnFullscreen.textContent = '⛶ Volledig scherm';
    btnFullscreen.title = 'Volledig scherm';
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

  const input = document.getElementById('fill-input');
  const submitBtn = document.getElementById('fill-submit');
  input.value = '';
  input.disabled = false;
  submitBtn.disabled = false;
  input.focus();

  const submitAnswer = () => {
    const val = parseInt(input.value);
    if (!isNaN(val)) handleFillAnswer(val, q.answer);
  };

  submitBtn.onclick = submitAnswer;
  input.onkeydown = e => { if (e.key === 'Enter') submitAnswer(); };
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

  document.getElementById('fill-input').disabled = true;
  document.getElementById('fill-submit').disabled = true;

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