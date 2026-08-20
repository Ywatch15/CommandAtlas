---
slug: gcloud-config-set
name: gcloud config set
aliases: []
category: cloud-cli
tags:
  - gcp
  - configuration
  - environments
  - cli
  - properties
  - gcloud
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
  - set default gcp project
  - change gcloud region
  - configure default compute zone
  - update gcloud settings
  - set active gcloud account
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`gcloud config set` is a foundational command used to define global and environment-specific properties for the Google Cloud CLI. It modifies the active configuration profile, allowing developers to persistently establish default values for critical parameters—such as the target GCP project, default compute zone, or active authentication account. This drastically reduces verbosity, removing the need to append flags like `--project=my-project` or `--zone=us-central1-a` to every subsequent command.

## Why does it exist?

Unlike single-purpose command-line tools, `gcloud` interacts with dozens of distinct Google Cloud services, almost all of which require a project ID and geographic routing context. Forcing users to pass these identifiers on every execution leads to immense cognitive load and high error rates. `gcloud config set` exists to provide a persistent, file-based state management system. By establishing sticky contextual defaults, it streamlines operational workflows and ensures that commands executed in a terminal session inherently route to the correct isolated cloud environment.

## Syntax

```bash
gcloud config set <section>/<property> <value> [options]
gcloud config set <property> <value> [options]
```

## Flags

| Flag             | Description                                                                                                                            | Example                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `--installation` | Modifies the property for the entire `gcloud` installation (all users on the machine) rather than just the active local configuration. | `gcloud config set core/disable_usage_reporting true --installation` |
| `--quiet`, `-q`  | Disables interactive prompts. Automatically accepts default responses for any confirmation warnings.                                   | `gcloud config set project prod-vpc-01 -q`                           |
| `--format`       | Specifies the output format of the command execution result (e.g., `json`, `yaml`, `text`).                                            | `gcloud config set compute/zone us-east1-b --format=json`            |

### Key Properties

| Property                       | Description                                                                                        | Example                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `project`                      | (Section: `core`) The default Google Cloud project ID to execute commands against.                 | `gcloud config set project my-billing-project`   |
| `account`                      | (Section: `core`) The active Google identity (email or service account) to use for authentication. | `gcloud config set account dev@example.com`      |
| `compute/zone`                 | The default geographic zone for Compute Engine resources (VMs, disks).                             | `gcloud config set compute/zone europe-west1-b`  |
| `compute/region`               | The default geographic region for regional resources (Subnets, Regional MIGs).                     | `gcloud config set compute/region europe-west1`  |
| `core/disable_usage_reporting` | Opts out of sending anonymous CLI usage metrics to Google.                                         | `gcloud config set disable_usage_reporting true` |

## Examples

```bash
gcloud config set project my-production-project
```

> Updates the active configuration to route all future API requests to `my-production-project`. You no longer need to append `--project=my-production-project` to commands like `gcloud compute instances list`.

```bash
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
```

> Establishes the default geographic boundaries for infrastructure deployment. If you subsequently run `gcloud compute instances create my-vm`, the CLI will automatically provision the Virtual Machine in the `us-central1-a` zone.

```bash
gcloud config set account admin@company.com
```

> Switches the active authenticated identity. If you previously authenticated multiple accounts via `gcloud auth login`, this command quickly hot-swaps the active context to the specified user without requiring re-authentication.

```bash
gcloud config set core/disable_prompts true
```

> Disables interactive (Yes/No) confirmations globally for the CLI. This is an essential configuration step when embedding `gcloud` commands inside non-interactive CI/CD pipeline scripts.

## Real-World Scenarios

**Managing Multi-Environment Profiles**

```bash
gcloud config configurations create production
gcloud config set project acme-prod-backend
gcloud config set compute/region us-east4
```

> Engineers frequently work across sandbox, staging, and production environments. Instead of constantly overwriting the default configuration, they create named configurations (profiles) and use `gcloud config set` to hardcode the precise projects and regions for each. They can then safely hot-swap environments using `gcloud config configurations activate production`.

**Hardening CI/CD Runners**

```bash
gcloud config set core/disable_usage_reporting true --installation
gcloud config set component_manager/disable_update_check true --installation
```

> When building custom Docker images containing the Google Cloud SDK for CI/CD runners (like Jenkins or GitLab CI), administrators execute these commands during the Dockerfile `RUN` step. It ensures the CLI never wastes pipeline execution time checking for updates or sending telemetry metrics back to Google.

## When should it NOT be used?

- **Ephemeral/One-off Commands:** **Do not change global state for a single execution.** If you normally work in `project-A` but need to check a single VM in `project-B`, do not run `config set`. Instead, use the global flag: `gcloud compute instances list --project=project-B`.
- **Strict Scripting Environments:** **Do not rely on local config state inside robust shell scripts.** A script should not assume the host machine's `gcloud config` is set to the correct project. Scripts should always explicitly pass `--project` flags or set the `CLOUDSDK_CORE_PROJECT` environment variable to guarantee deterministic execution.

## Alternatives

- **Environment Variables:** **Best for temporary script contexts.** Prefixing commands with environment variables temporarily overrides the internal `gcloud` configuration state. For example, `CLOUDSDK_CORE_PROJECT=my-project gcloud compute instances list` overrides the configured project exclusively for that single execution.
- **`gcloud init`:** **Best for initial onboarding.** `init` is an interactive wizard that guides you through authentication, project selection, and zone configuration in a single pass, wrapping multiple underlying `gcloud auth login` and `gcloud config set` commands.

## How it works internally

`gcloud` maintains configuration state locally on the filesystem, typically located at `~/.config/gcloud/configurations/`.

When you run `gcloud config configurations create default`, the CLI generates a text file (e.g., `config_default`). When you execute `gcloud config set project my-project`, the CLI parses this file and writes or updates an INI-style configuration block:

```ini
[core]
project = my-project

[compute]
zone = us-central1-a
```

When you invoke a command like `gcloud compute instances list`, the CLI executes a hierarchical resolution path to determine which project to query:

1.  **Command-line flag:** Did the user pass `--project`? If so, use it.
2.  **Environment Variable:** Is `CLOUDSDK_CORE_PROJECT` set? If so, use it.
3.  **Active Configuration:** Look inside `~/.config/gcloud/active_config` to find the name of the currently activated profile. Read that profile's text file and extract the `project` value.
4.  **Error:** If all above fail, halt execution and prompt the user to set a project.

## Performance Notes

- **Instant File I/O:** `gcloud config set` does not make any network requests or validate the existence of the project or zone against Google's API. It purely performs a localized filesystem write, executing in milliseconds.

## Security Notes

- **Silent Context Switching:** Because `config set` modifies hidden local files, it is easy to forget which project your terminal is currently targeting. Malicious or accidental destruction of production infrastructure frequently occurs when an engineer believes their config is set to `sandbox` but is actually set to `prod`. Always use terminal prompts (like `kube-ps1` equivalents for gcloud) to display your active project natively in your bash prompt.
- **No IAM Validation:** `gcloud config set project my-project` will successfully write to the configuration file even if you do not have IAM access to `my-project`, or if the project doesn't exist. You will only discover the permission failure when you attempt to execute a subsequent API command.

## Common Mistakes

- **Confusing Region and Zone**
  - _Mistake:_ Running `gcloud config set compute/region us-central1-a`.
  - _Why:_ `us-central1-a` is a zone, not a region. A region is the broader geographic area (`us-central1`). Setting these incorrectly will cause subsequent compute commands to fail with validation errors, as they attempt to route requests to non-existent API endpoints.
- **Setting the wrong property section**
  - _Mistake:_ Running `gcloud config set disable_prompts true` and receiving an unknown property error.
  - _Why:_ While `gcloud` intelligently guesses core properties like `project`, less common properties require explicit section paths. You must use `core/disable_prompts` to modify the correct INI block.

## Best Practices

- **Validate with `get-value`:** After writing complex automation scripts that alter the gcloud environment, use `gcloud config get-value project` to programmatically assert that the context shift succeeded before executing destructive commands.
- **Use Configurations over Constant Sets:** Stop overwriting your default configuration. Create explicit configurations using `gcloud config configurations create prod` and `create dev`. Use `gcloud config configurations activate dev` to swap between them cleanly, ensuring project, region, and account mappings remain securely bundled together.

## Interview Questions

**Q: You have `project-A` defined via `gcloud config set project`. However, in your bash terminal, you have exported `CLOUDSDK_CORE_PROJECT=project-B`. If you run `gcloud compute instances list` without any flags, which project is queried, and why?**
**A:** `project-B` is queried. The Google Cloud CLI uses a strict precedence hierarchy for parameter resolution. Explicit command-line flags win first, followed by Environment Variables, followed lastly by the local `.config` file settings established by `gcloud config set`.

**Q: A developer runs `gcloud config set project non-existent-project`. Does the command succeed or fail?**
**A:** The command succeeds. `gcloud config set` is a purely localized operation that writes a string to a configuration file on the local disk. It does not validate the string against the Google Cloud API or check for IAM permissions during execution.

## Practice Problems

**Problem:** You frequently deploy resources to Europe. Write the two commands required to permanently set your default compute region to `europe-west1` and your default compute zone to `europe-west1-b` for your active profile.
**Hint:** Both properties reside under the `compute` configuration section.
**Solution:**

```bash
gcloud config set compute/region europe-west1
gcloud config set compute/zone europe-west1-b
```

**Problem:** You are writing an automated cleanup script. You need to configure `gcloud` so that it automatically assumes "Yes" for all destructive prompts, preventing the script from hanging while waiting for user input.
**Hint:** Modify the `disable_prompts` property located in the `core` section.
**Solution:**

```bash
gcloud config set core/disable_prompts true
```

## References

- [gcloud config set - Google Cloud CLI Documentation](https://cloud.google.com/sdk/gcloud/reference/config/set)
- [Managing SDK Configurations](https://cloud.google.com/sdk/docs/configurations)
