const DIFFICULTY_CONFIG = {
  easy: { basePoints: 100, clueCount: 5, hintAllowance: 2 },
  medium: { basePoints: 150, clueCount: 7, hintAllowance: 3 },
  hard: { basePoints: 200, clueCount: 9, hintAllowance: 3 },
};

function computeScore({ isCorrect, discoveredClueCount, hintsUsed, difficulty }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const basePoints = isCorrect ? config.basePoints : 0;
  const cluePoints = discoveredClueCount * 5;
  const hintPenalty = hintsUsed * 10;
  return Math.max(0, basePoints + cluePoints - hintPenalty);
}

function buildScoreBreakdown({ isCorrect, discoveredClueCount, hintsUsed, difficulty }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const basePoints = isCorrect ? config.basePoints : 0;
  const cluePoints = discoveredClueCount * 5;
  const hintPenalty = hintsUsed * 10;

  return {
    basePoints,
    cluePoints,
    hintPenalty,
  };
}

module.exports = {
  DIFFICULTY_CONFIG,
  computeScore,
  buildScoreBreakdown,
};
