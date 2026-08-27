# Five-minute team walkthrough

## Preparation

Serve the repository root with `python3 -m http.server 8000` and open http://localhost:8000 in a current browser. Open **Client workspace**. Refresh to reset the demonstration. This branch is not automatically hosted; review and merge, then explicitly choose hosting if needed.

Use this opening: “We are demonstrating how an organisation, evidence and regulatory conditions can be connected. The public company example shows the limits of available evidence. The working decision scenarios use invented entities and rules.”

## 1. Start with public evidence — 45 seconds

Choose **PepsiCo · public extract**. The graph shows five selected subsidiaries from Exhibit 21 of PepsiCo's 2025 filing, observed on 27 December 2025. This is a partial historical extract, not the entire corporate structure.

Select a node. Its jurisdiction and source location are shown, but direct parent, ownership, control, listing and revenue are unknown. Open **Inspect evidence** to see the official link. Graph links mean “listed subsidiary,” not direct ownership.

Choose **Applicability**. All five rows require more facts; no local instrument has been assessed. Say: “This is where additional client information and reviewed local adoption rules would enter the full build.”

## 2. Explain a working decision — 60 seconds

Switch to **Atlas · fictional scenario**. Choose **Baseline**, **1 Feb 2027 · after event**, **Financial control**, and **Applicability**. Clear table filters if needed.

- There are 12 assessment rows: four fictional legal entities against three invented rules. The acquisition target is initially outside the group.
- Two pairs match: Pacific against the invented Australian rule and Straits against the invented Singapore rule.
- The UK entity's revenue is missing, leaving one row unresolved.

Use **Why this result?** to show actual inputs and PASS / FAIL / UNKNOWN conditions. The UK rule tests fictional economic nexus across all entities, not just UK incorporation. These thresholds and instruments are not real laws, even where an IFRS standard is named as an illustrative reference.

Explain that the GHG accounting boundary and local legal applicability are separate questions. Changing a boundary method does not switch off an entity's local obligations.

## 3. Show change over time — 90 seconds

Choose **Acquire Orchid** at the after-event date. Open **Changes & history**. Three assessment statuses change from outside the group to evaluated; Orchid matches the invented UK nexus rule. There are now three matching pairs overall.

Open **Organisation graph**, select Orchid and change the boundary method:

| Method | Expected demonstration result |
| --- | --- |
| Financial control | Included; control is explicitly stipulated in this scenario |
| Operational control | Excluded by this method |
| Equity share | 40% illustrative allocation |

The example deliberately does not infer control from percentage ownership. Change the date to **27 Aug 2026 · before event**: the acquisition has not taken effect and Orchid is outside the group view.

Return to the after-event date. Choose **Divest Pacific**, then **Changes & history**: Pacific and its facility leave the group view. This does not conclude that their local legal obligations cease.

Choose **Change demo rule**: the invented Australian revenue threshold moves from USD 100m to USD 200m. Pacific's USD 180m input no longer meets it. One assessment status changes; the earlier snapshot is preserved. Scenarios are independent, not cumulative.

## 4. Show the notebook — 60 seconds

Open **Regulatory notebook**. Its Sources / Questions / Outputs layout uses the same active profile and scenario.

1. Select **What changes in this scenario?** The response includes the current date, results and supporting notes.
2. Uncheck **Illustrative policy pack**. The answer is withheld because required evidence is deselected. Recheck it.
3. Select **Save response in this session**. A note appears in Outputs; it is a snapshot, not an approval or persistent record.
4. Ask an arbitrary question. The interface explains that only the five guided questions and a few exact aliases are supported.
5. Select the IFRS amendment question to see a bounded source-based summary. A standard's effective date is not proof that a particular jurisdiction or company must apply it.

The disabled file button is a future provision. No document is uploaded and no AI model is called. Refresh clears notes.

## 5. Close with the funding request — 45 seconds

“The demo connects the workflow: entity evidence, reporting boundaries, rule conditions, change impact and cited guidance. Funding would turn these examples into a maintained, permission-controlled service.”

The next phase needs a small agreed jurisdiction set, reviewed legal rules and exceptions, verified client facts, a versioned graph/data store, secure document retrieval, model evaluation, human review and deployment operations. Mistral or another model can support explanations and retrieval; it should not silently decide or approve applicability.

## Presenter checks before the meeting

- Test navigation, scrolling, source dialogs, keyboard focus and notebook layout in the actual presentation browser and screen size.
- Confirm the demo is served over HTTP/HTTPS and the dataset loads without an error.
- Keep the distinction between public facts, invented scenarios and future capabilities visible.
- Do not enter confidential client information; the demo has no authentication or tenant isolation.
- Automated tests passed during implementation. Real-browser visual QA remains a separate pre-presentation check.
