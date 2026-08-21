---
slug: kubectl-config
name: kubectl config
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - configuration
  - context
  - authentication
  - kubeconfig
  - k8s
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
  - switch kubernetes cluster context
  - view current kubernetes configuration
  - set kubernetes credentials
  - change active namespace kubectl
  - manage kubeconfig files
relatedCommands: [kubectl-cluster-info]
alternatives: []
status: draft
---

## What is it?

`kubectl config` is a suite of subcommands used to manage, inspect, and modify `kubeconfig` files. These files store the crucial routing information (API server endpoints), authentication payloads (client certificates or bearer tokens), and logical context mappings required by `kubectl` to communicate securely with various Kubernetes clusters.

## Why does it exist?

Administrators rarely interact with only a single Kubernetes cluster. A standard workstation must interface with local development clusters (Minikube), staging environments, and multiple cloud-hosted production clusters (EKS, GKE). Hand-editing massive YAML configuration files to switch API endpoints and TLS certificates is dangerous and error-prone. `kubectl config` exists to provide a programmable, standardized CLI interface to safely mutate, merge, and switch between these complex authentication contexts dynamically.

## Syntax

```bash
kubectl config SUBCOMMAND [options]
```

## Flags

| Flag / Command           | Description                                                                           | Example                                                      |
| ------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `view`                   | Outputs the current merged kubeconfig settings to standard output.                    | `kubectl config view`                                        |
| `current-context`        | Prints the string name of the currently active cluster context.                       | `kubectl config current-context`                             |
| `get-contexts`           | Lists all defined contexts, displaying cluster names, users, and namespaces.          | `kubectl config get-contexts`                                |
| `use-context <name>`     | Switches the active configuration context to the specified name.                      | `kubectl config use-context prod-cluster`                    |
| `set-context <name>`     | Creates or modifies a context entry (linking a cluster, user, and namespace).         | `kubectl config set-context dev --namespace=testing`         |
| `set-cluster <name>`     | Sets or modifies a cluster entry (defining the API server URL and CA certs).          | `kubectl config set-cluster my-k8s --server=https://1.2.3.4` |
| `set-credentials <name>` | Sets or modifies user authentication credentials (tokens, certs, exec plugins).       | `kubectl config set-credentials admin --token=xyz`           |
| `delete-context <name>`  | Removes a specific context entry from the kubeconfig file.                            | `kubectl config delete-context old-cluster`                  |
| `--kubeconfig <path>`    | Targets a specific file path instead of relying on default environments.              | `kubectl config view --kubeconfig ./custom.conf`             |
| `--minify`               | (With `view`) Filters output to include _only_ data relevant to the current context.  | `kubectl config view --minify`                               |
| `--raw`                  | (With `view`) Outputs raw, unredacted certificate data and tokens (highly sensitive). | `kubectl config view --raw`                                  |

## Examples

```bash
kubectl config current-context
```

> This queries the active configuration file and prints exclusively the name of the context you are currently operating in, ensuring you know exactly which cluster will receive your commands.

```bash
kubectl config use-context arn:aws:eks:us-east-1:123:cluster/prod
```

> This modifies the local configuration file to alter the `current-context` pointer. All subsequent `kubectl` commands executed in the terminal will now be routed to the AWS EKS production cluster.

```bash
kubectl config set-context --current --namespace=kube-system
```

> This executes an in-place modification on the _currently active_ context, permanently shifting the default namespace for all future commands to `kube-system` so you no longer have to type `-n kube-system`.

```bash
kubectl config view --minify --raw
```

> This isolates the exact cluster and user configuration for the current active context (`--minify`) and strips away security redaction (`--raw`), dumping the actual base64-encoded client certificates and tokens to the terminal.

```bash
kubectl config get-contexts -o name
```

> This iterates over all known configuration contexts and prints strictly their string names, which is frequently used by bash completion scripts or fuzzy finders (like `fzf`) to populate interactive selection menus.

## Real-World Scenarios

**Secure Kubeconfig Merging for CI/CD**

```bash
KUBECONFIG=~/.kube/config:./new-cluster.yaml kubectl config view --flatten > ~/.kube/merged-config.yaml
```

> Systems engineers securely combine a newly generated cluster configuration file with their existing workstation configuration by leveraging the `KUBECONFIG` environment variable array and flattening the unified structure to disk.

**Scripted Authentication Bootstrap**

```bash
kubectl config set-cluster ci-cluster --server=[https://api.k8s.local](https://api.k8s.local) --certificate-authority=ca.crt
kubectl config set-credentials ci-user --token=$K8S_TOKEN
kubectl config set-context ci-context --cluster=ci-cluster --user=ci-user
kubectl config use-context ci-context
```

> Automated deployment runners (like GitLab CI) systematically construct a brand new `kubeconfig` file from scratch by piping in environment variables for the API endpoint, CA bundle, and ServiceAccount token, completely configuring routing without a pre-existing YAML file.

## When should it NOT be used?

- **Generating cloud-native authentication tokens:** **Reason:** `kubectl config` writes static strings. It cannot execute an OAuth flow against AWS IAM or Google Cloud Identity. **Use instead:** Cloud provider CLI wrappers (e.g., `aws eks update-kubeconfig` or `gcloud container clusters get-credentials`).
- **Interactive, high-frequency context switching:** **Reason:** Typing out long, complex context names multiple times an hour is highly inefficient and prone to typographical errors. **Use instead:** Third-party wrapper tools like `kubectx` and `kubens`.

## Alternatives

- **`kubectx` and `kubens`:** Interactive ecosystem wrappers. **Tradeoff:** These tools provide blistering fast, interactive terminal UI switching (via `fzf`) for contexts and namespaces, completely bypassing the verbose syntax of `kubectl config use-context`.
- **Cloud Provider CLIs:** (`aws eks`, `az aks`). **Tradeoff:** These automatically generate the complex ExecAuthenticator plugin configurations required for modern cloud IAM integration, a task that is exceedingly difficult to construct manually via `kubectl config set-credentials`.

## How it works internally

When `kubectl` executes, it evaluates its configuration source using a strict hierarchy:

1. The `--kubeconfig` command-line flag.
2. The `$KUBECONFIG` environment variable (which can contain a colon-separated list of multiple file paths).
3. The default fallback path at `~/.kube/config`.

A `kubeconfig` file is a YAML document containing three primary lists: `clusters` (API URLs and TLS certificate authorities), `users` (client certificates, tokens, or exec plugins), and `contexts` (the connective tissue linking one user to one cluster). Finally, it contains a `current-context` string pointing to the active environment.

When you execute `kubectl config use-context <name>`, the CLI loads the YAML file into memory, alters the single `current-context: <name>` string, and overwrites the YAML file on disk. When executing commands like `view --flatten`, the CLI dynamically parses all files listed in the `$KUBECONFIG` path array, resolves duplicate keys, and synthesizes a single, unified YAML representation in memory.

## Performance Notes

- Modifying contexts executes instantaneously, as it is purely a local filesystem JSON/YAML parsing operation requiring no network communication with the Kubernetes API server.
- Having massive numbers of contexts (hundreds of clusters) in a single `kubeconfig` file can mildly impact terminal initialization speeds if prompt-parsing tools (like bash-it or oh-my-zsh) aggressively scan the file on every keystroke.

## Security Notes

- **Static Token Storage:** Embedding raw bearer tokens or client private keys inside `kubeconfig` files (which is what `set-credentials` often does) leaves plaintext secrets sitting on the workstation disk. Modern security architectures mandate using external `exec` authentication plugins (like `aws-iam-authenticator` or `kubelogin`) which generate short-lived tokens in RAM.
- **File Permissions:** Because `kubeconfig` files inherently contain authorization to assume identity on a cluster, the `~/.kube/config` file must maintain strict `0600` (read/write by owner only) permissions. Exposure to unauthorized local users leads to total cluster compromise.

## Common Mistakes

- **Overwriting configurations accidentally:** Downloading a new kubeconfig and renaming it to `~/.kube/config`, overwriting all previous cluster access. **Why it's wrong:** You must merge configurations using `KUBECONFIG=file1:file2` and the `view --flatten` technique, or keep them segregated and manage the `KUBECONFIG` env var dynamically.
- **Confusing contexts with clusters:** Trying to run `kubectl config use-context https://api.server.com`. **Why it's wrong:** You cannot switch to a raw cluster URL. You switch to a _context_, which is an arbitrary string name mapped to a cluster, a user, and a namespace.
- **Leaking redacted configs:** Running `kubectl config view` to send debugging data to a coworker, thinking the tokens are hidden. **Why it's wrong:** While `view` masks raw tokens by default, if your `kubeconfig` utilizes an external `exec` command plugin, the arguments for that plugin (which may contain role ARNs or user IDs) are printed in plaintext.

## Best Practices

- Aggressively utilize `kubectl config set-context --current --namespace=<name>` to lock your terminal to a specific working namespace. This mitigates the risk of applying configurations to the wrong environment (e.g., defaulting into `default` instead of `production`).
- Instead of maintaining a monolithic, massive `~/.kube/config` file, keep separate `.yaml` configs for disparate environments (Dev, Prod, ClientA) and switch between them seamlessly by dynamically exporting the `$KUBECONFIG` environment variable in your shell profile.
- Never check a functional `kubeconfig` file containing hardcoded static tokens into version control or share it via chat platforms.

## Interview Questions

**Q:** Describe the three core data structures stored inside a standard `kubeconfig` file and explain how they interact when `kubectl` makes an API request.
**A:** The file contains `clusters` (defining API server URLs and TLS verification details), `users` (defining client certificates, tokens, or exec plugins for identity), and `contexts` (defining a triplet mapping of one user to one cluster and one default namespace). When `kubectl` runs, it checks the `current-context` string, looks up the corresponding `context` mapping, and applies the designated `user` authentication to the designated `cluster` routing endpoint.
**Q:** Why does running `kubectl config view` typically print `REDACTED` in place of authentication tokens and certificates, and how do you bypass this for troubleshooting?
**A:** By default, `kubectl` protects sensitive cryptographic key material and bearer tokens from accidentally being exposed on the terminal or leaked in copy-pasted debugging logs. To view the actual, unmasked raw base64 data, you must explicitly append the `--raw` flag to the command.
**Q:** What is the mechanism `kubectl` uses to resolve multiple configuration files if you declare the environment variable `KUBECONFIG=~/.kube/config:/tmp/dev.yaml`?
**A:** `kubectl` reads the colon-separated array and loads both YAML files into memory. It merges the arrays of clusters, users, and contexts based on their string names. If there is a naming collision (e.g., both files contain a context named `dev`), the file appearing _first_ in the list (`~/.kube/config`) takes absolute precedence and overwrites the trailing conflicting keys.

## Practice Problems

**Problem:** Change the default namespace of your currently active cluster context to `monitoring`, so all future `kubectl` commands apply there without needing the `-n` flag.
**Hint:** Modify the context settings targeting the current environment.
**Solution:** `kubectl config set-context --current --namespace=monitoring` (This alters the namespace parameter of the active context in the local configuration file).
**Problem:** Generate a completely unredacted output of the current configuration, restricted strictly to the cluster and user data relevant to the active context.
**Hint:** Use the view subcommand paired with the minimization and raw data flags.
**Solution:** `kubectl config view --minify --raw` (The `--minify` flag strips out unrelated clusters, and `--raw` reveals the actual cryptographic certificates and tokens).

## References

- [Kubernetes Documentation - Organizing Cluster Access Using kubeconfig Files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [Kubectl Reference - config](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#config)
