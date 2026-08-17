---
slug: kubectl-explain
name: kubectl explain
aliases: []
category: kubernetes
tags:
  - kubernetes
  - k8s
  - documentation
  - api
  - schema
  - reference
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
  - kubernetes yaml documentation
  - find kubernetes resource fields
  - describe k8s api schema
  - what fields are in a pod spec
  - kubernetes syntax reference
relatedCommands: [kubectl-api-resources, kubectl-describe]
alternatives: []
status: draft
---

## What is it?

`kubectl explain` is a built-in documentation and introspection utility for the Kubernetes CLI. It queries the active cluster's API server to retrieve the exact OpenAPI schema definitions for any supported Kubernetes resource. It outputs a formatted, offline-accessible manual detailing the precise hierarchy, data types, and descriptions of every field available for creating or modifying YAML/JSON manifests.

## Why does it exist?

Kubernetes manifests are deeply nested and notoriously complex. Memorizing whether a liveness probe uses `initialDelaySeconds` or `delaySeconds`, or whether `volumes` is a list or a dictionary, is impossible. While developers could search the official web documentation, doing so breaks workflow focus and risks reading documentation for a different Kubernetes version than what is actually running. `kubectl explain` exists to provide an authoritative, version-accurate, instantly accessible schema reference directly inside the terminal. It parses the exact OpenAPI specification published by the specific cluster you are connected to, guaranteeing that the fields it describes are 100% supported by your active environment.

## Syntax

```bash
kubectl explain RESOURCE[.FIELD]... [options]
```

## Flags

| Flag             | Description                                                                                                                                                   | Example                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `--recursive`    | Prints the names of all fields and deeply nested sub-fields simultaneously without descriptions. Excellent for visualizing the entire skeleton of a resource. | `kubectl explain pod.spec --recursive`                       |
| `--api-version`  | Fetches documentation for a specific API version of a resource, critical when migrating between `v1beta1` and `v1`.                                           | `kubectl explain ingress --api-version=networking.k8s.io/v1` |
| `-o`, `--output` | Formats the output. Supported primarily in newer kubectl versions (e.g., `-o plaintext-openapiv2` to dump raw schema data).                                   | `kubectl explain pod --output=plaintext-openapiv2`           |
| `--help`         | Prints usage instructions and examples.                                                                                                                       | `kubectl explain --help`                                     |

## Examples

```bash
kubectl explain pod
```

> The top-level invocation. Outputs the core documentation for the `Pod` resource, listing the API Version (`v1`), the Kind (`Pod`), a general description of what a Pod is, and an alphabetical list of top-level fields (e.g., `apiVersion`, `kind`, `metadata`, `spec`, `status`).

```bash
kubectl explain deployment.spec.template.spec.containers.livenessProbe
```

> The surgical drill-down. By using dot notation, an engineer bypasses the top-level summaries and jumps straight into the exact schema definition for a `livenessProbe`. It outputs the required data type (Object) and lists all permissible sub-fields (like `httpGet`, `timeoutSeconds`, `successThreshold`) alongside their detailed descriptions.

```bash
kubectl explain hpa --api-version=autoscaling/v2
```

> Resolves API ambiguity. The HorizontalPodAutoscaler (HPA) has undergone significant changes between `v1`, `v2beta2`, and `v2`. This command explicitly requests the schema for the `v2` specification, ensuring the engineer writes a manifest perfectly compliant with the modern autoscaling API.

```bash
kubectl explain statefulset.spec --recursive | less
```

> Visualizes the entire architectural skeleton. It recursively prints the hierarchy of the `StatefulSet` specification tree, suppressing the verbose paragraph descriptions. Piping to `less` is highly recommended, allowing the developer to scroll through the massive tree to discover nested configuration options they might not have known existed (like `volumeClaimTemplates`).

## Real-World Scenarios

**Writing Manifests in Air-Gapped Environments**

```bash
# Developer lacks internet access to kubernetes.io
kubectl explain pod.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution
```

> In secure, air-gapped data centers (like banking or defense sectors), developers cannot access external web browsers to read Kubernetes documentation. `kubectl explain` relies entirely on the cluster's internal API server, allowing the engineer to perfectly construct complex Node Affinity scheduling rules directly from the terminal without breaking security protocols.

**Discovering Custom Resource Definitions (CRDs)**

```bash
kubectl get crd
# Discovers a CRD named 'certificates.cert-manager.io'
kubectl explain certificates.spec
```

> When operators install third-party tools like Cert-Manager or Prometheus, they introduce massive, proprietary Custom Resources. `kubectl explain` effortlessly parses the OpenAPI schemas dynamically injected by these CRDs, providing native documentation for third-party tools exactly as it does for core Kubernetes objects.

## When should it NOT be used?

- **To check cluster state:** **Do not use `explain` to troubleshoot broken pods.** `explain` is a static dictionary of syntax rules; it provides zero information about the actual running state of the cluster. Use `kubectl describe` or `kubectl get` to see live resource status.
- **To learn Kubernetes concepts:** `explain` provides highly technical schema definitions (e.g., "Integer representing the threshold"). It does not explain _why_ you would use a feature or provide complete YAML examples. For conceptual learning, the official web documentation is vastly superior.

## Alternatives

- **Kubernetes Official Web API Reference:** **Best for visual browsing and conceptual context.** Offers hyperlinked navigation, comprehensive examples, and detailed explanations of how components interact.
- **IDE Extensions (e.g., VS Code Kubernetes Tools):** **Best for active authoring.** Modern IDE plugins dynamically download the OpenAPI schema from the cluster and provide real-time auto-completion, linting, and hover-text descriptions directly inside your YAML file, rendering manual `kubectl explain` commands largely obsolete during active development.
- **Kubeval / Datree:** **Best for CI/CD validation.** Tools that automatically validate your YAML files against the OpenAPI schema in deployment pipelines to catch syntax errors before they reach the cluster.

## How it works internally

The Kubernetes API server strictly adheres to the OpenAPI specification (formerly Swagger). Whenever a core resource is updated, or a new Custom Resource Definition (CRD) is installed, the API server dynamically updates and publishes a colossal JSON document representing the schema of the entire cluster at the `/openapi/v2` (and increasingly `v3`) endpoint.

When you execute `kubectl explain pod.spec`, the `kubectl` binary does not contain hardcoded documentation. Instead, it performs the following:

1.  **Schema Fetch:** It executes a GET request to the API server's `/openapi/v2` endpoint, downloading the massive, multi-megabyte schema payload into local memory (and aggressively caching it in `~/.kube/cache/` to speed up future requests).
2.  **Path Resolution:** It parses your dot-notation argument (`pod.spec`). It searches the OpenAPI document for the `Pod` definition, traverses down to the `properties` map, and locates the `spec` object.
3.  **Formatting:** It extracts the `type` (e.g., `object`, `string`, `[]string`), the `description` string, and recursively lists the immediate child `properties`. It formats this data into a highly readable, colorized ASCII layout and outputs it to the terminal.

## Performance Notes

- **Initial Cache Delay:** The very first time you run `kubectl explain` (or the first time after upgrading the cluster), the CLI must download and parse the massive OpenAPI JSON payload. This can cause a noticeable delay of several seconds. Subsequent executions read from the local cache and resolve instantaneously.

## Security Notes

- **Safe Exploration:** `kubectl explain` is a completely benign, read-only operation. It only queries the schema endpoints, requiring minimal RBAC privileges (discovery access). It cannot modify cluster state or expose secret data payloads.

## Common Mistakes

- **Guessing array syntax**
  - _Mistake:_ Trying to explain a sub-field of an array by guessing brackets: `kubectl explain pod.spec.containers[0].image`.
  - _Why:_ The schema represents types, not instantiated objects. It doesn't understand array indexes like `[0]`. To explore fields inside an array of objects, you simply use the standard dot notation as if it were a single object: `kubectl explain pod.spec.containers.image`.
- **Searching the web instead of the cluster**
  - _Mistake:_ Googling "Kubernetes Ingress syntax", copying a YAML snippet from a blog post dated 2019, and getting an API validation error on deployment.
  - _Why:_ The blog post likely uses `extensions/v1beta1`, which was permanently removed in modern Kubernetes. Using `kubectl explain ingress` guarantees you receive the exact, correct syntax (`networking.k8s.io/v1`) mandated by your specific cluster's version.

## Best Practices

- **Pipe to `less`:** Documentation for complex objects like `pod.spec` will flood your terminal history, making it impossible to read the top-level description. Always develop the habit of using `kubectl explain pod.spec | less` to enable pagination and searching (using `/`).
- **Use for CRD Discovery:** When inheriting a cluster with unfamiliar operators (like ArgoCD or Istio), run `kubectl api-resources` to list the custom resources, then immediately use `kubectl explain <ResourceName>` to instantly understand how to construct their proprietary YAML manifests.

## Interview Questions

**Q: You are writing a deployment YAML and cannot remember if the field is named `replicas` or `replicaCount`. Furthermore, your cluster does not have internet access. What exact command would you type to find the correct field name and its data type?**
**A:** You would use `kubectl explain deployment.spec`. This command queries the cluster's internal OpenAPI schema, requires no internet access, and will output the exact field names (revealing it is `replicas`) along with its expected data type (integer) and description.

**Q: Why might `kubectl explain hpa` show different fields on a cluster running Kubernetes 1.22 versus a cluster running Kubernetes 1.25?**
**A:** `kubectl explain` does not rely on a static offline dictionary; it dynamically downloads the OpenAPI schema published by the specific API server you are connected to. Because the HorizontalPodAutoscaler (HPA) API transitioned from `v2beta2` to `v2` across those versions—introducing breaking schema changes—`explain` accurately reflects the specific schema supported by the specific cluster's version.

## Practice Problems

**Problem:** You are configuring a `PersistentVolumeClaim` (PVC) but cannot remember the exact YAML structure for defining the requested storage size. Write the command to drill down directly into the `resources` section of the PVC specification to read the documentation.
**Hint:** Use dot notation traversing from the resource down through `spec` and `resources`.
**Solution:**

```bash
kubectl explain pvc.spec.resources
```

**Problem:** You want to see the entire structural layout of a `Service` object all at once, without any verbose description paragraphs cluttering the screen.
**Hint:** Use the flag that lists all nested fields simultaneously.
**Solution:**

```bash
kubectl explain service --recursive
```

## References

- [kubectl CLI Reference: explain](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#explain)
- [Kubernetes API Reference](https://kubernetes.io/docs/reference/kubernetes-api/)
