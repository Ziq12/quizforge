# QuizForge 🚀

## Setup & Run Instructions

### Project Structure
quizforge/

├── server.js

├── index.html

├── script.js

├── package.json

└── database.json

### Steps

1. Create folder with above structure

2. Install dependencies
   cd quizforge
   npm install

3. Start server
   npm start
   or with auto-reload:
   npm run dev   (requires: npm install -g nodemon)

4. Open browser → http://localhost:3000

## Feature Summary

• Quiz Library — paste JSON to upload quizzes, click any to start

• Exam UI — step-by-step with progress bar, prev/next navigation, answer selection

• Auto-Grading — score calculated server-side, wrong question IDs saved

• History Dashboard — all past attempts with score color coding
  🟢 ≥80% | 🟡 ≥50% | 🔴 <50%

• Review Mode — click any attempt to see exactly which questions you missed with correct answers

• Export — downloads database_backup.json via the Backup button

• Import — smart merge (no duplicate IDs) when restoring a backup file

## Json Format
```
{
  "topic": "Your Topic Here",
  "questions": [
    {
      "id": 1,
      "question": "Your first question goes here?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "answer": "A"
    },
    {
      "id": 2,
      "question": "Your second question goes here?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "answer": "B"
    },
    {
      "id": 3,
      "question": "Your third question goes here?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "answer": "C"
    }
  ]
}
```
