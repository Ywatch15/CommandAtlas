---
slug: kubectl-api-resources
name: kubectl api-resources
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - discovery
  - api
  - crd
  - audit
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
  - list all kubernetes resources
  - find shortnames for k8s resources
  - list namespaced api resources
  - check available custom resource definitions
  - discover kubernetes api endpoints
relatedCommands: [kubectl-get, kubectl-explain, kubectl-cluster-info, curl, jq]
alternatives: [curl, jq]
status: draft
---

## What is it?

`kubectl api-resources` is a discovery command used to list the API resources supported by the connected Kubernetes API Server. It queries the cluster's discovery endpoints to output a tabular map of resource names, shortnames, API groups, namespaces capabilities, and supported CRUD verbs.

## Why does it exist?

Kubernetes is a highly extensible platform; administrators continually add Custom Resource Definitions (CRDs) and third-party operators that introduce completely new resource types (like `Certificates`, `VirtualServices`, or `SealedSecrets`). Furthermore, some resources are cluster-scoped (like Nodes), while others are namespace-scoped (like Pods). `kubectl api-resources` exists to provide an authoritative, real-time index of exactly what objects the active cluster understands, how to abbreviate their names in the CLI, and whether they respect namespace boundaries.

## Syntax

```bash
kubectl api-resources [flags]
```

## Flags

| Flag                         | Description                                                                                                   | Example                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `--api-group <group>`        | Restricts the listing strictly to resources belonging to a specific API group (e.g., `apps`, `batch`).        | `kubectl api-resources --api-group=apps`   |
| `--namespaced=[true\|false]` | Filters the output to show only namespace-scoped resources (`true`) or cluster-scoped resources (`false`).    | `kubectl api-resources --namespaced=false` |
| `--verbs <verb>`             | Filters resources to display only those that support a specific list of API verbs (e.g., `create`, `delete`). | `kubectl api-resources --verbs=list,get`   |
| `-o, --output <format>`      | Configures the output format (`wide`, `name`). `name` outputs just the fully qualified resource strings.      | `kubectl api-resources -o name`            |
| `--cached`                   | Utilizes the locally cached API discovery payload in `~/.kube/cache` rather than polling the live server.     | `kubectl api-resources --cached`           |
| `--sort-by <field>`          | Sorts the resulting table by specific columns (e.g., `name`, `kind`).                                         | `kubectl api-resources --sort-by=kind`     |
| `--categories <cat>`         | Limits the output to resources tagged within specific categories (e.g., `all`).                               | `kubectl api-resources --categories=all`   |
| `--no-headers`               | Strips the column headers from the terminal output, heavily used when parsing output in shell scripts.        | `kubectl api-resources --no-headers`       |
| `--help`                     | Outputs brief usage documentation and supported command-line options.                                         | `kubectl api-resources --help`             |

## Examples

```bash
kubectl api-resources
```

> This queries the active API server and dumps a table of every core object and Custom Resource Definition (CRD) currently installed, detailing their name, shortnames, APIGROUP, namespaced status, and Kind.

```bash
kubectl api-resources --namespaced=false
```

> This filters the output to display exclusively cluster-scoped resources (such as `nodes`, `clusterroles`, and `persistentvolumes`). Attempting to pass a `-n` namespace flag to these resources in future commands will be ignored.

```bash
kubectl api-resources --api-group=networking.k8s.io
```

> This scopes the discovery audit strictly to the networking API group, revealing resources like `ingresses`, `networkpolicies`, and `ingressclasses` along with their accepted verbs.

```bash
kubectl api-resources -o name --verbs=delete
```

> This outputs a clean, raw list of fully qualified resource names (like `pods`, `deployments.apps`) strictly isolated to resources that the API server permits you to delete.

```bash
kubectl api-resources --sort-by=name
```

> This retrieves the API discovery document and sorts the terminal table alphabetically by the resource's plural `NAME` column, making visual scanning significantly easier on massive clusters.

## Real-World Scenarios

**Identifying Cluster-Scoped vs Namespace-Scoped Resources**

```bash
kubectl api-resources --namespaced=true -o name | xargs -I {} kubectl get {} -n target-ns
```

> Systems administrators performing deep audits on an orphaned namespace use this chained command to discover every possible namespaced resource type, and then query the namespace to ensure absolutely no obscure CRDs or orphaned config maps are left behind before deletion.

**Discovering Custom Operator Shortnames**

```bash
kubectl api-resources | grep istio
```

> Developers working in environments with complex Service Meshes (like Istio) run this command to identify the exact API groups and convenient CLI shortnames (e.g., `vs` for `virtualservices`, `dr` for `destinationrules`) required to manage custom networking objects without reading external documentation.

**Auditing Supported Resource Actions (Verbs)**

```bash
kubectl api-resources --verbs=patch,update
```

> Security engineers mapping attack surfaces query the API server to explicitly enumerate which resource types currently support modification verbs (`patch` or `update`), identifying potentially risky CRDs that might allow privilege escalation.

## When should it NOT be used?

- **Checking explicit field schemas within a resource:** **Reason:** `api-resources` only maps the top-level objects. It will not tell you if a `Pod` requires a `spec.containers.image` string. **Use instead:** `kubectl explain pod`.
- **Checking user authorization to perform actions:** **Reason:** Showing that a resource supports the `delete` verb means the _API_ supports it, not that your specific user RBAC token is authorized to execute it. **Use instead:** `kubectl auth can-i delete pods`.

## Alternatives

- **`kubectl api-versions`:** Lists raw API Group versions. **Tradeoff:** It simply outputs raw strings like `apps/v1` or `networking.k8s.io/v1`, whereas `api-resources` unpacks exactly what resources exist _inside_ those groups.
- **Querying `/apis` via `curl`:** Direct HTTP API discovery. **Tradeoff:** Pinging the raw discovery endpoints returns massive JSON hyperschema payloads. `kubectl api-resources` parses, deduplicates, and formats this payload perfectly for human terminal consumption.

## How it works internally

When you execute `kubectl api-resources`, the CLI does not query `etcd` or live object state. Instead, it performs an HTTP `GET` operation against the Kubernetes API Server's unauthenticated discovery endpoints, specifically the root `/api/v1` and `/apis` paths.

The API server aggregates data from the core control plane and any registered Extension API Servers (via APIService objects) or Custom Resource Definitions (CRDs). It constructs an `APIResourceList` JSON document containing metadata for every registered API type.

`kubectl` retrieves this JSON payload, caching it locally under `~/.kube/cache/discovery/` for exactly 10 minutes to minimize network latency on subsequent commands. The CLI then parses the `APIResourceList`, filters it according to your command-line flags (like `--namespaced`), and aligns the arrays into fixed-width terminal columns.

## Performance Notes

- On massive enterprise clusters with hundreds of complex Custom Resource Definitions (like Crossplane or OpenShift), hitting the API server to regenerate the discovery document can take several seconds. Relying on the local cache (`--cached`) accelerates automation scripts relying on discovery data.
- If an Extension API Server (like metrics-server) is currently unreachable, the discovery query will hang or print a warning indicating that incomplete data was returned.

## Security Notes

- **Unauthenticated Discovery:** In default Kubernetes configurations, the `/apis` discovery endpoints are accessible to any authenticated user (and sometimes unauthenticated users), enabling rapid cluster topology reconnaissance.
- **RBAC Independence:** The table displays all resources the cluster possesses, irrespective of the user's Role-Based Access Control (RBAC) permissions. Seeing a resource does not grant permission to read or modify it.

## Common Mistakes

- **Assuming output shows live objects:** Running `api-resources` and thinking you have Istio running because `virtualservices` appears. **Why it's wrong:** The command shows the _schema definitions_ installed on the cluster, not actual deployed object instances.
- **Confusing KIND with NAME:** Trying to run `kubectl get Deployment`. **Why it's wrong:** `kubectl` commands generally expect the plural `NAME` (e.g., `deployments`) or the `SHORTNAME` (`deploy`), whereas `KIND` (`Deployment`) is the uppercase string used internally inside YAML manifests. `api-resources` bridges this gap.
- **Filtering verbs thinking it checks permissions:** Running `--verbs=delete` to see what you can delete. **Why it's wrong:** This shows what the API endpoints technically accept. To check your personal permissions, you must use `kubectl auth can-i`.

## Best Practices

- When writing robust bash scripts intended to scrape cluster state, always use `kubectl api-resources -o name --no-headers` to generate a pure, parseable list of fully qualified strings.
- Whenever a third-party Helm chart or Operator is installed, run `kubectl api-resources --api-group=<new_group>` to immediately audit what new resource types were injected into the cluster schema.

## Interview Questions

**Q:** What is the technical difference between a cluster-scoped resource and a namespace-scoped resource, and how do you find out which is which?
**A:** A namespace-scoped resource (like Pods or Secrets) is logically partitioned inside a specific Namespace boundary; it requires a namespace context to be accessed. A cluster-scoped resource (like Nodes or PersistentVolumes) exists globally and cannot belong to a Namespace. You use `kubectl api-resources` and inspect the `NAMESPACED` column (true/false) to verify the scoping topology.
**Q:** How does `kubectl` know how to translate a shortname like `po` into a `Pod` query against the API server?
**A:** When `kubectl` initializes, it downloads the API discovery document (`APIResourceList`) from the `/apis` endpoint. This document contains a mapping array for each resource that explicitly lists its accepted `SHORTNAMES`. `kubectl` caches this list and translates `po` to `pods` locally before executing the HTTP request.
**Q:** If a cluster has a broken extension API server (e.g., a crashed metrics-server), what happens when you execute `kubectl api-resources`?
**A:** The core API server attempts to aggregate discovery data from all registered APIService endpoints. If an extension server is unreachable, the core API times out for that specific path. `kubectl` will output the resources it successfully discovered, but append a warning to standard error indicating that discovery failed for the specific broken API group.

## Practice Problems

**Problem:** Generate a clean list of fully qualified resource names (e.g., `pods`, `services`) for all resources that are explicitly cluster-scoped (not belonging to a namespace), ensuring no column headers pollute the output.
**Hint:** Combine the namespaced boolean flag, the specific name output format, and the no-headers flag.
**Solution:** `kubectl api-resources --namespaced=false -o name --no-headers`
**Problem:** Search the cluster to identify any API resources that belong to the `cert-manager.io` API group.
**Hint:** Use the explicit API group filtering flag.
**Solution:** `kubectl api-resources --api-group=cert-manager.io`

## References

- [Kubernetes Documentation - API Discovery Roles](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#discovery-roles)
- [Kubectl Reference - api-resources](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#api-resources)
