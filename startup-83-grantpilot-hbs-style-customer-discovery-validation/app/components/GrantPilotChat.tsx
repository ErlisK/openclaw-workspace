'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect } from 'react'

interface GrantPilotChatProps {
  context?: Record<string, unknown>
  className?: string
  placeholder?: string
}

export default function GrantPilotChat({ context, className = '', placeholder = 'Ask your Grant Pilot anything...' }: GrantPilotChatProps) {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      body: { context },
    }),
  })
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const sendSuggestion = (text: string) => {
    sendMessage({ text })
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Chat window */}
      {isOpen && (
        <div className="mb-3 w-96 max-h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">GP</div>
              <div>
                <div className="font-semibold text-sm">Grant Pilot AI</div>
                <div className="text-xs text-blue-100">Grant strategy assistant</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors text-lg leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[420px] bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">✈️</div>
                <p className="text-sm text-gray-500 font-medium">Your Grant Pilot is ready</p>
                <p className="text-xs text-gray-400 mt-1">Ask about grant strategy, RFP analysis, or writing tips</p>
                <div className="mt-4 space-y-2">
                  {[
                    'How do I improve my win score?',
                    'What makes a strong problem statement?',
                    'How should I structure my budget narrative?',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => sendSuggestion(suggestion)}
                      className="block w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.parts?.map((part, i) =>
                      part.type === 'text' ? <span key={i}>{part.text}</span> : null
                    ) ?? (typeof (message as { content?: string }).content === 'string' ? (message as { content?: string }).content : '')}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-500 text-center py-2">
                Something went wrong. Please try again.
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 bg-white flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↑
            </button>
          </form>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center text-2xl"
        title="Grant Pilot AI"
      >
        {isOpen ? '×' : '✈️'}
      </button>
    </div>
  )
}
