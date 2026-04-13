/**
 * useTTS — optional Text-to-Speech hook using Web Speech API
 *
 * Works on:  iPad Safari (iOS 7+), Chrome (desktop/Android), Firefox
 * Opt-in:   User must explicitly enable TTS (auto-speech is disabled by default,
 *           which also avoids browser autoplay policy blocks)
 * COPPA:    No data leaves the device — all synthesis is local
 */
'use client'

import { useCallback, useEffect, useState } from 'react'

export interface TTSOptions {
  rate?: number   // 0.1–10, default 0.88 (slightly slower for kids)
  pitch?: number  // 0–2,   default 1.1  (slightly higher / friendlier)
  lang?: string   // BCP 47 tag, default 'en-US'
}

export function useTextToSpeech(opts: TTSOptions = {}) {
  const [enabled,   setEnabled]   = useState(false)
  const [speaking,  setSpeaking]  = useState(false)
  const [supported, setSupported] = useState(false)
  const { rate = 0.88, pitch = 1.1, lang = 'en-US' } = opts

  // Detect support client-side only (SSR safe)
  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  // Cancel speech when disabled
  useEffect(() => {
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [enabled])

  // iOS Safari workaround: speechSynthesis pauses when tab goes to background
  useEffect(() => {
    if (!supported) return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [supported])

  const speak = useCallback((text: string) => {
    if (!enabled || !supported || !text.trim()) return

    // Cancel any current speech before new utterance
    window.speechSynthesis.cancel()

    const utter = new SpeechSynthesisUtterance(text.trim())
    utter.rate  = rate
    utter.pitch = pitch
    utter.lang  = lang

    utter.onstart = () => setSpeaking(true)
    utter.onend   = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)

    // iOS Safari: voices load async — wait for them if needed
    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      // Prefer an en-US voice if available
      const preferred = voices.find(v => v.lang.startsWith('en') && !v.name.includes('com.apple'))
        ?? voices.find(v => v.lang.startsWith('en'))
      if (preferred) utter.voice = preferred
      window.speechSynthesis.speak(utter)
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak()
    } else {
      // Voices not yet loaded (common on first call, especially iOS)
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak()
      }
      // Fallback: speak anyway after short delay
      setTimeout(doSpeak, 200)
    }
  }, [enabled, supported, rate, pitch, lang])

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const toggle = useCallback(() => {
    setEnabled(e => {
      if (e && supported) window.speechSynthesis.cancel()
      return !e
    })
  }, [supported])

  return {
    enabled,    // whether TTS is turned on by the user
    supported,  // whether browser supports Web Speech API
    speaking,   // currently synthesising
    speak,      // speak(text) — no-op if disabled or unsupported
    stop,       // cancel current speech
    toggle,     // toggle enabled on/off
    setEnabled,
  }
}
