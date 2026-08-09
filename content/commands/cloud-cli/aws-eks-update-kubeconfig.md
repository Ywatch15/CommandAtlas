---
slug: aws-eks-update-kubeconfig
name: aws eks update-kubeconfig
aliases: []
category: cloud-cli
tags: [aws, eks, kubernetes, kubeconfig, authentication, containers]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'connect to eks cluster'
  - 'generate kubeconfig for aws eks'
  - 'setup kubectl for eks'
  - 'authenticate kubectl to aws'
  - 'add eks cluster to local kubeconfig'
relatedCommands: [aws-sts-get-caller-identity]
alternatives: []
status: draft
---

## What is it?

`aws eks update-kubeconfig` is an AWS CLI command that constructs or modifies a local Kubernetes configuration file (`kubeconfig`) to enable communication between the `kubectl` client and an Amazon Elastic Kubernetes Service (EKS) cluster. It automatically fetches the cluster's API endpoint and cryptographic Certificate Authority (CA) payload from AWS, and configures the local file with a dynamic execution block (`exec`) that instructs `kubectl` to authenticate using AWS IAM credentials.

## Why does it exist?

Kubernetes natively authenticates requests using X.509 client certificates, OIDC tokens, or static bearer tokens. It does not inherently understand AWS Identity and Access Management (IAM). To bridge this gap, AWS developed a webhook system where `kubectl` generates a short-lived, pre-signed AWS Security Token Service (STS) URL and passes it to the EKS control plane as a bearer token. `aws eks update-kubeconfig` exists to completely automate the intricate local configuration required for this handshake, saving developers from manually editing complex YAML files to link API endpoints, base64-encoded CA certificates, and `exec` plugin arguments.

## Syntax

```bash
aws eks update-kubeconfig --name <cluster-name> [options]
```

## Flags

| Flag              | Description                                                                                                            | Example                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `--name`          | Required. The name of the target Amazon EKS cluster.                                                                   | `aws eks update-kubeconfig --name prod-cluster`                               |
| `--region`        | The AWS region where the cluster resides. If omitted, defaults to the AWS profile's region.                            | `aws eks update-kubeconfig --name prod-cluster --region us-east-1`            |
| `--kubeconfig`    | Specifies a custom path to the kubeconfig file to write/update. Defaults to `~/.kube/config`.                          | `aws eks update-kubeconfig --name cls --kubeconfig ~/.kube/custom-config`     |
| `--role-arn`      | Injects an IAM Role ARN into the kubeconfig `exec` block, forcing `kubectl` to assume this role before authenticating. | `aws eks update-kubeconfig --name cls --role-arn arn:aws:iam::111:role/Admin` |
| `--alias`         | Defines a custom name for the context created in the kubeconfig, rather than defaulting to the cluster's full ARN.     | `aws eks update-kubeconfig --name cls --alias my-cluster-context`             |
| `--user-alias`    | Defines a custom name for the user entry created in the kubeconfig, rather than defaulting to the cluster ARN.         | `aws eks update-kubeconfig --name cls --user-alias eks-admin-user`            |
| `--dry-run`       | Prints the generated kubeconfig YAML directly to standard output without modifying any files on disk.                  | `aws eks update-kubeconfig --name cls --dry-run`                              |
| `--profile`       | Uses a specific AWS CLI credential profile to make the `DescribeCluster` API call.                                     | `aws eks update-kubeconfig --name cls --profile dev-team`                     |
| `--endpoint-url`  | Overrides the default AWS EKS API endpoint (mostly used for testing with local emulators or VPC endpoints).            | `aws eks update-kubeconfig --name cls --endpoint-url https://custom.endpoint` |
| `--no-verify-ssl` | Disables TLS/SSL certificate validation for the AWS API call. Should only be used in proxy testing environments.       | `aws eks update-kubeconfig --name cls --no-verify-ssl`                        |
| `--debug`         | Enables verbose logging, printing detailed information about HTTP requests, retries, and file merging operations.      | `aws eks update-kubeconfig --name cls --debug`                                |

## Examples

```bash
aws eks update-kubeconfig --name my-cluster --region us-west-2
```

> Modifies the default `~/.kube/config` file to include the connection details for `my-cluster` in the `us-west-2` region, automatically setting the new cluster as your active `kubectl` context.

```bash
aws eks update-kubeconfig --name dev-cluster --kubeconfig ~/.kube/dev-config
```

> Writes the configuration to an isolated file rather than the global default. To use this configuration afterward, you must either set the environment variable `export KUBECONFIG=~/.kube/dev-config` or pass `--kubeconfig` to every `kubectl` command.

```bash
aws eks update-kubeconfig --name prod-cluster --alias prod
```

> Generates the configuration but overrides the default, verbose context name (which usually looks like `arn:aws:eks:us-east-1:123456789012:cluster/prod-cluster`) with the simple string `prod`. This allows you to quickly switch contexts later using `kubectl config use-context prod`.

```bash
aws eks update-kubeconfig --name finance-cluster --role-arn arn:aws:iam::999999999999:role/CrossAccountEKSAdmin
```

> Configures the `exec` plugin in the kubeconfig to automatically assume a specific IAM role prior to requesting the EKS token. This is crucial for cross-account architectures where the IAM user generating the config resides in an identity account, but the EKS cluster resides in a workload account.

```bash
aws eks update-kubeconfig --name my-cluster --dry-run > my-cluster.yaml
```

> Executes a dry run, preventing the CLI from modifying your local `.kube/config`. The generated YAML is redirected to standard output and captured into a standalone file.

## Real-World Scenarios

**CI/CD Pipeline Ephemeral Setup**

```bash
export KUBECONFIG=$PWD/kubeconfig
aws eks update-kubeconfig --name staging-cluster --region us-east-2
kubectl apply -f ./manifests/
```

> In automated deployment pipelines (like Jenkins, GitLab CI, or GitHub Actions), modifying the global `~/.kube/config` of the CI runner can cause race conditions or state pollution between parallel jobs. Engineers set an ephemeral `KUBECONFIG` path scoped to the workspace, run the update command to fetch the cluster endpoint, apply manifests, and let the runner destroy the ephemeral file upon completion.

**Multi-Tenant Cross-Account Access**

```bash
aws eks update-kubeconfig --name tenant-a-cluster --region eu-central-1 --role-arn arn:aws:iam::111111111111:role/K8sAdmin --alias tenant-a
aws eks update-kubeconfig --name tenant-b-cluster --region eu-west-1 --role-arn arn:aws:iam::222222222222:role/K8sAdmin --alias tenant-b
```

> A platform engineering team manages multiple EKS clusters deployed across isolated AWS accounts. They run consecutive `update-kubeconfig` commands, explicitly defining `--role-arn` to map their identity into the target accounts, and using `--alias` to create clean, human-readable context names. They can then hot-swap between environments using `kubectl config use-context tenant-a`.

**Auditing the Kubeconfig Payload**

```bash
aws eks update-kubeconfig --name suspect-cluster --dry-run | grep server
```

> Security engineers or administrators troubleshooting DNS resolution or VPC connectivity issues use the `--dry-run` flag to instantly extract the cluster's base64 Certificate Authority and the public/private HTTPS API endpoint string without committing the potentially broken configuration to their local state.

## When should it NOT be used?

- **Inside Pods running in the cluster:** **Do not use this command inside a Kubernetes pod.** Pods should communicate with the Kubernetes API using natively mounted ServiceAccount tokens located at `/var/run/secrets/kubernetes.io/serviceaccount`, not by generating local kubeconfigs via the AWS CLI.
- **Managing non-EKS clusters:** **Do not use this for kops, kubeadm, GKE, or AKS clusters.** This command relies on AWS-specific API calls (`DescribeCluster`) and configures an AWS-specific IAM authentication mechanism (`aws eks get-token`). It is entirely incompatible with non-EKS distributions.
- **Distributing kubeconfigs to teammates:** **Do not generate a kubeconfig and email it to a colleague.** The generated file relies on the IAM credentials residing in the executor's local environment. Sharing the file shares the endpoint and CA, but the recipient must still have their own AWS credentials configured and proper RBAC mapped in the cluster to authenticate successfully.

## Alternatives

- **Manual Kubeconfig Generation:** **Best for strict infrastructure-as-code environments.** You can use Terraform's `local_file` resource or bash templates to manually construct the YAML structure by querying the cluster endpoint and CA data, bypassing the AWS CLI entirely.
- **`aws-iam-authenticator`:** **Best for legacy environments.** The original, standalone Go binary required before the AWS CLI natively integrated the `get-token` command. While still supported, the AWS CLI integration is generally preferred to reduce toolchain bloat.

## How it works internally

When you execute `aws eks update-kubeconfig`, the AWS CLI authenticates to the AWS control plane using your local credentials and issues a `DescribeCluster` API call.

The EKS service returns a JSON payload containing the cluster's status, the API server endpoint (e.g., `https://<hash>.yl4.<region>.eks.amazonaws.com`), and the base64-encoded Certificate Authority data.

The CLI then parses the specified destination file (defaulting to `~/.kube/config`). It utilizes standard YAML parsing logic to safely merge three distinct blocks into the document without corrupting existing configurations:

1.  **Cluster:** Injects the endpoint URL and the decoded CA data.
2.  **User:** Configures an `exec` block. This block instructs `kubectl` to shell out to `aws eks get-token --cluster-name <name> --region <region>` whenever it needs a credential. If `--role-arn` was supplied, it is appended to the execution arguments.
3.  **Context:** Maps the newly created User to the newly created Cluster.

Finally, the CLI rewrites the YAML file to disk with strict permissions (typically `0600`) to protect the contents, and updates the `current-context` field to point to the newly generated context.

When you later run `kubectl get pods`, `kubectl` triggers the `exec` block. The `aws eks get-token` command runs silently, generating a pre-signed STS `GetCallerIdentity` URL. It returns this URL to `kubectl` formatted as a bearer token (`k8s-aws-v1.<base64-encoded-url>`), which `kubectl` sends to the EKS API server for authentication.

## Performance Notes

- **API Latency:** The command itself executes in under a second, but it synchronously blocks while waiting for the `DescribeCluster` REST API call to complete. High network latency or aggressive API throttling by AWS can delay the file generation.
- **File I/O Parsing:** For developers with massive, multi-megabyte kubeconfig files containing hundreds of contexts, the Python-based YAML parser used by the AWS CLI can exhibit minor CPU spikes when attempting to safely merge the new objects into the existing heavily-nested structure.

## Security Notes

- **File Permissions:** The generated `kubeconfig` contains sensitive infrastructure routing data and cryptographic authority payloads. The AWS CLI attempts to ensure the file is written with restrictive permissions (`0600`). Ensure no automated backup or sync tool inadvertently exposes this file to a wider network.
- **Credential Resolution Vulnerability:** The generated `kubeconfig` relies entirely on ambient AWS credentials. If a malicious actor can write an AWS profile or set environment variables in your terminal, `kubectl` will silently use those compromised credentials when executing the `aws eks get-token` background process.
- **Role Assumption Risks:** Using `--role-arn` writes the target role in plaintext into the kubeconfig. Ensure that the IAM credentials you hold actually possess the `sts:AssumeRole` permission for that target ARN, otherwise `kubectl` will silently fail authentication later during runtime.

## Common Mistakes

- **"Unauthorized" after a successful update**
  - _Mistake:_ The command succeeds, but `kubectl get pods` immediately returns `error: You must be logged in to the server (Unauthorized)`.
  - _Why:_ Generating a valid kubeconfig does _not_ grant you access inside the cluster. The AWS IAM identity used by `kubectl` must be explicitly mapped to a Kubernetes RBAC group in the `aws-auth` ConfigMap (or via EKS Access Entries), _unless_ it is the exact IAM identity that originally created the cluster (which gets permanent, hardcoded admin access).
- **Wrong Region Targeting**
  - _Mistake:_ Running `aws eks update-kubeconfig --name my-cluster` and receiving a `ResourceNotFoundException`.
  - _Why:_ The AWS CLI defaults to the region configured in your `~/.aws/config` file. If the cluster resides in `us-east-1` but your profile defaults to `us-west-2`, the API call fails. Always explicitly pass the `--region` flag.
- **Environment Variable Conflicts**
  - _Mistake:_ Exporting `KUBECONFIG=~/.kube/dev-config` and running the update command with `--kubeconfig ~/.kube/config`, then wondering why `kubectl` cannot find the cluster context.
  - _Why:_ `kubectl` strictly honors the `KUBECONFIG` environment variable over the default path. If your update command writes to a different file than what the environment variable points to, the tools lose synchronization.

## Best Practices

- **Use Aliases Generously:** EKS defaults to generating massive, unwieldy context names (`arn:aws:eks:region:account:cluster/name`). Always use `--alias <short-name>` to create semantic contexts (e.g., `prod-useast1`), preventing you from accidentally deploying to production due to context name confusion.
- **Isolate Kubeconfigs per Environment:** Avoid keeping a single monolithic `~/.kube/config` file containing dev, staging, and production clusters. Instead, maintain separate files and use tools like `direnv` or bash aliases to set the `KUBECONFIG` environment variable dynamically per project directory.
- **Explicit Role Mapping:** In enterprise environments, avoid authenticating to EKS using individual IAM User credentials. Instead, configure developers to assume specific IAM roles, and use the `--role-arn` flag when generating the kubeconfig. This tightly couples the Kubernetes authentication flow to the assumed role, making CloudTrail auditing vastly simpler.

## Interview Questions

**Q: You successfully ran `aws eks update-kubeconfig`, but when you run `kubectl get nodes`, you receive an "Unauthorized" error. What is the most likely architectural reason for this?**
**A:** `aws eks update-kubeconfig` only handles local client configuration; it does not configure server-side authorization. The IAM identity you are using to run `kubectl` is likely not mapped in the cluster's `aws-auth` ConfigMap (or EKS Access Entries), nor is it the IAM identity that originally created the cluster. EKS recognizes your identity, but Kubernetes RBAC rejects it.

**Q: Explain how `kubectl` actually authenticates to the EKS control plane using the file generated by this command.**
**A:** The generated kubeconfig contains an `exec` block tied to the user entry. When a `kubectl` command is executed, `kubectl` reads this block and spawns a background process running `aws eks get-token`. This command generates a pre-signed STS `GetCallerIdentity` URL, encodes it in base64, appends a `k8s-aws-v1.` prefix, and returns it to `kubectl` via standard output. `kubectl` then uses this string as an HTTP Bearer token against the EKS API server, which decodes it and verifies the identity against AWS STS.

**Q: Can `aws eks update-kubeconfig` merge a new cluster configuration into an existing `~/.kube/config` file that already contains configurations for GKE and local Minikube clusters?**
**A:** Yes. The command safely parses the existing YAML structure. It merges the new `cluster`, `user`, and `context` objects into the arrays of the existing file without destroying or altering the configurations for other providers.

## Practice Problems

**Problem:** You need to configure your local machine to connect to a cluster named `data-processing-prod` located in the `eu-central-1` region. You want the `kubectl` context to simply be named `data-prod` instead of the full ARN.
**Hint:** You need to specify the region explicitly and use the flag that overrides the default context naming scheme.
**Solution:**

```bash
aws eks update-kubeconfig --name data-processing-prod --region eu-central-1 --alias data-prod
```

**Problem:** You are writing an automated deployment script. You need to configure access to `staging-cluster` in `us-east-1`, but you must ensure that this configuration is written to a temporary file located at `./temp-kubeconfig` and does not alter your global configuration.
**Hint:** Use the flag that explicitly directs the command to write the output to a specific file path.
**Solution:**

```bash
aws eks update-kubeconfig --name staging-cluster --region us-east-1 --kubeconfig ./temp-kubeconfig
```

## References

- [AWS CLI Command Reference: eks update-kubeconfig](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/eks/update-kubeconfig.html)
- [Amazon EKS User Guide: Creating or updating a kubeconfig file](https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html)
- [Kubernetes Documentation: Authenticating with Exec Plugins](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#client-go-credential-plugins)
