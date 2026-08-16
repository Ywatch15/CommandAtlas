---
slug: traceroute
name: traceroute
aliases: [tracert]
category: networking
tags: [linux, networking, troubleshooting, routing, icmp]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'trace network path'
  - 'find where packets are dropping'
  - 'check network routing hops'
  - 'troubleshoot high latency'
  - 'trace route to server'
relatedCommands: [ping, mtr, ip, tcpdump]
alternatives: [mtr]
status: draft
---

## What is it?

`traceroute` is a network diagnostic tool used to map the exact pathway that IP packets take from a local computer to a specified destination host. It outputs a sequential list of all the intermediate routers (hops) traversed, along with round-trip latency measurements for each hop, providing crucial visibility into network topology and identifying exact points of failure or congestion.

## Why does it exist?

When a server is unreachable, `ping` only tells you _that_ the connection failed. The internet is a massive web of interconnected, disparate networks (Autonomous Systems). A packet might traverse 15 different routers owned by 5 different companies to reach its destination. If a router in the middle is misconfigured or dropping packets, standard networking tools are blind to it. `traceroute` exists to expose this hidden infrastructure. By cleverly manipulating IP header constraints (specifically the Time-To-Live field), it coerces intermediate routers into revealing their identities, allowing engineers to pinpoint exactly which ISP or firewall is blackholing their traffic.

## Syntax

```bash
traceroute [options] host [packet_len]
```

## Flags

| Flag             | Description                                                                                                               | Example                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `-I`, `--icmp`   | Uses ICMP ECHO requests (like `ping`) instead of the default UDP packets. Essential for traversing strict firewalls.      | `traceroute -I google.com`        |
| `-T`, `--tcp`    | Uses TCP SYN requests for probing. Highly effective for testing if a specific port (e.g., 443) is open through firewalls. | `traceroute -T -p 443 github.com` |
| `-p <port>`      | Defines the destination port to use. For UDP, it's the base port. For TCP, it's the exact target port being tested.       | `traceroute -T -p 80 example.com` |
| `-n`             | Prints IP addresses numerically, completely bypassing reverse-DNS resolution. Drastically speeds up execution.            | `traceroute -n 1.1.1.1`           |
| `-q <queries>`   | Sets the number of probe packets sent per hop. Defaults to 3. Changing to 1 speeds up the trace significantly.            | `traceroute -q 1 example.com`     |
| `-w <wait>`      | Sets the time (in seconds) to wait for a response from a hop before giving up and printing an asterisk `*`.               | `traceroute -w 2 google.com`      |
| `-m <max_ttl>`   | Specifies the maximum number of hops (max Time-To-Live) to probe before giving up. Defaults to 30.                        | `traceroute -m 15 example.com`    |
| `-4`, `-6`       | Forcefully restricts the trace to use IPv4 or IPv6 routing exclusively.                                                   | `traceroute -6 ipv6.google.com`   |
| `-i <device>`    | Specifies the local network interface to send the trace packets through.                                                  | `traceroute -i eth1 target.com`   |
| `-f <first_ttl>` | Starts the trace at a specific hop distance instead of 1. Useful for bypassing known internal network topology.           | `traceroute -f 5 google.com`      |

## Examples

```bash
traceroute google.com
```

> The standard Linux invocation. Resolves `google.com`, then sends UDP packets with incrementing TTLs. It prints three latency measurements for every router it passes through until it reaches the final destination.

```bash
traceroute -n 8.8.8.8
```

> The fast diagnostic trace. By skipping reverse-DNS lookups (`-n`), it immediately prints the IP addresses of intermediate routers, preventing the command from hanging while attempting to resolve the hostnames of obscure internet backbone routers.

```bash
traceroute -I -q 1 example.com
```

> Bypasses restrictive firewalls. Many enterprise networks drop strange UDP packets but permit standard `ping` traffic. Using `-I` switches the probe to ICMP, and `-q 1` sends only a single probe per hop, completing the trace almost instantly.

```bash
traceroute -T -p 443 github.com
```

> A surgical port-reachability test. Instead of arbitrary UDP/ICMP packets, it crafts a legitimate TCP SYN packet targeting port 443. This perfectly simulates standard HTTPS web traffic, bypassing firewalls that allow web traffic but block ICMP, while simultaneously mapping the route.

## Real-World Scenarios

**Identifying an ISP Routing Loop**

```bash
traceroute -n 10.0.5.50
# 4  192.168.100.1  2.1 ms
# 5  192.168.100.2  2.5 ms
# 6  192.168.100.1  2.8 ms
# 7  192.168.100.2  3.1 ms
```

> A server is unreachable. An engineer runs a trace and notices the output bouncing back and forth endlessly between two specific IP addresses. This reveals a routing loop—two routers are misconfigured to point to each other as the next hop, trapping the packet in an infinite loop until its TTL expires.

**Locating a Firewall Blackhole**

```bash
traceroute -T -p 3306 production-db.internal
# 1  10.0.0.1  1.1 ms
# 2  10.0.1.1  1.5 ms
# 3  * * *
# 4  * * *
```

> A developer cannot reach a database. The trace reveals that packets successfully traverse the first two subnets, but hit a wall at hop 3. The network engineer immediately knows that the router at `10.0.1.1` lacks the proper ACL (Access Control List) to forward TCP port 3306 traffic to the database subnet, isolating the exact firewall that needs updating.

## When should it NOT be used?

- **Continuous Latency Monitoring:** **Do not use `traceroute` in a loop to monitor latency over time.** It runs sequentially and lacks statistical aggregation. Use `mtr` (My Traceroute), which continuously polls the route and displays a dynamic, self-updating dashboard of packet loss and average latency.
- **As absolute proof of routing:** **Traceroute lies.** Modern internet architectures use Equal-Cost Multi-Path (ECMP) routing and load balancers. A packet with TTL=4 might take path A, while TTL=5 takes path B. The resulting output mixes two different paths together, presenting a route that a single packet never actually took.
- **As absolute proof of latency:** Routers process ICMP TTL-Exceeded generation on their slow-path CPU, heavily deprioritizing it. A hop might show 150ms of latency, but the final destination shows 20ms. The intermediate router isn't congested; it is simply slow at responding to traceroutes. Always look at the _final_ hop latency.

## Alternatives

- **`mtr` (My Traceroute):** **Best for active troubleshooting.** Combines `ping` and `traceroute` into a continuously updating ncurses GUI, instantly revealing packet loss percentages at specific hops.
- **`tracepath`:** **Best for unprivileged users.** Requires no root access (uses standard UDP sockets) and additionally discovers the Path MTU (Maximum Transmission Unit) to identify where packet fragmentation occurs.
- **`tracert` (Windows):** The Windows equivalent. Notably, Windows `tracert` uses ICMP by default, whereas Linux `traceroute` uses UDP by default.

## How it works internally

The IP header of every packet sent across a network contains an 8-bit field called Time-To-Live (TTL). To prevent packets from circulating endlessly in routing loops, every router that processes a packet decrements the TTL by 1. If the TTL reaches 0, the router drops the packet and sends an `ICMP Time Exceeded` error message back to the original sender.

`traceroute` explicitly exploits this mechanism.

1. It crafts a packet (UDP, ICMP, or TCP) destined for the target host, but artificially sets the TTL field to `1`.
2. The packet hits the very first router (the default gateway). The router decrements the TTL to `0`, drops it, and replies with an `ICMP Time Exceeded`. `traceroute` records this router's IP and the round-trip time.
3. `traceroute` crafts a second packet, this time setting the TTL to `2`. The first router decrements it to `1` and forwards it. The second router decrements it to `0`, drops it, and replies.
4. This sequence continues, systematically mapping every hop.
5. The process ends when the packet reaches the final destination. The destination host, receiving a UDP packet on an unusual closed port (default 33434), replies with an `ICMP Port Unreachable`. (If using ICMP `-I`, it replies with `ICMP Echo Reply`. If using TCP `-T`, it replies with a `RST` or `SYN-ACK`). `traceroute` recognizes this terminal response and stops the trace.

## Performance Notes

- **Asterisks (`* * *`):** When you see asterisks, it does not necessarily mean the network is broken. Many core internet backbone routers and corporate firewalls are explicitly configured to silently drop expired packets (ignoring ICMP generation) to protect their control-plane CPUs from Denial of Service attacks.
- **Default UDP Weakness:** By default, Linux `traceroute` sends UDP packets to obscure high ports (33434+). Most modern firewalls drop unsolicited UDP traffic, causing the trace to time out midway. Switching to `-I` (ICMP) or `-T` (TCP) is almost always required for reliable tracing across the public internet.

## Security Notes

- **Privileged Execution:** Crafting custom IP packets (like altering the TTL field or generating raw TCP SYN packets without establishing a full handshake) requires raw socket access. Therefore, advanced flags like `-I` (ICMP) and `-T` (TCP) require `root` or `sudo` privileges to execute.
- **Network Reconnaissance:** Attackers frequently use TCP tracerouting to map out internal network perimeters, identifying the exact IP addresses of hidden firewalls and DMZ boundaries. Security Operation Centers (SOCs) often monitor for sequential ICMP Time Exceeded generation to detect internal mapping attempts.

## Common Mistakes

- **Misinterpreting Intermediate Latency Spikes**
  - _Mistake:_ Seeing Hop 4 show 200ms latency, while Hop 5 shows 20ms, and concluding Hop 4 is a severe network bottleneck.
  - _Why:_ Traffic traversing _through_ a router is handled by ultra-fast hardware ASICs. Traffic addressed _to_ the router (like generating ICMP TTL-Exceeded messages) is punted to the router's general-purpose CPU, which often rate-limits these responses. High latency on an intermediate hop is irrelevant if the downstream hops show low latency.
- **Forgetting to use `-n` in automation**
  - _Mistake:_ Putting `traceroute google.com` in a diagnostic script.
  - _Why:_ The script will hang unpredictably while trying to resolve the obscure internal hostnames of ISP infrastructure routers. Always use `-n` in scripts for deterministic execution speed.

## Best Practices

- **Always prefer MTR for ongoing issues:** If a user complains about "lag spikes" while gaming or streaming, a single `traceroute` snapshot provides no useful data. Use `mtr` and let it run for 10 minutes to gather a statistical average of packet loss across the route.
- **Match the trace to the failing application:** If a web application on port 443 is failing, a standard UDP traceroute is useless because firewalls treat UDP and TCP differently. Always test the specific failing protocol: `sudo traceroute -T -p 443 target.com`.

## Interview Questions

**Q: Explain how `traceroute` manipulates the IP packet header to map intermediate routers across the internet.**
**A:** `traceroute` intentionally sends packets with artificially restricted Time-To-Live (TTL) values. It starts by sending a packet with a TTL of 1. The first router decrements the TTL to 0, drops the packet, and returns an "ICMP Time Exceeded" message, revealing its IP. `traceroute` then sends a packet with TTL 2, then TTL 3, progressively forcing every router along the path to reveal itself until the packet finally reaches the destination.

**Q: A standard `traceroute` using UDP packets fails at hop 5 with asterisks (`* * *`). However, `ping` successfully reaches the destination. Why did the traceroute fail, and what flag would you add to make it succeed?**
**A:** The standard traceroute failed because a firewall at or after hop 5 is configured to block unsolicited UDP traffic (specifically on high ports like 33434). Because `ping` (which uses ICMP) succeeds, you know ICMP is permitted. To fix the trace, you must add the `-I` flag (`traceroute -I target.com`) to force `traceroute` to use ICMP Echo Requests, mimicking ping and bypassing the UDP firewall block.

## Practice Problems

**Problem:** You are trying to diagnose a routing issue to a server, but the output is taking forever because `traceroute` is attempting to perform reverse-DNS lookups on every single ISP router along the way. Write the command to trace the route instantly by printing only raw IP addresses.
**Hint:** Use the numeric-only flag.
**Solution:**

```bash
traceroute -n server.example.com
```

**Problem:** You suspect a firewall is blocking SSH traffic to `secure-server.internal`. Standard ping works, but SSH fails. Write the command to perform a trace route using TCP packets specifically targeting port 22 to prove exactly where the firewall is dropping the connection.
**Hint:** You need root privileges (`sudo`), the TCP flag, and the port flag.
**Solution:**

```bash
sudo traceroute -T -p 22 secure-server.internal
```

## References

- [traceroute(8) - Linux man page](https://linux.die.net/man/8/traceroute)
- [A Practical Guide to (Correctly) Troubleshooting with Traceroute](https://archive.nanog.org/meetings/nanog47/presentations/Sunday/RAS_Traceroute_N47_Sun.pdf)
