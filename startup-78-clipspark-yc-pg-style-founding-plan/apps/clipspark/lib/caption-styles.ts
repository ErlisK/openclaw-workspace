/**
 * Caption style definitions for ClipSpark.
 * Each style affects rendering spec sent to the render pipeline.
 */

export type CaptionStyleId =
  | 'default'
  | 'bold_highlight'
  | 'emoji_burst'
  | 'kinetic_lower'
  | 'minimal_top'
  | 'karaoke'

export interface CaptionStyle {
  id: CaptionStyleId
  label: string
  emoji: string
  description: string
  preview: string  // short example
  font: string
  fontWeight: 'normal' | 'bold' | 'black'
  fontSize: 'small' | 'medium' | 'large'
  position: 'top' | 'center' | 'bottom' | 'lower_third'
  highlightColor: string | null  // CSS color or null
  backgroundColor: string  // word bg
  textColor: string
  maxWordsPerLine: number
  addEmoji: boolean
  emojiPosition: 'before' | 'after' | null
  animationStyle: 'none' | 'pop' | 'slide' | 'bounce' | 'fade'
  useKaraoke: boolean  // highlight current word
  platforms: string[]  // which platforms this excels on
}

export const CAPTION_STYLES: Record<CaptionStyleId, CaptionStyle> = {
  default: {
    id: 'default',
    label: 'Classic',
    emoji: '💬',
    description: 'Clean white captions, bottom of frame',
    preview: 'This is the standard caption style',
    font: 'Inter',
    fontWeight: 'bold',
    fontSize: 'medium',
    position: 'bottom',
    highlightColor: null,
    backgroundColor: 'rgba(0,0,0,0.75)',
    textColor: '#FFFFFF',
    maxWordsPerLine: 6,
    addEmoji: false,
    emojiPosition: null,
    animationStyle: 'none',
    useKaraoke: false,
    platforms: ['YouTube Shorts', 'LinkedIn', 'Instagram Reels'],
  },
  bold_highlight: {
    id: 'bold_highlight',
    label: 'Bold Highlight',
    emoji: '🔥',
    description: 'Bold text with yellow highlight on key words',
    preview: 'KEY words get highlighted YELLOW',
    font: 'Montserrat',
    fontWeight: 'black',
    fontSize: 'large',
    position: 'center',
    highlightColor: '#FFE600',
    backgroundColor: 'transparent',
    textColor: '#FFFFFF',
    maxWordsPerLine: 4,
    addEmoji: false,
    emojiPosition: null,
    animationStyle: 'pop',
    useKaraoke: false,
    platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
  },
  emoji_burst: {
    id: 'emoji_burst',
    label: 'Emoji Burst',
    emoji: '🎉',
    description: 'Auto-inserts relevant emojis after sentences',
    preview: 'Caption text with emojis! 🚀',
    font: 'Inter',
    fontWeight: 'bold',
    fontSize: 'medium',
    position: 'bottom',
    highlightColor: null,
    backgroundColor: 'rgba(0,0,0,0.8)',
    textColor: '#FFFFFF',
    maxWordsPerLine: 5,
    addEmoji: true,
    emojiPosition: 'after',
    animationStyle: 'bounce',
    useKaraoke: false,
    platforms: ['TikTok', 'Instagram Reels'],
  },
  kinetic_lower: {
    id: 'kinetic_lower',
    label: 'Kinetic Lower Third',
    emoji: '📺',
    description: 'Animated lower third — professional broadcast look',
    preview: 'Speaker name & topic lower third',
    font: 'Roboto',
    fontWeight: 'bold',
    fontSize: 'small',
    position: 'lower_third',
    highlightColor: '#4F46E5',
    backgroundColor: '#1a1a2e',
    textColor: '#FFFFFF',
    maxWordsPerLine: 7,
    addEmoji: false,
    emojiPosition: null,
    animationStyle: 'slide',
    useKaraoke: false,
    platforms: ['LinkedIn', 'YouTube Shorts'],
  },
  minimal_top: {
    id: 'minimal_top',
    label: 'Minimal Top',
    emoji: '✨',
    description: 'Clean captions at the top, good for face-cam content',
    preview: 'Top caption — clean and minimal',
    font: 'Inter',
    fontWeight: 'normal',
    fontSize: 'small',
    position: 'top',
    highlightColor: null,
    backgroundColor: 'rgba(0,0,0,0.6)',
    textColor: '#F3F4F6',
    maxWordsPerLine: 7,
    addEmoji: false,
    emojiPosition: null,
    animationStyle: 'fade',
    useKaraoke: false,
    platforms: ['TikTok', 'Instagram Reels'],
  },
  karaoke: {
    id: 'karaoke',
    label: 'Karaoke',
    emoji: '🎤',
    description: "Highlights each word as it's spoken — highest retention",
    preview: 'Each word lights up as spoken',
    font: 'Montserrat',
    fontWeight: 'bold',
    fontSize: 'large',
    position: 'bottom',
    highlightColor: '#FF6B35',
    backgroundColor: 'transparent',
    textColor: '#FFFFFF',
    maxWordsPerLine: 4,
    addEmoji: false,
    emojiPosition: null,
    animationStyle: 'pop',
    useKaraoke: true,
    platforms: ['TikTok', 'YouTube Shorts', 'Instagram Reels'],
  },
}

export const CAPTION_STYLE_LIST = Object.values(CAPTION_STYLES)

// Language options
export interface LanguageOption {
  code: string
  label: string
  nativeName: string
  flag: string
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it', label: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', label: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
]

// Brand kit type
export interface BrandKit {
  primaryColor: string      // hex
  secondaryColor: string    // hex
  textColor: string         // hex
  fontFamily: string
  watermarkText: string | null
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null
  logoUrl: string | null
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  primaryColor: '#4F46E5',
  secondaryColor: '#7C3AED',
  textColor: '#FFFFFF',
  fontFamily: 'Inter',
  watermarkText: null,
  watermarkPosition: 'bottom-right',
  logoUrl: null,
}
