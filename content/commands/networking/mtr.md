---
slug: mtr
name: mtr
aliases: [my traceroute]
category: networking
tags: [linux, networking, diagnostic, traceroute, ping, latency]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'run mtr network test'
  - 'trace route with latency mapping'
  - 'check packet loss to destination'
  - 'diagnose network bottleneck'
  - 'combine ping and traceroute'
relatedCommands: [ping, traceroute, nmap, netstat, ip, nc, nslookup]
alternatives: [traceroute, ping]
status: draft
---

## What is it?

`mtr` (My Traceroute) is a dynamic network diagnostic tool that combines the functionality of `ping` and `traceroute` into a single, real-time interface. It continuously probes the network path from the local host to a specified destination, mapping every router hop along the way and maintaining a running statistical average of latency, packet loss, and jitter for each individual node.

## Why does it exist?

Traditional `traceroute` maps a network path by sending a single volley of packets, providing a static, point-in-time snapshot. `ping` evaluates long-term packet loss but only measures the final destination, ignoring intermediate hops. When diagnosing intermittent latency or identifying exactly which ISP router is dropping packets, engineers had to painstakingly cross-reference both tools. `mtr` exists to solve this by generating a live, continuously updating matrix, immediately visualizing exactly where a network connection degrades over time.

## Syntax

```bash
mtr [OPTIONS] DESTINATION
```

## Flags

| Flag                          | Description                                                                                  | Example                    |
| ----------------------------- | -------------------------------------------------------------------------------------------- | -------------------------- |
| `-n`, `--no-dns`              | Prevents MTR from performing reverse-DNS lookups on hop IP addresses, speeding up output.    | `mtr -n 8.8.8.8`           |
| `-b`, `--show-ips`            | Displays both the resolved DNS hostname and the numerical IP address for each hop.           | `mtr -b google.com`        |
| `-c <num>`, `--report-cycles` | Sets the number of pings sent to determine the statistics before automatically exiting.      | `mtr -c 10 1.1.1.1`        |
| `-r`, `--report`              | Operates in non-interactive report mode. Runs the cycles and prints a static text table.     | `mtr -r -c 5 google.com`   |
| `-w`, `--report-wide`         | (With `-r`) Ensures the output table is wide enough to display full, un-truncated hostnames. | `mtr -rw 8.8.8.8`          |
| `-t`, `--curses`              | Forces MTR to use the terminal-based curses UI, bypassing any X11/GUI interfaces.            | `mtr -t google.com`        |
| `-u`, `--udp`                 | Uses UDP datagrams for probing instead of the default ICMP ECHO requests.                    | `mtr -u target.com`        |
| `-T`, `--tcp`                 | Uses TCP SYN packets for probing, excellent for bypassing routers that block ICMP.           | `mtr -T -P 443 target.com` |
| `-P <port>`, `--port`         | Specifies the target port to use when probing with TCP or UDP protocols.                     | `mtr -T -P 80 target.com`  |
| `-i <sec>`, `--interval`      | Specifies the time in seconds to wait between sending consecutive ping cycles.               | `mtr -i 0.5 8.8.8.8`       |
| `-s <bytes>`, `--psize`       | Sets the packet size (in bytes) used for the probe to test MTU bottlenecks.                  | `mtr -s 1500 8.8.8.8`      |

## Examples

```bash
mtr 8.8.8.8
```

> This launches the interactive curses interface, continuously sending ICMP echo requests to Google's public DNS. It dynamically updates the screen every second with real-time statistics (Loss%, Best, Avg, Worst, StDev latency) for every router between your machine and the destination.

```bash
mtr -r -w -c 10 google.com
```

> This runs MTR in non-interactive "report" mode (`-r`). It sends exactly 10 packets (`-c 10`) to each hop, aggregates the statistics, and prints a single, wide (`-w`), easily readable text table before exiting. This is ideal for copying and pasting into IT support tickets.

```bash
mtr -T -P 443 target-server.com
```

> This modifies the probe payload. Instead of using standard ICMP pings (which strict firewalls often drop), it probes the route using TCP SYN packets (`-T`) aimed at port 443 (`-P 443`). This perfectly simulates how web browser traffic navigates the routing path.

```bash
mtr -n -i 0.5 1.1.1.1
```

> This launches an accelerated interactive trace. It skips all DNS resolution (`-n`) so IPs appear instantly, and increases the probe frequency to send packets every half-second (`-i 0.5`), providing extremely rapid feedback when watching for network jitter.

```bash
mtr -s 1500 10.0.0.5
```

> This sets the packet payload size to 1500 bytes (`-s 1500`). Network engineers use this to diagnose Maximum Transmission Unit (MTU) mismatches or VPN fragmentation issues; if large packets drop but small packets succeed, a hop is failing to fragment properly.

## Real-World Scenarios

**Diagnosing ISP Routing Failures**

```bash
mtr -r -c 100 remote-database.com > mtr_report.txt
```

> When a client complains of sporadic disconnects to a remote database, engineers generate a 100-packet static report. If hop 1 (local router) shows 0% loss, but hop 4 (an ISP backbone router) shows 15% loss that propagates to all subsequent hops, the engineer possesses mathematical proof that the ISP routing infrastructure is at fault, not the local server.

**Bypassing ICMP Firewalls for Traceroutes**

```bash
mtr -T -P 22 internal-bastion.corp.net
```

> Many enterprise firewalls drop raw ICMP (ping) traffic silently, causing standard `traceroute` tools to show endless `???` timeouts. Operators bypass this by commanding `mtr` to trace the route using TCP port 22, accurately mapping the path right up to the SSH daemon.

## When should it NOT be used?

- **Automated, background latency monitoring:** **Reason:** While report mode exists, `mtr` requires root privileges to forge raw packets and does not natively serialize data into time-series databases. **Use instead:** Telegraf, Prometheus Blackbox Exporter, or Smokeping.
- **Simple up/down host verification:** **Reason:** `mtr` performs intense pathway mapping and calculation. Running it just to check if a server is online is massive overkill. **Use instead:** `ping` or `nc -vz`.

## Alternatives

- **`traceroute` / `tracert`:** The legacy path mapping tools. **Tradeoff:** They are universally installed without root requirements, but provide only a static, one-time snapshot of the route, failing to highlight intermittent packet loss that `mtr` catches easily.
- **`ping`:** Standard reachability test. **Tradeoff:** Tests only the final destination. If `ping` shows 10% packet loss, you have no idea _where_ along the 15-hop journey the packets are dropping.

## How it works internally

`mtr` achieves its pathway mapping by manipulating the **Time To Live (TTL)** field in the IP header of packets (typically ICMP ECHO requests).

When `mtr` starts, it crafts a raw packet directed at the destination but intentionally sets the TTL value to `1`. The very first router that processes this packet decrements the TTL to `0`. Recognizing the packet has expired, the router discards it and sends an `ICMP Time Exceeded` message back to the originating host. `mtr` receives this message, records the router's IP address as "Hop 1", and calculates the round-trip latency.

It then sends another packet with a TTL of `2`, identifying "Hop 2", and repeats this incrementing process until a packet finally reaches the destination host (which replies with an `ICMP Echo Reply`).

Unlike `traceroute` which stops there, `mtr` continuously repeats this entire cycle indefinitely. It maintains internal memory arrays for each discovered hop, tracking the number of packets sent, received, and dropped, and calculates real-time floating-point averages and standard deviations, rendering the matrix dynamically using the `ncurses` terminal library.

## Performance Notes

- By default, `mtr` generates a low volume of traffic (one packet per second per hop). However, running `mtr` with very low intervals (`-i 0.1`) can trigger anti-DDoS protections or ICMP rate-limiting on intermediate carrier routers, causing them to intentionally drop your probes (creating false-positive packet loss).
- DNS resolution is synchronous and blocking. If a hop belongs to a telecom provider with a slow or broken reverse-DNS infrastructure, the `mtr` UI will hang or stutter. Always append `-n` if you only require raw IP addresses.

## Security Notes

- **Raw Socket Creation:** To manipulate the IP TTL fields directly and construct custom TCP/UDP probe packets, `mtr` must open raw network sockets. This explicitly requires `root` privileges (or the `CAP_NET_RAW` Linux capability applied to the `mtr` binary).
- **Intrusion Detection Triggers:** Firing continuous, high-speed UDP or TCP probes across corporate networks using `mtr` mimics the exact operational signature of an aggressive port scan, frequently triggering automated IDS/IPS (Intrusion Prevention System) alerts and potential IP bans.

## Common Mistakes

- **Misinterpreting Control Plane Rate Limiting:** Seeing 50% packet loss on Hop 3, but 0% packet loss on Hop 4 and the final destination. **Why it's wrong:** Hop 3 is a massive carrier router. It routes transit traffic perfectly (hence 0% loss at the destination), but its CPU is configured to aggressively rate-limit or ignore direct ICMP pings to protect itself. This is normal and does _not_ indicate a network problem. Real packet loss persists through all subsequent hops.
- **Piping the interactive mode:** Running `mtr google.com > file.txt`. **Why it's wrong:** `mtr` boots into an interactive `ncurses` UI. Redirecting it writes terminal escape sequences to the text file, rendering it unreadable. You must use report mode (`-r`) for scripting.

## Best Practices

- When submitting network evidence to ISP support, always run `mtr -r -w -c 100 <destination>`. A 100-packet sample provides statistically significant proof of packet loss, and the wide (`-w`) flag ensures long carrier hostnames aren't truncated in the report.
- If a standard ICMP `mtr` trace abruptly halts with `???` at a firewall boundary, switch immediately to TCP mode (`-T -P 443`) to disguise the diagnostic probes as standard web traffic.

## Interview Questions

**Q:** In an `mtr` report, you observe 30% packet loss at Hop 5. However, Hop 6, Hop 7, and the final destination all show exactly 0% packet loss. Is there a network bottleneck at Hop 5?
**A:** No. This is a classic example of ICMP rate limiting. Router 5 is dropping the ICMP packets explicitly destined _for its own control plane_ to save CPU resources, but its data plane is successfully forwarding the transit packets along the path. If there were a real network bottleneck, the 30% packet loss would propagate to every subsequent hop and the final destination.
**Q:** What specific IP header field does `mtr` manipulate to map the intermediate routers between your host and the destination?
**A:** `mtr` manipulates the **Time To Live (TTL)** field in the IP header. By sending packets with incrementally increasing TTLs (1, then 2, then 3), the packets expire sequentially at each intermediate router. The routers discard the packets and return "ICMP Time Exceeded" messages, exposing their IP addresses to the `mtr` application.
**Q:** Why does running `mtr` fundamentally require root privileges (or the `CAP_NET_RAW` capability) on a Linux system, whereas a simple HTTP request via `curl` does not?
**A:** A simple `curl` request asks the kernel's network stack to handle packet creation. `mtr` must manually craft custom IP headers (specifically altering the TTL field) and generate arbitrary ICMP/TCP/UDP packets. This requires opening a raw network socket, a highly privileged operation restricted to root to prevent unprivileged users from forging packets and launching spoofing attacks.

## Practice Problems

**Problem:** Generate a static, 20-packet diagnostic report targeting `cloudflare.com`, preventing IP addresses from resolving to hostnames, and ensuring wide columns.
**Hint:** Combine report mode, cycle limit, wide formatting, and the no-DNS resolution flag.
**Solution:** `mtr -r -w -c 20 -n cloudflare.com` (This generates a clean, programmatic text table without hanging on DNS lookups).
**Problem:** Diagnose a routing path to a strict corporate server (`10.0.5.50`) that drops all ping (ICMP) traffic by tracing the route using TCP packets aimed specifically at port 22 (SSH).
**Hint:** Switch the protocol mode to TCP and specify the target destination port.
**Solution:** `mtr -T -P 22 10.0.5.50` (This constructs TCP SYN packets instead of ICMP echoes, bypassing basic ping filters to map the path to the SSH daemon).

## References

- [MTR GitHub Repository / Documentation](https://github.com/traviscross/mtr)
- [Man Page for mtr (Linux)](https://man7.org/linux/man-pages/man8/mtr.8.html)
