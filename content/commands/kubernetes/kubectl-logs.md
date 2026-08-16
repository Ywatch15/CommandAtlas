---
slug: kubectl-logs
name: kubectl logs
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - logging
  - debugging
  - stdout
  - observability
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
  - view pod logs
  - tail kubernetes container output
  - check deployment logs k8s
  - read previous crashed pod logs
  - stream container stdout
relatedCommands:
  - kubectl-describe
  - kubectl-exec
  - kubectl-top
  - kubectl-get
  - kubectl-port-forward
alternatives: []
status: draft
---
## What is it?

`kubectl logs` is an essential diagnostic utility that retrieves and prints the standard output (`stdout`) and standard error (`stderr`) streams from a container running inside a Kubernetes Pod. It provides immediate observability into application execution, error traces, and health check output without requiring SSH access to the underlying worker node.

## Why does it exist?

In containerized environments, applications are isolated across distributed nodes. Traditional Linux debugging—logging into a server and tailing `/var/log/syslog`—is impossible and anti-pattern in Kubernetes. Applications write logs to standard output, which the container runtime captures and stores locally. `kubectl logs` exists to provide a centralized, secure API gateway, bridging the gap between the developer's terminal and the distributed, ephemeral container logs isolated deep within the cluster infrastructure.

## Syntax

```bash
kubectl logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER] [options]
```

## Flags

| Flag                       | Description                                                                                  | Example                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `-f`, `--follow`           | Streams the logs continuously in real-time, functioning exactly like `tail -f`.              | `kubectl logs -f pod-name`                                  |
| `-c`, `--container <name>` | Targets a specific container inside a multi-container pod.                                   | `kubectl logs pod-name -c sidecar`                          |
| `--all-containers`         | Aggregates and prints the logs from all containers residing inside the targeted pod.         | `kubectl logs pod-name --all-containers`                    |
| `-p`, `--previous`         | Retrieves logs for the _previously_ terminated container instance (crucial for crash loops). | `kubectl logs -p pod-name`                                  |
| `--tail <lines>`           | Restricts output to the specified number of most recent log lines (default is all lines).    | `kubectl logs pod-name --tail 50`                           |
| `--since <time>`           | Returns logs generated only within a relative time window (e.g., `5m`, `1h`).                | `kubectl logs pod-name --since=10m`                         |
| `--since-time <date>`      | Returns logs generated after a specific RFC3339 absolute timestamp.                          | `kubectl logs pod-name --since-time="2026-08-16T12:00:00Z"` |
| `-l`, `--selector <sel>`   | Aggregates logs from all pods that match a specific label selector.                          | `kubectl logs -l app=nginx`                                 |
| `--timestamps`             | Prepends an RFC3339 network timestamp to every log line printed to the terminal.             | `kubectl logs pod-name --timestamps`                        |
| `--limit-bytes <bytes>`    | Restricts the total byte payload downloaded from the API server (useful for massive files).  | `kubectl logs pod-name --limit-bytes=500000`                |
| `-n`, `--namespace <ns>`   | Targets a pod situated within a specific logical namespace boundary.                         | `kubectl logs api-pod -n production`                        |

## Examples

```bash
kubectl logs my-database-pod-0
```

> This fetches the entire available log history (standard output and standard error) for the specified pod. If the log file is extremely large, this will dump megabytes of text to the terminal instantly.

```bash
kubectl logs -f deployment/frontend-app --tail 20
```

> This targets a higher-level resource (a Deployment) rather than a specific pod, retrieves the last 20 lines of output, and continuously streams (`-f`) newly generated logs to the terminal in real time.

```bash
kubectl logs -p crashloop-pod
```

> This utilizes the previous flag (`-p`) to retrieve the logs of the container instance that crashed and terminated prior to the current running instance. This is the definitive way to debug `CrashLoopBackOff` errors.

```bash
kubectl logs -l tier=backend --all-containers --max-log-requests=10
```

> This queries the API for logs spanning across multiple pods that match the `tier=backend` label, explicitly requesting output from every container inside those pods, aggregating them into a single stream.

```bash
kubectl logs api-pod -c istio-proxy --since=15m --timestamps
```

> This explicitly extracts logs from the `istio-proxy` sidecar container (ignoring the primary application container), restricts the query to the last 15 minutes, and prepends precise API server timestamps to every line.

## Real-World Scenarios

**Post-Mortem Crash Analysis**

```bash
kubectl logs my-failing-pod -p > crash-report.txt
```

> When an application throws an Out Of Memory (OOM) or segmentation fault and restarts, the current logs only show the fresh boot sequence. Developers use `-p` to dump the traceback from the dead container instance to a local file for root cause analysis.

**Live Tail Troubleshooting**

```bash
kubectl logs -f -l app=payment-processor --since=1m
```

> Operations teams debugging a live transaction issue use a label selector combined with `-f` to aggregate real-time log streams from across all horizontal replicas of the payment microservice simultaneously, verifying traffic flow.

**Auditing Ephemeral Job Output**

```bash
kubectl logs job/database-migration
```

> CI/CD pipelines executing asynchronous database migrations via Kubernetes `Job` objects invoke this command to extract the final success or failure output from the ephemeral worker pod before deleting the Job resource.

## When should it NOT be used?

- **Long-term, historical log retention and querying:** **Reason:** `kubectl logs` only reads the ephemeral log files stored on the worker node's disk. If the pod is deleted or the node rotates the log file due to size, the logs are permanently gone. **Use instead:** A centralized log aggregator (Elasticsearch, Loki, Splunk).
- **Tracking application logs written to custom files inside the container:** **Reason:** Docker and Kubernetes only capture streams written to `stdout` and `stderr`. If your legacy app logs to `/var/log/app.log` internally, `kubectl logs` will return nothing. **Use instead:** `kubectl exec` to `cat` the file, or symlink the file to `/dev/stdout` in the Dockerfile.

## Alternatives

- **`stern`:** Open-source multi-pod log tailer. **Tradeoff:** `stern` vastly improves upon `kubectl logs` for multi-pod scenarios by automatically color-coding log streams by pod name and dynamically attaching to new pods as they scale up, whereas `kubectl` is rigid.
- **`k9s`:** Terminal UI for Kubernetes. **Tradeoff:** `k9s` provides an interactive, navigable interface for viewing logs, wrapping `kubectl logs` in a highly searchable visual buffer.

## How it works internally

When you execute `kubectl logs`, the CLI establishes an HTTPS connection to the Kubernetes API server and submits a `GET` request to the pod's subresource endpoint (e.g., `/api/v1/namespaces/default/pods/my-pod/log`).

The API server authenticates the request and identifies which physical worker node is hosting the pod. It then acts as a proxy, forwarding the request directly to the `Kubelet` daemon running on that specific node via port 10250.

The Kubelet interacts with the underlying Container Runtime Interface (CRI) (such as `containerd` or `CRI-O`). The runtime reads the physical JSON log files stored on the node's disk (typically located in `/var/log/containers/`). It reads the log entries, streams them back to the Kubelet, which proxies them to the API server, which ultimately streams them over the HTTP connection back to your `kubectl` terminal. If `-f` (follow) is used, this TCP connection is kept alive, continuously flushing new byte streams as they are appended to the node's disk.

## Performance Notes

- Executing `kubectl logs` without `--tail` on a pod that has been running for months and outputting gigabytes of text will lock up your terminal and consume heavy network bandwidth as the API server proxies massive data streams.
- Log rotation is managed by the Kubelet. If an application spams logs excessively, the Kubelet will rotate and eventually delete old log fragments, meaning `kubectl logs` will only display the most recent preserved chunk.

## Security Notes

- **Sensitive Data Leakage:** Because standard output is captured identically for all containers, developers inadvertently logging plaintext passwords, PII, or API tokens to `stdout` expose them to anyone with `get pods/log` RBAC permissions in that namespace.
- **RBAC Restrictions:** Reading logs requires explicit authorization. An administrator can grant users permission to `list` and `get` Pods without granting them access to the `/log` subresource, effectively blinding them to application output while allowing them to see cluster status.

## Common Mistakes

- **Missing the container flag in multi-container pods:** Running `kubectl logs my-pod` when an Istio sidecar is present. **Why it's wrong:** The API server doesn't know which container's logs you want. It throws an error: `a container name must be specified`. You must append `-c <container_name>`.
- **Expecting `kubectl logs` to work after pod deletion:** Deleting a pod and then trying to fetch its logs. **Why it's wrong:** Once a pod object is deleted from the API server, the Kubelet deletes the physical log files from the node. The logs are irrecoverable unless captured by an external logging agent.
- **Confusing `-p` (previous) with historical time queries:** Using `-p` to see logs from yesterday. **Why it's wrong:** `-p` strictly retrieves logs for the _previously crashed/restarted container instance_ of the current pod. To filter by time on the current instance, use `--since-time`.

## Best Practices

- Always structure your containerized applications to log exclusively to `stdout` and `stderr`. Never write to local filesystem files, ensuring full compatibility with `kubectl logs` and native cluster fluentd/Loki scrapers.
- Universally use `--tail 100` (or similar) when blindly querying unknown pods to prevent terminal buffer overflows and API server stress.
- Use the `--timestamps` flag when correlating application errors against external events (like cloud database failovers), as container runtimes often strip internal timestamps to save space.

## Interview Questions

- **Q:** You have a Pod named `api-server` that contains both the main application container and an Envoy sidecar proxy. How do you tail the logs for just the main application?
  - **A:** Because the pod has multiple containers, `kubectl logs` will fail without explicit direction. You must use the `-c` flag to specify the target. The command would be `kubectl logs -f api-server -c <main_app_container_name>`.
- **Q:** A pod is stuck in a `CrashLoopBackOff` state. When you run `kubectl logs`, you only see a single line saying "Starting up...", but no errors. How do you find out why it actually crashed?
  - **A:** The standard `logs` command only shows the output of the _currently_ executing container instance, which is stuck in its initialization phase before crashing. To see the stack trace that caused the failure, you must append the `-p` (previous) flag: `kubectl logs -p <pod_name>`, which retrieves the logs of the terminated container instance.
- **Q:** Walk through the architectural path a log line takes from the moment an application writes it to `stdout` until it appears on your terminal via `kubectl logs`.
  - **A:** The application writes to `stdout`. The Container Runtime (e.g., containerd) captures this stream and writes it to a physical JSON-formatted log file on the worker node's disk. When `kubectl logs` is executed, the request goes to the API server, which proxies the request to the Kubelet on that specific node. The Kubelet reads the log file from disk and streams it back through the API server to the developer's terminal.

## Practice Problems

- _Problem:_ Retrieve the logs for a pod named `auth-worker-99`, but restrict the output to only the logs generated within the last 30 minutes, and append precise network timestamps to the lines.
  - _Hint:_ Combine the relative time flag with the timestamp enablement flag.
  - _Solution:_ `kubectl logs auth-worker-99 --since=30m --timestamps` (This filters the proxy stream temporally and enriches the output format).
- _Problem:_ Continuously stream the aggregated logs from all containers across all pods in the `production` namespace that bear the label `tier=database`.
  - _Hint:_ Combine the follow flag, label selector, all-containers flag, and target namespace.
  - _Solution:_ `kubectl logs -f -l tier=database --all-containers -n production` (This leverages the API server to multiplex multiple node streams into a unified console tail).

## References

- [Kubernetes Documentation - Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Kubectl Reference - logs](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs)
  