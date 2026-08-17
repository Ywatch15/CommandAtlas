---
slug: gcloud-auth-login
name: gcloud auth login
aliases: []
category: cloud-cli
tags:
  - gcp
  - authentication
  - identity
  - cloud
  - gcloud
  - oauth
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
  - cmd
intentPhrases:
  - authenticate to google cloud
  - login to gcp cli
  - connect to google cloud account
  - setup gcloud credentials
  - authorize gcloud access
relatedCommands: [gcloud-container-clusters-get-credentials]
alternatives: []
status: draft
---

## What is it?

`gcloud auth login` is the primary authentication command for the Google Cloud CLI. It initiates an OAuth 2.0 authorization flow to obtain access and refresh tokens from Google's identity servers, securely binding your Google user account to your local `gcloud` environment. This allows subsequent CLI commands to interact with Google Cloud Platform (GCP) APIs under your user identity.

## Why does it exist?

Interacting with GCP's Resource Manager and service APIs requires cryptographically verified bearer tokens. Manually navigating Google's Identity and Access Management (IAM) endpoints to exchange credentials for short-lived access tokens is complex and prone to security risks. `gcloud auth login` abstracts this entire process. It launches a local web server, intercepts the OAuth callback, caches the resulting refresh tokens securely on disk, and transparently manages the automatic rotation of access tokens for all future `gcloud` command executions.

## Syntax

```bash
gcloud auth login [ACCOUNT] [options]
```

## Flags

| Flag                     | Description                                                                                                                                         | Example                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `--no-browser`           | Initiates a headless authentication flow. Provides a URL to open on a different device and prompts for the resulting authorization code.            | `gcloud auth login --no-browser`               |
| `--update-adc`           | Simultaneously updates Application Default Credentials (ADC) in `~/.config/gcloud/application_default_credentials.json` for local client libraries. | `gcloud auth login --update-adc`               |
| `--cred-file`            | Authenticates using a provided JSON service account key file or external identity provider configuration file.                                      | `gcloud auth login --cred-file=key.json`       |
| `--project`              | Sets the default Google Cloud project in the active configuration immediately after a successful login.                                             | `gcloud auth login --project=my-prod-project`  |
| `--quiet`, `-q`          | Disables all interactive prompts, assuming default answers. Useful when combining with `--cred-file` in automation.                                 | `gcloud auth login --cred-file=sa.json -q`     |
| `--enable-gdrive-access` | Requests additional OAuth scopes to allow `gcloud` to read/write to the user's Google Drive.                                                        | `gcloud auth login --enable-gdrive-access`     |
| `--login-config`         | Specifies an external identity provider configuration for workforce identity federation.                                                            | `gcloud auth login --login-config=config.json` |

## Examples

```bash
gcloud auth login
```

> Initiates the standard interactive OAuth 2.0 flow. It launches the default system web browser, directs the user to Google's login page, requests consent for Google Cloud SDK scopes, and caches the credentials locally.

```bash
gcloud auth login user@example.com --project=my-gcp-project
```

> Logs in a specific Google account and immediately sets the active project configuration to `my-gcp-project`, preventing the need to run `gcloud config set project` afterward.

```bash
gcloud auth login --no-browser
```

> Facilitates authentication on headless remote servers (e.g., via SSH). The CLI prints a URL. The administrator opens this URL on their local laptop's browser, authenticates, and copies the resulting authorization code back into the remote terminal.

```bash
gcloud auth login --update-adc
```

> Authenticates the CLI and explicitly generates Application Default Credentials (ADC). This is critical for developers writing code using Google Cloud Client Libraries (e.g., Python `google-cloud-storage`), allowing their local code to impersonate their `gcloud` user identity.

## Real-World Scenarios

**Bootstrapping a Developer Workspace**

```bash
gcloud auth login --update-adc --project=company-dev-env
```

> When onboarding a new engineer, they run this single command to authenticate their terminal, set their target sandbox project, and populate the ADC file. This ensures both their bash scripts (`gcloud compute instances list`) and their local Python microservices (`boto3`/Google SDKs) function immediately without manual credential management.

**Remote Headless Server Administration**

```bash
gcloud auth login --no-browser
```

> A Site Reliability Engineer SSHs into a heavily restricted jumpbox that lacks a graphical interface. To execute administrative GCP commands, they use `--no-browser` to perform the OAuth handshake out-of-band on their secure local workstation, tunneling the authentication state to the jumpbox safely.

## When should it NOT be used?

- **CI/CD Pipelines:** **Do not use `gcloud auth login` for automated deployments.** User identities require interactive browser flows and expose the pipeline to employee lifecycle risks (e.g., the employee leaves the company). Use Workload Identity Federation or `gcloud auth activate-service-account`.
- **Running Application Code on GCP:** **Do not run `gcloud auth login` inside Google Compute Engine or GKE.** GCP resources automatically inherit permissions from their attached Service Accounts via the metadata server. Explicitly logging in via the CLI overrides this secure, ambient authentication mechanism.

## Alternatives

- **`gcloud auth activate-service-account`:** **Best for automation and pipelines.** Directly exchanges a JSON key file for credentials without interactive OAuth prompts, binding the CLI session to a machine identity rather than a human.
- **Workload Identity Federation:** **Best for modern cross-cloud pipelines.** Instead of using static keys, environments like GitHub Actions authenticate directly to GCP by exchanging OIDC tokens, avoiding long-lived credential storage entirely.

## How it works internally

When executed, `gcloud` starts a temporary local web server (usually bound to an ephemeral port on `localhost`). It then opens a web browser directing the user to Google's OAuth 2.0 authorization endpoint, passing a generated PKCE (Proof Key for Code Exchange) challenge and requesting specific API scopes (like `https://www.googleapis.com/auth/cloud-platform`).

Upon successful browser authentication, Google redirects back to the `localhost` server with an authorization code. `gcloud` exchanges this code (using the PKCE verifier) at the `oauth2/v4/token` endpoint for an Access Token (valid for 1 hour) and a Refresh Token (long-lived).

These tokens are stored locally in a SQLite database located at `~/.config/gcloud/credentials.db`. When you run subsequent `gcloud` commands, the CLI reads the access token from this database. If the access token is expired, `gcloud` transparently uses the refresh token to negotiate a new access token before executing the requested API call.

## Performance Notes

- **Local Caching:** Authentication is a one-time setup per environment. Subsequent `gcloud` commands experience zero authentication latency because they rely on the cached access tokens in `credentials.db`.
- **Token Refresh Overhead:** Every ~60 minutes, the next `gcloud` command you run will experience a slight delay (a few hundred milliseconds) as the CLI synchronously contacts Google's identity servers to exchange the refresh token for a new access token.

## Security Notes

- **Plaintext Token Storage:** The `credentials.db` file and the `application_default_credentials.json` file store refresh tokens in plaintext. If an attacker gains read access to your `~/.config/gcloud/` directory, they can extract these tokens and indefinitely impersonate you against the GCP API from another machine.
- **Over-Privileged ADC:** Using `--update-adc` grants your local code the exact same permissions as your human user account. If you run untrusted, malicious third-party code locally, it can silently leverage the ADC file to spin up expensive GCP resources or exfiltrate data under your identity.

## Common Mistakes

- **Confusing `gcloud auth login` with `gcloud auth application-default login`**
  - _Mistake:_ Logging in with `gcloud auth login` and wondering why your local Node.js or Python application throws an "Application Default Credentials are not available" error.
  - _Why:_ `gcloud auth login` only provisions credentials for the `gcloud` CLI itself. Client libraries do not read the CLI's SQLite database; they look for a specific JSON file. You must use `--update-adc` or run `gcloud auth application-default login` to provision that file.
- **Stale Credentials in Automation**
  - _Mistake:_ Using a personal account to log in on a shared CI server, which breaks three months later when the corporate password policy forces a password rotation.
  - _Why:_ User refresh tokens can be invalidated by organizational policies, password changes, or Google Workspace session control limits. Always use Service Accounts for automated systems.

## Best Practices

- **Use Multiple Configurations:** If you work across multiple distinct GCP organizations (e.g., personal vs. corporate), do not constantly `gcloud auth login` to swap accounts. Create isolated environments using `gcloud config configurations create <name>`, and log into each configuration independently.
- **Audit Active Accounts:** Periodically run `gcloud auth list` to verify which identities are currently cached on your machine and which one is active (denoted by an asterisk `*`), ensuring you do not deploy resources to the wrong environment.

## Interview Questions

**Q: What is the difference between `gcloud auth login` and `gcloud auth activate-service-account`?**
**A:** `gcloud auth login` is designed for human users. It triggers an interactive OAuth 2.0 web browser flow to obtain user-based access and refresh tokens. `gcloud auth activate-service-account` is designed for machine identities. It is headless, requires no browser interaction, and authenticates by cryptographically signing requests using a provided static JSON private key file.

**Q: A developer successfully runs `gcloud auth login` and can list Compute Engine instances via the CLI. However, their local Python script using the Google Cloud SDK throws an authentication error. Why?**
**A:** The developer authenticated the `gcloud` CLI, but failed to provision Application Default Credentials (ADC). Google Cloud client libraries look for ADC in a specific JSON file, not the CLI's internal SQLite database. They must re-authenticate using `gcloud auth login --update-adc` or `gcloud auth application-default login`.

## Practice Problems

**Problem:** You are setting up a new laptop and need to authenticate your CLI with Google Cloud. Furthermore, you want to ensure your local Terraform scripts (which use the Google provider) have the necessary credentials immediately available.
**Hint:** Use the flag that provisions Application Default Credentials alongside the CLI login.
**Solution:**

```bash
gcloud auth login --update-adc
```

**Problem:** You are connected to a headless Linux jump-host via SSH. You need to authenticate `gcloud` with your personal Google account to troubleshoot a database, but you cannot open a web browser on the jump-host.
**Hint:** Use the flag that converts the OAuth flow into a manual copy-paste URL exchange.
**Solution:**

```bash
gcloud auth login --no-browser
```

## References

- [gcloud auth login - Google Cloud CLI Documentation](https://cloud.google.com/sdk/gcloud/reference/auth/login)
- [Application Default Credentials Overview](https://cloud.google.com/docs/authentication/application-default-credentials)
