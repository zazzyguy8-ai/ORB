'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import ResultCard from '@/components/ResultCard'
import { OrbReading } from '@/lib/claude'

const OrbCanvas = dynamic(() => import('@/components/OrbCanvas'), { ssr: false })

export default function ResultPage() {
  const router = useRouter()
  const [reading, setReading] = useState<OrbReading | null>(null)
  const [orbPhase, setOrbPhase] = useState<'bright' | 'shrinking' | 'small'>('bright')
  const [showContent, setShowContent] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('orb-reading')
    if (!saved) {
      router.push('/orb')
      return
    }

    try {
      const parsed = JSON.parse(saved) as OrbReading
      setReading(parsed)
    } catch {
      router.push('/orb')
      return
    }

    // Orb animation sequence
    const t1 = setTimeout(() => setOrbPhase('shrinking'), 800)
    const t2 = setTimeout(() => {
      setOrbPhase('small')
      setShowContent(true)
    }, 2000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [router])

  function handleEnterOrb() {
    router.push('/daily')
  }

  async function handleShare() {
    if (!reading) return

    const shareText = `I am ${reading.archetype}\n\n"${reading.essence}"\n\n${reading.orbSpeaks}\n\n— DIRE ORB`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `DIRE ORB: ${reading.archetype}`,
          text: shareText,
        })
      } catch {
        // User cancelled or share failed
        await copyToClipboard(shareText)
      }
    } else {
      await copyToClipboard(shareText)
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setShareMessage('Copied to clipboard')
      setTimeout(() => setShareMessage(''), 3000)
    } catch {
      setShareMessage('Unable to copy')
      setTimeout(() => setShareMessage(''), 3000)
    }
  }

  if (!reading) return null

  return (
    <main className="relative min-h-screen w-full bg-black overflow-x-hidden">
      {/* Orb at top */}
      <AnimatePresence>
        <motion.div
          key="orb-container"
          className="flex items-center justify-center sticky top-0 z-20 pt-8 pb-4"
          animate={
            orbPhase === 'bright'
              ? { scale: 2, opacity: 1 }
              : orbPhase === 'shrinking'
              ? { scale: 1.2, opacity: 0.9 }
              : { scale: 1, opacity: 0.8 }
          }
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          style={{
            background: orbPhase === 'bright'
              ? 'radial-gradient(ellipse at center, rgba(123,47,190,0.4) 0%, transparent 70%)'
              : 'transparent',
          }}
        >
          <OrbCanvas size="sm" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative z-10 pb-24"
          >
            <ResultCard reading={reading} />

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4.5, duration: 0.8 }}
              className="flex flex-col items-center gap-4 px-6 pt-8 pb-16"
            >
              <button
                onClick={handleEnterOrb}
                className="px-8 py-3 text-xs tracking-[0.4em] uppercase font-thin text-orb-accent border border-orb-violet/30 hover:border-orb-accent/60 transition-all duration-500 hover:bg-orb-violet/10"
                style={{
                  boxShadow: '0 0 20px rgba(123, 47, 190, 0.2)',
                }}
              >
                Enter the Orb
              </button>

              <button
                onClick={handleShare}
                className="text-xs tracking-[0.4em] uppercase font-thin text-orb-text/40 hover:text-orb-text/70 transition-colors"
              >
                Share your reading
              </button>

              {shareMessage && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-thin text-orb-accent/60 tracking-wider"
                >
                  {shareMessage}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side glow */}
      <div
        className="fixed left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(123, 47, 190, 0.3), transparent)',
        }}
      />
      <div
        className="fixed right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(123, 47, 190, 0.3), transparent)',
        }}
      />
    </main>
  )
}
