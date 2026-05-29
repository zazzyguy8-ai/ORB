'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Question } from '@/lib/questions'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  onAnswer: (answer: string) => void
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(option: string) {
    if (selected) return
    setSelected(option)

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 80])
    }

    setTimeout(() => {
      onAnswer(option)
    }, 600)
  }

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 py-16"
    >
      {/* Progress indicator */}
      <div className="fixed top-8 left-0 right-0 flex justify-center z-10">
        <div className="flex gap-1 items-center">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className="transition-all duration-500"
              style={{
                width: i < questionNumber ? '16px' : '4px',
                height: '2px',
                background: i < questionNumber
                  ? 'rgba(192, 132, 252, 0.9)'
                  : i === questionNumber - 1
                  ? 'rgba(192, 132, 252, 0.5)'
                  : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '1px',
              }}
            />
          ))}
        </div>
      </div>

      {/* Question number */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.2 }}
        className="text-xs tracking-[0.4em] uppercase text-orb-accent mb-12 font-thin"
      >
        {String(questionNumber).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
      </motion.p>

      {/* Question text */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-2xl md:text-4xl font-thin tracking-wide text-center text-orb-text max-w-2xl mb-16 leading-relaxed"
      >
        {question.text}
      </motion.h2>

      {/* Options */}
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        {question.options.map((option, i) => (
          <motion.button
            key={option}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
            onClick={() => handleSelect(option)}
            className={`
              w-full text-center py-3 px-6 font-light tracking-widest uppercase text-sm
              transition-all duration-300 relative
              ${selected === option
                ? 'text-orb-accent text-glow'
                : selected
                ? 'text-white/20'
                : 'text-orb-text/70 hover:text-orb-accent'
              }
            `}
            style={{
              textShadow: selected === option
                ? '0 0 20px rgba(192, 132, 252, 0.9), 0 0 40px rgba(123, 47, 190, 0.6)'
                : undefined,
            }}
          >
            {option}
            {selected === null && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-orb-accent transition-all duration-300 group-hover:w-full"
                style={{ width: 0 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Bottom gradient fade */}
      <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(transparent, #000)' }} />
    </motion.div>
  )
}
