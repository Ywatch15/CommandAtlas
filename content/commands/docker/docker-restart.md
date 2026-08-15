---
slug: docker-restart
name: docker restart
aliases: []
category: cloud-cli
tags: [docker, containers, lifecycle, management, automation, devops]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'restart docker container'
  - 'reload containerized application'
  - 'reboot docker app'
  - 'stop and start container'
  - 'apply config changes to container'
relatedCommands: [docker-stop, docker-start, docker-run]
alternatives: []
status: draft
---

## What is it?

`docker restart` is a convenience lifecycle command that combines the sequence of `docker stop` and `docker start` into a single, atomic operation managed by the Docker daemon. It initiates a graceful shutdown of the primary process inside the container, waits for it to exit, and then immediately re-initializes the container environment from its halted state, allowing the application to reload configurations or clear unstable memory states rapidly.

## Why does it exist?

During active application development or server maintenance, engineers frequently alter external configuration files (mounted via volumes) or need to recover an application from a memory leak or deadlock without tearing down the entire infrastructure. Manually typing `docker stop` followed by `docker start` introduces lag and human error. `docker restart` exists to provide a clean, single-command reboot mechanism. By delegating the execution sequence entirely to the Docker daemon, it ensures the minimum possible downtime and guarantees the container seamlessly boots back up with its exact previous filesystem and network configuration.

## Syntax

```bash
docker restart [OPTIONS] CONTAINER [CONTAINER...]
```

## Flags

| Flag           | Description                                                                                                                                 | Example                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `-t`, `--time` | The number of seconds the daemon waits for the container to gracefully shut down before sending a forced `SIGKILL`. Defaults to 10 seconds. | `docker restart -t 30 db_server`             |
| `-H`, `--host` | _(Global Docker Flag)_ Routes the restart command to a remote Docker daemon specified by a TCP or SSH URI.                                  | `docker -H ssh://admin@10.0.1.5 restart app` |
| `--context`    | _(Global Docker Flag)_ Uses a pre-configured Docker CLI context to target a specific local or remote Docker Engine environment.             | `docker --context prod-cluster restart app`  |
| `--tlsverify`  | _(Global Docker Flag)_ Demands strict TLS certificate validation when issuing the restart command over a secured TCP socket.                | `docker --tlsverify restart app`             |
| `--tlscacert`  | _(Global Docker Flag)_ The path to the CA certificate for securing remote daemon connections.                                               | `docker --tlscacert ca.pem restart app`      |
| `--tlscert`    | _(Global Docker Flag)_ The path to the client TLS certificate.                                                                              | `docker --tlscert cert.pem restart app`      |
| `--tlskey`     | _(Global Docker Flag)_ The path to the client TLS private key.                                                                              | `docker --tlskey key.pem restart app`        |
| `--help`       | Prints a brief help message displaying usage syntax and available flags.                                                                    | `docker restart --help`                      |

## Examples

```bash
docker restart my_nginx_proxy
```

> The standard invocation. The daemon sends `SIGTERM` to the NGINX process, waits up to 10 seconds for it to exit gracefully, and then immediately restarts the container. This is frequently used to force the web server to re-read updated configuration files mounted from the host.

```bash
docker restart -t 60 postgres_primary
```

> Restarts a heavy stateful workload with an extended timeout. Providing a 60-second grace period ensures the PostgreSQL database has ample time to flush its Write-Ahead Log (WAL) to disk, avoiding data corruption before the daemon forces the reboot.

```bash
docker restart worker_1 worker_2 worker_3
```

> A batch reboot operation. The CLI accepts multiple container names or IDs, issuing restart commands to all of them sequentially. This is highly useful for rolling reloads of local microservice dependencies.

```bash
docker restart $(docker ps -q -f "name=api_")
```

> Combines server-side filtering with command substitution. This isolates the raw IDs of all running containers whose names contain the string `api_` and restarts them all simultaneously. Essential for mitigating localized memory leaks across a fleet of related containers.

## Real-World Scenarios

**Applying Configuration Volume Changes**

```bash
nano /etc/app/config.json
# File is mounted via -v /etc/app/config.json:/app/config.json
docker restart my_application
```

> Applications rarely watch their configuration files for hot-reloads. When an administrator modifies a `config.json` file on the host machine that is mapped into the container via a bind mount, they execute `docker restart`. The application shuts down, boots up entirely within the daemon's control, and parses the newly updated configuration file upon startup.

**Recovering from Zombie Processes**

```bash
# Monitoring system alerts that the container's CPU is pegged at 100%
docker restart -t 1 deadlocked_worker
```

> If a background processing worker hits a deadlock and becomes unresponsive, standard graceful termination fails. An SRE can issue a restart with a dramatically shortened `-t 1` timeout, telling the daemon to essentially skip the grace period, immediately `SIGKILL` the zombie process, and reboot the application into a healthy state.

## When should it NOT be used?

- **To deploy updated image code:** **Do not use `docker restart` after pulling a new image.** `restart` only reboots the container using the exact image hash it was originally created with. It is physically impossible to apply a new Docker image via restart. You must use `docker rm` and `docker run` to deploy updated code.
- **To alter port mappings or environment variables:** If you need to expose a new port (`-p 8080:80`) or inject a new secret (`-e API_KEY=123`), `restart` cannot help. Container definitions are immutable. You must destroy the container and recreate it with the new run parameters.
- **In production Kubernetes/Swarm environments:** **Do not manually restart pods/containers in orchestrators.** If you manually restart a container running inside a Kubernetes Pod via Docker, the Kubelet may detect the state change as a failure and initiate destructive recovery loops. Rely on `kubectl rollout restart` instead.

## Alternatives

- **`docker stop && docker start`:** **The manual equivalent.** Achieves the exact same result but requires two explicit CLI invocations.
- **`docker compose restart`:** **Best for multi-service stacks.** Designed to parse a `docker-compose.yml` file and seamlessly restart one or all interdependent services within the defined application stack.
- **Application-Level Reloading:** **Best for zero-downtime.** If the application supports it (e.g., `nginx -s reload`), sending a specific POSIX signal via `docker kill -s SIGHUP <container>` reloads configurations without tearing down the actual container runtime, preventing any dropped connections.

## How it works internally

`docker restart` is entirely orchestrated server-side by the Docker daemon to minimize latency. When the CLI issues an HTTP POST to the `/containers/{id}/restart` endpoint, the daemon initiates a two-phase operation.

**Phase 1 (Stop):** The daemon sends a `SIGTERM` signal to the container's primary process (PID 1). It initiates a blocking timer matching the `-t` parameter (default 10 seconds). If the process successfully completes its shutdown hooks and exits, the daemon proceeds to Phase 2. If the timer expires and the process is still running, the daemon executes a `kill(2)` syscall, sending a `SIGKILL` to forcefully terminate the namespace.

**Phase 2 (Start):** The daemon instantly transitions the container state to `Starting`. It retains the existing read-write overlay filesystem layer (preserving any files written prior to the restart). It requests the kernel to re-establish the container's isolated namespaces (IPC, PID, Mount) and networking interfaces, and instructs the runtime (`runc`) to execute the original `ENTRYPOINT`/`CMD` command. The application boots, and the state transitions to `Running`.

## Performance Notes

- **Application Boot Latency:** The execution speed of `docker restart` is dictated entirely by the application inside the container. If a Spring Boot Java application takes 45 seconds to initialize its beans, `docker restart` will cause the service to be unavailable for 45 seconds plus the shutdown time.
- **Bypassing the Registry:** Because `restart` utilizes the locally cached, pre-assembled container filesystem, it consumes zero network bandwidth and skips all image pulling and unpacking phases, making it the fastest possible way to reboot an application.

## Security Notes

- **Data Integrity during Forced Kills:** If you set `-t 0` or if the application ignores the `SIGTERM` signal, the resulting `SIGKILL` guarantees sudden termination. Any files currently being written to disk within the container's writable layer or attached volumes may be corrupted or truncated.
- **Daemon Access Equivalency:** Executing `docker restart` requires access to the Docker socket. Because restarting a container can be used to apply malicious changes to mounted host files or disrupt critical security monitoring sidecars, socket access must be strictly audited.

## Common Mistakes

- **Expecting environment variables to refresh**
  - _Mistake:_ Changing a `.env` file on the host machine, running `docker restart my_app`, and finding that the application is still using the old passwords.
  - _Why:_ Environment variables passed via `--env-file` are injected _only_ when the container is initially created via `docker run`. The `restart` command simply boots the container using its cached definition. You must recreate the container to absorb new environment variable injections.
- **Restarting instead of investigating crashes**
  - _Mistake:_ Writing an automation script that blindly runs `docker restart` whenever an application returns an HTTP 500 error.
  - _Why:_ Restarting masks the underlying pathology (like memory leaks, connection pool exhaustion, or disk space issues). It treats the symptom without capturing the diagnostic data. Always capture `docker logs` or thread dumps before aggressively restarting failing containers.

## Best Practices

- **Configure Restart Policies natively:** Instead of manually monitoring and restarting crashed containers, configure the container upon creation with a native policy: `docker run --restart unless-stopped`. The Docker daemon will automatically monitor the exit code and execute the restart logic internally if the application fails.
- **Tune the Timeout for Stateful Apps:** Never use the default 10-second timeout for databases or message queues. Always append `-t 30` or `-t 60` to ensure they can cleanly flush caches to persistent volumes, avoiding lengthy crash-recovery sequences upon boot.

## Interview Questions

**Q: You need to apply a critical security patch to the base image (e.g., Ubuntu) that your application container runs on. Will executing `docker restart` apply the newly downloaded base image?**
**A:** No. `docker restart` simply stops and starts the _existing_ container. A container is immutably linked to the exact image hash it was created with. To apply an updated base image, you must pull the new image, stop and permanently remove the existing container (`docker rm`), and provision a new one via `docker run`.

**Q: Explain the exact sequence of events the Docker daemon executes when you issue `docker restart -t 5 <container>`.**
**A:** The daemon first sends a `SIGTERM` signal to the primary process (PID 1) inside the container. It begins a 5-second countdown timer. If the process exits gracefully before the timer hits zero, it proceeds immediately. If the process is still running at the 5-second mark, the daemon sends a `SIGKILL` to forcefully destroy it. Once the process is dead, the daemon immediately re-establishes the namespaces and executes the entrypoint command, booting the container back up.

## Practice Problems

**Problem:** You are running an older Java application in a container named `legacy_api`. It is known to freeze occasionally and ignore all graceful shutdown signals. You need to restart it immediately without wasting 10 seconds waiting for a timeout. Write the command to do this.
**Hint:** Use the flag that alters the shutdown grace period, setting it to zero.
**Solution:**

```bash
docker restart -t 0 legacy_api
```

**Problem:** You have a swarm of worker containers named `worker_alpha`, `worker_beta`, and `worker_gamma`. You updated an external configuration file they share via a host volume. Write a single command to restart all three sequentially so they parse the new file.
**Hint:** The command accepts multiple container arguments separated by spaces.
**Solution:**

```bash
docker restart worker_alpha worker_beta worker_gamma
```

## References

- [Docker CLI Reference: docker restart](https://docs.docker.com/engine/reference/commandline/restart/)
- [Start containers automatically (Restart Policies)](https://docs.docker.com/config/containers/start-containers-automatically/)
