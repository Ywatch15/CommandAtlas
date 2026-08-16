---
slug: kubectl-annotate
name: kubectl annotate
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - metadata
  - annotations
  - api
  - k8s
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
  - sh
intentPhrases:
  - add metadata to kubernetes resource
  - annotate pod in kubectl
  - update resource annotations k8s
  - remove kubernetes annotation
  - tag resource with non-identifying metadata
relatedCommands:
  - kubectl-label
  - kubectl-apply
  - kubectl-edit
alternatives:
  - kubectl-edit
status: draft
---

## What is it?

`kubectl annotate` is a command-line utility used to attach, update, or remove non-identifying metadata (annotations) on Kubernetes resources. Annotations accept large, arbitrary string values—such as JSON payloads, configuration flags for ingress controllers, or CI/CD audit trails—that are not used by the core Kubernetes scheduler for identifying or selecting objects.

## Why does it exist?

While labels (`kubectl label`) are strictly used for selecting and grouping resources (e.g., matching Pods to Services), external tools, operators, and operators require a mechanism to attach complex configuration data directly to objects. `kubectl annotate` exists to provide an imperative, fast mechanism to inject this structural metadata—like overriding an Nginx Ingress snippet or tracking release SHAs—without requiring administrators to pull down, edit, and re-apply entire YAML manifests.

## Syntax

```bash
kubectl annotate [--overwrite] (-f FILENAME | TYPE NAME) KEY_1=VAL_1 ... KEY_N=VAL_N [--resource-version=version] [options]
```

## Flags

| Flag                   | Description                                                                                       | Example                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `--overwrite`          | Forces the overwriting of an existing annotation value if the key already exists on the resource. | `kubectl annotate pod web1 rev=2 --overwrite`                               |
| `--all`                | Applies the annotation to all resources of the specified type in the targeted namespace.          | `kubectl annotate pods --all tracked=true`                                  |
| `-f, --filename`       | Targets the resource defined by the specified JSON or YAML file rather than using CLI names.      | `kubectl annotate -f deployment.yaml reason="patch"`                        |
| `--dry-run=<strategy>` | Simulates the annotation operation (`client` or `server`) without persisting changes to etcd.     | `kubectl annotate pod web1 log=debug --dry-run=client`                      |
| `-n, --namespace`      | Specifies the namespace of the target resource.                                                   | `kubectl annotate svc api ssl=true -n prod`                                 |
| `-l, --selector`       | Annotates resources matching a specific label selector rather than naming them explicitly.        | `kubectl annotate pod -l app=nginx restarted=true`                          |
| `--field-selector`     | Annotates resources matching a specific field selector (e.g., `status.phase=Running`).            | `kubectl annotate pod --field-selector status.phase=Failed investigate=yes` |
| `--resource-version`   | Enforces optimistic concurrency control; the update fails if the resource version has changed.    | `kubectl annotate pod web1 tag=v2 --resource-version=10456`                 |
| `--local`              | Modifies the file locally without communicating with the API server (must be used with `-f`).     | `kubectl annotate -f pod.yaml local=true --local`                           |
| `--record`             | Records the current `kubectl` command in the resource's annotation history (deprecated).          | `kubectl annotate deployment web msg="update" --record`                     |
| `-o, --output`         | Output format when combined with `--dry-run` (e.g., `yaml`, `json`).                              | `kubectl annotate pod web1 tag=v2 --dry-run=client -o yaml`                 |

## Examples

```bash
kubectl annotate pod my-pod description="Handles background jobs"
```

> This attaches a simple key-value annotation (`description="Handles background jobs"`) to the pod named `my-pod` in the default namespace, preserving any existing annotations.

```bash
kubectl annotate ingress web-ingress nginx.ingress.kubernetes.io/rewrite-target=/ --overwrite
```

> This configures an Nginx Ingress controller behavior by appending an annotation. The `--overwrite` flag guarantees the operation succeeds even if a `rewrite-target` annotation was already present on the resource.

```bash
kubectl annotate deployment api-server kubernetes.io/change-cause-
```

> Appending a minus sign (`-`) immediately after the annotation key instructs the API server to completely remove the `kubernetes.io/change-cause` annotation from the deployment.

```bash
kubectl annotate pods -l environment=staging testing-complete="true"
```

> This uses a label selector (`-l`) to target multiple pods simultaneously, attaching the `testing-complete` annotation to every pod participating in the staging environment.

```bash
kubectl annotate -f deployment.yaml ci_pipeline_run=$BUILD_ID --local -o yaml > annotated.yaml
```

> This reads a local manifest file, injects the dynamic CI pipeline build ID into the file's metadata locally without contacting the cluster, and outputs the resulting modified YAML for downstream application.

## Real-World Scenarios

**Triggering Rolling Restarts via Deployment Annotations**

```bash
kubectl annotate deployment frontend restartedAt=$(date +%s) --overwrite
```

> Since deployments automatically roll out new ReplicaSets when their pod template metadata changes, engineers frequently inject or overwrite a timestamp annotation inside the pod template to forcefully trigger a rolling restart without altering container images.

**Applying Cloud Provider Load Balancer Configurations**

```bash
kubectl annotate service my-app service.beta.kubernetes.io/aws-load-balancer-internal="0.0.0.0/0"
```

> Systems administrators configuring AWS infrastructure use `kubectl annotate` on Service resources to rapidly communicate with the AWS Cloud Controller Manager, instructing it to provision an internal Application Load Balancer instead of a public one.

**Disabling Resource Validation via Admission Controllers**

```bash
kubectl annotate namespace legacy-apps sidecar.istio.io/inject="false" --overwrite
```

> Cluster operators use annotations to override default admission webhooks, selectively instructing Istio to bypass sidecar container injection for specific, incompatible legacy namespaces.

## When should it NOT be used?

- **Selecting or querying resources:** **Reason:** Annotations are not indexed by the Kubernetes API server for querying. You cannot filter `kubectl get` using annotations. **Use instead:** `kubectl label`.
- **Applying permanent infrastructure-as-code changes:** **Reason:** Annotations injected imperatively via `kubectl annotate` will be overwritten or stripped the next time a GitOps tool (like ArgoCD) or `kubectl apply` syncs the original, un-annotated manifest. **Use instead:** Add the annotation directly into the source YAML file.

## Alternatives

- **`kubectl patch`:** Precise JSON/Merge patching. **Tradeoff:** `patch` is more powerful, allowing modification of deeply nested arrays and specs, but requires complex JSON patch syntax, whereas `annotate` provides simple `key=value` ergonomics specifically for metadata.
- **`kubectl edit`:** Interactive resource modification. **Tradeoff:** `edit` opens a visual editor, which is error-prone and unscriptable, whereas `annotate` executes deterministically in automation pipelines.

## How it works internally

When you execute `kubectl annotate`, the CLI translates your command into an HTTP `PATCH` request directed at the Kubernetes API Server.

Specifically, it constructs a JSON Merge Patch (or Strategic Merge Patch) payload targeting the `.metadata.annotations` map of the resource object. If `--resource-version` is specified, it utilizes Optimistic Concurrency Control, passing the version string to ensure the resource has not been modified by another client since it was read.

The API Server receives the patch, validates the annotation keys (ensuring they meet strict DNS subdomain formatting rules, such as `prefix/name`), updates the object in the `etcd` backing store, and returns the modified object to `kubectl`. Any controllers watching that resource type (e.g., Ingress Controllers or Deployment Controllers) instantly receive an update event from the API server and react to the new annotation payload.

## Performance Notes

- Annotating thousands of resources simultaneously via `--all` forces `kubectl` to issue individual HTTP PATCH requests for every single object, generating a massive spike in API Server processing latency and etcd write I/O.
- Annotations have no strict size limits imposed by the API syntax, but storing massive binary blobs (like 1MB base64 images) in annotations drastically inflates the `etcd` database footprint and degrades cluster performance.

## Security Notes

- **RBAC Bypass Risks:** While users may lack permissions to modify a Deployment's `.spec` directly, having `patch` permissions on `.metadata` allows them to inject annotations that operators or admission controllers execute with elevated privileges (e.g., instructing an operator to mount a host directory).
- **Information Disclosure:** Annotations are stored in plaintext. Placing sensitive secrets, API tokens, or passwords into annotations exposes them to anyone with `get` permissions on the resource.

## Common Mistakes

- **Using annotations for selection:** Trying to run `kubectl get pods --selector my-annotation=true`. **Why it's wrong:** The API server only indexes `.metadata.labels`. Annotations cannot be queried natively.
- **Forgetting the `--overwrite` flag:** Running `kubectl annotate pod web tag=v2` when `tag=v1` exists. **Why it's wrong:** By default, `kubectl annotate` acts safely and refuses to alter existing keys, throwing an error. You must explicitly pass `--overwrite`.
- **Invalid key formatting:** Creating an annotation like `my_annotation?=true`. **Why it's wrong:** Kubernetes enforces strict validation on annotation keys. They must consist of an optional valid DNS subdomain prefix, a slash, and a name segment containing only alphanumeric characters, dashes, underscores, and dots.

## Best Practices

- Always prefix custom annotations with your organization's DNS domain (e.g., `acme.corp/team-owner=backend`) to prevent namespace collisions with core Kubernetes controllers or third-party operators.
- When executing `kubectl annotate` in CI/CD pipelines, strictly leverage `--resource-version` or `--overwrite` to ensure scripts execute idempotently without failing on subsequent reruns.

## Interview Questions

- **Q:** What is the technical distinction between a Kubernetes Label and an Annotation, and when must you use one over the other?
  - **A:** Labels are used for identifying and organizing resources; they are indexed by the API server and used by selectors (like Services selecting Pods). Annotations are used for attaching arbitrary, non-identifying metadata (like JSON configs or tool audit trails). You cannot query or select resources using annotations.
- **Q:** How do you completely remove an existing annotation from a Kubernetes resource using `kubectl annotate`?
  - **A:** You append a minus sign (`-`) immediately to the end of the annotation key without providing a value. For example: `kubectl annotate pod my-pod example.com/config-`.
- **Q:** Explain the purpose of the `--resource-version` flag when updating annotations on highly active resources.
  - **A:** It enforces Optimistic Concurrency Control. It guarantees that the resource has not been updated by another controller or user between the time you checked its state and the time your `PATCH` request reaches the API server, preventing accidental overwrites of intermediate state changes.

## Practice Problems

- _Problem:_ Attach an annotation with the key `deployment.kubernetes.io/revision` and the value `3` to a deployment named `auth-api`, overwriting the value if it already exists.
  - _Hint:_ Combine the deployment target with the explicit overwrite flag.
  - _Solution:_ `kubectl annotate deployment auth-api deployment.kubernetes.io/revision="3" --overwrite`
- _Problem:_ Remove the annotation named `nginx.ingress.kubernetes.io/ssl-redirect` entirely from an ingress resource named `public-gateway` in the `web` namespace.
  - _Hint:_ Target the namespace and use the removal syntax by appending a minus sign to the key.
  - _Solution:_ `kubectl annotate ingress public-gateway nginx.ingress.kubernetes.io/ssl-redirect- -n web`

## References

- [Kubernetes Documentation - Annotations](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/)
- [Kubectl Reference - annotate](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#annotate)
