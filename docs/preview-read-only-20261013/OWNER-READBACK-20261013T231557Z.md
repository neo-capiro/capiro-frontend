# Owner metadata readback, 23:15:57 UTC

The coordinator relayed owner-terminal message `Sentinel_db7986c3cd588191802765d396dafbf7`. Its [structured record](OWNER-READBACK-20261013T231557Z.json) preserves the exact three Clerk/KMS ARNs and the unsuccessful `capiro-staging-api` task-definition lookup. Neither command was repeated here.

The readback closes the missing **current preview stack parameter references**. It does not establish secret contents, actual secret KMS metadata, matching Clerk application/issuer, running-service bindings or authorization suitability. The failed family lookup does not establish that staging resources are absent. The `/dev/` secret namespace is not evidence of a Clerk Test environment.

## Narrow next read

Read the current ECS service pointer for the documented Core target, including active deployments and target-group references:

```sh
aws ecs describe-services \
  --region us-east-1 \
  --cluster capiro-dev \
  --services capiro-dev-api \
  --query '{services:services[].{serviceArn:serviceArn,status:status,taskDefinition:taskDefinition,deployments:deployments[].{status:status,taskDefinition:taskDefinition,runningCount:runningCount,pendingCount:pendingCount},targetGroups:loadBalancers[].targetGroupArn},failures:failures}' \
  --output json
```

This is a metadata-only proposal for the existing authorized owner session; it was not executed here. The target comes from mounted `capirov2` source `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`: `infra/cdk/lib/config.ts:268` identifies the historical production lineage and `clerk.app.capiro.ai` issuer; `infra/cdk/lib/compute-stack.ts:2129` identifies `capiro-dev-api` behind historical production routing and explicitly warns of routing drift. These source records guide the lookup; they do not prove current hostname routing or active deployment state.

If the service is described, use its returned exact task-definition ARN(s), accounting for running deployments, for the next metadata read. Limit output to issuer/audience configuration and named Clerk secret **references**; do not dump arbitrary environment variables or retrieve secret payloads. If the service lookup fails, retain its exact failure and resolve the current Core service through the owner's current routing/deployment inventory. Do not infer absence or substitute another guessed task-family name.

The preview stack parameters are now known; active Core identity is the narrower unresolved prerequisite. Even a matching active issuer would not admit a read route: backend tenant self-healing/admin-mapping effects and trusted internal-tenant identity still require review. PR23 continues to admit **zero backend routes**. No production request, configuration/security change or deployment is authorized by this readback.

This is a documentation-only follow-up after qualification at `c84472e523311988a7ab42b42f7ae4053ac9b3cf`. The original PR23 evidence archive and PR22 packet remain immutable; no test or native acceptance result is newly claimed.
