const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const { DIFFICULTY_CONFIG } = require('./scoring');

const clueTypes = [
  'chat',
  'image_description',
  'cctv_transcript',
  'document',
  'timeline',
  'physical',
  'other',
];

function makePublicId() {
  return `case_${crypto.randomBytes(6).toString('hex')}`;
}

function buildFallbackCase(premise, difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const suspectCount = Math.max(3, config.clueCount > 7 ? 5 : config.clueCount > 5 ? 4 : 3);
  const names = [
    'Mara Vale',
    'Julian Frost',
    'Nia Holloway',
    'Theo Mercer',
    'Elsie Green',
  ];

  const suspects = names.slice(0, suspectCount).map((name, index) => {
    const id = `suspect_${index + 1}`;
    const isCulprit = index === 0;
    return {
      id,
      name,
      description: `${name} is a${/[AEIOU]/i.test(name[0]) ? 'n' : ''} person tied to the story's central setting with a distinct motive and public reputation.`,
      alibi: isCulprit
        ? 'The culprit claims they were checking a locked cabinet before the event started.'
        : `This suspect says they were occupied elsewhere and cannot explain a short gap in their timeline.`,
    };
  });

  const culprit = suspects[0];
  const clues = [];

  for (let index = 0; index < config.clueCount; index += 1) {
    const clueId = `clue_${index + 1}`;
    const isSupportive = index < 3;
    clues.push({
      id: clueId,
      title: [
        'A Missing Key',
        'A Contradictory Timeline',
        'A Whispered Warning',
        'Dust on the Window Ledge',
        'A Hidden Note',
        'The Broken Clock',
        'Three Witness Statements',
        'The Storage Room Ledger',
        'A Burned Letter',
      ][index],
      type: clueTypes[index % clueTypes.length],
      summary: isSupportive
        ? 'This clue points to a rushed escape and a hidden motive.'
        : 'This clue appears harmless until the timeline is compared with the suspect statements.',
      content: isSupportive
        ? `Fictional evidence for ${clueId}: The suspect's item was found near the scene after the alarm. The lock shows signs of being opened with a key known to ${culprit.name}.`
        : `Fictional evidence for ${clueId}: A ledger entry and witness report show a brief discrepancy that only makes sense if one suspect is lying about their route.`,
      relevantSuspectIds: isSupportive ? [culprit.id, suspects[(index + 1) % suspects.length].id] : suspects.map((suspect) => suspect.id),
    });
  }

  const hints = [
    'Compare the suspect alibis with the timeline and look for the person who has the strongest access to the missing item.',
    'The culprit was not acting alone, but the strongest contradiction is in their own story.',
    'The most convincing evidence is not the loudest accusation; it is the quiet inconsistency repeated across multiple clues.',
  ].slice(0, config.hintAllowance);

  const solution = {
    culpritSuspectId: culprit.id,
    motive: 'The culprit wanted to protect a secret connection to the missing object and feared exposure if the investigation reached the right room.',
    explanation: `${culprit.name} left both physical and timeline evidence behind. The motive appears personal: the culprit was trying to conceal a hidden arrangement that would destroy their reputation.`,
    supportingClueIds: clues.slice(0, 3).map((clue) => clue.id),
    reasoning: [
      `${clues[0].id} places the culprit near the critical scene after the lock was opened.`,
      `${clues[1].id} exposes an inconsistent timeline that only the culprit can explain.`,
      `${clues[2].id} matches the motive and helps rule out the remaining suspects.`,
    ],
    redHerringExplanations: ['A second suspect appears guilty because of access, but their timeline never matches the critical event.'],
  };

  return {
    publicId: makePublicId(),
    premise: premise.trim(),
    title: `The ${difficulty[0].toUpperCase()}${difficulty.slice(1)} Case at Bellweather House`,
    story: `A fictional mystery unfolds in a grand but isolated estate. The player must reconstruct events around a staged theft and a sudden disappearance while the town waits for a verdict. ${premise}`,
    difficulty,
    status: 'active',
    suspects,
    clues,
    hints,
    solution,
    discoveredClueIds: [],
    hintsUsed: 0,
    accusations: [],
    accusation: null,
    result: null,
    hintRequests: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function generateCaseFromGemini({ premise, difficulty }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey || !process.env.GEMINI_API_KEY) {
    return buildFallbackCase(premise, difficulty);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: `Generate a fictional mystery in valid JSON with this exact structure and no markdown. premise: ${premise}; difficulty: ${difficulty}; output: { title, story, suspects: [{id,name,description,alibi}], clues: [{id,title,type,content,summary,relevantSuspectIds}], hints: [string], solution: {culpritSuspectId,motive,explanation,supportingClueIds,reasoning,redHerringExplanations} } }` }],
        },
      ],
    });

    const raw = result && result.text ? result.text : result?.response?.text;
    if (!raw) {
      throw new Error('No content returned by Gemini.');
    }

    const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
    const suspects = json.suspects || [];
    const clues = json.clues || [];
    const hints = json.hints || [];

    if (suspects.length !== (difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5)) {
      throw new Error('Invalid suspect count.');
    }

    if (clues.length !== config.clueCount) {
      throw new Error('Invalid clue count.');
    }

    if (hints.length !== config.hintAllowance) {
      throw new Error('Invalid hint count.');
    }

    return {
      publicId: makePublicId(),
      premise: premise.trim(),
      title: json.title,
      story: json.story,
      difficulty,
      status: 'active',
      suspects,
      clues,
      hints,
      solution: json.solution,
      discoveredClueIds: [],
      hintsUsed: 0,
      accusation: null,
      result: null,
      hintRequests: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return buildFallbackCase(premise, difficulty);
  }
}

module.exports = {
  makePublicId,
  generateCaseFromGemini,
  buildFallbackCase,
  DIFFICULTY_CONFIG,
};
