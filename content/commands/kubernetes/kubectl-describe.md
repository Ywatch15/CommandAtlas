---
slug: kubectl-describe
name: kubectl describe
aliases: []
category: kubernetes
tags:
  - kubernetes
  - k8s
  - troubleshooting
  - introspection
  - events
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
  - sh
intentPhrases:
  - show detailed kubernetes resource state
  - find why pod is pending
  - view kubernetes events
  - inspect node resources
  - troubleshoot k8s deployment
relatedCommands:
  - kubectl-get
  - kubectl-logs
  - kubectl-explain
  - kubectl-cordon
  - kubectl-rollout
  - kubectl-top
alternatives: []
status: draft
---
## What is it?

`kubectl describe` is an introspection and troubleshooting command that provides a deeply detailed, human-readable summary of one or more Kubernetes resources. Unlike `kubectl get`, which outputs raw system state, `describe` acts as an aggregator. It stitches together information from the target object, its associated child resources, and crucially, recent chronological cluster Events related to that object, painting a complete picture of its lifecycle and health.

## Why does it exist?

When a Kubernetes Pod fails to start, the raw JSON/YAML representation of the Pod rarely contains the plain-English reason for the failure. The error might be a scheduling conflict, a missing secret, or an ImagePullBackOff—data points managed by distinct cluster controllers. `kubectl describe` exists to eliminate the need for administrators to manually query multiple disparate APIs. It performs the heavy lifting of fetching the object, parsing its complex `.status` and `.conditions` arrays, and querying the separate Event API for warnings, formatting everything into an intuitive diagnostic dashboard directly in the terminal.

## Syntax

```bash
kubectl describe (-f FILENAME | TYPE [NAME_PREFIX | -l label]) [options]
```

## Flags

| Flag                     | Description                                                                                        | Example                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `-n`, `--namespace`      | Specifies the namespace of the resource to describe. Defaults to the active context's namespace.   | `kubectl describe pod api-123 -n prod`         |
| `-A`, `--all-namespaces` | Describes matching resources across all namespaces in the cluster. Highly verbose.                 | `kubectl describe ingress -A`                  |
| `-l`, `--selector`       | Describes all resources matching a specific label selector.                                        | `kubectl describe pods -l tier=backend`        |
| `-f`, `--filename`       | Describes the resource that matches the definition in a specified YAML/JSON file.                  | `kubectl describe -f deployment.yaml`          |
| `--show-events`          | Controls the display of the Events table at the bottom of the output. Defaults to `true`.          | `kubectl describe pod web --show-events=false` |
| `--chunk-size`           | Determines how many items are returned in a single API call when describing huge lists of objects. | `kubectl describe nodes --chunk-size=50`       |

## Examples

```bash
kubectl describe pod auth-service-7f8b9c-xyz
```

> The most critical debugging command in Kubernetes. Outputs the Pod's node assignment, internal IP, container port mappings, active state (e.g., Waiting, Running), requested CPU/Memory limits, volume mounts, and the chronological list of Events (e.g., `Scheduled -> Pulled Image -> Created Container -> Started`).

```bash
kubectl describe node worker-pool-01
```

> Acts as a cluster capacity planning tool. Describes the physical Node, but critically aggregates data from all Pods currently running on it. It outputs a summary table showing total allocated CPU and Memory requests/limits versus the Node's absolute capacity, instantly revealing resource starvation.

```bash
kubectl describe deployment/frontend
```

> Evaluates a workload controller. It outputs the scaling strategy (e.g., RollingUpdate max surge/unavailable), the current replica counts (Desired vs Updated vs Available), and lists the specific conditions (like `Progressing` or `Available`) that indicate if a deployment is currently stalled.

```bash
kubectl describe ingress main-router -n edge
```

> Introspects network routing rules. It parses the Ingress object and outputs a highly readable ASCII table matching exact hostnames and URL paths to their corresponding backend Services and port numbers, along with attached TLS certificates.

## Real-World Scenarios

**Diagnosing a CrashLoopBackOff**

```bash
kubectl describe pod crashing-worker
```

> When a pod is caught in a `CrashLoopBackOff`, `kubectl get` provides no context. The engineer runs `describe` and scrolls to the `Containers` section. They examine the `State` block, which reveals `Reason: Error` and `Exit Code: 137`, indicating an Out-Of-Memory (OOM) kill by the kernel. They then check the `Events` at the bottom, which confirms the Kubelet warning: `OOMKilled`.

**Investigating Unschedulable Pods**

```bash
kubectl describe pod massive-db-pod
```

> A pod is stuck indefinitely in the `Pending` state. The engineer describes the pod and looks directly at the `Events` section. They see an event generated by the `default-scheduler`: `Warning FailedScheduling: 0/10 nodes are available: 3 Insufficient memory, 7 node(s) had taint {node-role.kubernetes.io/master: }, that the pod didn't tolerate.` The exact architectural reason is instantly exposed.

## When should it NOT be used?

- **Extracting data for automation:** **Do not parse the output of `describe` with `grep` or `awk`.** The output is heavily formatted for humans and changes arbitrarily between Kubernetes versions. If a script needs the Pod's IP address, strictly use `kubectl get pod <name> -o jsonpath='{.status.podIP}'`.
- **Backing up configurations:** **Do not use `describe` to backup an object's state.** It omits extensive raw configuration data to remain readable. Always use `kubectl get <resource> -o yaml > backup.yaml` to capture the complete, reproducible declarative state.
- **Checking application errors:** `describe` shows _cluster-level_ events (e.g., the container runtime failed to pull an image). It does not show _application-level_ logs (e.g., a Python script throwing a syntax error). Use `kubectl logs` for application output.

## Alternatives

- **`kubectl get -o yaml`:** **Best for complete absolute truth.** While `describe` summarizes, `get -o yaml` outputs the raw, exact JSON/YAML representation stored in etcd, which is necessary when debugging complex annotations or custom resource definitions.
- **`kubectl events`:** **Best for cluster-wide forensics.** While `describe` filters events for a single object, `kubectl events` (or `kubectl get events`) dumps the chronological log of all actions across the entire namespace, excellent for spotting cascading failures.

## How it works internally

Unlike a simple `GET` request, `kubectl describe` is a complex client-side aggregator. The Kubernetes API server does not have a `/describe` endpoint.

When you execute `kubectl describe pod my-app`, the `kubectl` binary performs the following operations:

1.  **Primary Fetch:** It issues an HTTP GET request to fetch the raw JSON representation of the `my-app` Pod.
2.  **Event Fetch:** It issues a secondary HTTP GET request to the `/api/v1/events` endpoint, filtering the query specifically for events where `involvedObject.uid` matches the UID of the `my-app` Pod.
3.  **Relational Fetch:** Depending on the resource type, it may make further calls. For example, describing a Service causes `kubectl` to fetch the associated Endpoints object to display the backend IPs. Describing a Node fetches all Pods bound to that Node to calculate resource allocation.
4.  **Client-Side Rendering:** The `kubectl` binary passes these massive JSON payloads through a hardcoded, resource-specific Go template. It extracts timestamps, calculates durations (e.g., translating a timestamp into "15m ago"), formats memory bytes into Megabytes, formats the output into an ASCII structure, and prints it to the terminal.

## Performance Notes

- **API Server Load:** Because `describe` executes multiple API queries and aggregates data, describing massively populated resources (like `kubectl describe nodes` on a 1,000-node cluster) forces the API server to serialize and transmit hundreds of megabytes of JSON data to your CLI, which can cause significant CPU spikes on the control plane.
- **Event Expiration:** Kubernetes Events are ephemeral. By default, the API server purges events after 1 hour (to protect etcd from filling up). If a Pod crashed 3 hours ago, `kubectl describe` will output `<none>` in the Events section.

## Security Notes

- **RBAC Permissions:** Executing `describe` requires `get` and `list` permissions for the target resource. Crucially, to see the Events section, the user must also have `get` and `list` permissions for the `events` API resource.
- **Secret Masking:** When describing a Secret resource, `kubectl describe` deliberately refuses to print the base64-encoded payload values. It outputs the keys and the byte size of the payloads, ensuring that shoulder-surfers or screen-sharing sessions do not accidentally leak cryptographic material.

## Common Mistakes

- **Using `describe` to find out why a container crashed internally**
  - _Mistake:_ Describing a pod that says `CrashLoopBackOff` and being frustrated that the Events only say "Back-off restarting failed container", offering no clue as to _why_.
  - _Why:_ The cluster did its job perfectly—it started the container. The application _inside_ the container is what crashed. `describe` only talks to the cluster control plane. You must use `kubectl logs <pod>` to see the application's stderr/stdout to find the actual code exception.
- **Misinterpreting "No events found"**
  - _Mistake:_ Assuming a perfectly healthy, 5-day-old Pod is broken because the Events section is entirely empty.
  - _Why:_ Events are only retained for 60 minutes. A healthy Pod that hasn't changed state in 5 days will naturally have an empty event log. It is a sign of stability, not an error.

## Best Practices

- **Read the Conditions Array:** Before jumping to the Events section, always check the `Conditions` table in the describe output. Kubernetes controllers communicate their exact state machine logic here. A condition of `Ready: False` with a reason of `ContainersNotReady` instantly narrows down troubleshooting steps.
- **Combine with Selectors:** When dealing with Microservices, use `kubectl describe pods -l app=payment`. This aggregates the descriptions of all replica pods sequentially, making it easier to spot if only one specific node assignment is causing ImagePull failures across the fleet.

## Interview Questions

**Q: You deploy a new Pod, but `kubectl get pods` shows it is stuck in `ImagePullBackOff`. You run `kubectl describe pod`, scroll to the bottom, and read the Events. What specific information will you find there to help you fix the issue?**
**A:** The Events section will contain the exact error message returned by the container runtime (e.g., containerd or Docker) to the Kubelet. It will reveal if the failure is due to a network timeout, an authentication failure (e.g., `pull access denied`, meaning a missing ImagePullSecret), or a typo in the image tag (e.g., `manifest unknown`).

**Q: Why does running `kubectl describe secret my-secret` not show the actual passwords or tokens stored inside it, and how would you retrieve them?**
**A:** `kubectl describe` is designed for safe, human-readable introspection. It masks the values of Secrets to prevent accidental credential leakage in terminal buffers or logs. To extract the actual base64-encoded values, you must bypass the `describe` formatter and query the raw API object using `kubectl get secret my-secret -o yaml` or `-o jsonpath`.

## Practice Problems

**Problem:** You are investigating scheduling issues and want to see the detailed resource allocation (CPU and Memory requests/limits) for a worker node named `k8s-node-03`. Write the command to display this detailed view.
**Hint:** Use the command that aggregates Node and Pod data into a human-readable summary.
**Solution:**

```bash
kubectl describe node k8s-node-03
```

**Problem:** You have deployed a deployment named `auth-api` into the `security` namespace. You want to see the detailed status of this deployment, including its rolling update strategy and replica availability.
**Hint:** Specify the resource type, name, and explicitly declare the namespace.
**Solution:**

```bash
kubectl describe deployment auth-api -n security
```

## References

- [kubectl CLI Reference: describe](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#describe)
- [Application Introspection and Debugging](https://kubernetes.io/docs/tasks/debug/debug-application/)
