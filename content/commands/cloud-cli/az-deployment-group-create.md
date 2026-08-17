---
slug: az-deployment-group-create
name: az deployment group create
aliases: []
category: cloud-cli
tags:
  - azure
  - arm
  - bicep
  - iac
  - infrastructure-as-code
  - deployment
  - automation
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
  - deploy bicep file to azure
  - run arm template deployment
  - provision azure infrastructure as code
  - deploy azure resources to resource group
  - execute what-if deployment azure
relatedCommands: [az-group-create]
alternatives: []
status: draft
---

## What is it?

`az deployment group create` is the primary Azure CLI command used to execute Infrastructure as Code (IaC) deployments at the Resource Group scope. It submits declarative Azure Resource Manager (ARM) JSON templates or modern Azure Bicep files to the Azure control plane to provision, update, or configure cloud resources. It allows engineers to reliably and repeatedly deploy complex, multi-resource cloud environments using a single unified command.

## Why does it exist?

Historically, provisioning cloud resources involved stringing together hundreds of imperative CLI commands (e.g., `az network vnet create` followed by `az vm create`), which lacked state tracking, dependency management, and error recovery. To solve this, Microsoft developed the Azure Resource Manager (ARM), a deployment engine that parses declarative JSON templates to understand dependencies and orchestrate parallel provisioning. This command serves as the critical client-side bridge, allowing developers to push those declarative templates (and seamlessly transpile Bicep files) into the ARM engine for execution, enabling true, idempotent Infrastructure as Code workflows.

## Syntax

```bash
az deployment group create --resource-group <resource-group-name> [options]
```

## Flags

| Flag                     | Description                                                                                                                                 | Example                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `-g`, `--resource-group` | Required. The name of the target Azure Resource Group where the deployment will be executed and resources provisioned.                      | `az deployment group create -g rg-prod-eastus`                            |
| `-f`, `--template-file`  | The local path to the ARM JSON template or Bicep file to be deployed.                                                                       | `az deployment group create -g rg -f main.bicep`                          |
| `-u`, `--template-uri`   | The HTTP/HTTPS URI of an ARM template stored remotely (e.g., in a public GitHub repo or Azure Storage account).                             | `az deployment group create -g rg -u https://raw.github...`               |
| `-p`, `--parameters`     | Supplies deployment parameters. Can be a local JSON parameters file, a URI to a parameters file, or inline `key=value` pairs.               | `az deployment group create -g rg -p prod.parameters.json`                |
| `-n`, `--name`           | Explicitly names the deployment object in the Azure control plane. If omitted, defaults to the template file name.                          | `az deployment group create -g rg -n deploy-vnet-01`                      |
| `-c`, `--what-if`        | Executes a dry run of the deployment, returning a detailed diff of exactly which resources will be created, modified, or deleted.           | `az deployment group create -g rg -f main.bicep -c`                       |
| `--confirm-with-what-if` | Runs the What-If analysis and pauses execution, prompting the user for manual `[y/N]` confirmation before applying the changes.             | `az deployment group create -g rg -f main.bicep --confirm-with-what-if`   |
| `--mode`                 | The deployment mode. `Incremental` (default) adds/updates resources. `Complete` aggressively deletes resources not defined in the template. | `az deployment group create -g rg --mode Complete`                        |
| `--no-wait`              | Initiates the deployment asynchronously, exiting the CLI immediately instead of blocking until the deployment finishes.                     | `az deployment group create -g rg -f main.bicep --no-wait`                |
| `--rollback-on-error`    | Specifies a previous successful deployment name to automatically roll back to if the current deployment fails.                              | `az deployment group create -g rg --rollback-on-error last-good-deploy`   |
| `--query`                | A JMESPath query to filter the JSON output, extracting specific properties like the provisioning state or deployment outputs.               | `az deployment group create -g rg --query "properties.provisioningState"` |

## Examples

```bash
az deployment group create --resource-group rg-network --template-file vnet.bicep
```

> Deploys a local Bicep file to the specified resource group. The CLI automatically transpiles `vnet.bicep` into an ARM JSON template in memory and submits it to the Azure control plane.

```bash
az deployment group create -g rg-app -f main.bicep --parameters environment=prod instanceCount=3
```

> Deploys a template and passes parameter values directly via the command line using inline `key=value` pairs. This overrides any default values defined within the Bicep or ARM file.

```bash
az deployment group create -g rg-app -f main.bicep -p prod.parameters.json -p adminPassword=$SECURE_PASS
```

> Demonstrates parameter layering. It loads the bulk of the configuration from `prod.parameters.json`, but overrides the `adminPassword` parameter using an environment variable to prevent hardcoding secrets in the file.

```bash
az deployment group create -g rg-database -u [https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/quickstarts/microsoft.sql/sql-database/azuredeploy.json](https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/quickstarts/microsoft.sql/sql-database/azuredeploy.json)
```

> Deploys an ARM template directly from a public URL. This is frequently used for distributing quickstart architectures or executing vendor-supplied reference deployments.

```bash
az deployment group create -g rg-core -f core.bicep -n "core-infra-$(date +%s)"
```

> Explicitly names the deployment using a dynamic timestamp. This prevents overwriting the deployment history of previous runs in the Azure Portal, ensuring a clear audit trail of who deployed what and when.

## Real-World Scenarios

**CI/CD Pre-Flight Validation with What-If**

```bash
az deployment group create -g rg-frontend -f webapp.bicep -p prod.bicepparam --confirm-with-what-if
```

> In manual execution scenarios or highly gated CI/CD pipelines, engineers use the `--confirm-with-what-if` flag. Instead of blindly applying infrastructure changes, the CLI queries the live Azure environment, calculates a state drift diff, and prints exactly which App Services or storage accounts will be added, modified, or destroyed, requiring explicit human approval to proceed.

**Fire-and-Forget Asynchronous Orchestration**

```bash
az deployment group create -g rg-data -f heavy-db.bicep --no-wait
az deployment group create -g rg-app -f web-tier.bicep --no-wait
```

> When deploying massive environments containing resources that take over 30 minutes to provision (e.g., Azure SQL Managed Instances or Application Gateways), synchronous CLI blocking is inefficient. DevOps scripts use `--no-wait` to submit multiple independent deployment jobs to the ARM engine simultaneously, letting Azure's backend handle the parallel orchestration.

**Enforcing Strict Infrastructure State (Complete Mode)**

```bash
az deployment group create -g rg-sandbox -f base.bicep --mode Complete
```

> Sandbox resource groups often become polluted with orphaned disks, rogue VMs, and test subnets left behind by developers. Platform engineers run scheduled pipeline jobs using `--mode Complete`. This instructs ARM to strictly synchronize the resource group with the template; if a resource exists in the group but is _not_ defined in `base.bicep`, ARM actively deletes it.

## When should it NOT be used?

- **Multi-Subscription/Tenant Deployments:** **Do not use `az deployment group create` for enterprise-wide scaffolding.** This command is strictly bound to a single resource group boundary. To deploy Management Groups, Policy Assignments, or resources across multiple subscriptions simultaneously, use `az deployment sub create` or `az deployment tenant create`.
- **Multi-Cloud Architectures:** **Do not use ARM/Bicep if your organization standardizes on cloud-agnostic tooling.** If you manage AWS, GCP, and Azure simultaneously, introducing `az deployment group create` fragments your IaC pipeline. Use Terraform to maintain a unified deployment workflow.
- **Imperative Ad-Hoc Tasks:** **Do not write a Bicep file just to restart a VM or rotate a storage key.** Deployments are for declarative state management. For rapid, one-off operational tasks, use the specific imperative CLI commands (e.g., `az vm restart`).

## Alternatives

- **Terraform (`terraform apply`):** **Best for multi-cloud and explicit state tracking.** Terraform manages a strict local or remote `.tfstate` file, calculating diffs locally before reaching out to the cloud. Bicep and ARM lack a dedicated state file, relying on Azure's live API to calculate state dynamically.
- **`New-AzResourceGroupDeployment`:** **Best for Windows/PowerShell environments.** The exact equivalent in the Azure PowerShell module. It outputs rich .NET objects instead of JSON, making it deeply compatible with complex PowerShell scripting pipelines.
- **Pulumi:** **Best for general-purpose programming.** Pulumi allows developers to write infrastructure using TypeScript, Python, or Go, offering loops, advanced conditionals, and standard unit testing frameworks that declarative languages like Bicep/ARM lack.

## How it works internally

When `az deployment group create` is executed, the CLI performs several pre-flight operations. If the `--template-file` ends in `.bicep`, the CLI invisibly invokes the Bicep compiler (downloading it dynamically if not installed) to transpile the Bicep syntax into a raw ARM JSON template in memory. It then parses any provided parameters and constructs an HTTP `PUT` payload.

This payload is submitted to the Azure Resource Manager REST API endpoint:
`https://management.azure.com/subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}/providers/Microsoft.Resources/deployments/{deploymentName}?api-version=2021-04-01`

Once received, the ARM control plane assumes full responsibility. It parses the JSON, evaluates the `dependsOn` arrays (or implicit Bicep dependencies) to construct a Directed Acyclic Graph (DAG) of the requested resources. ARM then dispatches parallel provisioning tasks to the specific underlying Azure Resource Providers (e.g., `Microsoft.Compute`, `Microsoft.Network`).

If executed synchronously (without `--no-wait`), the Azure CLI drops into a polling loop, sending continuous `GET` requests to the deployment's status endpoint. It tracks the provisioning state of individual nested resources and eventually reports the terminal status of the overall deployment (`Succeeded`, `Failed`, or `Canceled`).

## Performance Notes

- **Bicep Compilation Overhead:** Transpiling complex Bicep projects containing dozens of linked modules requires disk I/O and CPU time locally before the HTTP request is even initiated. For massive templates, pre-building the ARM JSON (`az bicep build`) in an earlier CI step can slightly accelerate the final deployment command.
- **ARM Engine Parallelism:** The deployment speed is entirely dictated by the Azure backend. Because ARM provisions resources in parallel based on the dependency graph, a template deploying 50 independent Storage Accounts will finish almost as quickly as a template deploying 1, whereas a linear chain of 5 interdependent VMs will take significantly longer.

## Security Notes

- **RBAC Execution Context:** The identity running this command must have `Microsoft.Resources/deployments/write` access at the Resource Group scope, _plus_ the specific IAM permissions required to create every individual resource defined within the template (e.g., `Microsoft.Compute/virtualMachines/write`).
- **Preventing Parameter Leakage:** When deploying databases or VMs, passing passwords via inline `-p password=MySecret123!` exposes the plaintext string to shell history, CI logs, and the Azure deployment history blade. Always define sensitive parameters in Bicep using the `@secure()` decorator and pass them via Azure Key Vault references or masked CI/CD variables.
- **Managed Identities in IaC:** When deploying resources that require deployment scripts or post-provisioning configurations (like `deploymentScripts`), ensure the command is executed using a User-Assigned Managed Identity to avoid hardcoding Service Principal credentials in your automation runner.

## Common Mistakes

- **Accidental Infrastructure Deletion via `--mode Complete`**
  - _Mistake:_ Using `--mode Complete` to deploy an update to a web app in a shared resource group containing unrelated databases.
  - _Why:_ `Complete` mode is highly destructive. It instructs ARM to delete _any_ resource in the group that is not explicitly defined in the template you just submitted. The databases will be permanently destroyed. Always default to `Incremental` mode unless managing dedicated, isolated environments.
- **Omitting the Deployment Name**
  - _Mistake:_ Repeatedly running `az deployment group create -g rg -f main.bicep` without the `-n` flag.
  - _Why:_ The CLI defaults the deployment name to `main`. Azure retains a history of the last 800 deployments in a resource group. Continually overwriting the `main` deployment history makes it impossible to audit past executions or debug historical parameter configurations in the Azure Portal.
- **Ignoring What-If Output**
  - _Mistake:_ Running a deployment in production without running `--what-if` first, resulting in the unexpected deletion and recreation of a public IP address due to an immutable property change.
  - _Why:_ Some ARM properties force resource replacement rather than in-place updates. `--what-if` highlights these destructive replacements (marked with purple `~` or `-` indicators) before they happen.

## Best Practices

- **Standardize on Bicep:** Abandon writing raw ARM JSON templates. Azure Bicep offers drastically improved readability, native modularity, type safety, and automatic dependency resolution, making `az deployment group create` significantly safer and easier to use.
- **Use `.bicepparam` Files:** Avoid passing numerous parameters inline or using legacy JSON parameter files. Adopt modern `.bicepparam` files, which provide strong typing and intellisense, passing them via `az deployment group create ... -p config.bicepparam`.
- **Capture Deployment Outputs:** If your Bicep file defines `output` variables (like a generated Web App URL or an IP address), capture them programmatically using the query flag: `URL=$(az deployment group create ... --query "properties.outputs.appUrl.value" -o tsv)`.

## Interview Questions

**Q: What is the fundamental difference between `Incremental` and `Complete` deployment modes?**
**A:** `Incremental` mode adds new resources and updates existing ones to match the template, but ignores and leaves intact any existing resources in the group that are not defined in the template. `Complete` mode strictly synchronizes the resource group to the template, actively _deleting_ any resource in the group that is missing from the template.

**Q: A developer deploys a Bicep file containing a Virtual Network and a Virtual Machine. How does the ARM engine determine which resource to create first?**
**A:** The ARM engine parses the transpiled JSON to build a Directed Acyclic Graph (DAG) of dependencies. If the VM's Network Interface references the Virtual Network's Subnet ID (either explicitly via a `dependsOn` block in JSON, or implicitly by referencing the resource's symbolic name in Bicep), ARM knows to provision the VNet entirely before initiating the VM creation.

**Q: Why might `az deployment group create` succeed, but the deployed application still lacks the data it needs from a previously provisioned database?**
**A:** The command only guarantees that the _infrastructure control plane_ provisioning has completed. It does not wait for _data plane_ initialization (like OS booting, software installation, or database seeding). If post-deployment scripts are required, they must be orchestrated via VM Extensions or Azure Deployment Scripts within the template itself.

## Practice Problems

**Problem:** You have a Bicep file named `storage.bicep` that requires two parameters: `storageAccountName` and `sku`. Write the command to deploy this to the `rg-data-dev` resource group, specifying the deployment name as `DeployStorage01` and passing the parameters inline.
**Hint:** Use the explicit flags for file, resource group, deployment name, and parameters.
**Solution:**

```bash
az deployment group create --resource-group rg-data-dev --name DeployStorage01 --template-file storage.bicep --parameters storageAccountName=mystdevapp01 sku=Standard_LRS
```

**Problem:** You are deploying `network.bicep` to `rg-core-infra`, but because this contains critical production subnets, you want the CLI to calculate the changes and prompt you for manual confirmation before it actually provisions anything.
**Hint:** Use the flag that combines a dry-run with an interactive verification prompt.
**Solution:**

```bash
az deployment group create --resource-group rg-core-infra --template-file network.bicep --confirm-with-what-if
```

## References

- [az deployment group - Azure CLI Command Reference](https://learn.microsoft.com/en-us/cli/azure/deployment/group)
- [Azure Resource Manager deployment modes](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-modes)
- [Deploy resources with Bicep and Azure CLI](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli)
