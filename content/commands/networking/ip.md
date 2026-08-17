---
slug: ip
name: ip
aliases: [ifconfig, route]
category: networking
tags: [linux, networking, routing, interfaces, iproute2]
difficulty: intermediate
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'show ip addresses linux'
  - 'manage routing tables'
  - 'bring network interface up or down'
  - 'view network links and mac addresses'
  - 'manage linux network namespaces'
relatedCommands:
  [
    netstat,
    ss,
    ping,
    iptables,
    mtr,
    ethtool,
    hostname,
    ifconfig,
    iw,
    iwconfig,
    nc,
    nmcli,
    route,
    tcpdump,
    traceroute,
  ]
alternatives: [ifconfig, route, nmcli, ethtool, netstat]
status: draft
---

## What is it?

The `ip` command is the central utility of the `iproute2` package, used to display and manage network interfaces, IP addresses, routing tables, and IPsec tunnels on Linux systems. It serves as the modern, unified replacement for the deprecated `net-tools` suite (which included `ifconfig`, `route`, and `arp`).

## Why does it exist?

Legacy networking utilities like `ifconfig` and `route` relied on the antiquated `ioctl` system calls and could not natively support or display advanced Linux networking features introduced in the 2.2 kernel (such as policy routing, network namespaces, and multiple IP addresses per interface). `ip` exists to provide a comprehensive, extensible interface that communicates natively via Netlink sockets, granting administrators total programmatic control over the modern Linux networking stack.

## Syntax

```bash
ip [OPTIONS] OBJECT { COMMAND | help }
# Objects include: link, addr, route, rule, neigh, netns, maddress, mroute, tunnel
```

## Flags

| Flag                | Description                                                                       | Example                 |
| ------------------- | --------------------------------------------------------------------------------- | ----------------------- |
| `-V`, `-Version`    | Prints the version of the iproute2 utility.                                       | `ip -V`                 |
| `-s`, `-stats`      | Outputs detailed statistics (bytes/packets/errors) for interfaces.                | `ip -s link`            |
| `-c`, `-color`      | Uses colorized output to visually distinguish IP addresses and states.            | `ip -c addr`            |
| `-4`                | Restricts output specifically to IPv4 addressing and routing.                     | `ip -4 route`           |
| `-6`                | Restricts output specifically to IPv6 addressing and routing.                     | `ip -6 addr`            |
| `-br`, `-brief`     | Formats output into a highly readable, single-line-per-interface table.           | `ip -br -c addr`        |
| `-j`, `-json`       | Formats the command output into a structured JSON payload for parsing.            | `ip -j route`           |
| `-o`, `-oneline`    | Flattens multiline output into single lines, escaping newlines, ideal for `grep`. | `ip -o addr             | grep "inet "` |
| `-netns <nsname>`   | Executes the specific `ip` command within the isolated network namespace.         | `ip -netns vpn_ns addr` |
| `-ts`, `-timestamp` | Prepends a timestamp to each line of monitor output.                              | `ip -ts monitor route`  |

## Examples

```bash
ip addr show
```

> This lists all network interfaces attached to the system along with their configured IPv4 and IPv6 addresses, MAC addresses, and current administrative states (UP/DOWN).

```bash
ip -br -c link show
```

> This outputs a colorized, tightly formatted tabular summary of all network links (interfaces), showing just their names, operational states, and MAC addresses without the verbose protocol clutter.

```bash
ip route add default via 192.168.1.1 dev eth0
```

> This modifies the kernel routing table by adding a new default gateway routing path, instructing the system to send all unresolved external traffic out through the `eth0` interface to the router at `192.168.1.1`.

```bash
ip link set dev wlan0 down
```

> This explicitly alters the operational state of a network interface, immediately dropping the link state of `wlan0` and halting all traffic traversing that wireless adapter.

```bash
ip neigh show
```

> This queries the neighbor cache (the modern equivalent of the ARP table), displaying the mapped IP-to-MAC address relationships for directly connected devices on the local subnet.

## Real-World Scenarios

**Identifying Active Server IP Assignments**

```bash
ip -o -4 addr show eth0 | awk '{print $4}'
```

> Automation scripts and configuration managers (like Ansible) use the oneline (`-o`) and IPv4 (`-4`) flags to safely slice the exact IP address and CIDR subnet mask of the primary network interface for injecting into configuration templates.

**Diagnosing Routing Asymmetry**

```bash
ip route get 8.8.8.8
```

> Network engineers troubleshooting reachability issues simulate a routing decision. This queries the kernel's routing tree and outputs exactly which interface, source IP, and gateway the kernel will select to reach the target IP `8.8.8.8`.

**Managing Docker / Kubernetes Network Namespaces**

```bash
ip netns exec container_ns ip addr
```

> Systems operators debugging complex container network overlays (like Calico or Flannel) use `ip netns exec` to penetrate an isolated container network namespace and run diagnostic commands exactly as if they were inside the container itself.

## When should it NOT be used?

- **Persistent Network Configuration:** **Reason:** Commands issued via `ip` modify the live kernel RAM state ephemerally; changes vanish on reboot. **Use instead:** NetworkManager (`nmcli`), Netplan, or `systemd-networkd` configuration files.
- **Testing TCP/UDP port reachability:** **Reason:** The `ip` command operates at Layers 2 (Link) and 3 (Network) of the OSI model. It cannot test Layer 4 transport sockets. **Use instead:** `nc`, `telnet`, or `nmap`.

## Alternatives

- **`ifconfig` / `route`:** The deprecated legacy tools. **Tradeoff:** They are universally known but lack modern capabilities (like managing multiple IPs on a single interface or policy routing) and suffer from parsing inconsistencies across UNIX flavors.
- **`nmcli`:** NetworkManager command-line tool. **Tradeoff:** `nmcli` creates persistent network configurations stored on disk, whereas `ip` executes instant, ephemeral, low-level kernel manipulations.

## How it works internally

Unlike legacy `net-tools` that parse the text files in `/proc/net/` and use `ioctl()` system calls, the `ip` command communicates with the Linux kernel using **Netlink sockets** (specifically `rtnetlink`).

Netlink is a socket-based IPC (Inter-Process Communication) mechanism designed specifically for networking. When you run `ip addr`, the CLI opens a netlink socket and sends a binary request payload (`RTM_GETADDR`) directly to the kernel networking stack. The kernel responds with a structured binary payload containing the interface data. `iproute2` parses this binary data and formats it for standard output.

This architecture allows `ip` to be highly performant, completely async, and inherently capable of utilizing the `ip monitor` command to subscribe to a continuous stream of real-time kernel routing events without polling.

## Performance Notes

- Because `ip` uses Netlink socket binary messaging rather than string-parsing `/proc` files, it is highly optimized and introduces practically zero overhead even when parsing routing tables with hundreds of thousands of BGP entries.
- Formatting outputs using `-j` (JSON) offloads parsing complexity to the C binary, making bash/python automation scripts incredibly resilient compared to traditional `awk`/`grep` text scraping.

## Security Notes

- **Privilege Constraints:** While any user can execute `ip addr show` to view interfaces, modifying the network state (`ip addr add`, `ip link set`, `ip route add`) requires the `CAP_NET_ADMIN` Linux capability, meaning commands must be executed via `sudo` or as the `root` user.
- **Spoofing and Disruption:** An attacker with `root` privileges can trivially use `ip route` to reroute all outgoing traffic to a malicious proxy, or use `ip neigh` to manipulate ARP tables (ARP poisoning), intercepting sensitive local traffic.

## Common Mistakes

- **Assuming `ip addr add` replaces IPs:** Running `ip addr add 10.0.0.5/24 dev eth0`. **Why it's wrong:** Linux supports multiple IPs per interface. This _adds_ a secondary IP. To change the IP, you must first `ip addr del` the old one, or use `ip addr flush dev eth0` to clear the interface completely.
- **Forgetting the CIDR mask:** Running `ip addr add 192.168.1.10 dev eth0`. **Why it's wrong:** Omitting the subnet mask defaults to a `/32` host route. The interface will not know how to reach the rest of the `/24` subnet. You must specify `192.168.1.10/24`.
- **Confusing interface state with link state:** The interface shows `UP` but the link shows `NO-CARRIER`. **Why it's wrong:** `UP` means the admin turned the software interface on. `NO-CARRIER` means the physical cable is unplugged or the switch port is dead. Both must be healthy for traffic to flow.

## Best Practices

- When writing bash scripts for dynamic infrastructure, unconditionally use `ip -j` to output JSON and pipe it into `jq`. This guarantees your script won't break when a new interface type adds an unexpected text column in future kernel versions.
- Before dropping complex routes or flushing addresses over SSH, prefix your command with `sleep 60 && ip route add default... &` to create a dead-man's switch, preventing you from permanently locking yourself out of a remote server.
- Adopt `ip -br -c a` as your default muscle memory alternative to `ifconfig`; the brief tabular output is vastly superior for rapidly assessing multi-interface servers.

## Interview Questions

- _Query:_ What is the underlying architectural difference between how `ifconfig` gathers data versus how the `ip` command retrieves network information?
  - _A:_ `ifconfig` relies on legacy `ioctl()` system calls and parses text files in `/proc/net/`. The `ip` command communicates synchronously and asynchronously with the kernel using modern `rtnetlink` (Netlink) sockets, allowing it to send and receive structured binary payloads, significantly enhancing performance and feature support.
- _Query:_ You have multiple IP addresses assigned to `eth0`. How do you completely remove all IP assignments from that specific interface in a single command without rebooting?
  - _A:_ You use the address flush command: `ip addr flush dev eth0`. This instantly strips all IPv4 and IPv6 addresses attached to the device without bringing the administrative link state down.
- _Query:_ How do you use the `ip` command to determine the exact path a packet will take to reach an external destination, e.g., `8.8.8.8`?
  - _A:_ By utilizing the `ip route get 8.8.8.8` command. This forces the kernel to evaluate its active routing tables, policy routing rules, and metrics, outputting the exact interface, gateway, and source IP address it will utilize to send the packet.

## Practice Problems

- _Problem:_ Bring the `eth1` network interface administratively up, and assign it the IP address `10.10.10.50` with a standard `/24` subnet mask.
  - _Hint:_ This requires two distinct `ip` commands: one modifying the link, and one modifying the addr.
  - _Solution:_ `ip link set dev eth1 up && ip addr add 10.10.10.50/24 dev eth1`
- _Problem:_ Query the routing table and format the output entirely in JSON to facilitate script parsing.
  - _Hint:_ Combine the route object query with the JSON formatting flag.
  - _Solution:_ `ip -j route show` (This retrieves the entire routing tree and serializes it into programmable JSON).

## References

- [Man Page for ip (Linux)](https://man7.org/linux/man-pages/man8/ip.8.html)
- [Linux Advanced Routing & Traffic Control HOWTO](https://lartc.org/)
