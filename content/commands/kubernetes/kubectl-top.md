---
slug: kubectl-top
name: kubectl top
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - metrics
  - cpu
  - memory
  - monitoring
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
  - check pod memory usage
  - view kubernetes cpu metrics
  - monitor node resources k8s
  - find pods using most ram
  - check cluster utilization top
relatedCommands: [kubectl-get, kubectl-describe, kubectl-logs]
alternatives: []
status: draft
---

## What is it?

`kubectl top` is a diagnostic command-line utility used to display current resource consumption metrics—specifically CPU and Memory utilization—for Kubernetes Nodes and Pods. It acts as the cluster-native equivalent to the Linux `top` command, querying the control plane for instantaneous point-in-time performance data to identify overloaded hardware or resource-leaking applications.

## Why does it exist?

While enterprise Kubernetes environments utilize complex, historical observability stacks (like Prometheus, Grafana, and Datadog), operators and developers frequently require immediate, ad-hoc insight into cluster health without leaving their terminal. `kubectl top` exists to bridge this gap, providing a frictionless, zero-configuration mechanism to check whether a specific node is CPU-bound or a misbehaving pod is triggering Out Of Memory (OOM) alerts.

## Syntax

```bash
kubectl top (node | pod) [NAME] [options]
```

## Flags

| Flag / Command           | Description                                                                                     | Example                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `node`                   | Subcommand to display resource utilization across the underlying physical/virtual worker nodes. | `kubectl top node`                        |
| `pod`                    | Subcommand to display resource utilization for individual pods.                                 | `kubectl top pod`                         |
| `-n, --namespace <ns>`   | (Pod only) Restricts the metric query to pods residing in a specific namespace.                 | `kubectl top pod -n production`           |
| `-A, --all-namespaces`   | (Pod only) Retrieves and displays resource metrics for pods across the entire cluster.          | `kubectl top pod -A`                      |
| `--containers`           | (Pod only) Breaks down the pod-level metrics to show utilization for each individual container. | `kubectl top pod my-app --containers`     |
| `--sort-by <field>`      | Sorts the resulting table by the specified metric field (`cpu` or `memory`).                    | `kubectl top pod --sort-by=memory`        |
| `-l, --selector <sel>`   | Filters the requested metrics based on a specific label selector match.                         | `kubectl top pod -l tier=backend`         |
| `--sum`                  | (Pod only) Appends a final row to the terminal output summing up the total CPU and memory used. | `kubectl top pod -l app=nginx --sum`      |
| `--no-headers`           | Strips the column headers from the terminal output, facilitating shell script parsing.          | `kubectl top node --no-headers`           |
| `--use-protocol-buffers` | Forces the use of Protobufs instead of JSON for API communication (improves speed).             | `kubectl top node --use-protocol-buffers` |

## Examples

```bash
kubectl top node
```

> This queries the metrics API and outputs a table of all worker nodes in the cluster, displaying their raw CPU core usage, CPU percentage, raw memory byte usage, and memory percentage relative to the node's total capacity.

```bash
kubectl top pod -n kube-system
```

> This queries all active pods residing specifically in the `kube-system` namespace, showing the raw millicore (m) CPU and Mebibyte (Mi) RAM consumption for each pod.

```bash
kubectl top pod --all-namespaces --sort-by=memory
```

> This retrieves metrics for every single pod executing across the entire cluster and sorts them in descending order based on RAM utilization, making it incredibly easy to identify applications suffering from severe memory leaks.

```bash
kubectl top pod api-gateway-01 --containers
```

> Instead of displaying the aggregate total for the pod, this splits the metrics down to the container level. If the `api-gateway-01` pod contains both an Nginx container and a Fluentd logging sidecar, this command displays the exact resource footprint of each distinct container.

```bash
kubectl top pod -l role=worker --sum
```

> This isolates metrics strictly to pods matching the `role=worker` label and utilizes the `--sum` flag to attach a cumulative total row at the bottom, providing a fast calculation of the entire fleet's resource footprint.

## Real-World Scenarios

**Diagnosing CPU Throttling and Node Starvation**

```bash
kubectl top node --sort-by=cpu
```

> Systems administrators experiencing severe cluster latency execute this command to instantly isolate nodes hitting 99% CPU utilization. Once identified, they can cordon the node or investigate the specific workloads causing noisy-neighbor contention.

**Identifying Memory Leaks Resulting in OOMKills**

```bash
watch -n 5 kubectl top pod payment-processor-8b -n prod
```

> Developers troubleshooting erratic container restarts wrap `kubectl top` in the Linux `watch` utility. This creates a crude real-time dashboard reflecting the pod's memory consumption over time, allowing them to visually observe the RAM continuously climbing until the kernel throws an OOMKill.

**Evaluating Resource Request/Limit Efficiency**

```bash
kubectl top pod auth-service --containers
```

> Cloud optimization engineers compare the live runtime utilization output of `kubectl top` against the hardcoded `requests` and `limits` defined in the pod's YAML manifest to right-size configurations, slashing wasted cloud compute costs.

## When should it NOT be used?

- **Historical trend analysis:** **Reason:** `kubectl top` exposes instantaneous, ephemeral metrics. It maintains zero historical state. You cannot see what a pod's CPU usage was yesterday at 2:00 PM. **Use instead:** Grafana dashboards backed by Prometheus.
- **When the `metrics-server` is not installed:** **Reason:** `kubectl top` is a lightweight frontend wrapper; it entirely depends on the `metrics-server` API addon being deployed in the cluster. Without it, the command throws a fatal API error.

## Alternatives

- **Prometheus / Grafana:** Enterprise observability. **Tradeoff:** Requires massive infrastructure overhead, persistent storage, and complex querying languages (PromQL), but provides unparalleled historical correlation and alerting capabilities that `top` entirely lacks.
- **`k9s`:** Terminal UI wrapper. **Tradeoff:** Integrates `kubectl top` functionality into a continuous, interactive, visually sortable dashboard interface directly within the terminal, drastically improving debugging ergonomics compared to static command executions.

## How it works internally

Unlike native `kubectl get` commands which query `etcd` state, `kubectl top` queries dynamic ephemeral data routed through a specialized extension API mechanism.

Every worker node in a Kubernetes cluster runs an embedded agent called **cAdvisor** (Container Advisor) integrated directly into the `Kubelet`. cAdvisor continuously monitors the Linux `cgroups` (control groups) holding the containers, tracking exact CPU cycle accounting and physical memory page usage at the kernel hardware level.

To expose this to `kubectl`, a cluster must install the **Metrics Server** addon. The Metrics Server continuously polls the Kubelet on every node (via port 10250), scrapes the raw cAdvisor metrics, aggregates them into memory, and exposes an Extension API Server endpoint at `/apis/metrics.k8s.io/v1beta1/`.

When you execute `kubectl top`, the CLI makes an HTTP `GET` request to this `metrics.k8s.io` endpoint. The API server proxies the request to the active Metrics Server deployment, which returns the aggregated JSON payload. `kubectl` then parses this data, computes node percentages (if requested), and aligns the terminal columns for rendering.

## Performance Notes

- `kubectl top` metrics operate on a resolution delay (typically 15 to 60 seconds). A sudden CPU spike taking 2 seconds will likely not appear in `kubectl top` output due to the Metric Server's scraping intervals.
- The `--sort-by` operation is performed client-side by `kubectl` after downloading the entire JSON payload from the Metrics Server. Sorting tens of thousands of pods across a massive cluster will cause brief client-side terminal lag.

## Security Notes

- **RBAC Discovery Constraints:** Accessing `kubectl top pod` requires authorization against the specific `metrics.k8s.io` API group for the targeted namespace. Restricting this access prevents multi-tenant users from observing the operational signatures (CPU behavior) of neighboring applications.
- **Denial of Service (DoS):** Aggressive automated scripts running `kubectl top pod -A` every second can severely overload the Metrics Server pod's CPU capacity, causing the extension API to timeout and breaking the cluster's HorizontalPodAutoscalers (which rely on the exact same metric data stream).

## Common Mistakes

- **Metrics Server Not Found Error:** Running `kubectl top node` on a fresh cluster (like raw Kubeadm or Minikube) and getting `error: Metrics API not available`. **Why it's wrong:** The Metrics Server is an optional addon; it is not bundled into the core control plane by default. You must install the `metrics-server` YAML manifests before the command functions.
- **Confusing Millicores (m) with Megabytes (M):** Reading `100m` in the CPU column and assuming the application is using 100 Megabytes of CPU. **Why it's wrong:** `m` stands for _millicores_ (1/1000th of a single CPU core). `100m` means the pod is utilizing exactly 10% of a single physical processing core.
- **Ignoring Java/JVM internal memory allocation:** Running `kubectl top pod` and seeing a Java app using 2Gi of RAM, while internal JVM tools show 500MB. **Why it's wrong:** `kubectl top` queries kernel `cgroups`, which reports the entire Resident Set Size (RSS) memory footprint allocated by the OS, including unused JVM heap reservations and page caches, not just active garbage-collected application objects.

## Best Practices

- Incorporate `kubectl top pod --containers` when debugging complex architectures like Istio or Linkerd to differentiate whether the heavy CPU load is originating from your application code or from the network proxy sidecar.
- Alias `kubectl top pod -A --sort-by=cpu | head -n 10` in your bash profile for an instant, system-wide "noisy neighbor" reconnaissance tool during emergency triage.
- Understand that `kubectl top` measures absolute hardware usage, but Kubernetes scheduling relies on declarative `requests`. High usage on a node in `top` does not necessarily mean the scheduler views the node as "full" if the pods were deployed without request boundaries.

## Interview Questions

**Q:** You run `kubectl top pod` on a newly spun up Kubernetes cluster and receive an error stating that the Metrics API is unavailable. What core architectural component is missing, and why is it not there by default?
**A:** The cluster is missing the **Metrics Server** addon. Kubernetes core architecture separates cluster state management (etcd/API server) from ephemeral performance telemetry. The core API server does not process or store cAdvisor metrics natively. An extension API server (the Metrics Server) must be deployed separately to scrape the Kubelets and expose the `metrics.k8s.io` endpoint that `kubectl top` relies upon.
**Q:** When you execute `kubectl top pod <name>`, where exactly does the data originate from on the worker node?
**A:** The data originates from the Linux Kernel's `cgroups` (control groups) accounting mechanism. The `cAdvisor` agent embedded directly inside the worker node's `Kubelet` reads these low-level kernel metrics, which are then scraped over the network by the centralized Metrics Server deployment to serve the CLI request.
**Q:** A pod manifests displays `150m` in the CPU column of the `kubectl top` output. Translate what this metric physically represents regarding hardware consumption.
**A:** The `m` denotes "millicores". One entire physical or virtual CPU core equals `1000m`. Therefore, `150m` indicates that the pod is currently consuming the equivalent of 15% of the compute cycle time of a single processing core.

## Practice Problems

**Problem:** Identify the single pod in the `production` namespace that is currently consuming the highest amount of system memory (RAM).
**Hint:** Combine the top command for pods with the namespace flag and the specific metric sorting flag.
**Solution:** `kubectl top pod -n production --sort-by=memory` (The pod at the very top of the output table is the highest memory consumer).
**Problem:** Query the resource metrics for a specific pod named `batch-job-xyz` and display the breakdown of CPU and Memory consumption for each individual container running inside that pod.
**Hint:** Target the specific pod name and append the explicit containers flag.
**Solution:** `kubectl top pod batch-job-xyz --containers` (This shifts the output from an aggregate pod total to discrete rows for each internal container).

## References

- [Kubernetes Documentation - Tools for Monitoring Compute, Storage, and Network Resources](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [Kubectl Reference - top](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top)
