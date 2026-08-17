---
slug: ifconfig
name: ifconfig
aliases: [interface configuration]
category: networking
tags: [linux, networking, interfaces, ip-address, legacy]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'show ip address'
  - 'configure network interface'
  - 'view mac address'
  - 'bring interface up or down'
  - 'check network traffic statistics'
relatedCommands: [ip, route, netstat, ethtool, arp, hostname, iwconfig]
alternatives: [ip]
status: draft
---

## What is it?

`ifconfig` (interface configuration) is a legacy command-line utility used to display, configure, and manage network interfaces on Unix-like operating systems. It was historically the absolute standard for assigning IP addresses, defining netmasks, configuring broadcast addresses, enabling promiscuous mode, and bringing physical or virtual network cards up and down dynamically.

## Why does it exist?

Before the advent of complex, multi-homed routing topologies and the modern `iproute2` suite, network interfaces required a simple, singular mechanism to bind IP addresses to physical hardware. `ifconfig` exists as a user-space frontend to interact with the kernel's network socket `ioctl` calls. While largely deprecated in modern Linux (in favor of the `ip` command) because it struggles with advanced features like Multiple IP addresses per interface (without using aliasing hacks) and Policy-Based Routing, `ifconfig` remains heavily embedded in muscle memory, legacy scripts, and non-Linux UNIX systems (like macOS and FreeBSD).

## Syntax

```bash
ifconfig [-a] [-v] [interface]
ifconfig interface [aftype] options | address ...
```

## Flags

| Flag / Option       | Description                                                                                                                | Example                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `-a`                | Displays information for all network interfaces, including those that are currently powered off (`DOWN`).                  | `ifconfig -a`                                      |
| `up`                | Activates (powers on) the specified network interface, allowing it to transmit and receive data.                           | `ifconfig eth0 up`                                 |
| `down`              | Deactivates (powers off) the specified network interface, dropping all active connections immediately.                     | `ifconfig eth0 down`                               |
| `netmask <addr>`    | Assigns an explicit subnet mask to the interface when binding an IP address.                                               | `ifconfig eth0 192.168.1.50 netmask 255.255.255.0` |
| `broadcast <addr>`  | Sets the broadcast address for the interface. Usually calculated automatically based on the IP and netmask.                | `ifconfig eth0 broadcast 192.168.1.255`            |
| `mtu <N>`           | Changes the Maximum Transmission Unit (MTU), adjusting the maximum size of packets the interface can handle.               | `ifconfig eth0 mtu 9000`                           |
| `promisc`           | Enables promiscuous mode. The interface will receive all packets on the wire, even those destined for other MAC addresses. | `ifconfig eth0 promisc`                            |
| `-promisc`          | Disables promiscuous mode on the interface.                                                                                | `ifconfig eth0 -promisc`                           |
| `hw <class> <addr>` | Alters the hardware MAC address of the interface (MAC spoofing).                                                           | `ifconfig eth0 hw ether 00:11:22:33:44:55`         |

## Examples

```bash
ifconfig
```

> The universal muscle-memory invocation. It queries the kernel and prints a detailed block for every _active_ network interface. The output displays the assigned IPv4/IPv6 addresses, the MAC address (`ether`), the MTU, and critical hardware telemetry including total RX/TX bytes transferred, dropped packets, and collision errors.

```bash
ifconfig -a
```

> Bypasses the default filter to show all interfaces. Crucial for troubleshooting. If a network card was physically detected by the kernel but never brought "up" by the networking daemon, it will be invisible to a standard `ifconfig`, but revealed explicitly by `ifconfig -a`.

```bash
sudo ifconfig eth0 10.0.0.15 netmask 255.255.255.0 up
```

> The legacy imperative configuration pattern. This single command binds a static IP address (`10.0.0.15`) and a /24 subnet mask to the `eth0` interface, and immediately transitions the interface to the `UP` state to begin accepting traffic.

```bash
sudo ifconfig eth0:0 192.168.1.200 up
```

> Configures an "IP Alias". Because `ifconfig` historically struggled to assign multiple distinct IP addresses to a single physical interface natively, administrators used this colon-syntax workaround to create a virtual secondary interface (`eth0:0`) bridging a second IP to the physical card.

```bash
sudo ifconfig enp3s0 mtu 1500
```

> Modifies the Maximum Transmission Unit. An administrator uses this to troubleshoot path MTU discovery issues, downgrading jumbo frames (9000) back to standard Ethernet frames (1500) to prevent packet fragmentation over external VPN tunnels.

## Real-World Scenarios

**Instant Network Reboots**

```bash
sudo ifconfig wlan0 down && sudo ifconfig wlan0 up
```

> When a Wi-Fi driver hangs or a DHCP lease gets irrecoverably stuck, toggling the interface down and up forces the kernel to flush the interface state, clear hardware buffers, and forces external daemons (like `dhclient` or `wpa_supplicant`) to renegotiate connections from scratch.

**Network Sniffing Preparation**

```bash
sudo ifconfig eth1 promisc
tcpdump -i eth1 -n
```

> Before capturing packets traversing a mirrored switch port (SPAN port) using `tcpdump` or Wireshark, the interface must be placed in promiscuous mode. Without this, the physical Network Interface Card will aggressively drop all packets that do not explicitly match its own hardcoded MAC address, blinding the packet sniffer.

## When should it NOT be used?

- **Modern Linux Environments:** **Avoid `ifconfig` on modern systems.** `ifconfig` relies on the deprecated `net-tools` package, which has not seen meaningful architectural updates in decades. It cannot properly display advanced routing structures, policy routing, or multiple native IPs on a single interface. The modern standard is `ip addr` and `ip link` from the `iproute2` package.
- **Persistent Configuration:** **Do not use `ifconfig` in startup scripts to configure IPs permanently.** `ifconfig` only alters live kernel memory. When the system reboots, the IP assignment vanishes. You must write configurations to `/etc/network/interfaces`, `/etc/sysconfig/network-scripts/`, or use `NetworkManager` for persistence.

## Alternatives

- **`ip addr show` / `ip a`:** **The definitive modern standard.** Native to the `iproute2` suite. It uses Netlink sockets to communicate with the kernel, supporting advanced networking features completely invisible to `ifconfig`.
- **`ip link set <dev> up`:** **The modern interface toggle.** Replaces `ifconfig eth0 up`.

## How it works internally

Unlike modern tools that use highly efficient Netlink sockets to communicate with the kernel networking stack asynchronously, `ifconfig` relies on the legacy `ioctl` (Input/Output Control) system calls.

When you run `ifconfig`, the tool opens a dummy UDP socket (`socket(AF_INET, SOCK_DGRAM, IPPROTO_IP)`). It then populates an `ifreq` C structure and issues a series of `ioctl` calls using this socket file descriptor. For example, it calls `SIOCGIFCONF` to get the list of active interfaces, `SIOCGIFADDR` to retrieve the IP address, and `SIOCGIFHWADDR` to retrieve the MAC address.

When you issue a command to change a configuration (e.g., `ifconfig eth0 up`), it issues `SIOCSIFFLAGS` (Set Interface Flags), flipping the `IFF_UP` and `IFF_RUNNING` bitmasks in the kernel's network interface representation. The kernel immediately processes this flag change, triggering the specific hardware driver (e.g., `ixgbe`) to physically power on the laser or copper PHY transceiver on the PCIe card.

## Performance Notes

- **Truncation Issues:** Because `ifconfig` uses fixed-size memory buffers defined by legacy `ioctl` structs, it can sometimes truncate massive interface names or fail to display thousands of virtual interfaces correctly on heavy container hosts.

## Security Notes

- **MAC Spoofing (`hw ether`):** The ability to change the MAC address via `ifconfig eth0 hw ether` is a double-edged sword. It is useful for bypassing restrictive captive portals in hotels, but is heavily utilized by attackers to impersonate authorized hardware on secure corporate networks. Many enterprise switches use Port Security features to actively disable switch ports if they detect MAC address alterations originating from a server.
- **Promiscuous Mode:** Placing an interface into `promisc` mode forces the CPU to process every single packet traversing the physical wire, potentially exposing cleartext passwords or sensitive traffic originating from other machines.

## Common Mistakes

- **Writing scripts based on `ifconfig` output formatting**
  - _Mistake:_ Using `ifconfig eth0 | grep "inet addr" | awk '{print $2}'` to extract an IP address.
  - _Why:_ The text formatting of `ifconfig` output is highly brittle and differs drastically between Linux, macOS, and FreeBSD. An update or a different OS will instantly break the script. Use `ip -j addr` to parse robust JSON, or `hostname -I`.
- **Assuming multiple IPs will be visible**
  - _Mistake:_ You assign multiple IP addresses to `eth0` using the modern `ip addr add` command. You run `ifconfig` to verify, but it only shows one IP.
  - _Why:_ The legacy `ioctl` interface used by `ifconfig` strictly supports a 1:1 mapping between an interface name and an IP. It physically cannot retrieve or display secondary IP addresses unless they were created using legacy `eth0:0` alias labels.

## Best Practices

- **Unlearn `ifconfig`:** Actively train yourself to type `ip a` instead of `ifconfig`. Many modern minimal Docker containers and slim Linux distributions (like CentOS 8+) do not even have the `net-tools` package installed by default, rendering `ifconfig` completely unavailable out of the box.

## Interview Questions

**Q: You log into a Linux server and run `ifconfig`. The output shows the `lo` (loopback) interface, but your physical network card `eth0` is missing entirely. However, when you run `lspci`, you clearly see the network hardware is attached. What command should you run to determine if the interface actually exists in the OS?**
**A:** You should run `ifconfig -a`. The default `ifconfig` command filters its output to only show interfaces that are currently in the `UP` (powered on) state. If the interface is administratively `DOWN`, it is hidden. The `-a` flag forces it to show all interfaces, revealing if the OS detects the hardware but hasn't activated it.

**Q: Explain why `ifconfig` is considered obsolete and has been replaced by the `ip` command on modern Linux distributions.**
**A:** `ifconfig` relies on the legacy `ioctl` system call interface, which is fundamentally limited. It lacks support for modern networking features like multiple primary IP addresses per interface (without using deprecated alias labels), policy-based routing, network namespaces, and traffic control. The modern `iproute2` suite (containing the `ip` command) uses the advanced Netlink socket architecture, providing a significantly faster and deeply comprehensive API to the Linux kernel networking stack.

## Practice Problems

**Problem:** You are diagnosing a network issue and need to completely disable the `ens33` network interface temporarily to drop all traffic. Write the command to administratively take the interface down.
**Hint:** Provide the interface name followed by the desired power state.
**Solution:**

```bash
sudo ifconfig ens33 down
```

**Problem:** You are setting up a local testing environment. You need to assign the IP address `10.5.5.10` with a subnet mask of `255.255.0.0` to the `eth1` interface using the legacy syntax.
**Hint:** Pass the interface, the IP, and explicitly define the `netmask` flag.
**Solution:**

```bash
sudo ifconfig eth1 10.5.5.10 netmask 255.255.0.0
```

## References

- [ifconfig(8) - Linux man page](https://linux.die.net/man/8/ifconfig)
- [Deprecation of net-tools](https://dougvitale.wordpress.com/2011/12/21/deprecated-linux-networking-commands-and-their-replacements/)
