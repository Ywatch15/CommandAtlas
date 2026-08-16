---
slug: docker-start
name: docker start
aliases: []
category: cloud-cli
tags:
  - docker
  - containers
  - lifecycle
  - management
  - state
  - devops
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
  - start a stopped container
  - resume docker container execution
  - boot existing docker app
  - restart container without new image
  - attach to starting container
relatedCommands:
  - docker-run
  - docker-stop
  - docker-restart
  - docker-attach
alternatives:
  - docker-run
status: draft
---

## What is it?

`docker start` is a lifecycle command used to boot up one or more existing containers that are currently in a `Stopped` or `Created` state. Unlike `docker run` (which allocates a brand new container from a base image), `docker start` resurrects an existing container, preserving its exact filesystem state, assigned network interfaces, and volume mounts exactly as they were when the container was previously halted.

## Why does it exist?

Containers are often treated as ephemeral, but local development and specific stateful workloads benefit heavily from persistence. If a developer spends an hour configuring a database schema inside a sandbox container and then shuts their laptop down, using `docker run` the next day would wipe out their progress by provisioning a blank slate. `docker start` exists to provide state persistence across reboots. It bypasses the overhead of image layer allocation and network creation, allowing users to rapidly resume execution of a preserved environment.

## Syntax

```bash
docker start [OPTIONS] CONTAINER [CONTAINER...]
```

## Flags

| Flag                  | Description                                                                                                                         | Example                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `-a`, `--attach`      | Attaches the host's `STDOUT` and `STDERR` to the container's output stream, keeping the terminal occupied while it runs.            | `docker start -a web_server`                               |
| `-i`, `--interactive` | Attaches the host's `STDIN` to the container's input stream. Required if starting an interactive shell (e.g., `/bin/bash`).         | `docker start -a -i dev_env`                               |
| `--detach-keys`       | Overrides the default key sequence (`Ctrl-p`, `Ctrl-q`) used to detach from a container running in attached mode.                   | `docker start -a --detach-keys="ctrl-d" app`               |
| `--checkpoint`        | Experimental. Restores the container from a previously saved Checkpoint/Restore In Userspace (CRIU) snapshot, avoiding a cold boot. | `docker start --checkpoint my_snap app`                    |
| `--checkpoint-dir`    | Specifies a custom directory where the CRIU checkpoint snapshots are stored.                                                        | `docker start --checkpoint snap --checkpoint-dir /tmp app` |
| `-H`, `--host`        | _(Global Docker Flag)_ Overrides the default socket, directing the start request to a remote Docker daemon via TCP/SSH.             | `docker -H tcp://10.0.1.5:2375 start db`                   |
| `--context`           | _(Global Docker Flag)_ Uses a pre-configured context to target an alternative Docker Engine for the boot sequence.                  | `docker --context remote-engine start db`                  |
| `--tlsverify`         | _(Global Docker Flag)_ Enforces strict TLS validation when communicating with a remote daemon over TCP.                             | `docker --tlsverify start db`                              |
| `--tlscert`           | _(Global Docker Flag)_ Path to the TLS certificate file for mutual client authentication with a secured daemon.                     | `docker --tlscert client.pem start db`                     |
| `--help`              | Prints a brief help message displaying usage syntax and available flags for the command.                                            | `docker start --help`                                      |

## Examples

```bash
docker start my_database
```

> The standard invocation. Boots the `my_database` container in the background (detached mode). The CLI prints the container name and immediately returns control of the terminal to the user.

```bash
docker start -a -i ubuntu_sandbox
```

> The interactive resumption pattern. If the container was originally created to run `/bin/bash`, this command boots the OS, attaches the terminal's keyboard (`-i`) and screen (`-a`) directly to the shell, and drops the user securely back into their active session.

```bash
docker start worker_1 worker_2 worker_3
```

> Performs a batch boot operation. The CLI instructs the Docker daemon to start all three containers sequentially, which is useful for bringing up complex multi-container dependencies manually if `docker-compose` is unavailable.

```bash
docker start $(docker ps -a -q -f "status=exited")
```

> An automation technique that isolates all containers currently in the `Exited` state and issues a start command for every single one of them. Often used to quickly recover a development environment after a host machine reboot.

## Real-World Scenarios

**Resuming Local Development Workspaces**

```bash
# Day 1
docker run -it --name python_env python:3.9-slim /bin/bash
# ... install packages, download code, exit ...

# Day 2
docker start -a -i python_env
```

> Developers frequently build complex, localized compilation environments inside containers. Instead of writing a massive Dockerfile for a one-off experiment, they use `docker start -a -i` to jump back into yesterday's preserved sandbox, maintaining all downloaded packages and modified files.

**Testing Container Crash Recovery**

```bash
docker stop core_api
# Modify external database state to simulate an outage
docker start core_api
docker logs -f core_api
```

> QA engineers evaluating application resilience must test how microservices behave upon unexpected restarts. By explicitly stopping and starting the container, they bypass the image-pulling phase, forcing the application to perform a cold boot against the altered external infrastructure, and tail the logs to monitor the reconnection logic.

## When should it NOT be used?

- **Applying new image updates:** **Do not use `docker start` if you have rebuilt or pulled a new Docker image.** A container is permanently tied to the exact image hash it was created with. `docker start` will boot the old code. To deploy an updated image, you must `docker stop`, `docker rm`, and `docker run` a new container.
- **Immutable Production Deployments:** **Avoid relying on `docker start` in production.** Production architectures should be immutable. If a container crashes, orchestrators (like Kubernetes) do not restart the dead container; they destroy it and instantiate a brand new replica from the base image to prevent configuration drift.
- **Applying new network/port configurations:** If you need to map a new host port (`-p 8080:80`) or mount a new volume (`-v /data:/app`), `docker start` cannot help. Network and volume bindings are immutable after creation. You must destroy and recreate the container via `docker run`.

## Alternatives

- **`docker run`:** **Best for fresh execution.** While `start` boots an _existing_ container, `run` allocates a _brand new_ container from an image base, ensuring absolute parity with the clean, original source code.
- **`docker restart`:** **Best for quick reloads.** Combines `stop` and `start` into a single command, ideal for applying internal application configuration changes.
- **`docker compose up`:** **Best for multi-container environments.** Evaluates the entire stack, automatically creating new containers if configurations changed, or simply starting existing ones if the state matches.

## How it works internally

When you execute `docker start`, the CLI sends an HTTP POST request to the `/containers/{id}/start` API endpoint on the Docker daemon.

The Docker daemon accesses its internal metadata store (typically located in `/var/lib/docker/containers/`) to load the saved configuration for the specified container. This configuration includes the exact overlay filesystem layers, bounded network endpoints, and assigned cgroup resource limits.

The daemon communicates with the underlying runtime (e.g., `containerd` via `runc`). It instructs the Linux kernel to reconstruct the isolated namespaces (PID, NET, IPC, MNT) and enforce the cgroups based on the saved metadata.

Crucially, it mounts the container's existing read-write filesystem layer (the `overlay2` diff directory) on top of the read-only image layers. This is why any files modified before the container was stopped are still present. Finally, the runtime executes the original `ENTRYPOINT` and `CMD` inside the isolated namespace. If the container crashes immediately upon execution, the daemon logs the failure and updates the state back to `Exited`.

## Performance Notes

- **Cold Boot Execution:** `docker start` is significantly faster than `docker run`. Because the read-write layer is already allocated on disk, network interfaces are pre-calculated, and the image is guaranteed to be local, `docker start` bypasses the heavy initialization overhead, usually taking less than a second to instruct the kernel to boot the process.

## Security Notes

- **Persistence of Compromise:** Because `docker start` perfectly preserves the filesystem state, it also perfectly preserves malware. If an attacker breaches a container and drops a backdoor script into `/tmp`, stopping and starting the container leaves the backdoor completely intact. For maximum security, ephemeral workloads should always be destroyed and recreated from verified base images.
- **Port Binding Collisions:** If a container was created to bind to host port 80 (`-p 80:80`), but another service on the host has since claimed port 80 while the container was stopped, `docker start` will fail abruptly with an `address already in use` error during the network initialization phase.

## Common Mistakes

- **Starting a failed interactive shell silently**
  - _Mistake:_ Running `docker start my_ubuntu_box` (which was created with `/bin/bash`), typing `docker ps`, and wondering why it immediately exited again.
  - _Why:_ Without the `-i` (interactive) flag, the container boots, executes `/bin/bash`, and realizes there is no `stdin` (keyboard) attached. Bash immediately terminates, taking the container down with it. You must use `docker start -a -i` to resume interactive shells.
- **Expecting `docker start` to pick up code changes**
  - _Mistake:_ Running `docker build -t app .` followed by `docker start app_container`, expecting the container to serve the newly compiled code.
  - _Why:_ The container is permanently welded to the specific image SHA it was instantiated with. It ignores the newly tagged image. You must `docker rm` and `docker run` to utilize the new image.

## Best Practices

- **Check logs if `start` fails silently:** If you run `docker start foo`, it returns `foo`, but `docker ps` shows it is not running, the application crashed immediately on boot. Instantly run `docker logs foo` to view the fatal stack trace.
- **Utilize for database seeding:** When working locally, spinning up heavy databases (like Oracle or MS SQL) takes considerable initialization time. Developers should `docker run` the database once, execute the 15-minute data seeding script, and then exclusively use `docker stop` and `docker start` to instantly boot the pre-warmed, pre-seeded database daily.

## Interview Questions

**Q: A team member modifies a Dockerfile, builds a new image with the same `app:latest` tag, and runs `docker start my_app_container` to apply the changes. They complain the old code is still running. Explain why.**
**A:** `docker start` boots an existing, preserved container object. A container object is immutably linked to the exact cryptographic image digest (SHA256 hash) that existed when `docker run` was originally executed. Simply replacing the `app:latest` tag on the host does not retroactively alter existing containers. The developer must destroy the container (`docker rm`) and create a new one (`docker run`) to use the newly compiled image.

**Q: You want to resume a stopped container that runs `/bin/sh` as its primary process, but you need to interact with it directly in your terminal. What exact flags must you append to `docker start`?**
**A:** You must append `-a` (attach) to connect your terminal's standard output to the container, and `-i` (interactive) to attach your terminal's standard input (keyboard) to the container. The command is `docker start -a -i <container_name>`.

## Practice Problems

**Problem:** You have a stopped container named `redis_cache`. You want to boot it up in the background without attaching your terminal to its output. Write the standard command to achieve this.
**Hint:** The default behavior of the command is to execute in a detached state.
**Solution:**

```bash
docker start redis_cache
```

**Problem:** A container named `admin_console` was created to run an interactive python shell. It has stopped. Write the command to start the container, attach your screen to its output, and attach your keyboard so you can type python commands into the prompt.
**Hint:** You need the flags that merge `stdout` and `stdin` between the host and the container.
**Solution:**

```bash
docker start -a -i admin_console
```

## References

- [Docker CLI Reference: docker start](https://docs.docker.com/engine/reference/commandline/start/)
- [Container Lifecycle Management](https://docs.docker.com/engine/reference/run/#detached-vs-foreground)
