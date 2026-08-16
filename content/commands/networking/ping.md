---
slug: ping
name: ping
aliases: []
category: networking
tags: [networking, diagnostics, icmp, latency, connectivity]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'test internet connection ping'
  - 'check host reachability'
  - 'measure network latency'
  - 'find packet loss percentage'
  - 'test MTU fragmentation ping'
relatedCommands: [mtr, traceroute, nc, nmap, ip]
alternatives: [mtr]
status: draft
---

## What is it?

`ping` is a ubiquitous computer network administration utility used to test the reachability of a host on an Internet Protocol (IP) network. Operating at Layer 3 (Network Layer), it transmits ICMP (Internet Control Message Protocol) Echo Request packets to a target and waits for an ICMP Echo Reply, measuring round-trip transit time and logging dropped packets.

## Why does it exist?

Network engineers needed a dead-simple, universally implemented protocol to verify basic connectivity between two nodes without relying on complex, application-specific transport layers (like TCP or UDP ports). Named after the sound of active sonar, `ping` exists to provide instant binary feedback—"Is this machine accessible on the network?"—while calculating statistical metrics for latency jitter and network congestion.

## Syntax

```bash
ping [OPTIONS] destination
```

## Flags

| Flag             | Description                                                                                          | Example                   |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------- |
| `-c <count>`     | Stops after sending the exact specified number of Echo Request packets.                              | `ping -c 4 google.com`    |
| `-i <interval>`  | Sets the wait time in seconds between sending each packet (default is 1s).                           | `ping -i 0.5 10.0.0.1`    |
| `-w <deadline>`  | Sets an absolute maximum timeout (in seconds) for the entire ping command to execute before exiting. | `ping -w 10 target.com`   |
| `-W <timeout>`   | Sets the maximum time (in seconds) to wait for a response to an individual packet.                   | `ping -W 2 192.168.1.1`   |
| `-s <size>`      | Sets the payload size of the data bytes sent in the packet (default 56 bytes).                       | `ping -s 1500 target.net` |
| `-f`             | "Flood ping". Outputs packets as fast as they come back or up to 100 times a second.                 | `ping -f 10.0.0.5`        |
| `-A`             | Adaptive ping. Automatically adjusts interval to match network round-trip time.                      | `ping -A 8.8.8.8`         |
| `-D`             | Prints the UNIX timestamp (seconds and microseconds) before each line.                               | `ping -D target.com`      |
| `-I <interface>` | Sets source address to specified interface or IP address.                                            | `ping -I eth1 8.8.8.8`    |
| `-q`             | Quiet output. Displays nothing except the final summary statistics at termination.                   | `ping -c 10 -q 1.1.1.1`   |
| `-M <strategy>`  | Selects Path MTU Discovery strategy (`do`, `want`, `dont`).                                          | `ping -M do -s 1472 host` |
| `-4` / `-6`      | Forces IPv4 (`-4`) or IPv6 (`-6`) name resolution and packet transmission.                           | `ping -6 google.com`      |

## Examples

```bash
ping -c 4 8.8.8.8
```

> This initiates a standard connectivity test against Google's public DNS server. The `-c 4` flag limits the execution to exactly four packet exchanges, printing the summary statistics and cleanly returning control to the terminal (mimicking default Windows behavior).

```bash
ping -i 0.2 -D 10.0.0.5
```

> This fires rapid packets every 200 milliseconds (`-i 0.2`) and prepends a raw UNIX timestamp (`-D`) to every output line. Network engineers use this aggressive frequency to pinpoint the exact microsecond an intermittent network drop occurs.

```bash
ping -I 192.168.2.100 target.com
```

> When operating on a server with multiple network interfaces or VPN connections, the `-I` flag explicitly forces the kernel to originate the ICMP traffic from the IP address `192.168.2.100`, verifying correct routing table configurations.

```bash
sudo ping -f 10.10.10.50
```

> This executes a Flood Ping (`-f`). It shoots thousands of packets per second without waiting, printing a dot `.` when sent and a backspace when received. A rapidly growing line of dots indicates catastrophic packet loss or severe remote bottlenecking.

```bash
ping -M do -s 1472 1.1.1.1
```

> This performs Path MTU (Maximum Transmission Unit) discovery. It sets the packet payload to 1472 bytes and strictly disables fragmentation (`-M do`). If a router on the path has an MTU lower than 1500 (1472 payload + 28 bytes header), it drops the packet and `ping` reports "Frag needed and DF set".

## Real-World Scenarios

**Validating CI/CD Build Runner Egress**

```bash
ping -c 1 -w 3 registry.hub.docker.com || exit 1
```

> Automation scripts executing on ephemeral cloud runners utilize a single-packet ping with a hard 3-second deadline to assert that outbound internet gateways and NAT routing are fully initialized before attempting to download massive software dependencies.

**Monitoring VPN Connection Stability**

```bash
ping -A -q -c 100 10.8.0.1
```

> Administrators assessing the quality of a shaky WireGuard or OpenVPN tunnel run an adaptive, quiet 100-packet volley. The output suppresses terminal spam and immediately reports the statistical Standard Deviation (`mdev`) of the latency, highlighting severe connection jitter.

## When should it NOT be used?

- **Checking if an application (web/database) is functioning:** **Reason:** `ping` only proves that the kernel's network stack is alive. A server can respond perfectly to pings while Apache is completely crashed and port 80 is closed. **Use instead:** `nc -vz <ip> <port>` or `curl`.
- **Mapping the hops of a routing path:** **Reason:** `ping` targets the end destination blindly. It provides zero visibility into intermediate routers dropping packets. **Use instead:** `mtr` or `traceroute`.

## Alternatives

- **`nping` (Nmap):** Advanced packet generation. **Tradeoff:** Can craft custom TCP, UDP, and ARP pings, bypassing strict ICMP firewalls, but requires installing the heavy Nmap suite.
- **`fping`:** High-performance ping sweep. **Tradeoff:** Designed explicitly to ping hundreds of IP addresses asynchronously from a text file, whereas standard `ping` operates strictly synchronously on one host.
- **`nc` (Netcat):** Transport layer testing. **Tradeoff:** Establishes actual TCP connections to specific ports rather than Layer 3 ICMP, validating application reachability rather than just OS reachability.

## How it works internally

`ping` fundamentally bypasses standard TCP/UDP transport sockets. It requests a `SOCK_RAW` socket from the Linux kernel, allowing it to hand-craft protocol headers.

It constructs an ICMP (Internet Control Message Protocol) packet of type `ECHO_REQUEST` (Type 8). In the payload, it embeds a precise timestamp and a unique sequence number. It injects this packet into the IPv4/IPv6 network stack.

When the target machine's kernel network stack receives the Type 8 packet, it generates an `ECHO_REPLY` (Type 0), copies the exact payload (including the origin timestamp) from the request, and transmits it back.

When the originating `ping` utility intercepts the reply, it reads the current system time, subtracts the timestamp embedded in the payload, and outputs the exact round-trip latency (`time=14.2 ms`). If the packet never returns within the timeout window, it increments its internal packet loss counters. Because ICMP is handled natively by the kernel's network layer interrupt routines, it requires virtually zero CPU processing and operates beneath user-space applications.

## Performance Notes

- Executing a flood ping (`-f`) generates massive interrupt overhead on the target network interface card (NIC) and kernel. Doing this across enterprise switches can inadvertently trigger automatic anti-DDoS mitigation thresholds, resulting in the source IP being blackholed.
- `ping` uses the system's DNS resolver (`/etc/nsswitch.conf`). If a DNS server is misconfigured, `ping` will freeze completely before sending the first packet as it waits for DNS timeout. Use IP addresses directly to bypass this.

## Security Notes

- **Raw Socket Capabilities:** Opening raw sockets requires root privileges. Historically, the `ping` binary had the SetUID root bit enabled (`-rwsr-xr-x`). Modern Linux distributions strip the SetUID bit and instead apply the `CAP_NET_RAW` Linux capability to the binary, allowing it to forge packets securely without granting total root escalation to the user.
- **Smurf Attacks and Reconnaissance:** Responding to pings is optional. Highly secure enterprise servers and Azure/AWS default Security Groups silently drop incoming ICMP traffic to prevent network discovery sweeps and reflection attacks. A "Request timeout" does not conclusively mean a server is offline.

## Common Mistakes

- **Running `ping` on Linux without a count limit:** **Why it's wrong:** Unlike Windows (which stops after 4 pings), Linux `ping` runs infinitely until interrupted by `Ctrl+C`. In automated scripts, failing to append `-c 4` causes the script to hang forever in the background.
- **Assuming a successful ping means port 80 is open:** **Why it's wrong:** ICMP (Ping) operates at Layer 3. TCP Port 80 operates at Layer 4. A firewall can perfectly permit ICMP echoes while aggressively dropping all HTTP web traffic.
- **Ignoring the `mdev` (Standard Deviation) metric:** **Why it's wrong:** The final summary prints `rtt min/avg/max/mdev`. Users often just read the `avg`. If the average is 50ms, but the `mdev` is 40ms, the network is experiencing violent, erratic latency spikes (jitter) which destroys VoIP and database performance.

## Best Practices

- Always use `-c` (count) and `-w` (deadline) in shell scripts to ensure `ping` acts as a deterministic, non-blocking health check.
- When troubleshooting VPNs or complex IPSec tunnels, use `ping -M do -s 1400 <ip>` to manually discover the path MTU limit. Tunneling adds header overhead; if packets are too large, the router drops them, leading to mysterious application hangs.
- Combine `ping` with `awk` or `grep` carefully. Because output formats vary wildly between macOS (BSD) ping and Linux (iputils) ping, cross-platform scripts should rely purely on the exit code (`$?`) rather than parsing standard output.

## Interview Questions

- _Query:_ In a shell script, you run `ping 10.0.0.5`, but the script never progresses to the next line. What is the structural difference between Linux and Windows ping that causes this, and how do you fix it?
  - _A:_ The Windows `ping.exe` defaults to sending exactly 4 packets and then terminating. The Linux `ping` command operates in infinite continuous mode by default and requires a `SIGINT` (Ctrl+C) to terminate. To fix the script, you must append the count flag (`-c 4`) so it exits cleanly after a specified number of packets.
- _Query:_ You try to `ping google.com` and receive the error `ping: google.com: Name or service not known`. However, when you `ping 8.8.8.8`, it succeeds with 10ms latency. What exactly is broken on your system?
  - _A:_ Your network interface possesses correct IP addressing and a functioning default gateway routing out to the internet (proven by reaching 8.8.8.8). However, your Domain Name System (DNS) resolution is entirely broken. The operating system cannot translate the human-readable string `google.com` into an IP address, likely due to a misconfigured `/etc/resolv.conf`.
- _Query:_ What does it mean when a `ping` command returns `Destination Host Unreachable` versus `Request timeout`?
  - _A:_ `Request timeout` means your packet successfully left your machine and was routed onto the internet, but the target machine (or a firewall) never sent an ICMP reply within the time limit. `Destination Host Unreachable` means the packet couldn't even be routed. Your local machine (or your immediate default gateway router) sent out an ARP broadcast seeking the MAC address for the target IP on the local subnet, received no response, and the kernel destroyed the packet before it even traversed the wire.

## Practice Problems

- _Problem:_ Execute a network test to `cloudflare.com` that sends exactly 5 packets, but mandate that the entire command terminates unconditionally after a maximum of 3 seconds regardless of how many packets were sent.
  - _Hint:_ Combine the count flag with the absolute execution deadline flag.
  - _Solution:_ `ping -c 5 -w 3 cloudflare.com` (This provides a robust, non-blocking check ideal for automated orchestration tools).
- _Problem:_ Test the network path to `10.50.0.5` by sending packets with a massive payload size of `8192` bytes to verify that intermediate routers are properly fragmenting and reassembling oversized packets.
  - _Hint:_ Use the payload size flag.
  - _Solution:_ `ping -s 8192 10.50.0.5` (The kernel will fragment this payload across multiple Ethernet frames, stress-testing router assembly logic).

## References

- [Man Page for ping (Linux)](https://man7.org/linux/man-pages/man8/ping.8.html)
- [RFC 792 - Internet Control Message Protocol](https://datatracker.ietf.org/doc/html/rfc792)
