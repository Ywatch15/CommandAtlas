---
slug: docker-stop
name: docker stop
aliases: []
category: cloud-cli
tags: [docker, containers, lifecycle, signals, management, devops]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'gracefully stop docker container'
  - 'halt running container'
  - 'shut down docker application'
  - 'pause docker service cleanly'
  - 'stop all running docker containers'
relatedCommands: [docker-start, docker-restart, docker-rm]
alternatives: []
status: draft
---

## What is it?

`docker stop` is a command-line utility used to gracefully halt one or more actively running Docker containers. It orchestrates a controlled shutdown by initially sending a `SIGTERM` signal to the primary process inside the container, granting the application a defined grace period to flush data to disk, close network connections, and clean up temporary state before forcefully terminating it with a `SIGKILL` signal.

## Why does it exist?

Applications often hold critical state in memory—such as incomplete database transactions, half-written log files, or active HTTP requests. Forcefully ripping the compute power away from a container (e.g., pulling the plug) causes data corruption and dropped connections. `docker stop` exists to facilitate graceful degradation. By providing a customizable timeout window and standard POSIX signaling, it allows containerized microservices to execute their internal shutdown hooks reliably, ensuring data integrity and zero-downtime rolling deployments in clustered environments.

## Syntax

```bash
docker stop [OPTIONS] CONTAINER [CONTAINER...]
```

## Flags

| Flag           | Description                                                                                                                                      | Example                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `-t`, `--time` | Specifies the number of seconds to wait for the container to gracefully shut down before forcefully sending a `SIGKILL`. Defaults to 10 seconds. | `docker stop -t 30 db_server`             |
| `-H`, `--host` | _(Global Docker Flag)_ Overrides the default daemon socket to send the stop command to a remote Docker daemon via TCP or SSH.                    | `docker -H tcp://10.0.1.5:2375 stop app`  |
| `--context`    | _(Global Docker Flag)_ Uses a specific pre-configured connection context to target a remote Docker Engine for the stop operation.                | `docker --context swarm-manager stop app` |
| `--tlsverify`  | _(Global Docker Flag)_ Enforces strict TLS certificate verification when connecting to a remote Docker daemon over TCP.                          | `docker --tlsverify stop app`             |
| `--tlscacert`  | _(Global Docker Flag)_ Specifies the Trust certs signed only by this CA when connecting over TLS.                                                | `docker --tlscacert ca.pem stop app`      |
| `--tlscert`    | _(Global Docker Flag)_ Specifies the path to the TLS certificate file for client authentication.                                                 | `docker --tlscert cert.pem stop app`      |
| `--tlskey`     | _(Global Docker Flag)_ Specifies the path to the TLS private key file for client authentication.                                                 | `docker --tlskey key.pem stop app`        |
| `--help`       | Prints a brief help message displaying usage syntax and available flags for the stop command.                                                    | `docker stop --help`                      |

## Examples

```bash
docker stop my_web_server
```

> The standard invocation. Sends a `SIGTERM` to the primary process inside `my_web_server`, waits the default 10 seconds, and if the process hasn't exited, sends a `SIGKILL`.

```bash
docker stop -t 60 postgres_db
```

> Extends the grace period. Databases often require significantly more time than 10 seconds to flush massive memory buffers and WAL logs to persistent disk. This command provides PostgreSQL a full 60 seconds to shut down cleanly to avoid database corruption on the next boot.

```bash
docker stop app_node_1 app_node_2 app_node_3
```

> Performs a batch shutdown. The CLI accepts multiple container names or IDs simultaneously, dispatching the stop signals to all listed containers in parallel to accelerate fleet maintenance.

```bash
docker stop $(docker ps -q)
```

> A powerful administrative automation. `docker ps -q` generates a raw list of all currently running container IDs. Command substitution passes these IDs directly to `docker stop`, initiating a graceful shutdown of every active container on the host machine.

## Real-World Scenarios

**Zero-Downtime Application Updates**

```bash
docker stop -t 15 frontend_v1
docker run -d --name frontend_v2 -p 80:80 myapp/frontend:v2
```

> During manual rolling updates, administrators use `docker stop` to ensure the outgoing container finishes serving in-flight HTTP requests before it is removed from the network routing table. Extending the timeout ensures no client receives an abruptly severed connection during the transition.

**Preventing Database Corruption**

```bash
echo "Initiating maintenance..."
docker stop -t 120 mongo_primary
# Perform host-level kernel updates
```

> When patching the underlying Docker host, simply rebooting the server instantly `SIGKILL`s all running processes. Professional administrators explicitly use `docker stop` with long timeouts on stateful data stores (like MongoDB or MySQL) before initiating host reboots to guarantee perfect filesystem integrity.

## When should it NOT be used?

- **Unresponsive/Deadlocked Containers:** **Do not use `stop` if the application is frozen.** If an application is deadlocked and ignoring signals, `docker stop` will waste 10 seconds waiting fruitlessly before reverting to a kill. If you know the app is broken, bypass the wait and use `docker kill <container>` for instant destruction.
- **Ephemeral CI/CD Workspaces:** **Do not use `stop` if you intend to delete the container immediately anyway.** In automated tests where data persistence does not matter, running `docker stop` followed by `docker rm` wastes 10 seconds per container. Use `docker rm -f <container>` to forcefully destroy it in one instantaneous step.

## Alternatives

- **`docker kill`:** **Best for immediate, forceful termination.** Bypasses `SIGTERM` and the grace period entirely, sending a `SIGKILL` directly to the process, halting it in milliseconds.
- **`docker rm -f`:** **Best for complete annihilation.** Forcefully kills the container and instantly deletes its read-write filesystem layer from the host in a single atomic command.
- **`kubectl delete pod`:** **Best for Kubernetes orchestration.** In K8s, manually stopping a container via Docker causes the kubelet to instantly spin up a replacement to satisfy the ReplicaSet. Rely on the orchestrator's API to manage lifecycles.

## How it works internally

The `docker stop` command translates into an HTTP POST request to the Docker daemon's `/containers/{id}/stop` REST API endpoint.

Upon receiving the request, the Docker daemon (via the `containerd` runtime) executes a `kill(2)` system call, targeting the root process ID (PID 1) running inside the container's isolated PID namespace. It specifically sends the `SIGTERM` (Signal 15) signal.

The daemon then enters a blocking wait state, monitoring the process tree of the container. If the application running as PID 1 has defined signal handlers, it intercepts the `SIGTERM` and begins executing its internal shutdown logic.

If the process tree empties and PID 1 exits before the timeout expires (default 10 seconds), the daemon updates the container state to `Exited` and the command succeeds. However, if the countdown timer expires and PID 1 is still actively running, the daemon executes a second `kill(2)` system call, this time sending the unblockable `SIGKILL` (Signal 9) signal. The Linux kernel immediately eradicates the process from memory without allowing any further code execution, forcibly stopping the container.

## Performance Notes

- **The 10-Second Blocking Delay:** The most prominent performance characteristic of `docker stop` is its potential to block automation pipelines for exactly 10 seconds. If an application is misconfigured and drops `SIGTERM` signals (a very common issue with shell scripts), every single `docker stop` command will inevitably hang for the full duration of the timeout.

## Security Notes

- **Privileged Execution:** Only users authorized to communicate with the Docker daemon socket can execute `docker stop`. Because stopping a security monitoring container or a routing mesh container effectively neutralizes node defenses, access to this command must be tightly controlled in multi-tenant environments.
- **Data Consistency:** If a containerized application processes financial transactions but ignores `SIGTERM` signals, relying on `docker stop` provides a false sense of security. The application will inevitably be `SIGKILL`ed after 10 seconds, potentially resulting in torn writes and database corruption.

## Common Mistakes

- **The PID 1 Shell Trap**
  - _Mistake:_ Using `CMD ./script.sh` (shell form) in a Dockerfile, and finding that `docker stop` always hangs for 10 seconds before forcefully killing the app.
  - _Why:_ The shell form causes `/bin/sh -c` to become PID 1. The shell process absorbs the `SIGTERM` signal and _does not_ pass it down to your actual application running as a child process. The application never knows it is supposed to shut down, so the daemon inevitably `SIGKILL`s everything. Always use the exec form `CMD ["./script.sh"]` or use `exec` within the script (`exec myapp`) to ensure the application becomes PID 1 and receives signals properly.
- **Setting the timeout too short for databases**
  - _Mistake:_ Running `docker stop -t 1 mysql` during an emergency migration.
  - _Why:_ Giving a heavy relational database only 1 second to flush gigabytes of dirty memory pages to disk guarantees it will not finish in time. The daemon will `SIGKILL` the database, resulting in a crashed table state that requires lengthy recovery on the next boot.

## Best Practices

- **Implement Signal Handlers:** Ensure the code you write inside containers actively listens for `OS.SIGTERM`. Web servers should stop accepting new connections and drain existing ones, and background workers should finish their current job and exit cleanly.
- **Use `STOPSIGNAL` in Dockerfiles:** If your application requires a signal other than `SIGTERM` for graceful shutdown (for example, NGINX often prefers `SIGQUIT`), define `STOPSIGNAL SIGQUIT` in your Dockerfile so `docker stop` natively uses the correct POSIX signal.

## Interview Questions

**Q: A developer runs `docker stop` on a custom Node.js container, but complains that it takes exactly 10 seconds every single time, whereas an NGINX container stops instantly. What is the fundamental issue?**
**A:** The Node.js application is likely failing to receive or process the `SIGTERM` signal. This is usually caused by the Dockerfile using the shell form (`CMD npm start`), which makes `/bin/sh` PID 1, trapping the signal. Alternatively, the Node.js code itself lacks event listeners for `process.on('SIGTERM', ...)`. Consequently, the container ignores the graceful shutdown request, forcing the Docker daemon to wait the full 10-second default timeout before terminating it with a `SIGKILL`.

**Q: Explain the exact sequence of POSIX signals utilized by the `docker stop` command.**
**A:** Upon execution, `docker stop` sends a `SIGTERM` (Signal 15) to PID 1 inside the container. It then waits for a defined grace period (default 10 seconds). If the process has not voluntarily exited by the end of the grace period, the daemon sends a `SIGKILL` (Signal 9), which cannot be caught or ignored by the application, forcing the kernel to instantly terminate the process.

## Practice Problems

**Problem:** You need to take a container named `data_warehouse` offline for maintenance. However, this container requires extensive time to flush cached data to persistent storage. Write the command to stop the container, granting it up to 5 minutes (300 seconds) to shut down gracefully before forcing a kill.
**Hint:** Use the flag that alters the default timeout window.
**Solution:**

```bash
docker stop -t 300 data_warehouse
```

**Problem:** You are running multiple instances of a web application for load testing (`web_1`, `web_2`, `web_3`). Write a single command to initiate a graceful shutdown for all three containers simultaneously.
**Hint:** The command accepts a space-separated list of targets.
**Solution:**

```bash
docker stop web_1 web_2 web_3
```

## References

- [Docker CLI Reference: docker stop](https://docs.docker.com/engine/reference/commandline/stop/)
- [Dockerfile reference: STOPSIGNAL](https://docs.docker.com/engine/reference/builder/#stopsignal)
- [Gracefully Stopping Docker Containers](https://www.docker.com/blog/gracefully-stopping-docker-containers/)
