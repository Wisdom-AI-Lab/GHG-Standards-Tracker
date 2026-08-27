# Client information and AI: prerequisites

## Current demo

The application is static and uses public or fictional data. There is no sign-in, tenant isolation, file picker, upload endpoint, database or model connection. Session notes live in page memory and disappear on refresh. A public static host exposes its bundled files to visitors; do not place confidential information in this repository, even if the interface hides it.

## Before accepting client material

- Obtain appropriate client authority to process each document and verify rights to use standards and other source materials. Public availability alone does not grant unrestricted redistribution rights.
- Implement authentication, per-client authorisation, private storage and tenant separation across originals, extracted text, embeddings, search indexes, conversations, logs and exports. Test cross-client access denial.
- Agree retention, deletion, backup, data-residency and incident-response requirements. Deletion must cover derivatives such as embeddings and generated notes, subject to agreed audit retention.
- Limit file types and size; scan uploads; sandbox parsers; defend against malicious documents and prompt injection. Do not execute instructions found in source documents.
- If fetching user-supplied URLs, defend against server-side request forgery, internal-address access and unsafe redirects. Track source versions and retrieval failures.
- Keep API keys on the server, restrict access and rotate credentials. Do not commit secrets, client files or model responses containing private information to a public repository.
- Review each model provider's data handling, retention and training terms. Minimise transmitted data and redact where appropriate. Do not send client content to a provider before the required approval.
- Keep monitoring and application logs useful without collecting sensitive prompts or documents by default. Apply access control to audit trails and reviewer actions.
- Separate draft guidance from approved conclusions. Preserve citation locations, applicable source versions, unresolved facts and an identifiable human review decision.

## Release gate

Before a client pilot, complete security and privacy review, cross-tenant tests, restoration/deletion tests, model and retrieval evaluations, accessibility/browser checks and an operational support plan. This document records requirements; it is not evidence that the controls are implemented.
