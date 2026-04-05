const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Initialize DB if not exists
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { quizzes: [], attempts: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// GET all quizzes (metadata only)
app.get('/api/quizzes', (req, res) => {
  const db = readDB();
  const meta = db.quizzes.map(q => ({
    id: q.id,
    topic: q.topic,
    questionCount: q.questions.length,
    createdAt: q.createdAt
  }));
  res.json(meta);
});

// POST upload a new quiz
app.post('/api/quizzes', (req, res) => {
  const { topic, questions } = req.body;
  if (!topic || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Invalid quiz schema.' });
  }
  const db = readDB();
  const quiz = {
    id: Date.now().toString(),
    topic,
    questions,
    createdAt: new Date().toISOString()
  };
  db.quizzes.push(quiz);
  writeDB(db);
  res.json({ id: quiz.id, topic: quiz.topic, questionCount: questions.length });
});

// GET a quiz by ID (for exam)
app.get('/api/quizzes/:id', (req, res) => {
  const db = readDB();
  const quiz = db.quizzes.find(q => q.id === req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
  // Return without answers
  const safe = {
    id: quiz.id,
    topic: quiz.topic,
    questions: quiz.questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options
    }))
  };
  res.json(safe);
});

// POST submit answers for grading
app.post('/api/quizzes/:id/submit', (req, res) => {
  const db = readDB();
  const quiz = db.quizzes.find(q => q.id === req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

  const { answers } = req.body; // { questionId: selectedOption }
  let correct = 0;
  const wrongIds = [];
  const details = [];

  quiz.questions.forEach(q => {
    const userAnswer = answers[q.id] || null;
    const isCorrect = userAnswer === q.answer;
    if (isCorrect) correct++;
    else wrongIds.push(q.id);
    details.push({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.answer,
      userAnswer,
      isCorrect
    });
  });

  const total = quiz.questions.length;
  const score = Math.round((correct / total) * 100);

  const attempt = {
    id: Date.now().toString(),
    quizId: quiz.id,
    quizTopic: quiz.topic,
    score,
    correct,
    total,
    wrongIds,
    date: new Date().toISOString()
  };

  db.attempts.push(attempt);
  writeDB(db);

  res.json({ ...attempt, details });
});

// GET all attempts
app.get('/api/attempts', (req, res) => {
  const db = readDB();
  res.json(db.attempts.reverse());
});

// GET attempt details with wrong question details
app.get('/api/attempts/:id', (req, res) => {
  const db = readDB();
  const attempt = db.attempts.find(a => a.id === req.params.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

  const quiz = db.quizzes.find(q => q.id === attempt.quizId);
  let wrongQuestions = [];
  if (quiz) {
    wrongQuestions = quiz.questions
      .filter(q => attempt.wrongIds.includes(q.id))
      .map(q => ({ ...q }));
  }

  res.json({ ...attempt, wrongQuestions });
});

// GET export database
app.get('/api/export', (req, res) => {
  initDB();
  res.download(DB_PATH, 'database_backup.json');
});

// POST import/restore database
app.post('/api/import', (req, res) => {
  const imported = req.body;
  if (!imported.quizzes || !imported.attempts) {
    return res.status(400).json({ error: 'Invalid database format.' });
  }

  const current = readDB();
  // Merge: avoid duplicates by ID
  const existingQuizIds = new Set(current.quizzes.map(q => q.id));
  const existingAttemptIds = new Set(current.attempts.map(a => a.id));

  imported.quizzes.forEach(q => {
    if (!existingQuizIds.has(q.id)) current.quizzes.push(q);
  });
  imported.attempts.forEach(a => {
    if (!existingAttemptIds.has(a.id)) current.attempts.push(a);
  });

  writeDB(current);
  res.json({ message: 'Database restored successfully.', quizzes: current.quizzes.length, attempts: current.attempts.length });
});

app.listen(PORT, () => {
  console.log(`✅ Quiz App running at http://localhost:${PORT}`);
  initDB();
});
