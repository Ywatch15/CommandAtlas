---
slug: terraform-init
name: terraform init
aliases: []
category: devops-utilities
tags:
  - terraform
  - infrastructure-as-code
  - iac
  - initialization
  - providers
  - backend
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
  - initialize terraform working directory
  - download terraform providers
  - setup terraform backend
  - install terraform modules
  - prepare terraform project
relatedCommands: [terraform-plan, terraform-apply]
alternatives: []
status: published
---

## What is it?

`terraform init` is the foundational command executed in a new or cloned Terraform working directory. It initializes the local environment by reading the `.tf` configuration files, downloading the required provider binaries (e.g., AWS, Azure, GCP) from the Terraform Registry, resolving external modules, and establishing the connection to the configured state backend.

## Why does it exist?

Terraform's architecture heavily decouples its core engine from provider-specific logic and remote state storage. Distributing a Terraform codebase should not require checking in hundreds of megabytes of provider binaries or state configurations. `terraform init` exists to bridge this gap, acting as a package manager and bootstrapping agent. It ensures that the execution environment is identical across developer laptops and CI/CD runners by resolving strict versions defined in the lock file (`.terraform.lock.hcl`) and securely connecting to shared state storage.

## Syntax

```bash
terraform init [options]
```

## Flags

| Flag                         | Description                                                                                                                                                   | Example                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `-upgrade`                   | Ignores the `.terraform.lock.hcl` file and forces the download of the newest provider versions that satisfy the version constraints in the configuration.     | `terraform init -upgrade`                    |
| `-reconfigure`               | Reconfigures the backend, ignoring any previously saved configuration. Prevents Terraform from attempting to migrate state from the old backend.              | `terraform init -reconfigure`                |
| `-migrate-state`             | Safely copies the existing state data to a newly defined backend configuration, prompting for confirmation before execution.                                  | `terraform init -migrate-state`              |
| `-backend-config=<path/val>` | Dynamically injects backend configuration parameters (like storage keys or access tokens) that are omitted from the main codebase for security.               | `terraform init -backend-config=prod.hcl`    |
| `-get=false`                 | Skips the downloading and updating of external modules, saving time if only the backend or provider needs to be initialized.                                  | `terraform init -get=false`                  |
| `-plugin-dir=<path>`         | Skips querying the remote registry and exclusively uses provider binaries located in the specified local directory. Highly useful in air-gapped environments. | `terraform init -plugin-dir=/opt/tf-plugins` |

## Examples

```bash
terraform init
```

> The standard invocation. Parses all `.tf` files in the current directory, downloads missing providers into the hidden `.terraform/` directory, installs referenced modules, and initializes the local or remote state backend.

```bash
terraform init -upgrade
```

> Evaluates the `required_providers` block in the configuration and downloads the latest compatible versions, overwriting the hashes pinned in `.terraform.lock.hcl`.

```bash
terraform init -backend-config="bucket=my-terraform-state" -backend-config="key=prod/network.tfstate"
```

> Initializes an S3 (or compatible) remote backend using partial configuration. This allows a single Terraform codebase to be deployed across multiple environments by passing the environment-specific state file location at runtime.

```bash
terraform init -reconfigure
```

> Overwrites the local backend cache. This is necessary if you manually delete the remote state file or if you are deliberately switching backends and do not want Terraform to attempt a state migration, which would otherwise throw an error.

## Real-World Scenarios

**Bootstrapping a CI/CD Pipeline**

```bash
export TF_PLUGIN_CACHE_DIR="$WORKSPACE/.terraform.d/plugin-cache"
terraform init -backend-config=backend-prod.hcl -input=false
```

> In a Jenkins or GitLab pipeline, `terraform init` must run before any other command. Engineers inject dynamic backend configurations specific to the target environment and set `input=false` to guarantee the pipeline will fail rather than hang if interactive prompts are triggered. They also leverage a plugin cache directory to speed up initialization across multiple pipeline stages.

**Migrating from Local to Remote State**

```bash
# Add an 's3' backend block to your main.tf, then run:
terraform init -migrate-state
```

> When a team transitions from a single developer (local `terraform.tfstate`) to a collaborative team environment, they add a remote backend block. Running this command detects the local state, authenticates with the remote backend (e.g., AWS S3), and safely uploads the JSON state file to the cloud, locking it for collaborative use.

## When should it NOT be used?

- **Applying changes:** **Do not expect `init` to modify cloud infrastructure.** It strictly configures the local working directory. To provision resources, you must subsequently run `terraform plan` and `terraform apply`.
- **Syntax validation:** **Do not use `init` to check for code typos.** While it performs basic parsing to discover provider requirements, `terraform validate` is the dedicated command for strict syntax and structural validation.

## Alternatives

- **`terragrunt init`:** **Best for DRY backend management.** A popular wrapper tool that automatically generates backend configurations and executes `terraform init` across deeply nested, multi-environment repository structures.
- **`opentofu init`:** **Best for open-source purity.** The drop-in replacement for Terraform post-BSL license change. The `init` command behaves identically but defaults to querying the OpenTofu registry rather than HashiCorp's registry.

## How it works internally

When executed, `terraform init` parses the configuration files in the current working directory to build a dependency list of providers and modules.

For providers, it queries the Terraform Registry API (`registry.terraform.io` by default) to resolve the requested versions. It downloads the compiled Go binaries (packaged as `.zip` files) appropriate for the host OS and architecture (e.g., `linux_amd64`) and unpacks them into `.terraform/providers/`. It calculates the SHA256 checksums of these binaries and records them in `.terraform.lock.hcl` to guarantee supply chain integrity for future runs.

For the backend, Terraform executes the designated backend initialization routine (e.g., checking AWS credentials and verifying S3 bucket existence). If an existing `.terraform/terraform.tfstate` file points to a different backend, Terraform detects the drift and halts, demanding the user pass `-migrate-state` or `-reconfigure`.

## Performance Notes

- **Plugin Caching:** Downloading provider binaries (often 50-200MB each) on every CI run is painfully slow. By setting the `TF_PLUGIN_CACHE_DIR` environment variable, Terraform will symlink or hardlink binaries from a global cache folder rather than downloading them over the network.
- **Network Dependency:** Without `-plugin-dir`, `terraform init` requires outbound internet access to the Terraform Registry and GitHub (for modules). In strict corporate networks, this requires configuring an internal mirror registry.

## Security Notes

- **Lock File Integrity:** The `.terraform.lock.hcl` file contains cryptographic hashes of the provider binaries. It must be checked into version control. If an attacker compromises the upstream registry and replaces a provider binary with malware, `terraform init` will halt execution when the downloaded hash fails to match the lock file.
- **Backend Credential Exposure:** Running `init` against a remote backend requires valid cloud credentials (e.g., `AWS_ACCESS_KEY_ID`). Ensure these credentials have strict least-privilege access limited only to the S3 bucket or DynamoDB table used for state locking, not general infrastructure provisioning.

## Common Mistakes

- **Ignoring the Lock File**
  - _Mistake:_ Adding `.terraform.lock.hcl` to `.gitignore`.
  - _Why:_ Without the lock file, CI pipelines and other developers might dynamically download newer, breaking minor versions of providers during `terraform init`, causing unpredictable deployments.
- **Forgetting `init` after adding a module**
  - _Mistake:_ Adding a new `module {}` block to `main.tf` and immediately running `terraform plan`, resulting in an "unknown module" error.
  - _Why:_ Modules are not evaluated at runtime. You must run `terraform init` after adding any new provider or module so Terraform can physically download the source code into the `.terraform/` directory.

## Best Practices

- **Use Partial Backend Configuration:** Never hardcode environment-specific keys or secrets in the `backend {}` block. Keep the block empty except for the provider name, and pass variables during initialization: `terraform init -backend-config="config.s3.tfbackend"`.
- **Automate in CI/CD:** Ensure `terraform init -input=false` is the first command in every Terraform pipeline stage.

## Interview Questions

**Q: You just added a new AWS resource to your configuration. Do you need to run `terraform init` again before `terraform apply`?**
**A:** No. Adding a new _resource_ (e.g., `aws_instance`) does not require re-initialization. You only need to run `terraform init` if you add a new _provider_, add a new _module_, or change the _backend_ configuration.

**Q: What is the purpose of the `.terraform.lock.hcl` file generated by `terraform init`?**
**A:** It records the exact version and cryptographic SHA256 hashes of the provider binaries downloaded during initialization. It guarantees that subsequent runs on different machines download the exact same binaries, preventing unexpected behavior from upstream provider updates and protecting against supply-chain attacks.

## Practice Problems

**Problem:** You are deploying to a new environment and need to initialize Terraform, but you want to pass the backend configuration file `prod-backend.hcl` dynamically instead of hardcoding it. Write the command.
**Hint:** Use the flag designed for partial backend configuration.
**Solution:**

```bash
terraform init -backend-config=prod-backend.hcl
```

**Problem:** You manually deleted your remote state file in AWS S3 because you are starting over. When you run `terraform init`, it fails, complaining about a backend state mismatch. Write the command to force Terraform to forget the old state and configure the backend fresh.
**Hint:** Use the flag that tells Terraform to skip state migration and overwrite the local cache.
**Solution:**

```bash
terraform init -reconfigure
```

## References

- [Terraform CLI: terraform init](https://developer.hashicorp.com/terraform/cli/commands/init)
- [Backend Configuration](https://developer.hashicorp.com/terraform/language/settings/backends/configuration)
- [Dependency Lock File](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
