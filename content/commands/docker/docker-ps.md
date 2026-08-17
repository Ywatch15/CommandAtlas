---
slug: docker-ps
name: docker ps
aliases:
  - docker container ls
category: docker
tags:
  - docker
  - containers
  - monitoring
  - processes
  - devops
  - infrastructure
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
  - cmd
  - sh
intentPhrases:
  - list running docker containers
  - show docker container status
  - find docker container id
  - view active containers
  - list all stopped containers
relatedCommands: [docker-inspect, docker-logs, docker-exec, docker-rm, docker-run]
alternatives: []
status: draft
---

## What is it?

`docker ps` (also functionally equivalent to `docker container ls`) is a command-line utility used to list and display the status of Docker containers managed by the local Docker daemon. It outputs critical metadata including container IDs, base images, executed entrypoint commands, creation timestamps, current execution statuses, mapped network ports, and assigned human-readable names.

## Why does it exist?

In containerized environments, the host operating system's standard process monitoring tools (like `ps` or `top`) are often insufficient for managing workloads. While standard `ps` can show the underlying isolated host processes, it lacks the context of Docker's logical abstractions—such as mapped ports, image layers, active namespaces, and container networks. `docker ps` exists to provide a specialized, context-aware lens into the Docker Engine's state, bridging the gap between raw kernel cgroups/namespaces and the developer's container-centric abstractions.

## Syntax

```bash
docker ps [OPTIONS]
docker container ls [OPTIONS]
```

## Flags

| Flag             | Description                                                                                                                                                       | Example                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `-a`, `--all`    | Displays all containers, including those that are stopped, exited, or created but never started. By default, `docker ps` only shows currently running containers. | `docker ps -a`                      |
| `-q`, `--quiet`  | Outputs only the numeric Container IDs. Essential for piping outputs to other Docker commands in automation scripts.                                              | `docker ps -q`                      |
| `-f`, `--filter` | Applies server-side filtering to the query based on specific conditions (e.g., status, label, exited code, or image name).                                        | `docker ps -f "status=exited"`      |
| `--format`       | Pretty-prints containers using a Go template. Replaces the default tabular output with highly customizable strings or JSON.                                       | `docker ps --format '{{json .}}'`   |
| `-s`, `--size`   | Computes and displays the total file sizes for the containers, indicating how much disk space the writable container layer consumes.                              | `docker ps -s`                      |
| `-l`, `--latest` | Shows only the single most recently created container, regardless of its current running status.                                                                  | `docker ps -l`                      |
| `-n`, `--last`   | Shows the `n` last created containers, regardless of their current running statuses.                                                                              | `docker ps -n 3`                    |
| `--no-trunc`     | Disables output truncation. Displays the full 64-character Container ID and un-truncated command strings.                                                         | `docker ps --no-trunc`              |
| `-H`, `--host`   | _(Global Docker Flag)_ Overrides the default daemon socket to query a remote Docker daemon.                                                                       | `docker -H tcp://10.0.1.5:2375 ps`  |
| `--context`      | _(Global Docker Flag)_ Uses a specific pre-configured connection context to query a remote or alternative Docker Engine.                                          | `docker --context remote-engine ps` |

## Examples

```bash
docker ps
```

> The standard invocation. Connects to the local Docker daemon and displays a tabular view of all actively running containers, their short IDs, utilized images, exposed ports, and human-readable names.

```bash
docker ps -a
```

> Displays the entire container inventory managed by the daemon, including containers that have crashed, exited cleanly, or are paused. This is the primary command for debugging failed container launches.

```bash
docker ps -q -f "status=exited"
```

> Executes a server-side filter to find all containers in the "exited" state, and uses the quiet flag to return only their IDs. This is perfectly formatted for piping into cleanup commands.

```bash
docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Ports}}"
```

> Customizes the output using Go templating to create a tailored table. This specific command drops unnecessary columns (like creation time and command), returning only the ID, Image, and Port mappings for a cleaner terminal view.

```bash
docker ps --no-trunc --filter "ancestor=nginx:alpine"
```

> Filters the list to show only containers instantiated from the exact `nginx:alpine` image base, and prevents the Docker CLI from truncating long port mappings or start commands in the terminal output.

## Real-World Scenarios

**Bulk Cleanup of Dead Containers**

```bash
docker rm $(docker ps -a -q -f "status=exited")
```

> Over time, development environments become cluttered with stopped containers consuming disk space. Instead of deleting them one by one, developers use command substitution. `docker ps` fetches the raw IDs of all exited containers, passing them instantly to `docker rm` for batch deletion.

**Extracting Port Mappings for CI/CD Integration**

```bash
MAPPED_PORT=$(docker ps --filter "name=webapp-preview" --format "{{.Ports}}" | awk -F'->' '{print $1}' | awk -F':' '{print $2}')
```

> In dynamic CI/CD pipelines (like Jenkins or GitHub Actions), containers often bind to random ephemeral host ports to avoid conflicts. The pipeline script uses `docker ps` with a Go template and string manipulation to dynamically extract the exact port assigned to the `webapp-preview` container, feeding it to subsequent automated integration tests.

**Auditing Container Disk Consumption**

```bash
docker ps -s --format "table {{.Names}}\t{{.Size}}" | sort -hr -k2
```

> When a Docker host experiences disk pressure, system administrators need to quickly identify which container's writable layer is aggressively inflating (often due to unrotated logs or rogue database writes). This command calculates the exact size of each running container's writable layer and sorts them in descending order to identify the culprit.

## When should it NOT be used?

- **Checking internal container health:** **Do not use `docker ps` to verify application health.** A container displaying a status of `Up` only means the primary PID hasn't crashed. The application inside could be deadlocked or returning HTTP 500s. Use `docker inspect` for health checks or external monitoring.
- **Monitoring real-time resource usage:** **Do not run `docker ps` in a watch loop.** To see live CPU, memory, and network utilization per container, use `docker stats` instead.
- **Viewing processes inside the container:** **Do not rely on the `COMMAND` column for process context.** It only shows the entrypoint/cmd. To see the actual process tree actively running inside the namespace, use `docker top <container_id>`.
- **Checking why a container failed:** If a container continuously crash-loops, `docker ps -a` will only show `Exited (1)`. It will not tell you why. You must use `docker logs <container_id>` to view the application's stderr/stdout.

## Alternatives

- **`docker container ls`:** **The exact semantic equivalent.** As Docker transitioned to a noun-verb command structure (e.g., `docker <object> <action>`), `docker ps` was aliased to `docker container ls` to maintain backward compatibility.
- **`crictl ps`:** **Best for Kubernetes environments.** When inspecting nodes in modern Kubernetes clusters that have deprecated Docker in favor of `containerd` or `CRI-O`, `crictl ps` provides a CRI-compliant equivalent.
- **`kubectl get pods`:** **Best for Kubernetes orchestration.** If your containers are managed by Kubernetes, standard Docker commands lose context of ReplicaSets and Deployments. Rely on the orchestrator's API instead of the local container runtime.

## How it works internally

When you execute `docker ps`, the Docker CLI binary constructs an HTTP GET request to the Docker daemon's REST API endpoint: `/containers/json`.

By default, the CLI passes query parameters restricting the API to only return active containers. If you use `--filter`, the CLI does not download all containers and filter them locally; it passes the filter strings in the HTTP query parameters, forcing the Docker daemon (server-side) to evaluate the query. This drastically reduces the payload size over the socket.

The Docker daemon (`dockerd`) receives this request via the local Unix socket (typically `/var/run/docker.sock`) or a secured TCP port. `dockerd` then queries its internal state, communicating with the underlying container runtime (usually `containerd`). It aggregates metadata regarding the kernel control groups (cgroups) and namespaces representing the isolated environments.

The daemon serializes this metadata into a JSON payload and returns it to the CLI. The Docker CLI parses the JSON, applies any client-side formatting defined by the `--format` flag (which uses the Go `text/template` library), and renders the resulting ASCII table to standard output.

## Performance Notes

- **The Cost of the Size Flag:** The `-s` or `--size` flag is computationally expensive. To calculate the size of the container, the Docker daemon must traverse the overlay filesystem (e.g., `overlay2`) and calculate the exact disk delta of the writable container layer relative to the read-only image layers. Avoid using `-s` in high-frequency monitoring scripts as it causes heavy disk I/O and blocks the daemon response.
- **Server-Side Filtering vs Grep:** Always prefer `docker ps -f "name=foo"` over `docker ps | grep foo`. Server-side filtering avoids serializing and transmitting the metadata of thousands of irrelevant containers over the Unix socket, preventing unnecessary daemon CPU load.

## Security Notes

- **Daemon Socket Access:** Executing `docker ps` requires the user to have read/write access to `/var/run/docker.sock`. Because the Docker daemon runs as root, any user capable of executing `docker ps` can theoretically launch privileged containers and attain root-level host access. Access to the `docker` user group is effectively equivalent to passwordless `sudo`.
- **Metadata Leakage:** Container names, labels, and entrypoint commands are visible in plain text via `docker ps`. Developers must never pass sensitive secrets (like database passwords or API keys) as plain text in the command line execution string (e.g., `docker run -e PASS=123`); these secrets will be permanently exposed to anyone running `docker ps --no-trunc`.

## Common Mistakes

- **Assuming empty output means no containers exist**
  - _Mistake:_ Running `docker ps`, seeing no output, and assuming the host is completely clean, then experiencing port conflicts on the next run.
  - _Why:_ `docker ps` only shows _running_ containers. A stopped container still reserves its name and potentially its network bindings. You must run `docker ps -a` to see the complete state.
- **Piping to AWK instead of Format**
  - _Mistake:_ Using `docker ps | awk '{print $1}'` to extract container IDs.
  - _Why:_ The tabular output of `docker ps` shifts dynamically based on string lengths, causing `awk` to grab the wrong columns. Always use the built-in templating: `docker ps --format "{{.ID}}"` or `docker ps -q` for robust scripting.

## Best Practices

- **Embrace Go Templates:** Learn the Go templating syntax for the `--format` flag. Outputting exactly what your automation script needs (e.g., `--format '{{json .}}'`) eliminates the need for brittle `grep`/`sed`/`awk` pipelines.
- **Aggressively Label Containers:** Use metadata labels when creating containers (`docker run --label env=prod`). This transforms `docker ps` into a highly capable inventory tool, allowing you to slice and dice workloads across a host using `docker ps --filter "label=env=prod"`.

## Interview Questions

**Q: What is the architectural difference between using `docker ps | grep "exited"` and `docker ps --filter "status=exited"`?**
**A:** `docker ps | grep "exited"` downloads the complete JSON payload of all running containers from the Docker daemon to the CLI, renders it as text, and then filters it client-side. `docker ps --filter` passes the filter constraint via the REST API to the Docker daemon. The daemon performs the filtering server-side, returning only the relevant metadata, which saves CPU and socket bandwidth.

**Q: A developer runs `docker ps -a` and sees a container with the status `Exited (137)`. What does this indicate about the container's lifecycle?**
**A:** Exit code 137 indicates that the container was forcefully terminated by an external signal, specifically `SIGKILL` (128 + 9 = 137). This typically happens because the host operating system's OOM (Out Of Memory) killer destroyed the container for exceeding its memory limits, or the user forcefully stopped it.

**Q: Why is running `docker ps -s` significantly slower than running a standard `docker ps`?**
**A:** To satisfy the standard `docker ps`, the daemon only needs to query its internal in-memory metadata database. To satisfy the `-s` (size) flag, the daemon must physically traverse the host's storage driver (like `overlay2`) to calculate the exact disk byte delta of the container's writable layer versus its read-only base image, which requires heavy filesystem I/O operations.

## Practice Problems

**Problem:** You are writing an automated cleanup script. You need to output _only_ the raw Container IDs of containers that have failed and exited with a non-zero status code.
**Hint:** Combine the quiet flag with a specific server-side filter for exited containers.
**Solution:**

```bash
docker ps -q --filter "status=exited"
```

**Problem:** You want to view all running containers on the system, but you want the output to be formatted strictly as a list of container names, completely omitting IDs, ports, and image details.
**Hint:** Use the Go template format flag to isolate the specific metadata property.
**Solution:**

```bash
docker ps --format "{{.Names}}"
```

## References

- [Docker CLI Reference: docker ps](https://docs.docker.com/engine/reference/commandline/ps/)
- [Format command and log output](https://docs.docker.com/config/formatting/)
- [Docker Engine API v1.41 - List containers](https://docs.docker.com/engine/api/v1.41/#tag/Container/operation/ContainerList)
