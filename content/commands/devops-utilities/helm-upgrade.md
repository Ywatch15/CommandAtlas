---
slug: helm-upgrade
name: helm upgrade
aliases: []
category: devops-utilities
tags:
  - helm
  - kubernetes
  - package-manager
  - upgrade
  - deployment
  - release
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
  - sh
intentPhrases:
  - upgrade helm release kubernetes
  - update helm chart deployment
  - modify helm release values
  - upgrade application version helm
  - apply chart changes helm
relatedCommands: [kubectl-rollout]
alternatives: [kubectl-rollout]
status: published
---

## What is it?

`helm upgrade` is a package management command used to update an existing Helm release to a new chart version or apply updated configuration values. It computes the diff between the currently deployed release state and the new chart templates, submitting updated manifests to the Kubernetes API server.

## Why does it exist?

Applications in Kubernetes require continuous updates—such as rolling out new container image versions, adjusting resource limits, or scaling replica counts. Manually managing rolling updates across raw YAML manifests is complex and prone to state divergence. `helm upgrade` exists to bridge this operational gap, providing an atomic, version-controlled update mechanism that updates releases while maintaining a full revision history for safe rollbacks.

## Syntax

```bash
helm install [RELEASE] [CHART] [options]
helm upgrade [RELEASE] [CHART] [--values files] [--set values] [options]
```

## Flags

| Flag                | Description                                                                                         | Example                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `--install`, `-i`   | Installs the release if it does not already exist (combines install and upgrade behavior).          | `helm upgrade --install my-app ./chart`                       |
| `--values`, `-f`    | Specifies YAML files containing updated configuration values for the upgrade.                       | `helm upgrade my-app ./chart -f updated-values.yaml`          |
| `--set`             | Sets individual configuration values directly on the command line during upgrade.                   | `helm upgrade my-app repo/chart --set image.tag=v2.0`         |
| `--namespace`, `-n` | Specifies the Kubernetes namespace where the target release is deployed.                            | `helm upgrade my-app ./chart -n production`                   |
| `--recreate-pods`   | Forces pods to be restarted even if template specs have not changed (deprecated in newer versions). | `helm upgrade my-app ./chart --recreate-pods`                 |
| `--reset-values`    | Resets values to the chart's defaults when upgrading (clears previous overrides).                   | `helm upgrade my-app ./chart --reset-values`                  |
| `--reuse-values`    | Reuses the last release's values, merging them with any new `--set` flags provided.                 | `helm upgrade my-app ./chart --reuse-values --set debug=true` |
| `--atomic`          | Automatically rolls back the release if the upgrade fails or times out.                             | `helm upgrade my-app ./chart --atomic`                        |
| `--wait`            | Blocks execution until all upgraded pods, PVCs, and services reach a ready state.                   | `helm upgrade my-app ./chart --wait`                          |
| `--version`         | Specifies a new chart version to upgrade to from a repository.                                      | `helm upgrade my-app bitnami/redis --version 18.0.0`          |
| `--cleanup-on-fail` | Deletes newly created resources if an upgrade fails and atomic rollback is triggered.               | `helm upgrade my-app ./chart --atomic --cleanup-on-fail`      |

## Examples

```bash
helm upgrade web-app ./chart --set image.tag=v2.1.0
```

> This upgrades the existing `web-app` release using the local chart, overriding the container image tag to `v2.1.0` via an inline flag.

```bash
helm upgrade --install production-api ./api-chart --namespace core-services --values prod-values.yaml
```

> This uses the `--install` flag to check if the release exists; if it does not, it installs it fresh, and if it does, it upgrades it using the specified production values file.

```bash
helm upgrade cache-layer bitnami/redis --reuse-values --set auth.enabled=true
```

> This upgrades the Redis release while retaining all previously configured values (`--reuse-values`), modifying only the authentication flag.

```bash
helm upgrade app-service ./chart --atomic --wait --timeout 10m
```

> This performs an atomic upgrade that waits for all upgraded pods to become ready (`--wait`), automatically reverting to the previous revision if initialization fails (`--atomic`).

```bash
helm upgrade microservice ./chart --reset-values --values fresh-values.yaml
```

> This upgrades the release while wiping out all historical override values, resetting the configuration entirely to chart defaults plus the new values file (`--reset-values`).

## Real-World Scenarios

**Continuous Delivery Rolling Updates in Pipelines**

```bash
helm upgrade --install frontend ./charts/fe -n production --set image.tag=$BUILD_VERSION --atomic --wait
```

> CI/CD build agents execute `helm upgrade --install` to deploy new software versions into production automatically, using atomic checks to guarantee zero downtime and safe rollbacks on failure.

**Applying Emergency Configuration Hotfixes**

```bash
helm upgrade app-backend ./chart --reuse-values --set env.LOG_LEVEL=debug
```

> Operations engineers apply quick configuration adjustments to live production microservices without needing to re-specify every parameter, leveraging `--reuse-values` to preserve existing state.

**Upgrading Third-Party Cluster Add-ons**

```bash
helm upgrade ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-system --version 4.8.3
```

> Cluster administrators update core infrastructure controllers (like Nginx Ingress) by targeting official repository charts and specifying explicit target versions.

## When should it NOT be used?

- **Making manual, out-of-band edits to resources via `kubectl`:** **Reason:** Manual `kubectl edit` changes will cause state divergence against Helm's tracked release secret, often getting overwritten during subsequent upgrades. **Use instead:** Always manage chart resource changes through Helm values.
- **Downgrading releases across incompatible API schema versions without testing:** **Reason:** Major chart upgrades often introduce breaking CRD changes or schema migrations that simple upgrades cannot reconcile automatically. **Use instead:** `helm rollback` or planned migration paths.

## Alternatives

- `kubectl rollout restart`: Restarts pods without changing chart configuration. **Tradeoff:** It forces rolling pod restarts to pick up updated ConfigMaps or secrets, but does not upgrade chart versions or modify template specs.
- `argo-cd` / `flux`: GitOps continuous delivery operators. **Tradeoff:** GitOps tools automate Helm upgrades continuously by monitoring Git repositories, whereas `helm upgrade` is an imperative command run by CI pipelines or manual operators.

## How it works internally

When you execute `helm upgrade`, Helm retrieves the existing release record from the Kubernetes Secret database (`sh.helm.release.v1.<release>.v1`).

It extracts the configuration values from the previous revision and merges them with the new chart package and user-provided overrides (respecting `--reuse-values` or `--reset-values`). Helm then renders the new templates.

Next, Helm computes a three-way strategic merge patch or server-side apply diff between the previously deployed manifests, the newly rendered manifests, and the live state in the Kubernetes API server. It submits the updated manifests to Kubernetes, triggering rolling updates on StatefulSets, Deployments, and DaemonSets.

Upon success, Helm creates a _new_ revision secret in the cluster, incrementing the revision counter (e.g., `.v2`), allowing historical revisions to remain archived for rollbacks. The command returns an exit code of `0` upon completion, or triggers an automatic rollback if `--atomic` is specified and health checks fail.

## Performance Notes

- Upgrading large deployments triggers rolling updates in Kubernetes; setting appropriate readiness and liveness probes ensures Helm's `--wait` flag accurately tracks pod cycling without premature timeouts.
- Retaining excessive historical revisions in the Kubernetes secret store can degrade cluster query performance; configuring release history limits mitigates this.

## Security Notes

- **Privileged Migration Risks:** Upgrading charts with modified cluster-admin permissions or unvalidated RBAC rules can inadvertently escalate cluster privileges.
- **Secret Substitution Safety:** Upgrading releases can expose plaintext environment secrets if configuration values are improperly stored in unencrypted Git repositories.

## Common Mistakes

- **Forgetting `--reuse-values` when supplying partial overrides:** Running `helm upgrade my-app ./chart --set new_param=val` without `--reuse-values`. **Why it's wrong:** Helm clears all previous custom overrides and reverts to chart defaults, resulting in missing environment variables and broken configurations.
- **Upgrading without reviewing diffs:** Pushing major upgrades directly to production without running `--dry-run` first. **Why it's wrong:** Breaking API changes in upstream charts can cause unexpected resource deletions or pod crash loops.
- **Directly editing Kubernetes objects managed by Helm:** **Why it's wrong:** Subsequent upgrades will overwrite manual `kubectl` patches, causing configuration drift and confusion.

## Best Practices

- Always use `--atomic` and `--wait` during automated production upgrades to prevent broken deployments from lingering in degraded states.
- Leverage `--reuse-values` when applying minor hotfixes to ensure existing configuration parameters are not accidentally wiped out.
- Incorporate `helm diff` plugins or `--dry-run` validations into CI/CD pipelines to inspect manifest changes before executing live upgrades.

## Interview Questions

**Q:** How does Helm track release history, and what happens to cluster secrets when `helm upgrade` is executed successfully?
**A:** Helm tracks release history by storing compressed release data inside Kubernetes Secrets. When `helm update` succeeds, Helm creates a brand-new secret representing the incremented revision (e.g., revision 2), preserving previous revision secrets so administrators can roll back safely if needed.
**Q:** What is the technical difference between `--reset-values` and `--reuse-values` during an upgrade?
**A:** `--reset-values` clears all previous custom configuration overrides, resetting the release configuration strictly to the chart's default `values.yaml` plus any new explicit inputs. `--reuse-values` preserves the exact configuration values from the previous release revision and merges any new overrides provided in the current command.
**Q:** Why does modifying a Helm-managed resource directly via `kubectl edit` often lead to configuration overwrites during the next upgrade?
**A:** Helm performs upgrades based on its stored three-way merge records and rendered chart templates. Manual out-of-band `kubectl` edits bypass Helm's state database, meaning the next `helm upgrade` will evaluate the chart templates against stored revision state and overwrite the manual cluster changes.

## Practice Problems

**Problem:** Upgrade an existing release named `backend-api` using a local chart `./chart`, reusing all previous configuration values while updating only the image tag to `v3.0.0` using an inline flag.
**Hint:** Combine the upgrade command, release name, chart path, reuse-values flag, and set flag.
**Solution:** `helm upgrade backend-api ./chart --reuse-values --set image.tag=v3.0.0` (This applies the upgrade while preserving past overrides and updating the image tag).
**Problem:** Execute an atomic upgrade for a release named `payment-svc` using chart `./chart`, ensuring it waits for readiness and automatically rolls back if it fails.
**Hint:** Combine the upgrade command with the atomic and wait flags.
**Solution:** `helm upgrade payment-svc ./chart --atomic --wait` (This performs a protected rolling update that reverts automatically if health checks timeout).

## References

- [Helm Documentation - Upgrading a Release](https://helm.sh/docs/intro/using_helm/#helm-upgrade-upgrading-a-release-and-roll-back)
- [Helm CLI Command Reference - helm upgrade](https://helm.sh/docs/helm/helm_upgrade/)
