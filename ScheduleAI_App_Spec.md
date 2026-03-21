# ScheduleAI — Complete App Specification
## For Claude Code: Build this app end to end

---

## 1. What This App Is

A mobile-first web app (PWA) that:
1. Accepts a document (PDF or DOCX) describing a structured practice plan
2. Uses an LLM (Claude API) to parse the document and extract a structured weekly schedule with named steps, durations, and instructions
3. Presents each day as a guided session with timers, voice instructions, and chime sounds
4. Sends daily push notifications reminding the user to do their session
5. Lets the user customise everything: schedule, step order, durations, voice, sounds, notification time

The reference implementation is `bates_timer.html` — a working single-file prototype of the session timer. This spec describes the full app version of that prototype.

---

## 2. Tech Stack (chosen for simplicity + zero hosting cost)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite | Fast, component-based, easy PWA setup |
| Styling | Tailwind CSS | Utility-first, no custom CSS files needed |
| State | Zustand | Lightweight, persists to localStorage |
| LLM parsing | Anthropic Claude API (claude-sonnet-4-5) | Extracts schedule from uploaded doc |
| PDF parsing | pdf.js (client-side) | No server needed for PDF text extraction |
| DOCX parsing | mammoth.js (client-side) | Extracts text from .docx client-side |
| Push notifications | Web Push API + Service Worker | Built into browsers, works on mobile |
| Storage | localStorage + IndexedDB | All data stays on device, no backend |
| Hosting | Netlify (free tier) | Drag and drop deploy, free HTTPS |
| Backend | None | Fully client-side except Claude API calls |

**No database. No auth. No server. Everything runs in the browser.**

The only external call is to the Anthropic Claude API for document parsing — the user provides their own API key in settings.

---

## 3. File Structure

```
scheduleai/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker for notifications + offline
├── src/
│   ├── main.jsx               # Entry point
│   ├── App.jsx                # Root component + routing
│   ├── store/
│   │   └── useStore.js        # Zustand store — all app state
│   ├── pages/
│   │   ├── Home.jsx           # Landing / upload doc page
│   │   ├── Schedule.jsx       # Weekly schedule overview
│   │   ├── Session.jsx        # Active session timer page
│   │   └── Settings.jsx       # All customisation settings
│   ├── components/
│   │   ├── DocUploader.jsx    # Drag-drop file upload + parsing trigger
│   │   ├── DayCard.jsx        # Card for each day in schedule overview
│   │   ├── StepCard.jsx       # Single step display in session
│   │   ├── TimerRing.jsx      # SVG countdown ring
│   │   ├── StepList.jsx       # Scrollable step list sidebar
│   │   ├── SoundEngine.jsx    # Web Audio API chimes (no files needed)
│   │   ├── VoiceEngine.jsx    # Web Speech API TTS
│   │   └── NotifScheduler.jsx # Push notification setup + scheduling
│   ├── lib/
│   │   ├── parseDoc.js        # PDF + DOCX text extraction
│   │   ├── claudeParser.js    # Send text to Claude API, get schedule JSON
│   │   ├── sounds.js          # All Web Audio tone generators
│   │   └── tts.js             # All TTS functions
│   └── styles/
│       └── index.css          # Tailwind base only
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 4. Data Model

Everything stored in localStorage via Zustand persist.

```javascript
// Full app state shape
{
  // The parsed schedule — populated after doc upload + Claude parsing
  schedule: {
    title: "Bates Method Weekly Plan",
    description: "...",
    days: [
      {
        id: "monday",
        name: "Monday",
        subtitle: "Foundation",
        theme: "Foundation Day — Reset & Baseline",
        totalMinutes: 45,
        steps: [
          {
            id: "mon-1",
            title: "Deep breathing",
            durationMinutes: 5,
            type: "active",          // "active" | "rest" | "evening"
            instructions: "Separate teeth, lips closed. Breathe in slowly...",
            source: "Jan 1923 (Breathing)"  // optional citation
          },
          // ... more steps
        ]
      },
      // ... 6 more days
    ]
  },

  // Session state — reset each time a session starts
  session: {
    dayId: null,               // which day is active
    currentStepIndex: 0,
    running: false,
    timeLeft: 0,               // seconds
    totalTime: 0,              // seconds for current step
    startedAt: null,           // timestamp
  },

  // User settings
  settings: {
    apiKey: "",                // Anthropic API key — stored locally only
    notifications: {
      enabled: false,
      time: "08:00",           // HH:MM — daily reminder time
      days: ["mon","tue","wed","thu","fri","sat","sun"], // which days to remind
      message: "Time for your eye exercises 👁"
    },
    voice: {
      enabled: true,
      voiceName: "",           // selected voice name
      rate: 0.92,
      pitch: 1.0,
      autoRead: true,          // auto-read instructions when step starts
    },
    sounds: {
      enabled: true,
      volume: 0.8,
    },
    display: {
      theme: "light",          // "light" | "dark"
      keepScreenOn: true,      // Wake Lock API — prevent phone sleep during session
    }
  },

  // Logs — one entry per completed session
  log: [
    {
      date: "2026-03-21",
      dayId: "monday",
      completedSteps: 6,
      totalSteps: 6,
      durationMinutes: 45,
      notes: ""                // optional user note after session
    }
  ],

  // Actions (Zustand)
  setSchedule: (schedule) => {},
  updateStep: (dayId, stepId, changes) => {},
  addStep: (dayId, step) => {},
  removeStep: (dayId, stepId) => {},
  reorderSteps: (dayId, newOrder) => {},
  startSession: (dayId) => {},
  setSessionStep: (index) => {},
  tickSession: () => {},
  pauseSession: () => {},
  resumeSession: () => {},
  completeSession: (notes) => {},
  updateSettings: (path, value) => {},
  addLog: (entry) => {},
}
```

---

## 5. Page-by-Page Spec

### 5.1 Home Page (`/`)

**State A — No schedule uploaded yet:**
- Large centered upload area: drag-drop zone + "Choose file" button
- Accepts `.pdf` and `.docx` only
- Below the upload zone: text "Or paste your API key to get started" with a small input
- A "Try demo" button that loads the built-in Bates Method schedule (hardcode the full schedule from the reference implementation as a JSON constant — so the app works even without uploading a doc)

**State B — Parsing in progress:**
- Show a loading spinner with text: "Reading your document..." → "Extracting schedule with Claude..." → "Building your plan..."
- Use a streaming-style typewriter effect on the status text

**State C — Schedule loaded:**
- Redirect to `/schedule` automatically

**Upload flow:**
1. User drops/selects file
2. `parseDoc.js` extracts raw text from PDF or DOCX client-side
3. Raw text is sent to `claudeParser.js` which calls Claude API
4. Claude returns a structured JSON matching the schedule data model
5. JSON is validated — if invalid, show error with "Try again" button
6. If valid, save to store and redirect to `/schedule`

---

### 5.2 Schedule Page (`/schedule`)

**Layout:**
- Header: schedule title + "Edit" button + settings icon
- 7 day cards in a vertical list (mobile) or 2-column grid (desktop)
- Each `DayCard` shows:
  - Day name + subtitle
  - Total duration (e.g. "45 min")
  - Number of steps
  - A progress indicator showing if today's session was completed (check the log)
  - "Start Session" button — navigates to `/session/:dayId`
  - A subtle highlight on today's day of the week
- Bottom nav bar: Home · Schedule · Log · Settings

**Edit mode:**
- Tap "Edit" to enter edit mode
- Each day card expands to show all steps
- Each step has: drag handle (reorder) · edit pencil · delete X
- "Add step" button at bottom of each day
- Step editor is an inline form: title, duration (number input), type dropdown (active/rest/evening), instructions (textarea), source (optional text)
- Changes save to store immediately (no save button — auto-save)

---

### 5.3 Session Page (`/session/:dayId`)

This is the main timer page. Reference the working `bates_timer.html` for exact behaviour — replicate it faithfully in React components.

**Layout (mobile-first):**
```
┌─────────────────────────────┐
│  ← Back    Monday - Step 2/6│  ← Header
│  ████████░░░░░░░░░░░░░░░░░ │  ← Progress bar
├─────────────────────────────┤
│  ACTIVE                     │  ← Type badge
│  Deep breathing             │  ← Step title    ▶ Listen
│                             │
│  Separate teeth, lips       │  ← Instructions
│  closed. Breathe in...      │
│                             │
│  📖 Jan 1923 (Breathing)    │  ← Source
├─────────────────────────────┤
│         ┌──────┐            │
│         │ 4:32 │  ← Ring   │
│         └──────┘            │
│      5 min exercise         │
│                             │
│  ← Back  [  Start  ]  Skip→│
└─────────────────────────────┘
│  Step list (scrollable)     │
│  1. ✓ Deep breathing  5min  │
│  2. ● Dream palming  10min  │ ← current
│  3.   Snellen card   10min  │
└─────────────────────────────┘
```

**Behaviour:**
- Start button starts countdown
- Timer ring depletes clockwise as time runs
- Ring colour: brown/amber for active, green for rest, purple for evening
- Ring turns red when ≤ 30 seconds
- At 30 seconds: tick sound plays
- At 0: bowl chime plays → 1.5s pause → auto-advance to next step
- New step: chime plays (active) or descending tones (rest) → voice reads instructions after 800ms delay if voice enabled
- "Listen" button re-reads instructions on demand
- Pause stops timer and pauses voice
- Back/Skip stop voice and jump steps
- Step list items are tappable to jump directly
- On final step complete: session done screen with summary + option to add a note + plays deep bell

**Wake Lock:**
- Request `navigator.wakeLock.request('screen')` when session starts
- Release on session end, pause, or page exit

**Session done screen:**
- "Session complete ✓"
- Summary: X steps · Y minutes
- Text area: "Add a note about today's session" (optional)
- "Save & finish" button → logs session, navigates back to schedule
- Voice reads a completion message

---

### 5.4 Settings Page (`/settings`)

Sections:

**Document**
- "Current plan: [title]" 
- "Upload new document" button (re-runs the full parse flow)
- "Reset to demo plan" button

**API Key**
- Text input: "Anthropic API key"
- Small note: "Stored only on this device. Never sent anywhere except Anthropic."
- Link: "Get a key at console.anthropic.com"

**Notifications**
- Toggle: Enable daily reminders
- Time picker: "Remind me at [08:00]"
- Day checkboxes: Mon Tue Wed Thu Fri Sat Sun
- Custom message text input
- "Send test notification" button
- Note: "On iOS, you must add this app to your home screen for notifications to work"

**Voice**
- Toggle: Voice instructions on/off
- Toggle: Auto-read when step starts
- Voice picker dropdown (populated from `speechSynthesis.getVoices()`)
- Speed slider: 0.6 – 1.4 (default 0.92)
- Pitch slider: 0.7 – 1.3 (default 1.0)
- "Test voice" button

**Sounds**
- Toggle: Sounds on/off
- Volume slider: 0 – 1

**Display**
- Toggle: Keep screen on during sessions
- Theme: Light / Dark (toggle — implement dark mode via Tailwind dark: classes)

**Data**
- "Export my log" → downloads log as CSV
- "Clear all data" → confirm dialog → wipes localStorage

---

## 6. Document Parsing — Claude API Integration

### 6.1 `parseDoc.js`

```javascript
// Extract text from uploaded file
export async function extractText(file) {
  if (file.name.endsWith('.pdf')) {
    return extractFromPDF(file);   // use pdf.js
  } else if (file.name.endsWith('.docx')) {
    return extractFromDOCX(file);  // use mammoth.js
  }
  throw new Error('Unsupported file type');
}

async function extractFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

async function extractFromDOCX(file) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
```

### 6.2 `claudeParser.js`

Send extracted text to Claude with a precise prompt that returns structured JSON.

```javascript
export async function parseScheduleWithClaude(rawText, apiKey) {
  const systemPrompt = `You are a schedule extraction assistant. The user will give you the text of a document describing a structured weekly practice plan. Your job is to extract it into a precise JSON format.

Return ONLY valid JSON, no markdown, no explanation, no backticks. The JSON must exactly match this schema:

{
  "title": "string — name of the plan",
  "description": "string — 1-2 sentence summary",
  "days": [
    {
      "id": "string — lowercase day name e.g. monday",
      "name": "string — e.g. Monday",
      "subtitle": "string — short theme e.g. Foundation",
      "theme": "string — full day theme e.g. Foundation Day — Reset & Baseline",
      "steps": [
        {
          "id": "string — unique e.g. mon-1",
          "title": "string — short step name",
          "durationMinutes": number,
          "type": "active | rest | evening",
          "instructions": "string — full instructions for this step",
          "source": "string — citation if present, empty string if not"
        }
      ]
    }
  ]
}

Rules:
- type is "rest" if the step involves palming, resting, or closing eyes
- type is "evening" if the step is marked as evening or night
- type is "active" for all other steps
- durationMinutes must be a number, not a string
- Every step must have a unique id
- Include all 7 days if present
- If a day has no steps, still include it with an empty steps array
- Do not invent steps — only extract what is in the document`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the document text:\n\n${rawText.slice(0, 50000)}` // cap at 50k chars
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Claude API error');
  }

  const data = await response.json();
  const jsonText = data.content[0].text.trim();

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Claude returned invalid JSON — try again');
  }
}
```

**Important:** The Anthropic API requires the header `anthropic-dangerous-direct-browser-access: true` for direct browser calls. Claude Code must include this.

---

## 7. Notifications — Service Worker

### 7.1 `public/sw.js`

```javascript
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle notification click — open app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});

// Handle scheduled notification alarm message from app
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        tag: 'daily-reminder',
        renotify: true,
        vibrate: [200, 100, 200],
      });
    }, delay);
  }
});
```

### 7.2 `NotifScheduler.jsx`

```javascript
// Request permission and schedule daily notification
export async function scheduleNotification(settings) {
  if (!('Notification' in window)) return { error: 'Not supported' };
  
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: 'Permission denied' };

  const reg = await navigator.serviceWorker.ready;
  
  // Calculate ms until next notification time
  const [hours, mins] = settings.time.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours, mins, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  
  const delay = next.getTime() - now.getTime();
  
  reg.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    title: 'ScheduleAI',
    body: settings.message,
    delay
  });

  return { success: true, nextAt: next };
}
```

**Note for Claude Code:** Web Push with true background notifications (when app is closed) requires a push server and VAPID keys, which needs a backend. The above approach uses Service Worker message-based scheduling which works when the browser is open or the PWA is in memory. For true background push on iOS 16.4+, implement Web Push with VAPID — see implementation notes at end of this spec.

---

## 8. Sound Engine

Replicate exactly from `bates_timer.html`. All sounds are synthesised using Web Audio API — no audio files needed.

```javascript
// src/lib/sounds.js
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, type, gainVal, startTime, duration, ctx) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export function playBowl() { /* singing bowl — step complete */ }
export function playNewStep() { /* double chime — active step starts */ }
export function playRestChime() { /* descending tones — rest step starts */ }
export function playTick() { /* double tick — 30s warning */ }
export function playSessionDone() { /* deep bell — session complete */ }
```

Full tone parameters are in `bates_timer.html` — copy them exactly.

---

## 9. Voice Engine

```javascript
// src/lib/tts.js
let currentUtterance = null;
let isSpeaking = false;

export function initVoices(onReady) {
  if (!('speechSynthesis' in window)) return;
  function populate() {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) onReady(voices);
  }
  populate();
  window.speechSynthesis.onvoiceschanged = populate;
}

export function speak(text, { rate, pitch, voiceName, onStart, onEnd, onError } = {}) {
  if (!('speechSynthesis' in window)) return;
  stop();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate ?? 0.92;
  utter.pitch = pitch ?? 1.0;
  if (voiceName) {
    const match = speechSynthesis.getVoices().find(v => v.name === voiceName);
    if (match) utter.voice = match;
  }
  utter.onstart = () => { isSpeaking = true; onStart?.(); };
  utter.onend = () => { isSpeaking = false; onEnd?.(); };
  utter.onerror = () => { isSpeaking = false; onError?.(); };
  currentUtterance = utter;
  window.speechSynthesis.speak(utter);
}

export function stop() {
  try { window.speechSynthesis.cancel(); } catch(e) {}
  isSpeaking = false;
}

export function getIsSpeaking() { return isSpeaking; }
```

---

## 10. PWA Setup

### 10.1 `public/manifest.json`

```json
{
  "name": "ScheduleAI",
  "short_name": "ScheduleAI",
  "description": "Guided session timer from your documents",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f4f1eb",
  "theme_color": "#3d3420",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

Generate icons: a simple brown circle with a white clock/timer symbol. Claude Code can generate SVG and convert to PNG using sharp.

### 10.2 `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-*.png'],
      manifest: false, // use our own manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\.anthropic\.com\//,
          handler: 'NetworkOnly', // never cache API calls
        }]
      }
    })
  ]
});
```

### 10.3 Register Service Worker in `main.jsx`

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

---

## 11. Demo / Built-in Schedule

Hardcode the full Bates Method schedule as a JSON constant in `src/lib/demoSchedule.js`. This allows the app to work immediately without uploading a doc. The full schedule content is in `bates_timer.html` — the DAYS array. Convert it to match the data model schema defined in Section 4.

---

## 12. Build & Deploy Steps

```bash
# 1. Create project
npm create vite@latest scheduleai -- --template react
cd scheduleai

# 2. Install dependencies
npm install
npm install tailwindcss @tailwindcss/vite
npm install zustand
npm install mammoth
npm install pdfjs-dist
npm install vite-plugin-pwa

# 3. Configure Tailwind
# Add to vite.config.js: import tailwindcss from '@tailwindcss/vite'
# Add to src/index.css: @import "tailwindcss";

# 4. Build
npm run build

# 5. Deploy to Netlify
# Drag the dist/ folder to app.netlify.com/drop
# OR connect GitHub repo for auto-deploy on push
```

---

## 13. Step-by-Step Build Order for Claude Code

Build in this exact order — each step is independently testable:

### Phase 1 — Foundation (get something on screen)
1. Create Vite + React project with Tailwind
2. Set up Zustand store with full state shape (Section 4) — no logic yet, just structure
3. Create `App.jsx` with React Router: routes for `/`, `/schedule`, `/session/:dayId`, `/settings`
4. Create basic page shells (just headings) for all 4 pages
5. Hardcode `demoSchedule.js` — copy the full Bates schedule JSON
6. Load demo schedule into store on app init
7. **Test:** App runs, routes work, demo schedule is in state

### Phase 2 — Schedule page
8. Build `DayCard.jsx` — shows day name, subtitle, step count, duration, Start button
9. Build `Schedule.jsx` — renders 7 DayCards, highlights today
10. Add edit mode — inline step editor, add/remove/reorder steps
11. **Test:** Can see and edit the full schedule

### Phase 3 — Session timer (core feature)
12. Build `TimerRing.jsx` — SVG ring with countdown, colour states
13. Build `StepCard.jsx` — title, badge, instructions, source, Listen button
14. Build `StepList.jsx` — scrollable list with done/current/upcoming states
15. Build `Session.jsx` — combines all three, connects to store session state
16. Wire up timer logic in store: start, pause, tick, advance step, complete session
17. Add Wake Lock API call on session start
18. **Test:** Full session flow works — timer counts down, steps advance, done screen appears

### Phase 4 — Audio
19. Copy `sounds.js` from `bates_timer.html` — all 5 sounds
20. Integrate into session: chime on start, bowl on step done, bell on session done, tick at 30s
21. Build `SoundEngine.jsx` — volume control, on/off state from settings
22. **Test:** All sounds play at correct moments

### Phase 5 — Voice
23. Copy `tts.js` from `bates_timer.html`
24. Wire into session: auto-read on step start (800ms after chime), Listen button, stop on pause/skip
25. Build voice settings in `Settings.jsx` — picker, rate, pitch, test button
26. **Test:** Voice reads instructions, settings work

### Phase 6 — Document upload + Claude parsing
27. Build `DocUploader.jsx` — drag-drop zone, file type validation, upload state
28. Build `parseDoc.js` — PDF and DOCX text extraction
29. Build `claudeParser.js` — Claude API call with system prompt (Section 6.2)
30. Build `Home.jsx` — upload flow with loading states and error handling
31. Add API key input in `Settings.jsx`
32. **Test:** Upload the `bates_weekly_plan_v4.docx` file — verify Claude correctly extracts the schedule JSON and the app displays it identically to the demo

### Phase 7 — Notifications
33. Register service worker
34. Build `NotifScheduler.jsx` — permission request, scheduling logic
35. Wire into Settings page — time picker, day checkboxes, test button
36. **Test:** Test notification fires at correct time

### Phase 8 — PWA + Polish
37. Add `manifest.json` and icons
38. Configure `vite-plugin-pwa`
39. Add dark mode (Tailwind dark: classes, toggle in settings)
40. Add session log storage and log display page
41. Add "Export log as CSV" in settings
42. Add "Add to home screen" prompt banner (shown once)
43. **Test:** Install as PWA on iPhone and Android — session, sound, voice, notifications all work

### Phase 9 — Deploy
44. `npm run build`
45. Deploy `dist/` to Netlify
46. Test on real devices

---

## 14. Key Implementation Notes for Claude Code

**API key security:** The Anthropic API key is stored in localStorage and sent directly from the browser to the Anthropic API. This is acceptable for a personal-use app. Add a note in the UI: "Your API key is stored only on this device." Never log it or send it anywhere else.

**The `anthropic-dangerous-direct-browser-access: true` header** is required for all Claude API calls from the browser. Without it the request will be rejected with a CORS error.

**PDF.js worker:** Must be served from a CDN or copied to `/public/`. The easiest approach:
```javascript
import { GlobalWorkerOptions } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
```

**iOS notifications:** Require the PWA to be installed to home screen (added via Safari Share → "Add to Home Screen"). Notifications will not work in iOS Safari browser tab. Add clear instructions in the notifications settings section.

**Wake Lock:** May be unavailable in some browsers — always wrap in try/catch and silently fail.

**speechSynthesis on mobile:** voices list is async — always use `onvoiceschanged` event and check if list is empty before rendering the picker. On iOS the voice list loads after a slight delay.

**Session page scroll:** On mobile, when a new step starts, scroll the step list to keep the current step visible. Use `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.

**Zustand persist:** Use the `persist` middleware with localStorage. Exclude `session` from persistence (reset on app start) but persist everything else.

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(persist(
  (set, get) => ({ /* full state + actions */ }),
  {
    name: 'scheduleai-storage',
    partialize: (state) => ({
      schedule: state.schedule,
      settings: state.settings,
      log: state.log,
      // DO NOT persist session — reset every app start
    })
  }
));
```

**React Router:** Use `createBrowserRouter` with a `basename` if deploying to a subdirectory. For Netlify root deploy, no basename needed. Add a `public/_redirects` file with `/* /index.html 200` for client-side routing to work on Netlify.

**Timer implementation:** Use `setInterval` in a Zustand action, not in a React component. Store the interval ID in a non-persisted ref. Clean up on unmount and on pause.

---

## 15. Reference Files

The following files from the current project are directly useful to Claude Code:

- `bates_timer.html` — working prototype. The DAYS array, all sound functions, all TTS functions, and the session timer logic should be ported directly into the React app. Don't rewrite from scratch — port.
- `bates_weekly_plan_v4.docx` — the reference document to test the Claude parsing pipeline against. The parsed output should exactly match the demo schedule JSON.

---

## 16. Future Features (not in v1, document for later)

- **Multiple schedules** — support saving and switching between several uploaded docs (e.g. different practice plans for different goals)
- **True background push** — implement VAPID web push with a small Cloudflare Worker as the push server (free tier, no server to manage)
- **Streak tracking** — show a streak counter on the home screen
- **Session sharing** — export a session summary as a shareable image
- **AI schedule adjustment** — "I only have 20 minutes today" → Claude trims the session to fit
- **Voice recording notes** — record a voice note after session instead of typing
- **Apple Watch / Wear OS** — companion app for haptic timer feedback


---

## 17. Design System — Match the Reference Timer Exactly

**This section is mandatory.** The visual design of the app must replicate `bates_timer.html` precisely. Every colour, radius, spacing, typography rule, and component style below is extracted directly from the working prototype. Claude Code must not invent a different design.

The aesthetic is: warm parchment/linen background, dark walnut primary, clean white cards, muted earth tones. It feels calm and analogue — intentionally not a bright tech-blue SaaS app.

---

### 17.1 Colour Tokens

Define these as a Tailwind theme extension in `tailwind.config.js`:

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'app-bg':       '#f4f1eb',   // page background — warm linen
        'card-bg':      '#ffffff',   // card / surface background
        'hover-bg':     '#faf7f2',   // hover state on cards / list items
        'input-bg':     '#faf7f2',   // form inputs, selects
        'muted-bg':     '#f8f5ef',   // subtle secondary surfaces
        'section-bg':   '#f0ece4',   // dividers, secondary buttons, timer ring track
        'active-item':  '#fdf9f2',   // currently active step background

        // Primary / brand
        'primary':      '#3d3420',   // dark walnut — primary buttons, active states
        'primary-dark': '#2c2412',   // primary hover
        'primary-mid':  '#8b7355',   // medium walnut — progress bar, timer ring active, borders on hover

        // Borders
        'border-light': '#e0dbd0',   // card borders, default outlines
        'border-mid':   '#d4cfc4',   // input borders, toggle borders
        'border-faint': '#f7f4ef',   // step list item dividers
        'border-inner': '#f0ece4',   // inner section dividers within cards

        // Text
        'text-primary':  '#2c2a24',  // headings, body — near-black warm
        'text-body':     '#5a5548',  // body text, descriptions
        'text-muted':    '#9a9486',  // labels, captions, secondary text
        'text-faint':    '#b0a898',  // sources, citations, hints

        // Step type: active
        'active-tag-bg':   '#e8dfc8',
        'active-tag-text': '#7a5e2a',

        // Step type: rest
        'rest-tag-bg':     '#d4ead9',
        'rest-tag-text':   '#3a6b4a',
        'rest-ring':       '#5a8a6e',   // timer ring stroke for rest steps
        'rest-dot-bg':     '#d4ead9',   // done step dot
        'rest-dot-text':   '#5a8a6e',

        // Step type: evening / night
        'night-tag-bg':    '#ddd4ea',
        'night-tag-text':  '#5a3a7a',

        // Timer ring states
        'ring-active':  '#8b7355',   // normal active step
        'ring-rest':    '#5a8a6e',   // rest step
        'ring-urgent':  '#b85c38',   // last 30 seconds
        'ring-track':   '#f0ece4',   // background track

        // Notification / toast
        'toast-bg':     '#3d3420',   // same as primary
      },
      borderRadius: {
        'card':   '16px',   // session card, step list card
        'btn':    '10px',   // all buttons
        'tag':    '20px',   // step type tags (active/rest/night)
        'toggle': '20px',   // on/off toggle pills
        'input':  '8px',    // form inputs, selects
        'dot':    '50%',    // step number dots
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'xxs':  ['10px', { lineHeight: '1.4' }],
        'xs':   ['11px', { lineHeight: '1.5' }],
        'sm':   ['12px', { lineHeight: '1.5' }],
        'base': ['13px', { lineHeight: '1.6' }],
        'md':   ['14px', { lineHeight: '1.6' }],
        'lg':   ['15px', { lineHeight: '1.5' }],
        'xl':   ['18px', { lineHeight: '1.4' }],
        '2xl':  ['20px', { lineHeight: '1.3' }],
        '3xl':  ['24px', { lineHeight: '1.2' }],
        'timer': ['26px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'app-title': ['18px', { lineHeight: '1.3', fontWeight: '700' }],
      },
    }
  },
  plugins: [],
}
```

---

### 17.2 Global Styles

```css
/* src/styles/index.css */
@import "tailwindcss";

body {
  background-color: #f4f1eb;
  color: #2c2a24;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* Max width container — mobile-first, capped at 480px centred */
.app-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

/* Smooth button press */
button:active { transform: scale(0.97); }
```

---

### 17.3 Component Recipes

These are the exact Tailwind class combinations for each reusable component. Claude Code must use these — not invent alternatives.

#### Page background wrapper
```jsx
<div className="min-h-screen bg-app-bg">
  <div className="max-w-[480px] mx-auto px-4 py-4">
    {/* content */}
  </div>
</div>
```

#### Page header
```jsx
<div className="text-center py-5 pb-4">
  <h1 className="text-app-title font-bold text-text-primary">ScheduleAI</h1>
  <p className="text-xs text-text-muted mt-1">Guided session timer</p>
</div>
```

#### White card (session card, step list, settings sections)
```jsx
<div className="bg-card-bg rounded-card border border-border-light overflow-hidden mb-4">
  {/* content */}
</div>
```

#### Progress bar (top of session card)
```jsx
<div className="h-1 bg-section-bg">
  <div
    className="h-full bg-primary-mid transition-all duration-400 ease-out"
    style={{ width: `${progress}%` }}
  />
</div>
```

#### Step counter label (above step title)
```jsx
<p className="text-xs text-text-muted tracking-wider uppercase mb-1.5">
  Step {n} of {total} — {theme}
</p>
```

#### Step title
```jsx
<h2 className="text-2xl font-bold text-text-primary leading-snug mb-2">
  {title}
  <StepTypeBadge type={step.type} />
</h2>
```

#### Step type badges
```jsx
// Active
<span className="inline-block text-xxs font-bold px-1.5 py-0.5 rounded-tag bg-active-tag-bg text-active-tag-text uppercase tracking-wider ml-1.5 align-middle">
  Active
</span>

// Rest
<span className="inline-block text-xxs font-bold px-1.5 py-0.5 rounded-tag bg-rest-tag-bg text-rest-tag-text uppercase tracking-wider ml-1.5 align-middle">
  Rest
</span>

// Evening
<span className="inline-block text-xxs font-bold px-1.5 py-0.5 rounded-tag bg-night-tag-bg text-night-tag-text uppercase tracking-wider ml-1.5 align-middle">
  Evening
</span>
```

#### Step instructions
```jsx
<p className="text-md text-text-body leading-relaxed">
  {instructions}
</p>
```

#### Step source citation
```jsx
<p className="text-xs text-text-faint mt-2.5 italic">
  📖 {source}
</p>
```

#### Listen / speak button (absolute positioned top-right of step card)
```jsx
<button
  onClick={onSpeak}
  className={`absolute right-5 top-5 flex items-center gap-1 px-2.5 py-1 rounded-input text-xs border transition-all
    ${speaking
      ? 'bg-primary text-white border-primary'
      : 'bg-section-bg text-text-body border-border-mid hover:bg-muted-bg'
    }`}
>
  {speaking ? '⏸ Stop' : '▶ Listen'}
</button>
```

#### Timer ring (SVG — replicate exactly)
```jsx
// circumference = 2 * Math.PI * 52 = 326.7
const progress = timeLeft / totalTime; // 1 = full, 0 = empty
const offset = 326.7 * progress;       // dashoffset depletes as time passes

const ringStroke = {
  active:  '#8b7355',
  rest:    '#5a8a6e',
  urgent:  '#b85c38',  // timeLeft <= 30
};

<div className="relative w-[120px] h-[120px] mx-auto mb-2.5">
  <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
    {/* Track */}
    <circle cx="60" cy="60" r="52" fill="none" stroke="#f0ece4" strokeWidth="6" />
    {/* Progress */}
    <circle
      cx="60" cy="60" r="52"
      fill="none"
      stroke={timeLeft <= 30 ? '#b85c38' : ringStroke[step.type]}
      strokeWidth="6"
      strokeLinecap="round"
      strokeDasharray="326.7"
      strokeDashoffset={326.7 - (326.7 * (1 - progress))}
      style={{ transition: 'stroke-dashoffset 0.9s linear' }}
    />
  </svg>
  {/* Time display */}
  <div className="absolute inset-0 flex items-center justify-center">
    <span className="text-timer font-bold text-text-primary">
      {formatTime(timeLeft)}
    </span>
  </div>
</div>
```

#### Timer label (below ring)
```jsx
<p className="text-sm text-text-muted text-center mb-3.5">
  {step.durationMinutes} min exercise
</p>
```

#### Three-button control row
```jsx
<div className="flex gap-2.5">
  {/* Back */}
  <button
    onClick={onBack}
    disabled={isFirst}
    className="flex-1 py-3 rounded-btn text-lg font-semibold bg-section-bg text-text-body hover:bg-muted-bg disabled:opacity-40 transition-all"
  >
    ← Back
  </button>

  {/* Start / Pause — primary */}
  <button
    onClick={onToggle}
    className="flex-1 py-3 rounded-btn text-lg font-semibold bg-primary text-white hover:bg-primary-dark transition-all"
  >
    {running ? 'Pause' : (timeLeft < totalTime ? 'Resume' : 'Start')}
  </button>

  {/* Skip */}
  <button
    onClick={onSkip}
    className="flex-1 py-3 rounded-btn text-lg font-semibold bg-muted-bg text-text-muted border border-border-light hover:bg-section-bg transition-all"
  >
    Skip →
  </button>
</div>
```

#### Step list item
```jsx
<div
  onClick={() => onJump(index)}
  className={`flex items-center gap-3 px-4 py-3 border-b border-border-faint last:border-0 cursor-pointer transition-colors
    ${isCurrent ? 'bg-active-item border-l-[3px] border-l-primary-mid' : ''}
    ${isDone ? 'opacity-45' : ''}
    ${!isCurrent && !isDone ? 'hover:bg-hover-bg' : ''}
  `}
>
  {/* Step number dot */}
  <div className={`w-7 h-7 rounded-dot flex items-center justify-center text-xs font-bold flex-shrink-0
    ${isDone    ? 'bg-rest-dot-bg text-rest-dot-text' : ''}
    ${isCurrent ? 'bg-primary text-white' : ''}
    ${!isDone && !isCurrent ? 'bg-section-bg text-text-muted' : ''}
  `}>
    {isDone ? '✓' : index + 1}
  </div>

  {/* Text */}
  <div className="flex-1 min-w-0">
    <p className="text-md font-medium text-text-primary truncate">{step.title}</p>
    <p className="text-sm text-text-muted mt-px">
      {step.durationMinutes} min{step.type === 'rest' ? ' · rest' : step.type === 'evening' ? ' · evening' : ''}
    </p>
  </div>
</div>
```

#### Day selector button grid
```jsx
<div className="grid grid-cols-4 gap-2 mb-5">
  {days.map(day => (
    <button
      key={day.id}
      onClick={() => onSelect(day.id)}
      className={`rounded-btn py-2.5 px-1.5 text-center border-[1.5px] transition-all
        ${selected === day.id
          ? 'bg-primary border-primary text-white'
          : 'bg-card-bg border-border-mid text-text-primary hover:border-primary-mid hover:bg-hover-bg'
        }`}
    >
      <div className="text-base font-semibold">{day.name}</div>
      <div className="text-xxs mt-0.5 opacity-65">{day.subtitle}</div>
    </button>
  ))}
</div>
```

#### Toggle row (sounds / voice on-off)
```jsx
<div className="flex items-center justify-between bg-card-bg border border-border-light rounded-btn px-3.5 py-2.5 mb-3 text-base text-text-body">
  <span className="font-medium">{label}</span>
  <div className="flex gap-1.5">
    {['On', 'Off'].map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt === 'On')}
        className={`px-3 py-1 rounded-toggle text-sm font-semibold border transition-all
          ${(opt === 'On') === value
            ? 'bg-primary text-white border-primary'
            : 'bg-muted-bg text-text-body border-border-mid hover:bg-section-bg'
          }`}
      >
        {opt}
      </button>
    ))}
  </div>
</div>
```

#### Toast / notification bar
```jsx
{/* Shown briefly after step completes — slides in from top */}
<div className="bg-primary text-white text-center py-2.5 px-4 text-base rounded-btn mb-3 transition-all">
  {message}
</div>
```

#### Done screen
```jsx
<div className="text-center py-10 px-5">
  <div className="text-5xl mb-4">✓</div>
  <h2 className="text-3xl font-bold text-text-primary mb-2">Session complete</h2>
  <p className="text-lg text-text-body leading-relaxed">{message}</p>

  {/* Notes textarea */}
  <textarea
    placeholder="Add a note about today's session (optional)"
    className="w-full mt-5 p-3 rounded-btn border border-border-mid bg-input-bg text-md text-text-primary resize-none focus:outline-none focus:border-primary-mid"
    rows={3}
  />

  <button className="mt-4 w-full py-3 bg-primary text-white rounded-btn text-lg font-semibold hover:bg-primary-dark transition-all">
    Save & finish
  </button>
</div>
```

---

### 17.4 Typography Rules

| Use | Size | Weight | Colour |
|---|---|---|---|
| App title / page heading | 18px | 700 | `text-primary` (#2c2a24) |
| Step title | 20px | 700 | `text-primary` |
| Session done title | 24px | 700 | `text-primary` |
| Timer display | 26px, tracking tight | 700 | `text-primary` |
| Body / instructions | 14px | 400 | `text-body` (#5a5548) |
| Button text | 15px | 600 | varies |
| Step item name | 14px | 500 | `text-primary` |
| Step counter / labels | 11px, uppercase, tracked | 600 | `text-muted` (#9a9486) |
| Captions / sources | 11px | 400 italic | `text-faint` (#b0a898) |
| Tags / badges | 10px, uppercase, tracked | 700 | varies by type |
| Timer label | 12px | 400 | `text-muted` |

---

### 17.5 Spacing & Layout Rules

- **Page max-width:** 480px, centred with `mx-auto`
- **Page padding:** 16px horizontal
- **Card gap:** 16px between cards (mb-4)
- **Inner card padding (step info):** 20px all sides (p-5)
- **Timer section padding:** 16px top, 20px horizontal, 20px bottom
- **Step list item padding:** 12px vertical, 16px horizontal (py-3 px-4)
- **Button height:** 44px minimum (py-3 with text-lg)
- **Border widths:** Cards 1px, day selector buttons 1.5px, current step left border 3px
- **Transition duration:** 150ms for all hover states (`transition-all duration-150`)
- **Timer ring transition:** 900ms linear (`transition: stroke-dashoffset 0.9s linear`)
- **Progress bar transition:** 400ms ease (`transition: width 0.4s ease`)

---

### 17.6 Dark Mode

Dark mode is toggled via a setting (not system preference). When active, add class `dark` to `<html>`. All colours invert:

```javascript
// tailwind.config.js — add darkMode: 'class'
darkMode: 'class',
```

```jsx
// Dark mode colour mappings — add these as dark: variants on every component
// app-bg:      dark → #1a1814
// card-bg:     dark → #242018
// text-primary dark → #e8e4dc
// text-body:   dark → #b0a898
// text-muted:  dark → #7a7468
// border-light dark → #3a362e
// border-mid:  dark → #4a4640
// section-bg:  dark → #2c2820
// hover-bg:    dark → #2a261e
// primary stays #3d3420 (dark enough for both modes)
// primary-mid: dark → #a08060 (slightly lighter for visibility)
```

Apply dark variants on every component using Tailwind's `dark:` prefix:
```jsx
<div className="bg-card-bg dark:bg-[#242018] border border-border-light dark:border-[#3a362e]">
```

---

### 17.7 Animation

Keep all animations subtle and calm — this is a relaxation app.

```css
/* Entrance animation for new step (apply to step card) */
@keyframes stepIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.step-enter { animation: stepIn 0.25s ease-out; }

/* Toast slide in */
@keyframes toastIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.toast-enter { animation: toastIn 0.2s ease-out; }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; }
}
```

Add `step-enter` class to `StepCard` whenever the step index changes. Remove it after 300ms to allow re-triggering.

---

### 17.8 Icons

Use only Unicode characters and emoji — no icon library needed. This keeps the bundle small and avoids rendering inconsistencies.

| Purpose | Character |
|---|---|
| Back / previous | ← (←) |
| Forward / skip | → (→) |
| Play / listen | ▶ (▶) |
| Pause / stop | ⏸ (⏸) |
| Done / check | ✓ |
| Session complete | ✓ (large, 48px) |
| Note / source | 📖 |
| Sound | ♩ (♩) |
| Voice / mic | 🎤 |
| Settings gear | ⚙ (⚙) |
| Notification bell | 🔔 |
| Delete | × (×) |
| Drag handle | ⠿ (⠿) |
| Edit | ✎ (✎) |
| Add | + |
| Rest/palm | 🤲 (optional, not used in original) |

---

### 17.9 Bottom Navigation Bar

The app has a persistent bottom nav bar on all pages except the active session page (where screen space is precious).

```jsx
<nav className="fixed bottom-0 left-0 right-0 bg-card-bg border-t border-border-light safe-area-pb">
  <div className="max-w-[480px] mx-auto flex">
    {[
      { path: '/',         label: 'Home',     icon: '⌂' },
      { path: '/schedule', label: 'Schedule', icon: '☰' },
      { path: '/log',      label: 'Log',      icon: '◷' },
      { path: '/settings', label: 'Settings', icon: '⚙' },
    ].map(item => (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xxs font-semibold transition-colors
          ${isActive ? 'text-primary' : 'text-text-muted hover:text-text-body'}`
        }
      >
        <span className="text-xl mb-0.5">{item.icon}</span>
        {item.label}
      </NavLink>
    ))}
  </div>
</nav>
```

Add `pb-16` to all page containers to avoid content being hidden behind the nav bar.

---

### 17.10 Settings Page Visual Style

Settings sections use grouped white cards with a section label above each group — identical to iOS Settings visual language:

```jsx
{/* Section */}
<div className="mb-5">
  <p className="text-xs text-text-muted uppercase tracking-wider mb-1.5 px-1">Notifications</p>
  <div className="bg-card-bg rounded-card border border-border-light overflow-hidden">
    {/* Row */}
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-faint">
      <span className="text-md text-text-primary">Enable daily reminder</span>
      <ToggleSwitch value={settings.notifications.enabled} onChange={...} />
    </div>
    {/* Another row */}
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-md text-text-primary">Reminder time</span>
      <input type="time" value={settings.notifications.time} className="text-md text-text-body bg-transparent border-0 outline-none" />
    </div>
  </div>
</div>
```

---

*Design system complete. Every pixel of the app should feel like it belongs to `bates_timer.html`. When in doubt, open that file and match it.*

---

*This spec is complete. Claude Code should be able to build the full app from this document without asking for clarification. Start with Phase 1 and work through each phase in order, testing after each phase before proceeding.*
