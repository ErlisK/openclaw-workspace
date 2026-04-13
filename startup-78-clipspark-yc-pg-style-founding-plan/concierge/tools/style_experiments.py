#!/usr/bin/env python3
"""
ClipSpark Style Experiment System v0.1
Generates caption style variants, hook framings, and thumbnail designs.
Documents what creators choose and why.

Usage:
  python3 style_experiments.py --session marcus --clip_text "Stop chasing viral. Start serving one person." --niche business
"""

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import subprocess

OUTPUT_DIR = Path("/tmp/clipspark_pilot/style_experiments")
REPO_DIR = Path("/root/openclaw-workspace/startup-78-clipspark-yc-pg-style-founding-plan/concierge")
FONTS = {
    "bold": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "regular": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "mono": "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    "sans_bold": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "open_sans": "/usr/share/fonts/truetype/open-sans/OpenSans-Bold.ttf",
}

# ─── Caption Style Definitions ────────────────────────────────────────────────

CAPTION_STYLES = {
    "bold_white_outline": {
        "id": "bold_white_outline",
        "label": "Bold White + Black Outline",
        "description": "Classic podcast caption — white text, heavy black outline. Max readability on any background.",
        "font": "bold",
        "font_size": 58,
        "color": (255, 255, 255),
        "outline_color": (0, 0, 0),
        "outline_width": 4,
        "background": None,
        "alignment": "center",
        "position": "bottom_third",
        "words_per_line": 4,
        "use_case": "Universal. Works on TikTok, Reels, Shorts, LinkedIn.",
    },
    "yellow_highlight": {
        "id": "yellow_highlight",
        "label": "Yellow Word Highlight",
        "description": "Key word highlighted in yellow on each line. High engagement on TikTok.",
        "font": "bold",
        "font_size": 54,
        "color": (255, 255, 255),
        "highlight_color": (255, 220, 0),
        "outline_color": (0, 0, 0),
        "outline_width": 3,
        "background": None,
        "alignment": "center",
        "position": "center",
        "words_per_line": 3,
        "use_case": "TikTok, Reels. Drama, comedy, education niches.",
    },
    "pill_caption": {
        "id": "pill_caption",
        "label": "Dark Pill Background",
        "description": "Text inside semi-transparent rounded pill. Clean, modern. LinkedIn/professional.",
        "font": "open_sans",
        "font_size": 52,
        "color": (255, 255, 255),
        "outline_color": None,
        "outline_width": 0,
        "background": (0, 0, 0, 180),
        "background_radius": 20,
        "alignment": "center",
        "position": "bottom_third",
        "words_per_line": 5,
        "use_case": "LinkedIn, YouTube Shorts. Professional, business, coaching niches.",
    },
    "kinetic_word": {
        "id": "kinetic_word",
        "label": "Kinetic Single Word",
        "description": "One word at a time, large, centered. Max impact. Highly viral on TikTok.",
        "font": "bold",
        "font_size": 100,
        "color": (255, 255, 255),
        "outline_color": (0, 0, 0),
        "outline_width": 5,
        "background": None,
        "alignment": "center",
        "position": "center",
        "words_per_line": 1,
        "use_case": "TikTok, Reels. Comedy, fitness, motivation niches.",
    },
    "brand_color": {
        "id": "brand_color",
        "label": "Brand Color Accent",
        "description": "White text with accent line in brand color. Professional and distinctive.",
        "font": "sans_bold",
        "font_size": 52,
        "color": (255, 255, 255),
        "accent_color": (99, 102, 241),  # indigo (ClipSpark brand)
        "outline_color": None,
        "outline_width": 0,
        "background": (0, 0, 0, 200),
        "alignment": "left",
        "position": "bottom_third",
        "words_per_line": 5,
        "use_case": "LinkedIn, YouTube Shorts. Founder, B2B, coach niches.",
    },
}

# ─── Hook Framing Variants ─────────────────────────────────────────────────────

HOOK_VARIANTS = {
    "question_hook": {
        "id": "question_hook",
        "label": "Question Hook",
        "template": "Why do {topic}s {counterintuitive_claim}?",
        "examples": [
            "Why do podcasters who post LESS grow FASTER?",
            "Why does your intro kill your show before it starts?",
            "Why do the best creators ignore the algorithm?",
        ],
        "description": "Opens with a question that creates curiosity gap. Strong for educational/business content.",
        "platform_fit": ["youtube_shorts", "linkedin"],
        "score": None,  # filled in from pilot data
    },
    "number_hook": {
        "id": "number_hook",
        "label": "Number Hook",
        "template": "{number} {things} that changed {outcome} forever",
        "examples": [
            "3 things that tripled my downloads in 90 days",
            "1 rule that changed how I write podcast hooks",
            "2 minutes that saved me 6 hours every episode",
        ],
        "description": "Number hooks set expectations and promise concrete value. High CTR on all platforms.",
        "platform_fit": ["youtube_shorts", "tiktok", "linkedin", "instagram_reels"],
        "score": None,
    },
    "story_hook": {
        "id": "story_hook",
        "label": "Story/Confession Hook",
        "template": "I {did embarrassing/wrong thing} for {duration}. Then {insight} changed everything.",
        "examples": [
            "I posted every day for 6 months. My numbers barely moved.",
            "I laughed before she finished the joke. And killed the entire clip.",
            "I spent 3 hours editing clips no one watched. Here's what I do now.",
        ],
        "description": "Personal story creates instant relatability. Best conversion for coaching/founder niches.",
        "platform_fit": ["tiktok", "instagram_reels", "youtube_shorts"],
        "score": None,
    },
    "stat_hook": {
        "id": "stat_hook",
        "label": "Statistic/Result Hook",
        "template": "{metric} went from {before} to {after} in {time}",
        "examples": [
            "Downloads tripled in 90 days. Here's exactly what changed.",
            "Clip completion: 30% → 68% in one week. One change.",
            "0 to 4,000 listeners. Without posting daily.",
        ],
        "description": "Proof-first hook. Best for skeptical audiences. High trust signal.",
        "platform_fit": ["linkedin", "youtube_shorts"],
        "score": None,
    },
    "contrarian_hook": {
        "id": "contrarian_hook",
        "label": "Contrarian Hook",
        "template": "Stop {conventional_advice}. Do {counterintuitive_action} instead.",
        "examples": [
            "Stop trying to go viral. Start serving ONE person.",
            "Stop starting your podcast with an intro. Start with the punchline.",
            "Stop posting every day. Post one great thing per week.",
        ],
        "description": "Pattern-interrupt. Stops scroll immediately. Works best for opinionated founders/coaches.",
        "platform_fit": ["tiktok", "linkedin", "instagram_reels"],
        "score": None,
    },
}

# ─── Thumbnail Style Definitions ─────────────────────────────────────────────

THUMBNAIL_STYLES = {
    "bold_text_bg": {
        "id": "bold_text_bg",
        "label": "Bold Text on Gradient Background",
        "description": "Full-bleed dark gradient, large white headline, creator name small at bottom.",
        "bg_type": "gradient",
        "bg_colors": [(20, 20, 40), (60, 20, 80)],
        "text_color": (255, 255, 255),
        "accent_color": (255, 220, 0),
        "layout": "headline_dominant",
        "use_case": "Business, founder, education niches. LinkedIn + YT Shorts.",
    },
    "split_face_text": {
        "id": "split_face_text",
        "label": "Split: Face Left + Text Right",
        "description": "Left half: creator face (placeholder). Right half: hook text. Classic YouTube thumbnail.",
        "bg_type": "split",
        "bg_colors": [(15, 15, 15), (30, 30, 30)],
        "text_color": (255, 255, 255),
        "accent_color": (99, 102, 241),
        "layout": "split_horizontal",
        "use_case": "Any niche. Highest CTR template on YouTube Shorts.",
    },
    "quote_card": {
        "id": "quote_card",
        "label": "Quote Card",
        "description": "Large pull quote, attribution below, minimal design. Shareable as image.",
        "bg_type": "solid",
        "bg_colors": [(248, 248, 255)],
        "text_color": (20, 20, 40),
        "accent_color": (99, 102, 241),
        "layout": "quote_centered",
        "use_case": "LinkedIn, Twitter/X. Text-heavy content, coaching, thought leadership.",
    },
    "tiktok_loud": {
        "id": "tiktok_loud",
        "label": "TikTok Loud",
        "description": "Bright color block, oversized emoji, short hook in caps. Max scroll-stop.",
        "bg_type": "solid",
        "bg_colors": [(255, 60, 100)],
        "text_color": (255, 255, 255),
        "accent_color": (255, 220, 0),
        "layout": "emoji_dominant",
        "use_case": "TikTok, Reels. Comedy, fitness, lifestyle niches.",
    },
}


# ─── Thumbnail Generator ──────────────────────────────────────────────────────

def load_font(key: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS.get(key, FONTS["bold"])
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def wrap_text(text: str, font, max_width: int, draw) -> list:
    words = text.split()
    lines = []
    current = []
    for word in words:
        test = " ".join(current + [word])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] > max_width and current:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return lines

def draw_outlined_text(draw, pos, text, font, fill, outline_color=None, outline_width=3):
    x, y = pos
    if outline_color and outline_width:
        for dx in range(-outline_width, outline_width + 1):
            for dy in range(-outline_width, outline_width + 1):
                if dx != 0 or dy != 0:
                    draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    draw.text((x, y), text, font=font, fill=fill)

def generate_thumbnail(
    style_id: str,
    headline: str,
    subtext: str,
    creator_name: str,
    output_path: Path,
    emoji: str = "🎙️",
    size: tuple = (1080, 1920),
) -> Path:
    """Generate a thumbnail image for a given style."""
    style = THUMBNAIL_STYLES[style_id]
    W, H = size
    img = Image.new("RGB", (W, H), (20, 20, 20))
    draw = ImageDraw.Draw(img, "RGBA")

    # Background
    if style["bg_type"] == "gradient":
        c1, c2 = style["bg_colors"]
        for y in range(H):
            t = y / H
            r = int(c1[0] * (1 - t) + c2[0] * t)
            g = int(c1[1] * (1 - t) + c2[1] * t)
            b = int(c1[2] * (1 - t) + c2[2] * t)
            draw.line([(0, y), (W, y)], fill=(r, g, b))
    elif style["bg_type"] == "solid":
        img.paste(style["bg_colors"][0], [0, 0, W, H])
    elif style["bg_type"] == "split":
        c1, c2 = style["bg_colors"]
        img.paste(c1, [0, 0, W // 2, H])
        img.paste(c2, [W // 2, 0, W, H])

    accent = style["accent_color"]
    text_color = style["text_color"]

    if style["layout"] == "headline_dominant":
        # Accent bar at top
        draw.rectangle([60, 120, 200, 140], fill=accent)

        # Main headline
        font_xl = load_font("bold", 90)
        font_sm = load_font("regular", 42)
        lines = wrap_text(headline.upper(), font_xl, W - 120, draw)
        y = 200
        for line in lines[:4]:
            bbox = draw.textbbox((0, 0), line, font=font_xl)
            x = (W - (bbox[2] - bbox[0])) // 2
            draw_outlined_text(draw, (x, y), line, font_xl, text_color, (0, 0, 0), 4)
            y += bbox[3] - bbox[1] + 20

        # Emoji
        font_emoji = load_font("bold", 160)
        draw.text((W // 2 - 80, H // 2 + 100), emoji, font=font_emoji, fill=text_color)

        # Creator name
        draw_outlined_text(draw, (60, H - 180), f"@{creator_name}", font_sm, accent, (0, 0, 0), 2)

    elif style["layout"] == "split_horizontal":
        # Left: placeholder for face (gray box with icon)
        draw.rectangle([0, H // 4, W // 2, 3 * H // 4], fill=(50, 50, 60))
        font_icon = load_font("bold", 180)
        draw.text((W // 4 - 90, H // 2 - 120), "👤", font=font_icon, fill=(120, 120, 140))

        # Accent divider
        draw.rectangle([W // 2 - 4, 0, W // 2 + 4, H], fill=accent)

        # Right: headline
        font_lg = load_font("bold", 72)
        font_sm = load_font("regular", 40)
        lines = wrap_text(headline, font_lg, W // 2 - 80, draw)
        y = H // 4
        for line in lines[:5]:
            draw_outlined_text(draw, (W // 2 + 40, y), line, font_lg, text_color, (0, 0, 0), 3)
            bbox = draw.textbbox((0, 0), line, font=font_lg)
            y += bbox[3] - bbox[1] + 18

        draw_outlined_text(draw, (W // 2 + 40, H - 200), f"@{creator_name}", font_sm, accent, (0, 0, 0), 2)

    elif style["layout"] == "quote_centered":
        img = Image.new("RGB", (W, H), style["bg_colors"][0])
        draw = ImageDraw.Draw(img)

        # Accent left border
        draw.rectangle([60, 200, 90, H - 200], fill=accent)

        font_quote = load_font("open_sans", 72)
        font_attr = load_font("regular", 44)
        lines = wrap_text(f'"{headline}"', font_quote, W - 260, draw)
        y = 260
        for line in lines[:6]:
            draw.text((130, y), line, font=font_quote, fill=text_color)
            bbox = draw.textbbox((0, 0), line, font=font_quote)
            y += bbox[3] - bbox[1] + 24

        draw.text((130, y + 60), f"— {creator_name}", font=font_attr, fill=accent)

    elif style["layout"] == "emoji_dominant":
        # Bright block, big emoji, caps hook
        font_big_emoji = load_font("bold", 300)
        font_caps = load_font("bold", 100)
        font_sm = load_font("regular", 48)

        draw.text((W // 2 - 150, 200), emoji, font=font_big_emoji, fill=text_color)

        lines = wrap_text(headline.upper(), font_caps, W - 120, draw)
        y = 680
        for line in lines[:3]:
            bbox = draw.textbbox((0, 0), line, font=font_caps)
            x = (W - (bbox[2] - bbox[0])) // 2
            draw_outlined_text(draw, (x, y), line, font_caps, accent, (0, 0, 0), 4)
            y += bbox[3] - bbox[1] + 20

        draw.text((60, H - 200), f"@{creator_name} on TikTok", font=font_sm, fill=(255, 255, 255, 180))

    img.save(str(output_path), "PNG", quality=95)
    return output_path


# ─── Caption Style Previewer ──────────────────────────────────────────────────

def generate_caption_preview(
    style_id: str,
    text: str,
    output_path: Path,
    size: tuple = (1080, 1920),
) -> Path:
    """Generate a still frame preview of a caption style."""
    style = CAPTION_STYLES[style_id]
    W, H = size
    # Background: dark gradient (simulates video frame)
    img = Image.new("RGB", (W, H), (15, 15, 25))
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(H):
        t = y / H
        r = int(10 * (1 - t) + 30 * t)
        g = int(10 * (1 - t) + 25 * t)
        b = int(20 * (1 - t) + 60 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    font_key = style.get("font", "bold")
    font_size = style.get("font_size", 58)
    font = load_font(font_key, font_size)
    font_sm = load_font("regular", 38)
    words_per_line = style.get("words_per_line", 4)

    # Split text into lines
    words = text.split()
    lines = [" ".join(words[i:i+words_per_line]) for i in range(0, len(words), words_per_line)]
    if style_id == "kinetic_word":
        # Show just one word big in center
        lines = [words[0].upper(), "(one word at a time)"]

    # Position
    pos_key = style.get("position", "bottom_third")
    if pos_key == "bottom_third":
        y_start = int(H * 0.68)
    elif pos_key == "center":
        y_start = int(H * 0.42)
    else:
        y_start = int(H * 0.68)

    # Draw caption
    for i, line in enumerate(lines[:5]):
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        lh = bbox[3] - bbox[1]
        x = (W - lw) // 2 if style.get("alignment") == "center" else 80
        y = y_start + i * (lh + 16)

        # Pill background
        bg = style.get("background")
        if bg and style_id == "pill_caption":
            pad = 20
            r = style.get("background_radius", 16)
            draw.rounded_rectangle(
                [x - pad, y - pad // 2, x + lw + pad, y + lh + pad // 2],
                radius=r, fill=bg
            )

        # Accent bar (brand_color style)
        if style_id == "brand_color" and i == 0:
            accent = style.get("accent_color", (99, 102, 241))
            draw.rectangle([x - 80, y_start - 20, x - 56, y_start + lh * len(lines[:5]) + 20], fill=accent)

        outline = style.get("outline_color")
        outline_w = style.get("outline_width", 3)

        # Yellow highlight on last word of each line
        if style_id == "yellow_highlight" and line:
            wds = line.split()
            # Draw all but last in white
            prefix = " ".join(wds[:-1])
            last_word = wds[-1]
            if prefix:
                draw_outlined_text(draw, (x, y), prefix + " ", font, style["color"], outline, outline_w)
                pb = draw.textbbox((x, y), prefix + " ", font=font)
                last_x = pb[2]
            else:
                last_x = x
            draw_outlined_text(draw, (last_x, y), last_word, font,
                                style.get("highlight_color", (255, 220, 0)), outline, outline_w)
        else:
            draw_outlined_text(draw, (x, y), line, font, style["color"], outline, outline_w)

    # Label badge in corner
    draw.rounded_rectangle([40, 40, 500, 120], radius=12, fill=(0, 0, 0, 180))
    draw.text((60, 55), f"Style: {style['label']}", font=font_sm, fill=(200, 200, 200))

    img.save(str(output_path), "PNG", quality=92)
    return output_path


# ─── Experiment Runner ────────────────────────────────────────────────────────

def run_experiments(session_id: str, clip_text: str, niche: str, creator_name: str):
    session_dir = OUTPUT_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    results = {
        "session_id": session_id,
        "niche": niche,
        "creator_name": creator_name,
        "clip_text": clip_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "caption_variants": [],
        "thumbnail_variants": [],
        "hook_variants": [],
    }

    print(f"\n{'='*60}")
    print(f"ClipSpark Style Experiments — Session: {session_id}")
    print(f"Niche: {niche} | Creator: {creator_name}")
    print(f"{'='*60}")

    # 1. Caption style previews
    print("\n[1/3] Generating caption style previews...")
    for style_id, style in CAPTION_STYLES.items():
        out = session_dir / f"caption_{style_id}.png"
        try:
            generate_caption_preview(style_id, clip_text, out)
            size_kb = out.stat().st_size // 1024
            print(f"  ✓ {style['label']} → {out.name} ({size_kb}KB)")
            results["caption_variants"].append({
                "style_id": style_id,
                "label": style["label"],
                "description": style["description"],
                "use_case": style["use_case"],
                "file": str(out),
                "size_kb": size_kb,
            })
        except Exception as e:
            print(f"  ✗ {style_id}: {e}")

    # 2. Thumbnail designs
    print("\n[2/3] Generating thumbnail variants...")
    # Pick headline from contrarian hook (most punchy)
    headline = "Stop chasing viral. Start serving ONE person."
    if niche == "comedy":
        headline = "The silence IS the joke."
    elif niche == "fitness":
        headline = "Stop counting reps. Start counting results."
    elif niche == "education":
        headline = "The best teachers don't explain. They show."

    emoji_map = {
        "business": "🎙️", "comedy": "😂", "fitness": "💪",
        "education": "📚", "default": "🎯"
    }
    emoji = emoji_map.get(niche, emoji_map["default"])

    for style_id in THUMBNAIL_STYLES:
        out = session_dir / f"thumbnail_{style_id}.png"
        try:
            generate_thumbnail(style_id, headline, clip_text[:80], creator_name, out, emoji)
            size_kb = out.stat().st_size // 1024
            print(f"  ✓ {THUMBNAIL_STYLES[style_id]['label']} → {out.name} ({size_kb}KB)")
            results["thumbnail_variants"].append({
                "style_id": style_id,
                "label": THUMBNAIL_STYLES[style_id]["label"],
                "description": THUMBNAIL_STYLES[style_id]["description"],
                "use_case": THUMBNAIL_STYLES[style_id]["use_case"],
                "file": str(out),
                "size_kb": size_kb,
            })
        except Exception as e:
            print(f"  ✗ {style_id}: {e}")

    # 3. Hook variants
    print("\n[3/3] Generating hook framing variants...")
    for hook_id, hook in HOOK_VARIANTS.items():
        # Pick the most niche-relevant example
        example = hook["examples"][0]
        if niche == "comedy" and len(hook["examples"]) > 1:
            example = hook["examples"][1]
        elif niche in ["fitness", "education"] and len(hook["examples"]) > 2:
            example = hook["examples"][2]
        results["hook_variants"].append({
            "hook_id": hook_id,
            "label": hook["label"],
            "description": hook["description"],
            "example": example,
            "platform_fit": hook["platform_fit"],
        })
        print(f"  ✓ {hook['label']}: \"{example[:60]}...\"")

    # Save results JSON
    results_path = session_dir / "experiment_results.json"
    results_path.write_text(json.dumps(results, indent=2))
    print(f"\n  📊 Results → {results_path}")

    total_files = len(results["caption_variants"]) + len(results["thumbnail_variants"])
    print(f"\n{'='*60}")
    print(f"✅ Style experiments complete")
    print(f"   Caption styles: {len(results['caption_variants'])}")
    print(f"   Thumbnail variants: {len(results['thumbnail_variants'])}")
    print(f"   Hook variants: {len(results['hook_variants'])}")
    print(f"   Total image files: {total_files}")
    print(f"   Output: {session_dir}")
    print(f"{'='*60}\n")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--session", default="test")
    parser.add_argument("--clip_text", default="Stop chasing viral. Start serving one person. I make every episode for Sarah.")
    parser.add_argument("--niche", default="business")
    parser.add_argument("--creator", default="Marcus")
    args = parser.parse_args()

    run_experiments(args.session, args.clip_text, args.niche, args.creator)
