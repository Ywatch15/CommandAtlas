---
slug: kubectl-get
name: kubectl get
aliases: []
category: kubernetes
tags:
  - kubernetes
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
  - list kubernetes resources
  - show running pods
  - get kubernetes yaml
  - find kubernetes services
  - watch pod
relatedCommands:
  [
    kubectl-describe,
    kubectl-top,
    kubectl-api-resources,
    kubectl-cluster-info,
    kubectl-cordon,
    kubectl-edit,
    kubectl-label,
    kubectl-logs,
    kubectl-rollout,
    kubectl-taint,
  ]
alternatives: []
status: draft
---

## What is it?

`kubectl get` is the most frequently used command in the Kubernetes ecosystem. It queries the Kubernetes API server to retrieve and list one or more resources (such as Pods, Nodes, Services, or Custom Resources). By default, it outputs a human-readable, tabular summary of the resources' critical status metrics. With formatting flags, it serves as a powerful extraction tool, dumping the raw, absolute declarative state (YAML/JSON) of any object in the cluster.

## Why does it exist?

Kubernetes operates on a declarative control loop, constantly attempting to reconcile the current state of infrastructure with the desired state defined by administrators. Operators require immediate, real-time visibility into this reconciliation process. `kubectl get` exists to fulfill this foundational observability requirement. It abstracts the complex, paginated REST API calls required to interrogate `etcd` (the cluster's backing datastore), providing a unified interface to list fleet inventories, monitor rolling deployment statuses, and extract declarative configurations for infrastructure-as-code synchronization.

## Syntax

```bash
kubectl get [(-o|--output=)json|yaml|wide|custom-columns=...] (TYPE[.VERSION][.GROUP] [NAME | -l label] | TYPE[.VERSION][.GROUP]/NAME ...) [flags]
```

## Flags

| Flag                     | Description                                                                                                      | Example                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `-n`, `--namespace`      | Targets a specific namespace. If omitted, queries the namespace configured in the active context.                | `kubectl get pods -n kube-system`                         |
| `-A`, `--all-namespaces` | Broadens the query to list matching resources across every single namespace in the entire cluster.               | `kubectl get deployments -A`                              |
| `-o`, `--output`         | Transforms the output format. Accepts `yaml`, `json`, `wide` (extra columns), `jsonpath`, or `custom-columns`.   | `kubectl get svc -o yaml`                                 |
| `-w`, `--watch`          | Keeps the connection open and streams real-time updates to the terminal whenever the resource's state changes.   | `kubectl get pods -w`                                     |
| `-l`, `--selector`       | Filters the list to return only resources that match a specific label or set of labels.                          | `kubectl get pods -l app=frontend,env=prod`               |
| `--show-labels`          | Appends a column to the standard table output displaying all key-value labels attached to each resource.         | `kubectl get nodes --show-labels`                         |
| `--sort-by`              | Sorts the tabular output based on a specified JSONPath field (e.g., sorting pods by creation timestamp or name). | `kubectl get pods --sort-by=.metadata.creationTimestamp`  |
| `--field-selector`       | Filters results using server-side logic based on specific resource fields (e.g., finding all non-running pods).  | `kubectl get pods --field-selector status.phase!=Running` |

## Examples

```bash
kubectl get pods
```

> The universal health check. Lists all Pods in the current namespace, displaying their Name, Ready status (e.g., `1/1`), execution Status (e.g., `Running`, `CrashLoopBackOff`), Restart count, and Age.

```bash
kubectl get deployment my-app -o yaml
```

> The extraction pattern. Bypasses the summary table and commands the API server to return the complete, unadulterated YAML specification of the `my-app` Deployment. This is heavily used to inspect annotations or export configurations into Git repositories.

```bash
kubectl get nodes -o wide
```

> Expands the default view. The `-o wide` flag instructs the server to include additional, highly useful columns that are normally hidden to save space. For nodes, it reveals the Internal/External IP addresses, OS Image, Kernel Version, and Container Runtime version.

```bash
kubectl get pods -A --field-selector status.phase=Failed
```

> A surgical cluster audit. It queries every namespace (`-A`), but relies on the API server (`--field-selector`) to exclusively return Pods that have permanently failed. This minimizes the data transmitted over the network compared to fetching all pods and filtering with `grep`.

```bash
kubectl get secrets my-secret -o jsonpath='{.data.password}' | base64 --decode
```

> Advanced programmatic extraction. Uses `-o jsonpath` to navigate the complex JSON structure of a Kubernetes Secret, targeting exclusively the encrypted `password` value. It then pipes that raw string directly into the `base64` utility for immediate decryption.

## Real-World Scenarios

**Monitoring Rolling Deployments**

```bash
kubectl get pods -l app=payment-api -w
```

> After applying an image update to a Deployment, an SRE uses the `-w` (watch) flag combined with a label selector. The terminal blocks and prints new lines in real-time as the old pods transition to `Terminating` and the new pods transition from `Pending` -> `ContainerCreating` -> `Running`, providing instant visual confirmation of a successful zero-downtime rollout.

**Generating Custom Auditing Reports**

```bash
kubectl get pods -A -o custom-columns="NAMESPACE:.metadata.namespace,POD:.metadata.name,IMAGE:.spec.containers[*].image"
```

> A security engineer needs an inventory of every Docker image currently executing across the entire cluster to cross-reference against a CVE vulnerability database. They use `custom-columns` to construct a bespoke, comma-aligned table extracting exactly the Namespace, Pod name, and Image arrays, perfectly formatted for automated parsing.

## When should it NOT be used?

- **Debugging internal application logic:** **Do not use `get` to find out why a container crashed.** `kubectl get pods` will show `CrashLoopBackOff`, but it hides the _reason_. You must use `kubectl describe pod` to view the Kubelet events, or `kubectl logs` to view the application's actual exception traces.
- **Checking real-time CPU/Memory usage:** `kubectl get` only shows the declarative _requests and limits_ defined in the YAML. It does not show real-time utilization metrics. To see actual RAM and CPU consumption, use `kubectl top pods` or `kubectl top nodes`.

## Alternatives

- **`k9s`:** **Best for daily operations.** A powerful, ncurses-based terminal UI that constantly polls `get` commands in the background, allowing administrators to visually navigate, filter, and dive into resources using arrow keys instead of typing lengthy CLI commands.
- **Lens / Octant:** **Best for graphical visualization.** Electron-based desktop applications that provide rich, real-time dashboards of cluster state, heavily reducing the cognitive load of memorizing `kubectl get` JSONPath syntax.

## How it works internally

`kubectl get` relies strictly on the standard HTTP `GET` methods of the Kubernetes REST API.

When you run `kubectl get pods`, the CLI sends an HTTP GET request to `/api/v1/namespaces/{namespace}/pods`.

Historically, the API server would return a massive JSON payload containing the full specification of every single Pod. The `kubectl` CLI would then parse this massive JSON blob client-side to construct the human-readable ASCII table. This was incredibly inefficient for large clusters.

Modern Kubernetes utilizes **Server-Side Printing**. When `kubectl get` sends the HTTP request, it sets the `Accept` header to `application/json;as=Table`. The API server receives this, looks up the Pods in `etcd`, and internally formats the data into a highly compact `Table` structure containing only the requested columns (Name, Ready, Status, Restarts, Age). It transmits this tiny tabular payload back to the client, drastically reducing network bandwidth and client-side CPU overhead.

If you specify `-o yaml` or `-o json`, `kubectl` omits the `as=Table` header. The API server returns the full, raw, multi-megabyte JSON dump from `etcd`, which the CLI then translates to YAML or prints directly to the terminal.

When using `-w` (watch), `kubectl` establishes a long-lived chunked HTTP connection (utilizing the `?watch=true` API parameter). The API server keeps this connection open and pushes a new JSON payload down the pipe the absolute millisecond the object's state changes in `etcd`.

## Performance Notes

- **Pagination Limitations:** If you run `kubectl get pods -A` on a cluster with 50,000 Pods, returning the data in a single HTTP request would crash the API server's memory. The `kubectl` client automatically handles this by requesting data in "chunks" (defaulting to 500 items per request). You may notice a slight delay as the CLI transparently stitches these paginated API responses together before rendering the final table.
- **Client-Side Sorting Overhead:** If you use `--sort-by`, the API server does _not_ sort the data. It sends the entire payload to the `kubectl` client, which must buffer the entire list in your local workstation's RAM, sort it mathematically, and then print it. Sorting massive datasets client-side can be exceptionally slow.

## Security Notes

- **RBAC Discovery Mitigation:** `kubectl get` is subject to strict Role-Based Access Control (RBAC). If a developer attempts `kubectl get pods -A` but only has permissions in the `frontend` namespace, the API server will return an HTTP 403 Forbidden error, preventing them from even discovering the names of resources in other namespaces.
- **Secret Exposure:** Running `kubectl get secret <name>` produces a summary table that safely hides the secret values. However, appending `-o yaml` fetches the raw object, exposing the base64-encoded passwords and API keys in plain text on your screen. Always be mindful of your screen-sharing status when outputting raw YAML.

## Common Mistakes

- **Relying on client-side `grep` instead of selectors**
  - _Mistake:_ Running `kubectl get pods -A | grep "Evicted"` to find failed pods.
  - _Why:_ This forces the API server to serialize the data for 10,000 pods and transmit them over the network, only for your local `grep` command to discard 9,990 of them. This wastes massive cluster resources. Always use server-side filtering: `kubectl get pods -A --field-selector status.phase=Failed`.
- **Confusing `NAME` with `TYPE/NAME`**
  - _Mistake:_ Wanting to see a service and a pod, running `kubectl get pod,svc my-app`.
  - _Why:_ The CLI interprets this as "Get pods and services that are specifically named 'my-app'". If the service is named `my-app-svc`, it won't be found. To retrieve multiple specific, distinct resources simultaneously, use the `TYPE/NAME` format: `kubectl get pod/my-app svc/my-app-svc`.

## Best Practices

- **Master JSONPath:** Learning the `-o jsonpath` syntax transforms `kubectl get` from an observation tool into a powerful automation engine. Being able to extract precise arrays and strings dynamically eliminates the need for brittle `awk`/`sed` parsing in shell scripts.
- **Use `api-resources` for Discovery:** If you forget the exact command type for a resource (e.g., is it `certificaterequests` or `certrequest`?), do not guess. Run `kubectl api-resources | grep cert`. This command asks the API server for a definitive dictionary of every Resource and its Shortnames (e.g., `po` for pods, `svc` for services) available on the cluster.

## Interview Questions

**Q: You want to retrieve a list of all deployments in the cluster, but you only want the API server to return deployments that have the label `env=production`. How do you construct this query efficiently?**
**A:** You must use the label selector flag combined with the all-namespaces flag. The most efficient, server-side filtered command is `kubectl get deployments -A -l env=production`.

**Q: Explain the architectural difference between running `kubectl get pods` and `kubectl get pods -o yaml` in terms of how the API server processes the request.**
**A:** When running the default `kubectl get pods`, modern `kubectl` clients use "Server-Side Printing." They request the data in a `Table` format. The API server computes the specific columns (Name, Status, Age) and transmits a highly compact, lightweight payload. When you append `-o yaml`, the client requests the raw, absolute state. The API server skips the table transformation and transmits the massive, complete JSON payload from `etcd`, which `kubectl` then converts to YAML client-side.

## Practice Problems

**Problem:** You are monitoring a rolling update for a deployment. Write a command to display the pods in the current namespace, appending a column showing their assigned IP addresses, and keep the terminal open to continuously stream updates as their statuses change.
**Hint:** Combine the output formatting flag for extra columns with the watch flag.
**Solution:**

```bash
kubectl get pods -o wide -w
```

**Problem:** You are writing a backup script. You need to dump the complete, raw configuration of a ConfigMap named `app-settings` in the `backend` namespace directly into a file named `backup.yaml`. Write the command.
**Hint:** Use the namespace flag, output the raw declarative format, and use standard bash file redirection.
**Solution:**

```bash
kubectl get configmap app-settings -n backend -o yaml > backup.yaml
```

## References

- [kubectl CLI Reference: get](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get)
- [JSONPath Support in Kubernetes](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
