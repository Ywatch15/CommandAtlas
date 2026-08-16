---
slug: kubectl-cordon
name: kubectl cordon
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - nodes
  - scheduling
  - maintenance
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
  - mark node as unschedulable
  - stop pods from scheduling on node
  - prepare kubernetes node for maintenance
  - disable pod placement on node
  - cordon k8s node
relatedCommands:
  - kubectl-drain
  - kubectl-get
  - kubectl-describe
  - kubectl-taint
alternatives:
  - kubectl-taint
status: draft
---
## What is it?

`kubectl cordon` is a cluster administration command used to mark a specific Kubernetes worker Node as "unschedulable." It alters the node's metadata so the control plane scheduler immediately ceases assigning any newly created or evicted Pods to that specific underlying hardware or virtual machine.

## Why does it exist?

Hardware degrades, operating systems require kernel patches, and instance types need upgrading. Performing maintenance on a live Kubernetes node without preventing new workloads from landing on it results in race conditions, where the scheduler assigns a pod to a server just as it is shutting down. `kubectl cordon` exists to provide a clean, atomic mechanism to temporarily quarantine a node, establishing a safety boundary before operators forcefully evacuate running workloads (via `drain`) or terminate the instance.

## Syntax

```bash
kubectl cordon NODE [options]
```

## Flags

| Flag                          | Description                                                                               | Example                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| `NODE`                        | (Argument) The explicit string name of the target node to mark as unschedulable.          | `kubectl cordon ip-10-0-1-45.ec2.internal` |
| `-l`, `--selector <selector>` | Targets and cordons multiple nodes simultaneously based on a specific label query.        | `kubectl cordon -l instance-type=spot`     |
| `--dry-run=<strategy>`        | Simulates the cordon operation (`client` or `server`) without persisting changes to etcd. | `kubectl cordon worker-1 --dry-run=server` |
| `--help`                      | Outputs brief usage documentation and supported command-line options.                     | `kubectl cordon --help`                    |

_(Note: `cordon` is a highly specific, surgical command; it intentionally lacks complex configuration flags in favor of absolute simplicity.)_

## Examples

```bash
kubectl cordon worker-node-01
```

> This targets the node named `worker-node-01` and marks it as unschedulable. Any pods currently running on the node remain entirely unaffected and continue to process traffic, but no new pods will be placed there.

```bash
kubectl cordon -l topology.kubernetes.io/zone=us-east-1a
```

> This utilizes a label selector to instantly quarantine an entire availability zone. The API server alters the scheduling metadata of every single node matching that region label, which is critical during localized cloud outages.

```bash
kubectl cordon spot-worker-99 --dry-run=client
```

> This tests the syntax and validation of the command locally without actually transmitting the `PATCH` payload to the API server, ensuring scripts are correctly formatted before execution.

## Real-World Scenarios

**Phased Maintenance and Kernel Patching**

```bash
kubectl cordon worker-node-01
kubectl drain worker-node-01 --ignore-daemonsets --delete-emptydir-data
```

> Systems administrators execute a two-step procedure to patch operating systems. They first run `cordon` to guarantee the scheduler stops routing new workloads to the node. Once quarantined, they execute `drain` to safely evict the active pods, transferring them to other healthy nodes in the cluster before rebooting the server.

**Isolating Compromised Infrastructure**

```bash
kubectl cordon compromised-node-04
```

> Security incident response teams encountering a potentially breached container instantly cordon the underlying host node. This prevents the scheduler from placing new, sensitive workloads onto the compromised hardware while forensics teams extract logs and memory dumps from the actively running, infected pods.

**Graceful Spot Instance Decommissioning**

```bash
kubectl cordon -l lifecycle=spot
```

> Cloud automation scripts intercepting 2-minute termination warnings from cloud providers (like AWS Spot Interruptions) immediately execute a label-based cordon command. This ensures the Kubernetes scheduler abandons the dying capacity instantly, rather than fruitlessly attempting to launch pods on instances destined for termination.

## When should it NOT be used?

- **To forcefully terminate running applications:** **Reason:** `cordon` strictly affects the _placement_ of new pods. It does absolutely nothing to pods that are already running on the node. **Use instead:** `kubectl drain` or `kubectl delete pod`.
- **To permanently remove a node from the cluster:** **Reason:** Cordoning a node leaves its object record fully registered in `etcd`, and the Kubelet continues to report status heartbeats. **Use instead:** `kubectl delete node`.

## Alternatives

- **`kubectl drain`:** The destructive superset. **Tradeoff:** `drain` implicitly calls `cordon` under the hood before forcefully evicting all running pods. Use `cordon` standalone only when you want to leave existing pods running securely.
- **`kubectl patch node`:** Manual metadata manipulation. **Tradeoff:** You can manually inject the unschedulable boolean via `kubectl patch node <name> -p '{"spec":{"unschedulable":true}}'`, but `cordon` provides a dedicated, human-readable abstraction for this exact API call.

## How it works internally

When you execute `kubectl cordon`, the CLI constructs an HTTP `PATCH` payload targeting the specific `Node` resource at the Kubernetes API server endpoint (e.g., `/api/v1/nodes/worker-node-01`).

The payload specifically modifies a single boolean field in the node's schema: it sets `.spec.unschedulable` to `true`.

The API server persists this state change to `etcd`. Simultaneously, the `kube-scheduler` component—which continuously watches the API server for node state changes—receives the update. The next time the scheduler evaluates a pending pod, it runs through its "Filtering" predicates. The `CheckNodeUnschedulable` predicate inspects the node; recognizing the boolean is `true`, the scheduler immediately filters that node out of the list of eligible candidates, guaranteeing no new pod bindings are written against it. Existing pods remain completely untouched by this architectural shift.

## Performance Notes

- Execution is instantaneous and extremely lightweight, generating a negligible metadata patch request to the API server.
- Cordoning a massive percentage of cluster nodes simultaneously (e.g., via `-l`) can inadvertently trigger a severe scheduling bottleneck. If thousands of pods are pending and healthy nodes lack sufficient CPU/Memory capacity, cluster deployments will stall completely.

## Security Notes

- **Denial of Service (DoS):** An attacker or a misconfigured automation script with RBAC privileges to modify Node objects can systematically `cordon` every node in a production cluster. While existing apps will keep running, any autoscaling, self-healing restarts, or new deployments will fail instantly due to a lack of schedulable capacity. Ensure Node modification permissions are tightly restricted.

## Common Mistakes

- **Assuming `cordon` evicts pods:** Running `cordon`, waiting 5 minutes, and wondering why the server is still running 40 application pods. **Why it's wrong:** Cordoning only affects _future_ scheduling. Existing pods continue running happily forever until they die naturally or are explicitly evicted. Use `kubectl drain` to force eviction.
- **Forgetting to uncordon after maintenance:** Completing a server reboot and leaving the node cordoned. **Why it's wrong:** The Kubelet will reconnect to the API server and report `Ready` status, but the `unschedulable` flag remains active. The node will sit entirely empty, wasting expensive cloud compute resources. You must execute `kubectl uncordon`.
- **Cordoning nodes running critical DaemonSets:** **Why it's wrong:** While `cordon` blocks standard Deployments and StatefulSets, DaemonSets (like logging agents or CNI networking pods) inherently bypass the standard scheduler and _will_ still tolerate cordoned nodes.

## Best Practices

- Always verify the current scheduling status of nodes by running `kubectl get nodes`. Cordoned nodes clearly display `SchedulingDisabled` appended to their status column (e.g., `Ready,SchedulingDisabled`).
- In automated maintenance bash scripts, structure the logic to unconditionally execute `kubectl uncordon $NODE` in a `trap` or `finally` block to ensure nodes are returned to the cluster pool even if the intervening maintenance tasks fail.

## Interview Questions

- **Q:** What is the technical difference in Kubernetes cluster behavior when you execute `kubectl cordon` versus `kubectl drain` on a node?
  - **A:** `kubectl cordon` alters the node's specification to mark it as unschedulable, which prevents the Kubernetes scheduler from assigning _new_ pods to that node, while leaving all currently running pods entirely unaffected. `kubectl drain` is a superset operation: it implicitly calls `cordon` first, and then aggressively evicts and terminates every pod currently running on the node so the hardware can be taken offline.
- **Q:** If a node is cordoned via `kubectl cordon`, what specific field in the node's API resource manifest does Kubernetes modify to enforce this behavior?
  - **A:** The command modifies the Node object by sending a patch to the API server that sets the `.spec.unschedulable` boolean field to `true`.
- **Q:** Can a Pod ever be scheduled onto a node that has been explicitly cordoned? If so, how?
  - **A:** Yes. Pods that are part of a `DaemonSet` bypass the standard scheduling predicates by default and will continue to be provisioned onto cordoned nodes unless explicit toleration restrictions are configured. Additionally, operators can forcibly schedule a pod by hardcoding the `nodeName` field directly in the Pod's YAML spec, which entirely bypasses the `kube-scheduler` logic.

## Practice Problems

- _Problem:_ Quarantine a specific Kubernetes worker node named `db-node-03` so that no future database replica pods can be scheduled onto it, while allowing existing active queries to finish processing.
  - _Hint:_ Use the dedicated node quarantine command targeting the node name.
  - _Solution:_ `kubectl cordon db-node-03` (This marks the node unschedulable via the API server, protecting it from new assignments while preserving current workloads).
- _Problem:_ Perform a bulk quarantine operation, isolating every node in the cluster possessing the label `hardware=gpu-legacy`.
  - _Hint:_ Combine the quarantine command with the label selector flag.
  - _Solution:_ `kubectl cordon -l hardware=gpu-legacy` (This issues a patch request across the entire fleet, safely halting new workloads on deprecated GPU instances).

## References

- [Kubernetes Documentation - Manual Node Administration](https://kubernetes.io/docs/concepts/architecture/nodes/#manual-node-administration)
- [Kubectl Reference - cordon](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#cordon)
