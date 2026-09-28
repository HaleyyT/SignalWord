# Pilot hardening — implementation evidence

Status: in progress. Local work only; no deployment, live delivery, or device acceptance.

## Backend trust boundary

Alert and timer creation now use service-only gateway routines. The Edge API authenticates the caller first, supplies that verified identity, and generates provider/capability fields. The wrappers establish transaction-local identity for the existing nested ownership checks. All original and legacy creation overloads deny anonymous and authenticated execution. HTTP v1/v2 shapes remain unchanged.

Database state-machine tests deliberately execute internal routines as the test database owner while preserving subject claims. A separate boundary suite exercises actual untrusted roles and denies both internal and gateway calls. Gateway tests assert server credentials for writes and caller credentials for reads. Existing account and destination invitation budgets are retained. Viewer polling is limited to 120 reads/minute/capability; acknowledgement has an independent 20/minute budget. Unknown tokens do not allocate counters. This does not replace hosted ingress protection against volumetric abuse.

Verified locally: 291 database assertions; repository verification (Node/API, viewer, build); five contact and three timer concurrency scenarios. These results do not establish hosted/provider/device acceptance. Full clean migration replay and final application acceptance remain to run.

Deployment must be coordinated: install the new gateway routines before deploying the API that calls them. The grant-revoking migration temporarily makes old backend processes unable to create alerts; use a controlled development maintenance window. Old mobile clients keep their HTTP contract. Do not roll back by restoring insecure grants; roll forward with a compatible backend.
