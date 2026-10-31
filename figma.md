# Figma Make prompt — SecondStep

Paste everything below the line into Figma Make. It describes the full SecondStep design: layout, exact colors, type, copy, every interactive state, and responsive behavior.

---

## Build this

Build **SecondStep**, a single-page, friendly algebra helper for kids (ages ~11–15). A learner types their linear equation and the steps they tried, or uploads/snaps a photo of their notebook. A "math buddy" checks each step, celebrates what's right, highlights the **first** wrong step, and reveals **one small hint at a time**. Then the learner tries a follow-up practice problem ("victory lap").

Tone: warm, calm, encouraging, never judgmental. No red Xs, no grades. It should feel like a cozy paper notebook: cream paper cards, soft pastel accents, chunky rounded corners, a slight hand-made tilt on badges and icons.

Use **React + plain CSS** (one stylesheet, class names, no Tailwind utility soup). Make the page fully interactive with local state and mock data (no real API).

---

## Design tokens

### Fonts
- UI: **Nunito** (400, 600, 700, 800, 900) — headings use 800.
- Math/code: **DM Mono** (400, 500) — every equation, input, step line and code chip.

### Colors
| Token | Hex | Use |
|---|---|---|
| ink | `#2f3043` | main text |
| muted | `#737586` | secondary text |
| page bg | `#fff9ef` | body (cream) |
| paper | `#fffefa` | card background |
| card border | `#e8dcc2` | 2px borders on cards |
| dashed rule | `#e8dfcb` | 2px dashed dividers |
| input border | `#d9cebb` | inputs/textarea |
| tray | `#f4f1eb` / border `#e3dac7` | segmented tab tray |
| green brand | `#31ae88` (logo), text `#279878`, deep `#276849` | brand, success |
| green soft | `#dcf5e3`, border `#9fd9b5` | status pills |
| purple | `#8058d4` (worksheet accent + primary button), text `#5733a6`, focus `#8d69d5`, soft `#f1ebfc` | worksheet, buttons, chips |
| orange | `#d57600` (follow-up accent), soft `#fff7e9`, line `#f5a849`, text `#965312` | "take another look" states |
| red soft | `#fff0ec`, line `#f3b4a4`, text `#9b3d25` | errors only (gentle) |
| logo yellow | `#ffce57` | logo accents, camera frame corners |

### Shape and depth
- Cards: `2px solid #e8dcc2`, `box-shadow: 0 6px 0 rgba(79,63,35,.045)` (a flat "paper lift" shadow, no blur).
- Radii: hero 30px, panels 24px, features 22px, follow-up 20px, progress 18px, inputs 14px, chips 13px, pills 999px.
- **Colored top border** on key cards (thicker top edge): worksheet 7px `#8058d4`, buddy panel 7px `#43b58a`, follow-up 5px `#d57600`, feature cards 6px (green `#4bb98b`, orange `#f4a05e`, purple `#8052c6`).
- Body background: cream with two soft circles — `radial-gradient(circle at 4% 9%, rgba(255,205,95,.18) 0 90px, transparent 91px), radial-gradient(circle at 96% 18%, rgba(78,196,156,.15) 0 125px, transparent 126px), #fff9ef`.
- Small playful tilts: eyebrow pill `rotate(-1deg)`, logo `rotate(-2deg)`, feature icon tiles `rotate(-3deg)`, "You've got this!" bubble `rotate(3deg)`.

---

## Page structure (top to bottom, max-width 1162px, centered, 8px side padding)

### 1. Top bar (full width, 63px tall)
- Background `rgba(255,253,248,.88)`, bottom border `1px #ded6c4`.
- Left: logo (42px) + wordmark "Second**Step**" (Nunito 800, 21px, −0.5px tracking; "Step" in `#279878`).
- Right: pill badge "Your friendly math buddy" (green soft pill: bg `#dcf5e3`, border `#9fd9b5`, text `#276849`, 13px/700).

**Logo SVG (use exactly):**
```svg
<svg viewBox="0 0 48 48"><rect fill="#31AE88" height="44" rx="14" width="44" x="2" y="2"/><path d="M14 17.2c.9-4.6 4.6-7.2 9.9-7.2 5.7 0 9.6 3.1 9.6 7.7 0 4.1-2.7 6.6-7.4 9.8l-5.6 3.8h8.1v-3.1h5.2v7.3h-20v-4.1l9.2-6.8c3.6-2.7 5.2-4.3 5.2-6.4 0-2-1.7-3.3-4.3-3.3-2.5 0-4.2 1.3-4.8 3.8L14 17.2Z" fill="#FFFEF8"/><path d="M28.6 35.5h5.2v-4.2h4.8v8.4h-10Z" fill="#FFCE57"/><circle cx="38.6" cy="27.9" fill="#FFCE57" r="2.5"/></svg>
```
Give it `filter: drop-shadow(0 4px 3px rgba(36,156,125,.18))` and `rotate(-2deg)`.

### 2. Hero card (min-height 306px, radius 30px, padding 24px 28px)
- Background: `radial-gradient(circle at 76% 24%, rgba(255,205,105,.17) 0 85px, transparent 86px), linear-gradient(120deg,#fffefa 0%,#fffaf5 56%,#f3fff7 100%)`.
- Left column (~61% width):
  - Eyebrow pill: "Math practice, minus the stress!" — bg `#ffe9dc`, text `#9b4d35`, 13px/800, tilted −1°.
  - H1 (34px/800, line-height 1.16, −0.7px): "Every mistake helps your / math brain grow." (line break after "your" on desktop).
  - Paragraph (16px, `#66697b`, line-height 1.62): "Show us your algebra problem and what you tried. We'll celebrate the parts you nailed, spot the tricky bit, and help you take the next step."
  - Three benefit pills (13px/700, 8px 14px padding): 🌱 "Tiny hints, one at a time" (bg `#def4df`, text `#285f40`), 📷 "Snap your notebook" (bg `#ffeadf`, text `#7b4938`), ✨ "No grades. No pressure." (bg `#f0e8fb`, text `#6039ad`).
- Right: notebook illustration (330×220) with a speech-bubble badge "You've got this!" overlapping its top-right corner (white, 2px border `#3ba981`, radius `16px 16px 16px 3px`, text `#27765b` 12px/800, rotated 3°).

**Notebook illustration (SVG, 330×220):** mint rounded backdrop `#e4f7eb` (rx 30); pale-yellow circle top-left `#fff0a9`, mint circle bottom-right `#d5f5df`; a cream spiral notebook (`#fffdfa`, stroke `#d8c9b6`, rx 18) with a grey offset shadow card behind it; five coral spiral rings (`#f17957`) down the left edge. On the page, in DM Mono:
  - Title line "2(x + 3) = 14" with an orange underline `#ffae72`.
  - Row 1 — green box (`#effaef`, stroke `#70c987`) with a green check circle `#4ab968`: "2x + 6 = 14".
  - Row 2 — amber box (`#fff7e9`, stroke `#f5a849`) with an orange "?" circle `#f6a64c`: "2x = 8  (Hint!)".
  - Row 3 — lilac box (`#f4efff`, stroke `#8b5bd0`) with a purple "★" circle `#8251c9`: "x = 4 You got it!" in purple `#562ba4`.
  - An orange pencil (`#f39a54`, pink eraser `#f3b0bf`, outlined `#313145`) tilted 22° on the right, and a small coral flower pot (`#f36f4d`) with two green leaves (`#36ab70`) bottom-right.

### 3. Progress bar (62px tall, radius 18px)
Three steps separated by 60px × 1px lines (`#ddd3bd`), gap `clamp(30px, 8vw, 100px)`:
1. "Show your work" 2. "Get a helpful hint" 3. "Try it again".

Each step: a 31px number circle + label (14px/700).
- Upcoming: circle bg `#f7f5ef`, border `#d8d0c3`, text `#7c7d87`.
- **Active:** circle bg `#e9f8ec`, border `#35ad6d`, number `#167949`, label `#323347`.
- **Complete:** solid green circle `#35ad6d` with a white check icon.
The active step moves 1 → 2 after a check, → 3 when the practice is shown; step 3 completes when the practice is answered correctly.

### 4. Workspace — two equal columns, 24px gap

#### Left panel: "Your math space" (worksheet)
Radius 24px, top border 7px purple, background `linear-gradient(#fffefa,#fdfaff)`, padding 24px 26px, min-height 510px.
- Heading row (with 2px dashed bottom rule): H2 "Your math space" (22px/800) + sub "Pop in your problem and show us what you tried." (14.5px muted). Right: **Clear** button (↶ icon + "Clear", bg `#f3f0ea`, text `#6e7180`, 13px/700, radius 11px).
- **Segmented tabs** (3 equal columns, tray bg `#f4f1eb`, 2px border `#e3dac7`, radius 14px, 5px padding): ✏️ "Type lines", ⬆️ "Upload image", 📷 "Camera". Selected tab: white bg, purple text `#5733a6`, 2px outline `#b899ee`, tiny shadow. Hover lifts 1px.
- Kicker "NOT SURE WHERE TO START? TRY ONE!" (11px/800, `#6a539b`, letter-spacing .7px).
- **Sample chips** (wrap): "Distribution `2(x + 3) = 14`", "Negative Signs `-3(x - 2) = 12`", "Balancing Equations `4x + 5 = 21`". Chip: 2px border `#e5dcc9`, radius 13px, 13px/700; the equation sits in a small DM Mono code tag (bg `#f1ebfc`, text `#5c35b2`, 11px). Hover lifts 2px + purple border; selected chip gets purple border and `#faf6ff` fill. Clicking loads the problem and three example steps that contain a deliberate mistake (e.g. `2x + 3 = 14 / 2x = 11 / x = 5.5`).
- 2px dashed divider.
- Label row "Your problem" + green pill "Linear equation" (pill bg `#dcf3df`, text `#286545`, 11px/800). Input below (DM Mono 14px, 2px border `#d9cebb`, radius 14px, padding 14px 15px, placeholder "e.g. 2(x + 3) = 14"). Focus: border `#8d69d5` + 3px ring `#eee6ff`.
- Label row "What did you try?" + pill "One line at a time". Textarea (min-height 104px, line-height 1.8, placeholder three lines: `2x + 6 = 14`, `2x = 8`, `x = 4`). Under it: "Put each step on its own line." (left, 12px muted) and a live counter "3 / 30 lines" (right, DM Mono 12px).
- Inline validation (gentle red text `#b4432a`, 13px/700) if a field is empty on submit.
- **Primary button**, full width: "Review my steps →" — bg `#8058d4`, white 14.5px/800, radius 14px, 46px tall, chunky flat shadow `0 4px 0 #5b36ad`; hover lifts 1px; pressed sinks 2px. Loading label: "Checking your steps…" (disabled, lighter purple).

**Upload tab:** a dashed dropzone (2px dashed `#cbb7ef`, bg `#fdfaff`, radius 18px, ~230px tall) with a tilted lilac icon tile (upload icon), "**Choose a photo** or drop it here" and "JPEG, PNG or WebP · one algebra problem per photo". Drag-over: solid purple border, `#f7f1ff`, scale 1.01. After choosing: image preview in a tray-colored frame, a toolbar of text buttons (Rotate 90°, Replace, Remove in red), an optional "Your problem" input with pill "Optional if it's in the photo", and a full-width primary button "Read my solution →" (loading: spinner + "Reading your handwriting…").

**Camera tab:** a card with header "Point camera at your worked math" + close ✕; a dark 4:3 live viewfinder with four rounded **yellow `#ffce57` corner brackets** and a dark pill hint "Fit problem & steps inside the frame"; below: primary "📷 Capture photo" + secondary "Cancel". Errors (permission denied etc.) show as a soft red banner with a "Use upload or type instead" button.

**"Did we read it right?" (after reading a photo):** panel title changes to "Did we read it right?" / "Check our reading against your photo, fix anything that looks off, then we'll check it." Show "YOUR PHOTO" thumbnail with a "Replace image" text button, then an editable "Your problem" input (pill "Editable") and "What we read" — a list of editable step rows: a small number circle, a DM Mono input, and a ✕ remove button; "+ Add line" text button. Unclear characters are marked `[unclear]`; those rows get an amber border and an amber banner "Ambiguous characters are marked [unclear]. Edit those lines before checking." Actions: full-width primary "Looks right — review my steps →" and a centered text button "✏️ Edit as typed lines".

#### Right panel: "Your math buddy" (inspection)
Same panel styling, top border 7px green `#43b58a`, background `linear-gradient(#fffefa,#f8fffa)`.
- Heading: H2 "Your math buddy" + sub "Let's check each step together." Right: status pill that changes per state: "Ready when you are" (green) → "Checking…" (lilac) → "All checked!" (green) / "Hmm, a hiccup" (soft red).

**Empty state** (padding-top 47px):
- "Buddy" illustration, 154×88, mint `#e5f7e9` tile, radius 28px, flat shadow `0 5px 0 #d2edda`, gently **floating** (3s ease-in-out up/down 5px with ±1° rotation). Inside: a yellow `#fff2a8` round face (43px, 2px teal `#18a795` border) with two dot eyes and a ⌣ smile, and three stacked pill lines (green outline 58px, orange outline 48px, filled lilac 55px).
- A placeholder "ledger": tray box `#f2eee8` with two empty white rows, left borders grey-green and amber.
- "Your math buddy is ready!" (15.5px/800) + "Type your steps or add a photo. We'll cheer for what's working and give you a small hint if you get stuck." (13.5px muted).

**Loading:** centered 34px spinner (mint track, green top) + "Checking each step…" + "Your buddy is looking at every line, one at a time."

**Error:** centered tilted peach tile with "!" + "We couldn't finish the check" + friendly message + secondary button "↻ Try again". The learner's work is never cleared on error.

**Result** (fades in, 0.25s):
- **Outcome banner** (radius 16px, 2px border, round 30px icon):
  - Mistake found: amber (`#fff7e9` / `#f5a849`, icon "!" on `#f6a64c`) — "Let's take another look at step 1" + one-sentence explanation.
  - All correct: green (`#effaef` / `#70c987`, icon "✓" on `#4ab968`) — "No mistake found in these steps".
  - Not enough work / unsupported: lilac (`#f6f1ff` / `#c9b3ef`, icon "i" on `#8251c9`).
- "YOUR STEPS" kicker + text button "✏️ Fix line 1" (jumps focus to that line).
- **Check list**: tray box `#f2eee8`, each step a white row with a 3px left border, small grey number, DM Mono step text and a right-aligned tag:
  - correct: green border `#328c69`, tag "✓ Looks good";
  - first mistake: amber border `#e78712`, bg `#fffaf0`, tag "💡 Take another look" in `#965312`;
  - after the mistake: grey border, faded text, tag "Comes after line 1".
- Concept pills: e.g. green "Distributing across parentheses" + peach "Distribution".
- **Hint card(s)**: lilac (`#f8f4ff`, 2px `#ddcdf6`, radius 16px) with a tilted lightbulb tile, title "Here's a hint" (or "Hint 1 of 3"), and the hint text. A secondary button "Show hint 2 of 3" reveals the next hint (one at a time).
- Collapsible "See the full worked solution ›" (chevron rotates 90° when open) revealing a numbered DM Mono solution.
- Green pill link "Take your victory lap →" that scrolls to the practice card.

### 5. Follow-up card: "Your victory lap"
Radius 20px, top border 5px orange `#d57600`, background `linear-gradient(100deg,#fffefa,#fff9ed)`, padding 20px 22px.
- Left: kicker "FOLLOW-UP VERIFICATION" (11px/800, `#625895`, 1px tracking), H2 "Your victory lap" (16px/800), text "After your check, you'll get one quick problem to prove you've got it."
- Right (locked state): a grey DM Mono placeholder box "Complete a step check above to generate" (bg `#f3f0e9`, border `#e2d9c8`, 11px).
- Unlocked: dashed divider, then the question in DM Mono 15px (e.g. "Which is the correct expansion of 3(x + 2) = 18?"), four answer cards in a 2×2 grid (radio + DM Mono text, 2px `#e5dcc9` border, radius 13px; checked = purple border `#b899ee` + `#faf6ff`), and a primary "Check my answer →" button (disabled until a choice is made).
  - Wrong: amber feedback box "Not quite — you're close!" + explanation; the button becomes "Pick another answer".
  - Right: green feedback box "🎉 Practice check passed!" + explanation, and a secondary "Start a new problem →" button. The progress bar's step 3 turns complete.

### 6. Feature cards (3 columns, 19px gap)
Each: radius 22px, 6px colored top border, a 44px tilted icon tile + title (16px/800) + text (14.5px `#686b7d`). Hover: lift 4px, rotate −0.25°.
1. Green — "T" type icon — **Write it or snap it** — "Type your work or take a quick picture of your notebook. Both work great!"
2. Orange — magnifier — **Find the tiny slip** — "No big red Xs here. We'll show you exactly where things got a little wobbly."
3. Purple — lightbulb — **Unlock gentle hints** — "Get one bite-sized clue at a time, so you still get the "I did it!" feeling."

### 7. Footer card
Radius 26px, 2px border `#d8e8db`, background `linear-gradient(125deg,#f5fff8 0%,#fffefa 56%,#fff8eb 100%)`, a giant faint watermark "2 + 2 = 4" in DM Mono 44px/800 (`rgba(49,174,136,.07)`, rotated −4°) at the top-right.
- Three columns (1.45fr / .7fr / 1fr):
  - Logo + wordmark; "Small hints. Big "aha!" moments. / A calmer way for kids to practice algebra."; green pill "🌱 Keep growing, one step at a time."
  - "Explore" links: Start practicing, How it works, Why SecondStep? (hover → green, slide right 3px).
  - "Safe space for learning" box (white 70%, border `#bee2c9`, radius 17px) with a green shield-shaped ✓ badge: "No accounts, no grades, and no pressure. Your work stays in this session."
- Bottom strip (top border `#dce8dc`, 11px muted): "© 2026 SecondStep" · "Made with patience for growing math brains." · DM Mono purple `2x + courage = you've got this!`

---

## Icons
Simple 20×20 line icons, `stroke: currentColor`, 1.7px stroke, round caps/joins: pencil, upload (arrow up into tray), camera, check, lightbulb, magnifier (search), "T" type, plus reset (↶), chevron, rotate, trash, alert-circle, close ✕, arrow →.

## Responsive
- **≤ 1000px:** progress gaps shrink to 20px, connector lines 32px.
- **≤ 800px:** hide the notebook illustration; the workspace becomes **one column**; panels lose min-height; progress shows only the number circles plus the active step's label; feature cards stack; follow-up locked box goes full width under the text; footer becomes 2 columns with the safety box spanning both.
- **≤ 560px:** H1 29px; top bar padding 14px, smaller logo/badge; mode tabs show **icons only** (labels visually hidden but still read by screen readers); sample chips go full width with the label left and the code tag right; practice answers stack to one column; footer single column, bottom strip centered and stacked; hide the watermark.
- **≤ 380px:** hide the header badge; tighten progress spacing. No horizontal scrolling at any width down to 320px.

## Accessibility and motion
- Visible focus ring: 3px `#8d69d5`, 2px offset.
- "Skip to learning workspace" link, hidden until focused.
- Segmented tabs use `role="tablist"` / `aria-selected`; sample chips use `aria-pressed`.
- A visually hidden live region announces status ("Distribution example loaded…", "Reviewing your steps…", "Hint 2 revealed.").
- After a check, move focus to the "Your math buddy" heading.
- `prefers-reduced-motion`: turn off the floating buddy, spinner spin, fade-ins and hover lifts.
- Never render learner text as HTML.
