#!/usr/bin/env python3
"""
ClipSpark Title/Hashtag Extractor + Thumbnail Generator
=========================================================
Standalone library (no external deps beyond Pillow) for:

1. extract_keywords(text)         → ranked keyword list
2. generate_title_variants(clip)  → 3 title options (different styles)
3. generate_hashtags(...)         → 8-10 platform-aware hashtags
4. generate_thumbnail(...)        → PIL Image (1080×1920 or 1920×1080)
5. render_thumbnail_to_bytes(img) → PNG bytes for upload

Used by: scoring_worker.py (title/hashtag at score time)
         thumbnail_worker.py or inline in render_worker.py
         /api/clips/[id]/titles (Next.js API route via sub-process or in-process)
"""

import re
import json
import math
import random
import textwrap
import unicodedata
from typing import NamedTuple
from pathlib import Path

# ── Font paths ───────────────────────────────────────────────────────────────
FONT_BOLD = None
FONT_REGULAR = None
for candidate in [
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]:
    if Path(candidate).exists():
        if 'Bold' in candidate and FONT_BOLD is None:
            FONT_BOLD = candidate
        elif FONT_REGULAR is None:
            FONT_REGULAR = candidate

FONT_BOLD = FONT_BOLD or FONT_REGULAR


# ── Brand color palette ───────────────────────────────────────────────────────
BRAND_PALETTES = {
    'indigo':   {'bg': (29, 27, 76),   'accent': (99, 102, 241), 'text': (255, 255, 255), 'sub': (196, 181, 253)},
    'midnight': {'bg': (15, 23, 42),   'accent': (56, 189, 248), 'text': (255, 255, 255), 'sub': (148, 163, 184)},
    'fire':     {'bg': (67, 20, 7),    'accent': (249, 115, 22), 'text': (255, 255, 255), 'sub': (253, 186, 116)},
    'forest':   {'bg': (5, 46, 22),    'accent': (74, 222, 128), 'text': (255, 255, 255), 'sub': (187, 247, 208)},
    'rose':     {'bg': (68, 7, 26),    'accent': (244, 63, 94),  'text': (255, 255, 255), 'sub': (253, 164, 175)},
    'gold':     {'bg': (30, 27, 3),    'accent': (234, 179, 8),  'text': (255, 255, 255), 'sub': (253, 224, 71)},
    'slate':    {'bg': (15, 23, 42),   'accent': (148, 163, 184),'text': (255, 255, 255), 'sub': (100, 116, 139)},
}

PLATFORM_ASPECT = {
    'TikTok': (1080, 1920),
    'Instagram Reels': (1080, 1920),
    'YouTube Shorts': (1080, 1920),
    'LinkedIn': (1200, 628),
    'Twitter/X': (1200, 675),
}

TEMPLATE_PALETTE = {
    'podcast-pro-v02':    'indigo',
    'tiktok-native-v02':  'fire',
    'linkedin-pro-v02':   'midnight',
    'comedy-kinetic-v02': 'gold',
    'audio-only-v02':     'forest',
}


# ── Keyword / NER extraction ──────────────────────────────────────────────────

STOP_WORDS = {
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'is','are','was','were','be','been','being','have','has','had','do',
    'does','did','will','would','could','should','may','might','shall',
    'i','you','we','they','he','she','it','this','that','these','those',
    'my','your','our','their','its','me','him','her','us','them',
    'so','then','just','very','really','quite','also','even','still',
    'like','as','if','when','where','which','who','what','how','why',
    'about','into','through','during','before','after','above','below',
    'from','up','down','out','off','over','under','again','further',
    'there','here','both','each','more','most','other','some','such',
    'no','nor','not','only','same','than','too','very','s','t',
    'can','cannot','couldn','didn','doesn','don','hadn','hasn','haven',
    'isn','ll','mustn','needn','shan','shouldn','wasn','weren','won','wouldn',
}

# Phrases strongly associated with high-performing content
HIGH_VALUE_PHRASES = [
    r'\b(?:the\s+)?(?:real\s+)?(?:truth|secret|reason|way|hack|trick|method|formula|system|framework)\b',
    r'\b(?:biggest|most\s+important|key|critical|essential|fundamental)\s+\w+\b',
    r'\b(?:never|always|stop|start|quit|avoid)\s+\w+ing\b',
    r'\b\d+\s+(?:tips|steps|ways|secrets|mistakes|lessons|rules|things)\b',
    r'\b(?:how\s+to|why\s+you|what\s+happens|what\s+to)\s+\w+\b',
    r'\b(?:game.?changer|life.?changing|mind.?blowing|eye.?opening)\b',
    r'\b(?:nobody|everyone|most\s+people)\s+\w+\b',
]


class Keyword(NamedTuple):
    term: str
    score: float
    is_phrase: bool


def clean_word(w: str) -> str:
    return unicodedata.normalize('NFKD', w).encode('ascii', 'ignore').decode().lower().strip("'\".,!?;:")


def extract_keywords(text: str, top_n: int = 20) -> list[Keyword]:
    """
    Extract ranked keywords from text using TF-IDF-like scoring
    plus bonus for capitalized (likely named entity) and high-value phrases.
    Returns top_n Keyword(term, score, is_phrase).
    """
    if not text:
        return []

    text_clean = text.lower()

    # Score individual words
    words = re.findall(r"[a-zA-Z']{3,}", text)
    word_freq: dict[str, int] = {}
    for w in words:
        c = clean_word(w)
        if c and c not in STOP_WORDS and len(c) >= 3:
            word_freq[c] = word_freq.get(c, 0) + 1

    # Bonus for capitalized (likely proper noun / NER)
    cap_words = set()
    for w in re.findall(r'\b[A-Z][a-z]{2,}\b', text):
        c = clean_word(w)
        if c not in STOP_WORDS:
            cap_words.add(c)

    total_words = max(len(words), 1)
    scored_words: list[Keyword] = []
    for term, freq in word_freq.items():
        tf = freq / total_words
        cap_bonus = 1.5 if term in cap_words else 1.0
        score = tf * cap_bonus * math.log(freq + 1)
        scored_words.append(Keyword(term=term, score=round(score, 6), is_phrase=False))

    # Extract bigrams
    word_list = [clean_word(w) for w in re.findall(r"[a-zA-Z']{3,}", text)]
    word_list = [w for w in word_list if w and w not in STOP_WORDS]
    bigrams: dict[str, int] = {}
    for i in range(len(word_list) - 1):
        bg = f'{word_list[i]} {word_list[i+1]}'
        bigrams[bg] = bigrams.get(bg, 0) + 1

    for bg, freq in bigrams.items():
        if freq >= 2:
            score = (freq / total_words) * 2.0 * math.log(freq + 1)
            scored_words.append(Keyword(term=bg, score=round(score, 6), is_phrase=True))

    # High-value phrase bonus
    high_value_matches: set[str] = set()
    for pattern in HIGH_VALUE_PHRASES:
        for m in re.finditer(pattern, text_clean):
            phrase = m.group(0).strip()
            if 3 <= len(phrase) <= 50:
                high_value_matches.add(phrase)

    for phrase in high_value_matches:
        scored_words.append(Keyword(term=phrase, score=0.5, is_phrase=True))

    # Deduplicate (remove single words if bigram containing them has higher score)
    seen: set[str] = set()
    result: list[Keyword] = []
    for kw in sorted(scored_words, key=lambda x: x.score, reverse=True):
        if kw.term not in seen:
            seen.add(kw.term)
            result.append(kw)

    return result[:top_n]


# ── Title generation ─────────────────────────────────────────────────────────

TITLE_STYLES = {
    'direct': [
        '{hook}: The {topic} Nobody Talks About',
        'Stop Making This {topic} Mistake',
        'The {topic} Secret That Changes Everything',
        '{number} {topic} Lessons That Took Me Years to Learn',
        'Why Most People Get {topic} Wrong',
        'The Real Reason {topic} Actually Works',
        'How to {topic} (The Right Way)',
        'This {topic} Advice Will Save You Years',
    ],
    'question': [
        'Is Your {topic} Actually Working?',
        'Why Does {topic} Feel So Hard?',
        'What Nobody Tells You About {topic}',
        'Are You Making This {topic} Mistake?',
        'How Long Does {topic} Actually Take?',
        'Should You Really {topic}?',
    ],
    'story': [
        'How I Built {topic} From Nothing',
        'The {topic} Moment That Changed Everything for Me',
        'I Was Wrong About {topic} for {number} Years',
        'What Happened When I Tried {topic}',
        'My {number}-Year Journey With {topic}',
        'How {topic} Completely Transformed My {context}',
    ],
    'listicle': [
        '{number} Things About {topic} That Blew My Mind',
        '{number} {topic} Mistakes I See Every Day',
        '{number} Reasons {topic} Beats Everything Else',
        'Top {number} {topic} Tips Nobody Shares',
        '{number} Ways {topic} Will Change Your Life',
    ],
    'contrast': [
        '{topic}: What You Think vs. What Actually Works',
        'Popular {topic} Advice That\'s Completely Wrong',
        'The {topic} Truth vs. The {topic} Lie',
        'Everyone Is Wrong About {topic} — Here\'s Why',
        'Before and After {topic}: The Real Story',
    ],
}


def extract_topic_for_title(keywords: list[Keyword], excerpt: str) -> str:
    """Extract best topic phrase for title substitution."""
    # Prefer a high-value phrase or bigram — but skip overly generic patterns
    SKIP_PATTERNS = re.compile(r'^(biggest|most|real|why|how|what|the|this|that)\s', re.I)
    for kw in keywords[:15]:
        term = kw.term
        if kw.is_phrase and 8 < len(term) < 40 and not SKIP_PATTERNS.match(term):
            words = term.split()
            return ' '.join(w.title() for w in words)
    # Fall back to top single keyword (not a stop word or generic term)
    GENERIC = {'biggest','mistake','everything','actually','percent','measure','focus','instead'}
    for kw in keywords[:10]:
        if not kw.is_phrase and len(kw.term) >= 4 and kw.term not in GENERIC:
            return kw.term.title()
    # Last resort: first meaningful noun from excerpt
    stop = STOP_WORDS | {'biggest','mistake','everything','nothing','someone','something'}
    words = [w.strip('.,!?"') for w in excerpt.split() if len(w) > 5 and w.lower().strip('.,!?"') not in stop]
    return (words[0].title() if words else 'This')[:30]


def extract_number_for_title(excerpt: str) -> str:
    """Find a number in the excerpt for listicle titles."""
    # Named numbers first
    named = re.search(r'\b(three|four|five|six|seven|eight|nine|ten)\b', excerpt, re.I)
    if named:
        return named.group(0).title()
    # Digits
    digit = re.search(r'\b([2-9]|[1-9]\d)\b', excerpt)
    if digit:
        return digit.group(0)
    return '5'


def extract_context_for_title(excerpt: str) -> str:
    """Extract context word (life/career/business/workflow) for story templates."""
    for w in ['business', 'career', 'life', 'strategy', 'workflow', 'practice', 'process', 'approach']:
        if w in excerpt.lower():
            return w
    return 'life'


def generate_title_variants(
    excerpt: str,
    hook_type: str,
    keywords: list[Keyword],
    n: int = 3,
) -> list[dict]:
    """
    Generate n title variants (different styles) for a clip.
    Returns [{'style': str, 'title': str, 'score': float}]
    """
    topic = extract_topic_for_title(keywords, excerpt)
    number = extract_number_for_title(excerpt)
    context = extract_context_for_title(excerpt)

    # Map hook_type to preferred styles
    style_priority = {
        'value_bomb':      ['direct', 'contrast', 'listicle'],
        'question_hook':   ['question', 'direct', 'contrast'],
        'story_moment':    ['story', 'direct', 'question'],
        'contrast_reveal': ['contrast', 'direct', 'question'],
        'high_energy':     ['direct', 'listicle', 'contrast'],
        'data_point':      ['listicle', 'direct', 'question'],
        'dramatic_pause':  ['story', 'direct', 'question'],
        'highlight':       ['direct', 'question', 'story'],
    }.get(hook_type, ['direct', 'question', 'listicle'])

    def make_title(style: str) -> str:
        templates = TITLE_STYLES.get(style, TITLE_STYLES['direct'])
        template = random.choice(templates)
        title = (template
                 .replace('{topic}', topic)
                 .replace('{number}', number)
                 .replace('{context}', context)
                 .replace('{hook}', hook_type.replace('_', ' ').title()))
        # Clean up double spaces, fix casing
        title = re.sub(r'\s+', ' ', title).strip()
        # Ensure title-case for key words while preserving minor words
        return title

    results = []
    used_styles = set()
    all_styles = list(TITLE_STYLES.keys())

    for style in style_priority + [s for s in all_styles if s not in style_priority]:
        if len(results) >= n:
            break
        if style in used_styles:
            continue
        used_styles.add(style)
        title = make_title(style)
        if len(title) < 15 or len(title) > 100:
            continue
        # Score: prefer titles with specific numbers or strong hooks
        score = 0.5
        if re.search(r'\b\d+\b', title):
            score += 0.2
        if any(w in title.lower() for w in ['secret', 'mistake', 'truth', 'wrong', 'nobody']):
            score += 0.2
        if title.endswith('?'):
            score += 0.1
        results.append({'style': style, 'title': title, 'score': round(score, 2)})

    return results[:n]


# ── Hashtag generation ────────────────────────────────────────────────────────

PLATFORM_TAGS = {
    'TikTok':             ['#FYP', '#ForYou', '#TikTok', '#viral'],
    'Instagram Reels':    ['#Reels', '#InstagramReels', '#Explore'],
    'YouTube Shorts':     ['#Shorts', '#YouTubeShorts'],
    'LinkedIn':           ['#LinkedIn', '#LinkedInCreator'],
    'Twitter/X':          [],
}

HOOK_TAGS = {
    'value_bomb':      ['#LifeHack', '#ProTips', '#Advice'],
    'question_hook':   ['#QandA', '#AskMe', '#Truth'],
    'story_moment':    ['#MyStory', '#Journey', '#Lesson'],
    'contrast_reveal': ['#Facts', '#Unpopular', '#Truth'],
    'high_energy':     ['#Motivation', '#Energy', '#Mindset'],
    'data_point':      ['#DataDriven', '#Stats', '#Research'],
    'dramatic_pause':  ['#DeepThought', '#Wisdom'],
    'highlight':       ['#Highlight', '#BestOf'],
}

NICHE_TAG_MAP = {
    'podcast':     ['#Podcast', '#Podcasting', '#PodcastClip'],
    'business':    ['#Business', '#Entrepreneur', '#Startup'],
    'comedy':      ['#Comedy', '#Funny', '#Humor'],
    'fitness':     ['#Fitness', '#Health', '#Workout'],
    'tech':        ['#Tech', '#AI', '#SoftwareDev'],
    'coaching':    ['#Coaching', '#GrowthMindset', '#PersonalDev'],
    'education':   ['#LearnOnTikTok', '#Education', '#HowTo'],
    'finance':     ['#Finance', '#Money', '#Investing'],
    'wellness':    ['#Wellness', '#Mental Health', '#Mindfulness'],
    'creator':     ['#ContentCreator', '#CreatorEconomy'],
}


def detect_niches(text: str) -> list[str]:
    """Detect content niches from transcript text."""
    text_lower = text.lower()
    matches = []
    niche_keywords = {
        'podcast':   ['podcast', 'episode', 'show', 'listener', 'interview'],
        'business':  ['business', 'revenue', 'startup', 'entrepreneur', 'company', 'product'],
        'comedy':    ['funny', 'joke', 'laugh', 'hilarious', 'comedy', 'humor'],
        'fitness':   ['workout', 'exercise', 'gym', 'nutrition', 'protein', 'training', 'fitness'],
        'tech':      ['software', 'code', 'programming', 'ai', 'machine learning', 'app', 'developer'],
        'coaching':  ['coach', 'mindset', 'growth', 'habit', 'routine', 'discipline'],
        'education': ['learn', 'teach', 'skill', 'knowledge', 'course', 'study'],
        'finance':   ['money', 'invest', 'stock', 'budget', 'financial', 'income', 'wealth'],
        'wellness':  ['mental health', 'anxiety', 'stress', 'meditat', 'mindful', 'therapy'],
    }
    for niche, kws in niche_keywords.items():
        if any(kw in text_lower for kw in kws):
            matches.append(niche)
    return matches or ['creator']


def generate_hashtags(
    platform: str,
    hook_type: str,
    excerpt: str,
    keywords: list[Keyword],
    max_tags: int = 10,
) -> list[str]:
    """Generate platform-appropriate hashtags."""
    tags: list[str] = []

    # Platform tags (2–3)
    tags += PLATFORM_TAGS.get(platform, [])[:2]

    # Hook-type tags (2)
    tags += HOOK_TAGS.get(hook_type, [])[:2]

    # Niche tags (2–3)
    niches = detect_niches(excerpt)
    for niche in niches[:2]:
        tags += NICHE_TAG_MAP.get(niche, [])[:2]

    # Keyword-derived hashtags (top non-phrase keywords)
    for kw in keywords[:5]:
        if not kw.is_phrase and len(kw.term) >= 4:
            tag = f'#{kw.term.title().replace(" ", "")}'
            if tag not in tags and len(tag) <= 25:
                tags.append(tag)

    # Brand tag always last
    tags.append('#ClipSpark')

    # Deduplicate preserving order
    seen: set[str] = set()
    final: list[str] = []
    for t in tags:
        clean = t.strip()
        if clean and clean not in seen:
            seen.add(clean)
            final.append(clean)

    return final[:max_tags]


# ── Thumbnail generation ──────────────────────────────────────────────────────

def wrap_text_to_lines(text: str, max_chars_per_line: int) -> list[str]:
    """Wrap text to lines, respecting word boundaries."""
    words = text.split()
    lines: list[str] = []
    current = ''
    for w in words:
        if not current:
            current = w
        elif len(current) + 1 + len(w) <= max_chars_per_line:
            current += ' ' + w
        else:
            lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def generate_thumbnail(
    title: str,
    platform: str = 'YouTube Shorts',
    template_id: str = 'podcast-pro-v02',
    hook_type: str = 'highlight',
    excerpt: str = '',
    show_watermark: bool = True,
) -> 'Image':
    """
    Generate a branded thumbnail image.
    Returns a PIL.Image object.
    """
    from PIL import Image, ImageDraw, ImageFont

    # Dimensions
    w, h = PLATFORM_ASPECT.get(platform, (1080, 1920))
    is_portrait = h > w

    # Color palette
    palette_name = TEMPLATE_PALETTE.get(template_id, 'indigo')
    palette = BRAND_PALETTES[palette_name]
    bg_color = palette['bg']
    accent_color = palette['accent']
    text_color = palette['text']
    sub_color = palette['sub']

    # Create image
    img = Image.new('RGB', (w, h), bg_color)
    draw = ImageDraw.Draw(img)

    # ── Background: gradient-like effect via rectangles ──
    # Draw accent stripe at bottom
    stripe_h = int(h * 0.08)
    draw.rectangle([(0, h - stripe_h), (w, h)], fill=accent_color)

    # Draw subtle top accent line
    draw.rectangle([(0, 0), (w, 6)], fill=accent_color)

    # ── Decorative: large semi-transparent circle ──
    circle_r = int(min(w, h) * 0.55)
    circle_x = int(w * 0.75)
    circle_y = int(h * 0.3) if is_portrait else int(h * 0.5)
    # Draw as a series of fading rects (PIL doesn't do alpha on RGB easily)
    for i in range(3):
        r2 = circle_r - i * 30
        xo = int(r2 * 0.7)
        yo = int(r2 * 0.7)
        # Darken/lighten bg slightly for depth
        shade = tuple(min(255, c + 15 - i * 8) for c in bg_color)
        draw.ellipse([
            (circle_x - r2, circle_y - r2),
            (circle_x + r2, circle_y + r2)
        ], fill=shade)

    # ── Hook type badge ──
    hook_labels = {
        'value_bomb':      '💡 VALUE BOMB',
        'question_hook':   '❓ MUST KNOW',
        'story_moment':    '📖 STORY TIME',
        'contrast_reveal': '🔄 PLOT TWIST',
        'high_energy':     '⚡ HIGH ENERGY',
        'data_point':      '📊 DATA DRIVEN',
        'dramatic_pause':  '⏸  KEY MOMENT',
        'highlight':       '⭐ HIGHLIGHT',
    }
    badge_text = hook_labels.get(hook_type, '⭐ CLIP')

    try:
        font_badge = ImageFont.truetype(FONT_BOLD or FONT_REGULAR, size=max(18, int(w * 0.022)))
    except Exception:
        font_badge = ImageFont.load_default()

    badge_margin = int(w * 0.06)
    badge_y = int(h * 0.07) if is_portrait else int(h * 0.1)
    draw.text((badge_margin, badge_y), badge_text, font=font_badge, fill=sub_color)

    # ── Main headline ──
    # Font size scales with platform/title length
    title_len = len(title)
    if title_len < 30:
        font_size_h = int(w * 0.075)
    elif title_len < 50:
        font_size_h = int(w * 0.060)
    else:
        font_size_h = int(w * 0.050)

    font_size_h = max(28, font_size_h)

    try:
        font_headline = ImageFont.truetype(FONT_BOLD or FONT_REGULAR, size=font_size_h)
    except Exception:
        font_headline = ImageFont.load_default()

    # Wrap title
    chars_per_line = max(10, int(w / (font_size_h * 0.55)))
    lines = wrap_text_to_lines(title, chars_per_line)
    lines = lines[:5]  # max 5 lines

    headline_y = int(h * 0.35) if is_portrait else int(h * 0.25)
    line_spacing = int(font_size_h * 1.25)

    for i, line in enumerate(lines):
        y = headline_y + i * line_spacing
        # Shadow for readability
        draw.text((badge_margin + 3, y + 3), line, font=font_headline, fill=(0, 0, 0))
        draw.text((badge_margin, y), line, font=font_headline, fill=text_color)

    # Accent underline under last headline line
    last_y = headline_y + len(lines) * line_spacing
    draw.rectangle([(badge_margin, last_y + 8), (badge_margin + int(w * 0.35), last_y + 14)],
                   fill=accent_color)

    # ── Excerpt snippet (small, below headline) ──
    if excerpt:
        try:
            font_sub = ImageFont.truetype(FONT_REGULAR or FONT_BOLD, size=max(16, int(w * 0.025)))
        except Exception:
            font_sub = ImageFont.load_default()

        snip = excerpt[:80].strip()
        if len(excerpt) > 80:
            snip += '…'
        snip = f'"{snip}"'
        draw.text((badge_margin, last_y + 30), snip, font=font_sub, fill=sub_color)

    # ── ClipSpark brand bug ──
    if show_watermark:
        try:
            font_brand = ImageFont.truetype(FONT_BOLD or FONT_REGULAR, size=max(14, int(w * 0.018)))
        except Exception:
            font_brand = ImageFont.load_default()

        brand = 'Made with ClipSpark'
        brand_y = h - stripe_h + int(stripe_h * 0.2)
        draw.text((badge_margin, brand_y), brand, font=font_brand, fill=(255, 255, 255))

    return img


def render_thumbnail_to_bytes(img: 'Image', format: str = 'PNG') -> bytes:
    """Render a PIL image to bytes."""
    from io import BytesIO
    buf = BytesIO()
    img.save(buf, format=format, optimize=True)
    return buf.getvalue()


# ── CLI / test harness ────────────────────────────────────────────────────────

if __name__ == '__main__':
    import sys

    test_excerpt = (
        "The biggest mistake most podcasters make is they focus on downloads instead of engagement. "
        "But actually, 73 percent of top podcasters measure listener completion rate and that changed "
        "everything for me. Why do some episodes go viral while others barely get noticed? "
        "It turns out the hook in the first 30 seconds matters more than everything else combined."
    )

    print("=== Keyword extraction ===")
    kws = extract_keywords(test_excerpt, top_n=15)
    for kw in kws:
        print(f"  {kw.term:<30} score={kw.score:.4f} phrase={kw.is_phrase}")

    print("\n=== Title variants ===")
    titles = generate_title_variants(test_excerpt, 'contrast_reveal', kws, n=3)
    for t in titles:
        print(f"  [{t['style']:<10}] score={t['score']} | {t['title']}")

    print("\n=== Hashtags ===")
    tags = generate_hashtags('YouTube Shorts', 'contrast_reveal', test_excerpt, kws)
    print(f"  {' '.join(tags)}")

    print("\n=== Thumbnail generation ===")
    for platform, tid in [
        ('YouTube Shorts', 'podcast-pro-v02'),
        ('LinkedIn', 'linkedin-pro-v02'),
        ('TikTok', 'tiktok-native-v02'),
    ]:
        title = titles[0]['title']
        img = generate_thumbnail(title, platform, tid, 'contrast_reveal', test_excerpt[:80])
        png = render_thumbnail_to_bytes(img)
        out = f'/tmp/thumb_{platform.replace(" ","_").lower()}.png'
        with open(out, 'wb') as f:
            f.write(png)
        w, h = img.size
        print(f"  {platform:<20} {w}×{h}  {len(png)//1024} KB → {out}")
