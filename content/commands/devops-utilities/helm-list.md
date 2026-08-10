---
slug: helm-list
name: helm list
aliases: [helm ls]
category: devops-utilities
tags: [helm, kubernetes, package-manager, listing, releases, audit]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'list deployed helm releases'
  - 'show helm charts in cluster'
  - 'check active helm installations'
  - 'list helm packages namespace'
  - 'audit helm releases kubernetes'
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`helm list` (or `helm ls`) is a package management command used to list all deployed Helm releases within a Kubernetes cluster. It queries the cluster secret store, extracting and formatting release names, namespaces, revision numbers, update timestamps, application versions, and deployment statuses.

## Why does it exist?

As Kubernetes clusters scale to host dozens of microservices deployed via Helm, tracking which applications are installed, what charts they use, and what revisions are active becomes impossible without centralized auditing. `helm list` exists to bridge this operational gap, providing a clear tabular overview of all active and uninstalled Helm releases across namespaces.

## Syntax

```bash
helm list [options]
```

## Flags

| Flag                     | Description                                                                  | Example                            |
| ------------------------ | ---------------------------------------------------------------------------- | ---------------------------------- |
| `--all-namespaces`, `-A` | Lists Helm releases across all namespaces in the Kubernetes cluster.         | `helm list --all-namespaces`       |
| `--namespace`, `-n`      | Restricts the listing output strictly to a specified Kubernetes namespace.   | `helm list --namespace production` |
| `--all`, `-a`            | Shows all releases including those in `FAILED` or `UNINSTALLED` states.      | `helm list --all`                  |
| `--pending`, `-p`        | Shows releases currently in a pending deployment state.                      | `helm list --pending`              |
| `--deployed`             | Shows only successfully deployed releases (default behavior).                | `helm list --deployed`             |
| `--failed`               | Shows only releases that encountered fatal deployment failures.              | `helm list --failed`               |
| `--superseded`           | Shows only superseded releases (older revisions replaced by newer upgrades). | `helm list --superseded`           |
| `--output`, `-o`         | Formats output presentation styles (`json`, `yaml`, `table`).                | `helm list --output json`          |
| `--selector`, `-l`       | Restricts listing to releases matching specified label selectors.            | `helm list -l "tier=backend"`      |
| `--time`                 | Formats output timestamps or sorts by update time.                           | `helm list --time`                 |
| `--max`                  | Limits the maximum number of release items returned in output.               | `helm list --max 10`               |

## Examples

```bash
helm list
```

> This lists all successfully deployed Helm releases residing in the currently active Kubernetes namespace defined in your local kubeconfig context.

```bash
helm list --all-namespaces
```

> This audits and displays all active Helm releases across every single namespace in the entire Kubernetes cluster (`-A`).

```bash
helm list --namespace staging --output json
```

> This queries releases in the `staging` namespace and outputs the inventory in structured JSON format, ideal for parsing inside automation scripts.

```bash
helm list --all --max 20
```

> This lists up to 20 releases across all lifecycle states—including failed, superseded, and uninstalled releases—providing a complete audit history.

```bash
helm list -l "environment=production,tier=database"
```

> This filters the release listing using Kubernetes label selectors (`-l`), returning only releases matching specific metadata tags.

## Real-World Scenarios

**Cluster-Wide Application Auditing**

```bash
helm list --all-namespaces --output table
```

> Platform engineers and cluster administrators run cluster-wide listings to audit installed software versions, ensuring all deployed helm charts comply with enterprise inventory standards.

**CI/CD Pipeline Release Verification**

```bash
helm list -n production --output json | jq '.[] | select(.name=="payment-api")'
```

> Deployment automation scripts query the active release list in JSON format and pass it through `jq` to verify whether a specific service name is already deployed before executing upgrades.

**Troubleshooting Failed Deployments**

```bash
helm list --failed --all-namespaces
```

> Operations teams quickly identify broken or stuck deployments across the cluster by filtering specifically for releases stuck in `FAILED` or `PENDING` states.

## When should it NOT be used?

- **Inspecting granular internal resource manifests (pods, services):** **Reason:** `helm list` reports high-level release metadata, not the internal status of individual Kubernetes pods or endpoints. **Use instead:** `kubectl get pods` or `helm status`.
- **Debugging deep chart template rendering errors:** **Reason:** Listing releases only displays deployment metadata, not template syntax or values evaluation errors. **Use instead:** `helm template` or `helm install --dry-run`.

## Alternatives

- `kubectl get secrets -l owner=helm`: Queries Helm release secrets directly from Kubernetes storage. **Tradeoff:** It retrieves raw Kubernetes secrets containing base64 data, whereas `helm list` parses and formats this data into a clean, human-readable release table.
- `argo-cd app list`: Lists applications managed via Argo CD. **Tradeoff:** Argo CD provides a GitOps-centric application view, whereas `helm list` audits native Helm CLI releases.

## How it works internally

When you execute `helm list`, Helm connects to the Kubernetes API server using your active kubeconfig context (`client-go`).

It queries the cluster for Kubernetes `Secret` (or `ConfigMap`) objects labeled with `owner=helm` across the targeted namespace(s). Each secret contains compressed, base64-encoded release metadata.

Helm fetches these secrets, decompresses their payloads, and parses the JSON release structures. It filters the records based on command-line flags (such as `--deployed`, `--failed`, or label selectors `--selector`), sorts them by update timestamp, and formats the output into terminal columns or serializes them into JSON/YAML. The command exits with `0` upon successful API query completion.

## Performance Notes

- Running `helm list --all-namespaces` on massive Kubernetes clusters hosting thousands of releases can introduce noticeable API server query latency and network bandwidth overhead.
- Limiting queries to specific namespaces (`--namespace <name>`) significantly improves response times by reducing the scope of Kubernetes secret lookups.

## Security Notes

- **Secret Inspection Access:** Because `helm list` reads Kubernetes Secrets storing release configurations and parameters, operators require sufficient RBAC permissions to read secrets across namespaces.
- **Sensitive Data Disclosure:** Outputting release listings in verbose JSON or YAML formats can expose environment configuration parameters and internal service names to unencrypted terminal logs.

## Common Mistakes

- **Searching the wrong namespace context:** Running `helm list` and seeing zero releases while knowing applications are installed. **Why it's wrong:** Your active kubeconfig context points to a different namespace or cluster. You must use `--all-namespaces` or switch contexts.
- **Confusing Helm release status with Pod health:** Assuming a release marked `DEPLOYED` means all its pods are running successfully. **Why it's wrong:** `DEPLOYED` indicates Helm successfully submitted manifests to the API server; individual pods may still be crashing or stuck in `CrashLoopBackOff`.
- **Expecting `helm list` to show raw `kubectl` deployments:** **Why it's wrong:** `helm list` tracks strictly applications installed via Helm packages; manually applied `kubectl apply` resources do not appear in the release list.

## Best Practices

- Always use `--all-namespaces` when conducting comprehensive cluster audits to ensure you do not miss releases hidden in isolated namespaces.
- Standardize on `--output json` when integrating Helm release audits into automated monitoring scripts or reporting dashboards.
- Periodically clean up superseded or failed release history secrets to maintain optimal cluster storage hygiene.

## Interview Questions

- _Query:_ Where does `helm list` retrieve its data from within a Kubernetes cluster?
  - _A:_ `helm list` queries the Kubernetes API server for `Secret` (or `ConfigMap`) objects labeled as `owner=helm`. These secrets store compressed, base64-encoded release history data which Helm parses, filters, and formats into the release listing table.
- _Query:_ Why might an application deployed via `kubectl apply` fail to appear in the output of `helm list`?
  - _A:_ `helm list` only tracks applications and resources deployed and managed through Helm charts (`helm install`). Resources manually applied via `kubectl` bypass Helm's release tracking mechanism and secret database entirely.
- _Query:_ What is the functional difference between running `helm list` versus `helm list --all`?
  - _A:_ Standard `helm list` filters and displays only successfully deployed releases (`DEPLOYED`), whereas `helm list --all` expands the output to include all release lifecycle states, including failed (`FAILED`), superseded (`SUPERSEDED`), and uninstalled (`UNINSTALLED`) revisions.

## Practice Problems

- _Problem:_ List all successfully deployed Helm releases across every single namespace in the Kubernetes cluster.
  - _Hint:_ Combine the listing command with the all-namespaces flag.
  - _Solution:_ `helm list --all-namespaces` (The `-A` or `--all-namespaces` flag queries all namespaces simultaneously for Helm-managed secrets).
- _Problem:_ Query all releases in the `production` namespace and format the resulting output in structured JSON.
  - _Hint:_ Combine the namespace flag with the output json flag.
  - _Solution:_ `helm list --namespace production --output json` (This targets the production namespace and serializes release metadata into clean JSON format).

## References

- [Helm Documentation - Listing Releases](https://helm.sh/docs/intro/using_helm/#helm-list-list-releases)
- [Helm CLI Command Reference - helm list](https://helm.sh/docs/helm/helm_list/)
