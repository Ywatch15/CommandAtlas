---
slug: kubectl-rollout
name: kubectl rollout
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - deployment
  - revision
  - scaling
  - restart
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
  - restart deployment kubernetes
  - rollback kubernetes deployment
  - check deployment rollout
relatedCommands:
  - kubectl-apply
  - kubectl-scale
  - kubectl-describe
  - kubectl-get
  - helm-upgrade
  - helm-rollback
alternatives:
  - helm-upgrade
  - helm-rollback
status: draft
---
## What is it?

`kubectl rollout` is a suite of subcommands designed to manage the lifecycle and revision history of higher-order Kubernetes workloads, specifically Deployments, StatefulSets, and DaemonSets. It allows operators to monitor the status of ongoing rolling updates, pause and resume deployments in progress, manually trigger restarts without altering container images, and instantly revert workloads to previous stable revisions.

## Why does it exist?

Kubernetes Deployments are declarative; modifying their YAML specifications automatically triggers a background progression (rolling update) replacing old pods with new ones. However, administrators require imperative controls over this automated process. If a rollout hangs, operators need to see its status. If a new version crashes, they need a "panic button" to revert it. If an application hangs but its configuration hasn't changed, they need a way to force a graceful restart. `kubectl rollout` exists to provide these critical, real-time operational controls over the declarative deployment lifecycle.

## Syntax

```bash
kubectl rollout SUBCOMMAND (TYPE NAME | TYPE/NAME) [options]
```

## Flags

| Flag / Command     | Description                                                                                     | Example                                               |
| ------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `status`           | Watches and prints the live progression status of a rolling update until completion.            | `kubectl rollout status deployment/web`               |
| `history`          | Displays the revision history and rollout modifications of a specific resource.                 | `kubectl rollout history daemonset/proxy`             |
| `undo`             | Rolls back the resource to the immediately preceding revision (or a specified one).             | `kubectl rollout undo deployment/api`                 |
| `restart`          | Forces a graceful rolling restart of the resource without modifying its pod template spec.      | `kubectl rollout restart statefulset/db`              |
| `pause`            | Halts an ongoing rollout process, preventing new pods from being created.                       | `kubectl rollout pause deployment/web`                |
| `resume`           | Resumes a previously paused rollout, allowing the update process to continue.                   | `kubectl rollout resume deployment/web`               |
| `-w, --watch`      | (With `status`) Streams the status continuously (default true). Set to false to exit instantly. | `kubectl rollout status deployment/web -w=false`      |
| `--revision <rev>` | (With `history` or `undo`) Targets a specific historical revision number.                       | `kubectl rollout undo deployment/api --to-revision=3` |
| `--timeout <time>` | (With `status`) The duration to wait before giving up and exiting with a non-zero code.         | `kubectl rollout status deployment/web --timeout=5m`  |
| `-n, --namespace`  | Specifies the logical namespace where the target workload resides.                              | `kubectl rollout restart deployment/auth -n prod`     |

## Examples

```bash
kubectl rollout restart deployment/nginx
```

> This forces the deployment controller to gracefully terminate old Nginx pods and spin up fresh ones in a rolling fashion. It achieves this by injecting a timestamp annotation into the Pod template, tricking the controller into seeing a configuration change.

```bash
kubectl rollout status statefulset/mongodb --timeout=10m
```

> This streams the active status of a StatefulSet update, explicitly waiting up to 10 minutes for all replicas to initialize and report readiness before exiting. This is heavily utilized in CI/CD pipeline automation scripts.

```bash
kubectl rollout history deployment/backend-api
```

> This lists all archived revisions of the `backend-api` deployment, displaying revision numbers and the CHANGE-CAUSE annotation, which helps administrators identify the specific commits or commands that triggered past updates.

```bash
kubectl rollout undo deployment/backend-api --to-revision=4
```

> This explicitly rolls the deployment back to revision number 4. The deployment controller will scale up the ReplicaSet associated with revision 4 and gracefully terminate the currently active pods.

```bash
kubectl rollout pause deployment/canary-release
```

> This halts a rolling update in its tracks. If the deployment is configured to update 25% of pods at a time, pausing it freezes the process at 25%, creating a crude but effective "canary" deployment state for manual verification.

## Real-World Scenarios

**Validating Automated CI/CD Deployments**

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deployment/my-service --timeout=5m
```

> Deployment agents (like Jenkins or GitHub Actions) apply a new image tag and immediately execute `rollout status`. The pipeline halts synchronously on this command. If the new pods crash and fail readiness probes, the command times out and exits with a non-zero code, failing the pipeline and alerting developers.

**Emergency Panic Button Reversions**

```bash
kubectl rollout undo deployment/payment-gateway
```

> On-call engineers receiving high latency alerts minutes after a new release deploy the `undo` command. This instantly restores the previous known-good ReplicaSet, stabilizing the platform within seconds while the underlying bug is investigated offline.

**Cycling Pods for Secret Rotations**

```bash
kubectl rollout restart daemonset/fluentd
```

> When operators rotate TLS certificates or API tokens mounted inside Kubernetes Secrets, active pods do not natively detect the change if the volume isn't hot-reloading. Executing a `restart` cleanly cycles the pods, forcing them to re-mount the updated secrets upon boot.

## When should it NOT be used?

- **Executing complex, multi-service application rollbacks:** **Reason:** `kubectl rollout undo` only reverts a single independent deployment object. It does not revert corresponding ConfigMaps, Secrets, or Services. **Use instead:** `helm rollback` or GitOps commit reversion.
- **Altering the actual capacity (Replica Count) of a deployment:** **Reason:** Rollout commands manage versions and restarts; they do not alter autoscaling or manual pod counts. **Use instead:** `kubectl scale` or an HPA (HorizontalPodAutoscaler).

## Alternatives

- **`helm upgrade` / `helm rollback`:** Full package lifecycle management. **Tradeoff:** Helm manages the rollout of entire application architectures (Deployment + ConfigMap + Service) as a single versioned unit, whereas `kubectl rollout` operates surgically on isolated, individual workload resources.
- **GitOps (ArgoCD / Flux):** Declarative synchronization. **Tradeoff:** In mature GitOps models, imperative rollbacks (`rollout undo`) or restarts are anti-patterns. Operators instead revert the Git commit, allowing the controller to sync the desired state declaratively.

## How it works internally

The `kubectl rollout` commands interact primarily with the API server, but the actual heavy lifting is executed by the Kubernetes Controller Manager (specifically the Deployment, StatefulSet, or DaemonSet controllers).

When you execute `kubectl rollout restart`, the CLI sends an HTTP `PATCH` payload to the Deployment object. It modifies `.spec.template.metadata.annotations` to include a unique timestamp (`kubectl.kubernetes.io/restartedAt`). Because the pod _template_ has technically changed, the Deployment Controller is forced to create a new `ReplicaSet` and initiate its standard rolling update logic (scaling the new set up while scaling the old set down).

When you execute `kubectl rollout undo`, the API server retrieves the historical `ReplicaSet` corresponding to the previous revision (stored natively in etcd, limited by `revisionHistoryLimit`). `kubectl` inspects that ReplicaSet's pod template, overwrites the current Deployment's pod template with those historical values, and increments the Deployment revision counter. The Deployment Controller detects this configuration change and automatically executes a rolling update back to the old template.

## Performance Notes

- The `status` command executes a long-polling HTTP watch against the API server. It is highly efficient and consumes negligible bandwidth.
- Executing `restart` on massive deployments (e.g., 500 pods) respects the deployment's `maxSurge` and `maxUnavailable` surge parameters. If `maxUnavailable` is strictly 0%, the process may take significant time as it waits for new pods to report `Ready` before killing old ones.

## Security Notes

- **RBAC Constraints:** Executing `undo` or `restart` requires `patch` permissions on the targeted resource type (Deployment, StatefulSet). The `status` and `history` commands only require `get` and `list` permissions.
- **Blind Reversions:** Rolling back code without understanding the database schema implications is dangerous. If revision 5 updated a database schema in a non-backward compatible way, using `rollout undo` to return to revision 4 application code will cause massive application crashes against the new schema.

## Common Mistakes

- **Running `history` and seeing `<none>` under CHANGE-CAUSE:** **Why it happens:** Modern Kubernetes no longer automatically records the exact `kubectl apply` command that triggered a rollout. You must explicitly use `kubectl annotate deployment/name kubernetes.io/change-cause="Updated image"` during deployment to populate this audit column.
- **Using `restart` and expecting new ConfigMap data to apply:** **Why it's wrong:** While restarting cycles the pods and mounts fresh volumes, if you mutated a ConfigMap _without_ restarting, the pod's environment variables (`envFrom`) do NOT update. Environment variables are statically injected at container boot.
- **Trying to `undo` past the `revisionHistoryLimit`:** **Why it's wrong:** Kubernetes routinely garbage collects old, scaled-to-zero ReplicaSets to save `etcd` space (default is 10). If you try to undo to revision 2 but the history limit erased it, the command will fail.

## Best Practices

- Integrate `kubectl rollout status <resource>` securely into all CI/CD deployment jobs immediately following `kubectl apply` or `helm upgrade`. This ensures pipelines fail-fast rather than silently reporting "Success" while the cluster struggles in a CrashLoop.
- Utilize `kubectl rollout pause` strategically when debugging complex init-container crash loops, allowing you to halt a deployment cycle, debug the broken pods, patch external dependencies, and then `resume` the flow.
- Standardize on injecting the `kubernetes.io/change-cause` annotation during automated builds so `kubectl rollout history` provides meaningful context (like Jira ticket IDs or Git SHAs) during incident response.

## Interview Questions

- _Query:_ What exact technical mechanism does `kubectl rollout restart deployment/my-app` utilize to force the pods to recreate without actually altering the container image or application configuration?
  - _A:_ The `restart` command sends a JSON patch to the API server that injects or updates a specific annotation (`kubectl.kubernetes.io/restartedAt: <timestamp>`) inside the Deployment's `.spec.template.metadata`. Because the Pod Template definition changes, the Deployment Controller is forced to create a new ReplicaSet and execute a rolling update, gracefully cycling the pods.
- _Query:_ Why might `kubectl rollout undo` successfully revert an application's container image, but completely break the application's ability to boot?
  - _A:_ `kubectl rollout undo` is strictly isolated to the Deployment object. It restores the old container image tag, but it does NOT revert associated ConfigMaps, Secrets, or Database schemas. If the new deployment altered a ConfigMap or dropped a database column, the reverted application code will boot, fail to find the expected legacy configuration or schema, and crash.
- _Query:_ When using `kubectl rollout pause`, what exactly happens to the current pods, and what happens if you apply a new YAML file while the deployment is paused?
  - _A:_ Pausing a rollout simply halts the deployment controller from scaling ReplicaSets up or down; existing pods remain as they are. If you apply a new YAML file while paused, the Deployment object will accept and store the new `.spec.template`, but it will _not_ trigger the creation of new pods until you explicitly execute `kubectl rollout resume`.

## Practice Problems

- _Problem:_ Force a graceful rolling restart of a DaemonSet named `node-exporter` operating in the `monitoring` namespace to force it to mount newly generated TLS certificates.
  - _Hint:_ Target the specific DaemonSet resource type using the restart subcommand and namespace flag.
  - _Solution:_ `kubectl rollout restart daemonset/node-exporter -n monitoring` (This injects the restart annotation, cycling the daemonset pods on every node safely).
- _Problem:_ Check the live deployment status of `payment-api` and ensure the command times out and exits with an error code if the deployment fails to complete within 3 minutes.
  - _Hint:_ Combine the status subcommand with the explicit timeout flag.
  - _Solution:_ `kubectl rollout status deployment/payment-api --timeout=3m` (This command blocks execution for up to 3 minutes, returning 0 on success or non-zero on timeout).

## References

- [Kubernetes Documentation - Managing Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubectl Reference - rollout](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout)
  