---
slug: kubectl-apply
name: kubectl apply
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - deployment
  - gitops
  - iac
  - declarative
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
  - apply kubernetes manifest file
  - update k8s resource declaratively
  - deploy yaml to kubernetes
  - apply kustomization directory
  - update deployment via file
relatedCommands:
  - kubectl-create
  - kubectl-delete
  - helm-install
  - kubectl-annotate
  - kubectl-edit
  - kubectl-label
  - kubectl-rollout
  - kubectl-scale
alternatives:
  - helm-install
  - kubectl-create
  - kubectl-scale
status: draft
---
## What is it?

`kubectl apply` is the foundational declarative management command in Kubernetes. It reads configuration files (YAML or JSON) and applies their desired state to the cluster. If the targeted resource does not exist, it creates it. If the resource already exists, it intelligently computes a patch to update the live object to match the newly submitted configuration file.

## Why does it exist?

Managing infrastructure via imperative commands (`kubectl create`, `kubectl edit`) destroys reproducibility. To achieve Infrastructure-as-Code (IaC), systems require idempotency: the ability to apply a file continuously and have the system converge on the desired state without crashing if the object already exists. `kubectl apply` solves this by introducing the "3-way strategic merge patch." It tracks what you explicitly declared, what the cluster modified dynamically, and computes a safe, non-destructive update.

## Syntax

```bash
kubectl apply (-f FILENAME | -k DIRECTORY) [options]
```

## Flags

| Flag                      | Description                                                                                               | Example                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `-f`, `--filename <path>` | The path to a file, directory, or remote URL containing the resource definitions to apply.                | `kubectl apply -f deployment.yaml`                          |
| `-k`, `--kustomize <dir>` | Processes a `kustomization.yaml` file located in a directory and applies the resulting rendered manifest. | `kubectl apply -k ./overlays/prod/`                         |
| `--dry-run=<strategy>`    | Simulates the operation (`client` or `server`) without persisting changes to etcd.                        | `kubectl apply -f dev.yaml --dry-run=server`                |
| `-n`, `--namespace <ns>`  | Forces the applied resources into a specific namespace, overriding the file's metadata.                   | `kubectl apply -f app.yaml -n staging`                      |
| `--prune`                 | Automatically deletes resources from the cluster that were removed from the local applied directory.      | `kubectl apply -f ./manifests/ --prune -l app=frontend`     |
| `--server-side`           | Delegates the merge patching algorithm logic entirely to the Kubernetes API server (Server-Side Apply).   | `kubectl apply -f crd.yaml --server-side`                   |
| `--force-conflicts`       | (Requires `--server-side`) Forces the update, seizing field ownership from other controllers.             | `kubectl apply -f crd.yaml --server-side --force-conflicts` |
| `--force`                 | Deletes and forcefully recreates the resource if standard patch merging fails due to immutable fields.    | `kubectl apply -f db.yaml --force`                          |
| `--wait`                  | Blocks execution until the applied resources (e.g., Deployments, Pods) achieve a "Ready" state.           | `kubectl apply -f app.yaml --wait`                          |
| `-o`, `--output <format>` | Prints the resulting applied object structure in specific formats (e.g., `yaml`, `json`).                 | `kubectl apply -f dev.yaml -o yaml`                         |
| `-l`, `--selector`        | Restricts the apply operation to resources matching the specified label within the target files.          | `kubectl apply -f ./all/ -l tier=backend`                   |

## Examples

```bash
kubectl apply -f nginx-deployment.yaml
```

> This reads the local YAML file. If the deployment doesn't exist, it creates it. If it does exist, it calculates the differences between the file and the live cluster state, updating only the changed fields (e.g., image tag or replica count).

```bash
kubectl apply -k ./kustomize/overlays/production/
```

> This invokes the built-in Kustomize engine. It recursively reads the `kustomization.yaml` layout, applies patches and environment variables, renders the complete manifest stream in memory, and submits it to the API server.

```bash
kubectl apply -f [https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml](https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml)
```

> This pulls a raw, publicly accessible YAML manifest directly from a remote HTTP URL and applies its hundreds of embedded resources sequentially into the cluster, which is standard for bootstrapping operators.

```bash
kubectl apply -f my-app.yaml --dry-run=server
```

> This submits the payload to the API server for full validation (including Admission Webhook evaluation) to ensure the manifest is structurally sound, but discards the changes before saving to the database (`etcd`).

```bash
kubectl apply -f ./manifests/ --prune -l component=web
```

> This applies a directory of files. The `--prune` flag instructs the server to identify all live resources in the cluster labeled `component=web` that are _missing_ from the local `./manifests/` folder, and automatically delete them.

## Real-World Scenarios

**GitOps Continuous Deployment Pipelines**

```bash
kubectl apply -k ./env/production/ --wait --timeout=5m
```

> Continuous Deployment agents (running in Jenkins or GitLab CI) checkout configuration repositories, run `apply` against environment-specific directories, and enforce `--wait` to ensure the pipeline halts and reports failure if the pods enter a CrashLoop.

**Resolving CRD Field Ownership Conflicts**

```bash
kubectl apply -f massive-crd.yaml --server-side --force-conflicts
```

> When migrating legacy infrastructure to Modern Server-Side Apply mechanisms, administrators encounter "field ownership" conflicts. They use `--force-conflicts` to forcefully seize control of the resource fields so future applies execute cleanly via the API server.

**Forced Immutable Field Updates**

```bash
kubectl apply -f statefulset.yaml --force
```

> If a developer modifies an immutable field (like a StatefulSet's volume claim template), standard `apply` fails. The `--force` flag automates the deletion and immediate recreation of the resource to bypass the immutable constraint.

## When should it NOT be used?

- **Modifying resources initially created via `kubectl create`:** **Reason:** `kubectl create` does not record the `last-applied-configuration` annotation. Attempting to `apply` over a created resource causes merge failures. **Use instead:** Always use `apply` from inception, or use `replace`.
- **Executing complex, multi-resource templating logic with dependencies:** **Reason:** Raw `apply` does not understand ordering (e.g., creating a Secret before a Pod that needs it) or complex templating logic. **Use instead:** Helm (`helm install / upgrade`).

## Alternatives

- **`kubectl create`:** Imperative creation. **Tradeoff:** Fails instantly if the resource exists. Excellent for quick one-off tasks (like creating secrets), but terrible for persistent GitOps declarative pipelines.
- **`kubectl replace`:** Destructive replacement. **Tradeoff:** `replace` tears down the existing object and substitutes it entirely with the new file, stripping away any fields added by dynamic operators. `apply` merges safely.
- **`helm upgrade --install`:** Full package management. **Tradeoff:** Helm handles complex templating, release versioning, and ordered deployments, whereas `kubectl apply` simply pushes flat YAML into the API.

## How it works internally

The standard `kubectl apply` command utilizes the **3-Way Strategic Merge Patch** algorithm executed locally by the `kubectl` client.

When you apply a file, `kubectl` inspects three data sets:

1. The **local file** you just submitted.
2. The **live configuration** currently running in the cluster.
3. The **last-applied-configuration**, which is a hidden JSON annotation (`kubectl.kubernetes.io/last-applied-configuration`) that `kubectl` injected into the live object the _previous_ time it was applied.

`kubectl` compares these three sets locally. If a field exists in the `last-applied` annotation but is missing from your local file, `kubectl` realizes you deleted it intentionally and instructs the API server to remove it from the live object. If a dynamic controller (like a Horizontal Pod Autoscaler) added a `replicas` field to the live object, `kubectl` ignores it, avoiding destructive overwrites. It compiles a final JSON patch and sends it to the API server.

When `--server-side` is invoked, this entire client-side algorithm is bypassed. The raw file is sent directly to the API server, which utilizes "Field Management" to track exactly which tool or operator owns which specific lines of YAML, preventing tools from overwriting each other's changes.

## Performance Notes

- Applying massive directories containing thousands of YAML manifests sequentially via standard client-side apply is slow, as `kubectl` must download live objects, compute patches locally, and submit them individually.
- `--server-side` apply drastically improves performance and reduces network bandwidth, as the raw payload is shipped to the API server, shifting the compute burden to the control plane.

## Security Notes

- **Secret Logging:** Applying a `Secret` manifest from disk means the plaintext base64 data resides in your local filesystem. Furthermore, the `last-applied-configuration` annotation stores a copy of the secret metadata in plain text, making it visible to anyone querying the resource.
- **Privilege Escalation via Apply:** If a user possesses `patch` capabilities to execute `apply`, they can inject malicious annotations or container commands into Deployments. RBAC must restrict apply capabilities strictly per namespace and resource type.

## Common Mistakes

- **Mixing `create`, `edit`, and `apply`:** Creating an object with `kubectl create`, editing it manually, and then trying to `kubectl apply` a file. **Why it's wrong:** The hidden `last-applied-configuration` annotation is missing or out of sync. The 3-way merge algorithm fails, resulting in rejected patches. Stick to one paradigm.
- **Applying giant CRDs without server-side apply:** Running `kubectl apply -f prometheus-crd.yaml`. **Why it's wrong:** Massive CRDs exceed the 256KB annotation size limit for the `last-applied-configuration` string, causing the apply command to crash instantly. Always use `--server-side` for large CRDs.
- **Expecting `--prune` to be safe by default:** Running `kubectl apply -f . --prune`. **Why it's wrong:** Without highly specific label selectors (`-l`), prune will violently delete unrelated resources in the namespace that happen to be missing from your local folder.

## Best Practices

- Universally adopt `--server-side` apply for modern GitOps workflows. It resolves the 256KB annotation size limit, drastically reduces client-side processing, and manages field ownership elegantly.
- Run `kubectl diff -f <file>` immediately before `kubectl apply` on critical production changes to visually inspect the exact line-by-line diff of what the merge patch will alter in the cluster.
- Always structure your infrastructure repositories using Kustomize (`-k`), separating base configurations from environment overlays (`dev/`, `prod/`) to maximize manifest reusability.

## Interview Questions

- **Q:** Explain the mechanics of the 3-Way Strategic Merge Patch used by `kubectl apply`. What three specific data sources does it compare?
  - **A:** The algorithm compares the **local manifest file**, the **live cluster object state**, and the hidden **`last-applied-configuration` annotation** embedded in the live object. By comparing the local file against the `last-applied` annotation, `kubectl` can deduce whether a field was intentionally deleted from the file, allowing it to safely remove the field from the live object without overwriting dynamic fields injected by cluster operators.
- **Q:** Why does applying a massive Custom Resource Definition (CRD) often fail with a "metadata.annotations: Too long" error using standard `kubectl apply`, and how do you fix it?
  - **A:** Standard `apply` writes the entire YAML file payload into the `last-applied-configuration` annotation. Kubernetes has a strict 256KB size limit for annotations. Massive CRDs exceed this limit. To fix it, you append the `--server-side` flag, which completely bypasses the client-side annotation mechanism and uses the API server's native field management tracking instead.
- **Q:** You want to update an immutable field on a StatefulSet (e.g., a volume claim template) using a modified YAML file. How can you instruct `kubectl apply` to handle this constraint automatically?
  - **A:** Standard `apply` will fail because the API server rejects modifications to immutable fields. You must append the `--force` flag. This instructs `kubectl` to intercept the failure, immediately delete the live StatefulSet from the cluster, and re-create it from scratch using the new manifest configuration.

## Practice Problems

- _Problem:_ Apply a configuration file named `database.yaml` to the cluster, but execute it strictly as a test to verify API server validation without actually saving the changes to `etcd`.
  - _Hint:_ Use the dry-run strategy targeted at the server validation layer.
  - _Solution:_ `kubectl apply -f database.yaml --dry-run=server` (The `server` dry-run submits the payload for complete admission webhook validation but rolls back the transaction before database commit).
- _Problem:_ Deploy a Kustomize directory located at `./overlays/staging/`, overriding the files' internal namespaces and forcing deployment into the `beta-test` namespace.
  - _Hint:_ Combine the kustomize execution flag with the namespace override flag.
  - _Solution:_ `kubectl apply -k ./overlays/staging/ -n beta-test` (This renders the kustomization tree in memory and forcefully injects the resulting manifests into the specified namespace).

## References

- [Kubernetes Documentation - Declarative Management of Kubernetes Objects](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/)
- [Kubectl Reference - apply](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#apply)
