---
slug: docker-inspect
name: docker inspect
aliases: []
category: docker
tags:
  - docker
  - introspection
  - debugging
  - json
  - metadata
  - observability
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
  - get container ip address
  - view docker object details
  - extract docker metadata json
  - inspect docker volume path
  - find container environment variables
relatedCommands:
  - docker-ps
  - jq
  - docker-logs
  - docker-network
  - docker-volume
alternatives: []
status: draft
---

## What is it?

`docker inspect` is the ultimate introspection utility within the Docker ecosystem. It queries the Docker daemon's internal state database and outputs a massive, highly detailed JSON array containing low-level configuration and runtime metrics for Docker objects—including containers, images, volumes, networks, and nodes. It serves as the primary diagnostic tool for developers attempting to extract obscure routing IPs, verify volume mount points, or audit environment variables injected into running applications.

## Why does it exist?

High-level commands like `docker ps` or `docker images` heavily truncate data, presenting only a human-readable fraction of the actual configuration payload managed by the daemon. When automating deployments or debugging complex networking failures, engineers require programmatic access to absolute truth: exact MAC addresses, complete entrypoint strings, physical host mount directories, and precise state timestamps. `docker inspect` exists to expose the raw, unadulterated state structures maintained by the Docker Engine in an easily parsable JSON format, bridging the gap between high-level CLI wrappers and low-level Linux primitives.

## Syntax

```bash
docker inspect [OPTIONS] NAME|ID [NAME|ID...]
```

## Flags

| Flag             | Description                                                                                                                                            | Example                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `-f`, `--format` | Formats the output using a Go text/template string. Extracts specific data points, avoiding the need to pipe the massive output through `jq`.          | `docker inspect -f '{{.State.Status}}' db`  |
| `-s`, `--size`   | (Containers only) Calculates and includes the total file size of the container's writable layer and its virtual size relative to the base image.       | `docker inspect -s my_container`            |
| `--type`         | Restricts the lookup to a specific object type (`container`, `image`, `network`, `volume`). Essential if an image and a container share the same name. | `docker inspect --type container ubuntu`    |
| `-H`, `--host`   | _(Global Docker Flag)_ Overrides the default socket, directing the inspection query to a remote Docker daemon via TCP or SSH.                          | `docker -H tcp://10.0.1.5:2375 inspect api` |
| `--context`      | _(Global Docker Flag)_ Uses a pre-configured Docker CLI context to target an alternative local or remote Docker Engine environment.                    | `docker --context dev-cluster inspect api`  |
| `--tlsverify`    | _(Global Docker Flag)_ Demands strict TLS certificate validation when inspecting objects on a secured remote daemon.                                   | `docker --tlsverify inspect api`            |
| `--help`         | Prints a brief help message displaying usage syntax, available flags, and examples of Go template extraction.                                          | `docker inspect --help`                     |

## Examples

```bash
docker inspect my_nginx
```

> The standard invocation. Assesses the target object and dumps a massive, multi-hundred-line JSON array containing every configuration parameter, network binding, mount definition, and state metric associated with the `my_nginx` container to standard output.

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my_db
```

> The most common operational pattern. Uses Go templating to traverse the complex JSON hierarchy directly within the CLI, extracting and printing _only_ the internal IP address assigned to the `my_db` container, circumventing the need for external tools like `jq`.

```bash
docker inspect -f '{{.State.Running}}' worker_node
```

> A highly reliable scripting hook. Instead of parsing the text output of `docker ps`, a bash script uses this template to ask the daemon directly for a boolean `true` or `false` string representing the container's execution state.

```bash
docker inspect my_volume | grep "Mountpoint"
```

> Inspecting non-container objects. By targeting a volume name, the daemon returns the JSON representation of the storage object. The administrator uses `grep` to quickly find the physical path on the host Linux filesystem where the raw data resides.

```bash
docker inspect --format='{{json .Config.Env}}' app_server
```

> Extracts the application's environment variables. The `{{json .}}` template function converts the internal Go slice containing the environment variables (`KEY=VALUE` strings) into a strictly formatted JSON array, making it perfect for ingestion by subsequent automation steps.

## Real-World Scenarios

**Dynamic Reverse Proxy Configuration**

```bash
# Inside an automation script triggered by a webhook
APP_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' new_backend)
sed -i "s/BACKEND_IP/$APP_IP/g" /etc/nginx/nginx.conf
systemctl reload nginx
```

> Legacy reverse proxies (that don't use dynamic service discovery like Traefik) require hardcoded IP addresses. A deployment script leverages `docker inspect` to dynamically extract the unpredictable IP address assigned to a newly deployed container, injects it into the NGINX configuration, and reloads the proxy routing table.

**Security Auditing of Ephemeral Secrets**

```bash
docker inspect malicious_container -f '{{json .Config.Env}}' | grep "AWS_ACCESS_KEY"
```

> A security engineer isolates a suspicious, unauthorized container running on a host. Before killing it, they use `docker inspect` to dump the environment variables injected into the process memory at runtime, discovering compromised AWS credentials that were fed into the container.

## When should it NOT be used?

- **Fetching Application Logs:** **Do not use `inspect` to check application output.** `inspect` only provides daemon-level configuration and state metadata. It knows nothing about what the application is printing to standard output. Use `docker logs` for that.
- **Heavy Polling Scripts:** **Do not put `docker inspect` inside a tight `while true` loop to monitor CPU/Memory.** `inspect` grabs static configuration metadata. It does not provide real-time utilization telemetry. Rely on `docker stats` or cAdvisor for live resource metrics.

## Alternatives

- **`jq`:** **Best for complex JSON processing.** While `docker inspect -f` provides basic Go templating, piping the raw JSON output to `jq` allows for significantly more advanced filtering, mapping, and array reductions that Go templates struggle with.
- **`crictl inspect`:** **Best for Kubernetes.** When operating on modern K8s worker nodes running containerd/CRI-O, use `crictl inspect` to dump the low-level sandbox and container state without relying on the deprecated Docker runtime.

## How it works internally

When you execute `docker inspect <object>`, the Docker CLI examines the target string and sends an HTTP GET request to multiple backend endpoints concurrently or sequentially until it finds a match. For a container, it hits `/containers/{id}/json`.

The Docker daemon retrieves the object from its internal in-memory data structures (backed by the `boltdb` or SQLite key-value store in `/var/lib/docker`). This internal representation contains massive amounts of data:

- **State:** The current run status, OOM-kill flags, exit codes, and timestamps.
- **HostConfig:** The cgroup limits, privilege escalation settings, port bindings, and restart policies configured at launch.
- **NetworkSettings:** The specific virtual interfaces (veth pairs), MAC addresses, IP addresses, and DNS configurations generated by Docker's libnetwork component.

The daemon serializes this comprehensive internal Go struct into a massive JSON payload and returns it to the CLI. If the user provided a `--format` flag, the Docker CLI leverages the Go standard library's `text/template` package to parse the JSON string, applying the requested data projections and loops client-side before outputting the final string to the terminal.

## Performance Notes

- **Size Calculation Overhead:** By default, `inspect` operates quickly by reading metadata. However, if the `-s` (size) flag is passed for a container, the daemon must halt and perform a recursive disk calculation on the host's `overlay2` storage driver to determine the exact byte size of the container's writable layer, adding significant I/O latency.

## Security Notes

- **Credential Leakage:** `docker inspect` prints the `Env` array entirely in plaintext. If an orchestration system or developer launched the container using `docker run -e DB_PASS=Secret`, any user on the host machine capable of talking to the Docker socket can extract the plaintext password trivially via `inspect`. Secrets should always be handled via Docker Secrets (in Swarm) or mounted tmpfs files, never environment variables.
- **Information Reconnaissance:** In a compromised environment, attackers use `docker inspect` to map the internal network topology, identify gateway IP addresses, discover linked database containers, and extract host-mounted volume paths to facilitate container escape attacks.

## Common Mistakes

- **Grepping instead of Formatting**
  - _Mistake:_ Using `docker inspect db | grep IPAddress` and getting multiple lines back, unsure which one is correct.
  - _Why:_ The JSON payload contains nested arrays (e.g., secondary networks or aliases). `grep` blindly grabs every matching line, often returning internal bridge IPs instead of the actual assigned IP. Always use the `-f` Go template extraction (e.g., `'{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`) for pinpoint accuracy.
- **Assuming image properties map to container reality**
  - _Mistake:_ Inspecting an _image_ and assuming the `ExposedPorts` listed are actively listening on the host.
  - _Why:_ Inspecting an image only shows the declarative metadata defined in the `Dockerfile`. It does not reflect runtime reality. To see what ports are physically bound to the host network, you must inspect the instantiated _container_, not the base image.

## Best Practices

- **Master the `json` Template Function:** Go templating syntax can be obscure. If you need to extract a nested dictionary but want it cleanly formatted as JSON for further script processing, use `{{json .Property}}` (e.g., `docker inspect -f '{{json .Mounts}}' container`).
- **Explicit Typing on Collisions:** If you have an image tagged `ubuntu:latest` and you name a container `ubuntu`, running `docker inspect ubuntu` is ambiguous. The daemon will guess. Always enforce explicit typing using `docker inspect --type container ubuntu` to guarantee deterministic output in automation.

## Interview Questions

**Q: A script uses `docker inspect my_app | grep "IPAddress"` to find a container's IP, but it occasionally fails or returns multiple wrong IPs. Why is this approach flawed, and how should it be rewritten?**
**A:** Using `grep` on raw JSON is fragile because the string "IPAddress" appears multiple times in the `docker inspect` output (e.g., under global network settings, and then again nested under specific network attachments). Furthermore, formatting changes break `grep`. The correct, deterministic approach is to utilize Docker's built-in Go templating engine: `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my_app`.

**Q: If you suspect a container has been silently killed by the Linux kernel because it consumed too much memory, how can you definitively prove it using `docker inspect`?**
**A:** You can query the container's internal state machine using the formatting flag to extract the OOM (Out Of Memory) killed boolean value. Running `docker inspect -f '{{.State.OOMKilled}}' <container_id>` will return `true` if the kernel forcefully terminated the process for exceeding memory limits.

## Practice Problems

**Problem:** You are debugging a routing issue. You need to extract the exact internal IP Address assigned to a running container named `redis_backend`. Write the command to extract _only_ the IP address string using Go templates, without using `grep` or `jq`.
**Hint:** The IP address resides deeply nested inside the NetworkSettings and Networks objects.
**Solution:**

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' redis_backend
```

**Problem:** You want to find out the physical location on your Linux server where a specific Docker Volume named `app_data` is storing its files. Write the command to extract this specific path.
**Hint:** Inspect the volume object and use the formatting flag to target the `Mountpoint` property.
**Solution:**

```bash
docker inspect -f '{{.Mountpoint}}' app_data
```

## References

- [Docker CLI Reference: docker inspect](https://docs.docker.com/engine/reference/commandline/inspect/)
- [Format command and log output (Go Templates)](https://docs.docker.com/config/formatting/)
