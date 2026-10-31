const mongoose = require('mongoose');

const suspectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  alibi: { type: String, default: '' },
}, { _id: false });

const clueSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  content: { type: String, default: '' },
  summary: { type: String, required: true },
  relevantSuspectIds: { type: [String], default: [] },
}, { _id: false });

const solutionSchema = new mongoose.Schema({
  culpritSuspectId: { type: String, required: true },
  motive: { type: String, required: true },
  explanation: { type: String, required: true },
  supportingClueIds: { type: [String], default: [] },
  reasoning: { type: [String], default: [] },
  redHerringExplanations: { type: [String], default: [] },
}, { _id: false });

const resultSchema = new mongoose.Schema({
  correct: { type: Boolean, required: true },
  score: { type: Number, required: true, min: 0 },
  scoreBreakdown: {
    basePoints: Number,
    cluePoints: Number,
    hintPenalty: Number,
  },
  completedAt: { type: Date, default: Date.now },
  explanation: { type: String, default: '' },
  supportingClueIds: { type: [String], default: [] },
  culprit: {
    id: String,
    name: String,
  },
}, { _id: false });

const caseSchema = new mongoose.Schema(
  {
    publicId: { type: String, unique: true, required: true, index: true },
    premise: { type: String, required: true, trim: true },
    title: { type: String, required: true },
    story: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    suspects: [suspectSchema],
    clues: [clueSchema],
    hints: { type: [String], default: [] },
    solution: { type: solutionSchema, select: false },
    discoveredClueIds: { type: [String], default: [] },
    hintsUsed: { type: Number, default: 0 },
    accusation: {
      suspectId: String,
      submittedAt: Date,
    },
    result: { type: resultSchema, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Case', caseSchema);
