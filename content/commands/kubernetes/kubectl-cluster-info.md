---
slug: kubectl-cluster-info
name: kubectl cluster-info
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - discovery
  - networking
  - debugging
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
  - check kubernetes api endpoint
  - find kubernetes control plane url
  - verify coredns is running
  - dump cluster state information
  - view cluster network topology
relatedCommands: [kubectl-config, kubectl-api-resources, kubectl-get]
alternatives: []
status: draft
---

## What is it?

`kubectl cluster-info` is a lightweight diagnostic command used to display the network endpoint addresses of the core Kubernetes Control Plane (API server) and essential cluster add-ons (such as CoreDNS or KubeDNS). It provides immediate verification that the local `kubectl` client can successfully route traffic to and authenticate with the target cluster.

## Why does it exist?

When a developer or administrator provisions a new cluster or switches kubeconfig contexts, the very first required verification step is ensuring the client is communicating with the correct API endpoint. Without this tool, users would have to manually parse complex `~/.kube/config` YAML files to extract server IPs. `kubectl cluster-info` exists to provide an instant, color-coded terminal summary proving network reachability to the control plane and critical DNS services.

## Syntax

```bash
kubectl cluster-info [dump] [options]
```

## Flags

| Flag                       | Description                                                                                                      | Example                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `dump`                     | (Subcommand) Extracts extensive cluster-level debugging data, logs, and node states for deep troubleshooting.    | `kubectl cluster-info dump`                                |
| `--kubeconfig <path>`      | Targets a specific kubeconfig file path instead of the default `~/.kube/config`.                                 | `kubectl cluster-info --kubeconfig ./admin.conf`           |
| `--context <name>`         | Selects a specific cluster context from the kubeconfig file to query.                                            | `kubectl cluster-info --context prod-us-east`              |
| `--output-directory <dir>` | (Requires `dump`) Saves the massive dump output into a structured directory of files instead of standard output. | `kubectl cluster-info dump --output-directory ./k8s-debug` |
| `--pod-running-timeout`    | (Requires `dump`) Specifies the length of time to wait for pods to reach a running state before dumping logs.    | `kubectl cluster-info dump --pod-running-timeout 5m`       |
| `--help`                   | Outputs brief usage documentation and supported command-line options.                                            | `kubectl cluster-info --help`                              |

## Examples

```bash
kubectl cluster-info
```

> This queries the active context and returns the URL of the Kubernetes control plane (API server) and the CoreDNS service, providing immediate visual confirmation that the cluster is reachable.

```bash
kubectl cluster-info --context minikube
```

> This explicitly queries a specific cluster context named `minikube` stored in your local configuration, verifying the local development endpoint without permanently switching your active context.

```bash
kubectl cluster-info dump > cluster-state.txt
```

> This executes the heavy `dump` subcommand. It pulls routing tables, node metadata, service endpoints, and system logs across the entire cluster, redirecting the massive text wall into a diagnostic file for later review.

```bash
kubectl cluster-info dump --output-directory ./cluster-diagnostics
```

> This routes the massive data dump into a cleanly organized directory structure (`./cluster-diagnostics`), generating individual JSON and log files for every node, service, and daemonset, which is ideal for attaching to vendor support tickets.

## Real-World Scenarios

**Validating CI/CD Pipeline Authentication**

```bash
kubectl cluster-info --kubeconfig $KUBECONFIG_VAR
```

> Automated deployment pipelines run this command immediately after injecting dynamic credentials. If the command succeeds, the pipeline knows network routing and API tokens are valid; if it fails, the pipeline aborts before attempting to apply manifests.

**Generating Support Bundles for Vendor Tickets**

```bash
kubectl cluster-info dump --output-directory /tmp/k8s-debug-bundle
```

> When a managed Kubernetes cluster (like EKS or GKE) experiences severe overlay networking failures, operations teams execute the dump command to package control plane routing tables, pod logs, and node states into an archive to send to cloud support engineers.

## When should it NOT be used?

- **Checking the health of application workloads:** **Reason:** `cluster-info` strictly checks the API server and core DNS addons. It reveals absolutely nothing about whether your Nginx pods or PostgreSQL databases are functioning. **Use instead:** `kubectl get pods -A` or `kubectl top nodes`.
- **Managing complex network routing:** **Reason:** While it prints the API endpoint, it does not reveal Ingress controller IPs, LoadBalancer hostnames, or NodePort bindings. **Use instead:** `kubectl get ingress` or `kubectl get svc`.

## Alternatives

- **`kubectl get endpoints`:** Granular network mapping. **Tradeoff:** Queries exact IP/Port bindings for all services in a namespace, offering far more technical routing data, but lacking the high-level, instant visual summary of the control plane URL.
- **`kubectl config view`:** Configuration inspection. **Tradeoff:** Displays the local YAML mapping of clusters and contexts without actually validating if the remote network endpoints are reachable.

## How it works internally

When you execute `kubectl cluster-info`, the CLI performs two distinct network queries.

First, it retrieves the API server URL directly from your active kubeconfig context and issues a basic unauthenticated `GET` request to verify the server is responding to HTTP traffic.

Second, it issues a `GET /api/v1/namespaces/kube-system/services` request to the API server. It searches the returned JSON specifically for core Kubernetes addon services carrying the label `kubernetes.io/cluster-service=true` or `k8s-app=kube-dns`. It extracts the ClusterIP and routing URLs for these specific system services and formats them into the color-coded terminal output.

When the `dump` subcommand is invoked, the behavior shifts radically. `kubectl` iterates through a hardcoded sequence of diagnostic API calls. It pulls `Nodes`, `Services`, `DaemonSets`, and `Deployments` from the `kube-system` namespace, followed by capturing the literal standard output logs (`kubectl logs`) for every single pod running inside `kube-system`, generating a massive snapshot of the control plane state.

## Performance Notes

- The basic `cluster-info` command is nearly instantaneous and consumes negligible API server resources, functioning perfectly as a heartbeat health check.
- The `cluster-info dump` command is extremely heavy. On large clusters, it will pull megabytes or gigabytes of log data, saturating network bandwidth and API server CPU as it iterates over every system pod.

## Security Notes

- **Exposure of Core Endpoints:** Outputting `cluster-info` in public documentation or untrusted CI logs exposes the exact URL/IP address of the Kubernetes API server, providing attackers with the primary target vector for control plane brute-forcing.
- **Information Leakage in Dumps:** Executing `cluster-info dump` pulls complete pod configurations and environmental variables across the `kube-system` namespace. This payload routinely contains highly sensitive plaintext secrets, internal network layouts, and token configurations.

## Common Mistakes

- **Misinterpreting a timeout:** Running `cluster-info` and waiting 30 seconds for a timeout error. **Why it's wrong:** The CLI is trying to reach the API server URL defined in your kubeconfig. If you are not connected to the corporate VPN, the TCP packet drops into a black hole.
- **Piping the dump to the terminal:** Running `kubectl cluster-info dump` without redirection. **Why it's wrong:** It dumps tens of thousands of lines of raw system logs directly to your terminal buffer, locking up your screen and making the data impossible to read. Always output to a directory or file.

## Best Practices

- Include `kubectl cluster-info` as the very first validation step in shell scripts interacting with Kubernetes to enforce a strict fail-fast mechanism if authentication or networking is broken.
- When executing `dump` for debugging, always utilize the `--output-directory` flag. Generating cleanly segregated, individual JSON files is vastly superior for parsing via `grep` or `jq` compared to a single monolithic text block.

## Interview Questions

- **Q:** How does `kubectl cluster-info` locate the CoreDNS or KubeDNS service URL to display in its terminal output?
  - **A:** The CLI queries the `/api/v1/namespaces/kube-system/services` endpoint. It parses the returned list of system services, specifically hunting for resources tagged with the explicit labels `kubernetes.io/cluster-service=true` or `k8s-app=kube-dns`, and extracts their routing endpoints for display.
- **Q:** You just updated your local `kubeconfig` file with a new cluster context. You want to verify the cluster API server is reachable without accidentally deploying anything. What is the most efficient command to run?
  - **A:** `kubectl cluster-info`. It parses the new context, attempts a lightweight HTTP connection to the control plane URL, and immediately prints a color-coded success message if network routing and basic authentication are functional.
- **Q:** Why must you exercise extreme caution when transferring the output of `kubectl cluster-info dump` to external vendors for support?
  - **A:** The `dump` command acts as a vacuum for the `kube-system` namespace. It retrieves full manifest definitions, environment variables, and raw standard output logs for every core system pod. This payload often inadvertently captures plaintext secrets, TLS certificates, and highly sensitive internal infrastructure topology data.

## Practice Problems

- _Problem:_ Test the network connectivity and retrieve the API server URL for a specific cluster context named `aws-prod-cluster` without changing your current active default context.
  - _Hint:_ Combine the base discovery command with the context override flag.
  - _Solution:_ `kubectl cluster-info --context aws-prod-cluster` (This queries the target context directly and prints the endpoints).
- _Problem:_ Generate a comprehensive diagnostic dump of the core system namespace, directing all the logs and resource definitions securely into a local folder named `./debug-logs`.
  - _Hint:_ Use the dump subcommand and the explicit output directory parameter.
  - _Solution:_ `kubectl cluster-info dump --output-directory ./debug-logs` (This extracts the cluster state and organizes the output into cleanly separated files within the directory).

## References

- [Kubernetes Documentation - Interacting with clusters](https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster/)
- [Kubectl Reference - cluster-info](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#cluster-info)
