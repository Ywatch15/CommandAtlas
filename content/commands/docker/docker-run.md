---
slug: docker-run
name: docker run
aliases: []
category: docker
tags:
  - docker
  - containers
  - execution
  - runtime
  - isolation
  - virtualization
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
  - start a docker container
  - run a container from image
  - create and start docker container
  - execute command in isolated container
  - spin up docker environment
relatedCommands:
  [
    docker-exec,
    docker-build,
    docker-ps,
    docker-rm,
    docker-attach,
    docker-commit,
    docker-compose,
    docker-cp,
    docker-images,
    docker-load,
    docker-logs,
    docker-network,
    docker-pull,
    docker-restart,
    docker-start,
    docker-volume,
  ]
alternatives: [docker-compose, docker-start]
status: draft
---

## What is it?

`docker run` is the primary command-line utility used to instantiate, configure, and start a new container from a specified Docker image. It acts as a synchronous orchestration wrapper that combines the `docker create` (allocating an isolated filesystem and namespace) and `docker start` (initiating the container's primary process) commands into a single, unified execution step.

## Why does it exist?

Prior to containerization, running isolated application environments required provisioning heavy virtual machines with dedicated guest operating systems or manually configuring complex Linux `chroot` jails, cgroups, and namespaces (LXC). `docker run` exists to abstract these deeply technical kernel primitives into a simple, standardized interface. It allows engineers to spin up perfectly reproducible, isolated application runtimes in milliseconds, ensuring that software executes identically regardless of the underlying host environment.

## Syntax

```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
```

## Flags

| Flag                          | Description                                                                                                      | Example                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `-d`, `--detach`              | Runs the container in the background and prints the new container ID to standard output.                         | `docker run -d nginx`                            |
| `-i`, `--interactive`         | Keeps standard input (STDIN) open even if not attached, required for interactive sessions.                       | `docker run -i ubuntu`                           |
| `-t`, `--tty`                 | Allocates a pseudo-TTY, connecting the container's standard output to your terminal.                             | `docker run -it alpine sh`                       |
| `--name <name>`               | Assigns a custom, human-readable string identifier to the container instead of a random hash.                    | `docker run --name web-server nginx`             |
| `-p`, `--publish <host:cont>` | Publishes a container's port(s) to the host machine to allow external network access.                            | `docker run -p 8080:80 nginx`                    |
| `-v`, `--volume <host:cont>`  | Bind-mounts a host directory or Docker volume into the container's isolated filesystem.                          | `docker run -v /host/data:/app/data redis`       |
| `-e`, `--env <key=val>`       | Injects runtime environment variables into the container's execution scope.                                      | `docker run -e MYSQL_ROOT_PASSWORD=secret mysql` |
| `--rm`                        | Automatically stops, destroys, and removes the container's filesystem when its primary process exits.            | `docker run --rm busybox echo "Done"`            |
| `--network <net>`             | Connects the container to a specified Docker network (e.g., `host`, `none`, or a custom bridge).                 | `docker run --network host my-app`               |
| `--restart <policy>`          | Configures the daemon to restart the container automatically on failure or host reboot (`always`, `on-failure`). | `docker run --restart always redis`              |
| `-u`, `--user <uid:gid>`      | Specifies the username or UID to use when running the container's primary process.                               | `docker run -u 1000:1000 node`                   |
| `--privileged`                | Grants the container full root capabilities on the host machine, bypassing namespace isolation.                  | `docker run --privileged docker:dind`            |

## Examples

```bash
docker run -it ubuntu /bin/bash
```

> This downloads the `ubuntu` image (if not present locally), allocates a pseudo-TTY (`-t`), keeps standard input open (`-i`), and drops you into a fully interactive bash shell inside the isolated container.

```bash
docker run -d --name my-redis -p 6379:6379 redis:alpine
```

> This launches a lightweight Redis server in detached mode (`-d`), assigns it a recognizable name (`my-redis`), and maps TCP port 6379 from the container out to the host's localhost port 6379.

```bash
docker run --rm -v $(pwd):/workspace -w /workspace node:18 npm install
```

> This executes a short-lived node container that bind-mounts the current host directory into `/workspace`, runs the `npm install` command to generate a `node_modules` folder on the host, and automatically destroys the container immediately afterward (`--rm`).

```bash
docker run -d --restart unless-stopped -e POSTGRES_PASSWORD=secret postgres:14
```

> This provisions a PostgreSQL database that will automatically restart if the daemon crashes or the host reboots, while securely passing the required initialization password via an environment variable.

```bash
docker run --network host --name net-debugger nicolaka/netshoot
```

> This launches a network troubleshooting container using the host's native networking stack (`--network host`) rather than a bridged namespace, allowing the container to audit and ping the host's physical network interfaces directly.

## Real-World Scenarios

**Ephemeral CI/CD Build Environments**

```bash
docker run --rm -v ${WORKSPACE}:/go/src/app -w /go/src/app golang:1.21 go build -o myapp
```

> Continuous integration pipelines use `docker run` to instantiate pristine, version-locked language runtimes to compile application binaries. The `--rm` flag ensures no garbage containers are left on the build runner, preventing state leakage between distinct pipeline executions.

**Local Database Testing Without Host Pollution**

```bash
docker run -d --name test-db -p 3306:3306 -e MYSQL_DATABASE=testing mysql:8.0
```

> Software developers spin up isolated database engines on their local workstations. This eliminates the need to install heavy database binaries directly onto their host OS, allowing them to test schema migrations safely and tear the database down completely when finished.

**Executing Sandboxed Legacy Applications**

```bash
docker run -d -p 8080:80 --memory="512m" --cpus="1.0" legacy-php-app:v1
```

> Operations teams wrap legacy, unmaintainable applications in container images and run them with strict CPU and memory resource constraints. This guarantees the brittle application is sandboxed and cannot consume excessive host hardware resources if a memory leak occurs.

## When should it NOT be used?

- **Orchestrating multi-container application stacks:** Running multiple interconnected databases, APIs, and caching layers using sequential `docker run` commands. **Reason:** Manual commands lack dependency resolution, shared network lifecycle management, and deterministic startup ordering. **Use instead:** `docker-compose up` with a declarative `docker-compose.yml` file.
- **Deploying highly available workloads to production clusters:** Using raw `docker run` on a bare-metal server for a public-facing application. **Reason:** `docker run` is confined to a single host; it provides zero auto-scaling, load balancing across nodes, or cross-machine failover. **Use instead:** Kubernetes (`kubectl apply` or Helm).
- **Executing secondary commands inside an already running container:** Attempting to use `docker run` to open a shell in an active web server. **Reason:** `docker run` _always_ provisions a brand-new, completely separate container instance. **Use instead:** `docker exec -it <container_name> /bin/bash`.

## Alternatives

- **`docker-compose`:** Declarative multi-container orchestration. **Tradeoff:** `docker-compose` requires authoring a YAML file mapping out all volumes, ports, and networks, which is heavier than a single command but significantly more reliable for full application stacks.
- **`podman run`:** A daemonless, rootless drop-in replacement. **Tradeoff:** `podman` behaves almost identically to Docker but operates without a central root-level daemon, drastically improving host security at the cost of minor compatibility quirks with certain Docker-specific volume plugins.
- **`docker create` + `docker start`:** Separated lifecycle commands. **Tradeoff:** Splitting the commands allows you to initialize the filesystem layer and inspect the container configuration before actual execution begins, though it is unnecessarily verbose for standard workflows.

## How it works internally

When you execute `docker run`, the Docker CLI acts as an HTTP client, passing a structured JSON payload to the Docker Daemon (`dockerd`) via a local UNIX socket or TCP port.

The daemon first checks its local cache for the specified image. If absent, it queries the configured registry (e.g., Docker Hub) and pulls the image layers. `dockerd` then hands the workload to `containerd`, the high-level container runtime. `containerd` delegates execution to `runc`, the low-level OCI-compliant runtime.

`runc` communicates directly with the Linux kernel. It creates a discrete set of isolated **Namespaces** (PID for process trees, NET for networking, MNT for filesystem mounts, IPC for inter-process communication, and UTS for hostnames). It enforces resource limits using **cgroups** (Control Groups), constructs a layered Union Filesystem (OverlayFS) mounting the read-only image layers under a thin writable container layer, and finally performs a `pivot_root` to jail the process into this new filesystem before executing the `COMMAND`.

If `docker run` fails, the exit codes are deterministic: `125` implies a Docker daemon execution error, `126` means the specified command was found but is not executable, `127` means the command was not found inside the container. Otherwise, the exit code matches the exit code of the primary container process.

## Performance Notes

- Container CPU and memory execution overhead is nearly zero compared to bare-metal execution, as containers run natively on the host kernel without hardware virtualization abstraction layers.
- Heavy filesystem I/O operations via bind mounts (`-v`) on macOS and Windows incur significant latency penalties because Docker Desktop must translate filesystem events across a lightweight Linux utility VM hypervisor; native Linux environments do not suffer this penalty.

## Security Notes

- **The Privilege Danger:** Running containers with the `--privileged` flag disables all default security profiles (AppArmor, Seccomp, SELinux) and grants the container full access to host devices, meaning an attacker escaping the container gains immediate root access to the host machine.
- **Root by Default:** Unless the `USER` directive is specified in the Dockerfile or overridden via the `-u` flag, processes inside the container execute as root. If a directory is bind-mounted, the container can overwrite host files with root ownership.
- **Capability Dropping:** For hardened production execution, utilize `--cap-drop=ALL` to strip the container's root process of all elevated Linux capabilities, selectively adding back only what is strictly necessary.

## Common Mistakes

- **Reversing port mapping order:** Writing `docker run -p 80:8080` instead of `8080:80`. **Why it's wrong:** Docker syntax maps `<host-port>:<container-port>`. Reversing this opens the wrong host port and points to a closed port inside the container, causing connection refused errors.
- **Forgetting `-d` for background servers:** Running `docker run nginx` without the detach flag. **Why it's wrong:** The web server hijacks your terminal session's standard output. If you press `Ctrl+C` to reclaim your terminal, it sends a SIGINT and instantly kills the database or web server.
- **Losing data in ephemeral containers:** Running a database container without explicitly attaching a persistent volume (`-v`). **Why it's wrong:** When the container is removed, the writable filesystem layer is destroyed permanently, resulting in catastrophic loss of all database records inserted during the session.

## Best Practices

- Always assign explicit, recognizable names using the `--name` flag to prevent Docker from generating random, cryptic names (like `sad_babbage`), which complicates monitoring and teardown commands.
- Combine `--rm` with interactive `-it` sessions when debugging or compiling code to ensure isolated scratch environments self-destruct cleanly, preventing host disk space exhaustion from orphaned containers.
- Never use the mutable `latest` image tag in production automation (`nginx:latest`); always specify explicit semantic version tags (`nginx:1.24.0`) to guarantee deterministic and repeatable deployments.

## Interview Questions

**Q:** What is the technical difference between `docker run` and `docker exec`?
**A:** `docker run` spins up a completely new, isolated container instance from a static image and initiates its primary PID 1 process. `docker exec` targets a container that is _already running_ and spawns a secondary process (like a bash shell) within the existing container's active namespaces.
**Q:** If you start a container interactively without the `-d` flag, what is the difference between exiting using `Ctrl+C` versus `Ctrl+P, Ctrl+Q`?
**A:** Pressing `Ctrl+C` sends a `SIGINT` to the container's primary process, terminating the process and stopping the container entirely. Pressing the escape sequence `Ctrl+P, Ctrl+Q` cleanly detaches your terminal session from the container's STDIN/STDOUT, leaving the container process running securely in the background.
**Q:** Under the hood, what Linux kernel mechanisms does `docker run` utilize to achieve container isolation?
**A:** `docker run` relies on two primary Linux kernel primitives: **Namespaces**, which provide isolation for process trees, networks, user IDs, and mounts (ensuring the container cannot see the host's resources); and **cgroups** (Control Groups), which throttle, limit, and account for the hardware resources (CPU, memory, I/O) the container is allowed to consume.

## Practice Problems

**Problem:** Spin up an Nginx web server container in the background, name it `frontend-proxy`, and map port `80` on the host to port `80` inside the container.
**Hint:** Combine the detach flag, the naming flag, and the port publishing flag.
**Solution:** `docker run -d --name frontend-proxy -p 80:80 nginx` (This launches the server silently, allowing you to access `localhost:80` from your browser).
**Problem:** Launch an interactive, ephemeral Alpine Linux container, execute the `echo "Hello Docker"` command, and ensure the container's filesystem is automatically wiped from the host when the command completes.
**Hint:** Combine the interactive/TTY flags with the auto-removal flag, the image name, and the override command.
**Solution:** `docker run -it --rm alpine echo "Hello Docker"` (This provisions the container, prints the string to your terminal, and self-destructs the instance instantly upon completion).

## References

- [Docker CLI Reference - docker run](https://docs.docker.com/engine/reference/commandline/run/)
- [Docker Documentation - Run your app in production](https://docs.docker.com/config/containers/runmetrics/)
