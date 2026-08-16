---
slug: docker-network
name: docker network
aliases: []
category: cloud-cli
tags:
  - docker
  - networks
  - routing
  - dns
  - security
  - devops
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
  - create docker network bridge
  - list docker networks
  - connect container to network
  - inspect docker subnet
  - remove docker network
relatedCommands:
  - docker-run
  - docker-inspect
  - docker-compose
alternatives:
  - docker-compose
status: draft
---

## What is it?

`docker network` is the administrative command namespace used to manage the virtual networking topologies within the Docker daemon. It allows engineers to create, inspect, connect, and destroy custom Software-Defined Networks (SDNs) such as isolated bridges, multi-host overlays, or direct MAC-level interfaces (macvlan). This enables granular control over how containers communicate with each other, resolve internal DNS, and expose services to the external host network.

## Why does it exist?

By default, Docker attaches all new containers to a legacy, default `bridge` network (known as `docker0`). This default bridge lacks internal DNS resolution (containers can only ping each other by raw IP, which changes upon reboot) and provides zero network isolation. `docker network` exists to supersede this. By creating custom, user-defined bridge networks, administrators unlock automatic embedded DNS (containers can ping each other by name, e.g., `ping database`), enforce strict Layer 2 traffic isolation between microservice tiers, and securely bridge multi-host swarms using VXLAN overlays without manually editing Linux `iptables` or routing rules.

## Syntax

```bash
docker network COMMAND [OPTIONS]
```

## Flags

| Flag / Subcommand | Description                                                                                                                              | Example                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `create`          | Provisions a new virtual network. Requires specifying a driver and optional subnet routing configurations.                               | `docker network create my-net`                   |
| `ls`              | Lists all networks managed by the daemon, showing their unique IDs, names, drivers, and scope.                                           | `docker network ls`                              |
| `inspect`         | Outputs a detailed JSON payload of the network, revealing the exact subnet, gateway, and a list of all attached containers.              | `docker network inspect my-net`                  |
| `connect`         | Dynamically attaches a running container to a specified network without requiring a container restart.                                   | `docker network connect my-net web_app`          |
| `disconnect`      | Dynamically detaches a running container from a specified network, severing its access immediately.                                      | `docker network disconnect bridge web_app`       |
| `rm`              | Permanently deletes one or more networks. Fails if active containers are currently attached to it.                                       | `docker network rm my-net`                       |
| `prune`           | Garbage collection command. Removes all custom networks that currently have zero containers attached to them.                            | `docker network prune -f`                        |
| `-d`, `--driver`  | (Flag for `create`) Specifies the underlying networking driver. Defaults to `bridge`. Accepts `overlay`, `macvlan`, `ipvlan`, `none`.    | `docker network create -d overlay my-swarm-net`  |
| `--subnet`        | (Flag for `create`) Defines the specific CIDR block (e.g., `192.168.0.0/16`) for the network, preventing Docker from picking randomly.   | `docker network create --subnet=10.5.0.0/16 net` |
| `--internal`      | (Flag for `create`) Restricts external access to the network entirely. Containers can talk to each other, but cannot reach the internet. | `docker network create --internal secure-db`     |

## Examples

```bash
docker network create -d bridge frontend_tier
```

> Creates an isolated, user-defined bridge network named `frontend_tier`. Containers launched with `--network frontend_tier` will automatically resolve each other's hostnames via Docker's embedded DNS server, completely bypassing the limitations of the default `docker0` bridge.

```bash
docker network inspect backend_tier
```

> Dumps the JSON configuration of the `backend_tier` network. This is the primary troubleshooting command used by developers to find the auto-assigned IP address of a specific container or verify the subnet gateway.

```bash
docker network connect --ip 10.5.0.25 backend_tier reporting_app
```

> Dynamically attaches the actively running `reporting_app` container to the `backend_tier` network. It explicitly requests a static IP address (`10.5.0.25`) within that network's subnet, allowing legacy applications requiring hardcoded IPs to function.

```bash
docker network create -d macvlan --subnet=192.168.1.0/24 --gateway=192.168.1.1 -o parent=eth0 pub_net
```

> Provisions a `macvlan` network. Instead of creating a virtual NAT bridge, this binds directly to the host's physical network interface (`eth0`). Containers attached to `pub_net` will receive their own unique MAC addresses and appear as physical, first-class citizens on the physical office LAN.

```bash
docker network rm $(docker network ls -q -f "type=custom")
```

> A cleanup command leveraging shell substitution and server-side filtering. It queries for the IDs of all user-created networks and deletes them in a batch, leaving the immutable system networks (`bridge`, `host`, `none`) intact.

## Real-World Scenarios

**Microservice Security Segmentation**

```bash
docker network create dmz
docker network create backend_data
docker run -d --name proxy --network dmz nginx
docker run -d --name api --network dmz myapi
docker network connect backend_data api
docker run -d --name db --network backend_data postgres
```

> A security-conscious engineer isolates a 3-tier architecture. The `proxy` and `api` containers sit in the `dmz` network. The `db` container sits strictly in the `backend_data` network. The `api` container is connected to _both_ networks, acting as a secure bridge. If the `proxy` is compromised, the attacker mathematically cannot route packets to the `db` because they reside on separate, isolated Linux bridge interfaces.

**Zero-Downtime Migration**

```bash
# App is currently on old_net. Bring up new_net.
docker network create new_net
docker network connect new_net web_server
# Web server is now accessible on both networks. Migrate traffic.
docker network disconnect old_net web_server
```

> An administrator needs to move a critical container to a new subnet with a larger CIDR block. Instead of stopping the container (`docker run`), they dynamically bind the container's namespace to the `new_net` virtual interface. Once routing is confirmed, they disconnect it from `old_net`, achieving network migration with zero application downtime.

## When should it NOT be used?

- **Kubernetes Environments:** **Do not use `docker network` if orchestrating with Kubernetes.** Kubernetes replaces Docker's CNI (Container Network Interface) with its own heavily integrated SDN plugins (like Calico, Flannel, or Cilium). Docker network commands are entirely blind to Kubernetes Pod networking.
- **Docker Compose:** **Avoid manual creation if using Compose.** `docker-compose up` automatically creates, attaches, and tears down dedicated bridge networks for the stack. Manually invoking `docker network create` is usually redundant unless defining an `external: true` network in the YAML file.

## Alternatives

- **`docker-compose`:** **Best for automated provisioning.** Translates complex `--subnet` and `--internal` flags into readable, version-controlled YAML configuration.
- **Kubernetes CNI:** **Best for massive scale.** Handles complex BGP routing, network policies, and cross-datacenter tunneling that Docker's native `overlay` driver struggles with.

## How it works internally

Docker networking relies heavily on Linux kernel networking primitives.

When you run `docker network create -d bridge my-net`, the Docker daemon interacts with the kernel to instantiate a new physical virtual-bridge interface (e.g., `br-123456789abc`). It uses `iptables` to configure NAT (Network Address Translation) rules, enabling containers on this bridge to masquerade outbound traffic to the internet through the host's primary NIC.

When a container starts, Docker leverages Linux Network Namespaces (`netns`). It creates a virtual ethernet pair (`veth` pair). Think of this as a virtual Ethernet cable. It plugs one end into the container's isolated network namespace (appearing as `eth0` inside the container) and plugs the other end into the newly created host bridge interface (`br-123456789abc`).

For user-defined bridges, Docker spins up a localized, embedded DNS resolver (listening on `127.0.0.11` inside the container). When `container-a` pings `container-b`, the ping hits the embedded DNS server. The Docker daemon catches this request, looks up `container-b` in its internal SQLite state database, and returns the assigned internal IP address instantly, facilitating automatic service discovery.

## Performance Notes

- **NAT Overhead:** Traffic routed through the `bridge` driver must traverse Linux `iptables` NAT rules, introducing slight CPU overhead and latency. For high-performance, low-latency applications (like algorithmic trading), using `--network host` completely bypasses the bridge, binding the container directly to the host's network stack for raw performance (at the cost of all isolation).
- **Overlay MTU Fragmentation:** Multi-host `overlay` networks encapsulate packets inside VXLAN tunnels. This encapsulation adds headers, reducing the Maximum Transmission Unit (MTU). If MTU is not configured correctly, heavy packets will fragment, absolutely destroying cross-host database replication performance.

## Security Notes

- **Bypassing UFW/Firewalld:** Docker aggressively manipulates `iptables` to route traffic. When you publish a port (`-p 8080:80`), Docker inserts an `iptables` PREROUTING rule that takes precedence over standard host firewalls like UFW. This can accidentally expose secure containers directly to the public internet, completely bypassing strict UFW block rules.
- **The `--internal` Flag:** Creating a network with `--internal` disables outbound NAT. Containers on this network physically cannot reach the internet (e.g., to download malware payloads or exfiltrate data). This is a critical security control for isolating backend databases or vault services.

## Common Mistakes

- **Relying on the default `docker0` bridge**
  - _Mistake:_ Launching two containers without a `--network` flag, and wondering why `curl http://backend_api` fails with "Could not resolve host".
  - _Why:_ The legacy default bridge (`docker0`) does _not_ support embedded DNS resolution for container names. You must create a custom network (`docker network create my-net`) to unlock automatic DNS service discovery.
- **IP Conflicts with Corporate Subnets**
  - _Mistake:_ Running `docker network create vpn_net` on an enterprise laptop, and suddenly losing access to the corporate intranet.
  - _Why:_ If you don't specify `--subnet`, Docker sequentially allocates CIDR blocks (like `172.17.0.0/16`). If this auto-allocated block overlaps with your company's actual internal VPN routing table, your host OS will route traffic to the Docker bridge instead of the corporate network. Always define explicit `--subnet` ranges to avoid collisions.

## Best Practices

- **Create Networks per Application:** Never dump all containers onto a single massive bridge. Create dedicated networks for every project stack (e.g., `billing-net`, `auth-net`) to compartmentalize traffic and enforce blast radiuses.
- **Use `ipvlan` for Legacy Integrations:** If you are containerizing a legacy monolith that strictly demands its own MAC/IP address on your corporate switch (bypassing NAT entirely), use the `ipvlan` or `macvlan` network driver to grant the container direct Layer 2 access to the physical network.

## Interview Questions

**Q: A developer complains that they cannot ping `container-b` from `container-a` using the container's name, even though both are running. You verify they are both attached to the default `bridge` network. How do you fix this architectural issue?**
**A:** The legacy default `bridge` network does not support automatic DNS resolution for container names. To fix this, you must provision a user-defined network (`docker network create custom_net`) and reattach both containers to it. User-defined bridges utilize Docker's embedded DNS server (`127.0.0.11`), which dynamically resolves container names to their internal IPs.

**Q: Explain the security benefit of placing a PostgreSQL database container on a network created with the `--internal` flag.**
**A:** The `--internal` flag configures the Linux bridge to omit the default NAT routing rules that masquerade traffic to the host's external network interface. This mathematically guarantees that the PostgreSQL container cannot initiate outbound connections to the internet (preventing data exfiltration or malware downloads) and cannot be reached from the outside, enforcing a strict, hermetic security boundary.

## Practice Problems

**Problem:** You are provisioning a secure backend. Create a new Docker network named `vault_net` that prevents all outbound internet access for the containers attached to it.
**Hint:** Use the flag that disables default external routing.
**Solution:**

```bash
docker network create --internal vault_net
```

**Problem:** You have a running container named `legacy_app`. It currently resides on `network_a`. You need it to communicate with a database on `network_b`. Write the command to attach the running container to the new network without stopping it.
**Hint:** Use the specific subcommand designed for dynamic attachment.
**Solution:**

```bash
docker network connect network_b legacy_app
```

## References

- [Docker CLI Reference: docker network](https://docs.docker.com/engine/reference/commandline/network/)
- [Docker Networking Overview](https://docs.docker.com/network/)
- [Use bridge networks](https://docs.docker.com/network/bridge/)
