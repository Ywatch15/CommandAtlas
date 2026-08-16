---
slug: az-functionapp-update
name: az functionapp update
aliases: []
category: cloud-cli
tags:
  - azure
  - serverless
  - function-app
  - cli
  - cloud
  - arm
  - configuration
difficulty: intermediate
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
  - sh
intentPhrases:
  - update azure function app properties
  - change function app service plan
  - modify azure serverless configuration
  - update arm properties function app
  - add tags to function app
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`az functionapp update` is an Azure CLI command used to modify the top-level architectural properties and metadata of an existing Azure Function App. It interacts directly with the Azure Resource Manager (ARM) control plane to execute `PATCH` requests against the underlying `Microsoft.Web/sites` resource. This allows cloud administrators to reconfigure aspects of the serverless environment—such as the assigned App Service plan, HTTPS enforcement, or organizational tags—without needing to completely recreate the infrastructure.

## Why does it exist?

While `az functionapp create` handles the initial bootstrapping of serverless resources, modern cloud workloads require continuous lifecycle management. As usage scales or security requirements evolve, operators need to seamlessly transition applications between hosting plans (e.g., Consumption to Premium) or toggle platform-level security features like client certificate enforcement. `az functionapp update` exists to provide an imperative, command-line interface to the ARM control plane. Crucially, through its generic `--set`, `--add`, and `--remove` arguments, it exposes the entire ARM API surface area for the resource, allowing engineers to modify newly released Azure features before the CLI team officially authors dedicated flags for them.

## Syntax

```bash
az functionapp update --name <name> --resource-group <resource-group> [options]
```

## Flags

| Flag                     | Description                                                                                                                 | Example                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `-n`, `--name`           | Required. The name of the target Azure Function App.                                                                        | `az functionapp update -n my-func-app -g my-rg`                                    |
| `-g`, `--resource-group` | Required. The name of the Azure Resource Group containing the Function App.                                                 | `az functionapp update -g rg-serverless-prod -n app`                               |
| `--plan`                 | Moves the Function App to a different App Service Plan. The new plan must exist in the same region and resource group.      | `az functionapp update -n app -g rg --plan PremiumPlan`                            |
| `--set`                  | Updates generic ARM resource properties using a space-separated `key=value` syntax. Supports JSON path notation.            | `az functionapp update -n app -g rg --set httpsOnly=true`                          |
| `--add`                  | Adds an object or value to a nested JSON array or dictionary within the ARM resource definition.                            | `az functionapp update -n app -g rg --add tags.Environment=Prod`                   |
| `--remove`               | Removes a specific property, array element, or tag from the ARM resource definition using JSON path syntax.                 | `az functionapp update -n app -g rg --remove tags.Temp`                            |
| `--slot`                 | Specifies that the update should target a specific deployment slot rather than the main production slot.                    | `az functionapp update -n app -g rg --slot staging --set httpsOnly=true`           |
| `--tags`                 | Completely replaces the existing tags on the Function App with a new space-separated list of `key=value` pairs.             | `az functionapp update -n app -g rg --tags dept=IT cost=123`                       |
| `--force-string`         | When using `--set`, forces the CLI to interpret the provided value as a string, even if it looks like a boolean or integer. | `az functionapp update -n app -g rg --set siteConfig.alwaysOn=true --force-string` |
| `--subscription`         | Specifies the subscription ID or name containing the resource, overriding the active CLI context.                           | `az functionapp update -n app -g rg --subscription 1234-5678`                      |

## Examples

```bash
az functionapp update --name billing-func --resource-group rg-finance --set httpsOnly=true
```

> Modifies the ARM resource to strictly enforce HTTPS traffic. Any incoming HTTP requests will automatically be redirected to HTTPS. The `--set` flag intercepts the top-level ARM property `httpsOnly` and patches it to `true`.

```bash
az functionapp update -n image-processor -g rg-media --plan PremiumPlan-EastUS
```

> Transitions a Function App from its current hosting plan (e.g., a Consumption plan) to a designated Premium plan named `PremiumPlan-EastUS`. This is commonly used when a serverless application begins suffering from cold-start latency and requires pre-warmed instances.

```bash
az functionapp update -n webhook-receiver -g rg-api --set clientCertEnabled=true clientCertMode=Require
```

> Enables mutual TLS (mTLS) authentication for the Function App by setting two ARM properties simultaneously. The application will now challenge connecting clients to present a valid X.509 certificate before establishing the TLS tunnel.

```bash
az functionapp update -n payment-processor -g rg-finance --slot staging --set siteConfig.alwaysOn=true
```

> Updates the site configuration specifically for the `staging` deployment slot to enable the "Always On" feature. This prevents the worker process from idling out during testing phases, ensuring immediate response times for QA engineers.

```bash
az functionapp update -n legacy-func -g rg-archive --remove siteConfig.ipSecurityRestrictions
```

> Removes the entire `ipSecurityRestrictions` array from the site configuration using the `--remove` flag. This effectively drops all IP-based firewall rules applied at the platform level, opening the Function App to the internet.

## Real-World Scenarios

**Injecting Dynamic Routing Rules during CI/CD**

```bash
az functionapp update -n api-gateway -g rg-prod --set siteConfig.vnetRouteAllEnabled=true
```

> When integrating a Function App with an Azure Virtual Network (VNet), outbound traffic routing behavior must be explicitly defined. A DevOps pipeline executes this command to force all outbound traffic—not just RFC 1918 private traffic—through the VNet, ensuring compliance with corporate firewall appliances filtering internet egress.

**Upgrading the Language Worker Version via ARM**

```bash
az functionapp update -n node-worker -g rg-compute --set siteConfig.linuxFxVersion="NODE|18"
```

> When Microsoft releases a new Node.js LTS version for Azure Functions, dedicated CLI flags for the upgrade might lag behind. Platform engineers use the generic `--set` property to directly mutate the `linuxFxVersion` string in the ARM backend, instantly migrating the underlying container image executing their serverless code.

**Standardizing Resource Tagging**

```bash
az functionapp update -n reporting-job -g rg-data --add tags.ManagedBy=Terraform tags.Criticality=High
```

> An automated cloud custodian script scans subscriptions for resources lacking required governance tags. Instead of wiping existing tags using `--tags`, the script uses the `--add` argument to safely append the missing `ManagedBy` and `Criticality` keys to the existing tag dictionary.

## When should it NOT be used?

- **Managing Application Environment Variables:** **Do not use `az functionapp update` to set environment variables or secrets.** While it is technically an ARM update, app settings belong to a specific sub-resource. Use `az functionapp config appsettings set` to inject application-level configuration safely.
- **Deploying Application Code:** **Do not use this command to push code artifacts.** `az functionapp update` is strictly for infrastructure control plane metadata. To deploy a zip file or container image containing your actual function logic, use `az functionapp deployment source config-zip` or the Azure Functions Core Tools (`func azure functionapp publish`).
- **Production Infrastructure-as-Code (IaC):** **Do not rely on imperative `update` commands for primary infrastructure definitions.** Hand-crafting `--set` arguments introduces untracked configuration drift. Production infrastructure state should be managed declaratively using Terraform, Bicep, or ARM templates.

## Alternatives

- **`Set-AzFunctionApp`:** **Best for PowerShell integration.** The native Azure PowerShell module equivalent. It excels in environments where complex object manipulation and pipeline chaining (`|`) are preferred over bash string manipulation.
- **Terraform (`azurerm_linux_function_app` / `azurerm_windows_function_app`):** **Best for declarative lifecycle management.** Terraform continuously compares the desired state to the actual Azure state, applying necessary updates predictably and safely without requiring manual `--set` JSON path knowledge.
- **Azure Bicep / ARM Templates:** **Best for native Azure deployments.** Writing `.bicep` files ensures all resource properties are validated against Microsoft's official schemas at compile time, eliminating the guesswork of using the CLI's generic `--set` flag.

## How it works internally

When `az functionapp update` is executed, the Azure CLI utilizes the Python Azure SDK to construct an HTTP `PATCH` request directed at the Azure Resource Manager (ARM) API.

The target endpoint is formatted as:
`https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{name}?api-version=...`

If generic arguments like `--set`, `--add`, or `--remove` are utilized, the CLI first performs a `GET` request to retrieve the current JSON representation of the resource. It then applies the requested JSON path modifications to the local object in memory. Finally, it issues the `PATCH` request with the newly mutated JSON payload.

The ARM control plane processes this payload, validates it against the `Microsoft.Web/sites` schema, and propagates the changes to the specific Azure App Service scale unit hosting the Function App. Because this is a control plane operation, modifying certain architectural properties (like `linuxFxVersion` or `alwaysOn`) will physically restart the underlying container or IIS worker process to apply the new configuration.

## Performance Notes

- **Control Plane Latency:** As an ARM control plane operation, this command typically takes 5 to 15 seconds to execute. However, propagating changes (especially VNet integrations or plan scaling) across the underlying compute clusters can take significantly longer before taking effect on the data plane.
- **Worker Process Restarts:** Updating core `siteConfig` properties causes the Function App's host process to restart. If executed during peak load, this will temporarily drop in-flight HTTP connections and induce "cold start" latency for subsequent invocations until the runtime re-initializes.

## Security Notes

- **RBAC Privileges:** Executing this command requires the `Microsoft.Web/sites/write` action. This is a highly privileged operation; an attacker with this permission can manipulate inbound IP restrictions, inject malicious certificates, or force the app onto a massive, expensive compute plan.
- **Avoid Plaintext Secrets:** Never use the `--set` argument to inject plaintext secrets into ARM metadata properties. ARM resource definitions are visible in plaintext to any user with `Reader` access to the resource group. Secrets must be stored in Azure Key Vault and referenced via Key Vault References in the app settings.

## Common Mistakes

- **Confusing ARM Properties with App Settings**
  - _Mistake:_ Running `az functionapp update -n myapp -g myrg --set appSettings.MyDatabaseString=123`.
  - _Why:_ While `appSettings` is technically a nested ARM property, modifying it via the generic generic `update` command often destroys existing settings because it completely overwrites the array. You must use the dedicated `az functionapp config appsettings set` command, which merges settings safely.
- **Boolean Parsing Failures**
  - _Mistake:_ Running `az functionapp update --set siteConfig.alwaysOn="true"` and receiving an ARM validation error.
  - _Why:_ The Azure CLI's argument parser can struggle to differentiate between a string `"true"` and a JSON boolean `true` when constructing the payload. Depending on the exact ARM schema requirement, you may need to use `--force-string` or carefully quote the JSON payload to ensure type safety.
- **Forgetting Slot Context**
  - _Mistake:_ Updating a crucial routing property but forgetting to append `--slot staging`, accidentally mutating the production endpoint.
  - _Why:_ Slots are technically separate sub-resources in ARM. Unspecified updates default to the main production slot.

## Best Practices

- **Use Specific Commands Before `--set`:** Always check if a dedicated CLI command exists for your task before resorting to `--set`. For example, use `az functionapp identity assign` instead of manually trying to patch the `identity.type` ARM object. The dedicated commands include crucial safety checks and error handling.
- **Audit with `--debug`:** When struggling to figure out the exact JSON path needed for a `--set` or `--remove` operation, run a `GET` operation using `az functionapp show --debug`. This outputs the raw JSON payload Azure expects, allowing you to accurately target the nested properties.
- **Lock Resources After Update:** To prevent accidental configuration drift or rogue script updates, apply an Azure Resource Lock (`az lock create --lock-type ReadOnly`) to mission-critical Function Apps once their configuration is finalized.

## Interview Questions

**Q: A junior developer attempts to change the value of an environment variable named `API_KEY` for a Function App using `az functionapp update --set`. Why is this the wrong approach, and what is the correct command?**
**A:** `az functionapp update` is designed to mutate top-level ARM control plane properties (like the App Service plan or TLS enforcement). Attempting to use `--set` to modify the `appSettings` dictionary directly is highly error-prone and can accidentally overwrite or wipe out all other existing environment variables. The correct command is `az functionapp config appsettings set --settings API_KEY=value`, which performs a safe, additive merge operation.

**Q: Explain the difference between updating the Function App's configuration via the Azure CLI versus updating the `host.json` file.**
**A:** `az functionapp update` modifies infrastructure-level metadata managed by the Azure Resource Manager (ARM)—such as scaling rules, virtual network integrations, and identity assignments. The `host.json` file is a codebase-level configuration that controls the behavior of the Azure Functions _runtime_ itself—such as modifying trigger batch sizes, logging verbosity, or durable task timeouts.

**Q: What happens to actively executing serverless functions if you run an `az functionapp update` command that alters the `siteConfig` properties?**
**A:** Modifying core `siteConfig` properties forces the underlying Azure App Service worker process to restart to apply the new environment parameters. Any functions currently executing in the data plane may be abruptly terminated, and subsequent requests will experience a "cold start" delay while the runtime reloads.

## Practice Problems

**Problem:** You need to update an existing Function App named `data-ingestion` in the `rg-analytics` resource group to strictly enforce HTTP version 2.0.
**Hint:** Use the generic setter flag to modify the `http20Enabled` property nested inside `siteConfig`.
**Solution:**

```bash
az functionapp update --name data-ingestion --resource-group rg-analytics --set siteConfig.http20Enabled=true
```

**Problem:** You are maintaining a Function App named `report-generator` in `rg-finance`. You want to append a new tag `Audit=Required` to the resource, but you absolutely must ensure that you do not accidentally delete the existing `CostCenter=Finance` tag.
**Hint:** Using the standard `--tags` flag replaces all tags. You must use the additive JSON path flag to inject a single tag safely.
**Solution:**

```bash
az functionapp update --name report-generator --resource-group rg-finance --add tags.Audit=Required
```

## References

- [az functionapp - Azure CLI Command Reference](https://learn.microsoft.com/en-us/cli/azure/functionapp)
- [Microsoft.Web sites - Bicep, ARM template & Terraform Reference](https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites)
- [Azure Functions deployment technologies](https://learn.microsoft.com/en-us/azure/azure-functions/functions-deployment-technologies)
