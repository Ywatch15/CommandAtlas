---
slug: tcpdump
name: tcpdump
aliases: []
category: networking
tags: [linux, networking, packet-capture, pcap, troubleshooting, security]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'capture network traffic'
  - 'sniff packets on interface'
  - 'troubleshoot dropped packets'
  - 'dump network traffic to pcap'
  - 'filter network traffic by port'
relatedCommands: [ip, ping, netstat]
alternatives: []
status: draft
---

## What is it?

`tcpdump` is a powerful, ubiquitous command-line packet analyzer. It intercepts and displays TCP/IP and other packets being transmitted or received over a network to which the computer is attached. It allows administrators to inspect live network traffic, filter specific protocols, and save binary packet captures for offline analysis in graphical tools.

## Why does it exist?

Diagnosing complex networking issues—such as asymmetrical routing, dropped TCP handshakes, or unencrypted credential leakage—is impossible using high-level tools like `ping` or `curl`. Graphical packet analyzers like Wireshark require a desktop environment, rendering them useless on headless Linux servers in the cloud. `tcpdump` exists to provide absolute, byte-level visibility into the network stack directly from a standard terminal. By leveraging the `libpcap` library, it securely taps into the kernel's networking interface to extract raw frames before they are fully processed by the OS network stack.

## Syntax

```bash
tcpdump [options] [expression]
```

## Flags

| Flag                | Description                                                                                                                                                | Example                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `-i <interface>`    | Specifies the network interface to listen on (e.g., `eth0`, `any`). `any` captures from all active interfaces.                                             | `tcpdump -i eth0`           |
| `-n`                | Disables DNS name resolution. Forces `tcpdump` to display raw IP addresses. Drastically improves capture speed.                                            | `tcpdump -n`                |
| `-nn`               | Disables both DNS resolution and port name resolution (shows `80` instead of `http`).                                                                      | `tcpdump -nn`               |
| `-X`                | Prints the contents of each packet in both hexadecimal and ASCII formats. Crucial for reading plaintext payloads.                                          | `tcpdump -X port 80`        |
| `-A`                | Prints each packet in pure ASCII. Useful for reading web requests or cleartext application protocols.                                                      | `tcpdump -A port 8080`      |
| `-w <file>`         | Writes the raw, unparsed packets to a binary PCAP (Packet Capture) file instead of printing them to the terminal.                                          | `tcpdump -w capture.pcap`   |
| `-r <file>`         | Reads and parses packets from a previously saved PCAP file rather than capturing live traffic.                                                             | `tcpdump -r capture.pcap`   |
| `-c <count>`        | Exits `tcpdump` automatically after receiving the specified number of packets.                                                                             | `tcpdump -c 100`            |
| `-v`, `-vv`, `-vvv` | Increases output verbosity, displaying TTL, IP ID, total length, and deep protocol-specific information.                                                   | `tcpdump -vv`               |
| `-s <snaplen>`      | Defines the snapshot length (bytes captured per packet). Defaults to 262144 bytes in modern versions. Use `-s 0` to capture full packets on older systems. | `tcpdump -s 0 -w full.pcap` |

## Examples

```bash
tcpdump -i any port 443
```

> Captures all traffic flowing through any interface on the server where the source or destination port is 443 (HTTPS). This is a standard initial diagnostic to verify if encrypted web traffic is reaching the server.

```bash
tcpdump -nn -i eth0 host 10.0.1.50
```

> Filters the capture to show only traffic originating from or destined to the IP address `10.0.1.50`. The `-nn` flag ensures IP addresses and ports are not resolved to names, preventing DNS timeouts from delaying the terminal output.

```bash
tcpdump -nn -X icmp
```

> Captures all ICMP (ping) traffic and outputs the packet contents in both hex and ASCII (`-X`). This allows engineers to inspect the exact data payload embedded inside the ping request.

```bash
tcpdump -i eth0 -w /tmp/db_traffic.pcap port 5432
```

> Performs a headless packet capture for a PostgreSQL database. Instead of flooding the terminal, the raw binary packets are written efficiently to `db_traffic.pcap`, which can later be downloaded via `scp` and opened in Wireshark for deep graphical analysis.

```bash
tcpdump -nn 'src 192.168.1.100 and dst port 80'
```

> Demonstrates the BPF (Berkeley Packet Filter) syntax. It utilizes boolean logic (`and`) to capture strictly HTTP traffic originating from a specific internal IP address. Note the use of single quotes to prevent the shell from misinterpreting the expression.

## Real-World Scenarios

**Diagnosing Asymmetric Routing**

```bash
tcpdump -nni eth1 icmp
```

> A system administrator pings a remote host but receives no response. By running `tcpdump` on the external interface, they observe `ICMP echo request` packets leaving the server, but absolutely zero `ICMP echo reply` packets returning. This definitively proves the issue is upstream (a firewall or asymmetrical routing path dropping the return packet), exonerating the local Linux server's configuration.

**Isolating TCP Handshake Failures**

```bash
tcpdump -nni eth0 "tcp[tcpflags] & (tcp-syn|tcp-ack) != 0"
```

> When application teams complain about random connection drops, a network engineer uses this advanced BPF byte-offset filter to capture _only_ the SYN and ACK packets of the TCP 3-way handshake. This isolates connection initialization requests from the noise of massive data-transfer payloads, making it easy to spot unacknowledged SYN packets.

## When should it NOT be used?

- **Encrypted Payload Inspection:** **Do not use `tcpdump` expecting to read HTTPS/TLS data.** `tcpdump` sits at the network layer. It can capture the encrypted ciphertext, but it cannot decrypt TLS payloads. To view encrypted application data, use a proxy like `mitmproxy` or configure the application to log its TLS session keys (e.g., `SSLKEYLOGFILE`).
- **High-Throughput 10G/40G Networks:** **Do not run `tcpdump` without strict filters on heavy pipes.** Capturing millions of packets per second and writing them to the terminal or disk will bottleneck the CPU, drop packets, and potentially impact the performance of the production application.
- **Application-Level Tracing:** If you want to see exactly what SQL query an application is making, parsing a PCAP is tedious. Use APM tracing, database query logs, or `strace` instead.

## Alternatives

- **`tshark`:** **Best for deep protocol decoding.** The command-line equivalent of Wireshark. It is heavier than `tcpdump` but can decode complex protocols (like dissecting exact HTTP/2 headers or SQL queries) out of the box.
- **`wireshark`:** **Best for visual analysis.** The graphical counterpart. Often, engineers run `tcpdump -w` on the server and open the resulting file in Wireshark on their laptop.
- **`ngrep`:** **Best for text payload searching.** Applies `grep`-like regex capabilities directly to network payloads, making it easier to find specific strings in plaintext network streams.

## How it works internally

`tcpdump` relies entirely on `libpcap` (Packet Capture library), which interacts deeply with the Linux kernel's networking stack.

When you execute `tcpdump`, it creates a raw network socket using the `PF_PACKET` family. This socket is bound to the target network interface, instructing the Network Interface Card (NIC) driver to place the interface into "promiscuous mode." In this mode, the NIC stops filtering packets by destination MAC address and forwards every single frame it sees on the wire up to the kernel.

To prevent the user-space `tcpdump` process from being overwhelmed by gigabytes of irrelevant traffic, the BPF (Berkeley Packet Filter) expression (e.g., `port 80`) is parsed and compiled into a highly optimized, specialized virtual machine bytecode. This bytecode is injected directly into the Linux kernel.

The kernel intercepts packets _before_ they traverse the heavy IP/TCP filtering stacks (like `iptables`/`netfilter`). It evaluates each packet against the injected BPF bytecode. If the packet matches the filter, it is copied into a shared memory buffer accessible by the user-space `tcpdump` process, which then formats it for the terminal or writes it to a `.pcap` file. Unmatched packets are ignored by `libpcap` but continue their normal journey through the OS.

## Performance Notes

- **DNS Resolution Hangs:** The absolute biggest performance killer for `tcpdump` is reverse-DNS resolution. If `tcpdump` attempts to reverse-resolve a high volume of IP addresses to hostnames via a slow DNS server, the internal buffer fills up, and the kernel begins actively dropping captured packets. Always use `-n` or `-nn` in production.
- **Snaplen Optimization:** When you only care about routing headers (e.g., IP addresses and ports), you don't need the 1500-byte data payload. By setting a small snapshot length (`-s 96`), `tcpdump` truncates the packet, saving enormous amounts of disk space and CPU when writing massive captures.

## Security Notes

- **Privileged Execution:** Placing a network card into promiscuous mode and opening raw sockets requires `CAP_NET_RAW` and `CAP_NET_ADMIN` capabilities. Therefore, `tcpdump` must strictly be run as `root` (or via `sudo`).
- **Sensitive Data Exposure:** `tcpdump` captures everything. If users are authenticating to an FTP server or a legacy HTTP site, their usernames, passwords, and session cookies are captured in plaintext. Capturing traffic in a compliant environment (PCI-DSS, HIPAA) must be heavily audited.

## Common Mistakes

- **Misinterpreting "Packets Dropped by Kernel"**
  - _Mistake:_ Seeing `4025 packets dropped by kernel` at the end of a trace and assuming the server's network is failing.
  - _Why:_ This metric doesn't mean the server failed to process the traffic. It means the `tcpdump` user-space application could not read from the `libpcap` ring buffer fast enough, so the kernel had to discard captured packets to free memory. To fix this, use more restrictive BPF filters or write directly to a file (`-w`).
- **Using `grep` with `tcpdump`**
  - _Mistake:_ Running `tcpdump -i eth0 | grep "10.0.0.5"`.
  - _Why:_ Because `tcpdump` buffers output, `grep` will often display nothing until a massive chunk of data is captured. Furthermore, filtering via `grep` forces the kernel to copy _all_ packets to user-space, wasting massive CPU. Always use native BPF filters (`tcpdump host 10.0.0.5`) to filter traffic at the kernel level.

## Best Practices

- **Always write to a file for complex issues:** The terminal scrolls too fast to debug a TCP handshake. Use `tcpdump -w trace.pcap -i any -n host x.x.x.x`, reproduce the issue, stop the capture, and analyze it comfortably in Wireshark.
- **Rotate packet captures:** If leaving `tcpdump` running indefinitely to catch a rare bug, use the `-W` (file limit) and `-C` (file size) flags (e.g., `tcpdump -C 100 -W 5 -w trace.pcap`) to implement a rolling packet capture that never exceeds 500MB of disk space.

## Interview Questions

**Q: You need to capture traffic between your server and a specific database. However, you only want to see packets that have the SYN flag set (indicating new connection attempts). How do you instruct `tcpdump` to only show SYN packets?**
**A:** You must use advanced BPF syntax to inspect the TCP header bytes. The command is `tcpdump "tcp[tcpflags] & tcp-syn != 0"`. This performs a bitwise AND operation on the TCP flags byte, filtering out any packet where the SYN bit is not set.

**Q: Explain the architectural difference between filtering packets with `tcpdump port 80` versus running `tcpdump | grep "port 80"`.**
**A:** `tcpdump port 80` compiles a Berkeley Packet Filter (BPF) program and injects it directly into the kernel. The kernel performs the filtering and only copies matching packets to user-space memory, which is highly efficient. `tcpdump | grep "port 80"` forces the kernel to copy _every single packet_ on the interface to user-space, where it is formatted as text and piped to `grep`. This consumes massive amounts of CPU and memory and will cause `libpcap` to drop packets on busy networks.

## Practice Problems

**Problem:** You are connected to a web server. You want to see the plaintext HTTP headers of all traffic coming into port 80 on the `eth1` interface, but you don't want the command to stall trying to resolve IP addresses to hostnames.
**Hint:** Combine the flags for ASCII output, no DNS resolution, interface selection, and the BPF port filter.
**Solution:**

```bash
tcpdump -i eth1 -n -A port 80
```

**Problem:** You want to capture exactly 500 packets going to or coming from the IP address `10.5.5.20`, and you want to save these raw packets to a file named `investigation.pcap` in the `/tmp` directory.
**Hint:** Use the count flag, the write-to-file flag, and the host BPF filter.
**Solution:**

```bash
tcpdump -c 500 -w /tmp/investigation.pcap host 10.5.5.20
```

## References

- [tcpdump(8) - Linux man page](https://linux.die.net/man/8/tcpdump)
- [pcap-filter(7) - Packet Filter Syntax](https://linux.die.net/man/7/pcap-filter)
- [Tcpdump Official Documentation](https://www.tcpdump.org/)
