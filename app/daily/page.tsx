'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { getDailyMessage, getDayNumber } from '@/lib/archetypes'
import { OrbReading } from '@/lib/claude'

const OrbCanvas = dynamic(() => import('@/components/OrbCanvas'), { ssr: false })

interface DailyState {
  reading: OrbReading
  dayNumber: number
  message: string
  choiceA: string
  choiceB: string
  outcomeA: string
  outcomeB: string
  choiceMade: string | null
  outcome: string | null
}

export default function DailyPage() {
  const router = useRouter()
  const [state, setState] = useState<DailyState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const savedReading = localStorage.getItem('orb-reading')
    if (!savedReading) {
      router.push('/')
      return
    }

    try {
      const reading = JSON.parse(savedReading) as OrbReading

      let firstVisit = localStorage.getItem('orb-first-visit')
      if (!firstVisit) {
        firstVisit = new Date().toISOString()
        localStorage.setItem('orb-first-visit', firstVisit)
      }

      const dayNumber = getDayNumber(firstVisit)

      // Get or generate today's daily message
      const todayKey = `orb-daily-${dayNumber}`
      let dailyData = localStorage.getItem(todayKey)
      let parsedDaily: {
        message: string
        choiceA: string
        choiceB: string
        outcomeA: string
        outcomeB: string
        choiceMade?: string
        outcome?: string
      }

      if (dailyData) {
        parsedDaily = JSON.parse(dailyData)
      } else {
        const pool = getDailyMessage(dayNumber - 1)
        parsedDaily = {
          message: pool.message,
          choiceA: pool.choiceA,
          choiceB: pool.choiceB,
          outcomeA: pool.outcomeA,
          outcomeB: pool.outcomeB,
        }
        localStorage.setItem(todayKey, JSON.stringify(parsedDaily))
      }

      setState({
        reading,
        dayNumber,
        message: parsedDaily.message,
        choiceA: parsedDaily.choiceA,
        choiceB: parsedDaily.choiceB,
        outcomeA: parsedDaily.outcomeA,
        outcomeB: parsedDaily.outcomeB,
        choiceMade: parsedDaily.choiceMade ?? null,
        outcome: parsedDaily.outcome ?? null,
      })

      setLoaded(true)
    } catch {
      router.push('/')
    }
  }, [router])

  function makeChoice(choice: 'A' | 'B') {
    if (!state || state.choiceMade) return

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 20, 60])
    }

    setPulse(true)
    setTimeout(() => setPulse(false), 600)

    const outcome = choice === 'A' ? state.outcomeA : state.outcomeB
    const choiceText = choice === 'A' ? state.choiceA : state.choiceB

    const newState = { ...state, choiceMade: choiceText, outcome }
    setState(newState)

    // Persist choice
    const todayKey = `orb-daily-${state.dayNumber}`
    const saved = localStorage.getItem(todayKey)
    if (saved) {
      const parsed = JSON.parse(saved)
      parsed.choiceMade = choiceText
      parsed.outcome = outcome
      localStorage.setItem(todayKey, JSON.stringify(parsed))
    }
  }

  if (!loaded || !state) return null

  const { reading, dayNumber, message, choiceA, choiceB, outcome, choiceMade } = state

  // Format cryptic date
  const now = new Date()
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const crypticDate = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

  return (
    <main className="relative min-h-screen w-full bg-black flex flex-col items-center overflow-hidden">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(74, 14, 143, 0.15) 0%, transparent 60%)',
        }}
      />

      {/* Orb at top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="relative z-10 pt-12 flex flex-col items-center"
      >
        <OrbCanvas size="sm" pulse={pulse} />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.5 }}
          className="text-xs tracking-[0.5em] uppercase font-thin text-orb-accent/50 mt-4"
        >
          DIRE ORB
        </motion.p>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-6 mt-12 space-y-10 pb-24">

        {/* Day counter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-center space-y-1"
        >
          <p className="text-xs tracking-[0.5em] uppercase font-thin text-orb-accent/50">
            Day {dayNumber} of your current timeline
          </p>
          <p className="text-xs tracking-[0.3em] font-thin text-orb-text/25">
            {crypticDate}
          </p>
        </motion.div>

        {/* Daily message */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-center"
        >
          <p className="text-lg md:text-xl font-extralight italic text-orb-text/80 leading-relaxed tracking-wide">
            &ldquo;{message}&rdquo;
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="flex items-center gap-4"
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-orb-violet/30" />
          <div className="w-1 h-1 rounded-full bg-orb-accent/40" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-orb-violet/30" />
        </motion.div>

        {/* Choice / Outcome */}
        <AnimatePresence mode="wait">
          {!choiceMade ? (
            <motion.div
              key="choices"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 2, duration: 0.8 }}
              className="space-y-4"
            >
              <p className="text-xs tracking-[0.4em] uppercase font-thin text-orb-text/30 text-center">
                The orb presents a choice
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => makeChoice('A')}
                  className="w-full py-4 px-6 text-center font-light tracking-widest uppercase text-sm text-orb-text/70 hover:text-orb-accent transition-all duration-300 border border-orb-violet/20 hover:border-orb-accent/40 hover:bg-orb-violet/5"
                >
                  {choiceA}
                </button>

                <button
                  onClick={() => makeChoice('B')}
                  className="w-full py-4 px-6 text-center font-light tracking-widest uppercase text-sm text-orb-text/70 hover:text-orb-accent transition-all duration-300 border border-orb-violet/20 hover:border-orb-accent/40 hover:bg-orb-violet/5"
                >
                  {choiceB}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="outcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-3"
            >
              <p className="text-xs tracking-[0.4em] uppercase font-thin text-orb-accent/50">
                You chose
              </p>
              <p className="font-thin tracking-[0.2em] uppercase text-sm text-orb-accent text-glow-sm">
                {choiceMade}
              </p>
              <p className="font-extralight italic text-orb-text/70 leading-relaxed tracking-wide mt-4">
                &ldquo;{outcome}&rdquo;
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Archetype footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="text-center pt-8 border-t border-orb-violet/10"
        >
          <p className="text-xs tracking-[0.3em] font-thin text-orb-text/25 uppercase">
            The {reading.archetype} path continues.
          </p>
        </motion.div>

        {/* Nav to result */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          className="text-center"
        >
          <button
            onClick={() => router.push('/result')}
            className="text-xs tracking-[0.4em] uppercase font-thin text-orb-text/20 hover:text-orb-text/50 transition-colors"
          >
            View your reading
          </button>
        </motion.div>
      </div>
    </main>
  )
}
