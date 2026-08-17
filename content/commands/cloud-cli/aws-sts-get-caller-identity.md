---
slug: aws-sts-get-caller-identity
name: aws sts get-caller-identity
aliases: []
category: cloud-cli
tags:
  - aws
  - cloud
  - sts
  - identity
  - authentication
  - security
difficulty: beginner
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - check current aws identity
  - who am i in aws
  - get aws account id
  - verify aws credentials
  - check aws arn
relatedCommands:
  [
    aws-configure,
    aws-ec2-describe-instances,
    aws-eks-update-kubeconfig,
    aws-iam-get-user,
    aws-s3-ls,
    aws-ec2-run-instances,
  ]
alternatives: [aws-iam-get-user]
status: draft
---

## What is it?

`aws sts get-caller-identity` is an AWS CLI command that returns details about the IAM user, IAM role, or root account credentials currently being used to make API requests. It queries the AWS Security Token Service (STS) endpoint to programmatically resolve and output the caller's canonical User ID, AWS Account ID, and Amazon Resource Name (ARN).

## Why does it exist?

When managing complex multi-account cloud environments with frequent cross-account role assumptions, temporary session tokens, and dynamic credential files, it is remarkably easy to lose track of which active identity is executing commands. `aws sts get-caller-identity` exists to provide an instantaneous, reliable smoke-test for AWS authentication. It eliminates guesswork by validating that your local AWS CLI context successfully resolves to the intended security principal before running sensitive provisioning or deployment scripts.

## Syntax

```bash
aws sts get-caller-identity [--profile <value>] [--region <value>] [--output <value>] [--endpoint-url <value>] [--query <value>] [--no-verify-ssl] [--debug] [--no-cli-pager] [--cli-read-timeout <value>] [--cli-connect-timeout <value>]
```

## Flags

| Flag                          | Description                                                                                           | Example                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `--profile <name>`            | Specifies a named profile from your local configuration to use for the API request.                   | `aws sts get-caller-identity --profile production`                 |
| `--region <region>`           | Overrides the default region, directing the STS API request to a specific regional endpoint.          | `aws sts get-caller-identity --region us-east-1`                   |
| `--output <format>`           | Defines the response format (`json`, `text`, `yaml`, or `table`), defaulting to JSON.                 | `aws sts get-caller-identity --output text`                        |
| `--query <expression>`        | Filters the JSON response using JMESPath syntax to extract specific fields (e.g., Account ID).        | `aws sts get-caller-identity --query "Account"`                    |
| `--endpoint-url <url>`        | Overrides the default AWS STS service endpoint with a custom or local mock URL.                       | `aws sts get-caller-identity --endpoint-url http://localhost:4566` |
| `--no-verify-ssl`             | Disables SSL/TLS certificate verification for corporate proxies or interception environments.         | `aws sts get-caller-identity --no-verify-ssl`                      |
| `--debug`                     | Turns on comprehensive debugging logs, printing raw HTTP requests, headers, and signature signatures. | `aws sts get-caller-identity --debug`                              |
| `--no-cli-pager`              | Disables the automatic output pager, forcing the response to stream directly to standard output.      | `aws sts get-caller-identity --no-cli-pager`                       |
| `--cli-read-timeout <sec>`    | Sets the maximum socket read timeout in seconds before the API request aborts.                        | `aws sts get-caller-identity --cli-read-timeout 30`                |
| `--cli-connect-timeout <sec>` | Sets the maximum socket connection timeout in seconds before failing network resolution.              | `aws sts get-caller-identity --cli-connect-timeout 5`              |

## Examples

```bash
aws sts get-caller-identity
```

> This executes a standard call using your default active credentials, querying the AWS STS service and returning a JSON payload containing your `UserId`, `Account` ID, and `Arn`.

```bash
aws sts get-caller-identity --profile staging-admin
```

> This queries the STS API specifically through the lens of a named profile called `staging-admin`, verifying that your secondary credentials map to the expected cross-account role.

```bash
aws sts get-caller-identity --query "Account" --output text
```

> This uses JMESPath query filtering (`--query`) combined with raw text output (`--output text`) to strip away all JSON structural brackets, outputting strictly the 12-digit AWS Account ID as a clean string for shell script variable assignment.

```bash
aws sts get-caller-identity --output table
```

> This formats the returned identity metadata into a clean, ASCII-rendered table layout, which is particularly useful for rapid human readability during manual interactive auditing sessions.

```bash
aws sts get-caller-identity --debug
```

> This invokes the command with full debugging output enabled, exposing the underlying Signature Version 4 cryptographic signing process, HTTP headers, and JSON response payloads for deep troubleshooting.

## Real-World Scenarios

**Validating CI/CD Pipeline AWS Authentication**

```bash
aws sts get-caller-identity || { echo "AWS Auth Failed"; exit 1; }
```

> DevOps engineers place this command at the absolute beginning of continuous integration deployment scripts (GitHub Actions, GitLab CI). It acts as a fail-fast gatekeeper, ensuring that injected cloud credentials are valid before the pipeline attempts expensive infrastructure provisioning.

**Extracting Account IDs for Terraform or CDK Automation**

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
```

> Automation scripts frequently need to reference the current AWS account number dynamically to construct resource ARNs, IAM trust policies, or S3 bucket names. Capturing the output of `get-caller-identity` programmatically ensures scripts remain portable across environments.

**Verifying Cross-Account Role Assumptions**

```bash
aws sts assume-role --role-arn arn:aws:iam::123456789012:role/DeployRole --role-session-name DeploySession
aws sts get-caller-identity
```

> After executing an STS assume-role operation that exports temporary session tokens into environment variables, engineers run `get-caller-identity` to confirm that their CLI execution context has successfully migrated from their base user identity into the assumed target role ARN.

## When should it NOT be used?

- **Checking fine-grained IAM permissions or policies:** Running `get-caller-identity` expecting it to tell you if you can write to an S3 bucket. **Reason:** The command only reports _who_ you are, not _what_ permissions your policy grants. **Use instead:** `aws iam simulate-principal-policy` or `aws accessanalyzer`.
- **Listing human users in an AWS account:** Using `get-caller-identity` to audit active team members. **Reason:** It only returns the single principal associated with the active request context, not a directory of account users. **Use instead:** `aws iam list-users`.
- **Long-running health checks or heartbeat monitors:** Polling `get-caller-identity` continuously as a server uptime check. **Reason:** While lightweight, excessive API polling against STS endpoints can trigger rate limits (throttling) and incur unnecessary network overhead. **Use instead:** Local metrics or native monitoring daemons.

## Alternatives

- **`aws iam get-user`:** Retrieves detailed metadata about the current IAM user. **Tradeoff:** `aws iam get-user` provides deep user metadata (creation date, password status), but it **fails completely** if you are authenticating via an IAM Role or temporary STS credentials, whereas `get-caller-identity` works universally across all identity types (Users, Roles, Root, Federation).

## How it works internally

When `aws sts get-caller-identity` is executed, the AWS CLI constructs an HTTPS request targeted at the global or regional `sts.amazonaws.com` endpoint.

Before transmission, the CLI signs the request using **Signature Version 4 (SigV4)**. It pulls the active credentials (Access Key ID, Secret Access Key, and optional Session Token) from your configuration files or environment variables, creates a canonical request string, hashes it using SHA-256, and signs it with a derived cryptographic key based on your secret key and the current date/region.

Upon receiving the signed HTTPS request, the AWS Security Token Service backend authenticates the signature, verifies that the token or key has not expired, and resolves the underlying principal. It packages this identity context into a structured JSON response containing three fields:

1. `UserId`: The unique alphanumeric identifier of the principal.
2. `Account`: The 12-digit AWS account number hosting the principal.
3. `Arn`: The Amazon Resource Name of the user or assumed role session.
   The CLI receives this JSON response and prints it to standard output, returning an exit code of `0` upon successful authentication, or a non-zero error code (such as `255`) if the credentials are invalid, malformed, or expired.

## Performance Notes

- Execution speed is heavily dependent on network latency and DNS resolution because the command makes a live round-trip HTTPS request out to the regional or global AWS STS API endpoint.
- Unlike local configuration checks, `get-caller-identity` cannot be cached indefinitely by the CLI; every invocation incurs network and cryptographic signature overhead.

## Security Notes

- **Credential Validation Risk:** Because `get-caller-identity` communicates directly with AWS, attempting to run it with compromised or stolen API keys immediately alerts cloud security monitoring tools (like AWS CloudTrail and GuardDuty) to the IP address and time of the caller.
- **Output Exposure in Shared Terminals:** Printing full identity ARNs or Account IDs in multi-tenant terminal environments or unmasked CI/CD logs can inadvertently leak internal AWS account structures to unauthorized observers.

## Common Mistakes

- **Assuming identity persistence across shell tabs:** Running `get-caller-identity` in Tab A after exporting temporary role credentials in Tab B. **Why it's wrong:** Environment variables (`AWS_ACCESS_KEY_ID`, etc.) are scoped strictly to the individual shell process in which they were exported. They do not automatically sync across separate terminal windows.
- **Ignoring expired session tokens:** Getting authentication failure errors and failing to check token expiration. **Why it's wrong:** Temporary STS credentials expire rapidly (usually within 1 to 12 hours). When they expire, `get-caller-identity` will fail with an `ExpiredToken` error, requiring a fresh credential refresh.
- **Confusing user identity with account ownership:** Seeing an ARN containing `assumed-role` and assuming you are logged in as a permanent root user. **Why it's wrong:** An `assumed-role` ARN indicates you are operating under temporary delegated permissions, which is standard security best practice, not permanent root access.

## Best Practices

- Always invoke `aws sts get-caller-identity` as an automated smoke-test at the start of any complex deployment script or cross-account management session to guarantee your target environment context is correct.
- Utilize `--query "Account" --output text` when scripting to cleanly isolate the AWS Account ID without parsing heavy JSON structures.
- In multi-account environments, always pair `get-caller-identity` with explicit `--profile` flags to eliminate human error when switching between staging and production cloud estates.

## Interview Questions

**Q:** What is the fundamental difference in capability between `aws sts get-caller-identity` and `aws iam get-user` when verifying your current authentication state?
**A:** `aws iam get-user` only works if you are authenticated as a permanent IAM User, and it will throw an access denied or validation error if you attempt to run it while authenticated via an IAM Role or temporary STS token. `aws sts get-caller-identity` works universally across all principal types—including Root accounts, IAM Users, Assumed Roles, and Federated SSO identities—making it the safest general-purpose identity check.

**Q:** How does the AWS CLI process credentials locally before `aws sts get-caller-identity` successfully reaches the AWS endpoint?
**A:** The CLI resolves credentials using a precedence chain (flags, environment variables, config files, instance metadata), constructs an HTTPS request, and cryptographically signs it using **Signature Version 4 (SigV4)** with your Secret Access Key. Only once this signature and payload are formulated does it transmit the request over the network to the STS API backend for validation.

**Q:** Why is `aws sts get-caller-identity` considered a foundational best practice at the beginning of automated deployment scripts?
**A:** Because it forces an active, live round-trip verification against the cloud provider before any infrastructure actions occur. It ensures that credentials are valid, unexpired, and mapped to the exact intended AWS Account and IAM principal, preventing scripts from accidentally provisioning resources into the wrong environment.

## Practice Problems

**Problem:** You need to write a bash conditional check that verifies whether your AWS CLI is authenticated successfully. If authentication fails, print an error and exit the script.
**Hint:** Use the command combined with standard bash error redirection or logical operators.
**Solution:** `aws sts get-caller-identity || { echo "Authentication failed"; exit 1; }` (The logical OR operator ensures that if `get-caller-identity` returns a non-zero error code due to bad credentials, the script halts immediately).

**Problem:** You only want to extract and print your 12-digit AWS Account ID as plain text without any JSON brackets or field labels.
**Hint:** Combine output formatting with JMESPath query filtering.
**Solution:** `aws sts get-caller-identity --query "Account" --output text` (The query isolates the account number field, and the text output flag strips JSON syntax).

## References

- [AWS STS API Reference - GetCallerIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html)
- [AWS CLI Command Reference - sts get-caller-identity](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sts/get-caller-identity.html)
