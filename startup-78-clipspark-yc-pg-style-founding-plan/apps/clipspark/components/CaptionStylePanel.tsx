'use client'
import { useState } from 'react'
import { CAPTION_STYLE_LIST, SUPPORTED_LANGUAGES, DEFAULT_BRAND_KIT } from '@/lib/caption-styles'
import type { CaptionStyleId, BrandKit } from '@/lib/caption-styles'

interface Props {
  captionStyle: CaptionStyleId
  captionLanguage: string
  brandKit: BrandKit
  onChangeCaptionStyle: (id: CaptionStyleId) => void
  onChangeLanguage: (lang: string) => void
  onChangeBrandKit: (kit: BrandKit) => void
  platform?: string
}

const BRAND_FONTS = ['Inter', 'Montserrat', 'Roboto', 'Poppins', 'Oswald', 'Playfair Display']

export function CaptionStylePanel({
  captionStyle,
  captionLanguage,
  brandKit,
  onChangeCaptionStyle,
  onChangeLanguage,
  onChangeBrandKit,
  platform = 'YouTube Shorts',
}: Props) {
  const [tab, setTab] = useState<'style' | 'language' | 'brand'>('style')
  const [brandOpen, setBrandOpen] = useState(false)

  const currentStyle = CAPTION_STYLE_LIST.find(s => s.id === captionStyle)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800">
        {[
          { id: 'style', label: '💬 Style' },
          { id: 'language', label: '🌐 Language' },
          { id: 'brand', label: '🎨 Brand' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex-1 text-xs py-2.5 px-3 font-medium transition-colors ${
              tab === t.id
                ? 'bg-gray-800 text-white border-b-2 border-indigo-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ── Caption Style ── */}
        {tab === 'style' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-3">Choose how captions appear in the final clip.</p>
            <div className="grid grid-cols-2 gap-2">
              {CAPTION_STYLE_LIST.map(style => {
                const isSelected = captionStyle === style.id
                const isRecommended = style.platforms.includes(platform)
                return (
                  <button
                    key={style.id}
                    onClick={() => onChangeCaptionStyle(style.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-900/30 ring-1 ring-indigo-500/50'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{style.emoji}</span>
                      {isRecommended && (
                        <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded-full">
                          ✓ Good for {platform.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-xs text-white">{style.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-tight">{style.description}</div>
                    {style.useKaraoke && (
                      <div className="mt-1.5 text-xs text-orange-400">🎤 word-by-word highlight</div>
                    )}
                    {style.addEmoji && (
                      <div className="mt-1.5 text-xs text-yellow-400">auto-emoji 🎉</div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Preview text */}
            {currentStyle && (
              <div
                className="mt-3 rounded-xl p-4 text-center font-bold text-sm"
                style={{
                  background: currentStyle.backgroundColor,
                  color: currentStyle.textColor,
                  fontFamily: currentStyle.font,
                }}
              >
                {currentStyle.addEmoji ? `${currentStyle.preview} 🎉` : currentStyle.preview}
                {currentStyle.highlightColor && (
                  <span style={{ color: currentStyle.highlightColor }}> ← highlighted</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Language ── */}
        {tab === 'language' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-3">
              Select caption language. If different from source language, ClipSpark will translate captions.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => onChangeLanguage(lang.code)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                    captionLanguage === lang.code
                      ? 'border-indigo-600 bg-indigo-900/30 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="text-left">
                    <div className="text-xs font-medium">{lang.label}</div>
                    <div className="text-xs text-gray-600">{lang.nativeName}</div>
                  </div>
                  {captionLanguage === lang.code && (
                    <span className="ml-auto text-indigo-400 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
            {captionLanguage !== 'en' && (
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-3 text-xs text-blue-300">
                📝 Captions will be translated to {SUPPORTED_LANGUAGES.find(l => l.code === captionLanguage)?.label}.
                Translation adds ~30s to render time.
              </div>
            )}
          </div>
        )}

        {/* ── Brand Kit ── */}
        {tab === 'brand' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 mb-3">
              Brand colours and font applied to captions and lower thirds.
            </p>

            <div className="space-y-3">
              {/* Primary colour */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Primary colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandKit.primaryColor}
                    onChange={e => onChangeBrandKit({ ...brandKit, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-700"
                  />
                  <span className="text-xs font-mono text-gray-500">{brandKit.primaryColor}</span>
                </div>
              </div>

              {/* Secondary colour */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Accent colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandKit.secondaryColor}
                    onChange={e => onChangeBrandKit({ ...brandKit, secondaryColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-700"
                  />
                  <span className="text-xs font-mono text-gray-500">{brandKit.secondaryColor}</span>
                </div>
              </div>

              {/* Font */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Caption font</label>
                <select
                  value={brandKit.fontFamily}
                  onChange={e => onChangeBrandKit({ ...brandKit, fontFamily: e.target.value })}
                  className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5"
                >
                  {BRAND_FONTS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Watermark text */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Watermark text</label>
                <input
                  type="text"
                  value={brandKit.watermarkText || ''}
                  onChange={e => onChangeBrandKit({ ...brandKit, watermarkText: e.target.value || null })}
                  placeholder="@yourhandle or yourbrand.com"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 placeholder-gray-600"
                />
              </div>

              {/* Watermark position */}
              {brandKit.watermarkText && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Watermark position</label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(pos => (
                      <button
                        key={pos}
                        onClick={() => onChangeBrandKit({ ...brandKit, watermarkPosition: pos })}
                        className={`text-xs py-1.5 rounded-lg border transition-colors ${
                          brandKit.watermarkPosition === pos
                            ? 'border-indigo-600 bg-indigo-900/30 text-indigo-300'
                            : 'border-gray-700 text-gray-500 hover:border-gray-600'
                        }`}
                      >
                        {pos.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reset */}
            <button
              onClick={() => onChangeBrandKit(DEFAULT_BRAND_KIT)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Reset to default
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
