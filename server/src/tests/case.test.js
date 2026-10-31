process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFallbackCase, DIFFICULTY_CONFIG } = require('../services/generateCase');
const { computeScore, buildScoreBreakdown } = require('../services/scoring');
const { difficultySchema, generateCaseSchema, accuseSchema } = require('../validators/schemas');

test('difficulty config covers all required difficulties and values', () => {
  assert.deepEqual(DIFFICULTY_CONFIG.easy, { basePoints: 100, clueCount: 5, hintAllowance: 2 });
  assert.deepEqual(DIFFICULTY_CONFIG.medium, { basePoints: 150, clueCount: 7, hintAllowance: 3 });
  assert.deepEqual(DIFFICULTY_CONFIG.hard, { basePoints: 200, clueCount: 9, hintAllowance: 3 });
});

test('case generation returns correct counts for easy difficulty', () => {
  const caseDoc = buildFallbackCase('A locked cabinet and a hidden note point to a quiet betrayal.', 'easy');
  assert.equal(caseDoc.difficulty, 'easy');
  assert.equal(caseDoc.suspects.length, 3);
  assert.equal(caseDoc.clues.length, 5);
  assert.equal(caseDoc.hints.length, 2);
  assert.equal(caseDoc.solution.culpritSuspectId, caseDoc.suspects[0].id);
});

test('case generation returns correct counts for medium difficulty', () => {
  const caseDoc = buildFallbackCase('A missing artifact from the gallery vault leaves everyone suspicious.', 'medium');
  assert.equal(caseDoc.difficulty, 'medium');
  assert.equal(caseDoc.suspects.length, 4);
  assert.equal(caseDoc.clues.length, 7);
  assert.equal(caseDoc.hints.length, 3);
  assert.equal(caseDoc.solution.culpritSuspectId, caseDoc.suspects[0].id);
});

test('case generation returns correct counts for hard difficulty', () => {
  const caseDoc = buildFallbackCase('A complex conspiracy with multiple alibis and conflicting physical evidence.', 'hard');
  assert.equal(caseDoc.difficulty, 'hard');
  assert.equal(caseDoc.suspects.length, 5);
  assert.equal(caseDoc.clues.length, 9);
  assert.equal(caseDoc.hints.length, 3);
  assert.equal(caseDoc.solution.culpritSuspectId, caseDoc.suspects[0].id);
});

test('generated cases have unique IDs and valid references', () => {
  const caseDoc = buildFallbackCase('A mysterious incident occurred in the manor library during midnight.', 'medium');
  
  // Unique suspect IDs
  const suspectIds = caseDoc.suspects.map((s) => s.id);
  assert.equal(new Set(suspectIds).size, suspectIds.length);

  // Unique clue IDs
  const clueIds = caseDoc.clues.map((c) => c.id);
  assert.equal(new Set(clueIds).size, clueIds.length);

  // Culprit ID exists in suspect list
  assert.ok(suspectIds.includes(caseDoc.solution.culpritSuspectId));

  // Supporting clues exist in clue list
  for (const supportingId of caseDoc.solution.supportingClueIds) {
    assert.ok(clueIds.includes(supportingId));
  }

  // Solution details exist
  assert.ok(caseDoc.solution.motive.length > 0);
  assert.ok(caseDoc.solution.explanation.length > 0);
  assert.ok(caseDoc.solution.reasoning.length > 0);
});

test('score calculation follows documented formula for all difficulties', () => {
  // Easy: base 100
  assert.equal(computeScore({ isCorrect: true, discoveredClueCount: 5, hintsUsed: 0, difficulty: 'easy' }), 125);
  assert.equal(computeScore({ isCorrect: true, discoveredClueCount: 3, hintsUsed: 1, difficulty: 'easy' }), 105);

  // Medium: base 150
  assert.equal(computeScore({ isCorrect: true, discoveredClueCount: 4, hintsUsed: 1, difficulty: 'medium' }), 160);
  assert.equal(computeScore({ isCorrect: true, discoveredClueCount: 7, hintsUsed: 0, difficulty: 'medium' }), 185);

  // Hard: base 200
  assert.equal(computeScore({ isCorrect: true, discoveredClueCount: 9, hintsUsed: 0, difficulty: 'hard' }), 245);
  assert.equal(computeScore({ isCorrect: true, discoveredClueCount: 5, hintsUsed: 2, difficulty: 'hard' }), 205);
});

test('incorrect accusation receives 0 base points and keeps clue/hint adjustments', () => {
  const score = computeScore({ isCorrect: false, discoveredClueCount: 4, hintsUsed: 1, difficulty: 'hard' });
  assert.equal(score, 10); // 0 base + (4*5) - (1*10) = 10

  const breakdown = buildScoreBreakdown({ isCorrect: false, discoveredClueCount: 4, hintsUsed: 1, difficulty: 'hard' });
  assert.deepEqual(breakdown, { basePoints: 0, cluePoints: 20, hintPenalty: 10 });
});

test('score calculation never falls below zero', () => {
  // 0 clues, 2 hints used, incorrect accusation -> 0 + 0 - 20 = -20 -> clamped to 0
  const score = computeScore({ isCorrect: false, discoveredClueCount: 0, hintsUsed: 2, difficulty: 'easy' });
  assert.equal(score, 0);

  // 1 clue, 3 hints used, incorrect accusation -> 0 + 5 - 30 = -25 -> clamped to 0
  const scoreWithOneClue = computeScore({ isCorrect: false, discoveredClueCount: 1, hintsUsed: 3, difficulty: 'medium' });
  assert.equal(scoreWithOneClue, 0);
});

test('validation schema: difficultySchema validates allowed levels', () => {
  assert.equal(difficultySchema.parse('easy'), 'easy');
  assert.equal(difficultySchema.parse('medium'), 'medium');
  assert.equal(difficultySchema.parse('hard'), 'hard');

  assert.throws(() => difficultySchema.parse('expert'));
  assert.throws(() => difficultySchema.parse(''));
  assert.throws(() => difficultySchema.parse(null));
});

test('validation schema: generateCaseSchema validates premise boundaries and trims', () => {
  // Valid premise: exactly 20 characters
  const validMin = generateCaseSchema.parse({
    premise: '12345678901234567890',
    difficulty: 'easy',
  });
  assert.equal(validMin.premise, '12345678901234567890');

  // Valid premise with surrounding whitespace that trims to valid length
  const validPadded = generateCaseSchema.parse({
    premise: '   A locked cabinet and hidden note inside the estate.   ',
    difficulty: 'medium',
  });
  assert.equal(validPadded.premise, 'A locked cabinet and hidden note inside the estate.');

  // Too short premise (< 20 characters)
  assert.throws(() => {
    generateCaseSchema.parse({ premise: 'Too short', difficulty: 'easy' });
  });

  // Whitespace only that trims to empty
  assert.throws(() => {
    generateCaseSchema.parse({ premise: '                    ', difficulty: 'easy' });
  });

  // Too long premise (> 1000 characters)
  assert.throws(() => {
    generateCaseSchema.parse({ premise: 'a'.repeat(1001), difficulty: 'easy' });
  });

  // Missing difficulty
  assert.throws(() => {
    generateCaseSchema.parse({ premise: 'A locked cabinet and a hidden note point to a quiet betrayal.' });
  });
});

test('validation schema: accuseSchema validates suspectId', () => {
  assert.deepEqual(accuseSchema.parse({ suspectId: 'suspect_1' }), { suspectId: 'suspect_1' });

  // Missing suspectId
  assert.throws(() => accuseSchema.parse({}));

  // Empty suspectId
  assert.throws(() => accuseSchema.parse({ suspectId: '' }));

  // Non-string suspectId
  assert.throws(() => accuseSchema.parse({ suspectId: 123 }));
});

test('generateCaseFromGemini falls back cleanly when API key is missing or provider fails', async () => {
  const { generateCaseFromGemini } = require('../services/generateCase');
  const result = await generateCaseFromGemini({
    premise: 'A suspicious disappearance occurred in the botanical greenhouse.',
    difficulty: 'medium',
  });
  assert.equal(result.difficulty, 'medium');
  assert.equal(result.suspects.length, 4);
  assert.equal(result.clues.length, 7);
  assert.equal(result.hints.length, 3);
  assert.equal(result.status, 'active');
});

test('store can save, retrieve, and list cases', async () => {
  const { saveCase, getCase, listCases } = require('../store/caseStore');
  const dummy = { publicId: 'test_store_1', title: 'Test Mystery' };
  await saveCase(dummy);
  assert.deepEqual(await getCase('test_store_1'), dummy);
  assert.equal(await getCase('non_existent_key'), null);
  const all = await listCases();
  assert.ok(all.some((c) => c.publicId === 'test_store_1'));
});

