# GHG Standards Watch

An original, static demonstration tracker for greenhouse gas accounting, targets and disclosure developments, developed for Wisdom AI Lab.

## What this version contains

- Eight views: overview, searchable standards register, dated developments, timeline, comparison prompts, evidence/method, **client workspace**, and **regulatory notebook**.
- Framework, stage and region filters; source-linked detail dialogs.
- Seven independently researched starter records, prepared on 27 August 2026. They are source-checked but await human review.
- Exact, month-level and quarter-level dates, with projected milestones distinguished from source-stated dates.
- A 30-day source recheck flag, schema validation, application tests and GitHub validation workflow.
- Atlas as the default presentation path, with fictional company facts and eight selected reporting routes across Australia, Singapore, California, Mexico and the EU, with explicit implementation limits. PepsiCo remains an optional public-evidence example.
- Interactive acquisition/divestment scenarios and actual reporting-phase comparisons; three GHG boundary methods; a jurisdiction × entity × instrument × trigger matrix with citations, condition traces and missing-information flags.
- Three added workspace sections: **Adoption & entity roles**, **Materiality**, and **Group & supplier data**. Sell Mexico while retaining a supply contract to compare group and value-chain roles.
- Eleven guided notebook questions, selectable supporting sources and up to five session notes. No live AI or file uploads.

This is not a complete regulatory database, a production applicability engine, or an active monitoring service. The selected real requirements were checked against official sources on 27 August 2026; human legal review is pending. Results apply to fictional inputs and selected routes only, not all obligations. UK domestic coverage is explicitly unresearched. California uses a fixed initial-cycle example with separate implementation/enforcement overlays; EU thresholds are not a verified national filing assessment. Revised ESRS scrutiny and Mexico relief questions remain visible. Public PepsiCo rows always remain unresolved. A passed milestone is not automatically treated as completed, and no record is automatically marked human-reviewed.

For a team presentation, follow [the team walkthrough](docs/DEMO_WALKTHROUGH.md). No confidential client information is needed.

## Run

No application dependencies, build tools, database or API key are needed. Serve the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000; it starts in the Atlas client workspace. Use HTTP/HTTPS, not a `file://` URL: the interface loads a JavaScript module and a local JSON file.

## Test

Use Node.js 22 or later:

```sh
node scripts/check.mjs
node --test tests/tracker.test.mjs
```

The 49 tests cover schema and source references, date semantics, filtering, safe rendering, eight views, application event wiring, error recovery, local HTTP delivery, actual threshold boundaries, financial-year phases, historical listing/index facts, relief uncertainty, scenario dates, control/ownership distinctions, public-data isolation, evidence selection and session notes. The DOM adapter is not a browser; visual layout and real browser interactions need a separate check before public release.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Semantic page shell and controls |
| `assets/styles.css` | Original responsive styling; system fonts |
| `assets/core.mjs` | Validation, filtering and date logic |
| `assets/app.mjs` | Views, details and browser interaction |
| `assets/demo-core.mjs` | Scenario snapshots, boundary positions, source-backed requirement screening, guided answers and in-memory state |
| `assets/demo-views.mjs` | Client graph, entity inspector, applicability matrix, change comparison and three-panel notebook |
| `assets/extended-core.mjs` | California/Mexico/EU screening, materiality and supplier-role logic |
| `assets/extended-views.mjs` | Adoption, materiality and supplier sections |
| `data/extended-requirements.mjs` | Additional official sources, selected routes and fictional assessment examples |
| `assets/demo.css` | Responsive styling for the two demo views |
| `data/requirements.mjs` | Combined eight-route pack; AU/SGX phases and source metadata |
| `data/records.json` | Original starter dataset and editorial comparisons |
| `data/client-demo.mjs` | Optional public subsidiary extract, fictional Atlas facts and transaction/phase scenarios |
| `docs/DATA_GUIDE.md` | Schema and content editing rules |
| `docs/AGENT_WORKFLOW.md` | Proposed research/verification workflow; not activated |
| `docs/SOURCE_LOG.md` | Research scope and primary-source record |
| `docs/PROVENANCE.md` | Implementation and repository-history boundaries |
| `docs/DEMO_WALKTHROUGH.md` | Presentation steps and expected results |
| `docs/REQUIREMENTS_SCOPE.md` | Included routes, exclusions, date semantics and research limitations |
| `docs/FUTURE_MODULES.md` | Proposed full-build architecture and scope boundaries |
| `docs/CLIENT_DATA_SECURITY.md` | Security requirements before handling client data or adding AI |
| `scripts/check.mjs` | Dataset, demo fixture and local asset validation |
| `tests/tracker.test.mjs` | Automated unit, rendering and event-wiring tests |
| `.github/workflows/validate.yml` | GitHub checks only; no deployment or scheduled research |

## Hosting after review and merge

All runtime paths are relative, so the project can be hosted under a repository subpath.

For GitHub Pages: open this repository's Settings → Pages, select Deploy from a branch, then `main` and `/(root)`. Save and check the Pages deployment in Actions. This is a manual opt-in; the validation workflow does not publish a website.

For another static host: serve the repository root with no build command. No custom domain is required. Do not publish `.env` files or API keys.

## Data and automation

The browser loads **local assets, `data/records.json` and the bundled `data/client-demo.mjs`, `data/requirements.mjs` and `data/extended-requirements.mjs` modules**. It does not call the reference project's backend, any AI provider or analytics service. External regulatory URLs are links opened on user request. The public extract is a snapshot, not a live feed.

Demo state and saved responses stay in page memory and are cleared on refresh. Scenario overlays are independent, not a persistent graph history. No client file picker, upload endpoint, database, login or model integration is active. See [future modules](docs/FUTURE_MODULES.md) and [client-data safeguards](docs/CLIENT_DATA_SECURITY.md) before extending the demo.

Research automation is **not enabled**. The included GitHub workflow validates committed files only. To add scheduled research, choose the model/search services, credentials, budget, cadence and reviewer; follow `docs/AGENT_WORKFLOW.md`. A schedule must not be described as active until a real run has succeeded.

## Originality and limitations

This working version replaces the inherited website, data snapshot and documentation with a new implementation and original summaries researched from official sources. The earlier project was a functional reference, not a source of copied code, styling or data. Its image and service connection are not used.

The repository remains a GitHub fork. Earlier commits and GitHub's fork relationship remain intact; this change does not relicense or claim ownership of those materials. No new blanket licence is applied to inherited history or third-party sources. See `docs/PROVENANCE.md`.

This is an independent demo, unaffiliated with standard setters or regulators. It is not legal, accounting or assurance advice. Read the authoritative source and assess the relevant entity, jurisdiction and reporting period before acting.
