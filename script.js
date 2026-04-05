// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  currentQuiz: null,
  currentQuestionIndex: 0,
  answers: {},
  quizzes: [],
  attempts: []
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

function showSection(sectionId) {
  ['section-home', 'section-exam', 'section-result', 'section-review'].forEach(hide);
  show(sectionId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : '✗'}</span> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function scoreColor(score) {
  if (score >= 80) return 'score-high';
  if (score >= 50) return 'score-mid';
  return 'score-low';
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Load Home ────────────────────────────────────────────────────────────────
async function loadHome() {
  showSection('section-home');
  try {
    const [quizzes, attempts] = await Promise.all([
      api('GET', '/api/quizzes'),
      api('GET', '/api/attempts')
    ]);
    state.quizzes = quizzes;
    state.attempts = attempts;
    renderQuizList();
    renderHistory();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function renderQuizList() {
  const el = $('quiz-list');
  if (!state.quizzes.length) {
    el.innerHTML = `<p class="empty-state">No quizzes yet. Paste a JSON schema below to create one.</p>`;
    return;
  }
  el.innerHTML = state.quizzes.map(q => `
    <div class="quiz-card" onclick="startQuiz('${q.id}')">
      <div class="quiz-card-inner">
        <div class="quiz-topic">${q.topic}</div>
        <div class="quiz-meta">${q.questionCount} questions · ${formatDate(q.createdAt)}</div>
      </div>
      <button class="btn-start">Start →</button>
    </div>
  `).join('');
}

function renderHistory() {
  const el = $('history-list');
  if (!state.attempts.length) {
    el.innerHTML = `<p class="empty-state">No attempts yet. Take a quiz to see your history here.</p>`;
    return;
  }
  el.innerHTML = state.attempts.map(a => `
    <div class="attempt-card" onclick="reviewAttempt('${a.id}')">
      <div class="attempt-info">
        <div class="attempt-topic">${a.quizTopic}</div>
        <div class="attempt-date">${formatDate(a.date)}</div>
        <div class="attempt-wrong">${a.wrongIds.length} wrong · ${a.total - a.wrongIds.length} correct</div>
      </div>
      <div class="attempt-score ${scoreColor(a.score)}">${a.score}%</div>
    </div>
  `).join('');
}

// ─── Create Quiz ──────────────────────────────────────────────────────────────
async function createQuiz() {
  const raw = $('quiz-json').value.trim();
  if (!raw) return toast('Please paste a quiz JSON.', 'error');
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return toast('Invalid JSON format.', 'error'); }

  if (!parsed.topic || !Array.isArray(parsed.questions)) {
    return toast('JSON must have "topic" and "questions" array.', 'error');
  }

  try {
    const result = await api('POST', '/api/quizzes', parsed);
    toast(`Quiz "${result.topic}" created with ${result.questionCount} questions!`);
    $('quiz-json').value = '';
    await loadHome();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── Exam ─────────────────────────────────────────────────────────────────────
async function startQuiz(id) {
  try {
    const quiz = await api('GET', `/api/quizzes/${id}`);
    state.currentQuiz = quiz;
    state.currentQuestionIndex = 0;
    state.answers = {};
    showSection('section-exam');
    renderQuestion();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function renderQuestion() {
  const quiz = state.currentQuiz;
  const idx = state.currentQuestionIndex;
  const q = quiz.questions[idx];
  const total = quiz.questions.length;

  $('exam-topic').textContent = quiz.topic;
  $('question-counter').textContent = `Question ${idx + 1} of ${total}`;
  $('progress-bar').style.width = `${((idx + 1) / total) * 100}%`;
  $('question-text').textContent = q.question;

  const optionsEl = $('options-container');
  optionsEl.innerHTML = Object.entries(q.options).map(([key, val]) => `
    <button class="option-btn ${state.answers[q.id] === key ? 'selected' : ''}"
            onclick="selectAnswer(${q.id}, '${key}', this)">
      <span class="option-key">${key}</span>
      <span class="option-val">${val}</span>
    </button>
  `).join('');

  const prevBtn = $('btn-prev');
  const nextBtn = $('btn-next');
  const submitBtn = $('btn-submit');

  prevBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
  if (idx === total - 1) {
    hide('btn-next'); show('btn-submit');
  } else {
    show('btn-next'); hide('btn-submit');
  }
}

function selectAnswer(questionId, key, btn) {
  state.answers[questionId] = key;
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function nextQuestion() {
  const q = state.currentQuiz.questions[state.currentQuestionIndex];
  if (!state.answers[q.id]) return toast('Please select an answer.', 'error');
  state.currentQuestionIndex++;
  renderQuestion();
}

function prevQuestion() {
  if (state.currentQuestionIndex > 0) {
    state.currentQuestionIndex--;
    renderQuestion();
  }
}

async function submitQuiz() {
  const q = state.currentQuiz.questions[state.currentQuestionIndex];
  if (!state.answers[q.id]) return toast('Please select an answer.', 'error');

  const unanswered = state.currentQuiz.questions.filter(q => !state.answers[q.id]);
  if (unanswered.length > 0) {
    return toast(`${unanswered.length} question(s) unanswered.`, 'error');
  }

  try {
    const result = await api('POST', `/api/quizzes/${state.currentQuiz.id}/submit`, {
      answers: state.answers
    });
    renderResult(result);
    showSection('section-result');
    await loadHome();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── Result ───────────────────────────────────────────────────────────────────
function renderResult(result) {
  $('result-topic').textContent = result.quizTopic;
  $('result-score').textContent = `${result.score}%`;
  $('result-score').className = `result-score-num ${scoreColor(result.score)}`;
  $('result-correct').textContent = `${result.correct} / ${result.total} correct`;

  const detailsEl = $('result-details');
  detailsEl.innerHTML = result.details.map((d, i) => `
    <div class="detail-item ${d.isCorrect ? 'correct' : 'wrong'}">
      <div class="detail-header">
        <span class="detail-num">Q${i + 1}</span>
        <span class="detail-badge">${d.isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
      </div>
      <div class="detail-question">${d.question}</div>
      ${!d.isCorrect ? `
        <div class="detail-answers">
          <div class="your-answer">Your answer: <strong>${d.userAnswer || 'Not answered'}</strong> — ${d.options[d.userAnswer] || '—'}</div>
          <div class="correct-answer">Correct: <strong>${d.correctAnswer}</strong> — ${d.options[d.correctAnswer]}</div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// ─── Review ───────────────────────────────────────────────────────────────────
async function reviewAttempt(id) {
  try {
    const data = await api('GET', `/api/attempts/${id}`);
    const el = $('review-content');
    $('review-title').textContent = `Review: ${data.quizTopic}`;
    $('review-meta').textContent = `${formatDate(data.date)} · Score: ${data.score}% · ${data.wrongIds.length} wrong`;

    if (!data.wrongQuestions.length) {
      el.innerHTML = `<p class="empty-state" style="color:var(--green)">🎉 Perfect score! No wrong answers.</p>`;
    } else {
      el.innerHTML = data.wrongQuestions.map((q, i) => `
        <div class="detail-item wrong">
          <div class="detail-header">
            <span class="detail-num">Q${q.id}</span>
            <span class="detail-badge">✗ Missed</span>
          </div>
          <div class="detail-question">${q.question}</div>
          <div class="detail-answers">
            <div class="correct-answer">Correct: <strong>${q.answer}</strong> — ${q.options[q.answer]}</div>
          </div>
        </div>
      `).join('');
    }
    showSection('section-review');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── Export / Import ──────────────────────────────────────────────────────────
function exportDB() {
  window.location.href = '/api/export';
  toast('Downloading database backup...');
}

function triggerImport() {
  $('import-file').click();
}

async function importDB(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const result = await api('POST', '/api/import', data);
    toast(`Restored! ${result.quizzes} quizzes, ${result.attempts} attempts.`);
    await loadHome();
  } catch (e) {
    toast('Failed to import: ' + e.message, 'error');
  }
  input.value = '';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadHome);
