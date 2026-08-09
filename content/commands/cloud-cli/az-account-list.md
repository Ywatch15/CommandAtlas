---
slug: az-account-list
name: az account list
aliases: []
category: cloud-cli
tags: [azure, cloud, cli, subscription, account, management]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'list azure subscriptions'
  - 'show all azure accounts'
  - 'get azure subscription list cli'
  - 'find azure subscription id'
  - 'view available azure tenants'
relatedCommands: [az-account-set, az-login]
alternatives: [az-login]
status: draft
---

## What is it?

`az account list` is an Azure CLI management command used to retrieve and display all Azure subscriptions and Microsoft Entra tenants associated with the currently authenticated user session or service principal. It outputs a comprehensive collection of subscription records, including unique subscription GUIDs, display names, state properties, and default tenant bindings.

## Why does it exist?

In complex enterprise environments, administrative accounts frequently span multiple subscriptions and cross-tenant organizational boundaries. Before developers or automation scripts can target specific cloud resources, they need to identify the exact subscription IDs or names they have access to. `az account list` exists to bridge this gap, providing a programmatic mechanism to audit accessible subscription inventories and extract identification GUIDs required for context switching and resource provisioning.

## Syntax

```bash
az account list [--all] [--refresh] [--output <value>] [--query <value>] [options]
```

## Flags

| Flag                 | Description                                                                                             | Example                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `--all`              | Lists subscriptions across all accessible Microsoft Entra tenants rather than just the default tenant.  | `az account list --all`                           |
| `--refresh`          | Forces a live synchronization query against Azure Resource Manager (ARM) to update cached account data. | `az account list --refresh`                       |
| `--output`, `-o`     | Formats the command output style (`json`, `jsonc`, `table`, `tsv`, `yaml`, `none`).                     | `az account list --output table`                  |
| `--query`            | Filters and extracts specific properties from the resulting output using JMESPath syntax.               | `az account list --query "[].{Name:name, ID:id}"` |
| `--verbose`          | Increases logging verbosity to print detailed diagnostic messages during execution.                     | `az account list --verbose`                       |
| `--debug`            | Increases logging verbosity to output full HTTP request and response trace logs.                        | `az account list --debug`                         |
| `--only-show-errors` | Suppresses non-critical warning messages, displaying strictly fatal execution errors.                   | `az account list --only-show-errors`              |
| `--help`, `-h`       | Displays comprehensive command syntax documentation, usage notes, and flag descriptions.                | `az account list --help`                          |
| `--tenant`           | Filters the account list to display only subscriptions belonging to a specific tenant GUID.             | `az account list --tenant "72f988bf..."`          |
| `--sdk-auth`         | Generates deployment credentials formatted specifically for programmatic SDK authentication.            | `az account list --sdk-auth`                      |

## Examples

```bash
az account list
```

> This queries the local Azure CLI profile cache and returns a JSON array of all subscriptions accessible under your currently authenticated user session or service principal.

```bash
az account list --output table
```

> This formats the subscription payload into a clean, human-readable ASCII table, displaying columns for subscription names, subscription IDs, tenant IDs, and active status indicators.

```bash
az account list --refresh
```

> This bypasses the local profile cache and issues a fresh REST query directly to Azure Resource Manager to fetch the latest subscription metadata and state changes.

```bash
az account list --query "[?state=='Enabled'].{Name:name, ID:id}" --output table
```

> This uses JMESPath query filtering (`--query`) to inspect the subscription array, filtering strictly for subscriptions where the state equals `Enabled` and projecting only their names and IDs.

```bash
az account list --all --output json
```

> This queries across all accessible Microsoft Entra tenant boundaries (`--all`), returning a unified JSON list of every subscription linked to your cross-tenant identity footprint.

## Real-World Scenarios

**Automated Discovery of Target Subscription IDs**

```bash
SUB_ID=$(az account list --query "[?name=='Production-Sub'].id" --output tsv)
```

> DevOps engineers use JMESPath queries combined with `az account list` inside deployment scripts to dynamically resolve subscription display names into raw GUIDs, ensuring scripts remain resilient even if account names change.

**Auditing Multi-Tenant Corporate Permissions**

```bash
az account list --all --output table
```

> Security and cloud governance teams run cross-tenant account listings to audit all subsidiary subscriptions accessible via an enterprise service principal, verifying least-privilege compliance.

**Verifying Active Session Provisioning Post-Login**

```bash
az account list --refresh --query "length(@)"
```

> Automated build agents running in CI/CD pipelines execute account listing refreshes to verify that newly authenticated service principals have successfully established a valid connection to Azure services.

## When should it NOT be used?

- **Modifying active session context directly:** Using `az account list` expecting it to change your active subscription. **Reason:** `az account list` is strictly a read-only query command; it returns data but does not mutate the active session context. **Use instead:** `az account set --subscription <id>`.
- **Checking granular resource-level permissions:** Using account listings to determine if a user can write to a specific virtual network. **Reason:** Account listings only verify subscription-level access, not fine-grained Azure RBAC role assignments on individual resource groups. **Use instead:** `az role assignment list`.
- **Inspecting detailed subscription billing or cost metrics:** **Reason:** The command returns operational identity metadata (IDs, states, tenants), not financial telemetry or consumption data. **Use instead:** Azure Cost Management CLI tools (`az consumption`).

## Alternatives

- **`az account show`:** Retrieves details of the single currently active subscription. **Tradeoff:** It provides deeper context on the active default subscription, but cannot display or audit alternative subscriptions available in your broader account portfolio.
- **Azure Portal Dashboard:** Graphical web interface. **Tradeoff:** The Azure Portal offers an interactive visual overview of all tenants and subscriptions, but cannot be parsed programmatically inside shell scripts or CI/CD pipelines.

## How it works internally

`az account list` interacts with the local Azure CLI token and profile cache, typically stored inside the user's home directory at `~/.azure/azureProfile.json` and `~/.azure/tokens.json`.

When invoked without flags, the Azure CLI reads the cached subscription metadata stored in `azureProfile.json`, which was populated during the initial `az login` sequence. If the `--refresh` flag is provided, the CLI triggers a network request using the cached OAuth 2.0 bearer token to query the Azure Resource Manager (ARM) REST API endpoint (`GET /subscriptions?api-version=2020-01-01`).

The ARM backend validates the token, evaluates Microsoft Entra ID RBAC permissions across authorized subscription scopes, and returns a JSON payload containing an array of subscription objects. The CLI processes this array, applies any user-defined JMESPath filters (`--query`), and streams the output to standard terminal buffers. The command exits with `0` upon successful retrieval, or a non-zero error code if network connectivity fails or authentication tokens have expired.

## Performance Notes

- Running `az account list` without the `--refresh` flag executes entirely as a local file I/O operation against the JSON profile cache, completing instantly in single-digit milliseconds.
- Passing the `--refresh` flag introduces network latency and cryptographic overhead as the CLI negotiates live HTTPS connections with Azure Resource Manager endpoints.

## Security Notes

- **Credential and Token Caching Risks:** The local profile cache queried by `az account list` stores sensitive subscription metadata and tenant structures in plain text under `~/.azure/`. Unauthorized local users with filesystem access can inspect this data.
- **Multi-Tenant Data Exposure:** Using `--all` exposes subscription identifiers and structural metadata across every tenant your identity can reach, which can reveal sensitive corporate hierarchy information if output logs are captured insecurely.

## Common Mistakes

- **Assuming subscription listings auto-switch context:** Running `az account list` and assuming subsequent commands will target a listed subscription automatically. **Why it's wrong:** Listing subscriptions merely displays available options; it does not alter the active session context (`isDefault`). You must explicitly call `az account set`.
- **Failing to refresh stale local caches:** Running account commands in scripts without `--refresh` when subscriptions were recently added or modified in the Azure Portal. **Why it's wrong:** The CLI will rely on outdated local profile cache data, resulting in missing subscription entries or validation errors.
- **Misinterpreting JSON array structures in scripts:** Assuming `az account list` returns a single object rather than a list array. **Why it's wrong:** This causes parsing errors in automation scripts when attempting to read properties without indexing or JMESPath projection.

## Best Practices

- Always use JMESPath queries (`--query`) in production automation scripts to extract precise subscription IDs or names cleanly, avoiding brittle text parsing.
- In CI/CD environments where identity state may change dynamically, periodically append `--refresh` to ensure your scripts evaluate current cloud permissions accurately.
- Restrict filesystem read permissions on your local `~/.azure/` configuration directory to prevent unauthorized inspection of cached subscription metadata.

## Interview Questions

- **Q:** What is the fundamental difference in execution mechanism between running `az account list` with versus without the `--refresh` flag?
  **A:** Without `--refresh`, `az account list` reads subscription records exclusively from the local JSON profile cache (`azureProfile.json`), completing as an instantaneous local I/O operation. With `--refresh`, the CLI bypasses the cache and issues a live REST query over the network to the Azure Resource Manager (ARM) endpoint to fetch up-to-date subscription metadata.
- **Q:** Why does `az account list --all` require cross-tenant evaluation, and how does it differ from a standard account listing?
  **A:** A standard account listing retrieves subscriptions tied strictly to the default tenant established during login. The `--all` flag instructs the Azure CLI to query across all accessible Microsoft Entra tenant boundaries where your identity holds security principal associations, aggregating a unified multi-tenant portfolio.
- **Q:** How does the Azure CLI resolve and format the output of `az account list` when JMESPath queries are supplied?
  **A:** After retrieving the raw JSON array of subscription objects from local cache or ARM, the Azure CLI passes the payload through an internal JMESPath evaluation engine. This engine filters, reshapes, and projects the data according to the user's query expression before rendering the final output stream to the terminal.

## Practice Problems

- **Problem:** Retrieve a clean, bracket-free list of all subscription IDs accessible under your current Azure session, formatted as raw tab-separated values.
  - **Hint:** Combine JMESPath query projection for the ID property with TSV output formatting.
  - **Solution:** `az account list --query "[].id" --output tsv` (This extracts every subscription GUID from the array and strips JSON brackets, outputting raw TSV strings).
- **Problem:** Force a live synchronization with Azure Resource Manager to update your local subscription cache, and display the results in an ASCII table.
  - **Hint:** Combine the refresh flag with table output formatting.
  - **Solution:** `az account list --refresh --output table` (This queries ARM live for the latest subscription inventory and renders it into a human-readable table).

## References

- [Azure CLI Command Reference - az account list](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-list)
- [Microsoft Learn: Manage Azure subscriptions with Azure CLI](https://learn.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli)
