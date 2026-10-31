process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');

async function createCase(difficulty = 'easy', premise = 'A locked cabinet and a hidden note point to a quiet betrayal inside the estate.') {
  const response = await request(app)
    .post('/api/cases/generate')
    .send({ premise, difficulty });

  assert.equal(response.status, 201);
  return response.body.case;
}

test('GET /api/health returns ok status', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test('generate case: easy difficulty creates expected counts and structure', async () => {
  const caseData = await createCase('easy');
  assert.ok(caseData.id);
  assert.equal(caseData.difficulty, 'easy');
  assert.equal(caseData.status, 'active');
  assert.equal(caseData.suspects.length, 3);
  assert.equal(caseData.clues.length, 5);
  assert.equal(caseData.hintsRemaining, 2);
  assert.equal(caseData.progress.cluesDiscovered, 0);
  assert.equal(caseData.progress.hintsUsed, 0);
  assert.equal(caseData.progress.scoreSoFar, 0);
});

test('generate case: medium difficulty creates expected counts', async () => {
  const caseData = await createCase('medium', 'A rare gem was replaced with glass during the museum gala.');
  assert.equal(caseData.difficulty, 'medium');
  assert.equal(caseData.suspects.length, 4);
  assert.equal(caseData.clues.length, 7);
  assert.equal(caseData.hintsRemaining, 3);
});

test('generate case: hard difficulty creates expected counts', async () => {
  const caseData = await createCase('hard', 'A high-stakes cryptographic key was stolen from a secure subterranean laboratory.');
  assert.equal(caseData.difficulty, 'hard');
  assert.equal(caseData.suspects.length, 5);
  assert.equal(caseData.clues.length, 9);
  assert.equal(caseData.hintsRemaining, 3);
});

test('generate case: validation rejects invalid input', async () => {
  // Too short premise (< 20 characters)
  const shortRes = await request(app)
    .post('/api/cases/generate')
    .send({ premise: 'Short note', difficulty: 'easy' });
  assert.equal(shortRes.status, 400);
  assert.equal(shortRes.body.code, 'VALIDATION_ERROR');

  // Invalid difficulty
  const diffRes = await request(app)
    .post('/api/cases/generate')
    .send({ premise: 'A locked cabinet and a hidden note point to a betrayal.', difficulty: 'super-hard' });
  assert.equal(diffRes.status, 400);
  assert.equal(diffRes.body.code, 'VALIDATION_ERROR');

  // Empty payload
  const emptyRes = await request(app).post('/api/cases/generate').send({});
  assert.equal(emptyRes.status, 400);
  assert.equal(emptyRes.body.code, 'VALIDATION_ERROR');
});

test('solution privacy: active case responses never leak hidden solution data', async () => {
  const caseData = await createCase('easy');

  // Verify generated response does not contain solution fields
  assert.equal(caseData.solution, undefined);
  assert.equal(caseData.culpritSuspectId, undefined);
  assert.equal(caseData.culprit, undefined);
  assert.equal(caseData.reasoning, undefined);
  assert.equal(caseData.motive, undefined);

  // Verify all clues have null content before discovery
  for (const clue of caseData.clues) {
    assert.equal(clue.discovered, false);
    assert.equal(clue.content, null);
  }

  // Verify GET /api/cases/:id also hides solution and undiscovered clue content
  const getRes = await request(app).get(`/api/cases/${caseData.id}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.case.solution, undefined);
  assert.equal(getRes.body.case.culpritSuspectId, undefined);
  for (const clue of getRes.body.case.clues) {
    assert.equal(clue.content, null);
  }

  // Verify GET /api/cases/:id/result is forbidden before completion
  const resultRes = await request(app).get(`/api/cases/${caseData.id}/result`);
  assert.equal(resultRes.status, 409);
  assert.equal(resultRes.body.code, 'CASE_NOT_COMPLETED');
});

test('clue discovery: reveals content, updates progress, and is idempotent', async () => {
  const caseData = await createCase('easy');
  const clueId = caseData.clues[0].id;

  // First discovery
  const firstRes = await request(app)
    .post(`/api/cases/${caseData.id}/clues/${clueId}/discover`)
    .send({});
  assert.equal(firstRes.status, 200);
  assert.equal(firstRes.body.clue.discovered, true);
  assert.equal(firstRes.body.progress.cluesDiscovered, 1);
  assert.equal(firstRes.body.progress.scoreSoFar, 5);
  assert.ok(firstRes.body.clue.content.length > 0);

  // GET case now reflects the discovered clue
  const getRes = await request(app).get(`/api/cases/${caseData.id}`);
  const discoveredClue = getRes.body.case.clues.find((c) => c.id === clueId);
  assert.equal(discoveredClue.discovered, true);
  assert.ok(discoveredClue.content.length > 0);

  // Second discovery of the same clue (idempotent)
  const secondRes = await request(app)
    .post(`/api/cases/${caseData.id}/clues/${clueId}/discover`)
    .send({});
  assert.equal(secondRes.status, 200);
  assert.equal(secondRes.body.progress.cluesDiscovered, 1);
  assert.equal(secondRes.body.progress.scoreSoFar, 5); // Score did not double
});

test('clue discovery: returns 404 for unknown clue or case', async () => {
  const caseData = await createCase('easy');

  // Unknown clue ID
  const clueRes = await request(app)
    .post(`/api/cases/${caseData.id}/clues/fake_clue_999/discover`)
    .send({});
  assert.equal(clueRes.status, 404);
  assert.equal(clueRes.body.code, 'CLUE_NOT_FOUND');

  // Unknown case ID
  const caseRes = await request(app)
    .post('/api/cases/non_existent_case_123/clues/clue_1/discover')
    .send({});
  assert.equal(caseRes.status, 404);
  assert.equal(caseRes.body.code, 'CASE_NOT_FOUND');
});

test('hints: are ordered, limited, and support idempotency keys', async () => {
  const caseData = await createCase('easy'); // easy has 2 hints

  // First hint
  const h1 = await request(app).post(`/api/cases/${caseData.id}/hints`).send({});
  assert.equal(h1.status, 200);
  assert.equal(h1.body.hint.index, 1);
  assert.equal(h1.body.progress.hintsUsed, 1);
  assert.equal(h1.body.progress.hintsRemaining, 1);

  // Second hint with idempotency key
  const key = 'idem-hint-test-123';
  const h2 = await request(app)
    .post(`/api/cases/${caseData.id}/hints`)
    .set('x-idempotency-key', key)
    .send({});
  assert.equal(h2.status, 200);
  assert.equal(h2.body.hint.index, 2);
  assert.equal(h2.body.progress.hintsUsed, 2);
  assert.equal(h2.body.progress.hintsRemaining, 0);

  // Repeating hint request with identical idempotency key returns same hint without extra charge
  const h2Retry = await request(app)
    .post(`/api/cases/${caseData.id}/hints`)
    .set('x-idempotency-key', key)
    .send({});
  assert.equal(h2Retry.status, 200);
  assert.equal(h2Retry.body.hint.index, 2);
  assert.equal(h2Retry.body.progress.hintsUsed, 2);

  // Third hint exceeds limit
  const h3 = await request(app).post(`/api/cases/${caseData.id}/hints`).send({});
  assert.equal(h3.status, 409);
  assert.equal(h3.body.code, 'NO_HINTS_REMAINING');
});

test('accusation: correct suspect returns verdict true and correct score breakdown', async () => {
  const caseData = await createCase('easy');
  
  // Discover 2 clues
  await request(app).post(`/api/cases/${caseData.id}/clues/${caseData.clues[0].id}/discover`).send({});
  await request(app).post(`/api/cases/${caseData.id}/clues/${caseData.clues[1].id}/discover`).send({});

  // Use 1 hint
  await request(app).post(`/api/cases/${caseData.id}/hints`).send({});

  // Fallback case culprit is always suspect_1 (suspects[0].id)
  const culpritId = caseData.suspects[0].id;
  const accuseRes = await request(app)
    .post(`/api/cases/${caseData.id}/accuse`)
    .send({ suspectId: culpritId });

  assert.equal(accuseRes.status, 200);
  assert.equal(accuseRes.body.result.correct, true);
  assert.equal(accuseRes.body.result.status, 'completed');
  assert.equal(accuseRes.body.result.scoreBreakdown.basePoints, 100);
  assert.equal(accuseRes.body.result.scoreBreakdown.cluePoints, 10);
  assert.equal(accuseRes.body.result.scoreBreakdown.hintPenalty, 10);
  assert.equal(accuseRes.body.result.score, 100); // 100 + 10 - 10 = 100
  assert.equal(accuseRes.body.result.culprit.id, culpritId);
  assert.ok(accuseRes.body.result.explanation.length > 0);

  // GET /result now succeeds
  const resultRes = await request(app).get(`/api/cases/${caseData.id}/result`);
  assert.equal(resultRes.status, 200);
  assert.equal(resultRes.body.result.correct, true);
  assert.equal(resultRes.body.result.score, 100);
});

test('accusation: incorrect suspect returns verdict false with 0 base points and reveals truth', async () => {
  const caseData = await createCase('medium');
  
  // Discover 1 clue
  await request(app).post(`/api/cases/${caseData.id}/clues/${caseData.clues[0].id}/discover`).send({});

  // Accuse innocent suspect (suspects[1])
  const innocentId = caseData.suspects[1].id;
  const accuseRes = await request(app)
    .post(`/api/cases/${caseData.id}/accuse`)
    .send({ suspectId: innocentId });

  assert.equal(accuseRes.status, 200);
  assert.equal(accuseRes.body.result.correct, false);
  assert.equal(accuseRes.body.result.scoreBreakdown.basePoints, 0);
  assert.equal(accuseRes.body.result.scoreBreakdown.cluePoints, 5);
  assert.equal(accuseRes.body.result.scoreBreakdown.hintPenalty, 0);
  assert.equal(accuseRes.body.result.score, 5); // 0 + 5 - 0 = 5
  assert.equal(accuseRes.body.result.culprit.id, caseData.suspects[0].id);
  assert.ok(accuseRes.body.result.explanation.length > 0);
});

test('accusation: rejects invalid suspect ID and missing payload', async () => {
  const caseData = await createCase('easy');

  // Unknown suspect ID
  const unknownSuspect = await request(app)
    .post(`/api/cases/${caseData.id}/accuse`)
    .send({ suspectId: 'fake_suspect_999' });
  assert.equal(unknownSuspect.status, 404);
  assert.equal(unknownSuspect.body.code, 'SUSPECT_NOT_FOUND');

  // Missing suspectId in body
  const missingSuspect = await request(app)
    .post(`/api/cases/${caseData.id}/accuse`)
    .send({});
  assert.equal(missingSuspect.status, 400);
  assert.equal(missingSuspect.body.code, 'VALIDATION_ERROR');
});

test('completed case immutability: rejects further mutations after completion', async () => {
  const caseData = await createCase('easy');
  const suspectId = caseData.suspects[0].id;
  const clueId = caseData.clues[0].id;

  // Complete case by accusing
  await request(app).post(`/api/cases/${caseData.id}/accuse`).send({ suspectId });

  // 1. Accuse again -> 409
  const secondAccuse = await request(app)
    .post(`/api/cases/${caseData.id}/accuse`)
    .send({ suspectId });
  assert.equal(secondAccuse.status, 409);
  assert.equal(secondAccuse.body.code, 'CASE_ALREADY_COMPLETED');

  // 2. Discover clue on completed case -> 409
  const discoverRes = await request(app)
    .post(`/api/cases/${caseData.id}/clues/${clueId}/discover`)
    .send({});
  assert.equal(discoverRes.status, 409);
  assert.equal(discoverRes.body.code, 'CASE_ALREADY_COMPLETED');

  // 3. Request hint on completed case -> 409
  const hintRes = await request(app)
    .post(`/api/cases/${caseData.id}/hints`)
    .send({});
  assert.equal(hintRes.status, 409);
  assert.equal(hintRes.body.code, 'CASE_ALREADY_COMPLETED');
});

test('GET non-existent case returns 404', async () => {
  const res = await request(app).get('/api/cases/invalid_case_id_99999');
  assert.equal(res.status, 404);
  assert.equal(res.body.code, 'CASE_NOT_FOUND');
});

test('GET unknown endpoint returns 404 NOT_FOUND', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.code, 'NOT_FOUND');
});
