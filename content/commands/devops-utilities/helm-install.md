---
slug: helm-install
name: helm install
aliases: []
category: devops-utilities
tags:
  - helm
  - kubernetes
  - package-manager
  - deployment
  - charts
  - containers
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
  - deploy helm chart kubernetes
  - install helm release
  - deploy application via helm
  - install chart cluster
  - create new helm release
relatedCommands: [kubectl-apply]
alternatives: [kubectl-apply]
status: published
---

## What is it?

`helm install` is a package management command used to deploy a Helm chart into a Kubernetes cluster, creating a new release instance. It processes templated Kubernetes manifests using supplied configuration values and submits them to the Kubernetes API server for execution.

## Why does it exist?

Managing complex microservice applications on Kubernetes requires deploying dozens of interconnected resources (deployments, services, ingress rules, persistent volume claims) with environment-specific configurations. Manually applying raw YAML files via `kubectl` leads to configuration drift, version management challenges, and lack of atomic rollbacks. `helm install` exists to bridge this operational gap, providing a package manager that bundles parameterized Kubernetes manifests into distributable charts and manages them as versioned releases.

## Syntax

```bash
helm install [RELEASE_NAME] [CHART] [--values files] [--set values] [options]
```

## Flags

| Flag                    | Description                                                                                    | Example                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `--values`, `-f`        | Specifies YAML files containing custom configuration values to override chart defaults.        | `helm install my-app ./chart -f values.yaml`                |
| `--set`                 | Sets individual configuration values directly on the command line (key=val).                   | `helm install my-app repo/chart --set replicaCount=3`       |
| `--namespace`, `-n`     | Specifies the target Kubernetes namespace for deploying the release.                           | `helm install my-app ./chart --namespace production`        |
| `--create-namespace`    | Automatically creates the target Kubernetes namespace if it does not already exist.            | `helm install my-app ./chart -n staging --create-namespace` |
| `--dry-run`             | Simulates the installation, rendering templates locally without contacting the Kubernetes API. | `helm install my-app ./chart --dry-run`                     |
| `--atomic`              | Automatically purges the release and rolls back resources if the installation fails.           | `helm install my-app ./chart --atomic`                      |
| `--timeout`             | Sets the maximum time to wait for any Kubernetes operations (default 5m0s).                    | `helm install my-app ./chart --timeout 10m`                 |
| `--version`             | Specifies the exact chart version to install from a repository.                                | `helm install my-app bitnami/mysql --version 9.4.3`         |
| `--no-hooks`            | Prevents Helm from executing pre-install, post-install, or test hooks during release creation. | `helm install my-app ./chart --no-hooks`                    |
| `--wait`                | Blocks execution until all pods, PVCs, and services reach a ready state.                       | `helm install my-app ./chart --wait`                        |
| `--generate-name`, `-g` | Automatically generates a unique release name if none is explicitly provided.                  | `helm install ./chart --generate-name`                      |

## Examples

```bash
helm install my-nginx bitnami/nginx
```

> This downloads the Nginx chart from the configured repository and installs it into the default Kubernetes namespace under the release name `my-nginx`.

```bash
helm install production-db bitnami/postgresql --namespace db-tier --create-namespace --values custom-values.yaml
```

> This creates a dedicated namespace (`db-tier`), applies custom overrides from `custom-values.yaml`, and deploys a PostgreSQL database release named `production-db`.

```bash
helm install web-app ./my-chart --set image.tag=v1.4.2 --set service.type=LoadBalancer
```

> This installs a local chart directory while using inline `--set` flags to dynamically override the container image tag and service exposure type.

```bash
helm install secure-app ./chart --atomic --wait --timeout 8m
```

> This performs an atomic installation that waits for all pods to become fully ready (`--wait`) and automatically purges the release if initialization times out or fails (`--atomic`).

```bash
helm install ./stable-chart --generate-name --dry-run --debug
```

> This renders the chart templates locally using a generated release name without deploying anything to the cluster (`--dry-run`), dumping detailed debug logs.

## Real-World Scenarios

**Deploying Microservice Stacks in CI/CD Pipelines**

```bash
helm install auth-service ./charts/api --namespace staging --create-namespace --set image.tag=$CI_COMMIT_SHA --wait
```

> Automated deployment pipelines use `helm install` with `--wait` to deploy freshly compiled microservice versions into staging environments, ensuring infrastructure readiness before passing control to integration test suites.

**Provisioning Infrastructure Dependencies for Ephemeral Environments**

```bash
helm install redis-cache bitnami/redis -n ephemeral-$PR_ID --create-namespace --atomic
```

> Pull request automation workflows spin up isolated ephemeral testing environments complete with caching layers, utilizing atomic installations to guarantee clean tear-downs upon failure.

**Standardizing Third-Party Software Deployments**

```bash
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

> Infrastructure administrators deploy complex third-party observability stacks across clusters using standardized community Helm charts rather than managing hundreds of raw YAML manifests.

## When should it NOT be used?

- **Applying simple, standalone manifest files without templating:** **Reason:** Using Helm for single, static YAML files introduces unnecessary chart packaging overhead. **Use instead:** `kubectl apply -f manifest.yaml`.
- **Managing fine-grained overlay variations across multi-environment overlays:** **Reason:** Over-relying on massive nested `--set` arguments makes configuration tracking unreadable. **Use instead:** Kustomize.

## Alternatives

- `kubectl apply`: Applies raw Kubernetes YAML files directly. **Tradeoff:** `kubectl` is lightweight and direct, but lacks built-in package templating, release versioning, dependency tracking, and atomic rollback capabilities.
- `kustomize`: Native Kubernetes configuration customization tool. **Tradeoff:** Kustomize uses pure YAML overlays without proprietary templating languages, but does not provide release history tracking or binary package distribution like Helm charts.

## How it works internally

When you execute `helm install`, Helm initializes an internal execution pipeline.

First, it resolves the chart source (whether a local directory, a packaged `.tgz` archive, or a remote OCI/HTTP repository). It parses the `Chart.yaml` metadata, loads default values from `values.yaml`, and merges any user-supplied overrides from `--values` files or `--set` flags.

Helm then compiles the Go templates (`gotpl`) located in the chart's `templates/` directory against the merged configuration values. The resulting raw Kubernetes manifest stream is sent to the Kubernetes API server via client-go REST calls.

Simultaneously, Helm serializes the complete release state—including the generated manifests, chart metadata, and configuration values—into a compressed, base64-encoded Kubernetes `Secret` (or `ConfigMap`) stored inside the target namespace under the naming convention `sh.helm.release.v1.<release-name>.v1`. This secret serves as the release database. The command returns an exit code of `0` upon successful API acceptance, or initiates an atomic rollback if `--atomic` is enabled and a resource fails.

## Performance Notes

- Installing large charts containing dozens of complex CRDs and resource objects can introduce API server latency; utilizing `--wait` forces Helm to continuously poll pod status endpoints until readiness thresholds are satisfied.
- Remote chart downloads from network repositories incur initial network overhead before template rendering begins.

## Security Notes

- **Privileged Chart Execution:** Helm charts often deploy cluster-admin roles, custom resource definitions (CRDs), and privileged daemonsets. Installing untrusted public charts can compromise cluster security.
- **Secret Database Exposure:** Release configurations and passwords supplied via `--set` are stored in plain text within Kubernetes Secrets in the target namespace; ensure RBAC permissions restrict secret access.

## Common Mistakes

- **Reusing existing release names:** Running `helm install my-app ./chart` when a release named `my-app` already exists in the namespace. **Why it's wrong:** Helm rejects the command with a release exists error; you must use `helm upgrade` instead.
- **Forgetting namespace isolation:** Installing charts without specifying `--namespace`, causing resources to deploy into the active default namespace unexpectedly. **Why it's wrong:** It clutters default scopes and breaks resource isolation boundaries.
- **Exposing secrets via command-line `--set`:** Passing database passwords directly via `--set password=secret`. **Why it's wrong:** The plaintext password is recorded in local shell history files and Kubernetes release secret databases.

## Best Practices

- Always use `--atomic` and `--wait` in production deployment pipelines to ensure failed installations automatically roll back cleanly without leaving orphan resources.
- Store environment-specific configuration overrides in version-controlled YAML files (`values-prod.yaml`) rather than complex inline `--set` flags.
- Verify rendered templates locally using `helm template` or `helm install --dry-run` before submitting changes to production clusters.

## Interview Questions

- **Q:** What is the technical function of the Kubernetes Secret created during a `helm install` execution?
  - **A:** Helm stores the complete lifecycle history and state of a release inside a Kubernetes Secret (or ConfigMap) named `sh.helm.release.v1.<release>.v1`. This secret holds the compressed, base64-encoded manifest, chart metadata, and configuration values, acting as Helm's local database for tracking upgrades, rollbacks, and uninstallations.
- **Q:** How does Helm process configuration precedence when merging values during `helm install`?
  - **A:** Helm merges values using a strict precedence hierarchy: default values defined in the chart's `values.yaml` are overwritten by values specified in files passed via `--values` (evaluated in left-to-right order), which are ultimately overridden by individual inline `--set` flag declarations.
- **Q:** What happens if an installation fails halfway through when the `--atomic` flag is enabled?
  - **A:** The `--atomic` flag instructs Helm to monitor the deployment. If any resource fails to initialize or times out, Helm automatically triggers a clean purge and rollback, deleting all Kubernetes objects created during that installation attempt and returning the cluster to its prior state.

## Practice Problems

- **Problem:** Install a local chart located at `./my-chart` under the release name `frontend-app` in the `production` namespace, creating the namespace automatically and waiting for all pods to become ready.
  - _Hint:_ Combine the release name, chart path, namespace flag, create-namespace flag, and wait flag.
  - _Solution:_ `helm install frontend-app ./my-chart --namespace production --create-namespace --wait` (This provisions the namespace, deploys the chart, and blocks execution until readiness).
- **Problem:** Perform a dry-run installation of a remote chart `bitnami/postgresql` while overriding the database user name to `admin` using an inline configuration flag.
  - _Hint:_ Combine the dry-run flag with the set configuration flag.
  - _Solution:_ `helm install my-db bitnami/postgresql --set auth.username=admin --dry-run` (This simulates template rendering locally without contacting the cluster API server).

## References

- [Helm Documentation - Installing Charts](https://helm.sh/docs/intro/using_helm/#helm-install-installing-a-package)
- [Helm CLI Command Reference - helm install](https://helm.sh/docs/helm/helm_install/)
