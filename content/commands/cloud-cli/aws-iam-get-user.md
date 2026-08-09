---
slug: aws-iam-get-user
name: aws iam get-user
aliases: []
category: cloud-cli
tags: [aws, iam, security, identity, cloud, authentication]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'get current aws user'
  - 'check aws identity'
  - 'find iam user arn'
  - 'get aws user details'
  - 'who am i aws'
relatedCommands: [aws-sts-get-caller-identity, aws-configure]
alternatives: [aws-sts-get-caller-identity]
status: draft
---

## What is it?

`aws iam get-user` is an AWS CLI command that retrieves identity metadata about a specific Identity and Access Management (IAM) user, or the current IAM user invoking the command if no username is provided. It queries the AWS IAM control plane and returns a JSON object containing the user's Amazon Resource Name (ARN), unique ID, creation date, and attached path. Cloud engineers and security administrators use it to quickly verify authentication contexts, audit specific user accounts, and extract precise ARN strings for injection into resource-based policies.

## Why does it exist?

Before the widespread adoption of AWS Security Token Service (STS) and temporary assumed roles, long-lived IAM users were the primary method of programmatic interaction with AWS APIs. Automation frameworks and deployment scripts needed a reliable, deterministic way to answer the question "who am I executing as?" before applying destructive changes or generating security policies. `aws iam get-user` exists to bridge this gap, providing a direct query mechanism against the global IAM database to extract identity metadata without requiring access to the AWS Management Console.

## Syntax

```bash
aws iam get-user [options]
aws iam get-user --user-name <value> [options]
```

## Flags

| Flag                      | Description                                                                                                                       | Example                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `--user-name`             | The name of the IAM user to retrieve. If omitted, it defaults to the user whose credentials are used to call the API.             | `aws iam get-user --user-name Alice`                    |
| `--query`                 | A JMESPath query to filter the JSON output, extracting only specific fields (like the ARN or UserId) instead of the full object.  | `aws iam get-user --query "User.Arn"`                   |
| `--output`                | Specifies the formatting style of the command output. Accepts `json`, `text`, `table`, or `yaml`.                                 | `aws iam get-user --output text`                        |
| `--profile`               | Overrides the default AWS credential profile, forcing the command to authenticate using a specific set of configured credentials. | `aws iam get-user --profile prod-admin`                 |
| `--region`                | Specifies the AWS region. _Note: IAM is global, but this sets the region for the underlying signature and endpoint routing._      | `aws iam get-user --region us-east-1`                   |
| `--generate-cli-skeleton` | Prints a JSON skeleton of the required input parameters without making the API call. Used to create template files.               | `aws iam get-user --generate-cli-skeleton`              |
| `--cli-input-json`        | Reads command parameters from a provided JSON string or file rather than passing them individually via command-line flags.        | `aws iam get-user --cli-input-json file://input.json`   |
| `--debug`                 | Enables verbose logging, printing detailed information about HTTP requests, retries, and AWS Signature Version 4 calculations.    | `aws iam get-user --debug`                              |
| `--endpoint-url`          | Overrides the default AWS IAM endpoint. Mostly used when testing against local emulators like LocalStack.                         | `aws iam get-user --endpoint-url http://localhost:4566` |
| `--no-verify-ssl`         | Disables TLS/SSL certificate validation. Should only be used in tightly controlled proxy environments or during local testing.    | `aws iam get-user --no-verify-ssl`                      |
| `--color`                 | Forces or disables colored output formatting for JSON and tables. Accepts `on`, `off`, or `auto`.                                 | `aws iam get-user --color off`                          |

## Examples

```bash
aws iam get-user
```

> Retrieves the metadata for the IAM user currently authenticating the AWS CLI session. This is the most common usage, functioning as a basic "whoami" check to ensure the terminal is using the correct AWS credentials before executing destructive commands.

```bash
aws iam get-user --user-name Bob
```

> Retrieves the metadata explicitly for the IAM user named `Bob` in the current AWS account. This requires the calling identity to have the `iam:GetUser` permission granted for Bob's ARN.

```bash
aws iam get-user --query 'User.Arn' --output text
```

> Retrieves the current user's metadata but aggressively filters the output using a JMESPath query. It extracts _only_ the ARN string and formats it as raw text, making it perfect for assigning to a bash variable in an automation script.

```bash
aws iam get-user --output table
```

> Returns the user information in an ASCII-formatted table instead of raw JSON. This is purely for human readability during interactive terminal sessions when auditing a user's creation date or exact path.

```bash
aws iam get-user --user-name svc-deploy-bot --profile security-audit
```

> Checks the metadata of a specific service account (`svc-deploy-bot`) by utilizing a named AWS CLI profile (`security-audit`) that possesses cross-account or elevated read-only IAM permissions.

## Real-World Scenarios

**Validating CI/CD Pipeline Execution Identity**

```bash
CURRENT_USER=$(aws iam get-user --query 'User.UserName' --output text)
if [ "$CURRENT_USER" != "ci-deployer" ]; then
    echo "Error: Pipeline must run as ci-deployer user"
    exit 1
fi
```

> In rigid deployment environments lacking assumed roles, shell scripts are often hardcoded to verify their execution context. By checking the exact IAM username returned by `get-user`, the script prevents accidental infrastructure corruption if an engineer attempts to run the CI script locally using their personal, overly-permissive administrative credentials.

**Dynamic Resource Policy Generation**

```bash
USER_ARN=$(aws iam get-user --query 'User.Arn' --output text)
sed "s|TARGET_ARN|$USER_ARN|g" bucket-policy-template.json > bucket-policy.json
aws s3api put-bucket-policy --bucket my-secure-bucket --policy file://bucket-policy.json
```

> When automating the provisioning of developer sandbox environments, engineers need to restrict an S3 bucket or KMS key exclusively to the developer running the provisioning script. This snippet dynamically grabs the executing user's exact ARN and injects it into a JSON policy document template.

**Auditing User Age for Compliance**

```bash
aws iam get-user --user-name legacy-admin --query 'User.CreateDate' --output text
```

> Security teams performing compliance audits (like SOC2 or ISO 27001) must verify that long-lived IAM users are periodically rotated or decommissioned. This command specifically isolates the absolute UTC timestamp of when the user was created, allowing auditors to determine if the account violates maximum-age lifecycle policies.

## When should it NOT be used?

- **Checking Federation or Assumed Roles:** **Do not use `aws iam get-user` if you are authenticating via AWS SSO, SAML, or `AssumeRole`.** The command strictly requires an actual IAM User identity. If called by an assumed role, the AWS API will throw a `ValidationError`. Use `aws sts get-caller-identity` instead.
- **Auditing Permissions:** **Do not use this command to see what a user is allowed to do.** `get-user` only returns identity metadata (ARN, Creation Date). It does _not_ return attached managed policies or inline permissions. Use `aws iam list-attached-user-policies` or `aws iam simulate-principal-policy`.
- **Listing all users:** **Do not use this in a loop to audit an entire account.** Calling `get-user` thousands of times will result in aggressive API throttling. If you need to see metadata for all users in an account, use `aws iam list-users` to retrieve them in paginated batches.

## Alternatives

- **`aws sts get-caller-identity`:** **Best for universal "whoami" checks.** This is the modern, strictly superior alternative for self-identification. It works flawlessly across all authentication types (IAM Users, Assumed Roles, EC2 Instance Profiles, AWS SSO) and never throws an error simply because of the identity type.
- **`aws iam list-users`:** **Best for account-wide auditing.** If you need to map user IDs to ARNs across an entire organization, `list-users` retrieves up to 1,000 user records per API call, minimizing network overhead and avoiding rate limits.

## How it works internally

When `aws iam get-user` is executed, the AWS CLI uses the `botocore` Python library to construct an HTTP POST request targeting the global IAM service endpoint (`https://iam.amazonaws.com/`). The action specified in the request payload is `GetUser`.

The request is cryptographically signed using AWS Signature Version 4 (SigV4). The CLI generates a canonical request hash using the Access Key ID and Secret Access Key found in the active environment variables or `~/.aws/credentials` file.

Crucially, if the `--user-name` parameter is omitted, the CLI does not send a blank username. Instead, the IAM control plane evaluates the SigV4 signature on the incoming request, extracts the Access Key ID used to sign it, looks up the specific IAM User that owns that Access Key, and dynamically returns that user's metadata.

The IAM service processes this request in the `us-east-1` region (where the IAM primary control plane resides) and returns an XML payload. The `botocore` library intercepts this XML response, translates it into a structured Python dictionary, applies any client-side `--query` filtering using the JMESPath library, and serializes the final result to the terminal as JSON, text, or a formatted table.

## Performance Notes

- **Global Endpoint Latency:** Because IAM is a global service, all `get-user` API calls are routed to the control plane in the `us-east-1` (N. Virginia) region. Developers running this command from regions like `ap-southeast-2` (Sydney) will experience inherently higher network latency (usually 150ms - 300ms) compared to regionalized services like EC2 or S3.
- **API Throttling:** The IAM API enforces strict rate limits. If a script runs `aws iam get-user` in a tight loop across hundreds of usernames, the AWS API will respond with HTTP 400 `ThrottlingException` errors. The CLI implements exponential backoff to handle this, but it will significantly degrade execution speed.

## Security Notes

- **Required Permissions:** To retrieve metadata about _another_ user, the calling identity must possess the `iam:GetUser` permission specifying that user's ARN in the resource block. However, users are typically permitted to call `iam:GetUser` on themselves implicitly, even without explicit IAM policy grants.
- **CloudTrail Logging:** Every execution of `aws iam get-user` is recorded in AWS CloudTrail as an API event. Security Operations Centers (SOC) monitor these logs. Unexpected spikes in `GetUser` calls from a compromised credential often indicate an attacker attempting automated reconnaissance to map out an account's organizational structure.
- **No Secret Exposure:** The output of this command is completely benign. It does not return passwords, console login profiles, or active access keys, making the JSON output safe to log in CI/CD pipeline outputs.

## Common Mistakes

- **Using it with AWS SSO / Assumed Roles**
  - _Mistake:_ Logging in via AWS SSO (Identity Center) and running `aws iam get-user` to check authentication, resulting in: `An error occurred (ValidationError) when calling the GetUser operation: Must specify userName when calling with non-User credentials`.
  - _Why:_ AWS SSO authenticates you using temporary STS assumed roles, not IAM Users. The IAM API rejects the call because there is no backing IAM User object to query. Always use `aws sts get-caller-identity` for self-identification instead.
- **Confusing User ID with Access Key ID**
  - _Mistake:_ Expecting the `UserId` returned (e.g., `AIDAJQABLZS4A3QDU576Q`) to match the `AWS_ACCESS_KEY_ID` (e.g., `AKIAIOSFODNN7EXAMPLE`).
  - _Why:_ The `UserId` is an internal, globally unique identifier assigned to the IAM identity upon creation. It is permanent. Access Keys are rotatable, temporary credentials attached _to_ that identity. They are distinct concepts.

## Best Practices

- **Transition to STS:** Deprecate the use of `aws iam get-user` as a "whoami" check in all modern shell scripts. Replace it entirely with `aws sts get-caller-identity`, which provides a unified response structure regardless of whether the script is run by a User, an EC2 Role, or an SSO identity.
- **Use JMESPath for Extraction:** Never pipe the JSON output of this command into text processing tools like `grep` or `awk` to extract the ARN. Rely natively on `--query 'User.Arn' --output text` to ensure robust, parser-safe string extraction that won't break if AWS modifies the JSON schema ordering.

## Interview Questions

**Q: You run `aws iam get-user` without passing a `--user-name` flag, but the command succeeds. How does AWS know which user's data to return?**
**A:** When the `--user-name` flag is omitted, the AWS IAM service analyzes the AWS Signature Version 4 (SigV4) headers of the HTTP request. It extracts the Access Key ID used to sign the request, queries its database to find the IAM User that owns that specific Access Key, and returns the metadata for that user.

**Q: A developer runs `aws iam get-user` locally and it works perfectly. They paste the exact same script into an EC2 instance, but it fails with a `ValidationError`. What is the most likely architectural reason?**
**A:** The developer's local machine is authenticated using long-lived IAM User credentials (Access Keys). The EC2 instance is authenticated using an attached IAM Instance Profile, which utilizes temporary STS Assumed Roles. Because `get-user` only works on actual IAM Users, the API rejects the Assumed Role's implicit query.

**Q: What is the primary difference in use cases between `aws iam get-user` and `aws iam list-users`?**
**A:** `aws iam get-user` is designed to fetch detailed metadata for a single, specific IAM user (or the calling identity). `aws iam list-users` is designed to retrieve a paginated array of all IAM users within an AWS account, making it the correct choice for organizational auditing and bulk mapping operations.

## Practice Problems

**Problem:** You are writing an automation script and need to store the current AWS IAM user's unique Amazon Resource Name (ARN) inside a bash variable named `MY_ARN`. Write the single command to achieve this without using external tools like `jq` or `grep`.
**Hint:** Utilize the built-in filtering and output formatting flags to strip away the JSON structure.
**Solution:**

```bash
MY_ARN=$(aws iam get-user --query 'User.Arn' --output text)
```

**Problem:** You are an administrator performing a security review. You need to verify the exact UTC timestamp when the IAM user `contractor-deploy` was created in your AWS account. Write the command to output _only_ this date string.
**Hint:** Pass the specific user's name to the command and use JMESPath to target the creation date property.
**Solution:**

```bash
aws iam get-user --user-name contractor-deploy --query 'User.CreateDate' --output text
```

## References

- [AWS CLI Command Reference: iam get-user](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/get-user.html)
- [AWS IAM API Reference: GetUser](https://docs.aws.amazon.com/IAM/latest/APIReference/API_GetUser.html)
- [AWS Identity and Access Management User Guide: IAM Identifiers](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html)
