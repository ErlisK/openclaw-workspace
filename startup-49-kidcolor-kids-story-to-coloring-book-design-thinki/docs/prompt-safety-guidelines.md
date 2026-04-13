# KidColoring — Prompt Safety Guidelines
## Phase 3: Ideate · AI Generation Safety Architecture

> These guidelines define every constraint that transforms raw user input  
> into a safe, age-appropriate image generation prompt.  
> **No raw user text ever reaches the image model.**

---

## Architecture Overview

```
User Input (wizard JSON or voice transcript)
        ↓
  Layer 1: Input Text Classifier (OpenAI Moderation API)
  → if ANY category score > threshold → BLOCKED → moderation_events(input_text, blocked)
        ↓ passed
  Layer 2: Prompt Assembly (server-side deterministic)
  → wizard JSON → structured prompt via template
  → raw_text NEVER in image prompt (only used to generate scene descriptions)
        ↓
  Layer 2b: Character + Setting Whitelisting
  → characters must be on approved list
  → settings must be on approved list
  → hero_name used in cover text only, NOT in image prompt
        ↓
  Layer 3: AI Model + System Prompt Safety Wrapper
  → system prompt enforces coloring book style + content restrictions
        ↓
  Layer 3b: Output Image Classifier (Google Vision SafeSearch)
  → if confidence < 99.5% safe → FLAGGED → book.status=failed → refund
        ↓ approved
  Page written to pages table → moderation_events(output_image, approved)
```

---

## Layer 1: Input Text Classifier

**API:** OpenAI Moderation API (`text-moderation-stable`)  
**Input:** `stories.raw_text` (voice transcript or wizard-assembled text)  
**Threshold:** Block if ANY of the following scores exceed threshold:

| Category | Block Threshold |
|----------|----------------|
| `hate` | > 0.01 |
| `hate/threatening` | > 0.001 |
| `harassment` | > 0.02 |
| `harassment/threatening` | > 0.001 |
| `self-harm` | > 0.001 |
| `self-harm/intent` | > 0.001 |
| `sexual` | > 0.001 |
| `sexual/minors` | > 0.0001 |
| `violence` | > 0.05 |
| `violence/graphic` | > 0.001 |

**On block:**
- `stories.safety_passed = false`
- `generation_job` NOT created
- `moderation_events` row inserted: `{event_type: 'input_text', result: 'blocked', scores: <raw>}`
- User sees: "We couldn't make that story. Please try a different one!" (friendly, no detail)

**On pass:**
- `stories.safety_passed = true`
- `stories.safety_score = max(all_category_scores)`

---

## Layer 2: Prompt Assembly

**Rule: Raw user text is NEVER in the image prompt.**

The image prompt is assembled deterministically from the wizard's structured JSON:

```typescript
interface WizardData {
  characters: string[]    // e.g. ['dinosaur', 'unicorn']
  setting: string         // e.g. 'space'
  action: string          // e.g. 'explore'
  hero_name?: string      // e.g. 'Sparkle' — used in cover text ONLY
  age_range: string       // e.g. '4-6'
}

function buildImagePrompt(wizard: WizardData, pageIndex: number): string {
  const sceneDescription = PAGE_SCENE_TEMPLATES[pageIndex](wizard)
  return `${STYLE_SYSTEM_PROMPT} ${sceneDescription} ${AGE_MODIFIERS[wizard.age_range]}`
}
```

**Page scene templates are server-side presets**, not generated from user input.  
Example for page 3: `"${characters[0]} and ${characters[1]} floating through asteroid field in ${setting}"`

---

## Layer 2b: Character + Setting Allowlists

Only these values may appear in image prompts:

### Approved Characters
```
dinosaur, unicorn, robot, dragon, mermaid, lion, wizard, rocket-ship,
princess, knight, fairy, astronaut, puppy, kitten, elephant, owl,
bear, fox, bunny, turtle, penguin, dolphin, butterfly, eagle
```

### Approved Settings
```
space, forest, ocean, castle, city, mountains, desert, clouds,
jungle, arctic, underwater, rainbow-sky, meadow, volcano, treehouse,
farm, beach, cave, island, market
```

### Approved Actions
```
explore, fly, swim, run, dance, sing, build, grow, help, discover,
adventure, play, rescue, climb, create, celebrate, journey, rest
```

**Hero name safety:**
- Never included in image prompt
- Used ONLY in: cover page text overlay (as alt-text only), page header PDF label
- Max 20 characters
- Alphanumeric + spaces only (strip all special chars)

---

## Layer 3: System Prompt Wrapper

This system prompt is prepended to every generation call:

```
GENERATION SYSTEM PROMPT (mandatory, never remove):

You are generating pages for a children's coloring book.
Every image MUST follow ALL rules below:

STYLE RULES:
- Pure white (#FFFFFF) background ONLY
- Black (#000000) outlines ONLY — minimum 3pt line weight for ages 3-6, 2pt for ages 7-12
- ZERO shading, gray tones, hatching, or cross-hatching
- ZERO color fill — empty white regions for the child to color
- ALL path regions must be fully enclosed (closed paths, no gaps)
- ZERO text, words, letters, or numbers in the image
- Simple, clean, joyful composition

CONTENT RULES — NON-NEGOTIABLE:
- ABSOLUTELY NO weapons, knives, guns, bombs, or violent imagery
- ABSOLUTELY NO blood, wounds, injury, or pain
- ABSOLUTELY NO scary faces, monsters designed to frighten, or horror elements
- ABSOLUTELY NO adult themes, romance, or suggestive content
- ABSOLUTELY NO real people, celebrities, or identifiable individuals
- ABSOLUTELY NO copyrighted characters (no Disney, Marvel, etc.)
- ABSOLUTELY NO drug paraphernalia, alcohol, or adult substances
- ALL content must be appropriate for display in a kindergarten classroom

AGE-RANGE MODIFIERS:
- Ages 2-4: Very simple shapes, minimal detail, large regions, 5pt line minimum
- Ages 4-6: Simple characters, 3-5 distinct regions per page, 3pt line minimum
- Ages 6-8: Moderate detail, 8-12 regions per page, 2pt line minimum
- Ages 8-11: More detail, decorative elements, 1.5pt line minimum

If the scene description contains ANY potentially inappropriate element,
substitute with a fully safe alternative scene (happy animals in nature).
```

---

## Layer 3b: Output Image Classifier

**API:** Google Cloud Vision SafeSearch API  
**Trigger:** Every generated image before `pages.image_url` is written

**Block thresholds:**

| Category | Block If |
|----------|---------|
| `adult` | ≥ LIKELY |
| `violence` | ≥ POSSIBLE |
| `racy` | ≥ LIKELY |
| `medical` | ≥ VERY_LIKELY |
| `spoof` | never block (not safety-relevant) |

**On flag:**
- `pages.image_url` NOT written (image discarded)
- `books.status = 'failed'`
- `moderation_events` row: `{event_type: 'output_image', result: 'flagged', classifier: 'google_vision_safesearch'}`
- Refund triggered automatically
- Internal alert sent to safety team

**On approve:**
- `pages.image_url` written
- `moderation_events` row: `{event_type: 'output_image', result: 'approved'}`
- `analytics.track('safety_output_approved', ...)`

**Target metric:** `approved / (approved + flagged)` ≥ 99.5%  
Linked to GitHub Issue #6 (red-team 200 adversarial prompts)

---

## Additional Safety Measures

### Rate Limiting
- Max 5 generation requests per user per hour (anonymous)
- Max 20 per day per authenticated account
- Exponential backoff after 3 safety blocks on same session

### Logging Retention
- `moderation_events.input_text_snippet`: first 200 chars of flagged text, cleared at 90 days
- Full prompt never logged
- All safety decisions logged with classifier scores for audit

### Manual Review Queue
- Any `result = 'escalated'` event triggers Slack alert to safety reviewer
- Manual reviewer can `override` with note in `moderation_events`
- Appeal flow: parent emails scide-founder@agentmail.to with book ID

### Negative Prompt (appended to all generation calls)
```
blurry, shading, gray tones, cross-hatching, open line paths, gaps in outlines,
color fill, background color, text, watermark, signature, logo, scary, violent,
adult content, realistic photo, 3D render, anime (unless style=manga)
```

---

## Pre-Launch Safety Checklist

Linked to GitHub Issue #6 (Phase 3 entry gate):

- [ ] Layer 1 (OpenAI Moderation) integrated and tested
- [ ] Layer 2 (prompt assembly) reviewed — no raw text reaches image model
- [ ] Layer 3 (output classifier) integrated with Google Vision
- [ ] Character + setting allowlists implemented and tested
- [ ] Negative prompt appended to all generation calls
- [ ] 200-prompt adversarial red-team: 100% block rate confirmed
- [ ] False positive test: 100 legitimate children's prompts, 0 false blocks
- [ ] `moderation_events` table receiving correct records
- [ ] Refund flow triggered on `output_image: flagged` event

---

*Linked to: guardrails.md G-07, domain-model.md (moderation_events), GitHub Issue #6*  
*Updated: Phase 3 ideation sprint*
