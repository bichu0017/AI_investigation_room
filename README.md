# AI Mystery Room

A full-stack mystery game built from the project specification in `SPEC.md`.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Database: MongoDB via Mongoose with in-memory fallback for local development
- AI: Gemini via `@google/genai`
- Validation: Zod

## Local setup

### 1. Frontend

```bash
cd client
npm install
npm run dev
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

The service runs at `http://localhost:5000` and the frontend typically runs at `http://localhost:5173`.

## Features

- Create a custom mystery from a premise and difficulty
- Investigate suspects and clues
- Request a limited number of hints
- Make a final accusation
- See score and verdict only after completion
- Server-side logic keeps solution data hidden until accusation

## Notes

- The project includes an in-memory fallback for local demos when MongoDB is not running.
- If a Gemini API key is not configured, the app generates a deterministic local case so the app remains testable offline.
