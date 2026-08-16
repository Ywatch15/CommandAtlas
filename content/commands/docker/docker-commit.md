---
slug: docker-commit
name: docker commit
aliases:
  - docker container commit
category: docker
tags:
  - docker
  - images
  - containers
  - state
  - snapshot
  - debugging
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
  - create image from container changes
  - save container state as image
  - snapshot running docker container
  - commit docker changes to image
  - export container modifications
relatedCommands:
  - docker-build
  - docker-run
  - docker-cp
alternatives:
  - docker-build
status: draft
---

## What is it?

`docker commit` is a command-line utility that captures the current state of a container's writable filesystem layer and packages it into a brand-new Docker image. It effectively acts as a snapshot tool, freezing any ad-hoc modifications (installed packages, configuration edits, copied files) made inside a container into a reusable, read-only image blueprint.

## Why does it exist?

While declarative infrastructure via `Dockerfiles` is the industry standard for creating images, engineers sometimes need to prototype rapidly. If a developer drops into a container via `docker run -it`, installs an array of complex dependencies manually, and successfully compiles a tricky codebase, losing that environment when the container dies is frustrating. `docker commit` exists to instantly snapshot these interactive, unscripted changes into a persistent image, allowing the user to preserve their working state or share the environment for debugging without immediately authoring a formal Dockerfile.

## Syntax

```bash
docker commit [OPTIONS] CONTAINER [REPOSITORY[:TAG]]
```

## Flags

| Flag                       | Description                                                                                             | Example                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `-a`, `--author <string>`  | Applies metadata identifying the author/creator of the new image.                                       | `docker commit -a "Jane Doe <jane@corp.net>" my-container new-image` |
| `-c`, `--change <list>`    | Applies a specific Dockerfile instruction (e.g., CMD, ENTRYPOINT, ENV) to the created image.            | `docker commit -c "CMD ['apache2ctl', '-D', 'FOREGROUND']" web`      |
| `-m`, `--message <string>` | Attaches a commit message explaining the changes, similar to a Git commit message.                      | `docker commit -m "Installed gcc and make" dev-env cpp-dev:v1`       |
| `-p`, `--pause`            | Pauses the container during the commit operation to ensure filesystem consistency (enabled by default). | `docker commit -p=false db-container snapshot`                       |
| `--help`                   | Outputs brief usage documentation and supported command-line options.                                   | `docker commit --help`                                               |

## Examples

```bash
docker commit 9f3e4b2d1a custom-ubuntu:v1
```

> This takes a snapshot of the container with ID `9f3e4b2d1a` (which may contain manually installed software) and saves it locally as a new image named `custom-ubuntu` with the tag `v1`.

```bash
docker commit -m "Added vulnerability patch" -a "SecOps Team" patched-proxy secure-proxy:1.1
```

> This commits the changes made inside the `patched-proxy` container into a new image (`secure-proxy:1.1`), explicitly attaching audit metadata identifying who made the commit and why.

```bash
docker commit -c "ENV DEBUG=true" -c "EXPOSE 8080" interactive-dev local-dev-env:latest
```

> This commits an interactive session but uses the `-c` flag to inject Dockerfile-style configuration directives into the final image metadata, ensuring the new image exposes a specific port and sets a runtime environment variable automatically.

```bash
docker commit -p=false high-traffic-db db-snapshot:live
```

> This captures the state of a highly active database container without pausing its execution (`-p=false`), avoiding application downtime at the slight risk of capturing partially written transactions.

## Real-World Scenarios

**Rapid Prototyping and Exploration**

```bash
docker commit experimentation-env base-python-ml:v1
```

> Data scientists experimenting with deeply nested, conflicting Python ML dependencies use an interactive container to find a working combination via pip installs. Once stable, they commit the container to avoid breaking the environment while they translate the steps into a proper Dockerfile later.

**Forensic Security Snapshots**

```bash
docker commit compromised-webserver forensic-snapshot:incident-102
```

> Incident response teams immediately pause and commit containers exhibiting signs of compromise. This captures the attacker's dropped malware and exact filesystem state into a static image that can be booted securely in an isolated sandbox for forensic analysis.

**Reverse Engineering Legacy Systems**

```bash
docker commit legacy-app legacy-app-patched:v2
```

> Operations engineers managing undocumented, legacy applications patch configuration files interactively inside the container because the original source code or Dockerfile was lost, committing the changes to keep the system operational.

## When should it NOT be used?

- **Building official production images:** **Reason:** Images created via `docker commit` lack a traceable, version-controlled recipe (`Dockerfile`). They are considered "black boxes" because no one can audit how the software was installed or reproduce the build programmatically. **Use instead:** `docker build` with a Git-tracked Dockerfile.
- **Capturing data stored in mounted volumes:** **Reason:** `docker commit` _only_ snapshots the container's writable union filesystem layer. Any data stored in a mapped host volume or named volume is completely ignored and will not exist in the resulting image. **Use instead:** Volume backup utilities (tarballing the volume mount).

## Alternatives

- **`docker build`:** Declarative image compilation. **Tradeoff:** Requires writing a Dockerfile and recompiling, but guarantees absolute transparency, security auditing, and deterministic reproducibility across environments.
- **`docker export`:** Filesystem extraction. **Tradeoff:** `export` flattens the entire container filesystem into a raw tarball, stripping all image history, metadata, and Docker-specific configurations (like ENTRYPOINT). `commit` preserves image layered history and metadata.

## How it works internally

A Docker container runs by mounting a thin, writable filesystem layer (the container layer) on top of the immutable, read-only layers that make up its base image (via OverlayFS).

When you execute `docker commit`, the Docker daemon briefly suspends all processes running inside the container (using cgroup freezer) to ensure the filesystem is not actively being modified. It then generates a hash of the container's writable layer, packages the file modifications (additions, modifications, deletions) into a new physical tarball layer, and writes it to disk.

The daemon constructs a new Image Manifest JSON document. This manifest links the original read-only base layers to this newly created differential layer and appends any metadata modifications provided via `-c` flags. Finally, it unpauses the container, tags the new manifest with the requested repository name, and adds the new Image ID to your local `docker images` list.

## Performance Notes

- Committing containers with massive gigabyte-scale writable layers (such as those where large databases or apt packages were downloaded) incurs heavy disk I/O and noticeable pause times while the tarball is generated and compressed.
- Relying on successive commits instead of rebuilding from a Dockerfile creates highly bloated, inefficient image layer histories that consume excessive storage.

## Security Notes

- **The "Black Box" Anti-Pattern:** Security scanners cannot reliably determine the origin of binaries installed interactively. A committed image might harbor unaudited, outdated packages or malware downloaded during the interactive session.
- **Accidental Secret Embedding:** If a developer temporarily copies an SSH key or AWS credential file into the container to download a private dependency and subsequently commits the container, those secrets are permanently baked into the image's filesystem history and can be trivially extracted by anyone with the image.

## Common Mistakes

- **Assuming volumes are committed:** Executing `docker commit` on a database container expecting the actual database records to be saved. **Why it's wrong:** Data written to volumes (`-v`) bypasses the container's writable layer. The committed image will have an empty database.
- **Using commit as a deployment strategy:** Replacing proper CI/CD pipelines with SSHing into servers, updating code manually in a container, and committing it. **Why it's wrong:** This destroys infrastructure-as-code principles, making cluster scaling and disaster recovery impossible.
- **Forgetting to clean up temporary files before committing:** **Why it's wrong:** Apt caches, temporary downloads, and log files generated during the interactive session will be permanently frozen into the new image layer, inflating its size indefinitely.

## Best Practices

- Use `docker commit` exclusively for emergency forensics, debugging, and rapid prototyping. Always mandate that final production images are generated via `docker build` and a version-controlled Dockerfile.
- Clean up environment artifacts (run `apt-get clean`, `rm -rf /tmp/*`) inside the interactive session immediately before executing the commit to minimize image bloat.
- Leverage the `-c` flag during commit to redefine critical `ENTRYPOINT` or `CMD` instructions if the original image's default commands were overridden or destroyed during your interactive session.

## Interview Questions

- _Query:_ Why is creating production Docker images via `docker commit` widely considered a severe DevOps anti-pattern?
  - _A:_ `docker commit` produces "black box" images. Because changes are made interactively, there is no declarative, version-controlled blueprint (Dockerfile) documenting what was installed. This destroys reproducibility, makes security auditing nearly impossible, and prevents automated CI/CD builds.
- _Query:_ What happens to the data stored inside a Docker Volume when you run `docker commit` on that container?
  - _A:_ The data is entirely ignored. Docker Volumes mount directly into the container from the host filesystem, bypassing the container's Union Filesystem (the writable top layer). `docker commit` only captures changes made to that specific writable layer.
- _Query:_ Why does the Docker daemon temporarily pause a container by default when executing a `docker commit` operation?
  - _A:_ The daemon pauses the container (freezing its processes) to prevent active writes to the filesystem during the snapshot generation. This ensures data consistency and prevents corrupted files or half-written database logs from being packaged into the new image layer.

## Practice Problems

- _Problem:_ You have been modifying a running container named `dev-sandbox`. Create a new image from it named `sandbox-snapshot:v2`, and include an author tag noting "Admin User".
  - _Hint:_ Combine the commit command, the author flag, the target container, and the desired repository/tag name.
  - _Solution:_ `docker commit -a "Admin User" dev-sandbox sandbox-snapshot:v2` (This snapshots the container and attaches the specified author metadata).
- _Problem:_ Commit a running container named `web-test` into an image named `custom-nginx:latest`, but inject a new Dockerfile instruction that sets the environment variable `APP_ENV=production` in the resulting image.
  - _Hint:_ Use the change flag (`-c`) to apply the Dockerfile ENV instruction during the commit.
  - _Solution:_ `docker commit -c "ENV APP_ENV=production" web-test custom-nginx:latest` (This captures the filesystem and alters the image's runtime metadata configuration).

## References

- [Docker CLI Reference - docker commit](https://docs.docker.com/engine/reference/commandline/commit/)
- [Docker Documentation - Container layers and committing](https://docs.docker.com/storage/storagedriver/)
