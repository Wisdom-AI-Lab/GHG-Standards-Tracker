# Weekly update guide

The dashboard's live dataset is served from a Supabase edge function (`/functions/v1/ghg-data`) reading table `public.ghg_site_data` (row id=1). A weekly refresh is: research → fetch the current JSON from that table → apply the edits below → validate → upsert the row. The site picks it up immediately (no deploy). The repo's `data/data.json` is the fallback snapshot — re-sync it (commit the current JSON) roughly monthly or after major changes so the fallback doesn't drift.

## Sources to check each week (primary first)

| Framework | Where to look |
|---|---|
| GHG Protocol | ghgprotocol.org blog + standard-development pages (Corporate, Scope 2, Scope 3, AMI, LSR, Product, Project); monthly "Pulse" newsletter |
| ISO | iso.org news; ISO/TC 207/SC 7 activity via GHGP partnership posts |
| SBTi | sciencebasedtargets.org/news and /blog; standards-and-guidance page for sector status changes |
| ISSB | ifrs.org news + ISSB meeting Updates; work-plan project pages |
| EU | EFRAG news, EP Legislative Train (Omnibus/CBAM files), Consilium press releases, Official Journal; reputable law-firm alerts for interpretation |
| US | sec.gov press releases + Federal Register; CARB climate-disclosure meetings page; Ninth/Eighth Circuit docket coverage; state bill trackers |

## What to change in `data.json`

1. **`meta.last_updated`** — set to the refresh date (YYYY-MM-DD). This drives the header badge.
2. **`updates[]`** — prepend any new dated developments (keep newest first). Fields: `date`, `framework` (ghgp|iso|sbti|issb|eu|us), `workstream`, `headline`, `detail` (2–4 sentences — the page renders each sentence as a bullet, so write self-contained sentences), `so_what` (REQUIRED: one short, direct sentence — what a corporate reporting team should do or conclude; this fills the "What it means for corporates" column), `significance` (high|medium|low), `source_url`, `source_title`. Recency buckets are computed automatically from `date`.
3. **`frameworks[].workstreams[]`** — if a workstream's status changed: update `status_label`, `summary`, `key_points` (first 3 are always visible — lead with the most decision-relevant), `next_milestone`, `phase` (drives the stage stepper: scoping|drafting|draft|consultation|adopted-pending|final|implementation|rescinding|litigation|legislation), `stat` ({value,label} — the one number/date worth remembering), and re-assess `confidence` (level AND reasoning).
4. **`timeline`** — move a milestone from `projected`→`upcoming`→`completed` when it lands; adjust span edges if official dates shift; add new milestones sparingly (major inflection points only).
5. **`headline_metrics`** — swap out any KPI whose date has passed for the next most decision-relevant date.
5a. **`overview.matrix`** — the impact × certainty scatter on the Overview. Each point: `label` (short), `framework`, `x` (0–100, how settled: medium ~35–55, high ~60–80, confirmed ~85–95), `y` (0–100, work created for a typical large reporting team), `note` (one-line reasoning shown on hover), `dy` (-1 label above dot, 1 below — used to avoid collisions). Quadrant midlines sit at 50/50 — a point's quadrant is determined purely by whether x and y are above or below 50. Move points when status changes (e.g., a consultation closing moves x right); keep ~12–14 points and check the rendered chart for label overlaps.
5b. **`overview.heavy_hitters` / `overview.horizon`** — rendered as "Priority actions" and "On the horizon" under each framework's table in What's changing (grouped by `framework`). Heavy hitters: max 7, confirmed/high confidence, each with `title`, `what` (1–2 sentences), `action` (one imperative sentence); ordered by confidence. Horizon: max 5 open outcomes worth watching (`title` + `note`). Promote/demote items as milestones land — e.g., when a horizon item resolves, move it into heavy hitters or drop it.
6a. **`changes`** — the "What's changing" old-vs-new tables. When a proposal is adopted, flip the row's `status` (proposed → final) and update the text; when a new official proposal lands, add a row (`topic`, `old`, `new`, `status`: final|proposed|open|litigation). This is the reference people use in meetings — keep rows precise and sourced from the underlying updates.
6b. **`landscape`** — the Overview's three-layer explainer; rarely changes (only on structural events like the GHGP–ISO merger completing).
6. **`crosswalk`** — update only when a relationship materially changes (e.g., ISSB opens an exposure draft to re-reference GHGP). Relationships and watchlist items use `bullets` (2–3 short lines each); keep `note`/`detail` as the prose fallback.

## Confidence rules

- **confirmed** — final published text or formally adopted decision. Change requires a new formal process.
- **high** — official draft/adopted-but-not-in-force/announced plan; direction documented but subject to change or a procedural step remains.
- **medium** — outcome genuinely open: consultation divergence, pending litigation, unpublished feedback.
- **low** — early signal only (scoping, political intent, unconfirmed third-party reporting).

Rules of thumb: never rate above **high** while text says "subject to change"; never above **medium** while a court ruling or contested vote could flip the outcome; downgrade rather than guess when sources conflict, and say so in `reasoning`. Every rating's `reasoning` must be specific enough that a reader could disagree with it.

## Editorial rules

- **Write for a smart reader who doesn't know the acronyms.** Every item should answer: who does this apply to, what actually changes, what should they do. Don't over-explain — the glossary tooltips carry the jargon. If a new term of art enters the dataset, add it to `glossary` (one plain sentence) rather than explaining it inline everywhere.
- **Acronyms: spell out on first use, then use the acronym.** This is automated: any acronym listed in `acronyms` is rendered as "Full Name (ACRO)" on its first appearance in each card and as the bare acronym after that (titles keep the short form and get a hover definition instead). So in the data, just write the acronym everywhere — but when introducing a NEW acronym, add it to both `acronyms` (full name) and `glossary` (plain-English definition).
- Vendor-neutral: no company references, no product pitches.
- Every dated claim links to a source; prefer the standard-setter/regulator over commentary.
- Distinguish *published plans* ("Q2 2027, per the SDP") from *statutory dates* ("effective Jan 1, 2027").
- Where official sources conflict, use the more conservative formulation and note the conflict.
- Quiet weeks are fine — an empty "past week" bucket with the next expected milestones is more trustworthy than filler.

## Validate before committing

```
python3 -m json.tool <updated>.json > /dev/null && echo OK
```

Then upsert to `public.ghg_site_data` (id=1) and confirm the live endpoint returns the new `meta.last_updated`. When re-syncing the repo snapshot, also load the page locally (`python3 -m http.server`) and click through all pages.
