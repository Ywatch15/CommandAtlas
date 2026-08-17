---
slug: packer
name: packer
aliases: []
category: devops-utilities
tags:
  - images
  - infrastructure-as-code
  - vm
  - build
  - provisioning
  - hashicorp
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
intentPhrases:
  - build machine image
  - create aws ami automatically
  - bake golden image
  - provision vm template
  - build multiple vm images at once
relatedCommands: [vagrant, ansible]
alternatives: []
status: published
---

## What is it?

Packer is an open-source, command-line tool developed by HashiCorp used to create identical, pre-configured machine images (like AWS AMIs, Azure VHDs, VMware VMDKs, or Docker images) for multiple platforms from a single source configuration. It adopts an Infrastructure as Code (IaC) methodology, allowing teams to automate the otherwise manual, slow process of "baking" base virtual machine templates.

## Why does it exist?

Before Packer, creating a standardized "Golden Image" (a highly secure, pre-configured base operating system) required administrators to manually spin up a VM, SSH into it, run updates, install software, click "Create Image" in the cloud console, and then meticulously document the process. This was slow, untrackable, and prone to human error. Packer exists to automate this exact lifecycle. It parses declarative configuration files (HCL2 or JSON), temporarily spins up the target infrastructure, runs provisioning scripts (like Ansible or bash), snapshots the disk into a persistent image artifact, and tears the temporary infrastructure down, guaranteeing fully auditable and repeatable image builds.

## Syntax

```bash
packer <subcommand> [options] [template.pkr.hcl]
```

## Flags

| Flag / Subcommand | Description                                                                                                                                      | Example                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `init`            | Downloads and installs required Packer plugins (like the AWS or Azure builder plugins) defined in the `packer {}` block.                         | `packer init config.pkr.hcl`                |
| `build`           | The primary execution command. Orchestrates the creation of temporary infrastructure, provisioning, and image generation.                        | `packer build template.pkr.hcl`             |
| `validate`        | Checks the syntax and configuration of the template file offline, ensuring it is structurally sound before attempting a build.                   | `packer validate template.pkr.hcl`          |
| `fmt`             | Rewrites the HCL2 configuration files to canonical format and style conventions (similar to `terraform fmt`).                                    | `packer fmt .`                              |
| `inspect`         | Parses a template and outputs a summary of the builders, provisioners, and post-processors defined within it.                                    | `packer inspect template.pkr.hcl`           |
| `-var`            | (Flag for `build`) Dynamically overrides or injects a specific variable value into the build process from the command line.                      | `packer build -var "ami_name=prod-v1" .`    |
| `-var-file`       | (Flag for `build`) Injects multiple variables into the build process by loading them from an external file.                                      | `packer build -var-file=prod.pkrvars.hcl .` |
| `-force`          | (Flag for `build`) Forces a build to proceed even if an artifact with the exact same name already exists in the cloud, deleting the old one.     | `packer build -force config.pkr.hcl`        |
| `-debug`          | (Flag for `build`) Disables parallelization and prompts the user to press a key before executing every single provisioning step.                 | `packer build -debug .`                     |
| `-on-error=ask`   | (Flag for `build`) If a build step fails, pauses the execution and prompts the user to either clean up, retry, or abort, enabling SSH debugging. | `packer build -on-error=ask .`              |
| `-except`         | (Flag for `build`) Runs the build for all defined targets _except_ the ones specified. Useful for skipping long builds locally.                  | `packer build -except=amazon-ebs.ubuntu .`  |
| `-only`           | (Flag for `build`) Runs the build _only_ for the specified targets, ignoring others defined in the same template.                                | `packer build -only=azure-arm.web .`        |

## Examples

```bash
packer init .
```

> Bootstraps the local directory. Packer scans the `.pkr.hcl` files for required plugins (e.g., `hashicorp/amazon`) and downloads the compiled binaries needed to interact with those specific cloud APIs. This is a mandatory first step.

```bash
packer validate ubuntu-web.pkr.hcl
```

> Performs a dry-run check of the configuration file. It verifies that required variables are passed, JSON/HCL syntax is strictly correct, and block structures are valid, preventing instant failures when running the actual build.

```bash
packer build -var "build_version=1.0.4" .
```

> Initiates the image creation process for all builders defined in the current directory, dynamically injecting the `build_version` variable. Packer will spin up instances, run the defined shell scripts or Ansible playbooks, snapshot the images, and output the resulting AMI/VHD IDs to the terminal.

```bash
packer build -on-error=ask web-server.pkr.hcl
```

> Crucial for troubleshooting complex build failures. If an `apt-get` or Ansible task fails midway through the 10-minute build process, Packer pauses instead of immediately destroying the temporary VM. The engineer can SSH into the still-running temporary VM to investigate why the command failed.

```bash
packer build -only=amazon-ebs.ubuntu-2004 multi-cloud.pkr.hcl
```

> Highly useful in monolithic templates. If `multi-cloud.pkr.hcl` defines builders for AWS, Azure, and Google Cloud, this command restricts Packer to only execute the AWS (`amazon-ebs`) build, saving significant time during localized testing.

## Real-World Scenarios

**Baking Golden Images (Immutable Infrastructure)**

```bash
packer build -var-file=security.pkrvars.hcl golden-image.pkr.hcl
```

> A DevSecOps team uses Packer to build their foundational OS image. They define builders to launch a bare Ubuntu instance. Their provisioners invoke an Ansible playbook that aggressively hardens the OS (disabling root login, installing CrowdStrike/Datadog agents, enforcing CIS benchmarks). The resulting "Golden AMI" is the only image developers are allowed to use in subsequent Terraform deployments.

**Multi-Cloud Artifact Parity**

```bash
packer build all-clouds.pkr.hcl
```

> A SaaS company must deliver their software appliance to customers on AWS, Azure, and VMware. They write a single Packer template utilizing three different `source` builders, but sharing a single `build { provisioner {} }` block. Running this single command concurrently spins up an EC2 instance, an Azure VM, and a local VMware instance, runs the exact same installation script on all three, and outputs the distinct image IDs for each cloud.

## When should it NOT be used?

- **Standard Container Builds:** **Do not use Packer solely to build standard Docker containers.** While Packer has a Docker builder, the standard `docker build` (using a `Dockerfile`) or `buildah` is significantly faster, native, and offers better layer caching. Packer is only recommended for Docker if you are strictly maintaining identical parity between a VM and a Docker image from a single script.
- **Runtime Configuration Management:** **Do not use Packer to manage live servers.** Packer is strictly for _build time_ (creating immutable, static images). If you need to update software on a VM that is already running in production, use configuration management tools like Ansible, Chef, or Puppet.

## Alternatives

- **Cloud-Native Builders (AWS EC2 Image Builder / Azure Image Builder):** **Best for single-cloud, native integration.** Fully managed services that execute the image baking process on cloud provider hardware without requiring a local CI runner or HashiCorp language knowledge.
- **Docker `build`:** **Best for containerization.** Native container artifact building.
- **Manual Snapshots:** **Best for quick, one-off prototypes.** Manually installing software on an EC2 instance and clicking "Create Image" via the GUI. Highly discouraged for production systems due to lack of auditability.

## How it works internally

Packer is built in Go and utilizes a plugin-based Remote Procedure Call (RPC) architecture. The core Packer engine parses the HCL2 configuration files and manages parallel execution, but relies on external plugins to perform the actual heavy lifting.

An execution defines three core lifecycle phases:

1.  **Builders (`source` blocks):** Plugins responsible for interacting with the target hypervisor or cloud API. For AWS, the `amazon-ebs` builder creates a temporary SSH key, spins up an EC2 instance, attaches an EBS volume, and waits for the OS to boot and SSH/WinRM to become available.
2.  **Provisioners (`provisioner` blocks):** Once connected, these plugins modify the running system. They can transfer files, execute inline bash/PowerShell scripts, or run complex Ansible playbooks locally against the remote temporary instance.
3.  **Post-Processors (`post-processor` blocks):** After provisioning finishes, the builder stops the VM and issues the cloud API command to create an Image/Snapshot from the disk. Once the artifact exists, post-processors take over. They can tag the AMI, push a Docker image to a registry, or generate a `manifest.json` containing the resulting artifact IDs.

Finally, Packer meticulously cleans up the environment, deleting the temporary SSH keys, security groups, and instances it created, leaving behind only the finalized machine image.

## Performance Notes

- **Cloud API Bottlenecks:** Packer itself is incredibly fast, but the `build` process is heavily bottlenecked by the cloud provider. Booting an EC2 instance, running `apt-get update`, taking an EBS snapshot, and registering an AMI physically takes 5 to 15 minutes, regardless of CPU power.
- **Parallel Execution:** By default, if multiple `source` blocks are defined within a `build` block, Packer provisions them entirely in parallel. This drastically reduces the time required to build identical images across AWS, Azure, and GCP simultaneously.

## Security Notes

- **Credential Leakage in Images:** If a provisioner script uses API keys or passwords to download proprietary software, those secrets might accidentally be baked into the final image's `.bash_history` or temporary files. Always use a final shell provisioner to aggressively scrub history, temporary files, and logs before the snapshot occurs.
- **Build Environment Permissions:** The machine running `packer build` (e.g., your laptop or CI runner) must possess highly privileged cloud IAM credentials capable of creating instances, key pairs, security groups, and AMIs. Use tightly scoped IAM roles specifically for the Packer pipeline to minimize blast radius.

## Common Mistakes

- **Failing to wait for cloud-init/Sysprep**
  - _Mistake:_ Packer connects via SSH and instantly runs a provisioner that fails with a `dpkg lock` error or `apt-get` collision.
  - _Why:_ While SSH may be available, the underlying OS might still be running mandatory first-boot background tasks (like `cloud-init` on Linux or `Sysprep` on Windows). You must insert a shell provisioner that waits or sleeps (e.g., `cloud-init status --wait`) before attempting software installations.
- **Baking too much data**
  - _Mistake:_ Copying 50GB of application data or a massive database into the machine image during the Packer build.
  - _Why:_ Machine images should be lean application templates. Volatile application data should be mounted dynamically at runtime via external persistent disks (EBS) or pulled from object storage (S3). Massive images are slow to boot and expensive to store.

## Best Practices

- **Use HCP Packer or Manifests:** The final output of a Packer build is an ID (e.g., `ami-0abc123`). This ID must be handed off to Terraform for deployment. Always configure the `manifest` post-processor to output a structured JSON file containing these IDs, allowing CI/CD pipelines to seamlessly pass the variables downstream.
- **Adopt HCL2:** Migrate legacy JSON `.json` Packer templates to the modern HCL2 `.pkr.hcl` format. HCL2 provides functions, local variables, dynamic expressions, and better typing validation that raw JSON lacks.
- **Treat Infrastructure as Immutable:** Use Packer to bake the application code directly into the image. When a new application version is released, build a brand new image and perform a rolling deployment to replace the VMs, rather than SSHing into running VMs to pull new code.

## Interview Questions

**Q: Explain the difference between a "Builder" and a "Provisioner" in the context of HashiCorp Packer.**
**A:** A Builder is responsible for interacting with the infrastructure platform (AWS, VMware, Docker) to create a temporary machine, generate the final image artifact, and clean up temporary resources. A Provisioner executes commands _inside_ that temporary machine (e.g., via SSH/WinRM) to install software, configure settings, and prepare the OS before the builder takes the final snapshot.

**Q: A Packer build fails during the shell provisioner phase. Packer immediately deletes the temporary EC2 instance, making it impossible to investigate what went wrong. How can you alter the execution to troubleshoot the failure?**
**A:** You should execute the build command with the `-on-error=ask` flag (e.g., `packer build -on-error=ask template.pkr.hcl`). When the provisioner fails, Packer will pause execution and present a prompt, keeping the temporary EC2 instance running and allowing you to SSH into it to manually inspect logs and debug the failure before destroying the resources.

## Practice Problems

**Problem:** You are building an image using `ubuntu.pkr.hcl`. However, before running the hour-long build process, you want to perform a strict, offline check to ensure your HCL code syntax is perfectly valid and all required variables are present.
**Hint:** Use the subcommand designed for offline evaluation.
**Solution:**

```bash
packer validate ubuntu.pkr.hcl
```

**Problem:** You are testing a massive monolithic template that builds both an AWS AMI and a Docker image. To save time, you want to execute the build, but restrict Packer to _only_ execute the builder source named `amazon-ebs.ubuntu`.
**Hint:** Use the flag that explicitly scopes the build execution target.
**Solution:**

```bash
packer build -only=amazon-ebs.ubuntu template.pkr.hcl
```

## References

- [Packer CLI Documentation](https://developer.hashicorp.com/packer/cli)
- [Introduction to Packer (HashiCorp Learn)](https://developer.hashicorp.com/packer/tutorials/aws-get-started)
