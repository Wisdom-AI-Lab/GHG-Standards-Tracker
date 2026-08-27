# From concept demo to a client service

This is a proposal, not an implemented backend or a delivery commitment. The two new views work with static evidence and in-memory examples. They reserve a clear place for future services without pretending those services are connected.

## Capabilities

| Area | Working in this demo | Full-build requirement |
| --- | --- | --- |
| Organisation | Selected public subsidiaries; fictional group and facility graph | Verified entity identities, relationship types, reporting hierarchy, control evidence and effective-dated ownership |
| Boundaries | Three methods using explicit fictional facts | Framework-specific policies, joint arrangements, consolidation adjustments and reviewed client decisions |
| Applicability | Eight selected AU/SGX/California/Mexico/EU routes with implementation limits, traces and unresolved inputs | Expanded jurisdiction coverage, reviewed exemptions, full transitional rules, versioned evidence and statutory consolidation |
| Change impact | Independent transaction overlays and source-backed reporting-phase comparisons | Persistent transaction/rule history, affected-entity recomputation, review queue and approvals |
| Notebook | Eleven guided answers, evidence selection and session notes | Secure ingestion, retrieval, source passages, arbitrary-question handling, model integration and evaluations |
| Materiality | Fictional subsidiary/group inputs comparing the financial lens with impact OR financial materiality | Reviewed assessment workflow, stakeholder evidence, thresholds, disaggregation and versioned standards |
| Supplier data | Separate ownership and supply roles; missing/sample/secondary evidence modes | Validated activity data, allocation, estimation, data-request controls and secure supplier portal |
| Monitoring | Proposed workflow in AGENT_WORKFLOW.md | Scheduled jobs, permitted search sources, model/service credentials, budget, observability and human approval |

## Data model to preserve

Keep an entity's identity separate from its relationships. An ownership relationship is not the same as operational control, financial control or a reporting line. A source that lists a subsidiary must not automatically create a direct-parent relationship.

Store typed relationships with `valid_from` / `valid_to`, source references and review state. Also record when a fact was entered or superseded so corrections do not rewrite what an earlier assessment used. Facts such as revenue, assets, employee counts, listing and business nexus need units, scope, period and provenance. An acquisition's announcement date and completion/effective date may differ.

Represent standards separately from legal instruments that adopt or modify them. IFRS S1/S2 publication or effective dates alone do not establish a company's local reporting obligation. Each assessed instrument needs jurisdiction, version, effective/reporting periods, conditions, exemptions, transition provisions and authoritative citations.

An assessment should retain entity facts, rule version, reporting period, evaluated conditions, unresolved inputs, evidence references and reviewer status. Keep GHG consolidation decisions separate from legal applicability. Graph storage may use relational tables with typed edges initially; a dedicated graph database is an option, not a prerequisite for the prototype.

## Evaluation and AI boundary

Use explicit, tested rules for structured applicability conditions. Unknown inputs should remain unknown, and contradictory sources should be flagged for review. Real rules may need AND/OR groups, thresholds over multiple years, exemptions and group-level calculations; the demo covers only a bounded set of eligibility conditions, a two-of-three size test and selected phase dates, not this full range.

A future model can retrieve relevant passages, help extract proposed facts, explain evaluated results and draft guidance with citations. Require human approval before proposed extracted facts or legal interpretations enter the approved dataset. Treat uploaded text as evidence, not instructions. Test for unsupported claims, citation accuracy, prompt injection, source exclusions and confidentiality leaks.

Choose a provider such as Mistral only after deciding data residency, retention, commercial terms, expected quality, cost and security. Keep credentials and model calls on a server. A provider adapter should allow changing models without changing the graph or rule definitions.

## Suggested first funded scope

One consenting client or fully synthetic group, two or three priority jurisdictions, a bounded set of reviewed ISSB-related instruments, and a small approved document collection. Deliver authenticated access, traceable assessments, cited answers and a review workflow before expanding jurisdiction coverage or automating publication. See CLIENT_DATA_SECURITY.md for prerequisites.
