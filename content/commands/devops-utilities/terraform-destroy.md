---
slug: terraform-destroy
name: terraform destroy
aliases: []
category: devops-utilities
tags: [terraform, infrastructure-as-code, iac, teardown, deletion, state]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd]
intentPhrases:
  - 'delete all terraform resources'
  - 'tear down terraform infrastructure'
  - 'remove resources in tf state'
  - 'destroy specific terraform resource'
  - 'clean up terraform environment'
relatedCommands: [terraform-apply, terraform-plan]
alternatives: []
status: published
---

## What is it?

`terraform destroy` is a specialized execution command that dismantles and deletes all infrastructure resources currently managed by a Terraform workspace. It reads the `terraform.tfstate` file to identify the deployed assets, calculates a destruction plan that respects reverse-dependency order, and executes the necessary API calls to permanently remove the resources from the cloud provider.

## Why does it exist?

Cloud computing promotes the use of ephemeral, short-lived environments (such as dynamic preview environments for pull requests or temporary data science sandboxes). If an engineer spins up 50 interconnected resources, manually deleting them via the cloud console is tedious, error-prone, and often leaves behind costly orphaned resources (like unattached disks or elastic IPs). `terraform destroy` exists to provide a guaranteed, clean slate. It acts as an automated garbage collector that systematically unwinds the deployment, ensuring that companies stop paying for infrastructure the moment an experiment or temporary workload concludes.

## Syntax

```bash
terraform destroy [options]
```

_(Note: `terraform destroy` is technically an alias for `terraform apply -destroy`. Both commands share the same underlying logic.)_

## Flags

| Flag                  | Description                                                                                                                                     | Example                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `-auto-approve`       | Skips the interactive `yes/no` confirmation prompt. Highly dangerous if not used in automated, ephemeral pipelines.                             | `terraform destroy -auto-approve`              |
| `-target=<address>`   | Restricts the destruction process to a specific resource and any resources that depend on it, leaving the rest intact.                          | `terraform destroy -target=aws_s3_bucket.logs` |
| `-var="key=value"`    | Sets a variable dynamically. While variables rarely affect pure destruction, provider blocks might require them to authenticate.                | `terraform destroy -var="region=us-east-1"`    |
| `-var-file=<path>`    | Loads variables from a specified file. Necessary if your provider configuration relies on variables defined in a `.tfvars` file.                | `terraform destroy -var-file=test.tfvars`      |
| `-refresh=false`      | Skips polling the cloud API to check if resources still exist before attempting to delete them. Speeds up the command but may cause API errors. | `terraform destroy -refresh=false`             |
| `-parallelism=<n>`    | Limits the number of concurrent cloud API deletion operations. Defaults to 10.                                                                  | `terraform destroy -parallelism=5`             |
| `-lock-timeout=<dur>` | Instructs Terraform to retry acquiring the state lock for a specified duration before failing.                                                  | `terraform destroy -lock-timeout=1m`           |

## Examples

```bash
terraform destroy
```

> The standard interactive invocation. Terraform assesses the current state, prints a list of every resource marked for deletion (represented by a red `-` symbol), and explicitly prompts the user to type `yes` before initiating the destructive API calls.

```bash
terraform destroy -auto-approve
```

> Blindly executes the destruction of all tracked infrastructure. This is exclusively used in CI/CD pipeline cleanup stages (e.g., executing when a pull request is closed) to instantly tear down the ephemeral preview environment.

```bash
terraform destroy -target="module.database"
```

> Performs a surgical strike. It calculates a destruction plan exclusively for the resources defined within the `database` module. Importantly, it will also destroy any downstream resources outside the module that explicitly depend on the database.

```bash
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
```

> The production-safe method of destruction. Just like standard provisioning, this generates a deterministic binary plan of the destruction process for human review, and then executes that exact plan, eliminating race conditions.

## Real-World Scenarios

**Pull Request Preview Teardowns**

```bash
# Executed by a GitHub Action when a PR is merged or closed
terraform init -backend-config="key=pr-${PR_NUMBER}.tfstate"
terraform destroy -auto-approve
```

> To accelerate development, platform teams dynamically provision a full stack of infrastructure for every Pull Request. To manage costs, the CI/CD system intercepts the "PR Closed" webhook event, initializes the specific backend state for that PR, and runs `terraform destroy -auto-approve` to cleanly wipe the slate.

**Decommissioning Legacy Environments**

```bash
terraform destroy
# ... wait for completion ...
aws s3 rm s3://company-tf-state/legacy-app.tfstate
```

> When an entire project reaches End-of-Life, engineers use `terraform destroy` to reliably delete the massive web of associated cloud resources. Once Terraform confirms the infrastructure is gone, the engineer manually deletes the backing `.tfstate` file from the remote backend, finalizing the decommissioning.

## When should it NOT be used?

- **To remove a single resource from code:** **Do not use `destroy` to remove a resource you no longer want.** If you no longer need `aws_instance.test`, simply delete the resource block from your `.tf` file and run `terraform apply`. Terraform will automatically detect the missing resource and destroy it. Using `terraform destroy -target` is an anti-pattern for this.
- **To untrack a resource:** **Do not use `destroy` if you want to keep the cloud resource but stop managing it with Terraform.** `destroy` deletes the physical cloud asset. If you want to keep the database but let another team manage it, use `terraform state rm <address>`.
- **Production environments:** **Generally avoid running `destroy` against primary production workspaces.** Production workspaces should rarely be completely wiped. Rely on incremental `terraform apply` commands to mutate the state safely over time.

## Alternatives

- **`terraform apply -destroy`:** **An exact equivalent.** `terraform destroy` is quite literally just an alias for this command under the hood.
- **`terraform state rm`:** **Best for state manipulation.** Removes the resource from Terraform's tracking file _without_ calling the cloud provider's deletion APIs.

## How it works internally

When `terraform destroy` is invoked, it reads the remote `terraform.tfstate` file to understand what resources currently exist. It parses the `.tf` configuration files purely to understand provider configurations and variable requirements (so it can authenticate).

Terraform then constructs an inverted Directed Acyclic Graph (DAG) based on the dependencies stored in the state. While `terraform apply` creates a VPC, then a Subnet, then a VM; `terraform destroy` flips this logic. It identifies that the VM depends on the Subnet, so it must issue the `DELETE` API call for the VM first.

It executes these deletions in parallel up to the `-parallelism` limit. If the cloud provider API rejects a deletion (e.g., trying to delete an S3 bucket that isn't empty), Terraform flags the resource as failed and halts the destruction of any resources that depend on it.

As resources are successfully deleted, Terraform systematically strips their JSON blocks from the in-memory state. Upon completion (or failure), it writes the updated, minimized state back to the remote backend, ensuring that any resources that failed to delete remain tracked for a future attempt.

## Performance Notes

- **Provider Deletion Latency:** Deleting resources is often slower than creating them. Destroying an AWS RDS database, deleting a VPC with attached ENIs, or purging an AKS cluster can take 10 to 30 minutes of blocking API polling.
- **Non-Empty Buckets:** The most common bottleneck/failure in `terraform destroy` is cloud storage. Most cloud APIs refuse to delete storage buckets (S3, GCS) if they contain objects. Unless the resource was configured with `force_destroy = true`, Terraform will fail, requiring manual intervention to empty the bucket before re-running the command.

## Security Notes

- **Lifecycle Protections:** To prevent catastrophic human error, mission-critical resources (like production databases or KMS keys) should always include the `lifecycle { prevent_destroy = true }` block in their `.tf` configuration. If `terraform destroy` encounters a resource with this flag, it instantly aborts the execution before deleting anything.
- **Cascading Deletions via Target:** If you use `terraform destroy -target=aws_vpc.main`, Terraform will not just delete the VPC. It will calculate the dependency graph and actively destroy _every single resource_ deployed inside that VPC, as their existence depends on the VPC. Use `-target` with extreme caution.

## Common Mistakes

- **Using `-target` instead of removing code**
  - _Mistake:_ Wanting to remove a cache server, so running `terraform destroy -target=aws_elasticache_cluster.cache`, leaving the code block in `main.tf`.
  - _Why:_ The next time someone runs `terraform apply`, Terraform will see the cache block in the code, notice it is missing from the state, and immediately recreate it. Always delete the code and run `apply` instead.
- **Destroying without refreshing variables**
  - _Mistake:_ Running `terraform destroy` but omitting the `-var-file=prod.tfvars` flag because "I'm just deleting things, I don't need variables."
  - _Why:_ The `provider` block (which handles authentication) often relies on variables (e.g., `region = var.aws_region`). Without the variables, Terraform cannot authenticate to the cloud provider to issue the delete commands.

## Best Practices

- **Use `force_destroy` Strategically:** For ephemeral environments, aggressively set `force_destroy = true` on S3 buckets and Azure Storage Accounts in your Terraform code. This allows `terraform destroy` to execute flawlessly without human intervention.
- **Verify State After Failure:** If a destroy times out or hits an API error, run `terraform state list`. This verifies exactly which resources survived the destruction attempt, allowing you to manually investigate the cloud console before retrying.

## Interview Questions

**Q: You want to stop managing a virtual machine with Terraform, but you absolutely want to keep the virtual machine running in AWS. Should you use `terraform destroy`?**
**A:** No. `terraform destroy` will issue a `DELETE` API call to AWS and physically terminate the virtual machine. To stop managing the resource while keeping it alive in the cloud, you must use `terraform state rm <resource_address>`, which simply deletes the tracking metadata from the `.tfstate` file.

**Q: In what order does `terraform destroy` delete resources compared to how they were created?**
**A:** `terraform destroy` reverses the dependency graph (DAG) used during creation. It deletes resources in the exact opposite order. It identifies leaves on the graph (resources that nothing else depends on) and deletes those first, working its way backward up to the foundational resources (like a VPC) to ensure no dependency violations occur during API calls.

## Practice Problems

**Problem:** You are writing an automated cleanup script for a sandbox environment. You need the script to completely wipe out all Terraform-managed resources instantly, without pausing to ask the user to type "yes".
**Hint:** Use the flag that bypasses the interactive confirmation prompt.
**Solution:**

```bash
terraform destroy -auto-approve
```

**Problem:** You are terrified of making a mistake. You want to generate a dry-run plan of exactly what `terraform destroy` will do and save it to a file named `teardown.tfplan`, so you can review it before executing it with `terraform apply`. Write the command to generate this destruction plan.
**Hint:** You actually need to use the `plan` command with a specific flag for this workflow.
**Solution:**

```bash
terraform plan -destroy -out=teardown.tfplan
```

## References

- [Terraform CLI: terraform destroy](https://developer.hashicorp.com/terraform/cli/commands/destroy)
- [The Lifecycle Meta-Argument (prevent_destroy)](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Terraform State Manipulation](https://developer.hashicorp.com/terraform/cli/state/rm)
