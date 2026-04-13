# KidColoring — Kid-Facing UI Specification
## Zero-Reading Requirement · Phase 2: Define

> **Core Constraint (Guardrail G-03):** Every interaction in the kid-facing story creation flow must be completable by a child who cannot read at all.  
> This spec defines the exact interaction design for the story input wizard, preview, and feedback screens.

---

## Who Uses This UI

- **Primary user:** Child aged 3–8 years old
- **Context:** Parent has authenticated and handed device to child
- **Goal:** Child independently creates a personalized story in 4–6 taps

The parent UI (account creation, checkout, PDF download) is a separate interface — see `admin/` routes.

---

## Screen 1: Story Entry Portal

### What the child sees first

```
┌─────────────────────────────────────────┐
│                                         │
│         🎨 Make MY Book!                │
│                                         │
│   ┌──────────┐   ┌──────────┐          │
│   │  Tap 🎤  │   │  Tap ✍️  │          │
│   │ I'll TALK│   │ Pick with│          │
│   │ my story │   │ pictures │          │
│   └──────────┘   └──────────┘          │
│                                         │
└─────────────────────────────────────────┘
```

**Two entry paths:**
1. **Voice (🎤):** Child taps, then speaks. Audio transcribed to text. No keyboard.
2. **Wizard (picture picker):** 4-step illustrated question flow (described below).

**No text required to choose.** Icons + audio labels on tap.

**Touch target:** Each button ≥ 120×120px.

---

## Path A: Voice Input

### Step V1: Recording

```
┌─────────────────────────────────────────┐
│                                         │
│   Tell me your story! 🎙️               │
│                                         │
│         [Animated mic pulse]            │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │   🔴  I'm listening...          │  │
│   └─────────────────────────────────┘  │
│                                         │
│              [Stop 🟥]                  │
│                                         │
└─────────────────────────────────────────┘
```

- Microphone activates immediately on entry
- Animated pulsing waveform gives real-time recording feedback
- Child speaks freely for up to 60 seconds
- Tapping anywhere or after 5 seconds of silence → auto-stops
- Transcription runs immediately

### Step V2: Playback confirmation

```
┌─────────────────────────────────────────┐
│                                         │
│   I heard: [plays audio back]           │
│                                         │
│   ▶️ Hear it again                      │
│                                         │
│   ┌──────────────┐  ┌────────────────┐ │
│   │   ✅ Yes!    │  │ 🔄 Try again   │ │
│   └──────────────┘  └────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

- Audio replay lets child verify without reading transcription
- "Yes!" → proceeds to name step
- "Try again" → returns to recording

---

## Path B: 4-Step Picture Wizard

### Step W1: Who is in your story?

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🌟  Who is your story about?  [audio plays]      │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🦖      │  │  👸     │  │  🤖     │           │
│   │ Dinosaur │  │Princess │  │  Robot  │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🐉      │  │  🧜     │  │  🦁     │           │
│   │ Dragon  │  │Mermaid  │  │  Lion   │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🧙     │  │  🦄     │  │  🚀     │           │
│   │ Wizard  │  │Unicorn  │  │ Rocket  │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│                  [Selected: highlighted with ✨]     │
│   Pick as many as you want!        ──→  Next >     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**UX rules:**
- Tap any card to select (filled border + sparkle animation)
- Tap again to deselect
- Select 1–3 characters; "Next" activates after ≥1 selection
- Each card plays the character's name as audio on tap
- Cards are 100×100px, labels in 18px bold below icon

### Step W2: Where does the story happen?

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🌍  Where do they go?  [audio plays]             │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🌲🌲   │  │  🌊🐠   │  │  🏰     │           │
│   │ Forest  │  │  Ocean  │  │ Castle  │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🚀⭐   │  │  🏙️     │  │  🏔️❄️   │           │
│   │  Space  │  │   City  │  │Mountains│           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🏜️🌵   │  │  🌈☁️   │  │  🌋🔥   │           │
│   │ Desert  │  │  Clouds │  │ Volcano │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Pick 1 location
- Same audio-on-tap interaction as Step W1

### Step W3: What happens?

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   ⚡  What do they do?  [audio plays]              │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🏃💨   │  │  🍕🍰   │  │  🐉⚔️   │           │
│   │  Chase  │  │  Party  │  │  Fight  │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🤝💫   │  │  🗺️🔍   │  │  🎵🎶   │           │
│   │  Help   │  │ Explore │  │  Sing   │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  🏠🔨   │  │  🌱🌻   │  │  🪄✨   │           │
│   │  Build  │  │   Grow  │  │   Magic │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Step W4: What's your hero's name?

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   What's your hero called?  [audio plays]          │
│                                                     │
│   ┌───────────────────────────────────────────┐    │
│   │   🦖                                      │    │
│   │   [type a name]              [🎤 Say it]  │    │
│   └───────────────────────────────────────────┘    │
│                                                     │
│   [← Back]                    [✨ Make my book! →] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Text input optional — child can speak name via 🎤 button
- If skipped: hero defaults to the character type ("Dinosaur")
- "Make my book!" button plays audio "Let's make your book!" on tap
- Big pulsing colorful button — cannot be missed

---

## Screen 2: Generation Progress

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   ✨  Your book is being made!  ✨                  │
│                                                     │
│   [Full-screen looping character animation:         │
│    the child's chosen character drawing itself]     │
│                                                     │
│   Page 1 of 12  ████████░░░░░░  (progress bar)     │
│                                                     │
│   [No spinner. No "loading..." text.]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Interaction:** None required. Child watches animation.  
**Audio:** Light ambient music loop, optional (parent can mute).  
**When first page is ready:** Transition to preview automatically.

---

## Screen 3: Preview

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🎉  Look! Your first page!                       │
│                                                     │
│   ┌───────────────────────────────────────────┐    │
│   │                                           │    │
│   │   [LARGE coloring page image]             │    │
│   │   Cover page: "[Child's hero] in Space"   │    │
│   │                                           │    │
│   └───────────────────────────────────────────┘    │
│                                                     │
│   ← Swipe to see more         [🖨️ Print it!] →    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Swipe left to see up to 2 preview pages
- Pages fill 85% of screen — visual quality is self-evident
- "Print it!" button triggers handoff to parent checkout flow
- Tap image → plays "Here is your [page topic]!" audio

---

## Screen 4: Parent Handoff

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   📱  Time for a grown-up!                         │
│                                                     │
│   [Illustration: child + adult looking at tablet]   │
│                                                     │
│   [This screen is for the PARENT]                  │
│                                                     │
│   → Checkout flow (parent-readable text)           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Clear break between child experience and parent checkout
- Reduces risk of child accidentally completing a purchase
- Optional: PIN or device unlock to continue (OS-level, not app-level)

---

## Accessibility Baseline (All Kid-Facing Screens)

| Requirement | Specification |
|-------------|--------------|
| Touch target size | ≥ 48×48 px (WCAG 2.5.5 AAA) |
| Font size (any visible text) | ≥ 24px |
| Color contrast | ≥ 4.5:1 (WCAG 2.1 AA) |
| Color as sole indicator | Never |
| Audio on every tap | Optional, on by default |
| Portrait orientation support | Required |
| Landscape orientation support | Optional |
| Keyboard navigation | Not required (touch-only screens) |
| Screen reader support | Best effort — all images have alt text |

---

## Audio Script (All Required Audio Labels)

| Trigger | Audio |
|---------|-------|
| Entry screen loads | "Let's make YOUR coloring book!" |
| Voice path button | "Tap here and tell me your story!" |
| Wizard path button | "Tap here to pick with pictures!" |
| Step W1 loads | "Who is in your story? Tap to pick!" |
| Step W2 loads | "Where do they go? Tap to pick!" |
| Step W3 loads | "What do they do? Tap to pick!" |
| Step W4 loads | "What's your hero's name?" |
| Any card tapped | "[Card label]" (e.g. "Dinosaur!") |
| Generate button tapped | "Let's make your book! It'll be ready soon!" |
| Generation complete | "Your book is ready! Let's look!" |
| Preview loads | "Here is your first page!" |
| Print button | "Time to show a grown-up and print it!" |

---

## What This Spec Does NOT Cover

- Parent authentication flow (see `src/app/(auth)/`)
- Checkout / payment flow (see `src/app/checkout/`)
- PDF download (parent-only, text-based)
- Account settings, deletion flows (parent-only)
- Teacher bulk-generation UI (separate spec)

---

## Usability Test Protocol (Pre-Launch Gate)

**Participants:** 5 children aged 4–7 who have not used the app before.  
**Facilitator:** Observes without prompting.  
**Task:** "Here is a new app. Make a coloring book."  
**Success:** Child completes wizard → preview without any verbal prompts from facilitator.  
**Metrics:**
- Completion rate: ≥ 4/5 children complete independently
- Time to "Make my book!" button: ≤ 3 minutes
- Errors (taps that don't result in expected action): ≤ 2 per session
- Delight moments (spontaneous positive reaction): noted qualitatively

*Derived from: 507 research snippets — theme `age_fit` (86 snippets), persona Emma storyboard (storyboards.md, Scene 1–4), design-principles.md DP-03*
