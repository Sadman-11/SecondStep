# Mistake Detective — Project Plan

> **One-liner:** A student photographs a handwritten solution. Mistake Detective finds the *first* wrong step, names the misconception behind it, and guides the student to fix it with hints, not answers.

---

## Table of contents
1. Plan
2. Architecture & Workflow
3. Front-end
4. Back-end
5. Gemini Prompts & JSON Schemas *(added)*
6. Budget & API Key Safety *(added)*
7. Testing, Deployment & Demo *(added)*
8. Risks & Fallbacks *(added)*

---

## 1. Plan

### 1.1 Problem
- Students practise math and physics alone, or with tutors who can't check every line.
- Answer apps (Photomath, ChatGPT) hand over the full solution. The student copies it and learns nothing about **where their own thinking went wrong**.
- The same mistakes keep repeating (sign errors, wrong formula, unit mistakes) because nobody points them out as a pattern.

### 1.2 Solution
Mistake Detective is a web app that:
1. Reads a **photo of a handwritten solution**.
2. Shows the student its reading of each step so they can fix any misread symbol.
3. Checks every step and marks the **first wrong step** in red.
4. Names the **misconception** (e.g. "sign error when moving a term across =").
5. Gives a **3-level hint ladder** (nudge → concept → near-answer). The corrected step is only shown if the student asks.
6. Tracks **mistake patterns** across the session ("3 sign errors today, practise this").

**Pitch line:** *"Other apps give answers. We diagnose the thinking."*

### 1.3 Scope

| In scope (MVP) | Out of scope |
|---|---|
| Algebra, quadratics, basic calculus | Diagrams, graphs, circuit drawings |
| Physics derivations (kinematics, Ohm's law, etc.) | Long proofs (10+ steps) |
| One problem per photo | Multiple problems on one page |
| English explanations (+ optional Bangla toggle) | Voice input/output |
| Session-based mistake patterns | User accounts / login |


**Rule:** deploy after every milestone. A live, slightly ugly app beats a beautiful one stuck on localhost (30% of the score is a working live product).

---

## 2. Architecture & Workflow

### 2.1 System diagram

```
┌──────────────────────────┐        ┌───────────────────────────┐        ┌──────────────┐
│  Browser (React + Vite)  │ HTTPS  │ Firebase Cloud Function   │  API   │  Gemini API  │
│  hosted on Firebase      │ ─────▶ │ /api/transcribe           │ ─────▶ │  (Flash)     │
│  Hosting                 │ ◀───── │ /api/judge                │ ◀───── │              │
│                          │  JSON  │ (holds the API key)       │  JSON  │              │
└──────────────────────────┘        └───────────────────────────┘        └──────────────┘
        │
        └── localStorage: mistake-pattern history (no server database)
```

- The **browser never sees the Gemini API key**. It only talks to our own `/api/*` endpoints.
- Firebase Hosting rewrites `/api/**` to the Cloud Function, so front-end and back-end share one domain (no CORS issues).

### 2.2 User workflow

```
[1] Upload            [2] Confirm              [3] Results                 [4] Retry
Type/photo the   ──▶  Check the steps    ──▶   ✓ ✓ ✗ step 3 marked   ──▶   Fix the step,
problem + photo       Gemini read; edit        Misconception card          re-check
the solution          any wrong symbol         Hint 1 → 2 → 3 → Reveal     Patterns panel
                                                                           updates
```

### 2.3 Data flow, step by step

1. **Upload:** the student types the problem (or photographs it) and uploads a solution photo. The browser **compresses the image** (max ~1600px, JPEG ~0.8) and converts it to base64.
2. **`POST /api/transcribe`** `{ problemText, problemImage?, solutionImage }`
   → Gemini Call 1 → `{ problem, steps: [{ n, latex, plain }], legibility }`
3. **Confirm screen:** the steps are rendered with KaTeX. Each step has an edit box. The student taps "Looks right".
4. **`POST /api/judge`** `{ problem, steps (confirmed) }`
   → Gemini Call 2 (solves the problem independently first, then compares) → verdict JSON (see Section 5).
5. **Results screen:** the step list, first error, misconception card and hint ladder. The answer stays hidden until "Reveal" is pressed.
6. **Patterns:** the misconception `category` is saved to localStorage. The panel shows counts and a practice tip.
7. **Retry:** the student edits the wrong step and re-runs `/api/judge` (no new photo needed).
8. **Dispute:** an "I think step N is correct" button re-runs `/api/judge` with a `disputeStep` field. The model re-examines that step and must explain its decision.

### 2.4 Why two Gemini calls?
- **Accuracy:** reading handwriting and judging math are different jobs. Splitting them lets the student fix misreads *before* any judgement, so we don't blame the student for our OCR mistake.
- **Trust:** the student sees exactly what the AI "read".
- **Demo value:** it shows a deliberate AI pipeline, not a single chatbot prompt.

---

## 3. Front-end

### 3.1 Tech

| Need | Choice |
|---|---|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| Math rendering | `katex` (render LaTeX strings) |
| Image compression | `browser-image-compression` (or a canvas resize) |
| State | `useReducer` in `App`. No Redux needed. |
| Storage | `localStorage` for mistake patterns |
| Routing | None: a single page with a `step` state (`upload → confirm → results`) |

### 3.2 Screens

**Screen 1: Upload**
- Text box: "Type the question" + optional "📷 Photo of question"
- Big drop zone / camera button: "📷 Photo of your solution"
- Tip line: *"Write one step per line, big and clear. Good light helps."*
- Subject chips: Math · Physics (sent as a hint to the prompt)
- "Sample problems" button: loads a prepared demo image (backup for the demo)

**Screen 2: Confirm transcript**
- Thumbnail of the photo on the left/top
- Numbered steps rendered with KaTeX. Tap ✏️ to edit the LaTeX/plain text.
- Legibility warning if Gemini says the photo is hard to read: "Some parts were hard to read, please check steps 2 and 4"
- Buttons: "Looks right, check my work" · "Retake photo"

**Screen 3: Results**
- **Verdict banner:** "Found it! Step 3 has a mistake" (or "All steps correct 🎉")
- **Step list:** ✓ green for correct, ✗ red for the first error, grey for steps after the error ("not checked: depends on step 3")
- **Misconception card:** name + 1–2 line plain explanation + category tag
- **Hint ladder:** `Hint 1` → `Hint 2` → `Hint 3` → `Show corrected step`. Each button unlocks the next.
- **Fix it:** edit box under the wrong step → "Re-check"
- **Dispute:** small link "I think this step is right"
- Language toggle: English / বাংলা (re-requests the explanation text only)

**Panel: My Mistake Patterns** (side drawer or bottom section)
- Bar list of misconception categories with counts (e.g. Sign errors ×3, Unit errors ×1)
- One practice tip for the top category
- "Clear history" button

### 3.3 Component list

```
src/
  App.jsx                 // reducer + screen switch
  api.js                  // transcribe(), judge() — fetch wrappers with timeout + retry
  lib/image.js            // compress + toBase64
  lib/patterns.js         // localStorage read/write
  components/
    UploadScreen.jsx
    ConfirmScreen.jsx
    ResultsScreen.jsx
    StepRow.jsx           // KaTeX + status icon + edit mode
    MisconceptionCard.jsx
    HintLadder.jsx
    PatternsPanel.jsx
    LoadingSteps.jsx      // animated progress messages
    MathText.jsx          // safe KaTeX render with fallback to plain text
```

### 3.4 UX details that earn the 15%
- **Loading messages that narrate the AI**, cycling every ~1.5s:
  "Reading your handwriting…" → "Solving it myself first…" → "Checking step 2…" → "Looking for the first slip…"
- **Mobile first:** students use phones. Large tap targets, camera opens directly (`<input type="file" accept="image/*" capture="environment">`).
- **Never a blank failure:** every error shows a friendly message + "Try again".
- **KaTeX fallback:** if a LaTeX string fails to render, show the plain text version instead of crashing.
- **Celebration** when the student fixes the mistake (confetti or a big ✓).
- Clean, calm colours: green = correct, red = first error, amber = hints.

---

## 4. Back-end

### 4.1 Tech

| Need | Choice |
|---|---|
| Runtime | Firebase Cloud Functions (2nd gen, Node 20) |
| Gemini SDK | `@google/genai` (official Google Gen AI SDK for JS) |
| Key storage | Firebase secret: `firebase functions:secrets:set GEMINI_API_KEY` |
| Routing | Hosting rewrite `/api/**` → function `api` |
| Database | None for MVP (patterns live in the browser) |

> **Note:** Cloud Functions requires the Firebase **Blaze** (pay-as-you-go) plan, which needs a billing card. The free usage included is far more than this project needs. If the team can't enable Blaze, use the fallback in Section 6.3.

### 4.2 Endpoints

**`POST /api/transcribe`**
```json
// request
{ "problemText": "Solve x^2 - 5x + 6 = 0", "problemImage": null, "solutionImage": "<base64>", "subject": "math" }
// response
{ "problem": "...", "steps": [{ "n": 1, "latex": "...", "plain": "..." }], "legibility": "good|partial|poor", "unclearSteps": [2] }
```

**`POST /api/judge`**
```json
// request
{ "problem": "...", "steps": [...], "subject": "math", "language": "en|bn", "disputeStep": null }
// response: see schema in Section 5.2
```

### 4.3 Function logic (pseudocode)

```
api(req):
  if method != POST → 405
  validate body (required fields, image ≤ 4 MB, steps ≤ 15)   → 400 on failure
  rate-limit: max ~20 requests / minute / IP (in-memory map)  → 429
  route:
    /transcribe → callGemini(TRANSCRIBE_PROMPT, schema=TranscribeSchema, parts=[text, images])
    /judge      → callGemini(JUDGE_PROMPT, schema=JudgeSchema, parts=[problem + steps as text])
  parse JSON → validate required keys → return 200
  on Gemini error/timeout → retry once → else 502 with friendly message
```

### 4.4 Gemini call settings

| Setting | Transcribe (Call 1) | Judge (Call 2) |
|---|---|---|
| Model | Gemini **Flash** (e.g. `gemini-2.5-flash`) | Same Flash model; try a newer Flash only if accuracy is weak and budget allows |
| `temperature` | 0 | 0.2 |
| `responseMimeType` | `application/json` | `application/json` |
| `responseSchema` | TranscribeSchema | JudgeSchema |
| Thinking | Off / minimal (it's just reading) | On, with a capped thinking budget (it needs to reason) |
| `maxOutputTokens` | ~1,000 | ~2,000 |

Check the exact current model names in Google AI Studio on the day. Names change often.

---

## 5. Gemini Prompts & JSON Schemas

> The guidelines say no pre-written **code**. These are written specs. Confirm with the organizers that bringing a plan/notes is allowed, then type the prompts in fresh at the venue.

### 5.1 Call 1: Transcribe

**System instruction:**
```
You are a careful transcriber of handwritten math and physics solutions.
Read the solution image and split it into numbered steps, one per line of working.
Rules:
- Transcribe EXACTLY what the student wrote, including their mistakes. Never correct anything.
- Give each step as LaTeX and as plain text.
- If a symbol is unclear, give your best reading and list that step in unclearSteps.
- Rate overall legibility as good, partial, or poor.
- If a problem image is given, transcribe the problem too; otherwise use the typed problem.
Return only JSON matching the schema.
```

**TranscribeSchema:**
```json
{
  "type": "object",
  "properties": {
    "problem":      { "type": "string" },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "n":     { "type": "integer" },
          "latex": { "type": "string" },
          "plain": { "type": "string" }
        },
        "required": ["n", "latex", "plain"]
      }
    },
    "legibility":   { "type": "string", "enum": ["good", "partial", "poor"] },
    "unclearSteps": { "type": "array", "items": { "type": "integer" } }
  },
  "required": ["problem", "steps", "legibility", "unclearSteps"]
}
```

### 5.2 Call 2: Judge

**System instruction:**
```
You are a patient math and physics tutor. You diagnose a student's working; you do NOT just give answers.
Process:
1. Solve the problem yourself first, privately, step by step.
2. Check the student's steps in order. A step is "correct" if it follows validly from the previous step,
   even if it differs from your method. Different valid methods are NOT errors.
3. Find the FIRST step that is mathematically wrong. Mark later steps "not_checked".
4. Name the misconception in a short phrase and pick a category from the enum.
5. Write 3 hints, from gentle to strong:
   - hint1: only point to where to look.
   - hint2: name the concept or rule involved.
   - hint3: almost the fix, but still let the student do the final step.
   Hints must NEVER contain the corrected step or the final answer.
6. Put the corrected step only in correctedStep.
7. If disputeStep is given, re-examine that step carefully and explain your final decision in disputeNote.
8. If all steps are correct, set firstErrorStep to null and praise briefly.
Write explanations and hints in the requested language (en = English, bn = simple Bangla). Keep math in LaTeX.
Be kind and short. Students are learning.
Return only JSON matching the schema.
```

**JudgeSchema:**
```json
{
  "type": "object",
  "properties": {
    "allCorrect":     { "type": "boolean" },
    "firstErrorStep": { "type": "integer", "nullable": true },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "n":      { "type": "integer" },
          "status": { "type": "string", "enum": ["correct", "error", "not_checked", "unclear"] },
          "reason": { "type": "string" }
        },
        "required": ["n", "status", "reason"]
      }
    },
    "misconception": {
      "type": "object",
      "properties": {
        "name":        { "type": "string" },
        "explanation": { "type": "string" },
        "category":    { "type": "string", "enum": [
          "sign_error", "arithmetic_slip", "wrong_formula", "algebra_rule",
          "unit_error", "concept_misunderstanding", "copying_error", "other" ] }
      },
      "required": ["name", "explanation", "category"]
    },
    "hints": {
      "type": "object",
      "properties": {
        "hint1": { "type": "string" },
        "hint2": { "type": "string" },
        "hint3": { "type": "string" }
      },
      "required": ["hint1", "hint2", "hint3"]
    },
    "correctedStep": { "type": "string", "description": "LaTeX of the fixed step" },
    "finalAnswer":   { "type": "string" },
    "confidence":    { "type": "string", "enum": ["high", "medium", "low"] },
    "praise":        { "type": "string" },
    "disputeNote":   { "type": "string" }
  },
  "required": ["allCorrect", "firstErrorStep", "steps", "confidence"]
}
```

**Front-end rule:** `correctedStep` and `finalAnswer` are never rendered until the student presses "Show corrected step".

---

## 6. Budget & API Key Safety ($5 key)

### 6.1 Cost estimate
Rough prices for `gemini-2.5-flash`: about **$0.30 per 1M input tokens** and **$2.50 per 1M output tokens**. Newer Flash models cost more (e.g. Gemini 3.5 Flash is listed around $1.50 in / $9.00 out). Check AI Studio on the day.

| Per full check (Call 1 + Call 2) | Estimate |
|---|---|
| Input (2 images + prompts + steps) | ~4,000 tokens |
| Output (JSON + thinking) | ~2,500 tokens |
| Cost on 2.5 Flash | ≈ $0.0012 + $0.0063 ≈ **$0.008** |
| **Checks per $5** | **≈ 600** |
| Same on a pricier Flash (~$1.50 / $9.00) | ≈ $0.03 per check → **≈ 170 checks** |

Enough for testing and the demo, **but only if the key is protected**. A leaked key can be drained in minutes.

### 6.2 Rules
- 🔒 The key lives **only** in the Firebase secret. Never in front-end code, never in `.env` files committed to Git, never pasted in a public chat.
- Cap thinking tokens and `maxOutputTokens` (Section 4.4).
- Compress images before sending (fewer tokens, faster).
- Rate-limit the function (Section 4.3).
- During development, test with **text-only** steps where possible (skip the image call).
- Check usage in Google AI Studio after each hour.

### 6.3 Fallback if Blaze plan isn't possible
Call Gemini directly from the browser **only** with an API key restricted in Google Cloud Console:
- **Application restriction:** HTTP referrers → `https://<your-project>.web.app/*` and `http://localhost:5173/*`
- **API restriction:** Generative Language API only
- Remove the localhost referrer before the demo, and rotate/delete the key after the event.

This is weaker than a backend, so prefer Cloud Functions.

---

## 7. Testing, Deployment & Demo

### 7.1 Test samples (prepare in the first hour, on paper)
Each teammate writes these by hand and photographs them:

| # | Problem | Planted mistake | Expected |
|---|---|---|---|
| 1 | Solve x² − 5x + 6 = 0 | Factorises as (x+2)(x+3) | Error at factorising step, `sign_error` |
| 2 | Solve 3x + 7 = 1 | Moves 7 without changing sign | `sign_error` |
| 3 | d/dx (x³ sin x) | Forgets product rule | `wrong_formula` |
| 4 | v = u + at, find t (u=5, v=25, a=4) | Divides wrong | `arithmetic_slip` |
| 5 | Ohm's law, find current (V=12 V, R=4 kΩ) | Ignores the k | `unit_error` |
| 6 | Any correct solution | None | `allCorrect: true` |
| 7 | Correct, but a **different valid method** | None | Must NOT be flagged |

Samples 6 and 7 are the most important: they prove we don't give false alarms.

### 7.2 Deployment checklist
```
npm create vite@latest mistake-detective -- --template react
firebase init hosting functions      # public dir: dist, single-page app: yes
firebase functions:secrets:set GEMINI_API_KEY
# firebase.json → hosting.rewrites: { "source": "/api/**", "function": "api" }
npm run build && firebase deploy
```
- [ ] Live URL opens on a phone
- [ ] Camera upload works on the phone (needs HTTPS, which Firebase provides)
- [ ] All 7 samples behave as expected on the **live** URL, not just localhost
- [ ] Key not visible in browser DevTools → Network / Sources


---
