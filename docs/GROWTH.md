# Organic growth plan

No ads, no paid influencers, no bought engagement. This is the plan for getting
the first thousand people to use ORB Signal using only things that are free and
honest.

Read the last section first if you read nothing else — the things that will get
the account banned and the product dismissed are more important than the things
that will get it noticed.

---

## 0. The precondition

**Nothing here works until the track record has data in it.**

The entire argument for this product is "we publish what our calls were worth."
Right now that page is empty, which makes every claim on the landing page an
assertion rather than evidence. Until it fills, there is nothing to post that a
sceptical trader would find interesting.

Two things fix it, both already built and both waiting on you:

1. **Point a scheduler at `POST /api/cron/snapshots`** (cron-job.org, free,
   every minute) with the `CRON_SECRET` bearer token. Without it, checkpoints
   that come due while nobody is browsing are marked stale and thrown away.
2. **Run analyses daily.** Twenty to thirty real tokens a day, every day, for
   two weeks. Not to look busy — the scoreboard hides a cell until it has 20
   outcomes behind it, so this is the minimum to make it say anything at all.
   Pick tokens you would genuinely be looking at anyway; the sample is honest
   only if it is not curated for flattering results.

Two weeks of that produces the only asset that matters: a page of falsifiable
claims, made before the outcome was known. **Do not start promoting before it
exists.** A launch into an empty scoreboard burns the one thing you cannot get
back, which is the first impression of the people most likely to care.

---

## 1. The one-line pitch

Every post, comment and reply comes back to a single sentence. Rehearse it until
it is boring:

> **Paste a Solana contract, get BUY / WATCH / AVOID in two seconds — and every
> call it has ever made is published with what happened next.**

The second half is the whole differentiator. Anyone can ship a scanner; almost
nobody publishes their hit rate. Lead with the receipts, not the AI. "AI" is a
negative signal in crypto communities right now — it reads as "wrapper". "Here
is my model's public scoreboard, tear it apart" reads as confidence.

---

## 2. What to post: the content engine

The product generates its own content. There are exactly three formats and they
run forever:

**The daily call.** One token, the analysis permalink, the reasoning in a
sentence. Post it *before* the outcome exists. This is the entire credibility
play — anyone can post winners after the fact, and everyone in that audience
knows it.

**The receipt.** Twenty-four hours later, the same permalink, now with its
checkpoints filled in. Post the losses with exactly the same energy as the wins.
A visible loss is worth more than a win here: it proves the wins were not
selected. This is the single most effective thing you can do, and almost nobody
in this space is willing to do it.

**The weekly scoreboard.** Every Sunday, a screenshot of `/track-record` and one
honest sentence about it. "BUY calls were right 58% of the time at 24h this
week; AVOID was 71%. The 5-minute horizon is still noise." Even a bad week is
content, because the willingness to post a bad week is the product's whole
argument.

Cadence that is sustainable beats cadence that is impressive. One call a day and
one recap a week, every week, beats twenty posts in a launch week and then
silence.

---

## 3. Where, in order of expected return

**1. X / Twitter — the primary channel.** Solana memecoin trading lives there.
Build-in-public works because the artefact is genuinely interesting: a public,
falsifiable scoreboard is a rare thing to post. Reply to the "is this a rug?"
questions that appear under every new token with an actual analysis link — that
is a genuinely useful answer, not a plug, provided you answer the question in
the reply itself and treat the link as the evidence rather than the point.

**2. Reddit — high value, high risk.** r/solana, r/CryptoCurrency,
r/SideProject, r/SaaS, r/webdev each have a completely different tolerance for
self-promotion, and several will ban on the first offence.
- Read each subreddit's rules and its last month of posts before posting.
- Post the *finding*, not the product: "I logged every call my scanner made for
  30 days and published the results — here is what surprised me" is a post.
  "Check out my new tool" is a removal.
- r/SideProject and r/IndieHackers welcome the build story. r/solana wants
  utility. r/CryptoCurrency wants data and will destroy anything that smells of
  a shill.

**3. Telegram and Discord.** Solana trading groups are where the actual users
are. Join as a participant, be useful for two weeks before ever mentioning the
product, and then only in response to a question it answers. Most groups have an
explicit no-promo rule and moderators who have seen every trick.

**4. Product Hunt / Hacker News.** One shot each, worth taking once the
scoreboard has real numbers. HN will engage with the engineering — the
evidence-constrained LLM, the coverage renormalisation, the refusal to backdate
a late checkpoint. Title it as the engineering problem, not the product.

**5. SEO, the slow compounding one.** Analysis permalinks are already indexable
with their own social cards. A "was $TOKEN a rug?" search landing on a dated,
evidenced page is exactly the traffic that converts. This takes months and needs
no work from you — it happens because the pages exist.

---

## 4. First 30 days

| Days | Do |
|---|---|
| 1–3 | Scheduler running. Helius key added. Analyze 20+ tokens a day, every day, from here on. |
| 4–14 | Post the daily call. No promotion yet — you are building the archive. Join 3–5 communities and be useful without mentioning the product. |
| 15 | First scoreboard post on X, with real numbers. Whatever they are. |
| 16–21 | Reply to "is this safe?" questions with real analyses. Aim for genuinely helpful answers, roughly ten a day. |
| 22 | The Reddit post: 30 days of published calls, what the data showed. |
| 23–30 | Product Hunt and Hacker News, in that order. Keep the daily posts running through both. |

The thing that makes this work is not any single post. It is that on day 30
there is a month of dated, public, unedited calls behind you, and nobody else
arguing in that thread has one.

---

## 5. What to measure

Vanity metrics will lie to you here. Track four things:

- **Analyses per day** — the only real usage number.
- **Repeat rate** — how many people run a second analysis on another day. If
  this is near zero, nothing else matters and no amount of promotion will fix
  it.
- **Permalink opens from outside** — whether the share loop is actually closing.
- **Scoreboard hit rate** — because if the calls are bad, the honest move is to
  fix the model before promoting it harder.

`/api/diagnostics` already reports the health of the tracking that all of this
depends on. Check it weekly.

---

## 6. Lines not to cross

These are not squeamishness. Each one, if broken, ends the project's
credibility in the exact communities it needs.

- **No fake accounts, no bought followers, no upvote rings.** Crypto audiences
  detect astroturfing quickly and punish it permanently.
- **Always disclose that you built it.** Every single time, including in
  replies. "I made this" costs nothing and is the difference between a founder
  and a shill.
- **Never post a curated win rate.** The scoreboard's sample-size gate and its
  refusal to backdate late checkpoints exist precisely so the number is not
  gameable. Do not undo that in a tweet.
- **Never promise returns, and never let a post imply one.** Not "this called a
  10x" — that is a claim about the future dressed as a claim about the past.
- **No DM spam, no unsolicited group posts, no reply-guy links** under posts the
  product does not actually answer.
- **Never ask for a wallet connection or a signature** — the product does not do
  it, and any communication that even hints at it destroys the one trust
  advantage a read-only tool starts with.

The short version: the product's entire pitch is that it tells the truth about
its own performance. Promotion that is not equally honest contradicts the pitch,
and the audience will notice the contradiction before they notice the product.
