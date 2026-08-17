---
slug: docker-cp
name: docker cp
aliases: []
category: docker
tags:
  - docker
  - containers
  - files
  - copy
  - extraction
  - filesystem
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
  - copy file from docker container
  - copy folder to docker container
  - extract logs from container
  - move files to local host from docker
  - docker copy command
relatedCommands: [docker-run, docker-exec, docker-commit, docker-build]
alternatives: [docker-exec]
status: draft
---

## What is it?

`docker cp` is a command-line utility used to copy files or directories seamlessly between a running or stopped Docker container and the local host filesystem. It acts as a bridge across the container namespace isolation boundary, allowing ad-hoc file transfers without requiring pre-configured volume mounts.

## Why does it exist?

While persistent data in Docker should be managed using volumes or bind mounts, administrators and developers frequently encounter situations where they need to extract a diagnostic log, retrieve a compiled binary, or inject a temporary configuration file into a container that is already running. `docker cp` exists to facilitate this out-of-band data transfer, providing an immediate, lightweight mechanism to extract or insert artifacts without modifying the image blueprint or restarting the container.

## Syntax

```bash
docker cp [OPTIONS] CONTAINER:SRC_PATH DEST_PATH
docker cp [OPTIONS] SRC_PATH|- CONTAINER:DEST_PATH
```

## Flags

| Flag                  | Description                                                                                                       | Example                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `-a`, `--archive`     | Archive mode: copies all UID/GID ownership and permissions identically from the source to the destination.        | `docker cp -a web:/app/data ./backup`                |
| `-L`, `--follow-link` | Follows symbolic links in the source path and copies the resolved target files instead of the symlink itself.     | `docker cp -L my-app:/var/log/symlink.log ./logs`    |
| `-q`, `--quiet`       | Suppresses verbose progress output during the file copy operation.                                                | `docker cp -q ./config my-app:/etc/config`           |
| `CONTAINER:PATH`      | (Argument) Denotes a path inside a specific container namespace. The container name or ID is followed by a colon. | `docker cp db-node:/var/lib/mysql/dump.sql .`        |
| `SRC_PATH`            | (Argument) The local filesystem path representing the source file or directory to copy.                           | `docker cp ./nginx.conf proxy:/etc/nginx/nginx.conf` |
| `DEST_PATH`           | (Argument) The local or container filesystem path representing the destination.                                   | `docker cp proxy:/etc/nginx/nginx.conf ./nginx.conf` |
| `-`                   | (Argument) Reads an uncompressed tar archive from STDIN and extracts it into the container's destination path.    | `tar cf - .                                          | docker cp - my-app:/workspace` |

## Examples

```bash
docker cp web-server:/var/log/nginx/access.log ./access.log
```

> This copies a specific log file out of the `web-server` container's internal filesystem and saves it directly to the local host's current working directory.

```bash
docker cp ./custom-config.json app-worker:/app/config.json
```

> This injects a local configuration file into a specific path inside the `app-worker` container, overwriting any existing file at that destination.

```bash
docker cp -a db-master:/var/lib/mysql/ ./db-backup/
```

> This extracts an entire directory from the container, preserving all nested files, subdirectories, and original Unix UID/GID permissions (`-a`) onto the host.

```bash
docker cp -L app-node:/etc/localtime ./container-time
```

> If `/etc/localtime` inside the container is a symlink to a timezone binary, the `-L` flag ensures the actual underlying binary file is copied to the host, not just the broken symlink text.

```bash
tar cf - src/ | docker cp - compiler-node:/workspace/
```

> This utilizes standard input (`-`) to stream an uncompressed tar archive of a local directory directly into the container, where Docker automatically extracts it into `/workspace/`.

## Real-World Scenarios

**Extracting Core Dumps for Post-Mortem Analysis**

```bash
docker cp crashed-app:/tmp/core.12345 ./diagnostics/
```

> When an application crashes with a segmentation fault inside a stopped container, systems engineers use `docker cp` to extract the heavyweight core dump file to the host for local analysis via `gdb`.

**Retrieving Build Artifacts from Ephemeral Containers**

```bash
docker cp build-container:/workspace/app-binary.tar.gz ./releases/
```

> CI/CD pipelines run code compilation inside heavy build containers and then use `docker cp` to pull the finalized, compiled binary out to the host before discarding the build container entirely.

**Hot-Patching Configurations During Outages**

```bash
docker cp ./emergency-patch.yml api-server:/app/config/settings.yml
docker exec api-server kill -HUP 1
```

> During an active outage, operators inject an emergency configuration file into a running container and send a HUP signal to force a hot reload without incurring container restart downtime.

## When should it NOT be used?

- **Managing persistent database storage:** **Reason:** `docker cp` is a manual, one-time file transfer. If the container crashes or is deleted, any data not mapped to a volume is destroyed. **Use instead:** Docker Volumes (`-v`).
- **Deploying application source code into production containers:** **Reason:** Copying code into a running container creates an untracked, mutable state (configuration drift) that diverges from the underlying image. **Use instead:** `docker build` with `COPY` instructions in a `Dockerfile`.

## Alternatives

- **Docker Volumes / Bind Mounts:** Maps host directories to containers at runtime. **Tradeoff:** Volumes provide real-time, synchronized access and persistence without manual copying, but require configuration during container creation (`docker run -v`).
- **`docker exec cat`:** Streaming file contents. **Tradeoff:** You can run `docker exec container cat /file > host-file`. This is functionally similar but lacks native directory recursion and permission preservation.

## How it works internally

When you execute `docker cp`, the Docker CLI does not directly access the container's filesystem. Instead, it relies on the Docker daemon API via the `/containers/{id}/archive` endpoints.

For copying _out_ of a container, the CLI sends an HTTP `GET` request to the daemon. The daemon accesses the container's overlay filesystem, packages the requested file or directory into a tar archive stream in memory, and transmits the byte stream back to the CLI, which untars it onto the host.

For copying _into_ a container, the CLI creates a tar archive of the local files and streams it via an HTTP `PUT` request to the daemon. The daemon unpacks the tar stream directly into the container's writable filesystem layer. Because `docker cp` interacts with the filesystem directly via the daemon, it works flawlessly on both running _and_ completely stopped containers, as no internal container processes are required to facilitate the transfer.

## Performance Notes

- `docker cp` operates by generating, streaming, and extracting tar archives. Copying massive directories containing millions of tiny files introduces significant CPU overhead and high latency due to tar serialization.
- Because the transfer streams through the Docker socket, extremely large files (e.g., 50GB database dumps) might temporarily saturate daemon memory or socket buffers compared to direct host filesystem access.

## Security Notes

- **Bypassing Container Immutability:** Injecting files into a running container allows operators to maliciously alter execution logic without triggering image rebuild audits.
- **UID/GID Mismatches:** When copying files to a host, files retain the numeric UID of the container's internal user. If the container runs as UID `1001`, the host file will be owned by UID `1001`, potentially causing local access denial or unexpected permission grants.

## Common Mistakes

- **Trailing slash confusion:** Running `docker cp app:/var/log/ ./logs` versus `docker cp app:/var/log ./logs`. **Why it's wrong:** A trailing slash on the source copies the _contents_ of the directory. Omitting the trailing slash copies the directory _itself_ into the destination.
- **Assuming it requires a running container:** Starting a crashed container just to extract files. **Why it's wrong:** `docker cp` works perfectly on stopped or exited containers because it reads the overlay filesystem directly via the daemon.
- **Attempting wildcards directly:** Running `docker cp app:/var/log/*.log .`. **Why it's wrong:** The Docker API does not natively evaluate bash shell wildcards inside the container path argument. You must copy the whole directory or use a piped `docker exec` tar stream.

## Best Practices

- Always use the `-a` (archive) flag when extracting directories where preserving specific internal file permissions, ownership, and timestamps is critical for analysis.
- For ephemeral build pipelines, heavily utilize multi-stage builds (`COPY --from=builder`) instead of relying on `docker cp` to pass artifacts between containers via the host.
- Regularly clear out temporary files injected via `docker cp` during troubleshooting to prevent writable layer bloat within long-running containers.

## Interview Questions

- **Q:** How does `docker cp` manage to copy files out of a container that has crashed and is currently in a stopped state?
  - **A:** `docker cp` does not rely on any internal container processes (like an SSH daemon or bash shell). It communicates with the Docker daemon, which reads or writes directly to the container's overlay filesystem layer on the host disk. Therefore, the container's execution state (running or stopped) is entirely irrelevant.
- **Q:** Explain the role of tar archiving in the underlying execution of a `docker cp` command.
  - **A:** The Docker API endpoint for copying files does not transfer raw binary files. Instead, the sender (either the CLI or the daemon) packages the requested files into an uncompressed tar archive stream, transmits it over the Docker socket, and the receiver extracts the tarball into the destination path, preserving directory structures.
- **Q:** If a file inside a container is owned by a user named `appuser` (UID 5000), what happens to the file ownership when you use `docker cp` to bring it to your local host machine?
  - **A:** The extracted file on the local host will be owned by the numeric UID `5000`. If no user exists with UID 5000 on the host system, `ls -l` will simply display the numeric ID `5000` as the owner.

## Practice Problems

- _Problem:_ Copy an entire directory `/app/data/` from a stopped container named `postgres-archive` to your current local directory, ensuring all original UID/GID permissions are preserved.
  - _Hint:_ Combine the archive flag with the appropriate container-to-host path syntax.
  - _Solution:_ `docker cp -a postgres-archive:/app/data/ .` (The `-a` flag preserves the ownership and permissions during the transfer).
- _Problem:_ Inject a local script named `patch.sh` into the `/usr/local/bin/` directory of an actively running container named `worker-node`.
  - _Hint:_ Place the local source file first, followed by the container destination.
  - _Solution:_ `docker cp ./patch.sh worker-node:/usr/local/bin/patch.sh` (This pushes the local file securely into the container's writable filesystem layer).

## References

- [Docker CLI Reference - docker cp](https://docs.docker.com/engine/reference/commandline/cp/)
- [Docker API Documentation - Extract an archive](https://docs.docker.com/engine/api/v1.43/#tag/Container/operation/PutContainerArchive)
