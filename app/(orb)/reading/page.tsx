'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const OrbCanvas = dynamic(() => import('@/components/OrbCanvas'), { ssr: false })

export default function ReadingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'reading' | 'error'>('reading')
  const [errorMsg, setErrorMsg] = useState('')
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    // Validate we have answers
    const answers = localStorage.getItem('orb-answers')
    const hesitations = localStorage.getItem('orb-hesitations')
    const questionTexts = localStorage.getItem('orb-question-texts')

    if (!answers || !hesitations || !questionTexts) {
      router.push('/orb')
      return
    }

    // Start pulsing
    const pulseInterval = setInterval(() => {
      setPulseKey(k => k + 1)
    }, 1500)

    // Call API after a brief dramatic pause
    const apiTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: JSON.parse(answers),
            hesitationTimes: JSON.parse(hesitations),
            questionTexts: JSON.parse(questionTexts),
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Reading failed')
        }

        const reading = await res.json()
        localStorage.setItem('orb-reading', JSON.stringify(reading))

        // Set first visit date if not set
        if (!localStorage.getItem('orb-first-visit')) {
          localStorage.setItem('orb-first-visit', new Date().toISOString())
        }

        // Clear question progress
        localStorage.removeItem('orb-answers')
        localStorage.removeItem('orb-hesitations')
        localStorage.removeItem('orb-question-texts')

        clearInterval(pulseInterval)
        router.push('/result')
      } catch (err: unknown) {
        clearInterval(pulseInterval)
        setStatus('error')
        setErrorMsg(err instanceof Error ? err.message : 'The orb encountered an error.')
      }
    }, 3500)

    return () => {
      clearInterval(pulseInterval)
      clearTimeout(apiTimer)
    }
  }, [router])

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* Expanding glow backdrop */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(ellipse at center, rgba(123, 47, 190, 0.1) 0%, transparent 60%)',
            'radial-gradient(ellipse at center, rgba(123, 47, 190, 0.3) 0%, transparent 70%)',
            'radial-gradient(ellipse at center, rgba(123, 47, 190, 0.1) 0%, transparent 60%)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orb */}
      <motion.div
        className="relative z-10"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <OrbCanvas size="lg" pulse={true} className="w-72 h-72 md:w-96 md:h-96" />
      </motion.div>

      {/* Status text */}
      <motion.div
        className="relative z-10 mt-12 text-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        {status === 'reading' ? (
          <>
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-sm tracking-[0.4em] uppercase font-thin text-orb-accent mb-3"
            >
              The orb is reading your frequency...
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 1.5 }}
              className="text-xs tracking-[0.3em] uppercase font-thin text-orb-text/40"
            >
              Do not look away
            </motion.p>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm tracking-[0.3em] uppercase font-thin text-orb-danger">
              The signal was interrupted
            </p>
            <p className="text-xs font-light text-orb-text/50">{errorMsg}</p>
            <button
              onClick={() => router.push('/orb')}
              className="text-xs tracking-[0.3em] uppercase font-thin text-orb-accent/70 hover:text-orb-accent transition-colors mt-4"
            >
              Return to the beginning
            </button>
          </div>
        )}
      </motion.div>
    </main>
  )
}
