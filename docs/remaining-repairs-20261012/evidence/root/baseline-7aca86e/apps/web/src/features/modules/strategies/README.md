# Strategies implementation boundary

Strategies owns the plan library, working fiscal timeline, metadata and step editors, shared firm phases, context inventory/evidence review, agent proposals, execution run review, and history/export screens. Public entry is `StrategiesScreen`.

Operation contracts follow the existing strategy service controllers and named service projections. Backend guards own client membership, actor permissions, strategy flags, immutable version checks, critical-risk review and execution rules. UI has no authority-bearing tenant fields. Greenfield Meri remains separately owned; assistant views disclose an unavailable connection until a verified greenfield contract exists.

Plan reads and mutation state reuse the shared authenticated request lifecycle and Module UI primitives. Domain files have cohesive ownership; no routes, shell or other feature private imports. Review/version forms use identifiers and concurrency pins from the displayed response.

Validation: contract edge cases, fiscal positioning, filters/form inputs, cancel/error recovery, TypeScript, architecture and build. Live integration, billing calls and deployment require separately configured services and are not claimed by offline tests.
