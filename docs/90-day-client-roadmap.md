# 90-Day Roadmap: First 5 Paying Clients

**Window:** Day 1 = Monday, Aug 3 2026 → Day 90 = Saturday, Oct 31 2026 (13 weeks)
**Goal:** 5 paying clients, ~$12–15k/month recurring by Day 90, plus a repeatable pipeline that doesn't depend on luck.

> **Read this first.** The conversion rates in this doc are industry-typical ranges for cold B2B outbound, not promises. The plan is built so that if you hit *half* my assumed rates you still land 5 clients — because it runs four acquisition channels in parallel instead of betting everything on cold email. The one thing that is not optional is the daily activity quota. Everything else you can adapt.

---

## Table of contents

1. [The math you're actually solving for](#1-the-math)
2. [Week 1–2: Foundation (pick a lane, build the offer)](#2-phase-1--days-114-foundation)
3. [Week 3–7: The outbound engine](#3-phase-2--days-1549-the-outbound-engine)
4. [Week 8–11: Convert and close](#4-phase-3--days-5077-convert-and-close)
5. [Week 12–13: Retain, expand, systemize](#5-phase-4--days-7890-retain-expand-systemize)
6. [Scripts and templates](#6-scripts-and-templates)
7. [How the money actually moves](#7-money-mechanics)
8. [Delivery: fulfilling without drowning](#8-delivery-ops)
9. [Metrics dashboard](#9-metrics-dashboard)
10. [Failure modes and how to catch them early](#10-failure-modes)

---

## 1. The math

Work backwards. This is the single most important table in the doc — it converts "find clients" from a vague hope into a daily number.

| Stage | Conversion | Volume needed |
|---|---|---|
| Signed clients | — | **5** |
| Proposals sent | 40–50% close | 11–13 |
| Qualified sales calls | ~40% → proposal | 28–32 |
| Positive replies / conversations | ~35% → call | 80–90 |
| Prospects contacted (multi-touch) | 6–10% reply | **900–1,200** |

**Over 13 weeks that is ~75–90 new prospects contacted per week.** Split across channels:

- Cold email: 25/day × 5 days = **125 sequenced contacts/week** (each gets 3–4 touches, so ~40 *new* prospects/week)
- LinkedIn: **15 connection requests/day**, ~20 new conversations/week
- Warm network: **10 personal asks/week** in weeks 1–4, then taper
- Partnerships: **5 agency/freelancer outreach/week** (this is the sleeper channel — see Week 4)

Revenue math at 5 clients:

| Scenario | Mix | MRR at Day 90 |
|---|---|---|
| Conservative | 3 × $1,500 + 2 × $2,500 | $9,500 |
| Target | 3 × $2,500 + 2 × $4,000 | $15,500 |
| Upside | 2 × $2,500 + 3 × $5,000 | $20,000 |

Plus one-off pilot fees collected along the way (~$750–1,500 each × 8–10 pilots = $6–15k of cash during the 90 days, which is what funds your tools and your time).

---

## 2. Phase 1 — Days 1–14: Foundation

You cannot outbound your way out of a vague offer. Two weeks, then you stop building and start selling — hard cutoff.

### Week 1 (Aug 3–9): Pick one niche and one offer

**Day 1–2: Choose your niche.** One. Not "businesses." The niche must satisfy three tests:

1. **They already pay for content** (they have a blog, a YouTube channel, a newsletter, or they're running ads).
2. **A piece of content has obvious dollar value** to them — it feeds a sales pipeline.
3. **You can list 200 of them by name** without special access.

Strong candidates for an AI content agency, ranked by how fast they close:

| Niche | Why it works | Typical budget | Sales cycle |
|---|---|---|---|
| **B2B SaaS, seed–Series A** | Content-led growth is the default playbook; founders feel the pain weekly | $2.5–6k/mo | 2–4 weeks |
| **Marketing/dev agencies (white-label)** | They already sold the work; you're capacity, not a new line item. Fastest close, lowest trust bar. | $1.5–4k/mo | 1–2 weeks |
| **Personal brands / fractional execs** | Fast decisions, one decision-maker, no procurement | $1.5–3k/mo | days |
| **High-ticket local services** (med spa, law, dental, real estate) | Underserved, cash-rich, low competition | $1.5–3k/mo | 2–5 weeks |
| ~~E-commerce SMB~~ | Avoid at first: price-sensitive, wants performance guarantees | — | — |

**My recommendation: lead with white-label agency work + B2B SaaS.** The agencies pay you fast and give you volume with zero brand-building; the SaaS clients pay more and become your case studies. Two adjacent niches, one offer.

**Day 3–4: Productize one offer.** No custom quotes, no "we do everything." One flagship, one front door:

**Front door — "Content Sprint" (paid pilot): $1,000, 2 weeks**
- Brand voice + audience document (the asset that makes everything else work)
- 8 deliverables: e.g. 4 long-form pieces + 12 social posts repurposed from them
- One performance readout call
- *Purpose:* de-risks the buy, gets money in fast, and 50%+ of pilots should roll into retainer.

**Flagship — "Content Engine" (retainer): $2,500/mo, 3-month minimum**
- 8 long-form pieces/mo (blog, newsletter, or script)
- 40 social posts repurposed across 2 platforms
- Monthly strategy call + reporting
- One revision round per deliverable, 48h turnaround

**Tier up — "Content Engine Pro": $4,500/mo**
- Everything above, doubled volume, plus a weekly video/short-form track and a dedicated Slack channel

Price on outcome, never hours, and **never disclose that AI does the drafting as a discount justification.** AI is your margin, not your pitch. What you sell is judgment, volume, and consistency.

**Day 5: Write the one-sentence positioning.**
> "I run the content engine for [niche] so they publish [volume] a month without hiring a writer — I handle strategy, production, and distribution."

Put it on your LinkedIn headline, email signature, and the first line of every cold email.

### Week 2 (Aug 10–16): Proof and infrastructure

You have no clients, so you manufacture proof. Three assets, two days each.

**1. Spec work portfolio (Day 8–9).** Pick 3 real, named companies in your niche. Produce a genuine piece of content for each — a blog post, a 10-post LinkedIn series, a video script. Real quality, real specificity. This becomes both your portfolio *and* your outbound hook (see the Loom script in §6). Three pieces is enough.

**2. The ORB demo as capability proof (Day 10).** You already have `dire-orb` in this repo — a Claude-powered interactive experience with a Three.js front end. Deploy it publicly (Vercel, 20 minutes) and put it in your portfolio as *"AI product I built and shipped."* This does something a writing sample can't: it proves you can build AI systems, not just prompt one. It justifies premium pricing and it's a genuine conversation starter with SaaS founders. **Action: `vercel deploy`, custom domain, one-paragraph case study on what it does and how it was built.**

**3. Minimum viable presence (Day 11–12).**
- One-page site: positioning line, 3 portfolio pieces, ORB demo, pricing anchor ("engagements start at $2,500/mo"), Calendly link. One page. Do not build a real website in week 2.
- LinkedIn profile rewritten around the positioning line, with a featured section pointing at the portfolio.
- Google Workspace on your own domain (never `@gmail.com` for outbound), SPF/DKIM/DMARC configured, then **warm the domain for 14 days** at low volume before real sequences. This is why cold email starts Week 3, not Week 1.

**Day 13–14: Build the prospect list.** 200 named prospects, in a spreadsheet, with: company, contact name, role, email, and **one specific observation** (a recent post, a hiring signal, an empty blog, a launch). That last column is the whole game — it's what makes touch #1 not look like spam.

Sourcing: LinkedIn Sales Navigator (free trial), Apollo.io or Clay for enrichment, agency directories (Clutch), niche job boards (a company hiring a content marketer has budget and pain), podcast guest lists, "Show HN" / Product Hunt launches from the last 90 days.

**Tool stack, total ~$150–250/mo:** Google Workspace ($7), Apollo or Clay ($50–150), Instantly or Smartlead for sequencing ($40), Calendly (free), Stripe (fees only), Notion (free), Claude (you have it). Don't buy anything else until Client 3.

---

## 3. Phase 2 — Days 15–49: The outbound engine

**Non-negotiable daily block: 9:00–11:30am is sales. Every weekday. Before any client work.** Client work expands to fill available time; if you do it first, you will never prospect, and in month 4 you'll have no pipeline. This is the single most common way solo agencies die.

### Daily rhythm (weeks 3–7)

| Time | Activity |
|---|---|
| 9:00–9:30 | Reply to every inbound/reply from yesterday. Speed to lead beats everything — under 1 hour if you can. |
| 9:30–10:15 | 25 cold emails (sequenced) + personalize the day's 5 highest-value ones by hand |
| 10:15–10:45 | 15 LinkedIn connection requests + comment substantively on 5 prospect posts |
| 10:45–11:15 | 3 Loom audits for tier-1 prospects (the highest-converting thing in this doc) |
| 11:15–11:30 | Update CRM, log metrics |
| Afternoon | Delivery, calls, content |

### Week 3 (Aug 17–23): Warm network first — this is where Client 1 comes from

Cold email is a numbers game that takes weeks. Your network converts *this week*. Do not skip this out of embarrassment.

List every person who (a) runs or works at a business, (b) is a former colleague or client, (c) runs an agency. Aim for 40 names. Send 10 personal messages per week. **Do not pitch — ask for a referral or intro** (script in §6). Expect 1–2 clients out of 40 asks. This is normal and it's the fastest money in the plan.

Also: post publicly that you're taking on 3 new clients this quarter, with the positioning line. Twice, a week apart. People can't refer you if they don't know what you do.

### Week 4 (Aug 24–30): Cold email live + open the partnership channel

Domain is warmed, so sequences go live at 25/day. Do not exceed 30/day/inbox — deliverability collapses and burns your domain.

**Partnerships are the highest-ROI channel most people skip.** Design/dev/SEO/paid agencies constantly get asked for content and either turn it down or subcontract it. You want to be their subcontractor. 5 outreaches/week. One partner who sends you two clients a quarter is worth more than 500 cold emails. Offer them 15–20% referral or let them white-label at your wholesale rate.

Same for adjacent freelancers: designers, web devs, video editors, SEO consultants, fractional CMOs.

### Week 5–7 (Aug 31–Sep 20): Volume, iterate, and Loom audits

- **Loom audits are your best weapon.** For a tier-1 prospect, record 3–5 minutes: their current content, three specific problems, what you'd do in the first 30 days. Send it unsolicited with no pitch. Typical reply rates run several times higher than a plain cold email because you've already done work for them. 3/day = 45 by Week 7. If nothing else in this doc works, this will.
- **Iterate on data, not vibes.** After 250 sends you have signal. Reply rate under 3% → rewrite the subject line and first sentence. Replies but no calls → your CTA is too big, downgrade the ask. Calls but no closes → your offer or price framing is off, not your outreach.
- **Start a proof channel.** 3 posts/week on LinkedIn: teardowns of content in your niche, what you built (the ORB app), results as they land. This compounds and it makes cold outreach convert better because prospects check your profile.

**Checkpoint — end of Week 7 (Day 49). You should have:**
- 400+ prospects contacted, 30+ conversations, 10+ calls booked
- **1–2 signed clients** (most likely from warm network or partnerships)
- 3–5 pilots sold or in proposal

If you have zero signed clients at Day 49, the problem is almost never volume — it's niche or offer. Stop, go back to §2, and re-cut one of them.

---

## 4. Phase 3 — Days 50–77: Convert and close

Pipeline is now full. The bottleneck moves to your call and your proposal.

### The 30-minute discovery call

Never pitch on the call before you've diagnosed. Structure:

1. **(2 min) Frame.** "I've got 30 minutes — I want to understand what you're publishing now and where it's stuck. If I think I can help I'll tell you exactly how, and if not I'll tell you that too."
2. **(15 min) Diagnose.** Ask, then shut up:
   - What are you publishing now, and who does it?
   - What's it supposed to *do* for the business — pipeline, hiring, brand?
   - What happens if nothing changes in 6 months?
   - What have you tried that didn't work? *(the most valuable question — tells you the objection before it arrives)*
   - Who else is involved in a decision like this?
   - Have you budgeted for this?
3. **(8 min) Prescribe.** Recommend *one* path — pilot or retainer. Say the price out loud, then stop talking. Silence after a number is not your cue to discount.
4. **(5 min) Close the next step.** Never "I'll send over a proposal." Always: "I'll send the agreement today, it's a two-page doc — if you sign by Friday we start Monday. Sound good?"

**Qualify hard.** No budget, no timeline, no authority → politely disqualify. One bad client at $1,500 will cost you two good ones.

### Objection handling

| Objection | Response |
|---|---|
| "Too expensive" | "Compared to what? A junior writer is $5k/mo loaded and produces less. What number were you expecting?" — then either justify or disqualify. Don't discount; reduce scope instead. |
| "Send me info / need to think" | "Happy to. What specifically do you want to be sure about?" Then handle *that*. Silence here loses the deal. |
| "We use ChatGPT already" | "Most teams do — and it's why everyone's content sounds the same. You're not paying for generation, you're paying for a voice that's yours, a strategy, and it actually shipping every week." |
| "Not right now" | "Understood. What changes between now and then?" Get a date, put it in the CRM, follow up. ~20% of your clients come from revived "no"s. |
| "Can we start smaller?" | Yes — that's what the $1,000 pilot is for. Never free. |

### The proposal (send within 4 hours of the call)

Two pages, in the email body or a shareable doc — never a 14-page PDF, and never a deck:
1. What you heard (their words, verbatim — this closes more than anything else in the doc)
2. What you'll do — deliverables, volume, cadence
3. Price, term, start date
4. One-click accept: e-signature or "reply YES and I'll invoice"

Expires in 7 days. Follow up Day 2, Day 5, Day 8. Most deals close on follow-up 2 or 3.

**By Day 77 target: 4 signed clients, 2 pilots in flight.**

---

## 5. Phase 4 — Days 78–90: Retain, expand, systemize

Client 5 usually comes from clients 1–4, not from cold outreach.

- **Ask for referrals at the first win, not at month 6.** The moment a client says "this is great," say: "Glad it's landing. Who else do you know who's stuck on content? Happy to do a free audit for them." Two asks per happy client.
- **Convert pilots.** Every pilot's final call is a retainer conversation: "Here's what we did in two weeks, here's the 90-day version." Have the agreement ready before the call.
- **Upsell one existing client** from $2,500 → $4,500 by adding the video/short-form track. Cheaper than a new client and takes one conversation.
- **Get case studies in writing.** Numbers if you have them, quotes if you don't. Three case studies changes your close rate permanently.
- **Raise your price for Client 6.** If you closed 4 of 6 proposals, you're underpriced. Next new client: +25%.
- **Document your delivery SOP** (see §8) so client 6–10 doesn't break you.
- **Do not stop prospecting.** Cut it to 60 minutes/day if you must, but a zero-prospecting week in month 3 is a dry month 5.

---

## 6. Scripts and templates

### Cold email — touch 1 (the observation email)

> **Subject:** your [specific thing]
>
> Hi [Name] — saw [specific, verifiable observation: "you've shipped 3 changelog posts since June but nothing on the blog since March"].
>
> I run content engines for [niche] — [one-line credibility]. Most of the teams I work with had the same gap: the product's moving fast, and content is the first thing that slips.
>
> Worth a 15-minute look at what a consistent publishing cadence would do for [specific outcome]?
>
> [Name]

Rules: under 90 words. One ask. No attachments, no links in touch 1 (kills deliverability). Subject line lowercase, 2–4 words, looks like a human wrote it.

### Cold email — touch 2 (Day 3): the value drop

> Following up with something useful either way — I mapped out 5 content angles for [Company] based on [their positioning/audience]. Want me to send it over? No strings.

### Cold email — touch 3 (Day 7): the Loom

> Recorded a 4-minute teardown of your current content and what I'd change first: [link]. No pitch in it, just the analysis. If it's useful, happy to talk. If not, I'll leave you alone.

### Cold email — touch 4 (Day 14): the polite close

> Haven't heard back, so I'll assume the timing's off — closing the loop. If content becomes a priority in Q4, I'll be here. Good luck with [specific thing].

*(The close-the-loop email reliably gets the most replies in the sequence. Send it.)*

### LinkedIn DM (after they accept, wait 24h — never pitch in the request)

> Thanks for connecting, [Name]. Genuine question since you're in [space] — is content something you're actively working on right now, or is it on the "someday" list? Asking because I run content engines for [niche] and I'm curious whether [specific niche problem] is as common as it looks from outside.

### Warm network ask (do not pitch)

> Hey [Name] — quick update: I'm running an AI content agency now, working with [niche] on getting them publishing consistently.
>
> Not pitching you. But you know a lot of people in [space] — if anyone comes to mind who's frustrated with their content or trying to publish more without hiring, I'd love an intro. Happy to do a free audit for them either way.
>
> Also: how are things at [Company]?

### Partnership outreach (white-label)

> Hi [Name] — you run [agency] doing [design/dev/paid]. Guessing content requests come across your desk that you either turn down or subcontract.
>
> I run a content production team for exactly that — white-label, your brand on it, I never talk to your client unless you want me to. Wholesale rates so you keep margin.
>
> Worth a 15-min call to see if it's a fit for the next one that comes up?

### Loom audit structure (3–5 min, record 3/day)

1. (20s) "Hi [Name], [your name] — spent a few minutes on [Company]'s content, here's what I found. No pitch, just the analysis."
2. (90s) Their content on screen. Three specific problems. Be concrete and kind.
3. (90s) What you'd do in the first 30 days. Be specific enough that it's useful even if they never reply.
4. (20s) "If you want the written version, reply and I'll send it. Either way, hope it's useful."

---

## 7. Money mechanics

Getting the yes is half the job. Getting paid, on time, without chasing, is the other half.

**Payment terms — set these before your first client, not after your first bad one:**
- **Pilots: 100% upfront.** Non-negotiable. It's $1,000; anyone who won't prepay $1,000 will be a nightmare at $2,500/mo.
- **Retainers: monthly in advance**, charged on the 1st, auto-billed via Stripe or GoCardless. Never invoice-and-hope, never net-30. You are not a bank.
- **First retainer month: charge on signature**, not on start date.
- **Late payment: work pauses at day 5.** Put it in the agreement and actually do it, warmly and once: "Payment didn't go through — I've paused production and I'll pick straight back up when it clears."
- **Price increases:** 30 days written notice, and only at a renewal boundary.

**The agreement.** Two pages, not a law-firm contract. Must contain: deliverables and volume (exact numbers), revision limit (one round), turnaround, payment terms, 30-day termination notice, IP transfers on payment, and an out-of-scope clause. Use a template from an e-sign tool; have a lawyer look at it once you're past $10k/mo.

**Cash flow reality:** with monthly-in-advance retainers and prepaid pilots, you're never funding client work out of pocket. Keep costs under ~$300/mo until Client 3 so you're profitable from the first invoice. Set aside 25–30% for taxes from day one, and talk to an accountant about entity structure once you cross ~$5k/mo — I'm not the right source for jurisdiction-specific tax or legal advice.

**Margin discipline.** Your cost per retainer client should be under 25% of revenue (AI tools + any subcontracted editing/design). At $2,500/mo that's $625 of variable cost. Track it per client from month 1 — a client at negative margin is worse than no client.

**Scope creep is the #1 margin killer.** When a client asks for something outside the agreement, the answer is never no and never free: *"Absolutely — that's outside the current scope, so it'd be $X as an add-on, or we can swap it for two of this month's posts. Which do you prefer?"*

---

## 8. Delivery ops

Five clients at 8 long-form + 40 social posts each is 40 long-form and 200 posts a month. You cannot freestyle that. Build the pipeline while you have 1 client, not 5.

**Per-client setup (2 hours, once):**
- **Brand voice document** — tone, banned words, sentence rhythm, 5 example pieces they love and 5 they hate, audience and their objections, competitors. This is the highest-leverage artifact in your whole operation; it's what makes AI output sound like *them* instead of like AI.
- Reusable prompt chain per deliverable type, with the voice doc as context
- Content calendar in a shared doc so they can see what's coming

**Weekly production loop:** batch by stage, not by client. Research all clients Monday, draft Tuesday, human edit Wednesday, client review Thursday, schedule Friday. Batching is what makes 5 clients possible in ~15 hours/week.

**Quality gate — never send raw AI output.** Every piece gets a human pass for: factual claims (AI invents statistics and citations — check every number), voice match, a specific detail only a human would know, and a genuine opinion. This pass is the actual product. Never let a client find an invented fact — one hallucinated stat in a published post can cost you the account.

**Be straightforward about AI in your process if asked.** Don't lead with it, don't hide it. "We use AI tooling in production with human strategy and editing on every piece" is honest, standard in 2026, and closes fine. Getting caught concealing it does not.

**Your first hire (~Client 4–5, not before):** a part-time editor at $20–30/hr, 10 hrs/week. That buys back the bottleneck and protects your 9–11:30 sales block.

---

## 9. Metrics dashboard

Track weekly in one spreadsheet. Five numbers, Friday afternoon, 10 minutes.

| Metric | Weekly target (wks 3–7) | Why it matters |
|---|---|---|
| New prospects contacted | 75–90 | The only input fully in your control |
| Reply rate | 6–10% | <3% = your targeting or first line is broken |
| Conversations started | 6–8 | Leading indicator of calls |
| Calls booked | 2–3 | Leading indicator of revenue |
| Proposals sent | 1–2 | Should be ~40% of calls |
| MRR signed | — | The only lagging number that counts |

**Milestone gates:**

| Day | Should be true |
|---|---|
| 14 | Niche + offer locked, 200-prospect list built, domain warming, portfolio live |
| 30 | 200+ contacted, 5+ conversations, 2+ calls, **1 client or pilot signed** |
| 49 | 400+ contacted, 10+ calls, **1–2 clients signed**, 3+ pilots sold |
| 77 | **4 clients signed**, 2 pilots in flight, 2 case studies written |
| 90 | **5 clients, $10–15k MRR**, pipeline of 15+ live conversations, delivery SOP documented |

If you miss a gate by more than ~30%, the fix is diagnostic, not effort: low replies = targeting/message; replies but no calls = CTA too big; calls but no closes = offer/price; closes but churn = delivery. Fix the one stage that's broken, not everything.

---

## 10. Failure modes

Ranked by how often they kill agencies in the first 90 days.

1. **Doing client work instead of prospecting.** The 9:00–11:30 block is the whole plan. A great month 2 with no prospecting is a dead month 4.
2. **Building instead of selling.** Website redesigns, logo, a fifth portfolio piece, tool research — all procrastination in a nicer outfit. Week 2 ends and you sell.
3. **No niche.** "I help businesses with content" gets ignored. Specificity is what makes a stranger reply.
4. **Underpricing to win the first client.** A $500/mo client takes as much work as a $2,500 one and anchors you low. Walk away instead.
5. **Free work / free trials.** A $1,000 paid pilot filters for real buyers. Free filters for tire-kickers who will never convert.
6. **Quitting a channel at 200 sends.** Cold outbound needs ~500 sends before the data means anything. Fix the message; don't abandon the channel.
7. **One channel only.** Domains get flagged, algorithms change. Four channels is insurance, and it's why this plan works even at half the assumed rates.
8. **Shipping raw AI output.** One hallucinated stat in a client's published post can lose the account and the referral chain behind it.
9. **Saying yes to a bad-fit client.** Wrong niche, haggles on price, wants daily calls — the cost is the two good clients you didn't have time to find.
10. **Chasing payment after the fact.** Prepay and auto-charge, always.

---

## This week (Aug 3–9), in order

- [ ] Pick one niche. Write it down. Commit for 90 days.
- [ ] Write the positioning sentence. Put it on LinkedIn today.
- [ ] Define the $1,000 pilot and the $2,500 retainer. Exact deliverables, exact numbers.
- [ ] Buy the domain, set up Google Workspace, configure SPF/DKIM/DMARC, **start warming.**
- [ ] List 40 warm-network names.
- [ ] Deploy the ORB app publicly and write its one-paragraph case study.
- [ ] Block 9:00–11:30 every weekday in your calendar through Oct 31. Title it "SALES — DO NOT BOOK."
