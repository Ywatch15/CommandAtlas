---
slug: helm-rollback
name: helm rollback
aliases: []
category: devops-utilities
tags: [helm, kubernetes, package-manager, rollback, deployment, recovery]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'rollback helm release kubernetes'
  - 'revert helm deployment to previous version'
  - 'undo failed helm upgrade'
  - 'restore previous helm revision'
  - 'rollback release cluster'
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`helm rollback` is a package management command used to revert a Helm release to a previous, stable historical revision. It identifies the target revision from the Kubernetes release history store and applies its associated manifests to restore the application state.

## Why does it exist?

Even with rigorous testing, software deployments occasionally introduce critical bugs, crashing pods, or broken integrations in production. Reverting manual Kubernetes changes requires complex patch operations across multiple resources. `helm rollback` exists to bridge this operational gap, providing an instant, atomic recovery mechanism that restores complex multi-resource applications to a known good revision with a single command.

## Syntax

```bash
helm rollback [RELEASE] [REVISION] [options]
```

## Flags

| Flag                | Description                                                                                          | Example                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `--namespace`, `-n` | Specifies the Kubernetes namespace where the target release is deployed.                             | `helm rollback my-app 2 --namespace production` |
| `--wait`            | Blocks execution until all rolled-back pods, PVCs, and services reach a ready state.                 | `helm rollback my-app 1 --wait`                 |
| `--timeout`         | Sets the maximum time to wait for rollback operations to complete (default 5m0s).                    | `helm rollback my-app 1 --timeout 8m`           |
| `--dry-run`         | Simulates the rollback, rendering manifests locally without executing cluster changes.               | `helm rollback my-app 1 --dry-run`              |
| `--recreate-pods`   | Forces pods to be recreated during the rollback process.                                             | `helm rollback my-app 1 --recreate-pods`        |
| `--no-hooks`        | Prevents Helm from executing pre-rollback or post-rollback hook scripts.                             | `helm rollback my-app 1 --no-hooks`             |
| `--cleanup-on-fail` | Deletes newly created resources if rollback validation fails.                                        | `helm rollback my-app 1 --cleanup-on-fail`      |
| `--history-max`     | Limits the maximum number of revisions saved in release history (configured during install/upgrade). | `helm rollback my-app 1`                        |

## Examples

```bash
helm rollback web-app 1
```

> This rolls back the `web-app` release immediately to revision `1`, reverting all manifests and configurations to that initial stable deployment state.

```bash
helm rollback payment-service 3 --namespace production
```

> This targets the `payment-service` release inside the `production` namespace and reverts it to historical revision `3`.

```bash
helm rollback api-gateway 2 --wait --timeout 10m
```

> This performs a rollback to revision `2` and blocks execution (`--wait`) until all restored application pods verify healthy readiness states.

```bash
helm rollback db-migration 4 --dry-run --debug
```

> This simulates rolling back to revision `4` locally without executing changes on the cluster (`--dry-run`), outputting detailed debug logs.

```bash
helm rollback frontend 1 --recreate-pods
```

> This rolls back the frontend release while forcing all pods to be restarted to clear cached runtime states (`--recreate-pods`).

## Real-World Scenarios

**Emergency Production Incident Remediation**

```bash
helm rollback core-api 2 --namespace production --wait
```

> When monitoring alerts indicate that a newly deployed API version is throwing 500 errors, on-call engineers execute `helm rollback` to instantly restore the previous stable revision, mitigating customer downtime.

**Reverting Failed Automated Deployments**

```bash
helm rollback worker-node 4 --atomic
```

> Continuous deployment pipelines that fail atomic upgrade checks execute automatic rollbacks to restore last-known-good operational states without human intervention.

**Post-Release Smoke Test Failure Recovery**

```bash
helm rollback microservice 1 --recreate-pods
```

> Quality assurance teams running automated post-deployment smoke tests that fail validation trigger immediate rollbacks to purge faulty container versions from the cluster.

## When should it NOT be used?

- **Reverting database schema migrations that are non-backward compatible:** **Reason:** Rolling back application code does not automatically reverse database migrations (like dropped database columns), which can cause application crashes even on stable code versions. **Use instead:** Planned database migration rollback scripts.
- **Attempting to rollback across missing history revisions:** **Reason:** If historical secrets have been pruned or deleted from the cluster due to history retention limits, rolling back to those revisions is impossible. **Use instead:** `helm upgrade` with explicit previous chart versions.

## Alternatives

- `helm upgrade`: Deploying an explicit older chart version manually. **Tradeoff:** Upgrading to an older chart version creates a _new_ forward revision reflecting the old state, whereas `helm rollback` specifically points back to an existing archived revision.
- `kubectl rollout undo`: Reverts deployments directly via Kubernetes. **Tradeoff:** `kubectl rollout undo` works on native Deployments, but does not manage Helm's release secrets or clean up non-Deployment resources managed by the chart.

## How it works internally

When you execute `helm rollback [RELEASE] [REVISION]`, Helm accesses the Kubernetes Secret database (`sh.helm.release.v1.<release>.v1`) to inspect the complete history of release secrets.

If no specific revision number is provided, Helm automatically targets the immediately preceding revision (Revision $N-1$). Helm extracts the archived manifest and configuration data stored within that historical revision secret.

It then performs a three-way strategic merge patch between the currently broken live cluster state, the target historical manifests, and the API server. Kubernetes executes rolling updates to reconcile resources back to the historical definition.

Upon successful reconciliation, Helm creates a brand-new release secret representing the _current_ state (e.g., Revision 5 becomes an exact duplicate of Revision 2), ensuring the audit trail remains linear and unbroken. The command exits with `0` upon successful restoration.

## Performance Notes

- Rollbacks execute rapidly because Helm reuses pre-cached manifest definitions stored in historical revision secrets, eliminating remote chart download overhead.
- Large-scale rollbacks involving hundreds of pods will experience normal Kubernetes rolling update transit delays as old pods terminate and restored pods initialize.

## Security Notes

- **Stale Credential Exposure:** Rolling back to an older revision can inadvertently reintroduce deprecated configuration values or expired API secrets that were patched in later versions.
- **RBAC Permissions:** Operators executing `helm rollback` require full permissions to read release history secrets and modify cluster resources within the target namespace.

## Common Mistakes

- **Assuming rollbacks reverse database schema changes:** **Why it's wrong:** Code reverts do not alter live database tables; rolling back an app that relies on a dropped database column will result in runtime errors.
- **Targeting non-existent revision numbers:** Running `helm rollback my-app 99` when only 3 revisions exist. **Why it's wrong:** Helm rejects the command with a revision not found error. Use `helm history` first to verify valid revision numbers.
- **Ignoring database state synchronization:** Rolling back stateful applications without accounting for persistent volume claim (PVC) data divergences.

## Best Practices

- Always run `helm history <release>` prior to rolling back to verify the exact target revision number and inspect change notes.
- Incorporate `--wait` into rollback commands during critical incidents to ensure verification that pods have recovered successfully before terminating incident workflows.
- Configure reasonable `--history-max` limits on helm installations to prevent Kubernetes secret stores from bloating while retaining sufficient rollback depth.

## Interview Questions

- _Query:_ What does Helm create in the cluster secret database when a successful `helm rollback` is executed?
  - _A:_ Helm creates a brand-new release secret representing an incremented revision number (e.g., if current was revision 5 and you rolled back to revision 2, Helm creates revision 6) whose manifest and configuration content precisely match the target historical revision. This keeps the deployment history strictly linear.
- _Query:_ Why might rolling back an application version via Helm fail to restore full functionality if database schema migrations were part of the failed upgrade?
  - _A:_ Helm rollbacks only restore Kubernetes resource manifests and application configurations. They do not automatically execute database downgrade scripts or reverse destructive schema changes (such as dropped tables or columns), which can cause application errors upon restart.
- _Query:_ How do you inspect available revision numbers for a release before executing a `helm rollback` command?
  - _A:_ You execute `helm history <release-name>`, which queries the cluster secret store and prints a tabular summary of all archived revisions, their update statuses, chart versions, and change descriptions.

## Practice Problems

- _Problem:_ Roll back a release named `order-processor` in the `production` namespace to its immediately preceding stable revision, waiting for all pods to become ready.
  - _Hint:_ Omit the revision number to target the previous revision, and combine namespace and wait flags.
  - _Solution:_ `helm rollback order-processor --namespace production --wait` (Omitting the revision number defaults to rolling back to revision $N-1$, and `--wait` ensures readiness).
- _Problem:_ Check available revisions for a release named `auth-service` and then rollback specifically to revision `2`.
  - _Hint:_ Pass the explicit revision number `2` to the rollback command.
  - _Solution:_ `helm history auth-service && helm rollback auth-service 2` (This first audits the history and then explicitly restores revision 2).

## References

- [Helm Documentation - Rolling Back a Release](https://helm.sh/docs/intro/using_helm/#helm-upgrade-upgrading-a-release-and-roll-back)
- [Helm CLI Command Reference - helm rollback](https://helm.sh/docs/helm/helm_rollback/)
