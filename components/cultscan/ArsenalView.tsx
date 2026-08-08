'use client'

import type { VideoPack, PostPack, LaunchPack, VideoScript } from '@/lib/arsenal'
import { Panel, CopyButton } from './ui'

/** Turn a script into something you can paste into a doc and shoot from. */
function scriptToText(script: VideoScript): string {
  const lines = [
    `${script.title.toUpperCase()} — ${script.angle} (${script.lengthSeconds}s)`,
    '',
    `HOOK (on screen): ${script.hookText}`,
    `HOOK (voiceover): ${script.hookVoiceover}`,
    '',
    'SHOT LIST',
    ...script.beats.map(
      (beat) =>
        `${String(beat.atSecond).padStart(2, '0')}s | ${beat.visual}\n     TEXT: ${beat.onScreenText}\n     VO:   ${beat.voiceover}`
    ),
    '',
    `CAPTION: ${script.caption}`,
    `TAGS: ${script.hashtags.join(' ')}`,
    `CTA: ${script.cta}`,
    `WHY THEY STAY: ${script.retentionNote}`,
  ]
  return lines.join('\n')
}

export function VideoScripts({ pack }: { pack: VideoPack }) {
  return (
    <div className="space-y-4">
      {pack.scripts.map((script, index) => (
        <Panel key={index} title={`video ${index + 1} — ${script.angle}`}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-base text-cs-text">{script.title}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cs-dim mt-1">
                {script.lengthSeconds}s vertical
              </p>
            </div>
            <CopyButton text={scriptToText(script)} label="copy script" />
          </div>

          <div className="border border-cs-green/25 bg-cs-green/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cs-green">
              first two seconds
            </p>
            <p className="mt-1.5 text-base leading-snug text-cs-text">{script.hookText}</p>
            <p className="mt-1 text-sm text-cs-dim">VO: {script.hookVoiceover}</p>
          </div>

          <div className="mt-4 space-y-3">
            {script.beats.map((beat, beatIndex) => (
              <div key={beatIndex} className="flex gap-3 border-b border-cs-line/60 pb-3 last:border-0">
                <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-cs-green">
                  {String(beat.atSecond).padStart(2, '0')}s
                </span>
                <div className="space-y-1">
                  <p className="text-sm text-cs-text">{beat.onScreenText}</p>
                  <p className="text-sm text-cs-dim">VO: {beat.voiceover}</p>
                  <p className="font-mono text-[11px] leading-relaxed text-cs-dim/80">
                    {beat.visual}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-cs-line pt-4">
            <p className="text-sm text-cs-text">{script.caption}</p>
            <p className="font-mono text-xs text-cs-green">{script.hashtags.join('  ')}</p>
            <p className="text-sm text-cs-dim">CTA: {script.cta}</p>
            <p className="font-mono text-[11px] leading-relaxed text-cs-dim/80">
              Retention: {script.retentionNote}
            </p>
          </div>
        </Panel>
      ))}
    </div>
  )
}

export function Posts({ pack }: { pack: PostPack }) {
  return (
    <div className="space-y-4">
      <Panel title="posts">
        <div className="space-y-4">
          {pack.posts.map((post, index) => (
            <div key={index} className="border-b border-cs-line/60 pb-4 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm leading-relaxed text-cs-text">{post.text}</p>
                <CopyButton text={post.text} />
              </div>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cs-dim">
                {post.format} — {post.whyItWorks}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="meme concepts">
        <div className="space-y-5">
          {pack.memes.map((meme, index) => (
            <div key={index} className="border-l border-cs-line pl-4">
              <p className="text-sm text-cs-text">{meme.concept}</p>
              <p className="mt-2 font-mono text-xs text-cs-green">
                TOP: {meme.topText}
              </p>
              <p className="font-mono text-xs text-cs-green">BOTTOM: {meme.bottomText}</p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <p className="font-mono text-[11px] leading-relaxed text-cs-dim">
                  {meme.imagePrompt}
                </p>
                <CopyButton text={meme.imagePrompt} label="copy prompt" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export function Launch({ pack }: { pack: LaunchPack }) {
  return (
    <div className="space-y-4">
      <Panel title="telegram — pinned">
        <div className="flex items-start justify-between gap-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-cs-text">
            {pack.telegramPinned}
          </p>
          <CopyButton text={pack.telegramPinned} />
        </div>
      </Panel>

      <Panel title="telegram — launch announcement">
        <div className="flex items-start justify-between gap-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-cs-text">
            {pack.telegramAnnouncement}
          </p>
          <CopyButton text={pack.telegramAnnouncement} />
        </div>
      </Panel>

      <Panel title="discord — welcome">
        <div className="flex items-start justify-between gap-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-cs-text">
            {pack.discordWelcome}
          </p>
          <CopyButton text={pack.discordWelcome} />
        </div>
      </Panel>

      <Panel title="the questions they will actually ask">
        <div className="space-y-4">
          {pack.faq.map((entry, index) => (
            <div key={index} className="border-b border-cs-line/60 pb-4 last:border-0 last:pb-0">
              <p className="text-sm text-cs-green">{entry.question}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-cs-text">{entry.answer}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="seven-day calendar">
        <div className="space-y-5">
          {pack.calendar.map((day) => (
            <div key={day.day}>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cs-green">
                day {day.day} — {day.theme}
              </p>
              <div className="mt-2 space-y-2">
                {day.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex gap-3 text-sm">
                    <span className="w-28 shrink-0 font-mono text-[11px] text-cs-dim">
                      {slot.slot}
                    </span>
                    <span className="text-cs-text">
                      {slot.asset}
                      <span className="block text-cs-dim">{slot.reason}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="when the chart goes red">
        <p className="text-sm leading-relaxed text-cs-text">{pack.moderationNote}</p>
      </Panel>
    </div>
  )
}
