---
slug: az-vm-create
name: az vm create
aliases: []
category: cloud-cli
tags: [azure, cloud, vm, compute, virtual-machine, provisioning]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'create azure virtual machine'
  - 'provision azure vm cli'
  - 'deploy azure server'
  - 'start new azure vm'
  - 'launch azure virtual machine'
relatedCommands: [az-account-set, az-group-create]
alternatives: []
status: draft
---

## What is it?

`az vm create` is a high-level Azure CLI command used to provision a new Azure Virtual Machine along with its foundational infrastructure dependencies—such as virtual networks, subnets, network security groups, public IP addresses, and managed storage disks. It automates multiple underlying Azure Resource Manager (ARM) API calls into a single synchronous deployment operation.

## Why does it exist?

Deploying an Azure Virtual Machine natively via ARM templates, Bicep, or raw REST APIs requires orchestrating a complex dependency graph of supporting resources (e.g., creating a network, attaching a subnet, provisioning an NIC, allocating a public IP, and configuring a storage disk) before the compute node itself can even be instantiated. `az vm create` exists to bridge this operational gap by providing an intelligent, composite wizard command that synthesizes these scattered infrastructure requirements into a single, straightforward invocation.

## Syntax

```bash
az vm create --resource-group <group> --name <vm-name> --image <image> --admin-username <username> [--admin-password <password> | --ssh-key-values <path>] [options]
```

## Flags

| Flag                     | Description                                                                                           | Example                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `--resource-group`, `-g` | Specifies the name of the Azure resource group where all virtual machine dependencies will be housed. | `az vm create -g rg-prod -n myVM`                 |
| `--name`, `-n`           | Defines the unique hostname and resource name assigned to the virtual machine instance.               | `az vm create -n app-server-01`                   |
| `--image`                | Specifies the operating system image (publisher:offer:sku:version or URN) to deploy.                  | `az vm create --image Ubuntu2204`                 |
| `--admin-username`       | Sets the administrative user account name created on the virtual machine during boot.                 | `az vm create --admin-username azureuser`         |
| `--admin-password`       | Sets the administrator password (required if SSH keys are not supplied for Linux/Windows).            | `az vm create --admin-password 'ComplexPass!123'` |
| `--ssh-key-values`       | Provides public SSH key paths or raw key strings for secure key-based Linux authentication.           | `az vm create --ssh-key-values ~/.ssh/id_rsa.pub` |
| `--size`                 | Defines the Azure VM hardware size tier (e.g., Standard_B1s, Standard_D2s_v3).                        | `az vm create --size Standard_D4s_v3`             |
| `--subnet`               | Places the virtual network interface card into an existing specific subnet ID or name.                | `az vm create --subnet sub-backend`               |
| `--vnet-name`            | Specifies the name of a pre-existing virtual network; a new one is created if omitted.                | `az vm create --vnet-name vnet-prod`              |
| `--public-ip-address`    | Controls public IP allocation; defaults to basic dynamic IP or accepts specific SKU names.            | `az vm create --public-ip-address ""`             |
| `--storage-account`      | Specifies a custom storage account name used for boot diagnostics or disk caching.                    | `az vm create --storage-account mystorage`        |
| `--tags`                 | Applies key-value resource tags directly to the virtual machine and its attached resources.           | `az vm create --tags Env=Prod Owner=DevOps`       |

## Examples

```bash
az vm create --resource-group rg-web --name myVM --image Ubuntu2204 --admin-username azureuser --generate-ssh-keys
```

> This provisions a standard Ubuntu 22.04 virtual machine inside the `rg-web` resource group. The `--generate-ssh-keys` flag automatically creates local RSA key pairs if none exist in `~/.ssh`, configuring secure administrative access without requiring manual password entry.

```bash
az vm create -g rg-db -n dbServer --image Win2022Datacenter --size Standard_D4s_v3 --admin-password 'P@ssw0rd2026!'
```

> This deploys a high-performance Windows Server 2022 Datacenter instance using a larger compute size (`Standard_D4s_v3`), configuring remote RDP access with the specified administrative password.

```bash
az vm create -g rg-app -n appNode --image Debian11 --subnet /subscriptions/.../sub-app --public-ip-address ""
```

> This provisions a Debian 11 virtual machine directly inside a pre-existing subnet (`sub-app`) while explicitly passing an empty string to `--public-ip-address`, creating a secure, isolated internal server with no public internet exposure.

```bash
az vm create -g rg-core -n coreSrv --image RHEL --custom-data cloud-init.txt --tags Project=Core Tier=Backend
```

> This launches a Red Hat Enterprise Linux instance while injecting an external cloud-init configuration script (`cloud-init.txt`) via `--custom-data` to automate software installation upon boot, and applies resource tags.

```bash
az vm create -g rg-cluster -n workerNode --image Ubuntu2204 --spot --max-price 0.05
```

> This provisions a cost-optimized Azure Spot Virtual Machine by setting `--spot`, bidding a maximum hourly rate of $0.05, which allows Azure to reclaim compute capacity dynamically if market pricing exceeds the bid threshold.

## Real-World Scenarios

**Automating Staging Environment Provisioning**

```bash
az vm create -g rg-staging -n stagingApp --image Ubuntu2204 --admin-username azureuser --generate-ssh-keys --size Standard_B2s
```

> Engineering teams use automated shell scripts incorporating `az vm create` to rapidly spin up clean staging environments on demand for integration testing, tearing them down afterward to control cloud expenditures.

**Deploying Secure Internal Bastion Hosts**

```bash
az vm create -g rg-net -n bastionHost --image Ubuntu2204 --admin-username adminuser --ssh-key-values ~/.ssh/bastion.pub --subnet sub-mgmt
```

> Network administrators deploy secure jump boxes or bastion hosts into dedicated management subnets using strict SSH key-based authentication, restricting administrative entry points into private cloud subnets.

**Rapid Disaster Recovery Failover Spin-up**

```bash
az vm create -g rg-dr -n failoverNode --image Win2022Datacenter --admin-password 'SecureFailover!99' --size Standard_D8s_v3
```

> During high-availability incident response or disaster recovery drills, operations teams use this command to rapidly instantiate heavy-compute replacement servers in secondary regional resource groups.

## When should it NOT be used?

- **Managing long-term production infrastructure state:** Using manual CLI `az vm create` commands for core production servers. **Reason:** Direct command-line provisioning bypasses state management and version control, creating unrepeatable infrastructure drift. **Use instead:** Terraform, Bicep, or Azure Resource Manager templates.
- **Orchestrating complex multi-tier application architectures:** Launching web servers, databases, and load balancers sequentially via terminal commands. **Reason:** Manual multi-resource creation introduces race conditions and fragmented dependency mappings. **Use instead:** Azure Deployment Stacks or multi-resource Bicep modules.
- **Ephemeral microservice workloads:** Provisioning virtual machines for containerized microservices. **Reason:** Virtual machines carry heavy OS virtualization overhead compared to lightweight containers. **Use instead:** Azure Container Instances (ACI) or Azure Kubernetes Service (AKS).

## Alternatives

- **Azure Bicep / ARM Templates:** Native declarative infrastructure-as-code languages. **Tradeoff:** Bicep requires writing structured template files and managing deployment lifecycles, but provides full idempotency, state validation, and repeatability compared to imperative CLI commands.
- **Terraform (HashiCorp):** Multi-cloud declarative infrastructure provisioning. **Tradeoff:** Terraform introduces state file locking and enterprise provider ecosystems, but adds external toolchain dependencies.

## How it works internally

When executed, `az vm create` acts as a high-level orchestrator that translates terminal arguments into a complex sequence of sequential Azure Resource Manager (ARM) REST API calls. Because a Virtual Machine cannot exist in isolation, the CLI automatically inspects parameters and constructs supporting resources if they do not already exist. It initiates calls to create a Resource Group (if needed), provisions a Virtual Network and Subnet via the Network resource provider, allocates a Network Security Group (NSG) with default inbound SSH/RDP rules, provisions a Public IP address resource, allocates a Network Interface Card (NIC), requests an Azure Managed Disk volume from the Compute resource provider using the specified OS image URN, and finally submits the `VirtualMachines` resource creation payload. The ARM control plane processes these dependency creations asynchronously, returning status updates to the CLI until provisioning completes with an exit code of `0`.

## Performance Notes

- Provisioning a Virtual Machine via `az vm create` involves sequential dependency resolution across multiple Azure resource providers (Compute, Network, Storage), meaning execution can take anywhere from 30 seconds to several minutes depending on region load.
- Using smaller introductory VM sizes (`Standard_B1s`) can result in slower initial boot times and disk initialization performance due to low CPU credit accrual baselines.

## Security Notes

- **Default Network Security Group Rules:** `az vm create` automatically creates an inbound NSG rule allowing public internet traffic on port 22 (SSH) or port 3389 (RDP) by default if a public IP is attached, representing an immediate brute-force attack surface if weak passwords or exposed keys are used.
- **Password Authentication Risks:** Supplying plaintext passwords via `--admin-password` in shared terminal history logs or CI/CD console outputs exposes administrative credentials to unauthorized observers. Always favor SSH public keys (`--ssh-key-values`).

## Common Mistakes

- **Forgetting to specify an administrative auth method:** Running `az vm create` without providing either `--admin-password` or `--ssh-key-values`. **Why it's wrong:** Azure enforces strict OS security baselines; the provisioning request will fail instantly with a validation error requiring valid administrative credentials.
- **Assuming resource group creation is automatic across all scopes:** **Why it's wrong:** While `az vm create` can create a resource group if it doesn't exist, failing to specify a valid subscription context beforehand causes the API call to target the wrong subscription.
- **Exposing management ports to the public internet blindly:** **Why it's wrong:** Leaving default open NSG rules exposes servers to automated vulnerability scanners. Production architectures should restrict management ports to specific VPN CIDR blocks or Azure Bastion.

## Best Practices

- Always prefer SSH public keys (`--ssh-key-values`) over static passwords (`--admin-password`) when provisioning Linux virtual machines to adhere to zero-trust security principles.
- Apply comprehensive resource tags (e.g., `--tags Environment=Production CostCenter=Engineering`) during creation to maintain proper Azure governance and cost allocation.
- Whenever possible, deploy virtual machines into private subnets behind Azure Load Balancers or Application Gateways rather than assigning direct public IP addresses.

## Interview Questions

**Q:** Why is `az vm create` classified as a composite or orchestrator command within the Azure CLI architecture?
**A:** Unlike low-level commands that map to a single Azure REST API operation, `az vm create` automatically orchestrates a dependency chain across multiple Azure resource providers behind the scenes. It evaluates your arguments and sequentially provisions a Resource Group, Virtual Network, Subnet, Network Security Group, Public IP, Network Interface Card, and Managed Disk before finally instantiating the Virtual Machine resource itself.

**Q:** What security vulnerability is frequently introduced by default when running `az vm create` with a public IP address on a Linux machine?
**A:** By default, `az vm create` automatically provisions a Network Security Group (NSG) rule opening inbound TCP port 22 (SSH) from any IP address (`0.0.0.0/0`) to the public internet. If the virtual machine is configured with a weak administrative password or exposed key, automated internet bots can instantly attempt brute-force authentication.

**Q:** How does Azure handle operating system image specification when using the `--image` flag in `az vm create`?
**A:** The `--image` flag accepts either a convenient shorthand URN (Uniform Resource Name) such as `Ubuntu2204` or `Win2022Datacenter` (which maps to predefined Microsoft publisher, offer, SKU, and version strings) or an explicit custom image ID derived from a specialized Managed Image or shared gallery version.

## Practice Problems

**Problem:** Provision an Ubuntu 22.04 virtual machine named `webServer01` inside an existing resource group `rg-production`, setting the admin username to `azureuser` and automatically generating local SSH keys for secure access.
**Hint:** Combine the resource group, name, image, admin username, and automatic SSH key generation flags.
**Solution:** `az vm create --resource-group rg-production --name webServer01 --image Ubuntu2204 --admin-username azureuser --generate-ssh-keys` (This orchestrates the creation of the VM and supporting network components while establishing secure key-based access).

**Problem:** Deploy a Windows Server 2022 virtual machine named `winCore01` in resource group `rg-core` using the `Standard_D2s_v3` size and setting the administrative password explicitly.
**Hint:** Combine the resource group, name, image, size, and admin password flags.
**Solution:** `az vm create -g rg-core -n winCore01 --image Win2022Datacenter --size Standard_D2s_v3 --admin-password 'SecureWindows!2026'` (This provisions a heavy-compute Windows server with custom sizing and explicit administrative credentials).

## References

- [Azure CLI Command Reference - az vm create](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest#az-vm-create)
- [Microsoft Learn: Create a Linux virtual machine with the Azure CLI](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-cli)
