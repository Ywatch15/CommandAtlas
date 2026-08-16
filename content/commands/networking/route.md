---
slug: route
name: route
aliases: []
category: networking
tags: [linux, networking, routing, legacy, gateways, sysadmin]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'show linux routing table'
  - 'add default gateway command line'
  - 'delete static route linux'
  - 'view ip routing'
  - 'configure static routes'
relatedCommands: [ip, netstat, ifconfig, ping]
alternatives: [ip, netstat]
status: draft
---

## What is it?

`route` is a legacy command-line utility from the deprecated `net-tools` suite used to show or manipulate the IP routing table of the Linux kernel. It allows administrators to explicitly define static pathways, instructing the operating system on which network interface and gateway to utilize when forwarding packets toward specific destination subnets or the internet.

## Why does it exist?

Any machine with multiple network interfaces or a connection to the internet requires a map instructing it where to send outbound network traffic. Historically, `route` was the universal UNIX standard for reading and modifying the kernel's Forwarding Information Base (FIB). Though fully superseded by the modern `ip route` command, `route` exists primarily due to decades of embedded legacy scripts, deeply entrenched muscle memory, and older Unix-derivative distributions that still rely on it.

## Syntax

```bash
route [-nNvee] [-FC] [<AF>]
route add [-net|-host] target [netmask Nm] [gw Gw] [[dev] If]
route del [-net|-host] target [gw Gw] [netmask Nm] [[dev] If]
```

## Flags

| Flag             | Description                                                                                                     | Example                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `-n`             | Displays numerical IP addresses rather than attempting reverse-DNS hostname resolution (avoids massive delays). | `route -n`                                                  |
| `-e`             | Formats output identically to `netstat -r`, utilizing an extended, readable routing table layout.               | `route -e`                                                  |
| `add`            | (Command) Instructs the utility to inject a new routing entry into the kernel table.                            | `route add default gw 192.168.1.1`                          |
| `del`            | (Command) Instructs the utility to remove a specific routing entry from the kernel table.                       | `route del -net 10.0.0.0/8`                                 |
| `-net`           | Explicitly declares the routing target is a network (requires a subnet mask).                                   | `route add -net 172.16.0.0 netmask 255.255.0.0 gw 10.0.0.1` |
| `-host`          | Explicitly declares the routing target is a single, specific host IP (implicitly acts as `/32`).                | `route add -host 8.8.8.8 gw 192.168.1.254`                  |
| `gw <IP>`        | Specifies the IP address of the gateway (router) that traffic should be forwarded to.                           | `route add default gw 10.0.0.1`                             |
| `netmask <Mask>` | Specifies the network mask for the destination network in legacy dotted-decimal format.                         | `route add -net 10.0.0.0 netmask 255.0.0.0 dev eth1`        |
| `dev <Iface>`    | Specifies the exact physical or virtual network interface the traffic should egress from.                       | `route add default dev ppp0`                                |

## Examples

```bash
route -n
```

> This prints the active IPv4 kernel routing table. The crucial `-n` flag bypasses slow DNS lookups, outputting raw numerical IP addresses for the `Destination`, `Gateway`, and `Genmask` columns alongside routing flags and interface names.

```bash
route add default gw 192.168.1.1 dev eth0
```

> This injects the most critical routing rule: the default gateway. It instructs the kernel that any outbound traffic lacking a specific subnet route should be forwarded unconditionally out of interface `eth0` toward the router at `192.168.1.1`.

```bash
route add -net 10.0.0.0 netmask 255.0.0.0 gw 192.168.2.1
```

> This sets up a static network route. It instructs the system to route all packets destined for the massive `10.0.0.0/8` corporate intranet range toward a specific internal router (`192.168.2.1`), rather than sending them to the public internet gateway.

```bash
route del default
```

> This violently drops the active default gateway from the routing table. Any packet destined for the public internet will instantly fail with a "Network is unreachable" error until a new default route is provided.

```bash
route add -host 203.0.113.50 dev eth1
```

> This establishes a host-specific route (`/32`). It forces traffic destined exclusively for the single IP address `203.0.113.50` to bypass standard gateways and egress directly via the `eth1` network interface.

## Real-World Scenarios

**Split-Tunnel VPN Configuration**

```bash
route add -net 172.31.0.0 netmask 255.255.0.0 dev tun0
```

> Systems administrators configuring ad-hoc split-tunnel VPNs use `route add` to force corporate traffic (`172.31.x.x`) to route across the encrypted `tun0` interface, while allowing standard internet traffic to continue flowing out the default unencrypted `eth0` gateway.

**Blackholing Malicious Traffic**

```bash
route add -host 185.15.2.3 gw 127.0.0.1
```

> During an active network attack, operators can instantly blackhole traffic from a specific malicious IP by creating a static host route directing it to the `127.0.0.1` loopback address, effectively dropping the traffic at the kernel routing layer before application processing.

## When should it NOT be used?

- **On any modern Linux distribution (Ubuntu 20+, RHEL 8+):** **Reason:** The entire `net-tools` package (including `route` and `ifconfig`) is officially deprecated. Modern networking features like policy routing, multiple routing tables, and CIDR notation are structurally unsupported by `route`. **Use instead:** `ip route`.
- **Applying persistent network configurations:** **Reason:** Commands executed via `route` manipulate volatile kernel RAM. The instant the server reboots or the network daemon restarts, the routes vanish completely. **Use instead:** NetworkManager (`nmcli`) or `systemd-networkd` configuration files.

## Alternatives

- **`ip route` (iproute2):** The modern kernel standard. **Tradeoff:** `ip route` is significantly more powerful, operates seamlessly with CIDR notation (`10.0.0.0/8` instead of writing out `netmask 255.0.0.0`), and uses high-speed Netlink sockets, but possesses a slightly different syntactic structure.
- **`netstat -rn`:** Display utility. **Tradeoff:** It displays the exact same routing table as `route -n`, but `netstat` is strictly a read-only reporting tool and cannot add or delete routes.

## How it works internally

The `route` command operates entirely in user-space, acting as a legacy translation wrapper around kernel system calls.

When displaying the routing table (`route -n`), the utility simply opens, reads, and parses the sequential text data presented by the Linux kernel inside the `/proc/net/route` virtual file. It formats this hexadecimal and integer data into the human-readable ASCII table.

When adding or deleting a route (`route add ...`), the command bypasses `/proc`. Instead, it allocates a `rtentry` C structure, populates it with the target IP addresses, netmasks, and gateway data provided via CLI arguments, and opens a standard network socket. It then invokes an `ioctl()` (Input/Output Control) system call (specifically `SIOCADDRT` for add or `SIOCDELRT` for delete) against the socket. The kernel intercepts this `ioctl`, validates the parameters, and immediately patches its internal Forwarding Information Base (FIB) tree in RAM, altering active packet traversal instantly.

## Performance Notes

- **The Reverse-DNS Trap:** Executing `route` without the `-n` (numeric) flag forces the utility to attempt synchronous reverse-DNS lookups on every gateway IP address. If the DNS server is slow or unresponsive, the `route` command will completely hang for minutes. Always use `-n`.
- Because it uses legacy `ioctl` calls, `route` is highly inefficient for programmatic manipulation of thousands of BGP routes compared to the binary Netlink API used by `ip route`.

## Security Notes

- **Root Isolation:** Reading the routing table is unprivileged, but invoking the `ioctl` calls to add or delete routes requires absolute `CAP_NET_ADMIN` privileges (`sudo`). Unauthorized modification of routes allows attackers to intercept or reroute all outbound server traffic (Man-in-the-Middle).

## Common Mistakes

- **Using CIDR notation:** Running `route add -net 10.0.0.0/8 gw 192.168.1.1`. **Why it's wrong:** The legacy `route` command does not natively understand modern CIDR slash notation. It will fail with a syntax error. You must painfully type out `netmask 255.0.0.0`. (This is a primary reason the industry shifted to `ip route`).
- **Losing SSH access via default route deletion:** Running `route del default` while connected remotely via SSH. **Why it's wrong:** The instant you delete the default route, the server loses the ability to send your SSH return packets back across the internet. Your terminal freezes permanently, requiring out-of-band console access to fix.
- **Confusing gateway accessibility:** Specifying a gateway IP that isn't on the same subnet as the physical interface. **Why it's wrong:** The kernel throws a "Network is unreachable" error. A gateway must be physically reachable on a directly connected Layer 2 subnet; you cannot set a gateway across the internet.

## Best Practices

- Phase out the use of `route` completely. Force muscle memory adaptation to `ip route add default via 192.168.1.1`.
- When executing dangerous routing changes on remote servers, prefix the command with a restorative dead-man's switch: `sleep 60 && route add default gw 10.0.0.1 &`. If the subsequent route change breaks your SSH connection, the background timer will trigger and restore the gateway in 60 seconds.

## Interview Questions

- _Query:_ A developer runs the `route` command on a production server. The terminal hangs indefinitely, printing nothing, yet the server is clearly online and functioning. What is the cause of the hang, and how do you fix the command?
  - _A:_ By default, the `route` command attempts to perform reverse-DNS resolution on every IP address in the gateway column to display human-readable hostnames. If the server's configured DNS resolvers are unreachable or misconfigured, the command blocks synchronously waiting for DNS timeouts. You fix it by running `route -n`, which instructs the command to output raw numerical IP addresses instantly.
- _Query:_ Why did the Linux kernel networking community deprecate the `route` and `ifconfig` commands in favor of the `ip` (iproute2) suite?
  - _A:_ The older `net-tools` suite relied heavily on the legacy `ioctl` system call interface, which became architecturally incapable of supporting advanced modern Linux networking features—such as policy-based routing, multiple routing tables, CIDR notation, and network namespaces. The `iproute2` suite was built around high-speed, binary Netlink sockets, providing total programmatic control over the modern networking stack.
- _Query:_ If you type `route add default gw 192.168.1.1 dev eth0` and successfully route traffic, what happens to this configuration when the server reboots?
  - _A:_ The configuration completely vanishes. The `route` command only manipulates the live, volatile RAM state of the kernel's routing table. To make the route persistent across reboots, the configuration must be written to disk using persistent network daemons like NetworkManager, Netplan, or `systemd-networkd`.

## Practice Problems

- _Problem:_ Output the current kernel IP routing table instantly without hanging on hostname resolution.
  - _Hint:_ Use the display command combined with the numeric flag.
  - _Solution:_ `route -n` (This dumps the table securely and quickly by bypassing DNS resolution).
- _Problem:_ Instruct the kernel to route all traffic destined for the `10.50.0.0` network (with a subnet mask of `255.255.255.0`) to a gateway router located at `192.168.1.254`.
  - _Hint:_ Use the add command, explicitly declare the network target, type out the full netmask, and define the gateway.
  - _Solution:_ `route add -net 10.50.0.0 netmask 255.255.255.0 gw 192.168.1.254` (This injects the static path into the kernel FIB).

## References

- [Man Page for route (Linux)](https://man7.org/linux/man-pages/man8/route.8.html)
- [Linux Advanced Routing & Traffic Control HOWTO](https://lartc.org/)
