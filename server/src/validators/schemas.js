const { z } = require('zod');

const difficultySchema = z.enum(['easy', 'medium', 'hard']);

const generateCaseSchema = z.object({
  premise: z.string().trim().min(20).max(1000),
  difficulty: difficultySchema,
});

const accuseSchema = z.object({
  suspectId: z.string().min(1).max(100),
});

module.exports = {
  difficultySchema,
  generateCaseSchema,
  accuseSchema,
};
