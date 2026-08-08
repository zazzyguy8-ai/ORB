# CULTSCAN — setup and the seven-day plan

## What this is

Every token tool answers a question that is already solved: *is the contract safe?*
RugCheck, TokenSniffer and DexScreener do that, and they do it better than a
language model can.

Nobody tools the question people actually decide on. A memecoin is not a product,
it is a cult, and cults live or die on whether the story survives contact with a
group chat. That is a language problem, and a language model is the right
instrument for it. CULTSCAN scores narrative survivability.

Two things ship here:

- **CULT SCAN — €19 / 20 USDC.** The audit. Cult score with reasoning, ticker
  memetics, holder psychology, the fatal flaw, comparables, and the manipulation
  markers visible in the pitch itself.
- **FULL ARSENAL — €49 / 50 USDC.** The scan, plus six faceless video scripts,
  fifteen posts, six meme concepts, Telegram/Discord copy and a seven-day
  calendar — all written around the scan's conclusions, including its fatal flaw.

A free **vibe check** sits in front of both. It is deliberately good enough to be
useful on its own, because it is also the marketing.

---

## Setup

### 1. Keys

Copy `.env.local.example` to `.env.local` and fill it in.

```bash
cp .env.local.example .env.local
openssl rand -hex 32     # -> ORB_UNLOCK_SECRET
```

The only hard requirement is `ANTHROPIC_API_KEY` and `ORB_UNLOCK_SECRET`. Set
`ORB_UNLOCK_SECRET` once and never rotate it casually — changing it invalidates
every outstanding unlock.

### 2. Card payments (Stripe)

Add `STRIPE_SECRET_KEY`. Start with the `sk_test_...` key and click all the way
through one purchase with card `4242 4242 4242 4242` before you switch to live.
No products or prices need creating in the dashboard — the amounts are built
into the Checkout session.

Set `NEXT_PUBLIC_SITE_URL` to your real domain so Stripe returns buyers to the
right place.

### 3. USDC on Solana (optional, but this audience wants it)

A meaningful share of this market will not put a card into a website and will
send USDC without a second thought. That rail needs two things together:

- `SOLANA_RECEIVE_ADDRESS` — a wallet you control.
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — the claim store.

Both, or the rail stays off. A transaction signature is public: without a way to
burn each one exactly once, anyone watching the receiving address could redeem
somebody else's payment. The code fails closed rather than leak product.

Also replace `SOLANA_RPC_URL` with a Helius/QuickNode/Triton endpoint before you
drive traffic. The public endpoint is rate-limited and will start failing under
load, and a failing payment rail is worse than a missing one.

> **Not verified end to end.** The Solana rail was written and typechecked, and
> its input validation and failure paths were exercised, but the sandbox this
> was built in blocks outbound calls to Solana RPC hosts, so no real transaction
> was ever verified through it. Before taking a live USDC payment, send yourself
> 1 USDC, paste the signature, and confirm the underpayment path rejects it —
> then send the real amount and confirm it unlocks. Ten minutes, and it is the
> only part of the money path that has not been proven.

### 4. Deploy

```bash
npm install
npm run build
```

Push to Vercel, set the same env vars in the project settings, point a domain at
it. The product lives at `/cultscan`; the existing ORB experience at `/` is
untouched and shares nothing with it but the deployment. Point the domain root
at `/cultscan` with a rewrite when you are ready to make this the main thing.

---

## The number

Target: **€1,000 in seven days.**

| Mix | Sales needed | Gross |
|---|---|---|
| All ARSENAL (€49) | 21 | €1,029 |
| All SCAN (€19) | 53 | €1,007 |
| Realistic 50/50 blend (€34 avg) | 30 | €1,020 |

Stripe takes roughly 1.5% + €0.25 on European cards, so 30 blended sales nets
about €985. USDC payments net effectively all of it. **Plan for 30 sales.**

Working backwards through the funnel, with rates that are ordinary rather than
optimistic:

| Stage | Rate | Needed |
|---|---|---|
| Sales | — | 30 |
| Free vibe checks → purchase | 3% | ~1,000 vibe checks |
| Video views → vibe check | 1% | ~100,000 views |
| Posts over 7 days | ~4/day | 28 posts |

**Read that last line honestly.** 100,000 views in a week from a standing start
does not come from 28 posts each doing 3,500. It comes from 26 posts doing a few
hundred each and one or two doing 40,000+. The daily volume is not the strategy;
the daily volume is how you buy enough lottery tickets for the outlier to happen.
If you post four times a day for seven days and nothing breaks out, the answer is
not "post harder" — see *If it is not working* below.

---

## Why the marketing is nearly free

**The product's output is the content.** You do not have to invent videos about
CULTSCAN. You run CULTSCAN on whatever the timeline is already arguing about and
post the verdict. The screen recording of a score landing on 12 for a coin
everyone is currently shilling is the video. That is:

- **faceless** — it is a screen recording and a voiceover,
- **infinitely repeatable** — there is a new trending token every hour,
- **inherently topical** — you are always posting about what is already hot,
- **self-demonstrating** — the ad and the demo are the same twenty seconds.

The format:

1. Screen-record the terminal UI while a scan lands on a token people know.
2. Hook in the first two seconds: the number and the name. *"This coin everyone
   is calling the next BONK just scored 14."*
3. Ten seconds of the actual verdict text, read straight. No commentary.
4. End on the fatal flaw. Do not add a call to action beyond the name.

Do not editorialise and do not hype. The model's verdicts are blunt on their own;
your job is to get out of their way. The moment it reads like an ad, it dies.

---

## Seven days

### Day 0 — setup (2 hours, spend nothing)

Keys, Stripe in test mode, one full test purchase, domain, then flip to live.
Buy no ads, no followers, no tools. Set up accounts on TikTok, X, Instagram
Reels and YouTube Shorts — the same vertical video goes to all four, which is
where the leverage is.

### Day 1 — build the ammunition

Run the free vibe check on 30 tokens: the ten everyone knows (BONK, WIF, PEPE
and friends) and twenty from today's trending list. Screen-record all of them —
this is one sitting, maybe ninety minutes. You now have 30 videos' worth of raw
footage before you have posted anything.

Cut and post four. Two on well-known coins (searchable, safe), two on today's
launches (topical, urgent).

### Day 2 — find the format that works

Post four more. Vary the hook only, not the format — you are testing hooks, and
changing two things at once tells you nothing. By the end of the day one hook
shape will be clearly ahead. Use it for the rest of the week.

Start replying. When a big account announces a launch, reply with that token's
scan. This is free distribution into an audience that is already paying
attention, and it is the single highest-leverage thing in this plan.

### Day 3 — direct outreach

Volume alone will not close 30 sales by Wednesday, and the ARSENAL tier is worth
2.5 scans. Find twenty projects that launched in the last 48 hours and have a
Telegram with real people in it. Send the founder their own free scan —
unprompted, no pitch, just the verdict.

Roughly one in five will reply. A meaningful share of those will buy the arsenal,
because they have a token live *right now* and no content pipeline. This is where
the €49 sales come from.

Keep posting four a day.

### Day 4 — the honest checkpoint

Count sales. Read *If it is not working* below and act on it today, not on
day six.

### Day 5 — double down on the outlier

By now something has outperformed. Make six more of exactly that thing. Not
variations — the same format, new tokens.

### Day 6 — the comparison post

Run scans on the five biggest coins of the moment and post them as a single
ranked list. Ranked lists get argued with, and arguments are distribution. Pin
it.

### Day 7 — close

Post the week's own numbers if they are good ("this scored a 9 on Monday, here
is the chart now"). Nothing converts a skeptical market like the tool having
been right in public.

---

## If it is not working

Check on day 4, not day 7, and diagnose by *where* the funnel is breaking:

**Views are fine, nobody clicks.** The video is entertaining but not making
anyone want the tool for themselves. Fix: stop scanning only famous coins and
start scanning the coins in the comments. "Drop a ticker and I'll scan it" turns
a viewer into a participant.

**Clicks are fine, nobody pays.** The free tier is satisfying people completely.
Fix: the vibe check should end on the specific thing it is *not* telling them —
the fatal flaw exists and is named but not explained. Tighten it before touching
the price.

**Nothing gets views at all.** The hook is the problem, not the product. Two
seconds, one number, one name people recognise. If four days of that produces
nothing, the format is wrong for your accounts and outreach is your channel —
go to fifty DMs a day and stop making videos.

**Everything works but the numbers are small.** This is the good failure. Seven
days is short and compounding is real; a plan that produces €300 in week one
usually produces more in week two, because the accounts have a baseline and the
outreach has references. Do not throw it away.

---

## What this deliberately will not do

The content engine refuses to invent partnerships, endorsements, audits, backers,
holder counts, or volume figures — it writes clearly marked placeholders instead.
It will not write price promises, "you are early", manufactured urgency, or copy
designed to make someone feel stupid for not buying. The scan will not predict a
price or tell anyone to buy.

That is a product decision, not a limitation. A tool that generates plausible
fake metrics for token launches is a rug factory, it burns the brand the first
time someone screenshots it, and it is not the business. The scan is worth paying
for precisely because it is willing to tell a founder their idea is derivative.

CULTSCAN also reads language, not chain state. It cannot see liquidity, holder
distribution or mint authority, and it says so rather than implying otherwise.
Pair it with a contract scanner; it is not a replacement for one.
