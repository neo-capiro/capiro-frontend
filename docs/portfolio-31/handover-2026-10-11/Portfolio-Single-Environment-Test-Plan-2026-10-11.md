# Portfolio acceptance using one Capiro environment

> Historical pre-deployment plan. The isolated ECS preview is now healthy, while Clerk subdomain, traffic DNS, and signed-in acceptance remain pending. See [HANDOVER.md](./HANDOVER.md) and re-read live service state before acting.

Updated 2026-10-11. The existing backend can support a separate Portfolio frontend preview, but **no preview URL or signed-in Portfolio acceptance exists yet**. See the [AWS readiness record](./Portfolio-AWS-CLI-Preview-Readiness-2026-10-11.md) for exact resources, build IDs and blockers.

## Current state

Draft [PR #4](https://github.com/neo-capiro/meri-greenfield/pull/4) contains the separate Next.js Portfolio frontend. `os.capiro.ai` still serves the existing application, so it cannot display the new frontend. AWS now has an isolated ECR repository, CodeBuild project and an issued, DNS-validated certificate for `portfolio-preview.app.capiro.ai`. An exact-source CodeBuild on Alpine passed 728 unit cases, 459 browser cases, the Linux build and container smoke; its new ECR image scan completed with zero findings. Earlier Debian images retain one HIGH zlib finding and are ineligible. The ECS service, ALB and traffic DNS record have not been created. No production Clerk setting or customer record was changed.

Clerk's production primary domain is `app.capiro.ai`, with allowed subdomains enabled. The dashboard accepted `portfolio-preview.app.capiro.ai` in the input, but the entry was not submitted. A sibling `portfolio-preview.capiro.ai` would require a $10/month satellite; none was purchased. The owner can use the existing production Clerk instance and backend issuer once the separate preview host is ready; a local development Clerk issuer does not match the deployed backend.

## Bounded path

1. Review and merge the source under the shared release process before deployment. The current clean image digest and passing build are recorded in the AWS readiness record; a later runtime change requires a fresh build and scan.
2. Deploy the separate preview ECS/ALB stack by immutable image digest, with only an approved browser IPv4 `/32` admitted. Inject the matching production Clerk key references from Secrets Manager at runtime. Map the frontend proxy to existing core, strategy, workspace and intelligence routes at `https://os.capiro.ai`. The owner selected Intelligence for Bill Tracker; pass `TrackerBackend=intelligence` explicitly, then verify its board, search and watchlist contracts.
3. After healthy `/healthz` targets and backend/auth checks, add the exact allowed subdomain in production Clerk and a Route 53 alias to the preview ALB. Verify TLS, redirects, issuer, `capiro` JWT template and `capiro-internal` membership. Do not alter the existing app route.
4. Start with the owner's internal account and read-only navigation/service reads within the authorized tenant. Check denial, expired-session and missing-data behavior. Record exact target identity and route scope before the signed-in run.
5. Create/update/delete, provider sends, payments and migrations need an exact later test scope, affected IDs, expected effects, read-back and cleanup. CSV import is excluded by direct owner instruction.

This plan does not count a browser smoke as Portfolio acceptance. Of 345 packet rows, 337 remain in scope and open, seven packet exclusions await reconciliation, one CSV row is directly excluded and zero are accepted.
