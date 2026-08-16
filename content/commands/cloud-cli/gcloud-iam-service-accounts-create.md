---
slug: gcloud-iam-service-accounts-create
name: gcloud iam service-accounts create
aliases: []
category: cloud-cli
tags:
  - gcp
  - iam
  - service-account
  - security
  - identity
  - cloud
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
  - create gcp service account
  - provision service account gcloud
  - make new service account google cloud
  - create non-human identity gcp
  - setup workload identity account
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`gcloud iam service-accounts create` is a core Google Cloud CLI command used to provision a new Service Account—a specialized non-human identity—within a Google Cloud project. It generates a unique email address and numeric ID that applications, virtual machines, and deployment pipelines use to authenticate and interact securely with Google Cloud APIs.

## Why does it exist?

Executing cloud automation and application workloads using individual human user credentials violates security best practices, as human accounts are tied to personal lifecycles, require multi-factor authentication, and possess overly broad permissions. This command exists to provide a programmatic mechanism for creating dedicated, isolated, and headless machine identities. This allows cloud administrators to strictly enforce the principle of least privilege by binding specific IAM roles directly to discrete microservices or continuous integration runners without utilizing permanent human credentials.

## Syntax

```bash
gcloud iam service-accounts create ACCOUNT_ID [--description=DESCRIPTION] [--display-name=DISPLAY_NAME] [options]
```

## Flags

| Flag                            | Description                                                                                                           | Example                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ACCOUNT_ID`                    | The unique string identifier for the service account (positional). Must be 6–30 characters, lowercase alphanumeric.   | `gcloud iam service-accounts create github-runner-sa`                                       |
| `--display-name`                | Assigns a human-readable name to the service account for easier identification in the Google Cloud Console.           | `gcloud iam service-accounts create db-sa --display-name="DB Backup Service"`               |
| `--description`                 | Provides a detailed text explanation of the service account's exact purpose and lifecycle boundaries.                 | `gcloud iam service-accounts create web-sa --description="Reads public web assets"`         |
| `--project`                     | Explicitly overrides the default active GCP project ID to provision the account in a specific project boundary.       | `gcloud iam service-accounts create ops-sa --project=core-infrastructure-prod`              |
| `--format`                      | Formats the command output style (`json`, `yaml`, `text`, or value projections like `value(email)`).                  | `gcloud iam service-accounts create test-sa --format="value(email)"`                        |
| `--quiet`, `-q`                 | Suppresses all interactive prompts, enforcing default selections for automated script execution.                      | `gcloud iam service-accounts create batch-sa --quiet`                                       |
| `--impersonate-service-account` | Executes the creation command acting as a different, highly privileged service account instead of your user identity. | `gcloud iam service-accounts create sub-sa --impersonate-service-account=admin@proj.iam...` |
| `--log-http`                    | Enables verbose HTTP tracing, outputting the raw JSON REST payloads sent to the IAM API endpoint.                     | `gcloud iam service-accounts create debug-sa --log-http`                                    |
| `--billing-project`             | Specifies the project to be billed for the underlying API request quotas.                                             | `gcloud iam service-accounts create my-sa --billing-project=billing-hub`                    |
| `--verbosity`                   | Sets the logging verbosity level for the CLI client (`debug`, `info`, `warning`, `error`).                            | `gcloud iam service-accounts create my-sa --verbosity=debug`                                |

## Examples

```bash
gcloud iam service-accounts create my-app-service-account
```

> This creates a basic service account using only the required `ACCOUNT_ID`. The resulting email address will be formatted as `my-app-service-account@<project-id>.iam.gserviceaccount.com`.

```bash
gcloud iam service-accounts create data-processor-sa --display-name="Data Pipeline Processor" --description="Used by Dataflow to read from GCS and write to BigQuery"
```

> This provisions a service account while explicitly attaching a friendly display name and a comprehensive description, which is critical for long-term governance and auditing by security teams.

```bash
gcloud iam service-accounts create cross-project-sa --project=shared-services-hub
```

> This explicitly overrides the local active `gcloud` configuration to create the service account inside a designated central `shared-services-hub` project, regardless of your current terminal context.

```bash
gcloud iam service-accounts create ephemeral-runner --format="value(email)"
```

> This creates the service account and uses output formatting to print strictly the newly generated service account email address as a raw string, dropping all other JSON brackets or terminal table borders.

```bash
gcloud iam service-accounts create restricted-sa --impersonate-service-account=org-admin@my-project.iam.gserviceaccount.com
```

> This executes the provisioning command by impersonating a highly privileged organizational service account. This is used in environments where human developers possess zero direct IAM creation permissions but can assume a designated builder role.

## Real-World Scenarios

**Provisioning GKE Workload Identity Bindings**

```bash
gcloud iam service-accounts create k8s-pod-sa --display-name="Kubernetes Pod SA"
```

> Platform engineers create dedicated Google Service Accounts (GSAs) to map directly to Kubernetes Service Accounts (KSAs) via Workload Identity. This allows individual microservices running on Google Kubernetes Engine (GKE) to authenticate seamlessly without mounting static JSON keys.

**Automated CI/CD Pipeline Runners**

```bash
SA_EMAIL=$(gcloud iam service-accounts create github-actions-runner --format="value(email)")
```

> Infrastructure-as-code deployment scripts dynamically generate a fresh service account, capture its resulting email into a bash variable, and subsequently use that variable to bind precise deployment permissions for GitHub Actions or GitLab CI runners via Workload Identity Federation.

**Isolated Serverless Function Execution**

```bash
gcloud iam service-accounts create cloud-function-worker --description="Executes Cloud Function background tasks"
```

> Rather than relying on the default App Engine service account (which holds broad project editor privileges), cloud architects provision tightly scoped service accounts specifically to attach to Cloud Functions during deployment, limiting the blast radius of serverless logic.

## When should it NOT be used?

- **Provisioning accounts for human users:** Using this command to create logins for employees. **Reason:** Service accounts bypass Google Workspace security controls (like MFA, session length limits, and password policies) and cannot log into the Google Cloud Console GUI. **Use instead:** Google Workspace Cloud Identity provisioning.
- **Creating one account for multiple disjointed services:** Reusing `generic-app-sa` across an entire project. **Reason:** This creates a toxic combination of permissions, violating the principle of least privilege. If one application is compromised, the attacker gains access to all permissions assigned to the shared account. **Use instead:** Create discrete service accounts for each microservice.
- **Attempting to grant permissions or roles:** Running this command expecting the service account to automatically have access to Cloud Storage. **Reason:** This command _only_ creates the identity; it possesses zero permissions upon creation. **Use instead:** `gcloud projects add-iam-policy-binding` after creation.

## Alternatives

- **Terraform (`google_service_account`):** Declarative infrastructure provisioning. **Tradeoff:** Terraform securely tracks the service account lifecycle in a state file and handles dependency graphs automatically during destruction, whereas the CLI command is a one-off imperative execution.
- **Google Cloud Console (GUI):** The web-based graphical interface. **Tradeoff:** The GUI provides a visual wizard for creation and immediate role binding, but cannot be automated or version-controlled within deployment pipelines.

## How it works internally

When you invoke `gcloud iam service-accounts create`, the CLI packages an authenticated HTTP POST request directed at the Identity and Access Management REST API endpoint (`https://iam.googleapis.com/v1/projects/{project_id}/serviceAccounts`).

Upon receiving the payload, the IAM backend validates the `ACCOUNT_ID` string for length and character compliance. If valid, the backend allocates a globally unique 21-digit numeric `uniqueId` (also known as the `oauth2ClientId`) and synthesizes the canonical email address string (`[ACCOUNT_ID]@[PROJECT_ID].iam.gserviceaccount.com`). The identity record is then committed to Google's globally distributed IAM Spanner database.

The CLI receives an HTTP 200 OK response containing the newly created ServiceAccount JSON object and prints it to the terminal. Note that IAM propagation relies on eventual consistency; while the API returns immediately, it can take up to 60 seconds for the new service account to be recognizable by other regional GCP services (like Compute Engine or Cloud Storage).

## Performance Notes

- The API call itself completes in single-digit milliseconds, but scripts must account for IAM propagation delays. Attempting to assign roles or attach the service account to a VM immediately in the next line of a shell script will frequently result in a `404 Not Found` or `Invalid Principal` error.
- A Google Cloud project is subject to a hard quota on total service accounts (default is 100 per project), meaning unmanaged CLI creation loops will eventually fail with `QuotaExceeded` exceptions.

## Security Notes

- **Secure by Default:** Newly created service accounts inherently possess absolutely zero permissions. They cannot read databases, write to buckets, or spin up instances until a separate IAM policy binding explicitly grants them a role.
- **JSON Key Avoidance:** Historically, developers immediately followed creation with `gcloud iam service-accounts keys create` to generate long-lived static JSON credentials. This is a massive security risk. Modern cloud architectures should utilize Workload Identity Federation or attached instance metadata, avoiding static keys entirely.

## Common Mistakes

- **Violating Account ID naming constraints:** Attempting to use underscores, uppercase letters, or exceeding 30 characters (e.g., `gcloud iam service-accounts create My_Long_Service_Account_Name`). **Why it's wrong:** The API strictly enforces a regex pattern of lowercase alphanumeric characters and hyphens, between 6 and 30 characters in length. The CLI will reject invalid names instantly.
- **Script race conditions:** Running `create` followed immediately by `add-iam-policy-binding`. **Why it's wrong:** Because IAM replication is eventually consistent globally, the policy binding API will often reject the request because it cannot yet "see" the identity that the create API just provisioned. You must implement programmatic retry loops or sleep statements.
- **Assuming creation provisions an inbox:** Assuming the generated email address can receive mail. **Why it's wrong:** The string is formatted as an email for identifier compatibility within IAM policies, but it possesses no Google Workspace license and cannot receive electronic mail.

## Best Practices

- Implement a mandatory, standardized naming convention for `ACCOUNT_ID` values (e.g., `<team>-<service>-sa`) to maintain sanity in large enterprise environments.
- Always populate the `--description` field detailing the exact script, pipeline, or resource that utilizes the account, including the name of the author or team responsible for its lifecycle.
- When writing automation bash scripts, inject a `sleep 10` or a polling mechanism immediately after `gcloud iam service-accounts create` to accommodate global IAM replication before executing role bindings.

## Interview Questions

- **Q:** Does running `gcloud iam service-accounts create` grant the new identity Editor access to the project by default?
  - **A:** No. By default, newly created service accounts possess absolutely zero permissions. They are isolated identities. You must execute a separate command, such as `gcloud projects add-iam-policy-binding`, to grant them explicit roles.
- **Q:** Why does an automation script frequently fail with a "Principal not found" error if it attempts to assign an IAM role immediately after creating a service account?
  - **A:** Google Cloud IAM relies on a globally distributed, eventually consistent database. While the creation API returns a success response instantly, it can take anywhere from a few seconds to over a minute for the new identity record to propagate to the authorization evaluation nodes processing the role binding request.
- **Q:** What is the specific structural format of the email address generated by this command?
  - **A:** The email address is deterministically constructed by combining the user-provided `ACCOUNT_ID` and the target GCP `PROJECT_ID`, yielding the format: `[ACCOUNT_ID]@[PROJECT_ID].iam.gserviceaccount.com`.

## Practice Problems

- _Problem:_ Create a new service account named `audit-logger` and include a human-readable display name "Security Audit Logger".
  - _Hint:_ Combine the positional account ID argument with the display name flag.
  - _Solution:_ `gcloud iam service-accounts create audit-logger --display-name="Security Audit Logger"` (This provisions the identity while attaching governance metadata).
- _Problem:_ Provision a new service account named `ci-pipeline-runner`, but output strictly the new email address as plain text so it can be captured by a bash variable in a script.
  - _Hint:_ Use the format flag with a value projection targeting the email attribute.
  - _Solution:_ `gcloud iam service-accounts create ci-pipeline-runner --format="value(email)"` (This creates the account and strips all JSON/table formatting from the response, returning just the raw email string).

## References

- - [Google Cloud CLI Documentation - gcloud iam service-accounts create](https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create)
- - [Google Cloud IAM Documentation - Creating and Managing Service Accounts](https://cloud.google.com/iam/docs/creating-managing-service-accounts)
    === END FILE ===
