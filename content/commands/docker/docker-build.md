---
slug: docker-build
name: docker build
aliases:
  - docker image build
category: cloud-cli
tags:
  - docker
  - build
  - images
  - dockerfile
  - ci-cd
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
  - build a docker image
  - create image from dockerfile
  - compile container image
  - build docker container context
  - generate docker image from source
relatedCommands:
  - docker-push
  - docker-images
  - docker-run
  - docker-tag
  - docker-commit
  - docker-compose
  - docker-cp
  - docker-rmi
alternatives:
  - docker-commit
status: draft
---

## What is it?

`docker build` is a command-line utility used to compile a Docker image from a set of instructions defined in a `Dockerfile` and a specified "build context" (a set of local files). It orchestrates the creation of layered read-only filesystems that encapsulate applications, their dependencies, and the required runtime environment.

## Why does it exist?

Before containerization, deploying applications meant manually provisioning servers, installing dependencies via shell scripts, and hoping the production environment matched the developer's laptop. `docker build` solves this by introducing a declarative, version-controlled blueprint (`Dockerfile`). It guarantees absolute reproducibility by compiling the application and its OS-level dependencies into an immutable, portable artifact (the Docker image) that runs identically on any Docker-enabled host.

## Syntax

```bash
docker build [OPTIONS] PATH | URL | -
```

## Flags

| Flag                     | Description                                                                                                 | Example                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `-t`, `--tag <name:tag>` | Applies a repository name and an optional tag (e.g., `latest`) to the built image.                          | `docker build -t my-app:1.0 .`                          |
| `-f`, `--file <path>`    | Specifies a custom name or path for the Dockerfile instead of looking for `Dockerfile` in the context root. | `docker build -f docker/prod.Dockerfile .`              |
| `--build-arg <key=val>`  | Passes build-time variables that can be accessed via `ARG` instructions in the Dockerfile.                  | `docker build --build-arg NODE_ENV=prod .`              |
| `--no-cache`             | Disables the internal layer cache, forcing a clean rebuild of all instructions.                             | `docker build --no-cache -t my-app .`                   |
| `--target <stage>`       | Builds only up to a specific stage in a multi-stage Dockerfile workflow.                                    | `docker build --target builder -t app-build .`          |
| `--network <net>`        | Sets the networking mode used for the ephemeral `RUN` containers during the build process.                  | `docker build --network host .`                         |
| `--pull`                 | Forces Docker to attempt pulling newer versions of the base image (`FROM`) before building.                 | `docker build --pull -t my-app .`                       |
| `--secret <id=val>`      | Passes sensitive information securely (via BuildKit) without baking it into the image layers.               | `docker build --secret id=aws,src=~/.aws/credentials .` |
| `--progress <type>`      | Sets the type of progress output (`auto`, `plain`, `tty`).                                                  | `docker build --progress=plain .`                       |
| `-q`, `--quiet`          | Suppresses build output and prints only the final image ID on success.                                      | `docker build -q .`                                     |
| `--platform <os/arch>`   | Specifies the target hardware architecture for cross-compilation (e.g., `linux/arm64`).                     | `docker build --platform linux/amd64 .`                 |

## Examples

```bash
docker build -t frontend-app:latest .
```

> This initiates a build using the current directory (`.`) as the build context. It searches for a standard `Dockerfile`, executes its instructions, and tags the resulting image as `frontend-app:latest`.

```bash
docker build -f config/Dockerfile.worker -t background-worker .
```

> This overrides the default filename lookup, reading build instructions from `config/Dockerfile.worker` while still using the root directory (`.`) as the filesystem build context.

```bash
docker build --build-arg APP_VERSION=2.4.1 -t api-server:2.4.1 .
```

> This injects a build argument (`APP_VERSION`) into the build environment. The Dockerfile can capture this via the `ARG` instruction to dynamically download specific dependencies or set version metadata.

```bash
docker build --target production-stage -t lean-app .
```

> When processing a multi-stage Dockerfile, this command halts the build process immediately after completing the `production-stage` block, discarding heavy compilation toolchains from the final image.

```bash
docker build --no-cache --pull -t secure-app .
```

> This guarantees the most pristine build possible: it forces a fresh download of the upstream base image (`--pull`) and ignores all previously cached local filesystem layers (`--no-cache`).

## Real-World Scenarios

**Multi-Arch Image Compilation in CI/CD Pipelines**

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t my-repo/app:v1 --push .
```

> Release pipelines utilize BuildKit's extended `buildx` plugin to cross-compile container images for both Intel and Apple Silicon/ARM processors simultaneously, pushing a unified multi-arch manifest to the registry.

**Securely Passing Authentication Tokens During Builds**

```bash
DOCKER_BUILDKIT=1 docker build --secret id=npm_token,src=.npmrc -t node-app .
```

> Developers fetching private NPM dependencies use BuildKit secret mounts. This allows the ephemeral build container to read the token temporarily to download packages without permanently baking the plaintext token into the final image layers.

**Optimizing Build Speeds with External Caches**

```bash
docker build --cache-from my-repo/app:latest -t my-repo/app:new-feature .
```

> CI/CD runners pull the `latest` image from the remote registry and use `--cache-from` to populate the local build cache. This drastically accelerates subsequent builds by skipping unchanged instructions (like dependency installations).

## When should it NOT be used?

- **Building directly on heavily restricted, daemonless production servers:** **Reason:** `docker build` requires a running Docker daemon (`dockerd`) operating with root privileges. **Use instead:** Rootless/daemonless builders like `kaniko` or `buildah`.
- **Baking runtime secrets (database passwords) into the image:** **Reason:** Image layers are immutable and easily inspectable via `docker history`. Baking secrets exposes them to anyone with access to the image registry. **Use instead:** Inject secrets at runtime using `docker run -e` or orchestration vaults.

## Alternatives

- **`kaniko` (Google):** Daemonless container image builder. **Tradeoff:** Designed specifically for building images securely inside Kubernetes clusters without requiring privileged Docker socket access.
- **`buildah` (Red Hat):** Flexible OCI image builder. **Tradeoff:** Provides granular control to build images natively via bash scripts without writing a formal `Dockerfile` or requiring a persistent daemon.
- **`pack` (Cloud Native Buildpacks):** Source-to-image compiler. **Tradeoff:** Analyzes application source code and automatically generates an OCI image without requiring a developer to write or maintain a `Dockerfile` manually.

## How it works internally

When you run `docker build .`, the Docker CLI creates a `.tar` archive of the "build context" (the current directory, excluding files listed in `.dockerignore`) and streams it over the local UNIX socket to the Docker daemon.

Modern Docker versions utilize the **BuildKit** backend engine. BuildKit parses the `Dockerfile` into an intermediate representation called LLB (Low-Level Builder). It analyzes a directed acyclic graph (DAG) of the instructions to determine dependencies, allowing it to execute independent build stages in parallel.

For each instruction (e.g., `RUN apt-get install`), BuildKit spins up an ephemeral container, executes the command, captures the filesystem differences (using OverlayFS), commits those changes as a new read-only tarball layer, and generates a SHA-256 hash. If an instruction and its parent layers match a previously calculated hash in the local cache, BuildKit skips execution entirely and reuses the cached layer. Finally, it constructs an OCI/Docker image manifest that points to the ordered list of layer digests and tags it with the requested repository name.

## Performance Notes

- The size of the build context directly impacts startup time. If you run `docker build` in a massive directory (e.g., your home folder) without a `.dockerignore` file, the CLI will freeze while it archives gigabytes of irrelevant data to send to the daemon.
- Order matters: placing frequently changing instructions (like `COPY . .`) _after_ slow, rarely changing instructions (like `RUN npm install`) maximizes cache hits and slashes compilation times from minutes to seconds.

## Security Notes

- **Secret Leakage:** Using `ENV` or `ARG` to pass SSH keys or API tokens leaves those credentials permanently embedded in the image's metadata and layer history. Always use BuildKit `--secret` mounts for build-time credentials.
- **Supply Chain Vulnerabilities:** Using broad tags like `FROM ubuntu:latest` introduces non-deterministic builds. Upstream changes to `latest` can silently introduce new security vulnerabilities. Always pin base images to specific immutable SHAs or minor versions.

## Common Mistakes

- **Forgetting the trailing dot (`.`):** Running `docker build -t my-app`. **Why it's wrong:** The command requires a path to the build context. Omitting the `.` prevents the CLI from knowing where to find the source files and Dockerfile.
- **Ignoring `.dockerignore`:** Failing to exclude `node_modules/`, `.git/`, or local log files. **Why it's wrong:** This uploads hundreds of megabytes of unnecessary local files to the daemon, slowing down the build, breaking the cache, and bloating the final image size.
- **Chaining too many `RUN` commands (Legacy):** Writing ten separate `RUN` lines instead of chaining them with `&&`. **Why it's wrong:** While BuildKit mitigates this somewhat, historically, every `RUN` creates a separate filesystem layer, bloating the image and exceeding layer limits.

## Best Practices

- Always define a comprehensive `.dockerignore` file adjacent to your `Dockerfile` to exclude local binaries, dependency folders, and sensitive `.env` files.
- Utilize **Multi-Stage Builds** (`FROM image AS builder`) to compile code in a heavy environment, then selectively copy only the compiled binary into a lightweight runtime image (like `alpine` or `scratch`) to minimize the attack surface.
- Run application processes as a non-root user by explicitly adding a `USER myuser` instruction near the end of your Dockerfile.

## Interview Questions

- **Q:** How does Docker determine whether it can use a cached layer during a build, and how does the `COPY` instruction affect this?
  - **A:** Docker calculates a cache key based on the parent layer's hash and the instruction string. For `COPY` and `ADD` instructions, it also calculates a checksum of the actual file contents being copied. If a single byte in a copied file changes, the cache is invalidated for that instruction and _all_ subsequent instructions in the Dockerfile.
- **Q:** What is a multi-stage build, and what specific problem does it solve?
  - **A:** A multi-stage build uses multiple `FROM` statements within a single Dockerfile. It allows developers to use a heavy, tool-laden base image (like a full Go or Node SDK) to compile the application, and then selectively copy only the resulting binary into a minimalist production image. This drastically reduces the final image size and security attack surface by discarding compilers and source code.
- **Q:** Why is running `docker build` in the root of your hard drive a terrible idea, even if the Dockerfile is simple?
  - **A:** Before evaluating the Dockerfile, the Docker CLI recursively archives the entire "build context" (the directory where the command is run) and sends it to the Docker daemon. Running it in a massive directory without a `.dockerignore` will cause the CLI to attempt to upload gigabytes or terabytes of unrelated data to the daemon, exhausting RAM and freezing the system.

## Practice Problems

- _Problem:_ Build a Docker image tagged as `api-server:v2` using a custom Dockerfile named `build.Dockerfile` located in the `deploy/` directory, while using the current directory as the build context.
  - _Hint:_ Combine the tag flag, the file override flag, and specify the current directory context.
  - _Solution:_ `docker build -t api-server:v2 -f deploy/build.Dockerfile .` (This reads the alternate file but still packages the current working directory to send to the daemon).
- _Problem:_ Execute a build for an image tagged `cache-test:1.0`, ensuring that Docker completely ignores any previously cached layers and pulls the newest version of the upstream base image.
  - _Hint:_ Combine the no-cache flag and the pull flag.
  - _Solution:_ `docker build --no-cache --pull -t cache-test:1.0 .` (This forces a strictly clean slate build, downloading fresh base layers and recompiling every step).

## References

- [Docker CLI Reference - docker build](https://docs.docker.com/engine/reference/commandline/build/)
- [Docker Documentation - Best practices for writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
