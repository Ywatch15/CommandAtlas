---
slug: arp
name: arp
aliases: []
category: networking
tags: [linux, networking, mac-address, local-network, troubleshooting]
difficulty: intermediate
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'view mac address cache'
  - 'manipulate arp table'
  - 'find hardware address from ip'
  - 'clear arp cache'
  - 'add static arp entry'
relatedCommands: [ping, ifconfig]
alternatives: []
status: draft
---

## What is it?

`arp` (Address Resolution Protocol) is a legacy command-line utility used to display and manipulate the system's IPv4 network neighbor cache. It allows administrators to view the dynamically resolved mappings between logical Layer 3 IP addresses and physical Layer 2 Media Access Control (MAC) addresses, as well as manually insert, delete, or bind static entries.

## Why does it exist?

For devices on a local subnet to communicate, IP packets must be encapsulated into Ethernet frames addressed to a specific physical hardware MAC address. The OS uses the Address Resolution Protocol to broadcast "Who has IP X?" and caches the resulting MAC address to avoid broadcasting on every packet. `arp` exists to give administrators direct visibility into and control over this kernel-level translation table. This is critical for diagnosing local routing failures, mitigating ARP spoofing attacks, and statically defining endpoints for embedded devices that fail to respond to standard broadcast requests.

## Syntax

```bash
arp [-vn] [-H type] [-i if] -a [hostname]
arp [-v] [-i if] -d hostname [pub]
arp [-v] [-H type] [-i if] -s hostname hw_addr [temp]
```

## Flags

| Flag                 | Description                                                                                                                 | Example                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `-a`, `--display`    | Displays all entries in the current ARP cache, formatted using the default BSD-style layout.                                | `arp -a`                            |
| `-n`, `--numeric`    | Prevents the resolution of IP addresses to hostnames. Dramatically speeds up output on networks with slow DNS.              | `arp -an`                           |
| `-d`, `--delete`     | Deletes a specific entry from the ARP cache, forcing the kernel to re-resolve the MAC address on the next packet.           | `arp -d 192.168.1.50`               |
| `-s`, `--set`        | Creates a static mapping between an IP address and a MAC address. Bypasses dynamic ARP resolution.                          | `arp -s 10.0.0.5 00:11:22:aa:bb:cc` |
| `-i`, `--device`     | Restricts the command output or modification to a specific network interface.                                               | `arp -i eth0 -a`                    |
| `-v`, `--verbose`    | Provides verbose output, detailing exactly what operations the tool is performing under the hood.                           | `arp -v -a`                         |
| `-H`, `--hw-type`    | Specifies the class of hardware address being queried or set. Defaults to `ether` (Ethernet).                               | `arp -H ether -a`                   |
| `-f`, `--file`       | Reads a specific file (defaulting to `/etc/ethers`) containing IP-to-MAC mappings and loads them statically into the cache. | `arp -f /etc/ethers`                |
| `-D`, `--use-device` | Used with `-s`. Sets the hardware address of the static entry to exactly match the MAC of a specified local interface.      | `arp -s 10.0.0.6 -D eth1`           |
| `-e`                 | Formats the output in the default Linux style (with clear columnar headers) rather than the BSD style.                      | `arp -e`                            |

## Examples

```bash
arp -an
```

> The standard diagnostic invocation. Lists the entire ARP cache without attempting reverse-DNS lookups. It shows the IP address, the physical MAC address, the hardware type, and the associated network interface.

```bash
arp -d 10.0.1.25
```

> Purges a stale cache entry. If a physical server at `10.0.1.25` had its motherboard replaced, its MAC address changed. The local host will fail to communicate with it until the old cached MAC mapping expires or is manually deleted using this command.

```bash
arp -s 192.168.1.100 00:1A:2B:3C:4D:5E
```

> Injects a static, permanent ARP entry. The kernel will completely bypass the dynamic ARP broadcast process for `192.168.1.100` and instantly encapsulate packets using the provided MAC address.

```bash
arp -i eth1 -a
```

> Scopes the query to a specific physical or virtual network interface. Highly useful on multi-homed servers acting as routers to isolate neighbor discovery to the internal DMZ interface.

```bash
arp -f /etc/custom_ethers
```

> Automates bulk static bindings. Instead of typing dozens of `arp -s` commands, an administrator populates a text file mapping IPs to MACs and loads it simultaneously, ensuring strict Layer 2 routing topologies.

## Real-World Scenarios

**Mitigating ARP Spoofing Attacks**

```bash
arp -s 10.0.0.1 00:50:56:c0:00:08
```

> In environments vulnerable to man-in-the-middle (MitM) ARP poisoning, an attacker broadcasts forged ARP replies to associate their own MAC address with the subnet's Default Gateway IP. An administrator mitigates this locally by explicitly binding the true gateway's MAC address statically, causing the kernel to ignore the attacker's malicious dynamic broadcasts.

**Wake-on-LAN (WoL) Subnet Broadcasting**

```bash
arp -i eth0 -s 192.168.1.254 FF:FF:FF:FF:FF:FF
```

> When sending Wake-on-LAN magic packets across different subnets, routers often drop standard subnet broadcasts. A network engineer uses `arp` to create a static entry mapping a dummy IP (`192.168.1.254`) to the Layer 2 broadcast MAC. They then target WoL packets to that IP, forcing the local switch to flood the frame to all ports.

## When should it NOT be used?

- **Modern Linux Environments:** **Do not use `arp` if `ip neighbor` is available.** `arp` is part of the deprecated `net-tools` package. It utilizes legacy `ioctl` system calls. The `ip neighbor` (or `ip n`) command from the `iproute2` suite uses the modern, faster, and more robust Netlink socket interface.
- **IPv6 Networks:** **Do not use `arp` for IPv6 troubleshooting.** The ARP protocol is strictly IPv4. IPv6 replaces ARP entirely with the Neighbor Discovery Protocol (NDP), utilizing ICMPv6. To view the IPv6 neighbor cache, you must use `ip -6 neighbor`.

## Alternatives

- **`ip neighbor`:** **The modern standard.** The direct replacement for `arp`. Supports advanced states (STALE, REACHABLE, DELAY) and operates asynchronously via kernel Netlink sockets.
- **`arp-scan`:** **Best for active discovery.** While `arp` reads the passive local cache, `arp-scan` actively transmits ARP request packets to map out every live device on an entire local subnet.

## How it works internally

`arp` acts as a user-space viewer and editor for the Linux kernel's neighbor table.

When you execute `arp -a`, the utility parses the `/proc/net/arp` virtual file. The kernel populates this file by dumping its internal IPv4 neighbor cache structure. The cache is continuously updated by the kernel's networking stack as it processes incoming ARP Reply packets (Ethernet EtherType 0x0806).

When you execute a modification command like `arp -s` (set) or `arp -d` (delete), the utility does not write to `/proc/net/arp` (which is read-only). Instead, it opens an IPv4 Datagram socket (`socket(AF_INET, SOCK_DGRAM, 0)`) and issues a specific `ioctl` system call (`SIOCSARP` for set, `SIOCDARP` for delete) directly to the kernel network driver, passing a C struct (`arpreq`) containing the target IP, MAC, and interface. The kernel interprets this `ioctl` and instantly modifies its live routing memory structures.

## Performance Notes

- **DNS Resolution Hangs:** By default, `arp -a` attempts to reverse-resolve every IP address in the cache via DNS. If you have a large cache and the DNS server is unresponsive or the IPs lack PTR records, the command will hang for minutes. Always use the `-n` flag to bypass DNS completely for instantaneous output.

## Security Notes

- **ARP Cache Poisoning:** The `arp` command only shows what the kernel _believes_ is the truth. The ARP protocol is inherently stateless and unauthenticated. If `arp -a` shows a specific MAC address for your database server, a malicious actor on the same VLAN could have spoofed it. Trusting the ARP cache blindly without static bindings or dynamic ARP inspection (DAI) on the switch level is dangerous.

## Common Mistakes

- **Using `arp` for remote IP resolution**
  - _Mistake:_ Running `arp -a google.com` and getting `no match found`.
  - _Why:_ ARP only resolves MAC addresses for devices on your _local, direct subnet_. For external internet IP addresses, your machine sends the packet to the Default Gateway's MAC address. The MAC address of `google.com` is completely invisible and irrelevant to your local kernel.
- **Assuming deleted entries stay deleted**
  - _Mistake:_ Running `arp -d 10.0.0.5` to block a device from talking to the server.
  - _Why:_ Deleting an ARP entry simply clears the cache. The very next time your server needs to reply to `10.0.0.5`, the kernel will instantly broadcast a new ARP Request, receive the reply, and repopulate the cache. To block a device, use `iptables` or `ufw` to drop the MAC or IP.

## Best Practices

- **Always use `-n`:** Cultivate the habit of typing `arp -an`. Network tools should prioritize speed and raw data over potentially unreliable DNS abstractions.
- **Transition to `ip neighbor`:** Begin refactoring administration scripts to use `ip n show` and `ip n flush`. The `net-tools` package containing `arp` is no longer installed by default on minimal OS images like CentOS 8/9 or Ubuntu 22.04+.

## Interview Questions

**Q: You ping a local server at `192.168.1.50`, but you receive a "Destination Host Unreachable" error. When you run `arp -an`, the entry for `192.168.1.50` shows `<incomplete>` for the MAC address. What does this mean at the protocol level?**
**A:** `<incomplete>` means your OS kernel initiated communication and successfully broadcasted an ARP Request ("Who has 192.168.1.50?") to the local switch, but it never received an ARP Reply containing the target's MAC address. This indicates a Layer 2 connectivity issue: the target machine is powered off, physically disconnected, dropping broadcast traffic via a firewall, or on a different VLAN.

**Q: Explain why the `arp` command cannot be used to find the MAC address of a server located across the internet.**
**A:** MAC addresses are Layer 2 (Data Link Layer) constructs used exclusively for node-to-node delivery on the same physical or virtual broadcast domain. When a packet is destined for the internet, the local OS encapsulates the IP packet in an Ethernet frame addressed to the local router's (Default Gateway's) MAC address. The router strips the frame, routes the IP packet, and creates a new Ethernet frame. Therefore, the original sender's kernel never knows or cares about the destination's ultimate MAC address.

## Practice Problems

**Problem:** You are auditing a server's local connections but the `arp` command is hanging because it is trying to resolve hostnames. Write the command to output the cache instantly, showing only raw IP and MAC addresses.
**Hint:** Use the flag that disables DNS name resolution.
**Solution:**

```bash
arp -an
```

**Problem:** A machine with IP `10.5.5.20` had its network interface card replaced, but your server keeps trying to send data to the old MAC address. Write the command to forcefully remove `10.5.5.20` from the neighbor cache so the kernel resolves the new card.
**Hint:** Use the specific deletion flag.
**Solution:**

```bash
arp -d 10.5.5.20
```

## References

- [arp(8) - Linux man page](https://linux.die.net/man/8/arp)
- [Address Resolution Protocol (RFC 826)](https://datatracker.ietf.org/doc/html/rfc826)
