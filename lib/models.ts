/**
 * Single source of truth for which Claude model each surface runs on.
 * Keeping this in one file means a model change is one edit, not a grep.
 */

export const ORB_MODEL = 'claude-opus-5'

/**
 * Effort controls how much the model deliberates before writing.
 * These are creative-writing surfaces, not reasoning ones — low/medium keeps
 * latency and cost down without touching output quality.
 */
export const EFFORT = {
  /** Free quiz reading + daily message. High volume, must feel instant. */
  fast: 'low',
  /** Paid deep scan + video studio. Longer, more structured output. */
  deep: 'medium',
} as const
