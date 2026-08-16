---
slug: docker-push
name: docker push
aliases:
  - docker image push
category: cloud-cli
tags:
  - docker
  - images
  - registry
  - upload
  - distribution
  - ci-cd
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
  - sh
intentPhrases:
  - upload docker image
  - push local image to registry
  - publish container image
  - push to docker hub
  - distribute docker image to ecr
relatedCommands:
  - docker-pull
  - docker-build
  - docker-tag
  - docker-login
  - docker-save-load
alternatives: []
status: draft
---

## What is it?

`docker push` is a command-line utility used to upload a locally built or tagged Docker image to a remote container registry (such as Docker Hub, AWS Elastic Container Registry, or GitLab Container Registry). It distributes the compiled filesystem layers and metadata manifests, making the application available for consumption by other developers or production clusters.

## Why does it exist?

While `docker build` compiles code into a containerized artifact locally, that artifact remains trapped on the developer's specific machine or CI runner. To deploy containers across distributed cloud infrastructure, there must be a central hub for storage and distribution. `docker push` exists to facilitate this pipeline, providing a secure, chunked, and deduplicated mechanism for uploading local images to authoritative central registries for global consumption.

## Syntax

```bash
docker push [OPTIONS] NAME[:TAG]
```

## Flags

| Flag                      | Description                                                                          | Example                                             |
| ------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `-a`, `--all-tags`        | Pushes all local tags associated with the specified repository name to the registry. | `docker push -a my-repo/app`                        |
| `-q`, `--quiet`           | Suppresses the verbose upload progress bars, printing only the final image digest.   | `docker push -q my-repo/app:v1`                     |
| `--disable-content-trust` | Skips cryptographic image signature signing (enabled by default if DCT is active).   | `docker push --disable-content-trust my-app:latest` |
| `--help`                  | Outputs brief usage documentation and supported command-line options.                | `docker push --help`                                |

## Examples

```bash
docker push johndoe/web-app:v2.0
```

> This connects to the default Docker Hub registry, authenticates using stored credentials, and uploads the local image tagged `v2.0` to the `johndoe/web-app` repository, skipping layers that already exist remotely.

```bash
docker push gcr.io/my-gcp-project/backend-api:latest
```

> Because the repository string includes a domain name (`gcr.io`), Docker bypasses Docker Hub and securely uploads the image layers directly to the specified Google Container Registry.

```bash
docker push -a [internal-registry.corp.com/monolith](https://internal-registry.corp.com/monolith)
```

> This scans the local cache for every tag applied to the `monolith` repository (e.g., `v1`, `v2`, `stable`) and pushes all of them simultaneously to the corporate artifact registry.

```bash
docker push -q aws_account_[id.dkr.ecr.us-east-1.amazonaws.com/service:build-845](https://id.dkr.ecr.us-east-1.amazonaws.com/service:build-845)
```

> This pushes an explicitly versioned deployment candidate to an AWS Elastic Container Registry silently (`-q`), reducing CI/CD console log spam by suppressing progress rendering.

```bash
DOCKER_CONTENT_TRUST=1 docker push secure-repo/financial-app:v1.0
```

> By invoking the command with content trust enabled via an environment variable, this uploads the image layers and prompts the user to cryptographically sign the metadata using a private Notary key, ensuring verifiable publisher integrity.

## Real-World Scenarios

**Publishing Automated CI/CD Build Artifacts**

```bash
docker tag local-build:latest [registry.gitlab.com/org/repo/app:$CI_COMMIT_SHA](https://registry.gitlab.com/org/repo/app:$CI_COMMIT_SHA)
docker push [registry.gitlab.com/org/repo/app:$CI_COMMIT_SHA](https://registry.gitlab.com/org/repo/app:$CI_COMMIT_SHA)
```

> Continuous integration pipelines build a local application, tag it with the exact Git commit hash, and push it to a private GitLab registry. This guarantees that deployment systems can retrieve precisely tracked, immutable code revisions.

**Distributing Multi-Architecture Manifests**

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t my-app:latest --push .
```

> Modern release workflows utilize BuildKit plugins (`buildx`) to compile software for multiple CPU architectures simultaneously, automatically pushing the underlying blobs and a unified "fat manifest" list to the registry in a single orchestrated command.

**Mirroring Public Images to Internal Secure Registries**

```bash
docker pull postgres:15
docker tag postgres:15 harbor.corp.net/approved/postgres:15
docker push harbor.corp.net/approved/postgres:15
```

> Enterprise security teams pull public open-source software, scan it for vulnerabilities, retag it with their internal registry domain, and push it inward to ensure production clusters never rely directly on external internet registries.

## When should it NOT be used?

- **Without prior authentication (`docker login`):** **Reason:** Remote registries reject unauthorized write requests with HTTP 401/403 errors. You must authenticate the Docker daemon first. **Use instead:** Run `docker login <registry-url>` beforehand.
- **Transferring images between completely disconnected/air-gapped networks:** **Reason:** `docker push` requires TCP network connectivity to an HTTP API endpoint. **Use instead:** `docker save -o image.tar` and transfer physically via USB/secure tunnel, then `docker load`.

## Alternatives

- **`skopeo copy`:** Direct registry-to-registry syncing. **Tradeoff:** Skopeo can copy images directly from one remote registry to another without pulling the massive layers down to the local Docker daemon first, drastically saving bandwidth and time.
- **`buildah push`:** Daemonless uploading. **Tradeoff:** Allows CI runners running as unprivileged users inside Kubernetes clusters to construct and push images to registries without requiring a root Docker daemon socket.

## How it works internally

When you execute `docker push`, the Docker daemon initiates a sequence defined by the **Docker Registry HTTP API V2**.

First, the daemon parses the repository string to identify the target registry domain (defaulting to `registry-1.docker.io`). It performs a TLS handshake and requests an authorization token for push access using credentials stored in `~/.docker/config.json`.

Once authorized, the daemon breaks the local image down into its constituent elements: the configuration JSON and a list of compressed tarball layers. To conserve network bandwidth, it queries the registry (`HEAD /v2/<repo>/blobs/<digest>`) for the SHA-256 hash of each local layer. This is called a "cross-repository blob mount" check.

If the registry replies that it already possesses a layer matching that hash (e.g., a standard Alpine base layer), the daemon skips uploading it entirely. For missing layers, the daemon initiates chunked `POST` and `PUT` upload streams. After all physical data blobs are successfully persisted remotely, the daemon submits a final `PUT` request containing the Image Manifest (the JSON map linking the tags, configuration, and layer hashes). The command completes once the registry acknowledges the manifest insertion.

## Performance Notes

- Uploading gigabytes of layers is heavily bound by outbound network bandwidth. Docker uploads up to 5 layers concurrently by default (adjustable via `max-concurrent-uploads` in `daemon.json`).
- Because registries implement aggressive layer deduplication via SHA-256 hashes, updating a 1GB application image where only a 5MB source code layer changed will execute in seconds, transferring only the 5MB delta.

## Security Notes

- **Dangling Plaintext Credentials:** The `docker push` command relies on authentication tokens generated by `docker login`, which are stored in plain text (or via a credential helper) in `~/.docker/config.json`. Exposing this file compromises write access to the registry.
- **Notary and Image Signing:** Enabling Docker Content Trust (`DOCKER_CONTENT_TRUST=1`) protects against registry compromise. If a hacker breaches the registry and swaps the image, users pulling it will reject the payload because it lacks your offline cryptographic private key signature.

## Common Mistakes

- **Pushing unauthorized repository names:** Running `docker push ubuntu`. **Why it's wrong:** The CLI assumes Docker Hub, but your authenticated user does not have write access to the official `ubuntu` namespace. You must tag the image under your own namespace first (e.g., `docker tag ubuntu my-user/ubuntu`).
- **Forgetting to retag before pushing to private registries:** Running `docker push my-app` expecting it to go to AWS ECR. **Why it's wrong:** Without a registry domain prefix in the tag, Docker routes the push to public Docker Hub, resulting in an unauthorized error or accidental public leakage of corporate code.
- **Pushing bloated, untampered images:** Pushing massive images containing build caches and local `.git` folders. **Why it's wrong:** Bloated images increase storage costs and deployment times exponentially across scaled clusters.

## Best Practices

- Never use `latest` as the sole tag when pushing CI artifacts. Always push dual tags: a specific immutable identifier (like the Git commit SHA or semantic version) alongside a rolling tag (like `production`) using `docker push -a`.
- Minimize image footprint before pushing by utilizing multi-stage builds and strict `.dockerignore` files, removing compiler toolchains that inflate upload times.
- Integrate centralized credential helpers (like `amazon-ecr-credential-helper` or `docker-credential-gcr`) in CI pipelines instead of hardcoding static passwords into `docker login` commands.

## Interview Questions

- **Q:** How does Docker minimize the bandwidth required when executing a `docker push` for an updated version of a large application?
  - **A:** Before transferring any physical data, the Docker daemon queries the remote registry API using the SHA-256 digest of each individual layer in the image. If the registry confirms it already has a layer matching that hash (like an unchanged base OS layer), Docker skips uploading that layer entirely, transferring only the newly modified filesystem delta blobs.
- **Q:** You want to push an image to a private corporate registry hosted at `registry.internal.com`, but running `docker push my-app` tries to send it to Docker Hub. How do you fix this?
  - **A:** Docker determines the destination registry by parsing the image tag string. To push to a custom registry, you must retag the local image so its name includes the fully qualified domain name of the target registry. (e.g., `docker tag my-app registry.internal.com/my-app:v1`, followed by `docker push registry.internal.com/my-app:v1`).
- **Q:** What is the specific purpose of the Image Manifest uploaded at the very end of the `docker push` process?
  - **A:** The Image Manifest is a JSON document that acts as the blueprint for the container. After all physical layer blobs are uploaded, the manifest is pushed to tie everything together. It links the human-readable tag (e.g., `latest`) to the ordered list of layer cryptographic hashes, architecture specifications, and execution configuration needed by clients to pull and run the image.

## Practice Problems

- _Problem:_ Upload all locally associated tags for the repository `nexus.corp.net/backend-api` to the remote registry.
  - _Hint:_ Combine the push command with the specific flag designed to push all tags for a given repository.
  - _Solution:_ `docker push -a nexus.corp.net/backend-api` (This uploads `v1`, `v2`, `latest`, etc., simultaneously).
- _Problem:_ Ensure that a push for `my-registry.io/secure-app:latest` bypasses standard cryptographic signature signing, even if content trust is globally active on the host.
  - _Hint:_ Utilize the explicit flag designed to override and disable content trust signing mechanisms.
  - _Solution:_ `docker push --disable-content-trust my-registry.io/secure-app:latest` (This instructs the daemon to upload the payload without invoking the Notary signer).

## References

- [Docker CLI Reference - docker push](https://docs.docker.com/engine/reference/commandline/push/)
- [Docker Documentation - Docker Content Trust](https://docs.docker.com/engine/security/trust/)
