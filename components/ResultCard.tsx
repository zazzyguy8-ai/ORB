'use client'

import { motion } from 'framer-motion'
import { OrbReading } from '@/lib/claude'

interface ResultCardProps {
  reading: OrbReading
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.4, duration: 0.8, ease: 'easeOut' },
  }),
}

export default function ResultCard({ reading }: ResultCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8 space-y-10">
      {/* YOU ARE / Archetype */}
      <motion.div
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <p className="text-xs tracking-[0.5em] text-orb-accent/60 uppercase font-thin mb-3">
          You are
        </p>
        <h1
          className="text-3xl md:text-5xl font-thin tracking-[0.3em] uppercase text-glow"
          style={{ color: '#C084FC' }}
        >
          {reading.archetype}
        </h1>
      </motion.div>

      {/* Essence */}
      <motion.div
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <p className="text-lg md:text-xl font-extralight italic text-orb-text/90 leading-relaxed tracking-wide">
          &ldquo;{reading.essence}&rdquo;
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-4"
      >
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-orb-violet/40" />
        <div className="w-1 h-1 rounded-full bg-orb-accent/60" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-orb-violet/40" />
      </motion.div>

      {/* Traits */}
      <motion.div
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <p className="text-xs tracking-[0.4em] uppercase text-orb-accent/60 font-thin">Traits</p>
        <div className="space-y-2">
          {reading.traits.map((trait, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-orb-accent/60 text-xs">•</span>
              <span className="font-light tracking-wide text-orb-text/80 capitalize">{trait}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        <p className="text-xs tracking-[0.4em] uppercase text-orb-accent/60 font-thin">Timeline</p>
        <p className="font-extralight italic text-orb-text/80 tracking-wide leading-relaxed">
          &ldquo;{reading.timeline}&rdquo;
        </p>
      </motion.div>

      {/* Danger */}
      <motion.div
        custom={5}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        <p className="text-xs tracking-[0.4em] uppercase font-thin" style={{ color: '#DC2626' }}>
          Danger
        </p>
        <p
          className="font-extralight italic tracking-wide leading-relaxed"
          style={{ color: 'rgba(220, 38, 38, 0.8)' }}
        >
          &ldquo;{reading.danger}&rdquo;
        </p>
      </motion.div>

      {/* Potential */}
      <motion.div
        custom={6}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        <p className="text-xs tracking-[0.4em] uppercase text-orb-accent/60 font-thin">Potential</p>
        <p className="font-extralight italic text-orb-text/80 tracking-wide leading-relaxed">
          &ldquo;{reading.potential}&rdquo;
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div
        custom={7}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-4"
      >
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-orb-violet/40" />
        <div className="w-2 h-2 rounded-full bg-orb-accent/40" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-orb-violet/40" />
      </motion.div>

      {/* The Orb Speaks */}
      <motion.div
        custom={8}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-center space-y-3 pb-4"
      >
        <p className="text-xs tracking-[0.4em] uppercase text-orb-accent/60 font-thin">
          The Orb Speaks
        </p>
        <p
          className="text-lg md:text-xl font-extralight italic tracking-wide leading-relaxed text-glow"
          style={{ color: '#C084FC' }}
        >
          &ldquo;{reading.orbSpeaks}&rdquo;
        </p>
      </motion.div>
    </div>
  )
}
