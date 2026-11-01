const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { z } = require('zod');

const { generateCaseFromGemini } = require('./services/generateCase');
const { computeScore, buildScoreBreakdown, DIFFICULTY_CONFIG } = require('./services/scoring');
const { generateCaseSchema, accuseSchema } = require('./validators/schemas');
const { saveCase, getCase } = require('./store/caseStore');

dotenv.config();

const app = express();
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed for this origin'));
      }
    },
    credentials: true,
  }),
);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '1mb' }));

const caseGenerationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many case generation requests. Please try again shortly.' },
});

const hintLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many hint requests. Please slow down.' },
});

function serializeCase(caseDoc) {
  return {
    id: caseDoc.publicId,
    title: caseDoc.title,
    story: caseDoc.story,
    difficulty: caseDoc.difficulty,
    premise: caseDoc.premise,
    status: caseDoc.status,
    suspects: caseDoc.suspects.map((suspect) => ({
      id: suspect.id,
      name: suspect.name,
      description: suspect.description,
      alibi: suspect.alibi,
    })),
    clues: caseDoc.clues.map((clue) => ({
      id: clue.id,
      title: clue.title,
      type: clue.type,
      summary: clue.summary,
      discovered: caseDoc.discoveredClueIds.includes(clue.id),
      content: caseDoc.discoveredClueIds.includes(clue.id) ? clue.content : null,
    })),
    progress: {
      discoveredClueIds: [...caseDoc.discoveredClueIds],
      cluesDiscovered: caseDoc.discoveredClueIds.length,
      hintsUsed: caseDoc.hintsUsed,
      hintsRemaining: Math.max(0, (caseDoc.hints || []).length - caseDoc.hintsUsed),
      scoreSoFar: computeScore({
        isCorrect: false,
        discoveredClueCount: caseDoc.discoveredClueIds.length,
        hintsUsed: caseDoc.hintsUsed,
        difficulty: caseDoc.difficulty,
      }),
    },
    hintsRemaining: Math.max(0, (caseDoc.hints || []).length - caseDoc.hintsUsed),
    createdAt: caseDoc.createdAt,
  };
}

function serializeResult(caseDoc) {
  return {
    caseId: caseDoc.publicId,
    status: caseDoc.status,
    correct: caseDoc.result.correct,
    score: caseDoc.result.score,
    scoreBreakdown: caseDoc.result.scoreBreakdown,
    culprit: caseDoc.result.culprit,
    explanation: caseDoc.result.explanation,
    supportingClueIds: caseDoc.result.supportingClueIds,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'AI Mystery Room API is running.' });
});

app.post('/api/cases/generate', caseGenerationLimiter, async (req, res) => {
  try {
    const parsed = generateCaseSchema.parse(req.body || {});
    const generated = await generateCaseFromGemini(parsed);
    await saveCase(generated);
    res.status(201).json({
      case: serializeCase(generated),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Invalid input' });
    }

    console.error('Error creating case:', error);
    return res.status(502).json({ code: 'AI_GENERATION_FAILED', message: 'Could not generate a valid mystery case.' });
  }
});

app.get('/api/cases/:id', async (req, res) => {
  const caseDoc = await getCase(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
  }

  return res.json({ case: serializeCase(caseDoc) });
});

app.post('/api/cases/:id/clues/:clueId/discover', async (req, res) => {
  const caseDoc = await getCase(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
  }

  if (caseDoc.status === 'completed') {
    return res.status(409).json({ code: 'CASE_ALREADY_COMPLETED', message: 'This case has already been completed.' });
  }

  const clue = caseDoc.clues.find((item) => item.id === req.params.clueId);
  if (!clue) {
    return res.status(404).json({ code: 'CLUE_NOT_FOUND', message: 'Clue not found.' });
  }

  if (!caseDoc.discoveredClueIds.includes(clue.id)) {
    caseDoc.discoveredClueIds.push(clue.id);
    caseDoc.updatedAt = new Date().toISOString();
    await saveCase(caseDoc);
  }

  return res.json({
    clue: {
      id: clue.id,
      title: clue.title,
      type: clue.type,
      content: caseDoc.discoveredClueIds.includes(clue.id) ? clue.content : null,
      discovered: true,
    },
    progress: {
      discoveredClueIds: [...caseDoc.discoveredClueIds],
      cluesDiscovered: caseDoc.discoveredClueIds.length,
      scoreSoFar: computeScore({
        isCorrect: false,
        discoveredClueCount: caseDoc.discoveredClueIds.length,
        hintsUsed: caseDoc.hintsUsed,
        difficulty: caseDoc.difficulty,
      }),
    },
  });
});

app.post('/api/cases/:id/hints', hintLimiter, async (req, res) => {
  const caseDoc = await getCase(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
  }

  if (caseDoc.status === 'completed') {
    return res.status(409).json({ code: 'CASE_ALREADY_COMPLETED', message: 'This case has already been completed.' });
  }

  const totalHints = caseDoc.hints.length;
  const idempotencyKey = req.headers['x-idempotency-key'];
  if (idempotencyKey && caseDoc.hintRequests[idempotencyKey] !== undefined) {
    const existingHintIndex = caseDoc.hintRequests[idempotencyKey];
    const hintText = caseDoc.hints[existingHintIndex];
    return res.json({
      hint: { index: existingHintIndex + 1, text: hintText },
      progress: {
        hintsUsed: caseDoc.hintsUsed,
        hintsRemaining: Math.max(0, totalHints - caseDoc.hintsUsed),
        scoreSoFar: computeScore({
          isCorrect: false,
          discoveredClueCount: caseDoc.discoveredClueIds.length,
          hintsUsed: caseDoc.hintsUsed,
          difficulty: caseDoc.difficulty,
        }),
      },
    });
  }

  if (caseDoc.hintsUsed >= totalHints) {
    return res.status(409).json({ code: 'NO_HINTS_REMAINING', message: 'No hints remaining for this case.' });
  }

  const hintIndex = caseDoc.hintsUsed;
  const hintText = caseDoc.hints[hintIndex];
  caseDoc.hintsUsed += 1;
  if (idempotencyKey) {
    caseDoc.hintRequests[idempotencyKey] = hintIndex;
  }
  caseDoc.updatedAt = new Date().toISOString();
  await saveCase(caseDoc);

  return res.json({
    hint: { index: hintIndex + 1, text: hintText },
    progress: {
      hintsUsed: caseDoc.hintsUsed,
      hintsRemaining: Math.max(0, totalHints - caseDoc.hintsUsed),
      scoreSoFar: computeScore({
        isCorrect: false,
        discoveredClueCount: caseDoc.discoveredClueIds.length,
        hintsUsed: caseDoc.hintsUsed,
        difficulty: caseDoc.difficulty,
      }),
    },
  });
});

app.post('/api/cases/:id/accuse', async (req, res) => {
  const caseDoc = await getCase(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
  }

  if (caseDoc.status === 'completed') {
    return res.status(409).json({ code: 'CASE_ALREADY_COMPLETED', message: 'This case has already been completed.' });
  }

  try {
    const parsed = accuseSchema.parse(req.body || {});
    const suspect = caseDoc.suspects.find((item) => item.id === parsed.suspectId);
    if (!suspect) {
      return res.status(404).json({ code: 'SUSPECT_NOT_FOUND', message: 'Suspect not found.' });
    }

    const correct = parsed.suspectId === caseDoc.solution.culpritSuspectId;
    const discoveredClueCount = caseDoc.discoveredClueIds.length;
    const hintPenalty = caseDoc.hintsUsed * 10;
    const scoreBreakdown = buildScoreBreakdown({
      isCorrect: correct,
      discoveredClueCount,
      hintsUsed: caseDoc.hintsUsed,
      difficulty: caseDoc.difficulty,
    });
    const score = computeScore({
      isCorrect: correct,
      discoveredClueCount,
      hintsUsed: caseDoc.hintsUsed,
      difficulty: caseDoc.difficulty,
    });

    caseDoc.accusation = {
      suspectId: parsed.suspectId,
      submittedAt: new Date().toISOString(),
    };

    caseDoc.result = {
      correct,
      score,
      scoreBreakdown,
      completedAt: new Date().toISOString(),
      explanation: caseDoc.solution.explanation,
      supportingClueIds: caseDoc.solution.supportingClueIds,
      culprit: {
        id: caseDoc.solution.culpritSuspectId,
        name: caseDoc.suspects.find((item) => item.id === caseDoc.solution.culpritSuspectId)?.name || 'Unknown',
      },
    };
    caseDoc.status = 'completed';
    caseDoc.updatedAt = new Date().toISOString();
    await saveCase(caseDoc);

    return res.json({
      result: serializeResult(caseDoc),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'suspectId is required.' });
    }

    console.error('Error submitting accusation:', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Could not resolve the accusation.' });
  }
});

app.get('/api/cases/:id/result', async (req, res) => {
  const caseDoc = await getCase(req.params.id);
  if (!caseDoc) {
    return res.status(404).json({ code: 'CASE_NOT_FOUND', message: 'Case not found.' });
  }

  if (caseDoc.status !== 'completed' || !caseDoc.result) {
    return res.status(409).json({ code: 'CASE_NOT_COMPLETED', message: 'The result is not available yet.' });
  }

  return res.json({ result: serializeResult(caseDoc) });
});

app.use((req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Resource not found.' });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled app error:', error);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
});

module.exports = app;
