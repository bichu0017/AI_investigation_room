# AI Mystery Room — Project Specification

**Document:** `SPEC.md`  
**Version:** 1.0  
**Status:** Implementation-ready baseline  
**Project type:** Full-stack web application  
**Architecture:** MERN (MongoDB, Express, React, Node.js)  
**AI provider:** Gemini API via `@google/genai`

---

## 1. Project Overview

AI Mystery Room is an interactive, AI-powered detective game. A player supplies a short premise, scenario, or story and chooses a difficulty level. The backend asks Gemini to create a fictional investigation with suspects, evidence, hints, and a single intended culprit. The player examines the case materials, discovers clues, optionally requests hints, and submits an accusation. The application then reveals the verdict, culprit, explanation, and score.

All cases and evidence are fictional and generated for entertainment. Any generated chat messages, photographs, CCTV descriptions, timelines, or other media must be clearly presented as fictional in-game evidence—not authentic records.

### 1.1 Problem Statement

Mystery games can be repetitive or limited to prewritten cases. Players need a way to create fresh investigations around their own story ideas while still receiving a fair, coherent challenge. AI Mystery Room uses Gemini to generate cases dynamically, while backend validation and scoring rules make the experience consistent and prevent the solution from being exposed before an accusation.

### 1.2 Product Goals

- Let a player create a mystery from a short premise.
- Support Easy, Medium, and Hard difficulty.
- Provide a clear, immersive investigation interface.
- Generate a consistent set of suspects, clues, and hints.
- Keep the culprit and solution private until an accusation is submitted.
- Calculate scores on the backend using documented rules.
- Let players review the outcome and start another case.

### 1.3 Non-Goals for the Initial Release

- Real police investigations or real-world forensic analysis.
- Uploading or analyzing real evidence from actual crimes.
- Multiplayer, public leaderboards, chat between players, or social accounts.
- User-generated public case sharing.
- Native mobile applications.
- Guaranteed generation of actual playable video or image files. The initial version may represent image/CCTV evidence as descriptions, captions, timestamps, or generated illustrative assets if image generation is separately integrated.

---

## 2. Target Users and Experience

### 2.1 Target Users

- Casual players who enjoy puzzles and detective stories.
- Students and hobbyists exploring AI-assisted application development.
- Friends or families looking for a short interactive mystery.
- Users who want to turn a story idea into a playable investigation.

### 2.2 Expected Experience

The application should feel like a digital detective workspace: focused, atmospheric, readable, and easy to navigate. Players should understand what to do next without needing instructions outside the application.

- Desktop: a spacious investigation dashboard with suspects and evidence visible together where practical.
- Tablet: a two-column or stacked layout.
- Mobile: a single-column layout with accessible controls and no horizontal scrolling.
- Loading operations should communicate progress without pretending that generation has finished.
- The application must not reveal the culprit, hidden solution, or answer-bearing internal fields before an accusation is accepted.

---

## 3. Scope and Feature Requirements

Requirements use these identifiers for traceability. **MUST** indicates a release requirement; **SHOULD** indicates a strong recommendation; **MAY** indicates an optional enhancement.

### 3.1 Core Features

| ID | Requirement |
|---|---|
| FR-01 | The home page MUST explain the game and provide a clear “Create a Mystery” action. |
| FR-02 | The player MUST enter a premise within defined length limits and choose a difficulty. |
| FR-03 | The backend MUST generate a case using Gemini and validate the result before saving it. |
| FR-04 | The case MUST contain the difficulty-specific number of suspects, clues, and hints. |
| FR-05 | The player MUST be able to retrieve an active case and its public investigation data. |
| FR-06 | The player MUST be able to discover clues and see their discovery state. |
| FR-07 | The player MUST be able to request hints, subject to the case's hint allowance. |
| FR-08 | The player MUST be able to select a suspect and submit one final accusation. |
| FR-09 | The backend MUST calculate the score and determine the verdict. |
| FR-10 | The results page MUST show the verdict, correct culprit, explanation, and final score after submission. |
| FR-11 | The player MUST be able to start a new case from the home page or results page. |
| FR-12 | The frontend MUST show loading, empty, validation, network, and server-error states. |
| FR-13 | The solution MUST remain server-side until an accusation is successfully submitted. |
| FR-14 | The application MUST work at the configured production deployment URL. |

### 3.2 Optional Enhancements

- AI-generated illustrative evidence images, with clear fictional labels.
- Audio ambience and sound effects with mute controls.
- Save/resume history and player accounts.
- Case categories (e.g. mansion, museum, office, train).
- Timed challenge mode.
- Printable case summary after completion.
- Accessibility theme options and reduced-motion support.
- Leaderboards, achievements, and daily challenges.
- Regenerate a failed AI case with a bounded retry policy.
- Streaming generation progress, if it does not expose hidden solution data.

Optional features must not delay or compromise the core security and correctness requirements.

---

## 4. Technology Stack and Architecture

### 4.1 Required Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios.
- **Backend:** Node.js, Express.
- **Database:** MongoDB, Mongoose.
- **AI:** Gemini API through the official `@google/genai` package.
- **Validation:** Zod for request payloads and AI output schemas.
- **Configuration:** `dotenv`.
- **Development:** `nodemon`.
- **Testing recommendation:** Vitest and React Testing Library for frontend; Node test runner or Jest/Supertest for backend/API tests.

### 4.2 High-Level Architecture

```text
React + Vite + Tailwind
        |
        | HTTPS / JSON API
        v
Express API (validation, authorization, scoring)
        |                         |
        v                         v
MongoDB via Mongoose          Gemini API
(cases and progress)          (case generation)
```

The frontend never calls Gemini directly. It must never receive the Gemini API key or hidden solution fields.

### 4.3 Suggested Repository Layout

```text
ai-mystery-room/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   │   └── geminiService.js
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── SPEC.md
└── README.md
```

The exact folder names may change, but responsibilities should remain separated: routes/controllers handle HTTP, services handle Gemini and game logic, models handle persistence, and validators define trusted data contracts.

### 4.4 Environment Variables

Create `server/.env` locally and never commit it.

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_mystery_room
GEMINI_API_KEY=replace_with_your_key
GEMINI_MODEL=replace_with_a_supported_model_id
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

`GEMINI_MODEL` must be set to a model ID currently available to the project's Gemini API key. Do not hard-code credentials. Commit `.env.example` with placeholders, not real secrets. The frontend may use a non-secret `VITE_API_BASE_URL`, but no `VITE_` variable may contain a secret.

---

## 5. User Flow

1. **Open Home:** Player sees the game description and “Create a Mystery”.
2. **Create Mystery:** Player enters a premise and chooses Easy, Medium, or Hard.
3. **Generate:** Frontend displays a loading state and sends the premise/difficulty to the API.
4. **Validate and save:** Backend validates the request, asks Gemini for structured case data, validates that data and its logic, then saves it.
5. **Enter Investigation Room:** Frontend receives only public case data and displays the story, suspects, clues, hint control, and progress.
6. **Investigate:** Player opens a clue. The frontend requests discovery from the backend; the backend records it and returns the public clue content and updated progress.
7. **Request a hint (optional):** Player requests the next hint. Backend enforces the hint allowance and records hint usage.
8. **Accuse:** Player selects a suspect and submits the accusation. The backend verifies the case is active and the suspect belongs to the case, calculates the final score, stores the result, and marks the case complete.
9. **Results:** Frontend requests or receives the result and displays verdict, culprit, explanation, score breakdown, and restart action.
10. **Play again:** Player returns to Create Mystery to begin another case.

### 5.1 Navigation Rules

- Suggested routes: `/`, `/create`, `/cases/:id`, `/cases/:id/accuse`, `/cases/:id/results`.
- Unknown case IDs show a not-found state with a Home link.
- A completed case cannot accept more clues, hints, or accusations.
- Refreshing an active case should restore public case data and progress from the API.
- If a player navigates directly to the accusation route, show available suspects only for an active case.
- The results route must not reveal the solution for an active case. If the case is still active, redirect to the investigation page or show a “Finish your investigation first” message.
- Since authentication is out of scope for v1, a case ID is a capability-like identifier, not strong user identity. Use a cryptographically random, non-sequential ID and rate limiting. Do not claim private accounts or cross-user ownership.

---

## 6. UI and Page Specifications

### 6.1 Shared Design Requirements

- Use a consistent detective / case-file visual theme without sacrificing readability.
- Use semantic HTML, visible keyboard focus, accessible labels, and sufficient color contrast.
- All buttons must have clear labels and disabled/loading states.
- Evidence must be clearly labeled as fictional.
- Do not rely on color alone to communicate clue status, verdict, or errors.
- Layout must work at 320px viewport width and above.
- Support keyboard navigation and reduced-motion preferences.

### 6.2 Home Page (`/`)

**Purpose:** Explain the game and start the experience.

**Required elements:**
- Product name: AI Mystery Room.
- Brief explanation of premise-to-mystery gameplay.
- Primary “Create a Mystery” button.
- Short note that cases and evidence are fictional AI-generated content.
- Optional sample case preview that does not disclose a solution.

**States:** normal; navigation/loading if required; recoverable global error.

### 6.3 Create Mystery Page (`/create`)

**Purpose:** Gather inputs for case generation.

**Required elements:**
- Premise textarea with a clear prompt and example.
- Character counter and validation feedback.
- Difficulty selector: Easy, Medium, Hard.
- “Generate Mystery” submit button.
- Back/Home navigation.
- Short explanation that generation may take several seconds.

**Validation:**
- Trim whitespace before submission.
- Premise must contain 20–1,000 characters after trimming.
- Difficulty must be one of `easy`, `medium`, `hard`.
- Prevent duplicate submissions while a request is in progress.

**States:** idle; invalid input; generating; generation failure with retry; successful navigation.

### 6.4 Investigation Room (`/cases/:id`)

**Purpose:** Present public evidence and track investigation progress.

**Required elements:**
- Case title, story, difficulty, and progress indicator.
- Suspect cards showing suspect ID, name, public description, and relevant non-solution background.
- Clue list/grid showing locked/discovered state, title, evidence type, and content when discovered.
- Clue detail panel or modal.
- Hint request button with remaining hint count.
- “Make an Accusation” action.
- Clear fictional evidence labels and accessible timestamps where relevant.

**Evidence types:** `chat`, `image_description`, `cctv_transcript`, `document`, `timeline`, `physical`, `other`. In v1, image and CCTV evidence may be textual descriptions or transcripts. Do not display a fake media player for a non-existent video.

**States:**
- Loading case: skeleton/spinner and status text.
- Case not found: message and Home link.
- Active: show story, suspects, clues, hints, progress.
- Discovering clue: disable repeated action and show progress.
- No hints remaining: disable hint button and explain why.
- Case completed: show result link; disable further investigation mutations.
- Network/API error: actionable retry without silently losing progress.

### 6.5 Accusation Page (`/cases/:id/accuse`)

**Purpose:** Confirm the player's final suspect selection.

**Required elements:**
- Brief instruction to choose one suspect.
- Selectable suspect cards or radio group.
- Clear selected state and keyboard support.
- Confirmation warning that this is the final accusation.
- “Submit Accusation” and “Return to Investigation” actions.

**Rules:**
- Require exactly one valid suspect ID.
- Disable submission while pending.
- Do not send or expose the correct suspect to the client.
- Prevent duplicate final submissions; API must enforce this even if the UI is bypassed.

### 6.6 Results Page (`/cases/:id/results`)

**Purpose:** Explain the outcome and reward the player.

**Required elements:**
- Verdict: correct or incorrect.
- Culprit's name and suspect ID.
- Final score and score breakdown.
- Explanation of the culprit's motive/opportunity and how the clues support the conclusion.
- Discovered clue count and hints used.
- “Play Again” action and optional “Review Case” action.

The result endpoint is available only after the case has been completed. If the player guessed incorrectly, reveal the correct culprit and explanation here.

### 6.7 Responsive Behavior

- Mobile: stack content vertically; use full-width buttons where appropriate; ensure modals fit within the viewport.
- Tablet: use flexible two-column layout when space allows.
- Desktop: show suspect and evidence panels side by side where useful.
- Avoid fixed widths that cause horizontal overflow.
- Test at 320px, 768px, 1024px, and 1440px widths.

---

## 7. Difficulty and Game Rules

### 7.1 Required Case Sizes

| Difficulty | Suspects | Clues | Hints | Base points for correct accusation |
|---|---:|---:|---:|---:|
| Easy | 3 | 5 | 2 | 100 |
| Medium | 4 | 7 | 3 | 150 |
| Hard | 5 | 9 | 3 | 200 |

Difficulty determines the required number of suspects, clues, and hints, and the base score. It should also affect reasoning complexity, not just quantity.

- **Easy:** direct, clearly supported deduction; limited ambiguity.
- **Medium:** multiple clues need to be combined; plausible red herrings are allowed but must be fairly resolved.
- **Hard:** multi-step deductions and subtler contradictions, while retaining a uniquely supported answer.

### 7.2 Scoring

The backend is the sole authority for scoring.

- Correct accusation: add the difficulty base score.
- Each unique discovered clue: `+5`.
- Each hint successfully requested: `−10`.
- Minimum final score: `0`.
- Incorrect accusation: no base points; clue points and hint penalties still apply, with a minimum of zero.

Formula:

```text
base = correct ? difficultyBasePoints : 0
cluePoints = uniqueDiscoveredClueCount * 5
hintPenalty = hintsUsed * 10
finalScore = max(0, base + cluePoints - hintPenalty)
```

Example: Medium case, correct accusation, 4 clues discovered, 1 hint used:
`150 + (4 × 5) − (1 × 10) = 160`.

Repeated clue-discovery requests must not grant duplicate points. Repeated hint requests must not consume multiple hints for a single successful request. A hint is counted only when the backend successfully returns and records it.

### 7.3 Case State Machine

Valid states: `active`, `completed`.

- New valid case: `active`.
- Discover clue: remains `active`.
- Request hint: remains `active`.
- Submit valid accusation: transitions once to `completed`.
- Completed cases are immutable for gameplay actions.
- A repeated accusation returns a conflict response and must not recalculate or overwrite the original result.

---

## 8. Gemini AI Behavior

### 8.1 Responsibilities

Gemini is used only on the backend to draft structured mystery content. It must produce:
- Case title and story.
- Required number of suspects.
- Required number of clues and their content.
- Required number of ordered hints.
- One culprit reference.
- A private solution explanation and clue-to-deduction reasoning.
- Optional motive, timeline, and red-herring explanations.

The application must not trust generated output merely because it is valid JSON. It must validate schema, references, counts, and basic logical consistency before persisting the case.

### 8.2 Generation Constraints

The system instruction/prompt should require that:
1. All people, events, places, and evidence are fictional.
2. There is exactly one intended culprit and that culprit is among the suspects.
3. All clue IDs and suspect IDs are unique.
4. The solution is supported by specific clues, with clue IDs referenced in the private solution rationale.
5. No required clue contradicts the intended solution without a clear explanation.
6. Red herrings are plausible but do not make the solution impossible or equally likely to multiple suspects.
7. Hints reveal progressively more guidance without directly naming the culprit in the first hint.
8. Output is JSON matching the declared schema, without Markdown fences or extra prose.
9. Difficulty-specific counts are exact.
10. No real person's private information, real case details, or actionable criminal instructions are included.

### 8.3 Expected AI Output (Private Internal Shape)

The backend may request an internal structure like this:

```json
{
  "title": "The Last Light at Blackwood Hall",
  "story": "A fictional case introduction...",
  "suspects": [
    {
      "id": "suspect_1",
      "name": "Mara Vale",
      "description": "The museum curator...",
      "alibi": "She says she was in the archive."
    }
  ],
  "clues": [
    {
      "id": "clue_1",
      "title": "A Message at 9:14",
      "type": "chat",
      "content": "A fictional message transcript...",
      "summary": "A timestamp conflicts with one suspect's account.",
      "relevantSuspectIds": ["suspect_1"]
    }
  ],
  "hints": [
    "Compare the stated time with the evidence timestamps."
  ],
  "solution": {
    "culpritSuspectId": "suspect_1",
    "motive": "A fictional motive...",
    "explanation": "The evidence supports this conclusion because...",
    "supportingClueIds": ["clue_1"],
    "reasoning": [
      "Clue clue_1 conflicts with the alibi."
    ],
    "redHerringExplanations": []
  }
}
```

This is illustrative; production code must use a strict Zod schema and require all fields that the application actually uses. The example intentionally shows only one suspect and clue to demonstrate shape; actual generated counts must match the selected difficulty.

### 8.4 Validation and Retry

- Parse and validate the model response using Zod.
- Verify exact counts for the selected difficulty.
- Verify unique IDs, valid evidence types, and all referenced suspect/clue IDs.
- Verify `solution.culpritSuspectId` matches an existing suspect.
- Verify at least one supporting clue exists and all supporting clue IDs exist.
- Reject empty or excessively long fields.
- If validation fails, retry generation at most twice after the first attempt (three attempts total), using a corrective prompt that does not include secrets.
- If all attempts fail, return a controlled `502 AI_GENERATION_FAILED` response and do not save a partial case.
- Log validation failure categories, not the API key or unnecessary full sensitive content.
- A schema-valid response does not prove narrative logic. Add deterministic consistency checks and tests; where feasible, run a separate critique/repair step, but do not treat a second model response as a security guarantee.

### 8.5 Private and Public Data Separation

Store the solution in a backend-only field, for example `solution` with `select: false`, or in a separate private document. Explicitly map public response objects instead of serializing the full Mongoose document.

Never return:
- `solution`
- `culpritSuspectId`
- private reasoning
- hidden clue-to-solution metadata, if it directly reveals the answer
- the raw Gemini response

Only the completed result endpoint may return the culprit and solution explanation, and only after the case is `completed`.

---

## 9. Backend API Contract

Base URL in development: `http://localhost:5000`. All request and response bodies use JSON. The API should use a consistent error format.

### 9.1 Common Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please provide a premise between 20 and 1000 characters.",
    "details": []
  }
}
```

Do not send stack traces, API keys, raw provider errors, database internals, or hidden solution fields to clients.

### 9.2 `POST /api/cases` — Generate a Case

**Request**
```json
{
  "premise": "A priceless painting disappears during a private gallery event.",
  "difficulty": "medium"
}
```

**Success: `201 Created`**
```json
{
  "case": {
    "id": "case_public_id",
    "title": "The Silent Gallery",
    "story": "A fictional investigation begins...",
    "difficulty": "medium",
    "status": "active",
    "suspects": [
      {
        "id": "suspect_1",
        "name": "Mara Vale",
        "description": "The gallery curator."
      }
    ],
    "clues": [
      {
        "id": "clue_1",
        "title": "A Strange Message",
        "type": "chat",
        "summary": "A message may conflict with a timeline.",
        "discovered": false,
        "content": null
      }
    ],
    "progress": {
      "discoveredClueIds": [],
      "hintsUsed": 0,
      "hintsRemaining": 3
    },
    "createdAt": "2026-01-01T12:00:00.000Z"
  }
}
```

The example is abbreviated. Real output must contain the required number of suspects and clues. `content` is withheld until the clue is discovered. Never include solution fields.

**Errors:** `400 VALIDATION_ERROR`, `429 RATE_LIMITED`, `502 AI_GENERATION_FAILED`, `503 DATABASE_UNAVAILABLE`.

### 9.3 `GET /api/cases/:id` — Retrieve an Active Case

**Success: `200 OK`** returns the same public case structure with current progress. Clue content is returned only for clues already discovered by this player/case state. Since v1 has no accounts, the case ID identifies the case and its stored progress; document this limitation and protect against ID guessing.

**Errors:** `400 INVALID_CASE_ID`, `404 CASE_NOT_FOUND`, `500 INTERNAL_ERROR`.

### 9.4 `POST /api/cases/:id/clues/:clueId/discover` — Discover a Clue

**Request:** Empty JSON body is acceptable.

**Success: `200 OK`**
```json
{
  "clue": {
    "id": "clue_1",
    "title": "A Strange Message",
    "type": "chat",
    "content": "A fictional message transcript...",
    "discovered": true
  },
  "progress": {
    "discoveredClueIds": ["clue_1"],
    "cluesDiscovered": 1,
    "scoreSoFar": 5
  }
}
```

Repeated discovery of the same clue is idempotent and does not add duplicate points.

**Errors:** `400 INVALID_CLUE_ID`, `404 CASE_NOT_FOUND`, `404 CLUE_NOT_FOUND`, `409 CASE_ALREADY_COMPLETED`.

### 9.5 `POST /api/cases/:id/hints` — Request a Hint

**Request**
```json
{}
```

**Success: `200 OK`**
```json
{
  "hint": {
    "index": 1,
    "text": "Compare the timestamps before accepting the alibi."
  },
  "progress": {
    "hintsUsed": 1,
    "hintsRemaining": 2,
    "scoreSoFar": 0
  }
}
```

Hints are returned in order. The backend records the hint usage atomically so concurrent requests cannot exceed the allowance. A previously issued hint should not be charged again if the client retries due to a network failure; implement an idempotency key or return the next already-issued hint according to a documented retry strategy.

**Errors:** `404 CASE_NOT_FOUND`, `409 NO_HINTS_REMAINING`, `409 CASE_ALREADY_COMPLETED`.

### 9.6 `POST /api/cases/:id/accuse` — Submit an Accusation

**Request**
```json
{
  "suspectId": "suspect_2"
}
```

**Success: `200 OK`**
```json
{
  "result": {
    "caseId": "case_public_id",
    "status": "completed",
    "correct": false,
    "score": 20,
    "scoreBreakdown": {
      "basePoints": 0,
      "cluePoints": 30,
      "hintPenalty": 10
    },
    "culprit": {
      "id": "suspect_1",
      "name": "Mara Vale"
    },
    "explanation": "The timeline and message evidence establish...",
    "supportingClueIds": ["clue_1", "clue_3"]
  }
}
```

This is the first point in the normal flow when the client may receive the culprit and solution explanation. The backend must verify the case is active and the suspect ID exists. It must compute score from stored progress, not values sent by the client.

**Errors:** `400 VALIDATION_ERROR`, `404 CASE_NOT_FOUND`, `404 SUSPECT_NOT_FOUND`, `409 CASE_ALREADY_COMPLETED`.

### 9.7 `GET /api/cases/:id/result` — Retrieve Completed Result

**Success: `200 OK`** returns the same result structure as accusation submission, for completed cases only.

**Errors:** `404 CASE_NOT_FOUND`, `409 CASE_NOT_COMPLETED`.

### 9.8 API-Wide Requirements

- Use `express.json()` with a reasonable body-size limit.
- Validate route IDs, params, query strings, and bodies.
- Use a consistent JSON error response.
- Apply CORS only for configured origins (`CLIENT_URL` in production configuration).
- Add rate limits to case generation and hint requests.
- Set request timeouts and handle Gemini/provider failures.
- Use appropriate HTTP status codes.
- Never trust client-supplied score, discovered clue count, hint count, culprit, or case status.
- Consider `Cache-Control: no-store` on case and result responses.
- Use structured logs with request IDs and error categories.
- Protect concurrent state changes with atomic updates, transactions where appropriate, or conditional updates that check `status: active`.

---

## 10. MongoDB and Mongoose Data Model

### 10.1 Case Document

Suggested fields:

| Field | Type | Rules |
|---|---|---|
| `publicId` | String | Unique, random, indexed |
| `premise` | String | Trimmed, 20–1,000 characters |
| `title` | String | Required, bounded length |
| `story` | String | Required, bounded length |
| `difficulty` | Enum | `easy`, `medium`, `hard` |
| `status` | Enum | `active`, `completed` |
| `suspects` | Array of subdocuments | Exact count for difficulty |
| `clues` | Array of subdocuments | Exact count for difficulty |
| `hints` | Array of strings | Exact count for difficulty |
| `solution` | Private subdocument | Excluded from ordinary queries and public serialization |
| `discoveredClueIds` | Array of strings | Unique clue IDs only |
| `hintsUsed` | Number | Integer, from 0 through hint allowance |
| `accusation` | Subdocument/null | Final suspect ID and submission timestamp |
| `result` | Private/result subdocument/null | Written once when case completes |
| `createdAt` | Date | Automatic timestamp |
| `updatedAt` | Date | Automatic timestamp |

Suspect subdocument:
- `id`: unique stable ID within the case.
- `name`: required string.
- `description`: public string.
- `alibi`: optional public narrative only if it does not expose the answer directly.

Clue subdocument:
- `id`: unique stable ID within the case.
- `title`: required string.
- `type`: allowed evidence enum.
- `content`: evidence text, returned only after discovery.
- `summary`: public teaser that must not reveal the solution.
- `discoveredAt`: optional date or discovery state derived from `discoveredClueIds`.

Solution subdocument:
- `culpritSuspectId`: must reference an existing suspect.
- `motive`: private until completion.
- `explanation`: private until completion.
- `supportingClueIds`: references to existing clues.
- `reasoning`: private list of deduction statements.
- `redHerringExplanations`: optional private list.

Result subdocument:
- `correct`: Boolean.
- `score`: non-negative integer.
- `scoreBreakdown`: base points, clue points, hint penalty.
- `completedAt`: Date.

### 10.2 Persistence and Data Integrity

- Use Mongoose schema validation and application-level Zod validation.
- Create a unique index on `publicId`.
- Use timestamps.
- Avoid returning raw Mongoose documents; build explicit DTOs.
- Keep solution fields excluded by default and explicitly select them only in trusted backend result logic.
- Ensure a completed case's result and accusation cannot be overwritten by retries.
- Set a retention policy for old cases if needed; if TTL is implemented, document that old links expire.
- For v1, case progress belongs to the case ID and is not protected by user authentication. If ownership/privacy is required, add accounts or a secure session/token mechanism before deployment.

---

## 11. Security, Privacy, and Abuse Prevention

1. **Secret handling:** Gemini key stays in server environment variables. Never expose it in frontend bundles, responses, logs, or source control.
2. **Solution secrecy:** Use public DTO allowlists. Do not serialize solution-bearing database documents.
3. **Server-authoritative scoring:** Derive all score inputs from persisted backend state.
4. **Input validation:** Enforce premise lengths, enums, IDs, request-size limits, and schema constraints.
5. **Rate limiting:** Limit generation requests and hint attempts per IP/session/case to reduce abuse and unexpected API costs.
6. **CORS:** Allow only intended frontend origins in production.
7. **Error hygiene:** Return safe errors without stack traces or provider secrets.
8. **Prompt injection:** Treat the user premise as untrusted story content, not as system instructions. The generation prompt must preserve the game's schema and safety constraints even if the premise asks to ignore them.
9. **AI output validation:** Validate structure, counts, references, and consistency before persistence.
10. **Fictional evidence:** Label all generated evidence as fictional. Do not imply that generated content is genuine WhatsApp data, real CCTV footage, or authentic documentation.
11. **Abuse and safety:** Reject or safely redirect premises requesting targeted harassment, real-person allegations, personal data, or actionable wrongdoing. Keep fictional crime content non-instructional.
12. **No authentication in v1:** Do not claim that cases are private or tied to a verified user. Add ownership controls before supporting sensitive or shareable cases.
13. **Database access:** Use least-privilege MongoDB credentials and TLS in production.
14. **Deployment:** Use HTTPS, set secure headers (for example with Helmet), and keep dependencies updated.

---

## 12. Error Handling and Loading States

| Situation | Expected behavior |
|---|---|
| Empty/short premise | Inline validation; do not send API request |
| Invalid difficulty | API returns `400`; frontend shows a useful message |
| Gemini timeout or invalid output | Safe error; no partial case saved; allow retry |
| MongoDB unavailable | Controlled `503`; do not expose connection string |
| Case not found | Not-found page with Home action |
| Invalid clue/suspect ID | Show error; retain current case state |
| No hints remaining | Explain limit; no hint penalty |
| Double-click accusation | UI disables button; backend still enforces single completion |
| Case already completed | Disable investigation actions and link to result |
| Network disconnect | Show retry; reload canonical state from API |
| Unexpected error | Generic message plus retry/navigation; log details server-side |

Loading states must use truthful text such as “Generating your case…” and must not display invented case content before the API returns a validated case.

---

## 13. Testing Requirements

### 13.1 Backend Unit Tests

- Premise trimming and length boundaries.
- Difficulty-to-count mapping.
- AI output schema validation.
- Duplicate IDs and invalid suspect/clue references rejected.
- Correct score for each difficulty.
- Incorrect accusation receives no base points.
- Clue points and hint penalties are correct.
- Score never falls below zero.
- Repeated clue discovery awards points once.
- Hint allowance cannot be exceeded.
- Completed cases cannot be modified.

### 13.2 API Integration Tests

- Create cases at all three difficulty levels.
- Get active case without hidden solution fields.
- Discover a clue and verify content/progress.
- Request hints up to the limit and verify the next request fails.
- Accuse a valid suspect and verify result.
- Reject unknown suspect IDs and unknown cases.
- Reject result retrieval before completion.
- Reject a second accusation after completion.
- Verify server errors do not leak provider keys or stack traces.

Use a mocked Gemini service in automated tests; do not depend on live AI output for every test. Include a separate optional integration test for a configured Gemini API key.

### 13.3 Frontend Tests

- Form validation and difficulty selection.
- Loading, success, and failure states.
- Clue discovery and progress rendering.
- Hint count updates.
- Accusation confirmation and result display.
- Responsive navigation and accessible form controls.
- No client UI code expects hidden solution fields before completion.

### 13.4 Manual End-to-End Checklist

1. Open Home and start a new mystery.
2. Submit an invalid premise and verify validation.
3. Generate Easy, Medium, and Hard cases and verify exact counts.
4. Discover several clues and refresh the page; verify progress persists.
5. Use hints up to the allowed limit.
6. Submit a correct accusation and verify base points.
7. Submit an incorrect accusation in another case and verify no base points.
8. Verify clue points, hint penalties, and minimum score.
9. Try to access the result endpoint before accusing.
10. Inspect API responses and browser network traffic to confirm no culprit or solution is exposed early.
11. Try repeated requests and invalid IDs.
12. Test on mobile, tablet, and desktop.
13. Test the deployed application with production environment variables.

---

## 14. Acceptance Criteria / Definition of Done

The project is complete when all of the following are true:

- [ ] Home, Create Mystery, Investigation Room, Accusation, and Results pages exist and are connected.
- [ ] A user can create a case from a premise at Easy, Medium, and Hard difficulty.
- [ ] Each difficulty returns exactly the specified suspect, clue, and hint counts.
- [ ] Gemini is called from the backend only.
- [ ] AI output is validated before saving.
- [ ] The mystery has one intended culprit and a clue-supported explanation.
- [ ] Active case responses do not contain the culprit ID, solution, private reasoning, or answer-bearing fields.
- [ ] Clue discovery is persisted and idempotent.
- [ ] Hint requests are ordered, persisted, and limited.
- [ ] A player can submit one valid accusation.
- [ ] The backend computes the score using the documented formula.
- [ ] The results reveal the verdict, correct culprit, explanation, and score breakdown only after completion.
- [ ] Loading, validation, network, not-found, and server-error states are implemented.
- [ ] API and UI tests cover critical flows and security requirements.
- [ ] The site works at mobile, tablet, and desktop sizes.
- [ ] Secrets are not committed and the Gemini key is not present in frontend code.
- [ ] The deployed site and backend work with production configuration.
- [ ] README includes setup, environment variables, scripts, API overview, and deployment instructions.

---

## 15. Limitations and Assumptions

- Gemini output can be inconsistent; schema validation and logical checks reduce but cannot completely eliminate narrative flaws.
- Image, audio, and video generation are not guaranteed by the required stack alone. In v1, those evidence types may be represented as text descriptions/transcripts unless a separate generation provider is added.
- Without accounts, case IDs provide access to saved case progress; they do not provide full user identity or ownership protection.
- AI generation has latency, rate limits, and usage costs. Production limits and retry budgets are required.
- Scores are game scores, not a measure of real investigative skill.
- Generated cases are fictional and must not be used as evidence in real-world decisions.
- A model's claim that its mystery is logically consistent is not proof. Test cases and validation should be used to improve reliability.

---

## 16. Implementation Plan

Build incrementally in this order:

1. Initialize the repository, Vite React client, Express server, environment configuration, and MongoDB connection.
2. Define Zod schemas, Mongoose models, public DTOs, and the case state machine.
3. Implement and test scoring and clue/hint progression without Gemini.
4. Implement Gemini generation with strict structured output, validation, bounded retries, and mocked tests.
5. Build API endpoints and integration tests.
6. Build shared React layout, routes, and the Home/Create pages.
7. Build the Investigation Room and connect clue/hint APIs.
8. Build Accusation and Results pages.
9. Add error states, responsive behavior, accessibility, rate limiting, and security headers.
10. Run the acceptance checklist, deploy frontend/backend, configure environment variables, and verify the production URL.

Do not build the entire application in one untested generation. Complete and test one layer at a time.

---

## 17. Initial Setup Commands

Run from the repository root.

### Frontend

```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios
npm install -D tailwindcss @tailwindcss/vite
```

Follow the Tailwind installation instructions for the installed version, as configuration differs by major version.

### Backend

```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv mongoose @google/genai zod helmet express-rate-limit
npm install --save-dev nodemon
```

Suggested backend scripts in `server/package.json`:

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "node --test"
  }
}
```

Adjust scripts to the chosen module system and test framework. Never put `GEMINI_API_KEY` in client environment variables.

---

## 18. Spec-Driven Development Workflow

Use this document as the source of truth throughout implementation.

1. **Plan:** Convert the requirements into small tasks with requirement IDs.
2. **Design:** Define data contracts, route behavior, UI states, and security boundaries before coding.
3. **Implement:** Ask the coding assistant to implement one bounded task at a time, referencing this file.
4. **Test:** Add tests for each task and run them before moving forward.
5. **Review:** Check every change against the relevant FR/acceptance IDs and confirm no secret or solution leaks.
6. **Update spec deliberately:** If a requirement changes, update this file first or in the same change as the implementation.

Recommended instruction for an AI coding assistant:

> Read `SPEC.md` before writing code. Implement only the next requested milestone. Preserve all requirements and API contracts in the spec. Do not expose the solution before accusation. Add or update tests, run them, report the files changed and test results, and list any unresolved assumptions. Do not claim tests passed unless they were actually run.

---

**End of specification.**
