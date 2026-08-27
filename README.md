# GHG Standards Watch

An original, static demonstration tracker for greenhouse gas accounting, targets and disclosure developments, developed for Wisdom AI Lab.

## What this version contains

- Six views: overview, searchable standards register, dated developments, timeline, comparison prompts, and evidence/method.
- Framework, stage and region filters; source-linked detail dialogs.
- Seven independently researched starter records, prepared on 27 August 2026. They are source-checked but await human review.
- Exact, month-level and quarter-level dates, with projected milestones distinguished from source-stated dates.
- A 30-day source recheck flag, schema validation, application tests and GitHub validation workflow.

This is not a complete regulatory database, an entity applicability engine, or an active monitoring service. Missing coverage is identified in the interface. A passed milestone is not automatically treated as completed, and no record is automatically marked human-reviewed.

## Run

No application dependencies, build tools, database or API key are needed. Serve the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Use HTTP/HTTPS, not a `file://` URL: the interface loads a JavaScript module and a local JSON file.

## Test

Use Node.js 22 or later:

```sh
node scripts/check.mjs
node --test tests/tracker.test.mjs
```

Checks cover schema and source references, date semantics, filtering, safe rendering, six views, application event wiring, error recovery and local HTTP delivery. The DOM adapter is not a browser; visual layout and real browser interactions need a separate check before public release.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Semantic page shell and controls |
| `assets/styles.css` | Original responsive styling; system fonts |
| `assets/core.mjs` | Validation, filtering and date logic |
| `assets/app.mjs` | Views, details and browser interaction |
| `data/records.json` | Original starter dataset and editorial comparisons |
| `docs/DATA_GUIDE.md` | Schema and content editing rules |
| `docs/AGENT_WORKFLOW.md` | Proposed research/verification workflow; not activated |
| `docs/SOURCE_LOG.md` | Research scope and primary-source record |
| `docs/PROVENANCE.md` | Implementation and repository-history boundaries |

## Hosting after review and merge

All runtime paths are relative, so the project can be hosted under a repository subpath.

For GitHub Pages: open this repository's Settings → Pages, select Deploy from a branch, then `main` and `/(root)`. Save and check the Pages deployment in Actions. This is a manual opt-in; the validation workflow does not publish a website.

For another static host: serve the repository root with no build command. No custom domain is required. Do not publish `.env` files or API keys.

## Data and automation

The browser requests **only `data/records.json`** for its dataset. It does not call the reference project's backend, any AI provider or analytics service. All regulatory URLs are links opened on user request.

Research automation is **not enabled**. The included GitHub workflow validates committed files only. To add scheduled research, choose the model/search services, credentials, budget, cadence and reviewer; follow `docs/AGENT_WORKFLOW.md`. A schedule must not be described as active until a real run has succeeded.

## Originality and limitations

This working version replaces the inherited website, data snapshot and documentation with a new implementation and original summaries researched from official sources. The earlier project was a functional reference, not a source of copied code, styling or data. Its image and service connection are not used.

The repository remains a GitHub fork. Earlier commits and GitHub's fork relationship remain intact; this change does not relicense or claim ownership of those materials. No new blanket licence is applied to inherited history or third-party sources. See `docs/PROVENANCE.md`.

This is an independent demo, unaffiliated with standard setters or regulators. It is not legal, accounting or assurance advice. Read the authoritative source and assess the relevant entity, jurisdiction and reporting period before acting.
