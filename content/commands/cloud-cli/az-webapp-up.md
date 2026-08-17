---
slug: az-webapp-up
name: az webapp up
aliases: []
category: cloud-cli
tags:
  - azure
  - cloud
  - webapp
  - app-service
  - deployment
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
  - deploy app to azure web app
  - create and deploy azure webapp
  - publish local code to azure app service
  - deploy web app from directory azure cli
  - quick azure webapp deployment
relatedCommands: [az-group-create, az-account-set, az-login]
alternatives: [az-storage-blob-upload]
status: draft
---

## What is it?

`az webapp up` is a high-level, composite Azure CLI command that automates the entire lifecycle of provisioning and deploying a web application to Azure App Service. It scans the local source code directory, automatically detects the runtime stack (Node.js, Python, Java, PHP, .NET), creates a resource group, provisions an App Service plan, creates the web app instance, and packages and deploys the code in a single workflow.

## Why does it exist?

Traditionally, deploying a web application to Azure required invoking multiple discrete commands in a strict sequence: creating a resource group, provisioning an App Service plan, creating the web app instance, configuring runtime settings, and finally uploading or zipping the source code via deployment APIs. This fragmented workflow introduced steep onboarding friction for developers accustomed to rapid deployment tools. `az webapp up` exists to bridge this gap by providing an intelligent, zero-configuration wizard command that infers project settings from source files and automates end-to-end cloud publishing.

## Syntax

```bash
az webapp up [--name <value>] [--resource-group <value>] [--plan <value>] [--sku <value>] [--runtime <value>] [--location <value>] [options]
```

## Flags

| Flag                     | Description                                                                               | Example                                |
| ------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| `--name`, `-n`           | Specifies the unique name of the Azure App Service web app to create or update.           | `az webapp up --name my-unique-app`    |
| `--resource-group`, `-g` | Specifies the target resource group; creates one automatically if it does not exist.      | `az webapp up -g rg-production`        |
| `--plan`                 | Specifies the name of an existing App Service plan or creates a new default one.          | `az webapp up --plan myAppServicePlan` |
| `--sku`                  | Defines the pricing tier and performance SKU (e.g., F1, B1, S1, P1v2).                    | `az webapp up --sku B1`                |
| `--runtime`              | Explicitly defines the language runtime stack (e.g., `PYTHON:3.11`, `NODE:20-lts`).       | `az webapp up --runtime "PYTHON:3.11"` |
| `--location`, `-l`       | Specifies the Azure region where the resource group and App Service will be provisioned.  | `az webapp up --location eastus`       |
| `--html`                 | Forces the application to be deployed as a static HTML site.                              | `az webapp up --html`                  |
| `--os-type`              | Specifies the host operating system for the App Service (`linux` or `windows`).           | `az webapp up --os-type linux`         |
| `--output`, `-o`         | Formats the command output style (`json`, `jsonc`, `table`, `tsv`, `yaml`, `none`).       | `az webapp up --output json`           |
| `--query`                | Filters and extracts specific properties from the resulting output using JMESPath syntax. | `az webapp up --query "url"`           |
| `--verbose`              | Increases logging verbosity to print detailed diagnostic messages during provisioning.    | `az webapp up --verbose`               |
| `--debug`                | Increases logging verbosity to output full HTTP request and response trace logs.          | `az webapp up --debug`                 |

## Examples

```bash
az webapp up --name my-node-app --sku B1
```

> This automatically scans the local directory, detects a Node.js project, creates a default resource group and App Service plan on the Basic tier (`B1`), provisions a web app named `my-node-app`, and deploys the local code in one step.

```bash
az webapp up -g rg-staging -n api-service --runtime "PYTHON:3.11"
```

> This provisions the web app inside a specified resource group (`rg-staging`), naming it `api-service` and explicitly overriding runtime detection to deploy using Python version 3.11.

```bash
az webapp up --name enterprise-app --plan production-plan --resource-group rg-prod
```

> This deploys code to an _existing_ App Service plan (`production-plan`) within a designated resource group, updating the application code without creating new underlying infrastructure tiers.

```bash
az webapp up --name static-site --html
```

> This flags the local directory containing standard HTML, CSS, and client-side JavaScript assets to be deployed immediately as a static web application on App Service.

```bash
az webapp up --name global-app --location westeurope --query "url" --output tsv
```

> This provisions the application in the West Europe region and uses JMESPath query filtering with TSV formatting to output strictly the raw HTTPS application endpoint URL for automated script parsing.

## Real-World Scenarios

**Rapid Prototyping and Hackathon Deployments**

```bash
cd ./my-prototype && az webapp up --sku F1
```

> Developers participating in hackathons or rapid prototyping use `az webapp up` inside their local project roots to instantly publish applications to free-tier (`F1`) cloud environments without manually configuring resource groups or plans.

**Continuous Integration and Continuous Deployment (CI/CD) Pipeline Code Pushes**

```bash
az webapp up --name existing-api-app --resource-group rg-core
```

> Automated build agents or deployment scripts execute `az webapp up` after compiling artifacts to rapidly update live App Service instances with the latest source code revision.

**Local-to-Cloud Environment Validation**

```bash
az webapp up --name test-sandbox-app --runtime "NODE:20-lts" --sku B1
```

> Software engineers validating code compatibility inside cloud runtimes use explicit runtime flags to spin up isolated sandbox web apps mirroring production specifications.

## When should it NOT be used?

- **Complex, multi-service enterprise architectures:** Running `az webapp up` for microservices requiring custom database integration, virtual network injection, and managed identities. **Reason:** The command provides simplified default configurations and lacks granular control over networking rules, staging slots, and advanced security bindings. **Use instead:** Terraform, Azure Bicep, or explicit modular Azure CLI commands (`az webapp create`).
- **Production zero-downtime blue/green deployment pipelines:** **Reason:** `az webapp up` deploys code directly against active production endpoints or updates primary slots without built-in traffic staging slots. **Use instead:** Azure Deployment Slots (`az webapp deployment slot`).
- **Immutable infrastructure management workflows:** **Reason:** Because `az webapp up` automatically creates missing resources on the fly, it can mask configuration drift and obscure infrastructure definitions. **Use instead:** Declarative Infrastructure-as-Code tools.

## Alternatives

- **`az webapp deployment source config-zip`:** Deploying from a pre-built zip archive. **Tradeoff:** It provides precise control over exact build packages, but requires you to manually provision the resource group, App Service plan, and web app instance beforehand.
- **Terraform (HashiCorp):** Declarative infrastructure provisioning tool. **Tradeoff:** Terraform offers robust state tracking and multi-cloud repeatability, but requires writing complex HCL configuration files instead of offering an instant command-line wizard.

## How it works internally

When executed, `az webapp up` acts as an intelligent state machine and orchestration wrapper. First, it scans the local execution directory, analyzing file extensions and configuration manifests (`package.json`, `requirements.txt`, `pom.xml`, `composer.json`) to infer the correct language runtime stack.

Next, it checks the local Azure CLI profile cache to verify your authentication state and active subscription. It issues sequential Azure Resource Manager (ARM) REST API calls: checking for or creating the specified resource group, provisioning an App Service Plan (if a matching plan does not already exist), and creating the underlying web app application instance. Once the infrastructure components are active, the CLI bundles the local directory contents into a temporary ZIP archive, generates a deployment payload, and pushes it over HTTPS to the Kudu deployment engine (SCM endpoint) running on the App Service. Kudu extracts the package, resolves runtime dependencies (e.g., running `npm install` or `pip install`), and restarts the worker process. The command exits with `0` upon successful deployment, or non-zero if runtime detection fails or deployment timeouts occur.

## Performance Notes

- The initial execution of `az webapp up` can take several minutes because it provisions brand-new underlying Azure infrastructure (App Service plans, storage mounts, and worker nodes) in addition to uploading code.
- Subsequent executions targeting an _existing_ web app skip infrastructure provisioning and execute significantly faster, focusing strictly on file packaging and Kudu SCM deployment uploads.

## Security Notes

- **Default Public Exposure:** `az webapp up` provisions web apps with public internet accessibility and default SSL/TLS endpoints by default, which can expose unfinished applications if access restrictions are not applied.
- **Accidental Secret Inclusion:** Because the command zips the entire local directory, any unignored `.env` files, configuration secrets, or private keys present in the folder will be bundled and uploaded to the cloud server.

## Common Mistakes

- **Running the command outside the project root directory:** Executing `az webapp up` from a generic parent directory or home folder. **Why it's wrong:** The runtime detection engine scans the current working directory; if it cannot locate recognizable project manifests (`package.json`, etc.), it fails to detect the runtime or deploys empty directories.
- **Assuming existing resource names are globally unique:** Choosing a common web app name (e.g., `my-app`). **Why it's wrong:** App Service web app names form part of the default public URL (`*.azurewebsites.net`), requiring globally unique naming across all Azure customers. The command will fail if the name is already taken.
- **Neglecting `.gitignore` configurations:** Uploading massive `node_modules` or `venv` folders to Azure. **Why it's wrong:** Zipping and uploading thousands of local dependency files wastes network bandwidth and causes Kudu build timeouts. Always ensure build directories are excluded.

## Best Practices

- Always run `az webapp up` from the precise root directory of your source code repository where your runtime manifest files reside.
- Maintain a strict `.gitignore` (or leverage `.deployment` exclusion rules) to prevent local dependencies and secret files from being bundled into the deployment archive.
- Explicitly define runtime versions (e.g., `--runtime "NODE:20-lts"`) in production automation scripts to prevent breaking changes caused by automatic runtime updates.

## Interview Questions

**Q:** How does `az webapp up` automatically determine the correct language runtime for an application without requiring explicit flag configuration?
**A:** The command scans the local execution directory for specific dependency manifests and configuration files—such as `package.json` for Node.js, `requirements.txt` for Python, `pom.xml` for Java, or `composer.json` for PHP—and maps those structural signatures to supported Azure App Service runtime stacks.

**Q:** What is the technical mechanism responsible for building and executing code deployments after `az webapp up` uploads local files to Azure App Service?
**A:** Once files are packaged and uploaded via HTTPS, Azure App Service delegates the deployment to the **Kudu (SCM)** engine running alongside the web app container. Kudu extracts the ZIP archive, evaluates build requirements (such as executing build scripts or package managers like `npm install`), moves the output into the runtime directory, and restarts the application worker process.

**Q:** Why is using `az webapp up` discouraged for managing complex enterprise production environments compared to declarative Infrastructure-as-Code?
**A:** `az webapp up` is designed as a rapid, zero-configuration wizard command that implicitly creates missing resources on the fly, which obscures explicit infrastructure definitions, hinders state auditing, and increases the risk of configuration drift across multi-tier enterprise systems.

## Practice Problems

**Problem:** Quickly deploy a local Python web application directory to a new Azure web app named `data-api-service` in the `eastus` region using Python 3.11 on the Basic (`B1`) pricing tier.
**Hint:** Combine the app name, location, runtime specification, and SKU pricing flags.
**Solution:** `az webapp up --name data-api-service --location eastus --runtime "PYTHON:3.11" --sku B1` (This provisions the infrastructure in the target region with the specified runtime and SKU, and uploads the local Python code).

**Problem:** Deploy local code changes to an existing App Service web app named `portal-app` located inside the resource group `rg-prod` without creating any new infrastructure plans.
**Hint:** Specify the exact web app name and resource group parameters while executing from the project root.
**Solution:** `az webapp up --name portal-app --resource-group rg-prod` (This targets the existing app and resource group to push the updated local source code revision).

## References

- [Azure CLI Command Reference - az webapp up](https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest#az-webapp-up)
- [Microsoft Learn: Deploy an app to Azure App Service with a single command](https://learn.microsoft.com/en-us/azure/app-service/quickstart-custom-container?pivots=platform-linux)
