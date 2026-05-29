'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { QUESTIONS } from '@/lib/questions'
import QuestionCard from '@/components/QuestionCard'

const ParticleField = dynamic(() => import('@/components/ParticleField'), { ssr: false })

export default function QuestionsPage() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [hesitationTimes, setHesitationTimes] = useState<number[]>([])
  const [showPulse, setShowPulse] = useState(false)
  const questionStartTime = useRef<number>(Date.now())

  useEffect(() => {
    // Resume from saved progress if any
    const savedAnswers = localStorage.getItem('orb-answers')
    const savedHesitations = localStorage.getItem('orb-hesitations')
    if (savedAnswers && savedHesitations) {
      const parsedAnswers = JSON.parse(savedAnswers) as string[]
      const parsedHesitations = JSON.parse(savedHesitations) as number[]
      if (parsedAnswers.length < QUESTIONS.length) {
        setCurrentIndex(parsedAnswers.length)
        setAnswers(parsedAnswers)
        setHesitationTimes(parsedHesitations)
      }
    }
    questionStartTime.current = Date.now()
  }, [])

  // Reset timer on question change
  useEffect(() => {
    questionStartTime.current = Date.now()
  }, [currentIndex])

  function handleAnswer(answer: string) {
    const elapsed = Date.now() - questionStartTime.current
    const newAnswers = [...answers, answer]
    const newHesitations = [...hesitationTimes, elapsed]

    setAnswers(newAnswers)
    setHesitationTimes(newHesitations)

    // Pulse animation
    setShowPulse(true)
    setTimeout(() => setShowPulse(false), 600)

    // Save progress
    localStorage.setItem('orb-answers', JSON.stringify(newAnswers))
    localStorage.setItem('orb-hesitations', JSON.stringify(newHesitations))

    if (currentIndex + 1 >= QUESTIONS.length) {
      // All questions done
      localStorage.setItem('orb-question-texts', JSON.stringify(QUESTIONS.map(q => q.text)))
      setTimeout(() => router.push('/reading'), 800)
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  const currentQuestion = QUESTIONS[currentIndex]

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black">
      <ParticleField />

      {/* Subtle orb glow in corner */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
        style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(123, 47, 190, 0.08) 0%, transparent 70%)',
          animation: showPulse ? 'none' : undefined,
          transform: showPulse
            ? 'translate(-50%, -50%) scale(1.4)'
            : 'translate(-50%, -50%) scale(1)',
          transition: 'transform 0.5s ease-in-out, opacity 0.5s ease',
        }}
      />

      <AnimatePresence mode="wait">
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={QUESTIONS.length}
          onAnswer={handleAnswer}
        />
      </AnimatePresence>
    </main>
  )
}
