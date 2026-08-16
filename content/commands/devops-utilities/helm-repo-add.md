---
slug: helm-repo-add
name: helm repo add
aliases: []
category: devops-utilities
tags:
  - helm
  - kubernetes
  - package-manager
  - repository
  - charts
  - registry
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - add helm chart repository
  - register helm repo url
  - add stable helm repository
  - configure helm chart source
  - connect helm to chart registry
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`helm repo add` is a package management command used to add a remote Helm chart repository to your local client configuration. It registers a local repository name alongside its remote HTTP/HTTPS URL, enabling you to search, pull, and install charts hosted in that repository.

## Why does it exist?

Helm charts are distributed across hundreds of distinct public and private package registries (such as Bitnami, Artifact Hub, or corporate OCI registries). Before Helm can locate or install a chart from a remote source, the client must know where to find its index file. `helm repo add` exists to bridge this operational gap, recording repository endpoints locally inside the user's configuration storage (`repositories.yaml`).

## Syntax

```bash
helm repo add [NAME] [URL] [options]
```

## Flags

| Flag                 | Description                                                                                        | Example                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `--username`         | Specifies the username for authenticating against protected HTTP/HTTPS repositories.               | `helm repo add private-repo https://charts.example.com --username admin`    |
| `--password`         | Specifies the password or token for authenticating against protected repositories.                 | `helm repo add private-repo https://charts.example.com --password secret`   |
| `--password-stdin`   | Reads the authentication password or token from standard input (stdin).                            | `cat token.txt                                                              | helm repo add private-repo https://url.com --username user --password-stdin` |
| `--ca-file`          | Specifies the path to a TLS certificate authority file used to verify secure repository endpoints. | `helm repo add secure-repo https://url.com --ca-file /path/to/ca.crt`       |
| `--cert-file`        | Specifies the path to a TLS client certificate file for mutual TLS (mTLS) authentication.          | `helm repo add secure-repo https://url.com --cert-file /path/to/client.crt` |
| `--key-file`         | Specifies the path to a TLS client private key file for mutual TLS authentication.                 | `helm repo add secure-repo https://url.com --key-file /path/to/client.key`  |
| `--force-update`     | Forces updating the local repository index if the repository name already exists.                  | `helm repo add stable https://charts.helm.sh/stable --force-update`         |
| `--no-update`        | Skips updating local repository index caches immediately after adding the repo.                    | `helm repo add my-repo https://charts.example.com --no-update`              |
| `--pass-credentials` | Passes authorization credentials to remote domains during redirects.                               | `helm repo add my-repo https://url.com --pass-credentials`                  |

## Examples

```bash
helm repo add bitnami [https://charts.bitnami.com/bitnami](https://charts.bitnami.com/bitnami)
```

> This registers the official Bitnami chart repository locally under the short name `bitnami`, downloading its package index immediately.

```bash
helm repo add prometheus-community [https://prometheus-community.github.io/helm-charts](https://prometheus-community.github.io/helm-charts)
```

> This adds the Prometheus community chart repository to your local Helm client configuration, allowing you to install monitoring stacks.

```bash
helm repo add internal-charts [https://nexus.internal.net/repository/helm-charts](https://nexus.internal.net/repository/helm-charts) --username deployer --password 'SecureToken!123'
```

> This registers a private corporate Helm repository hosted on Nexus, providing explicit HTTP basic authentication credentials.

```bash
helm repo add secure-registry [https://harbor.corp.net/charts](https://harbor.corp.net/charts) --ca-file /etc/ssl/certs/corp-ca.crt
```

> This adds a secure enterprise registry using a custom corporate Certificate Authority (CA) file (`corp-ca.crt`) to validate self-signed TLS certificates.

```bash
helm repo add custom-repo [https://charts.example.com](https://charts.example.com) --no-update
```

> This registers a remote repository URL locally without triggering an immediate remote index download (`--no-update`).

## Real-World Scenarios

**Bootstrapping Developer Workstations**

```bash
helm repo add bitnami [https://charts.bitnami.com/bitnami](https://charts.bitnami.com/bitnami) && helm repo update
```

> Development onboarding scripts use `helm repo add` to configure essential public chart repositories and refresh local index caches so engineers can begin deploying dependencies instantly.

**Integrating Private Enterprise Artifact Registries**

```bash
helm repo add corp-registry [https://harbor.company.com/chartrepo/core](https://harbor.company.com/chartrepo/core) --username $HARBOR_USER --password $HARBOR_TOKEN
```

> CI/CD build agents securely register private corporate chart registries (such as JFrog Artifactory or Harbor) using environment variables for authentication before pulling proprietary charts.

**Setting Up Air-Gapped or Secure Certificate Environments**

```bash
helm repo add secure-nexus [https://nexus.secure.local/repository/helm](https://nexus.secure.local/repository/helm) --ca-file /etc/ssl/certs/internal-root.pem
```

> Systems administrators operating within secure enterprise networks register internal chart mirrors while providing explicit custom CA certificate bundles to satisfy strict TLS verification policies.

## When should it NOT be used?

- **Using OCI-compliant container registries for chart distribution:** **Reason:** OCI registries (like Docker Hub, GitHub Packages, or Google Artifact Registry) store charts as OCI artifacts; they do not use traditional HTTP chart index repositories. **Use instead:** `helm registry login` and `helm install oci://...`.
- **Managing local chart directories on disk:** **Reason:** `helm repo add` expects remote HTTP/HTTPS repository URLs; local folders should be installed directly via their filesystem path. **Use instead:** `helm install my-app ./local-chart-dir`.

## Alternatives

- `helm registry login`: Authenticates against OCI-compliant container registries. **Tradeoff:** OCI registries store charts as container images directly without requiring HTTP repository index files, whereas `helm repo add` manages traditional index-based chart repositories.
- Manual `repositories.yaml` editing. **Tradeoff:** Editing local YAML configuration files manually is error-prone and risks syntax corruption, whereas `helm repo add` handles safe file serialization automatically.

## How it works internally

When you execute `helm repo add [NAME] [URL]`, Helm performs several local and remote operations.

First, it validates the URL syntax and checks whether the specified repository name already exists in the local client configuration file (typically located at `~/.config/helm/repositories.yaml` on Linux/macOS or `%APPDATA%\helm\repositories.yaml` on Windows).

Next, Helm attempts to download the repository's metadata index file (`index.yaml`) from the remote URL over HTTPS (passing authentication headers, CA files, or client certificates if provided). This `index.yaml` file contains a structured catalog of all available chart versions, descriptions, and download tarball URLs.

The downloaded index is parsed and cached locally inside the cache directory (`~/.cache/helm/repository/`). Finally, Helm updates `repositories.yaml` to include the new repository entry, ensuring subsequent commands like `helm search repo` can query the newly registered package catalog. The command exits with `0` upon successful registration and index download, or non-zero if network timeouts or authentication failures occur.

## Performance Notes

- Adding repositories with massive index files across high-latency networks can cause brief initialization delays during the initial remote `index.yaml` download phase.
- Storing excessive unused repositories in `repositories.yaml` can slow down local `helm search repo` operations as Helm parses multiple large index caches.

## Security Notes

- **Credential Storage Risk:** Credentials passed via `--username` and `--password` are written in plain text inside the local client configuration file (`~/.config/helm/repositories.yaml`). Ensure local workstation security and file permissions (`600`) protect this directory.
- **Man-in-the-Middle Protection:** Always verify TLS certificates when adding external repositories; use `--ca-file` for private registries to prevent man-in-the-middle interception of chart downloads.

## Common Mistakes

- **Treating OCI registries as traditional chart repos:** Running `helm repo add` on an OCI container registry URL. **Why it's wrong:** OCI registries do not serve `index.yaml` files. Trying to add them via `repo add` will fail with a 404 or index download error. Use `helm registry login` instead.
- **Forgetting to run `helm repo update` after adding:** **Why it's wrong:** If you passed `--no-update`, your local client cache lacks the chart index, meaning `helm search repo` will not find any charts until an explicit `helm repo update` is executed.
- **Hardcoding plaintext passwords in shared scripts:** Passing cleartext enterprise repository passwords directly in multi-user shell scripts without environment variables. **Why it's wrong:** It exposes credentials in shell history and process lists.

## Best Practices

- Always use environment variables or stdin (`--password-stdin`) when passing credentials to `helm repo add` in automated scripts to prevent credential exposure in shell history.
- Periodically audit your local repository list using `helm repo list` and remove unused or deprecated repositories to keep your local search index clean.
- When connecting to corporate artifact repositories utilizing internal PKI, always supply the correct `--ca-file` bundle to guarantee secure TLS handshakes.

## Interview Questions

- _Query:_ Where does Helm store the repository registrations and local index caches added via `helm repo add`?
  - _A:_ Helm stores repository name-to-URL mappings inside the local client configuration file (`~/.config/helm/repositories.yaml`), while downloaded remote chart catalog indexes (`index.yaml`) are cached locally inside `~/.cache/helm/repository/`.
- _Query:_ What is the fundamental difference in how Helm interacts with an HTTP chart repository added via `helm repo add` versus an OCI container registry?
  - _A:_ Traditional HTTP repositories publish an explicit `index.yaml` catalog file which Helm downloads and caches locally via `repo add` to track available charts. OCI registries (like Harbor or GitHub Packages) store charts as standard OCI container artifacts, bypassing index files entirely in favor of direct registry authentication (`helm registry login`) and OCI pull semantics.
- _Query:_ Why might `helm search repo` return no results immediately after successfully running `helm repo add my-repo https://charts.example.com --no-update`?
  - _A:_ The `--no-update` flag explicitly suppresses the immediate download of the remote repository's `index.yaml` file. Because the local cache directory has not yet received or parsed the index catalog, Helm has no knowledge of the charts inside that repository until you run `helm repo update`.

## Practice Problems

- _Problem:_ Register a remote Helm chart repository named `stable` pointing to `https://charts.helm.sh/stable` and force an immediate update of its local index cache.
  - _Hint:_ Use the repo add command with the repository name and URL, ensuring default update behavior occurs.
  - _Solution:_ `helm repo add stable https://charts.helm.sh/stable` (This registers the URL locally under the name `stable` and downloads the package index cache automatically).
- _Problem:_ Add a private enterprise chart repository located at `https://charts.corp.net/internal` using the username `deployer` while reading the password securely from standard input via `stdin`.
  - _Hint:_ Combine the repo add command with the username flag and the password-stdin flag, piping the token.
  - _Solution:_ `echo "SecretToken123" | helm repo add corp-internal https://charts.corp.net/internal --username deployer --password-stdin` (This registers the private repo and authenticates securely without leaking plaintext secrets in shell history).

## References

- [Helm Documentation - Working with Chart Repositories](https://helm.sh/docs/topics/registries/)
- [Helm CLI Command Reference - helm repo add](https://helm.sh/docs/helm/helm_repo_add/)
