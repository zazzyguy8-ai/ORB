'use client'

import { useState, type ReactNode } from 'react'

/** Small shared pieces so the report components stay about the content. */

export function Panel({
  title,
  children,
  accent,
}: {
  title?: string
  children: ReactNode
  accent?: boolean
}) {
  return (
    <section
      className={`border ${
        accent ? 'border-cs-green/30' : 'border-cs-line'
      } bg-cs-panel/60 backdrop-blur-sm`}
    >
      {title && (
        <h2 className="border-b border-cs-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cs-dim">
          {title}
        </h2>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0 border-b border-cs-line/60 last:border-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cs-dim mb-1.5">
        {label}
      </div>
      <div className="text-sm leading-relaxed text-cs-text">{children}</div>
    </div>
  )
}

export function Severity({ level }: { level: string }) {
  const normalised = level.trim().toLowerCase()
  const tone =
    normalised === 'high'
      ? 'border-cs-red/50 text-cs-red'
      : normalised === 'medium'
      ? 'border-cs-amber/50 text-cs-amber'
      : 'border-cs-dim/40 text-cs-dim'
  return (
    <span
      className={`inline-block border ${tone} px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em]`}
    >
      {level}
    </span>
  )
}

export function CopyButton({ text, label = 'copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('done')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="font-mono text-[10px] uppercase tracking-[0.2em] text-cs-dim hover:text-cs-green transition-colors"
    >
      {state === 'done' ? 'copied' : state === 'failed' ? 'select manually' : label}
    </button>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs text-cs-dim">
      <span className="inline-block h-2 w-2 animate-pulse bg-cs-green" />
      {label}
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="border border-cs-red/40 bg-cs-red/5 px-3 py-2 font-mono text-xs leading-relaxed text-cs-red">
      {message}
    </p>
  )
}
