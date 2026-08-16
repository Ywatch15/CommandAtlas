---
slug: az-account-set
name: az account set
aliases: []
category: cloud-cli
tags:
  - azure
  - cloud
  - cli
  - subscription
  - account
  - management
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
  - set active azure subscription
  - change current subscription az cli
  - switch azure account context
  - select azure subscription id
  - set default subscription azure
relatedCommands:
  - az-account-list
  - az-login
  - az-vm-create
  - az-webapp-up
alternatives:
  - az-login
status: draft
---

## What is it?

`az account set` is an Azure CLI management command used to designate a specific Azure subscription as the current active context for all subsequent command executions. It modifies the local Azure profile cache to ensure that resource provisioning, querying, and administrative operations target the chosen subscription by default.

## Why does it exist?

In enterprise Azure environments, a single user or service principal often has access to multiple subscriptions spanning different projects, departments, or billing units. Typing `--subscription <id>` into every individual CLI command is tedious and error-prone. `az account set` exists to establish a persistent session context, eliminating repetitive arguments and streamlining workflows by anchoring all subsequent Azure Resource Manager (ARM) requests to a specific subscription boundary.

## Syntax

```bash
az account set --subscription <subscription-name-or-id> [--tenant <tenant-id>] [options]
```

## Flags

| Flag                     | Description                                                                                      | Example                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `--subscription`, `-s`   | Specifies the name or unique identifier (GUID) of the target subscription to set as active.      | `az account set --subscription "00000000-0000-0000-0000-000000000000"` |
| `--name`, `-n`           | Alias parameter used interchangeably with `--subscription` to target subscription names or IDs.  | `az account set --name "Production-Sub"`                               |
| `--tenant`, `-t`         | Specifies the Microsoft Entra tenant ID if switching context across cross-tenant boundaries.     | `az account set -s "Sub-ID" --tenant "tenant-id-guid"`                 |
| `--acquire-policy-token` | Automatically acquires an Azure Policy token required for specific governed resource operations. | `az account set -s "Sub-ID" --acquire-policy-token`                    |
| `--change-reference`     | Attaches a related change reference ID for auditing and tracking resource operations.            | `az account set -s "Sub-ID" --change-reference "chg-10293"`            |
| `--output`, `-o`         | Formats the command output style (`json`, `jsonc`, `table`, `tsv`, `yaml`, `none`).              | `az account set -s "Sub-ID" --output json`                             |
| `--query`                | Filters and extracts specific properties from the resulting output using JMESPath syntax.        | `az account set -s "Sub-ID" --query "id"`                              |
| `--verbose`              | Increases logging verbosity to print detailed diagnostic messages during execution.              | `az account set -s "Sub-ID" --verbose`                                 |
| `--debug`                | Increases logging verbosity to output full HTTP request and response trace logs.                 | `az account set -s "Sub-ID" --debug`                                   |
| `--only-show-errors`     | Suppresses non-critical warning messages, displaying strictly fatal execution errors.            | `az account set -s "Sub-ID" --only-show-errors`                        |
| `--help`, `-h`           | Displays comprehensive command syntax documentation, usage notes, and flag descriptions.         | `az account set --help`                                                |

## Examples

```bash
az account set --subscription 12345678-abcd-1234-abcd-123456789abc
```

> This switches the active Azure CLI context to the specified subscription GUID. All subsequent `az` commands will execute against this subscription unless explicitly overridden.

```bash
az account set --name "Enterprise-Production-Subscription"
```

> This targets the subscription using its human-readable display name rather than its raw GUID, making scripts more intuitive when managing well-named enterprise accounts.

```bash
az account set -s "Development-Sub" --verbose
```

> This executes the context switch while enabling verbose logging, outputting confirmation details regarding the profile update and underlying configuration file writes.

```bash
az account set -s "Shared-Services" --tenant "72f988bf-86f1-41af-91ab-2d7cd011db47"
```

> This updates the active subscription while simultaneously shifting the Microsoft Entra tenant context, which is required when accessing guest subscriptions across different organizations.

```bash
az account set -s "Production-Sub" --output none
```

> This changes the active subscription context and suppresses all standard return output, making it ideal for clean execution inside automated shell scripts and CI/CD pipelines.

## Real-World Scenarios

**Managing Multi-Environment Cloud Deployments**

```bash
az account set --name "Staging-Environment" && az deployment group create --resource-group rg- staging --template-file main.bicep
```

> Cloud engineers managing multiple stages of an application use `az account set` to explicitly switch their terminal workspace context from staging to production environments before running infrastructure deployment pipelines.

**Auditing Disparate Resource Pools Across Business Units**

```bash
az account set --subscription "Finance-Audit-Sub" && az vm list --output table
```

> System administrators conducting security reviews or compliance audits alternate between different corporate subsidiary subscriptions using `az account set` to gather resource inventories without modifying global credentials.

**Cross-Tenant Partner Collaboration**

```bash
az account set --subscription "Partner-Managed-Sub" --tenant "partner-tenant-guid"
```

> Consultants and external vendors working with client Azure tenants use context switching commands combined with tenant specifiers to authenticate and manage workloads inside external cloud boundaries.

## When should it NOT be used?

- **Running parallelized, asynchronous CI/CD script tasks:** Using `az account set` globally inside concurrent build runners. **Reason:** Because `az account set` modifies a shared global state file (`azureProfile.json`) on disk, parallel threads will race and overwrite each other's active subscriptions. **Use instead:** Passing the `--subscription <id>` flag inline per command.
- **Performing ephemeral one-off queries against a secondary account:** **Reason:** Changing the global account context just to check a single resource forces you to remember to switch back, increasing human error risks. **Use instead:** Pass `--subscription` directly to the target read command.
- **Unauthenticated fresh environments:** Running `az account set` prior to initial authentication. **Reason:** The command requires existing subscription associations cached locally; it cannot bootstrap credentials without a prior login. **Use instead:** Run `az login` first.

## Alternatives

- **Passing `--subscription` inline per command:** Adding `-s <id>` directly to each operational command. **Tradeoff:** It avoids mutating the local profile state and prevents concurrency race conditions in scripts, but requires verbose repetition across multi-line automation routines.
- **Environment Variables (`AZURE_SUBSCRIPTION_ID`):** Setting session environment variables. **Tradeoff:** Decouples state from local config files, but can introduce silent bugs if local shell configurations conflict with explicit CLI flags.

## How it works internally

`az account set` interacts directly with the local Azure CLI configuration and token store, which is typically housed in the user's home directory under `~/.azure/azureProfile.json`.

When invoked, the Azure CLI parses the provided subscription name or GUID, validates it against the locally cached list of subscriptions retrieved during the last `az login` session, and updates the `isDefault: true` attribute for the targeted subscription entry inside `azureProfile.json`. Simultaneously, it clears or updates any associated tenant binding properties.

Subsequent Azure CLI invocations read this JSON state file upon initialization to construct the base Uniform Resource Identifier (URI) paths and HTTP header parameters (such as `/subscriptions/{subscription-id}/...`) sent to Azure Resource Manager (ARM). The command returns an exit code of `0` upon successfully updating the configuration state, or a non-zero error code if the subscription identifier cannot be found in the local profile cache.

## Performance Notes

- `az account set` is an exclusively local file I/O operation modifying a small JSON cache; it makes no outbound network calls to Azure datacenters unless token refreshing or policy acquisition flags are explicitly requested.
- Because the command operates instantly in single-digit milliseconds, its execution overhead is negligible, making it highly efficient for interactive terminal use.

## Security Notes

- **Local State Exposure:** The active subscription state and associated user tokens are stored in plain-text JSON files within `~/.azure/`. Unauthorized local users or malware with read access to the user profile directory can harvest subscription IDs and structural metadata.
- **Privilege Confusion:** Leaving the active subscription set to a highly privileged production environment can lead to accidental destructive commands (such as `az group delete`) targeting production workloads instead of development sandboxes.

## Common Mistakes

- **Assuming subscription changes propagate to other terminal windows:** Running `az account set` in Tab A and expecting Tab B to update. **Why it's wrong:** Azure CLI profile configurations are read upon process startup. Separate terminal sessions run independent CLI process instances, meaning Tab B retains its own distinct active subscription state until re-evaluated.
- **Confusing subscription names with subscription IDs:** Passing a friendly display name that contains spaces without wrapping it in quotation marks. **Why it's wrong:** The CLI shell parser splits unquoted strings into multiple arguments, resulting in missing argument errors or failure to locate the subscription.
- **Forgetting to verify context after switching:** Running commands immediately after a switch without checking current identity bounds. **Why it's wrong:** If a subscription name is misspelled or ambiguous, the command might fail or default unexpectedly, causing downstream resource creation in the wrong account.

## Best Practices

- Always verify your active context immediately after switching subscriptions by running `az account show` to confirm the target ID and tenant match expectations.
- In script automation and pipeline environments, avoid `az account set` entirely; instead, append `--subscription <id>` directly to each command to ensure determinism and thread-safety.
- Adopt clear, consistent naming conventions for your Azure subscriptions to minimize typographic errors when switching contexts manually.

## Interview Questions

**Q:** How does `az account set` alter the behavior of subsequent Azure CLI commands executed in the same terminal session?
**A:** `az account set` updates the default active subscription flag (`isDefault: true`) inside the local Azure CLI profile cache (`azureProfile.json`). When subsequent `az` commands initialize, they read this state file and automatically inject the selected subscription ID into the path parameters and authorization context of outgoing Azure Resource Manager API requests.

**Q:** Why is using `az account set` inside concurrent or parallelized CI/CD script execution discouraged?
**A:** Because `az account set` modifies a shared global state file on disk (`azureProfile.json`), concurrent scripts running in parallel threads will overwrite each other's active subscription contexts. This race condition leads to unpredictable behavior where resources are accidentally provisioned into the wrong cloud environment.

**Q:** What is the technical distinction between checking your current account context with `az account show` versus listing all available associations with `az account list`?
**A:** `az account show` queries the local profile cache to return the single active subscription currently bound to your session context (`isDefault`), whereas `az account list` retrieves and displays the full collection of accessible subscriptions across all tenants associated with your authenticated identity credentials.

## Practice Problems

**Problem:** Switch your active Azure CLI subscription context to the specific subscription ID `99999999-8888-7777-6666-555555555555`.
**Hint:** Use the short flag version for the subscription parameter.
**Solution:** `az account set -s 99999999-8888-7777-6666-555555555555` (This updates the local session profile cache so all subsequent commands target the specified subscription GUID).

**Problem:** Switch your active subscription context to an account named `Core-Services-Prod` while ensuring that any non-critical warning outputs are completely suppressed.
**Hint:** Combine the name parameter flag with the flag that hides warnings.
**Solution:** `az account set --name "Core-Services-Prod" --only-show-errors` (This changes the active subscription context using its display name while keeping terminal output clean of warnings).

## References

- [Microsoft Learn: az account set Documentation](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-set)
- [Microsoft Learn: How to manage Azure subscriptions with the Azure CLI](https://learn.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli)
