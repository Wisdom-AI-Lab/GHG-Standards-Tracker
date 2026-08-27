# Five-minute Atlas team walkthrough

## Opening the demo

Local preview is optional: with the project downloaded and Python installed, serve the repository root with `python3 -m http.server 8000`, then open http://localhost:8000. This does not publish anything. Alternatively, after review/merge and explicit hosting setup, open the hosted link. Hosting is not enabled by this change.

The default view is **Atlas · main demo**. Refresh resets the session. PepsiCo is available under **Optional public-data example**, but is not needed for this presentation.

Opening statement: “Atlas is a fictional client. We are testing selected real reporting requirements against clearly labelled sample facts, showing the evidence and the gaps. A screening result is not a final compliance determination.”

## 1. Organisation and reporting boundary — 45 seconds

Start with **Baseline**, organisation date **1 Feb 2027**, FY start **1 Jul 2026**, and **Financial control**. Select a graph node to inspect its facts. Ownership and control are separate inputs. The group root and facility illustrate structure but are not separately screened as legal entities.

## 2. Requirements and evidence — 75 seconds

Open **Applicability**, then **Clear table filters**. There are 17 rows: four fictional legal entities against four selected real requirements, plus one explicit UK domestic-coverage gap.

- Five in-group pairs pass the selected screens at the default period.
- Pacific matches the Australian corporate-size route. Open **Why this result?** to see the two-of-three calculation, period, currency, prerequisites and ASIC citations.
- Straits matches the three selected SGX routes. The inspector identifies its historical STI membership as a fictional fact.
- UK Distribution matches the SGX Scope 1/2 screen because Mainboard coverage is explicitly assumed, despite UK incorporation. Its historical STI membership is unknown, so two routes remain unresolved. Its UK domestic obligations are unresearched.

Every row provides source-note buttons. Open a note to see the official URL, paragraph/page locator, source-check date and review limits. A route non-match does not mean there are no reporting obligations.

## 3. Acquisition, divestment and real reporting phases — 90 seconds

Choose **Acquire Orchid**, then **Changes & history**. Four rows change group membership; Orchid's local screening results do not change merely because it enters Atlas. The in-group match count rises from five to six.

In the graph, select Orchid. Financial control includes it, operational control excludes it, and equity share shows a 40% illustrative allocation. The control facts are stipulated, not inferred from the ownership percentage. Set the organisation date to **27 Aug 2026** to show the acquisition has not yet taken effect.

Return to **1 Feb 2027** and choose **Divest Pacific**. Pacific and its facility leave the group view. Pacific's local screen remains visible and matched; group exit is not an exemption.

For the regulatory-time example, choose **Baseline** and FY start **1 Jan 2025**, then **Compare reporting phases**. This compares that period with **1 Jan 2028**, holding the checked rule pack constant. Three rows change screening status: Pacific's Australian screen and two STI Scope 3 screens. One moves to unresolved because the historical index fact is missing. No threshold or regulatory amendment is invented. Non-STI routes in later years remain outside this selected pack.

The organisation date and FY start have different jobs. All financial inputs are explicit sample amounts for the selected period, not actual year-end results or forecasts of a real company.

## 4. Cited answers and missing facts — 60 seconds

Open **Regulatory notebook**. It shares the active Atlas scenario and reporting period.

1. Choose **Which jurisdictions and triggers apply?** View the matrix, source buttons and context.
2. Choose **What information is missing?** See named evidence gaps and the UK coverage gap.
3. Uncheck **ASIC RG 280 · size and commencement**. The guided answer is withheld until required evidence is selected again.
4. Save a supported response. It becomes a session snapshot, not a reviewer approval; refresh clears it.
5. Use **What does a screening result mean?** to explain the distinction between a source-backed screen and a final compliance conclusion.

Five guided questions and a few exact aliases are supported. Arbitrary questions receive a limitation message. No live model or file ingestion is connected.

## 5. Funding discussion — 30 seconds

The demonstrated workflow is entity facts → selected legal conditions → explained result → missing information → reviewed guidance. The funded build would add verified client evidence, broader reviewed rules, statutory consolidation, secure uploads, cited model answers, approvals and maintained change history.

## Optional appendix: public evidence

Expand **Optional public-data example** and select PepsiCo. Its five dated public subsidiary records remain unresolved. This shows how incomplete public evidence is handled without inventing ownership or applicability facts. Return to Atlas for the working scenarios.

## Before presenting

Check layout, scrolling, keyboard navigation, source dialogs and controls in the presentation browser. Automated tests use a minimal DOM adapter; actual browser/visual QA is still required. Do not enter confidential client material. Review REQUIREMENTS_SCOPE.md and keep the fictional-fact and pending-review labels visible.
