# Maintaining the original dataset

The application reads `data/records.json`. Edit through a branch and pull request. Do not insert HTML; all dataset text is displayed as plain text.

## Core fields

| Field | Meaning |
| --- | --- |
| `schema_version` | Currently `1` |
| `prepared_on` | Date this dataset edition was prepared; not an automated scan timestamp |
| `records[].id` | Stable, unique lowercase identifier using letters, digits and hyphens |
| `framework`, `category`, `region` | Grouping labels; region is not an applicability conclusion |
| `stage` | `development`, `published`, `effective`, or `proposal` |
| `summary`, `change_note` | Bounded summary and what changed; do not imply completeness |
| `action` | Editorial suggestion, distinct from a legal obligation |
| `applicability` | What still needs entity/jurisdiction assessment |
| `review` | `source_checked`, `human_reviewed`, or `unverified` |
| `checked_on`, `check_note` | Exact source-check date and scope/limitations |
| `reviewer`, `reviewed_on` | Required for human-reviewed records; a real human must supply approval |
| `sources[]` | Primary-source title, publisher and HTTPS URL |
| `developments[]` | Dated event, label and zero-based source index |
| `milestones[]` | Date, label, date kind, projected flag and source index |
| `comparisons[]` | Original editorial distinctions/questions, linked to at least two record IDs |

The validator enforces core structure and referential integrity. It cannot prove that a source supports a claim or that a law applies. A human must check those questions.

## Date rules

- Use `YYYY-MM-DD` only when the source provides an exact day.
- Use `YYYY-MM` when only a month is established.
- Use `YYYY-Q1` through `YYYY-Q4` for quarter-level plans.
- Record publication dates separately from effective periods and consultation deadlines.
- Planned consultations and expected publication dates must have `projected: true`.
- `standard_effective` is not a filing deadline; `programme_opening` is not a statutory effective date.
- An elapsed date is not confirmation of an event. Do not automatically change a record's stage based on the clock.

If a source becomes unavailable or conflicting, record the limitation and set `review` to `unverified` where appropriate. Do not advance `checked_on` without an actual source check. Any substantive change to a human-reviewed claim must reset its review state until it is re-approved.

## Validation

Run `node scripts/check.mjs` and `node --test tests/tracker.test.mjs`. Review every changed claim against the cited source before merging. Keep source notes and the previous version in Git history; avoid reproducing copyrighted standards or long source passages.
