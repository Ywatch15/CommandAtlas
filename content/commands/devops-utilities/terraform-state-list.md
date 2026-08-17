---
slug: terraform-state-list
name: terraform state list
aliases: []
category: devops-utilities
tags:
  - terraform
  - infrastructure-as-code
  - iac
  - state
  - introspection
  - auditing
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
  - list resources in terraform state
  - show tracked terraform resources
  - get resource address terraform
  - view tfstate contents
  - find module addresses in state
relatedCommands: [terraform-plan]
alternatives: []
status: published
---

## What is it?

`terraform state list` is an introspection utility that reads the active `terraform.tfstate` file (local or remote) and outputs a simple, line-by-line inventory of every resource currently managed by the Terraform workspace. It prints the exact logical address (e.g., `module.vpc.aws_subnet.public[0]`) of each resource, providing the essential identifiers required for targeted operations like state manipulation, surgical planning, or importing unmanaged infrastructure.

## Why does it exist?

The `terraform.tfstate` file is a massive, deeply nested JSON document containing complete representations of cloud infrastructure, including metadata, dependencies, and sensitive attributes. Reading this raw JSON file natively is difficult for humans and prone to parsing errors. Furthermore, when using remote backends (like AWS S3 or HashiCorp Cloud), the file isn't even locally accessible. `terraform state list` exists to provide a clean, remote-aware, user-friendly abstraction layer. It securely connects to the backend, parses the complex JSON, and extracts a flat list of resource addresses, enabling developers to quickly audit the workspace inventory.

## Syntax

```bash
terraform state list [options] [address...]
```

## Flags

| Flag            | Description                                                                                                                                      | Example                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `[address]`     | (Positional) Filters the output to show only a specific module or resource, and any nested child resources within it.                            | `terraform state list module.database`         |
| `-id=<id>`      | Filters the results to show only the resource matching the specific physical cloud provider ID (e.g., an AWS instance ID).                       | `terraform state list -id=i-0abcd1234efgh5678` |
| `-state=<path>` | (Legacy) Forces Terraform to read from a specific local state file instead of the configured backend. Rarely used in modern remote-state setups. | `terraform state list -state=backup.tfstate`   |

## Examples

```bash
terraform state list
```

> The standard invocation. Connects to the configured backend, downloads the state representation to memory, and outputs a complete, alphabetical list of every resource currently managed by this specific Terraform configuration.

```bash
terraform state list module.vpc
```

> Filters the inventory to a specific module. Instead of displaying hundreds of resources, it outputs only the resources logically grouped inside the `module.vpc` block, such as `module.vpc.aws_vpc.main` and `module.vpc.aws_subnet.public`.

```bash
terraform state list 'aws_instance.web_servers[*]'
```

> Uses shell quoting to filter resources created dynamically using the `count` or `for_each` meta-arguments. It will output specific instances like `aws_instance.web_servers[0]` and `aws_instance.web_servers[1]`. _(Note: Single quotes are mandatory in bash to prevent the shell from attempting glob expansion)._

```bash
terraform state list | grep "s3_bucket"
```

> Because the output is a perfectly flat, newline-separated list of strings, it is highly compatible with standard Unix text-processing tools. This instantly filters the output to show only S3 buckets tracked in the workspace.

## Real-World Scenarios

**Preparing for State Manipulation (`state rm`)**

```bash
terraform state list | grep "legacy_db"
# Outputs: aws_db_instance.legacy_db
terraform state rm aws_db_instance.legacy_db
```

> When refactoring code, developers sometimes need to stop managing a resource without deleting the physical cloud asset. `state rm` requires an exact resource address. Engineers use `state list` to find the exact, syntax-perfect string (accounting for module nesting or index numbers) before executing the delicate removal operation.

**Auditing CI/CD Environment Scope**

```bash
terraform state list
```

> A new engineer inherits a massive, poorly documented Terraform repository. Instead of reading thousands of lines of `.tf` files to guess what infrastructure is actually deployed in production versus what is commented out, they run `terraform state list` against the production backend to get an absolute, undeniable inventory of live managed assets.

## When should it NOT be used?

- **Extracting physical cloud IDs or Attributes:** **Do not use `state list` to find IP addresses or ARNs.** `state list` only outputs the logical Terraform address (the name defined in the `.tf` file). To extract physical IDs, IP addresses, or tags, use `terraform state show <address>`.
- **Checking real-world cloud existence:** **Do not rely on this to prove a resource physically exists.** `state list` reads the `.tfstate` file, not the live cloud provider. If someone manually deleted a VM in the AWS Console an hour ago, `state list` will still output `aws_instance.vm` because the state file hasn't been refreshed yet.

## Alternatives

- **`terraform show`:** **Best for complete attribute visibility.** While `list` just prints the names, `show` dumps the human-readable representation of the entire state file, including all attribute values.
- **`cat terraform.tfstate | jq`:** **Best for local programmatic parsing.** If the state file is local, using `jq` allows for complex JSON querying (e.g., finding all resources created with a specific provider version) that the native CLI cannot do.

## How it works internally

`terraform state list` does not interact with your `.tf` configuration files, nor does it query cloud provider APIs (like AWS or Azure).

When executed, it communicates exclusively with the configured state backend (e.g., a local file, AWS S3, Terraform Cloud). It downloads the state snapshot (a JSON document) into local memory. It parses the JSON structure, specifically iterating over the `resources` array. For each resource object, it concatenates the `module` hierarchy, the `type` (e.g., `aws_instance`), the `name` (e.g., `web`), and any `instances` index keys (e.g., `[0]` or `["key"]`) to construct the absolute logical address string. It then sorts these strings alphabetically and prints them to `stdout`.

Because it performs zero network API calls to cloud providers, it does not require AWS/Azure API credentials to execute—it only requires authentication to the state backend (e.g., the S3 bucket itself).

## Performance Notes

- **Near-Instant Execution:** Because it only reads a single JSON file and performs no network `GET` requests to cloud providers, `terraform state list` is incredibly fast, returning results in milliseconds even for workspaces with thousands of resources.
- **Backend Latency:** The only latency incurred is the HTTP request to download the state file from a remote backend. If the S3 bucket or Terraform Cloud endpoint is experiencing high latency, the command will block until the download completes.

## Security Notes

- **Safe Introspection:** Unlike `terraform state pull` or `terraform show`, which expose sensitive attribute values (like database passwords or private keys) in plaintext to the terminal, `terraform state list` is generally safe to run. It only exposes resource types and logical names, not their underlying secrets.
- **Backend Access Required:** Even though it doesn't need cloud provisioning credentials, executing this command still requires `Read` permissions to the remote state backend (e.g., `s3:GetObject` on the state bucket).

## Common Mistakes

- **Shell Expansion on Array Indexes**
  - _Mistake:_ Running `terraform state list module.web.aws_instance.nodes[*]` without quotes.
  - _Why:_ The shell (bash/zsh) interprets the `*` as a globbing wildcard and attempts to search your local directory for matching filenames. The command fails confusingly. Always wrap addresses containing brackets in single quotes: `terraform state list 'module.web.aws_instance.nodes[*]'`.
- **Assuming the output represents the cloud**
  - _Mistake:_ Running `state list`, seeing `aws_s3_bucket.data`, and assuming the bucket is safe in AWS.
  - _Why:_ State drift. The state file only represents what Terraform _last knew_ about the infrastructure after the previous `apply`. If you need to ensure the state list is accurate to reality, you must run `terraform apply -refresh-only` first.

## Best Practices

- **Use for targeted plans/applies:** Combine this command with `-target`. Find the exact address using `terraform state list | grep network`, copy the output, and run `terraform plan -target="module.network.aws_vpc.main"`.
- **Use `-id` for reverse lookups:** If you find a rogue resource in the AWS Console (e.g., `sg-0abc123`) and want to know which Terraform workspace manages it, log into the workspace and run `terraform state list -id=sg-0abc123`. It will instantly return the logical name if it is tracked in that state.

## Interview Questions

**Q: You run `terraform state list` and see `aws_instance.web[0]` and `aws_instance.web[1]`. What Terraform meta-argument was used in the configuration to create these resources?**
**A:** The `count` meta-argument was used. Resources created with `count` are represented in the state file as a list, indexed by integers (e.g., `[0]`, `[1]`). If the `for_each` meta-argument had been used, the index would be a string key (e.g., `aws_instance.web["primary"]`).

**Q: Does `terraform state list` require valid cloud provider API credentials (like AWS Access Keys) to execute successfully?**
**A:** No, it does not require cloud provider provisioning credentials because it does not query the cloud infrastructure APIs. It only requires read access credentials to the Terraform state backend (e.g., an AWS S3 bucket or an Azure Blob container where the `terraform.tfstate` file is stored).

## Practice Problems

**Problem:** You have a massive Terraform state file. You only want to see the list of resources that are physically deployed inside the `database` module. Write the command to filter the list to only this module.
**Hint:** Pass the module prefix as a positional argument.
**Solution:**

```bash
terraform state list module.database
```

**Problem:** You used a `for_each` loop to create multiple IAM users, resulting in addresses like `aws_iam_user.team["alice"]` and `aws_iam_user.team["bob"]`. Write the command to list all instances of this specific `aws_iam_user.team` resource block, ensuring your shell doesn't misinterpret the syntax.
**Hint:** Use the wildcard bracket syntax wrapped in single quotes to protect it from bash globbing.
**Solution:**

```bash
terraform state list 'aws_iam_user.team[*]'
```

## References

- [Terraform CLI: terraform state list](https://developer.hashicorp.com/terraform/cli/commands/state/list)
- [Manipulating Terraform State](https://developer.hashicorp.com/terraform/cli/state)
- [Resource Addressing in Terraform](https://developer.hashicorp.com/terraform/cli/state/resource-addressing)
