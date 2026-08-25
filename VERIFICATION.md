# How this data is verified

Every claim on the tracker carries a source link, but sources go stale and summaries can drift. So beyond the weekly refresh, the dataset is **re-audited monthly** by an AI-assisted verification pipeline, with results applied under a documented correction policy.

## The two cadences

| Cadence | What it does |
|---|---|
| **Weekly** (Mondays) | Adds the week's developments: new dated updates, status changes, moved deadlines — researched from the primary sources listed in [UPDATE_GUIDE.md](UPDATE_GUIDE.md). |
| **Monthly** (1st of month) | Re-audits the *entire* dataset — including content that hasn't changed in months — against primary sources. |

The weekly pass only adds; the monthly pass challenges what's already there.

## How the monthly audit works

1. **Split.** The dataset is divided into seven review packs: one per framework (GHG Protocol, ISO, SBTi, ISSB, EU, US) plus one cross-cutting pack (glossary, acronyms, crosswalk, framing copy).
2. **Verify in parallel.** Seven independent AI research agents each check their pack's load-bearing claims — every date, deadline, status label, numeric figure, and confidence rating — against primary sources: standard-setter publications, the Federal Register, EUR-Lex, official consultation pages, court dockets. Agents also spot-check that cited source links actually say what the tracker claims they say.
3. **Classify.** Findings are tagged by severity: **error** (verified wrong), **stale** (superseded by events), **overstated** (stronger than sources support), **unverified** (load-bearing but unconfirmable), or **nit**. Agents must cite evidence for every finding; "could not confirm" is never treated as "wrong."
4. **Cross-check.** Findings are compared across agents before any correction — one agent's flag is sometimes resolved by another agent's source. Anything without cited evidence is discarded.
5. **Correct.** Surviving findings are fixed in the live dataset (the site updates within minutes; no redeploy). Unverifiable claims are softened or removed rather than left standing.

A dated backup of the dataset is kept before every correction pass.

## Honest limitations

- This is an editorial reference maintained by one person with AI assistance — not a legal service. Confidence ratings are judgments, and their reasoning is shown precisely so you can disagree with them.
- Audits are monthly; a claim can be up to a few weeks stale between passes (the weekly refresh catches most of this, but its focus is new developments).
- Always verify deadlines against the primary source linked on the item before acting. That's what the links are for.

## Found something wrong?

Open an issue on this repo — flagged errors get priority in the next pass. Include the claim, why it's wrong, and a primary source if you have one.

---

*First full audit: August 2026 — ~450 claims checked across seven parallel agents; 45 corrections applied (4 factual errors, 6 overstatements, 1 stale item, the rest precision trims). Every spot-checked source link resolved and matched its claim.*
