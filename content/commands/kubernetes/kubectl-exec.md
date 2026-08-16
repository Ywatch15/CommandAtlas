---
slug: kubectl-exec
name: kubectl exec
aliases: []
category: kubernetes
tags:
  - kubernetes
  - k8s
  - debugging
  - shell
  - interactive
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
  - cmd
  - sh
intentPhrases:
  - ssh into kubernetes pod
  - run command in k8s container
  - open shell in kubernetes
  - execute bash in pod
  - access running container k8s
relatedCommands:
  - kubectl-logs
  - kubectl-port-forward
  - docker-exec
  - ssh
alternatives:
  - ssh
status: draft
---
## What is it?

`kubectl exec` is a diagnostic and operational command that allows a user to execute an arbitrary command inside a running container within a Kubernetes Pod. By bridging standard input, output, and error streams between the local terminal and the remote container runtime, it effectively simulates an SSH connection, granting administrators interactive shell access or the ability to run headless diagnostic scripts deep within the cluster's isolated networking namespaces.

## Why does it exist?

Containers are immutable and isolated. When a microservice misbehaves (e.g., cannot resolve a database hostname or encounters a filesystem permission error), traditional debugging from the host operating system is impossible due to strict Linux namespace boundaries. Furthermore, orchestrators actively discourage bundling SSH daemons (`sshd`) inside container images due to severe security and bloat concerns. `kubectl exec` exists to provide native, secure, out-of-band execution capabilities. It leverages the Kubernetes control plane's established TLS connections to tunnel commands directly into the container runtime (like containerd), enabling live introspection without compromising the immutable design of the application image.

## Syntax

```bash
kubectl exec (POD | TYPE/NAME) [-c CONTAINER] [flags] -- COMMAND [args...]
```

## Flags

| Flag                | Description                                                                                                                               | Example                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `-i`, `--stdin`     | Keeps standard input (stdin) open, even if the user is not actively typing. Required for interactive commands.                            | `kubectl exec -i my-pod -- cat`        |
| `-t`, `--tty`       | Allocates a pseudo-TTY (terminal). Combined with `-i`, this is required to spawn interactive shells like `bash`.                          | `kubectl exec -it my-pod -- sh`        |
| `-c`, `--container` | Specifies which container to execute the command inside. Mandatory if the Pod contains more than one container.                           | `kubectl exec my-pod -c sidecar -- ls` |
| `-n`, `--namespace` | Specifies the namespace of the target Pod. Defaults to the active context's namespace.                                                    | `kubectl exec my-pod -n prod -- env`   |
| `--`                | The double-dash separator. Prevents `kubectl` from misinterpreting flags intended for the internal command as flags for `kubectl` itself. | `kubectl exec my-pod -- ls -l -a`      |

## Examples

```bash
kubectl exec -it my-web-pod -- /bin/bash
```

> The most ubiquitous Kubernetes debugging command. It targets `my-web-pod`, allocates an interactive terminal (`-it`), and launches the `/bin/bash` executable inside the primary container. The user's local terminal instantly becomes a shell inside the remote container. (If the container is Alpine-based, substitute `/bin/bash` with `/bin/sh`).

```bash
kubectl exec database-pod-0 -c backup-sidecar -- pg_dump -U root mydb > local_backup.sql
```

> Demonstrates multi-container targeting and stream redirection. It bypasses the primary database container to execute a command inside the `backup-sidecar` container. The output of the remote `pg_dump` command is streamed over the API server connection and captured into a file (`local_backup.sql`) on the user's _local_ hard drive.

```bash
kubectl exec deploy/frontend -- curl -s http://backend-service:8080/health
```

> Executes a headless command using a resource type alias instead of an exact Pod name. Kubernetes automatically selects the first available Pod managed by the `frontend` Deployment, runs the `curl` command inside it to test internal cluster DNS resolution, and prints the result to the local terminal, exiting immediately.

```bash
kubectl exec -it my-pod -- env
```

> Dumps all environment variables currently injected into the container's active process space. Crucial for verifying that Kubernetes Secrets or ConfigMaps were properly mapped to the application during the boot sequence.

## Real-World Scenarios

**Creating Ephemeral Debugging Tunnels**

```bash
kubectl exec -it redis-master -- redis-cli -a $REDIS_PASS
```

> Rather than exposing a highly sensitive Redis cache to the public internet or configuring complex port-forwarding rules just to flush a cache key, an SRE utilizes `kubectl exec` to invoke the `redis-cli` binary that is natively bundled inside the Redis container image, interacting with the database securely over the Kubernetes control plane.

**Testing Network Policies and Egress**

```bash
kubectl exec -it secure-pod -- ping 8.8.8.8
kubectl exec -it secure-pod -- nc -zv internal-db 5432
```

> When deploying strict Calico or Cilium NetworkPolicies, engineers must verify that rules are successfully dropping or allowing traffic. By executing raw network utilities (`ping`, `nc`, `nslookup`) directly from the perspective of the restricted container, they can definitively prove whether a packet can escape the Pod's isolated network namespace.

## When should it NOT be used?

- **Modifying Files:** **Do not use `exec` to edit application code or configs live (e.g., `apt-get install` or `vi config.json`).** Containers are ephemeral. If the Pod crashes or scales, your manual edits are permanently destroyed. All dependencies and configurations must be baked into the Docker image or mounted via ConfigMaps to preserve immutability.
- **Executing in Distroless Images:** If an organization utilizes highly secure "distroless" container images (or images built `FROM scratch`), `kubectl exec` will fail completely. These images contain exactly zero operating system utilities—there is no `/bin/sh`, `ls`, or `cat` to execute. You must use the `kubectl debug` command to attach an ephemeral debugging container to the pod's namespace instead.
- **Fetching Logs:** Do not use `kubectl exec my-pod -- cat /var/log/app.log`. Containerized applications should log to standard output. Use `kubectl logs my-pod` to leverage the native cluster logging architecture.

## Alternatives

- **`kubectl debug`:** **Best for modern/secure environments.** Attaches a brand new, fully-equipped troubleshooting container (containing `bash`, `curl`, `tcpdump`) to the network and process namespace of a failing pod, solving the problem of debugging distroless or highly stripped production images.
- **`kubectl port-forward`:** **Best for interacting with APIs.** If you need to hit an internal REST API or database GUI, `port-forward` securely tunnels TCP traffic to your local `localhost` without requiring shell execution inside the pod.
- **`ssh`:** **Anti-pattern.** Never run SSH daemons inside Kubernetes pods.

## How it works internally

`kubectl exec` involves a complex multiplexing sequence that traverses the entire Kubernetes control plane.

When you type `kubectl exec -it pod-A -- /bin/bash`, the CLI sends an HTTP POST request to the API Server targeting a specific subresource: `/api/v1/namespaces/default/pods/pod-A/exec`.

The API Server acts as an intelligent proxy. It checks the etcd database to discover which physical worker node `pod-A` is currently running on. It then establishes an upgraded, multiplexed connection (historically SPDY, transitioning to WebSockets) directly to the `Kubelet` process running on that specific worker node.

The Kubelet receives this stream and translates the request to the Container Runtime Interface (CRI), instructing the underlying container runtime (e.g., `containerd` or `CRI-O`) to execute the requested binary (`/bin/bash`) inside the container's isolated Linux namespaces (PID, Mount, Net).

The container runtime binds the `stdin`, `stdout`, and `stderr` file descriptors of the `/bin/bash` process to the stream. The Kubelet pipes this stream back to the API Server, which pipes it back to your `kubectl` client, ensuring seamless bi-directional communication between your local keyboard and the remote container process.

## Performance Notes

- **API Server Bottlenecks:** Because all `exec` traffic flows directly _through_ the central Kubernetes API Server, transferring massive amounts of data (e.g., `kubectl exec pod -- tar czf - /data > backup.tar.gz`) can saturate the control plane's network bandwidth and CPU. For massive data transfers, native volume snapshotting or cloud-provider tools are vastly superior.

## Security Notes

- **God-Mode Access:** Executing a shell via `kubectl exec` bypasses almost all Kubernetes network policies and identity proxies. You instantly assume the identity of the user running the container (often `root`). You can read mounted Secrets, access local databases, and pivot through the network. Access to the `pods/exec` RBAC subresource must be heavily restricted and actively audited in production.
- **Audit Logging:** Most enterprise Kubernetes clusters configure Audit Logging to capture `exec` events. The API server records _who_ executed the command and _which_ pod they targeted. However, tracking the exact keystrokes typed _inside_ the interactive `/bin/bash` shell is nearly impossible natively, creating significant compliance blind spots.

## Common Mistakes

- **Forgetting the `--` separator**
  - _Mistake:_ Running `kubectl exec my-pod ls -l` and receiving a confusing error about `kubectl` not recognizing the `-l` flag.
  - _Why:_ The `kubectl` binary parses arguments greedily. It thinks `-l` is a flag meant for `kubectl` (like `--label`), not for the `ls` command. You must use the double-dash `--` to signal the parser to stop processing `kubectl` flags and pass the remainder of the string raw to the container: `kubectl exec my-pod -- ls -l`.
- **Multi-container ambiguity**
  - _Mistake:_ Running `kubectl exec -it istio-enabled-pod -- bash` and finding yourself in an unrecognized environment where your application files are missing.
  - _Why:_ If a Pod contains multiple containers (like an Envoy sidecar or a Fluentd logger), `kubectl` arbitrarily defaults to the _first_ container defined in the manifest. You must use `-c <container_name>` to explicitly target the container running your application code.

## Best Practices

- **Alias the boilerplate:** In fast-paced debugging, typing the full command is tedious. Set an alias in your `~/.bashrc`: `alias kex="kubectl exec -i -t"`. This reduces a massive command to simply `kex my-pod -- sh`.
- **Prefer non-interactive checks:** Instead of shelling in to look at a file, script the extraction. Run `kubectl exec pod-a -- cat /etc/config.json | jq '.'`. This keeps your workflows documentable, repeatable, and reduces the time an open shell exists in the cluster.

## Interview Questions

**Q: You attempt to `kubectl exec` into a running Pod to troubleshoot an issue, but the command immediately fails with the error: `executable file not found in $PATH`. You know for a fact the Pod is running a Go application successfully. What architectural pattern causes this, and how do you troubleshoot the Pod instead?**
**A:** The Pod is likely running a "distroless" image or an image built `FROM scratch`. These highly secure, minimal images contain absolutely no operating system utilities—not even a shell (`/bin/sh`) or basic binaries like `ls`. Because the executable you requested doesn't exist inside the container's filesystem, `exec` fails. To troubleshoot, you must use `kubectl debug` to attach an ephemeral container (which contains debugging tools) to the target Pod's namespaces.

**Q: Explain the network routing path that your keystrokes take when you type a command into an active `kubectl exec -it` session.**
**A:** The keystrokes originate in the local terminal running `kubectl`. They are transmitted over HTTPS/WebSockets to the central Kubernetes API Server. The API Server proxies the connection, forwarding the data to the `Kubelet` running on the specific worker node hosting the Pod. The Kubelet passes the data through the Container Runtime Interface (CRI) to the container runtime (e.g., containerd), which finally delivers the bytes into the `stdin` file descriptor of the executing process inside the container.

## Practice Problems

**Problem:** You have a Pod named `data-processor` that contains two containers: `app` and `log-shipper`. You need to open an interactive `sh` shell specifically inside the `log-shipper` container to check its configuration. Write the complete command.
**Hint:** Combine the interactive TTY flags with the specific container targeting flag, and remember the double-dash separator.
**Solution:**

```bash
kubectl exec -it data-processor -c log-shipper -- sh
```

**Problem:** You are writing an automation script to verify that an internal NGINX server is running. Write a non-interactive command to execute `nginx -v` inside the `web-server` Pod, ensuring the output prints to your script's standard output and exits immediately.
**Hint:** Exclude the TTY (`-t`) and interactive (`-i`) flags.
**Solution:**

```bash
kubectl exec web-server -- nginx -v
```

## References

- [kubectl CLI Reference: exec](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec)
- [Get a Shell to a Running Container](https://kubernetes.io/docs/tasks/debug/debug-application/get-shell-running-container/)
