'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

const OrbCanvas = dynamic(() => import('@/components/OrbCanvas'), { ssr: false })

export default function LandingPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'loading' | 'ambient' | 'ready' | 'expanding'>('loading')
  const [returningUser, setReturningUser] = useState<string | null>(null)
  const [canClick, setCanClick] = useState(false)

  useEffect(() => {
    // Check if returning user
    const savedResult = localStorage.getItem('orb-reading')
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult)
        setReturningUser(parsed.archetype)
      } catch {
        // ignore
      }
    }

    // Phase progression
    const t1 = setTimeout(() => setPhase('ambient'), 2000)
    const t2 = setTimeout(() => {
      setPhase('ready')
      setCanClick(true)
    }, 4000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const handleBegin = useCallback(() => {
    if (!canClick) return
    setPhase('expanding')
    setTimeout(() => {
      if (returningUser) {
        router.push('/daily')
      } else {
        router.push('/questions')
      }
    }, 1200)
  }, [canClick, returningUser, router])

  return (
    <main
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      onClick={handleBegin}
    >
      {/* Orb */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        animate={phase === 'expanding' ? { scale: 8, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <OrbCanvas size="md" />

        {/* Glow rings around orb */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: '0 0 60px rgba(123, 47, 190, 0.4), 0 0 120px rgba(74, 14, 143, 0.2)',
            animation: 'glow 3s ease-in-out infinite alternate',
          }}
        />
      </motion.div>

      {/* Ambient text */}
      <AnimatePresence>
        {phase !== 'loading' && (
          <motion.div
            key="ambient-text"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="absolute bottom-1/3 text-center z-10 px-6"
          >
            {returningUser ? (
              <div className="space-y-2">
                <p className="text-xs tracking-[0.5em] uppercase text-orb-accent/50 font-thin">
                  The orb remembers you
                </p>
                <p className="text-lg font-thin tracking-[0.3em] uppercase text-orb-accent text-glow-sm">
                  {returningUser}
                </p>
              </div>
            ) : (
              <p className="text-sm md:text-base font-thin tracking-[0.3em] uppercase text-orb-text/50">
                The orb already remembers you.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click prompt */}
      <AnimatePresence>
        {phase === 'ready' && (
          <motion.div
            key="click-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute bottom-16 text-center z-10"
          >
            <motion.p
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-xs tracking-[0.5em] uppercase font-thin"
              style={{ color: 'rgba(192, 132, 252, 0.5)' }}
            >
              {returningUser ? 'Enter the orb' : 'Tap anywhere to begin'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIRE ORB title */}
      <motion.div
        className="absolute top-10 left-0 right-0 text-center z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.5, duration: 2 }}
      >
        <p className="text-xs tracking-[0.8em] uppercase font-thin text-orb-accent/40">
          DIRE ORB
        </p>
      </motion.div>
    </main>
  )
}
