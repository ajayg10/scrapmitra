# Infrastructure foundation

`template.yaml` is a SAM/CloudFormation storage scaffold. It defines the eight requested DynamoDB tables, uploads and audio buckets, encryption, public-access blocks, a seven-day uploads lifecycle, and origin-restricted PUT CORS.

It has **not** been deployed. It contains no API, functions, execution roles, schedule, Cognito, Cedar, model ID, or account/region selection. `AppOrigin` deliberately has no default. The root deployment and teardown commands fail clearly until the runtime stack is ready.

`uv run cfn-lint infra/template.yaml` checks the template locally. The CI skeleton also runs AWS SAM validation. Syntax validation is not evidence that a lifecycle rule exists in an AWS account.

Phase 4 will add HTTP API/Lambda resources and scoped IAM. Phase 8 will complete deployment, price refresh, hosting, budget visibility, and teardown. Do not put actual credentials, account IDs, secrets, or presigned URLs in the repository.
