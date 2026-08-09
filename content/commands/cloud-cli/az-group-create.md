---
slug: az-group-create
name: az group create
aliases: []
category: cloud-cli
tags: [azure, resource-manager, resource-group, cli, cloud, arm]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'create an azure resource group'
  - 'make a new resource group in azure'
  - 'provision azure resource group'
  - 'initialize arm logical container'
  - 'create resource group with tags'
relatedCommands: [az-vm-create, az-deployment-group-create, az-webapp-up]
alternatives: []
status: draft
---

## What is it?

`az group create` is a foundational command in the Azure CLI used to provision a new Azure Resource Group. A Resource Group serves as a mandatory logical container that holds related resources for an Azure solution, such as virtual machines, storage accounts, and virtual networks. This command initializes that metadata boundary, requiring only a unique name within the subscription and a specified Azure region.

## Why does it exist?

The Azure Resource Manager (ARM) architecture mandates that every provisioned resource must belong to exactly one Resource Group. This structural requirement exists to enforce unified lifecycle management, RBAC (Role-Based Access Control) security boundaries, and billing aggregation at a granular level. `az group create` bridges the gap between raw ARM REST API `PUT` requests and the developer, providing a quick, programmatic way to bootstrap the prerequisite deployment boundary before provisioning any actual cloud infrastructure.

## Syntax

```bash
az group create --location <location> --name <name> [options]
az group create -l <location> -n <name> [options]
```

## Flags

| Flag                 | Description                                                                                                                | Example                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `-n`, `--name`       | Required. The name of the new resource group. Must be unique within the subscription and adhere to Azure naming rules.     | `az group create -n rg-prod-eastus`                      |
| `-l`, `--location`   | Required. The Azure region where the resource group metadata will be stored (e.g., `eastus`, `westeurope`).                | `az group create -l eastus`                              |
| `--tags`             | A space-separated list of key-value pairs (e.g., `key=value` or `key="value with spaces"`) to apply to the resource group. | `az group create --tags env=prod dept=finance`           |
| `--managed-by`       | The ID of the resource that manages this resource group. Commonly used by Azure Managed Applications.                      | `az group create --managed-by /subscriptions/.../app`    |
| `--subscription`     | Specifies the subscription ID or name to create the group in, overriding the active default subscription.                  | `az group create --subscription 1234-5678...`            |
| `-o`, `--output`     | Formats the command output. Supported formats include `json`, `jsonc`, `table`, `tsv`, and `yaml`.                         | `az group create -o table`                               |
| `--query`            | A JMESPath query to filter the JSON output, extracting specific properties like the provisioning state.                    | `az group create --query "properties.provisioningState"` |
| `--debug`            | Enables verbose debug logging, outputting raw HTTP requests, REST responses, and MSAL token acquisition details.           | `az group create -n myRG -l eastus --debug`              |
| `--verbose`          | Increases the logging verbosity, printing informational messages about the provisioning status without full HTTP dumps.    | `az group create -n myRG -l eastus --verbose`            |
| `--only-show-errors` | Suppresses warnings and informational messages, ensuring only critical errors are emitted to standard error.               | `az group create -n myRG -l eastus --only-show-errors`   |

## Examples

```bash
az group create --name rg-network-core --location eastus
```

> Provisions a standard resource group named `rg-network-core` in the `eastus` region. This is the minimum viable command required to establish a deployment boundary.

```bash
az group create -n rg-app-frontend -l westeurope --tags environment=staging project="web portal"
```

> Creates a resource group and attaches organizational metadata. Tags are critical for cost allocation and billing reports, allowing finance teams to filter Azure costs by the `environment` or `project` keys.

```bash
az group create -n rg-database-tier -l southcentralus --subscription "Production-Sub-01"
```

> Explicitly targets a specific Azure subscription for creation. This prevents accidental deployments into a developer's default sandbox subscription when running automation scripts locally.

```bash
az group create -n rg-ephemeral -l centralus -o tsv --query "name"
```

> Creates the resource group and uses a JMESPath query combined with Tab-Separated Values (`tsv`) output to return _only_ the raw string of the resource group's name. This is ideal for assigning the created name directly into a bash variable (`RG_NAME=$(az group create...)`).

```bash
az group create -n rg-existing -l eastus --tags newTag=true
```

> Executes an idempotent update. If `rg-existing` already exists in `eastus`, the ARM API will not throw an error. Instead, it will apply the new tag structure. _Warning: This will overwrite any existing tags that are not explicitly provided in the command._

## Real-World Scenarios

**Bootstrapping CI/CD Ephemeral Environments**

```bash
RG_NAME="rg-pr-${GITHUB_PR_NUMBER}-tests"
az group create -n $RG_NAME -l eastus --tags ephemeral=true
# ... deploy Bicep/ARM templates into $RG_NAME ...
```

> In modern Pull Request workflows, GitHub Actions or Azure DevOps pipelines dynamically spin up isolated environments for integration testing. The pipeline uses `az group create` to establish a temporary container for the PR. After tests pass, a cleanup script deletes the entire resource group based on the `ephemeral=true` tag, instantly tearing down all associated resources.

**Policy-Driven Tagging Enforcement**

```bash
az group create -n rg-billing-data -l westus2 --tags CostCenter=7890 Owner=DataTeam
```

> Organizations utilizing Azure Policy often enforce strict tagging compliance, denying the creation of any Resource Group that lacks specific tags (like `CostCenter`). Platform engineers use this expanded syntax to satisfy ARM policy definitions during initial tenant bootstrapping.

**Managed Application Backend Generation**

```bash
az group create -n mrg-customer-deployment -l eastus --managed-by /subscriptions/.../resourceGroups/.../providers/Microsoft.Solutions/applications/myApp
```

> Independent Software Vendors (ISVs) publishing Azure Managed Applications use the `--managed-by` flag. This creates a "locked" resource group in the customer's subscription where the ISV's resources will live, but grants the ISV management access while restricting the customer's ability to mutate the underlying infrastructure.

## When should it NOT be used?

- **Production Infrastructure as Code (IaC):** **Do not use `az group create` inside production deployment scripts.** Imperative bash commands lack state management. Use declarative tools like Terraform (`azurerm_resource_group`), Azure Bicep, or ARM Templates to manage the lifecycle of production resource groups safely.
- **Safe Tag Updates:** **Do not use `az group create` simply to add a new tag to an existing resource group.** Because the `PUT` operation expects the full state of the tags, it will overwrite and delete any existing tags not specified in the command. Use `az tag update` or `az group update` instead.
- **Moving Resources:** **Do not use this to change a resource group's region.** A Resource Group cannot be moved to a new region once created. You must create a new group in the desired region and use `az resource move` to migrate the underlying resources.

## Alternatives

- **`New-AzResourceGroup`:** **Best for PowerShell shops.** The direct equivalent in the Azure PowerShell module. It natively outputs .NET objects, making it vastly superior when piping deployment outputs into subsequent PowerShell automation steps.
- **Terraform (`azurerm_resource_group`):** **Best for declarative state management.** Terraform tracks the existence and tags of the resource group in a state file, preventing configuration drift and allowing safe, planned updates.
- **Azure Bicep:** **Best for native Azure IaC.** Bicep can deploy resource groups natively at the `targetScope = 'subscription'` level, bundling the creation of the boundary and the underlying resources into a single, cohesive deployment template.

## How it works internally

When `az group create` is executed, the Azure CLI utilizes the Azure SDK for Python to construct an HTTP `PUT` request directed at the Azure Resource Manager (ARM) REST API. The specific endpoint called is:
`https://management.azure.com/subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}?api-version=2021-04-01`.

Because the ARM API is declarative, a `PUT` request acts as an "upsert" (update or insert). If the resource group does not exist, ARM allocates the logical container in the control plane. If it does exist, ARM updates the metadata (like tags) to match the exact state provided in the payload.

The `--location` parameter dictates where the _metadata_ for the resource group is physically stored. This is critical for compliance and data residency (e.g., GDPR), as it determines which Azure datacenter holds the logs, RBAC definitions, and deployment histories for that group. However, the location of the resource group does _not_ restrict the location of the resources within it; a resource group in `eastus` can seamlessly contain virtual machines deployed in `westeurope`.

## Performance Notes

- **Control Plane Speed:** `az group create` is an asynchronous control plane operation that resolves almost instantly (typically under 2 seconds). It allocates database records in the ARM backend without provisioning any physical compute or storage resources.
- **Eventual Consistency:** While the command returns immediately, Azure's global control plane operates on eventual consistency. If a script runs `az group create` and immediately attempts a role assignment (`az role assignment create`) on that group, the subsequent command may fail with a "ResourceNotFound" error. Automation scripts should implement retry logic or a brief `sleep` to allow the metadata to propagate across ARM endpoints.

## Security Notes

- **RBAC Requirements:** The identity executing this command must possess the `Microsoft.Resources/subscriptions/resourcegroups/write` action. This is inherently granted to the `Contributor` and `Owner` roles at the Subscription scope.
- **Inherited Permissions:** Security assignments applied at the Resource Group scope automatically cascade down to all resources contained within it. Security teams often restrict `az group create` capabilities to prevent developers from creating un-audited "shadow IT" environments where they automatically gain `Owner` permissions over the deployed resources.
- **Locking:** Creating a resource group does not protect it from deletion. In production environments, immediately follow `az group create` with an `az lock create` command (specifically a `CanNotDelete` lock) to prevent accidental infrastructure destruction via a rogue `az group delete` execution.

## Common Mistakes

- **Assuming Resource and Group Locations Must Match**
  - _Mistake:_ Creating a resource group in `westus` and assuming all databases and VMs created inside it will automatically be provisioned in `westus`.
  - _Why:_ The resource group location only dictates where the metadata is stored. When creating resources _inside_ the group (e.g., `az vm create`), you must still explicitly define the resource's location, or it may default unexpectedly based on CLI context.
- **Wiping Tags via Idempotent Updates**
  - _Mistake:_ Running `az group create -n existing-rg -l eastus --tags CostCenter=123` to append a cost center tag.
  - _Why:_ The `PUT` API replaces the entire tag dictionary. Any existing tags on the resource group (e.g., `Owner=Alice`) will be instantly deleted. Use `az tag update --operation merge` to append metadata safely.
- **Relying on Default Subscriptions**
  - _Mistake:_ Running the command in a CI/CD pipeline without passing `--subscription`, accidentally deploying test infrastructure into a production tenant because the service principal's default context was misconfigured.
  - _Why:_ Always explicitly pass `--subscription` in automated scripts to guarantee deterministic deployment boundaries.

## Best Practices

- **Adopt Strict Naming Conventions:** Prefix resource groups consistently to distinguish them from underlying resources. A standard convention is `rg-<workload>-<environment>-<region>-<instance>` (e.g., `rg-billing-prod-eus-01`).
- **Tag at Creation:** Always apply foundational tags (`Environment`, `Owner`, `Application`) directly during the `az group create` execution. This ensures the container is immediately compliant with billing and cost-tracking systems from second zero.
- **Validate Before Creation:** If writing idempotent bash scripts, check for the group's existence before creation to avoid accidental tag wiping: `if ! az group show -n $RG_NAME &>/dev/null; then az group create...; fi`.

## Interview Questions

**Q: If you create a resource group in the `northeurope` region, can you deploy a virtual machine into that resource group that resides in the `japanwest` region?**
**A:** Yes. The location specified during `az group create` only determines where the metadata (like deployment history, RBAC policies, and resource tracking) about the resource group is stored for compliance reasons. It places no geographical restrictions on the actual Azure resources deployed inside it.

**Q: You run `az group create --name my-rg --location eastus`. The command succeeds. You run it again immediately with the exact same parameters. Does it throw an error, create a duplicate, or do something else?**
**A:** It performs an idempotent update. Because the ARM API uses HTTP `PUT`, executing the command against an existing resource group simply updates its metadata to match the provided payload. It will not throw an error or create a duplicate.

**Q: A developer runs `az group create -n dev-rg -l eastus` and it fails with an "AuthorizationFailed" error. What specific RBAC permission are they missing at the subscription level?**
**A:** The developer lacks the `Microsoft.Resources/subscriptions/resourcegroups/write` permission. They need to be assigned a role like `Contributor`, `Owner`, or a custom role containing that specific action at the subscription scope.

## Practice Problems

**Problem:** You are writing an onboarding script. You need to create a resource group named `rg-onboarding-sandbox` in the `westus2` region. To comply with company policy, it must have two tags attached: `Department` set to `Engineering`, and `Temporary` set to `True`. Write the command.
**Hint:** Use the tag flag with space-separated key=value pairs.
**Solution:**

```bash
az group create --name rg-onboarding-sandbox --location westus2 --tags Department=Engineering Temporary=True
```

**Problem:** You are orchestrating a deployment script and need to create a resource group named `rg-app-data` in `centralus`. However, your script needs the exact `provisioningState` returned from the API (which should be `"Succeeded"`) to pass an assertion check. Write the command to output _only_ that unquoted string.
**Hint:** Combine output formatting (to remove quotes) with a JMESPath query targeting the `properties.provisioningState` field.
**Solution:**

```bash
az group create --name rg-app-data --location centralus --output tsv --query "properties.provisioningState"
```

## References

- [az group - Azure CLI Command Reference](https://learn.microsoft.com/en-us/cli/azure/group)
- [Azure Resource Manager Overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview)
- [Resource Naming and Tagging Conventions](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
