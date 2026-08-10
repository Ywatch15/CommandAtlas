---
slug: terraform-plan
name: terraform plan
aliases: []
category: devops-utilities
tags: [terraform, infrastructure-as-code, iac, execution-plan, diff, dry-run]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd]
intentPhrases:
  - 'preview terraform changes'
  - 'create execution plan terraform'
  - 'terraform dry run'
  - 'compare terraform state to config'
  - 'generate tf plan'
relatedCommands: [terraform-apply, terraform-init, terraform-destroy, terraform-state-list]
alternatives: []
status: published
---

## What is it?

`terraform plan` is an analytical command that creates an execution plan. It refreshes the current state of remote infrastructure, compares that state to the desired state defined in the local `.tf` configuration files, and computes the exact set of API actions (creates, updates, deletes) required to reconcile the two. It outputs a highly detailed, human-readable diff representing the pending infrastructure modifications without actually applying them.

## Why does it exist?

Cloud infrastructure changes carry catastrophic risks, such as accidental database deletions or firewall misconfigurations. `terraform plan` exists as a mandatory safety mechanism. It decouples the calculation of infrastructure drift from the execution of cloud API mutations, providing an explicit "dry run." By outputting the plan to a binary file, it guarantees that exactly what was reviewed and approved during a Pull Request is mathematically identical to what will be executed during deployment, preventing race conditions or concurrent state alterations.

## Syntax

```bash
terraform plan [options]
```

## Flags

| Flag                 | Description                                                                                                                                    | Example                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `-out=<path>`        | Saves the generated execution plan to a binary file. This file can be passed to `terraform apply` to guarantee deterministic execution.        | `terraform plan -out=tfplan.binary`            |
| `-var="key=value"`   | Sets a specific Terraform variable dynamically from the command line, overriding default values.                                               | `terraform plan -var="instance_type=t3.large"` |
| `-var-file=<path>`   | Loads variables from a specified file (typically `.tfvars` or JSON), essential for environment-specific configurations.                        | `terraform plan -var-file=prod.tfvars`         |
| `-target=<address>`  | Forces Terraform to focus solely on planning changes for a specific resource (and its dependencies), ignoring all other configuration.         | `terraform plan -target=aws_s3_bucket.data`    |
| `-destroy`           | Generates a plan detailing the deletion of all resources currently managed by the state file.                                                  | `terraform plan -destroy`                      |
| `-refresh-only`      | Generates a plan strictly to update the state file with drift detected in the real-world infrastructure, proposing zero configuration changes. | `terraform plan -refresh-only`                 |
| `-refresh=false`     | Disables the pre-plan state refresh API calls. Drastically speeds up execution but plans against potentially stale local state data.           | `terraform plan -refresh=false`                |
| `-detailed-exitcode` | Returns specific exit codes: `0` (success with empty diff), `1` (error), `2` (success with non-empty diff). Crucial for CI/CD scripting.       | `terraform plan -detailed-exitcode`            |

## Examples

```bash
terraform plan
```

> The standard invocation. Refreshes the state, calculates the diff against the local configuration, and streams a color-coded output to the terminal showing resources prefixed with `+` (create), `-` (destroy), `~` (update), or `-/+` (replace).

```bash
terraform plan -out=tfplan
```

> Evaluates the changes and writes the execution graph into a local binary file named `tfplan`. This is the most critical pattern in production environments to ensure the plan reviewed is exactly the plan applied.

```bash
terraform plan -var-file="production.tfvars" -detailed-exitcode
```

> Analyzes the configuration using production variables and alters the shell exit behavior. If the infrastructure perfectly matches the code, it exits with `0`. If changes are pending, it exits with `2`, allowing a bash script to conditionally trigger a notification.

```bash
terraform plan -target="module.networking.aws_vpc.main"
```

> Narrowly scopes the execution graph. Terraform evaluates _only_ the `aws_vpc.main` resource inside the `networking` module and any upstream resources it explicitly depends on. Useful for surgical updates in monolithic workspaces.

## Real-World Scenarios

**Pull Request Automation (GitOps)**

```bash
terraform plan -out=pr-123.tfplan -no-color > plan_output.txt
# A script then parses plan_output.txt and posts it as a GitHub comment
```

> In GitOps workflows, an automated CI runner triggers `terraform plan` whenever a pull request is opened. It strips the ANSI color codes and posts the raw diff as a comment on the PR. Reviewers examine this output to ensure the code changes result in the expected infrastructure modifications before merging to `main`.

**Drift Detection and Reconciliation**

```bash
terraform plan -refresh-only -out=drift.tfplan
terraform apply drift.tfplan
```

> A rogue administrator manually modifies a security group in the AWS Console. The Terraform state is now out of sync. An engineer runs `terraform plan -refresh-only`. Terraform detects the manual change and proposes an update purely to synchronize the `.tfstate` file with reality, allowing the engineer to safely reconcile the state without altering infrastructure.

## When should it NOT be used?

- **Resource Imports:** **Do not use `plan` to bring existing resources under Terraform management.** `terraform plan` only evaluates what is already in state against what is in the code. To adopt unmanaged resources, you must use `terraform import` or the `import {}` block first.
- **Checking syntax:** **Do not rely on `plan` for basic linting.** While `plan` will fail on syntax errors, it requires network calls and API authentication. Use `terraform validate` and `terraform fmt -check` for rapid, offline syntax verification.

## Alternatives

- **`infracost`:** **Best for cloud pricing estimation.** While `terraform plan` shows _what_ will change, `infracost` parses the plan to show exactly how much those changes will _cost_ on your monthly cloud bill.
- **`tfsec` / `checkov`:** **Best for security analysis.** These tools parse the Terraform code or the generated plan file to detect security misconfigurations (e.g., open security groups) before deployment.

## How it works internally

When you execute `terraform plan`, Terraform performs a complex sequence of graph computations.

First, it acquires a state lock on the remote backend (e.g., via a DynamoDB table) to prevent concurrent operations. It then executes the **Refresh** phase. Terraform queries the cloud provider's APIs (AWS, GCP, etc.) for every resource tracked in the existing `terraform.tfstate` file, updating its internal memory with the true, real-world attributes of those resources.

Next, it parses your `.tf` configuration files and constructs a Directed Acyclic Graph (DAG) representing the desired state and the dependencies between resources (e.g., a subnet must exist before a VM).

Terraform then compares the refreshed state against the desired DAG. It utilizes the provider schemas to determine if a change to a specific attribute requires an in-place update (e.g., changing a tag) or a destructive replacement (e.g., changing an AWS EC2 AMI). It computes the delta, generates the human-readable string representation, and if the `-out` flag is provided, serializes the exact execution DAG and state snapshot into the binary plan file. Finally, it releases the state lock.

## Performance Notes

- **API Rate Limiting:** The refresh phase issues parallel `GET` requests to cloud APIs for every resource in the state. For workspaces with thousands of resources, this can trigger provider rate limits (HTTP 429) or take several minutes.
- **Disabling Refresh:** Using `terraform plan -refresh=false` completely skips the API queries, relying solely on the cached `.tfstate` file. This resolves the command instantly but is dangerous if manual drift has occurred since the last apply.

## Security Notes

- **Sensitive Data in Plans:** The terminal output and the binary `tfplan` file inherently contain plaintext values of all variables and outputs, including database passwords and API keys, unless they are explicitly marked with `sensitive = true` in the configuration. Treat the `tfplan` file as a highly secure artifact.
- **Execution Privileges:** Running a plan requires identical cloud provider credentials as running an apply, because the refresh phase requires `Read` access to all underlying cloud resources.

## Common Mistakes

- **Ignoring Replacements (`-/+`)**
  - _Mistake:_ Skimming a plan output, seeing it's mostly green, and missing the `-/+` symbol next to an RDS database.
  - _Why:_ The `-/+` symbol means "Destroy and then Create replacement." If ignored, running apply will permanently delete the database and provision a blank one, causing catastrophic data loss.
- **Not using `-out` in CI/CD**
  - _Mistake:_ Running `terraform plan` in step 1 of a pipeline, and `terraform apply -auto-approve` in step 2.
  - _Why:_ Between step 1 and step 2, the cloud state might change, or a developer might merge new code. Step 2 will calculate a completely new plan and apply it blindly. Always pass the saved binary plan (`terraform apply tfplan`) to guarantee deterministic execution.

## Best Practices

- **Review `~` vs `-/+` Carefully:** Understand the provider's logic. An in-place update (`~`) is usually safe. A replacement (`-/+`) is destructive.
- **Utilize `-detailed-exitcode` in Automation:** Use this flag in CI/CD scripts to programmatically halt pipelines if changes are detected on a branch that shouldn't be mutating infrastructure.
- **Targeting is a code smell:** Relying frequently on `-target` indicates your Terraform workspace is too monolithic. Break the state down into smaller, decoupled workspaces instead of fighting massive execution graphs.

## Interview Questions

**Q: You notice the symbol `-/+` next to a resource in the `terraform plan` output. What does this mean, and why does Terraform decide to do this?**
**A:** The `-/+` symbol indicates a "force replacement" (destroy and recreate). Terraform does this when the configuration modifies a resource attribute that the underlying cloud provider API defines as immutable. Because the cloud provider cannot update the attribute in place, Terraform must delete the existing resource and provision a new one.

**Q: Explain why `terraform plan -out=tfplan` is considered a mandatory practice in production deployment pipelines.**
**A:** Running `terraform plan` without saving it creates a race condition. If you run a naked `terraform apply` immediately afterward, Terraform re-evaluates the state and builds a new plan. In a collaborative environment, someone else could have mutated the cloud state in the interim. Passing the explicit binary plan file to `apply` guarantees that exactly what was reviewed in the plan is executed, ensuring deterministic deployments.

## Practice Problems

**Problem:** You are writing a deployment script and want `terraform plan` to halt the script and return an error exit code if it detects that any infrastructure changes are pending.
**Hint:** Use the flag that alters the exit codes to be distinct for diffs.
**Solution:**

```bash
terraform plan -detailed-exitcode
```

**Problem:** You have a massive workspace. You only modified the configuration for a specific storage bucket named `aws_s3_bucket.assets`. Write the command to generate a plan exclusively for this bucket to save time.
**Hint:** Use the flag designed to restrict the execution graph.
**Solution:**

```bash
terraform plan -target="aws_s3_bucket.assets"
```

## References

- [Terraform CLI: terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform Resource Drift](https://developer.hashicorp.com/terraform/tutorials/state/resource-drift)
- [Sensitive Data in State](https://developer.hashicorp.com/terraform/language/state/sensitive-data)
