---
slug: aws-configure
name: aws configure
aliases: []
category: cloud-cli
tags: [aws, cloud, authentication, credentials, configuration]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'configure aws credentials'
  - 'setup aws cli'
  - 'set aws default region'
  - 'configure aws access keys'
  - 'setup aws profile'
relatedCommands:
  [
    aws,
    aws-ec2-describe-instances,
    aws-iam-get-user,
    aws-logs-tail,
    aws-s3-ls,
    aws-sts-get-caller-identity,
    aws-ec2-run-instances,
  ]
alternatives: []
status: draft
---

## What is it?

`aws configure` is a built-in command-line utility for the Amazon Web Services (AWS) CLI that initializes and manages user credentials, default regions, and output formats. It provides an interactive wizard or direct parameter interface to store authentication keys securely in local configuration files.

## Why does it exist?

Interacting with AWS APIs requires cryptographically signed HTTP requests containing valid IAM credentials, target regions, and formatting preferences. Typing these parameters into every command is unmaintainable. `aws configure` exists to abstract this overhead by writing parameters into standardized INI files (`~/.aws/credentials` and `~/.aws/config`), establishing a persistent identity state for subsequent CLI invocations.

## Syntax

```bash
aws configure [--profile <profile-name>]
aws configure get <name> [--profile <profile-name>]
aws configure set <name> <value> [--profile <profile-name>]
aws configure list [--profile <profile-name>]
aws configure export-credentials [--profile <profile-name>]
```

## Flags

| Flag                    | Description                                                                                                | Example                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `--profile <name>`      | Specifies a named profile to store or retrieve configuration values, isolating multiple AWS accounts.      | `aws configure --profile production`                   |
| `get`                   | Subcommand used to retrieve the exact value of a specific configuration or credential property.            | `aws configure get region --profile dev`               |
| `set`                   | Subcommand used to define a specific configuration property directly without interactive prompts.          | `aws configure set region us-west-2`                   |
| `list`                  | Subcommand that displays all current configuration sources, profile names, and credential keys in use.     | `aws configure list`                                   |
| `export-credentials`    | Subcommand that outputs active credentials in shell-exportable format for integration with external tools. | `aws configure export-credentials --profile admin`     |
| `--region`              | Global override flag specifying the default AWS Region for service requests during configuration flows.    | `aws configure set region us-east-1`                   |
| `--output`              | Global override flag defining the default formatting style (`json`, `text`, `yaml`, `table`).              | `aws configure set output json`                        |
| `--endpoint-url`        | Overrides standard AWS service endpoints with custom local or proxy URLs (e.g., LocalStack).               | `aws configure set endpoint_url http://localhost:4566` |
| `--no-verify-ssl`       | Disables SSL certificate verification for API requests, useful behind corporate interception proxies.      | `aws configure set ca_bundle ""`                       |
| `--cli-read-timeout`    | Sets the maximum socket read timeout in seconds for API calls made during session validation.              | `aws configure set cli_read_timeout 60`                |
| `--cli-connect-timeout` | Sets the maximum socket connection timeout in seconds before failing credential checks.                    | `aws configure set cli_connect_timeout 10`             |

## Examples

```bash
aws configure
```

> This launches the interactive setup wizard, sequentially prompting you for your AWS Access Key ID, Secret Access Key, default region name, and preferred output format, saving them under the default profile.

```bash
aws configure --profile production
```

> This runs the configuration wizard specifically targeting a named profile called `production`, allowing you to maintain isolated sets of credentials for separate environments on the same workstation.

```bash
aws configure set region eu-west-1 --profile staging
```

> This non-interactively updates only the default region property for the `staging` profile without altering existing access keys or prompting for user input.

```bash
aws configure get aws_access_key_id --profile default
```

> This queries the local configuration store and prints the raw Access Key ID currently bound to the default profile, which is useful for debugging authentication issues in scripts.

```bash
aws configure list
```

> This inspects the current execution context, printing a table that shows active profile names, credential sources (e.g., shared-credentials-file vs environment variables), and resolved configuration values.

## Real-World Scenarios

**Onboarding Developers to a New Environment**

```bash
aws configure --profile team-sandbox
```

> When onboarding a new engineer, administrators provide temporary IAM user credentials. The engineer runs this command to establish a dedicated sandbox profile, allowing them to test infrastructure deployments without risking production resources.

**Automating Multi-Region Deployments in Scripts**

```bash
aws configure set region ap-southeast-1 --profile deployment && aws s3 ls
```

> Deployment pipelines routinely use non-interactive `aws configure set` commands to dynamically switch the target region prior to executing multi-region artifact synchronization across Amazon S3 buckets.

**Integrating with Local Testing Environments (LocalStack)**

```bash
aws configure set endpoint_url http://localhost:4566 --profile localstack
```

> Cloud architects developing serverless applications locally use configuration sets to redirect AWS CLI traffic away from real cloud endpoints toward local mock services running via LocalStack.

## When should it NOT be used?

- **Managing Production Workloads on EC2 Instances:** Do not store permanent IAM user credentials via `aws configure` on virtual machines. **Reason:** Static access keys stored on disk represent a severe lateral movement security risk if the instance is compromised. **Use instead:** IAM Instance Profiles attached directly to the EC2 metadata service (IMDS).
- **Enterprise Federated Authentication:** Do not use `aws configure` to manually paste long-lived keys for corporate single-sign-on. **Reason:** Manual keys bypass mandatory rotation policies and multi-factor authentication (MFA). **Use instead:** `aws configure sso` for browser-based federated login workflows.
- **Ephemeral CI/CD Pipeline Runners:** Do not run interactive `aws configure` commands inside automated build servers. **Reason:** Interactive wizards hang indefinitely waiting for standard input. **Use instead:** Native environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) injected securely via pipeline secret stores.

## Alternatives

- **`aws configure sso`:** The modern configuration wizard for IAM Identity Center. **Tradeoff:** It requires an active organizational SSO portal and browser authentication flow, but eliminates the need to generate, manage, or manually rotate static long-term IAM access keys.
- **`aws-vault`:** A specialized third-party credential manager. **Tradeoff:** `aws-vault` stores credentials encrypted in your operating system's secure keychain (macOS Keychain, Windows Credential Store, or Secret Service API on Linux) rather than plain-text INI files, offering vastly superior security at the cost of an external tool dependency.
- **Environment Variables (`AWS_ACCESS_KEY_ID`, etc.):** Native shell exports. **Tradeoff:** They are ephemeral and keep secrets entirely out of persistent disk files, but must be manually exported in every terminal session or configuration file.

## How it works internally

When executed, `aws configure` acts as an administrative interface to two primary local files located inside the user's home directory: `~/.aws/credentials` and `~/.aws/config`.

During interactive execution, the CLI reads user inputs from standard input and parses or writes them using standard INI file formatting specifications. Credential pairs (Access Key ID and Secret Access Key) are stored exclusively in `~/.aws/credentials` under section headers corresponding to the profile name (e.g., `[default]` or `[production]`). Non-sensitive metadata like regions, output formats, and retry configurations are stored in `~/.aws/config` under corresponding headers prefixed with `profile` (e.g., `[profile production]`).

When any subsequent AWS CLI command executes, the underlying SDK reads these files using a strict resolution precedence chain:

1. Command-line flags (`--region`, `--profile`).
2. Environment variables (`AWS_PROFILE`, `AWS_REGION`).
3. Shared credential and config files (`~/.aws/credentials`, `~/.aws/config`).
4. Instance metadata service (if running on an authorized EC2 host).
   If files are missing or malformed, the command returns a non-zero exit code with an authentication failure error.

## Performance Notes

- `aws configure` executes entirely as a local file I/O operation, reading and writing small INI text blocks. It generates zero network traffic and completes in single-digit milliseconds.
- Because configuration files are parsed fresh on every single AWS CLI invocation, having bloated or excessively large configuration files can theoretically introduce microsecond parsing delays, though this is negligible in practice.

## Security Notes

- **Plain-Text Storage Risk:** Credentials saved by `aws_configure` are written in clear, unencrypted plain text to `~/.aws/credentials`. Any local malware or unauthorized user with read access to your home directory can instantly harvest your active AWS secret keys.
- **File Permission Vulnerabilities:** If the parent `~/.aws` directory or `credentials` file is created with overly permissive POSIX permissions (e.g., world-readable `644`), other local system users can read your cloud credentials. Always ensure permissions are restricted to `600`.
- **Accidental Secret Leakage:** Running `aws configure list` or dumping configuration variables in a shared terminal session or CI log can accidentally leak partial key identifiers or active profile configurations.

## Common Mistakes

- **Mixing credentials and config properties:** Placing region settings inside `~/.aws/credentials` or access keys inside `~/.aws/config` without the `profile` prefix. **Why it's wrong:** The AWS SDK reads specific properties from designated files. Placing configuration metadata in the wrong file causes the CLI to ignore the values, throwing missing region or authentication errors.
- **Overwriting the default profile accidentally:** Running `aws configure` repeatedly without specifying a profile name when switching between client accounts. **Why it's wrong:** This silently overwrites your active `default` profile credentials, causing existing scripts and tools tied to the default profile to fail or authenticate against the wrong cloud account.
- **Using broad permissions on credential files:** Leaving `~/.aws/credentials` open to group or world read access. **Why it's wrong:** Security compliance scanners and enterprise auditing tools will flag this immediately as a critical vulnerability because local privilege escalation could expose root cloud keys.

## Best Practices

- Always use named profiles (`aws configure --profile project-name`) instead of constantly mutating the `default` profile, ensuring clean separation of duties across multiple cloud accounts.
- Explicitly restrict filesystem permissions on your credential storage files immediately after creation by executing `chmod 600 ~/.aws/credentials ~/.aws/config`.
- Transition away from long-term static IAM access keys entirely where possible, adopting temporary credential generation or AWS SSO (`aws configure sso`) to adhere to zero-trust security architecture.

## Interview Questions

**Q:** What is the fundamental difference in how credential data versus configuration metadata (like default regions) are stored by the AWS CLI?
**A:** Credential data—specifically `aws_access_key_id` and `aws_secret_access_key`—is stored inside the `~/.aws/credentials` file under standard INI section headers matching the profile name. Non-sensitive configuration metadata, such as default output formats and regions, is stored separately in the `~/.aws/config` file under headers prefixed with `profile` (e.g., `[profile name]`).

**Q:** Explain the resolution precedence chain the AWS CLI uses when determining which credentials and region to use during command execution.
**A:** The AWS SDK evaluates parameters through a strict hierarchy: it checks explicit command-line flags first, falls back to environment variables (`AWS_PROFILE`, `AWS_REGION`) if flags are absent, checks the shared local configuration and credential files (`~/.aws/config` and `~/.aws/credentials`) next, and finally attempts to query the instance metadata service (IMDS) if running on an authorized EC2 compute instance.

**Q:** Why is storing static access keys via `aws_configure` discouraged for production EC2 instances, and what architectural pattern replaces it?
**A:** Storing static keys on disk represents a permanent security risk because if an attacker gains file-system access, the keys can be harvested for indefinite unauthorized cloud access. This is replaced by attaching an IAM Instance Profile to the EC2 instance, allowing the AWS SDK to retrieve short-lived, automatically rotated credentials directly and securely from the local instance metadata service.

## Practice Problems

**Problem:** You need to configure a new named profile called `analytics` non-interactively, setting its default region to `us-east-2` without prompting for user input.
**Hint:** Use the subcommand designed for setting individual properties paired with the profile flag.
**Solution:** `aws configure set region us-east-2 --profile analytics` (This updates the configuration store directly for the specified profile without launching the interactive credential wizard).

**Problem:** Verify which credential source and profile are currently active in your local AWS CLI environment.
**Hint:** Look for the diagnostic subcommand that lists configuration status.
**Solution:** `aws configure list` (This outputs an inspection table showing active profile names, credential sources, and resolved configuration values).

## References

- [AWS CLI Command Reference - configure](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/configure/index.html)
- [AWS Documentation - Configuration and credential files](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
