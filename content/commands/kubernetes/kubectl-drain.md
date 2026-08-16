---
slug: kubectl-drain
name: kubectl drain
aliases: []
category: kubernetes
tags:
  - kubernetes
  - k8s
  - nodes
  - maintenance
  - eviction
  - lifecycle
difficulty: advanced
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
  - evict pods from kubernetes node
  - safely shut down k8s node
  - prepare node for maintenance
  - remove kubernetes worker node
  - empty kubernetes node
relatedCommands:
  - kubectl-cordon
  - kubectl-delete
  - kubectl-taint
alternatives: []
status: draft
---

## What is it?

`kubectl drain` is an administrative cluster management command used to safely prepare a Kubernetes Node for hardware maintenance, kernel upgrades, or decommissioning. It cordons the node (preventing new Pods from being scheduled on it) and then systematically and gracefully evicts all actively running Pods, forcing their managing controllers (like Deployments or StatefulSets) to spin up replacement Pods on other healthy nodes in the cluster before the target node is taken offline.

## Why does it exist?

Simply powering off a virtual machine or physical server running Kubernetes workloads results in sudden, ungraceful termination of containers. Active HTTP connections are severed, databases might corrupt in-flight transactions, and the cluster experiences temporary downtime until controllers detect the dead node. `kubectl drain` exists to enforce a zero-downtime transition. It integrates deeply with the Eviction API and PodDisruptionBudgets (PDBs), ensuring that applications are given a `SIGTERM` signal to shut down cleanly, and mathematically guarantees that enough replicas of a microservice remain available to serve traffic across the rest of the cluster during the migration.

## Syntax

```bash
kubectl drain NODE [options]
```

## Flags

| Flag                     | Description                                                                                                                                                               | Example                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `--ignore-daemonsets`    | Forces the drain to proceed even if DaemonSet pods exist. By default, `drain` halts if DaemonSets are present because they cannot be rescheduled to other nodes.          | `kubectl drain node-1 --ignore-daemonsets`      |
| `--delete-emptydir-data` | Forces the eviction of pods utilizing `emptyDir` volumes. By default, `drain` halts to prevent the permanent destruction of local scratch data.                           | `kubectl drain node-1 --delete-emptydir-data`   |
| `--force`                | Bypasses safety checks to evict "naked" pods (pods not managed by a ReplicationController, Deployment, or Job). These pods will be permanently deleted and not recreated. | `kubectl drain node-1 --force`                  |
| `--grace-period`         | Overrides the pod's configured termination grace period (in seconds), forcing them to shut down faster or slower than designed.                                           | `kubectl drain node-1 --grace-period=30`        |
| `--timeout`              | Specifies the maximum duration to wait for the drain to complete. If PDBs block the eviction, the command will exit with an error after the timeout (e.g., `5m`).         | `kubectl drain node-1 --timeout=10m`            |
| `--disable-eviction`     | Forces `kubectl drain` to use the legacy `DELETE` API instead of the Eviction API, completely ignoring PodDisruptionBudgets. Highly dangerous.                            | `kubectl drain node-1 --disable-eviction`       |
| `--pod-selector`         | Narrows the scope of the drain to evict _only_ pods on the node that match a specific label selector.                                                                     | `kubectl drain node-1 --pod-selector=app=cache` |
| `--dry-run`              | Evaluates the node and prints what actions would be taken, highlighting errors (like unmanaged pods) without actually cordoning or evicting anything.                     | `kubectl drain node-1 --dry-run=server`         |

## Examples

```bash
kubectl drain k8s-worker-04 --ignore-daemonsets --delete-emptydir-data
```

> The standard, safest, and most common invocation for routine maintenance. It cordons `k8s-worker-04`, safely ignores the logging/monitoring DaemonSets (which will simply die when the node shuts down), accepts the loss of temporary `emptyDir` scratch space, and respects all PodDisruptionBudgets while evicting workloads.

```bash
kubectl drain k8s-db-node --force --ignore-daemonsets
```

> The aggressive evacuation. If a developer manually deployed a raw Pod (without a Deployment wrapper) to this node, a standard drain will refuse to proceed because that Pod will be lost forever. The `--force` flag acknowledges this data loss and permanently deletes the unmanaged Pod to clear the node.

```bash
kubectl drain k8s-worker-02 --grace-period=0 --force --ignore-daemonsets
```

> The emergency shutdown. If the node is experiencing severe hardware failure and workloads are hung, waiting for graceful termination is pointless. Setting grace period to `0` instantly `SIGKILL`s all containers and immediately strips their records from the API server.

```bash
kubectl uncordon k8s-worker-04
```

> The mandatory recovery command. Once hardware maintenance is complete and the node reboots, it remains cordoned (`SchedulingDisabled`). You must explicitly `uncordon` the node to inform the Kubernetes scheduler that it is permitted to place new Pods on this hardware again.

## Real-World Scenarios

**Zero-Downtime Cluster Upgrades**

```bash
for node in $(kubectl get nodes -l env=prod -o name); do
    kubectl drain $node --ignore-daemonsets --delete-emptydir-data --timeout=15m
    # Perform OS patch / Kubelet upgrade
    kubectl uncordon $node
done
```

> Cloud administrators use this sequence to perform rolling upgrades across an entire fleet. The script drains a single node, shifting all active web traffic seamlessly to the remaining nodes via the Kubernetes Service routing table. Once patched and uncordoned, the script moves to the next node, achieving a 100% infrastructure upgrade with 0% application downtime.

## When should it NOT be used?

- **On Single-Node Clusters:** **Do not use `drain` on Minikube, Docker Desktop, or single-node edge deployments.** `drain` works by shifting workloads to _other_ nodes. If there are no other nodes, the eviction will fail or pods will remain permanently `Pending`, completely breaking the application.
- **Without PodDisruptionBudgets (PDBs):** If your critical microservices lack PDBs, running `drain` on multiple nodes simultaneously (or running it on a node containing all replicas of an app) will violently take down the application. Always define PDBs to teach the Eviction API how many replicas must remain alive during maintenance.
- **For permanent node removal:** While you must `drain` a node before removing it, `drain` does not delete the node object from the cluster. After draining and powering off the machine, you must still run `kubectl delete node <node-name>`.

## Alternatives

- **`kubectl cordon`:** **Best for slow attrition.** Cordoning a node marks it as `NoSchedule`. It does not evict existing pods. It simply prevents new ones from arriving. Over hours or days, as pods naturally complete or get redeployed, the node empties itself without aggressive eviction.
- **Cloud Provider Node Pools (e.g., AWS ASG, GCP MIG):** In managed Kubernetes (EKS, GKE), upgrading a node pool automatically orchestrates cordoning, draining, and replacement behind the scenes via cloud-native APIs, making manual `kubectl drain` unnecessary.

## How it works internally

When you execute `kubectl drain`, the CLI orchestrates a complex client-side workflow consisting of two distinct phases.

**Phase 1: Cordoning.** The CLI issues a `PATCH` request to the API server targeting the specified Node object. It injects the `node.kubernetes.io/unschedulable: NoSchedule` taint. The Kubernetes Scheduler monitors this taint and instantly ceases assigning any newly created Pods to this machine.

**Phase 2: Eviction.** The CLI queries the API server for all Pods currently bound to this Node. It evaluates the flags (e.g., checking if unmanaged pods exist or if DaemonSets are present). If the pre-flight checks pass, `kubectl` begins issuing POST requests to the Kubernetes **Eviction API** (`/api/v1/namespaces/{namespace}/pods/{name}/eviction`) for each pod.

Crucially, the Eviction API differs from the `DELETE` API. The Eviction API evaluates the cluster's `PodDisruptionBudgets`. If a PDB states that an application must maintain 3 available replicas, and evicting the pod on this node would drop the available count to 2, the Eviction API _rejects_ the request with an HTTP 429 (Too Many Requests).

The `kubectl drain` client catches this rejection and enters a polling loop, repeatedly retrying the Eviction API. Meanwhile, the Deployment controller spins up a replacement pod on another healthy node. Once that new pod passes its Readiness Probes and the available count reaches 4, the Eviction API accepts the retry request, and the Kubelet gracefully terminates the pod on the draining node.

## Performance Notes

- **Indefinite Blocking:** `kubectl drain` is a synchronous, blocking command. If a strict PDB cannot be satisfied (e.g., the cluster lacks sufficient CPU resources on other nodes to schedule the replacement pods), the `drain` command will loop and hang indefinitely. Always use `--timeout` in automated scripts to prevent pipelines from locking up permanently.
- **Local Volume Binding:** If a pod uses a `local` PersistentVolume tied to the specific disk of the draining node, it cannot be rescheduled to another node. The drain will stall indefinitely.

## Security Notes

- **RBAC Permissions:** Executing a drain requires highly elevated privileges. The user must have `patch` permissions on `nodes`, and `create` permissions on the `pods/eviction` subresource.
- **Bypassing PDBs:** Using the `--disable-eviction` flag causes `kubectl` to revert to raw `DELETE` calls. This completely bypasses PDB security constraints, granting an administrator the power to inadvertently cause a massive denial-of-service outage for mission-critical applications.

## Common Mistakes

- **Forgetting `--ignore-daemonsets`**
  - _Mistake:_ Typing `kubectl drain worker-01` and staring at an error reading "cannot delete DaemonSet-managed Pods".
  - _Why:_ DaemonSets (like fluentd, kube-proxy, or cilium) run exactly one pod per node by definition. They mathematically cannot be "evicted" to another node. `kubectl` aborts defensively to ensure you realize this. Appending `--ignore-daemonsets` acknowledges that these infrastructure pods will simply be terminated when the node shuts down.
- **Panicking and `Ctrl+C`ing a slow drain**
  - _Mistake:_ A drain takes 5 minutes due to slow application shutdown hooks. The admin hits `Ctrl+C`, assuming the command failed.
  - _Why:_ The drain process is midway through. Half the pods are evicted, but the node remains cordoned (`NoSchedule`). The admin must either finish the drain or explicitly `kubectl uncordon` the node to restore cluster capacity.

## Best Practices

- **Use Dry Runs Before Draining:** Always run `kubectl drain <node> --dry-run=server` before executing maintenance. This instantly highlights if you have "naked" unmanaged pods that will be permanently destroyed, or `emptyDir` volumes that require the data-loss override flags, allowing you to plan accordingly.
- **Enforce PodDisruptionBudgets:** Never rely on the human operator to orchestrate drains perfectly. Platform teams must enforce PDBs on every production deployment. PDBs act as an impenetrable mathematical shield, physically preventing `kubectl drain` from causing an outage regardless of operator error.

## Interview Questions

**Q: You attempt to drain a node, but the command hangs indefinitely, continuously printing "Cannot evict pod: PDB prevents eviction." What is structurally preventing the drain from completing?**
**A:** A PodDisruptionBudget (PDB) protects the application running on that node. The PDB dictates a minimum number of available replicas. When `kubectl drain` triggers the Eviction API, the API calculates that killing the pod on this node would violate the PDB threshold. It rejects the eviction until the cluster can successfully schedule and start a replacement pod on a _different_ healthy node. If the cluster is out of CPU/Memory, the replacement pod remains `Pending`, and the drain hangs forever.

**Q: Explain the difference between `kubectl cordon` and `kubectl drain`.**
**A:** `kubectl cordon` applies a `NoSchedule` taint to a node. This strictly prevents any _new_ pods from being assigned to the machine, but it leaves all currently running pods completely untouched and executing normally. `kubectl drain` performs a cordon, but then actively goes a step further by systematically evicting and killing all actively running pods, completely emptying the machine.

## Practice Problems

**Problem:** You are writing an automated patch script. You need to drain a node named `db-worker-02`. You want to ignore infrastructure daemonsets, you accept the loss of any temporary `emptyDir` scratch data, and crucially, if the drain takes longer than 15 minutes, you want the command to abort and exit with an error so your script doesn't hang.
**Hint:** Combine the daemonset, emptydir, and timeout flags.
**Solution:**

```bash
kubectl drain db-worker-02 --ignore-daemonsets --delete-emptydir-data --timeout=15m
```

**Problem:** You have finished hardware maintenance on `worker-05` and powered it back on. It connects to the cluster, but no workloads are being scheduled onto it. Write the command to resolve this.
**Hint:** You need to reverse the `NoSchedule` taint applied during the initial drain.
**Solution:**

```bash
kubectl uncordon worker-05
```

## References

- [kubectl CLI Reference: drain](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain)
- [Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
