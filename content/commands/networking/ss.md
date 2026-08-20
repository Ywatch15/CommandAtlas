---
slug: ss
name: ss
aliases:
  - socket statistics
category: networking
tags:
  - linux
  - networking
  - sockets
  - diagnostic
  - iproute2
  - netlink
difficulty: intermediate
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - list active sockets linux
  - find process using port ss
  - show established network connections
  - check tcp queue limits
  - modern netstat replacement
relatedCommands:
  - netstat
  - ip
  - lsof
  - nmap
  - nc
  - fuser
  - syscall-sockets
alternatives:
  - netstat
  - lsof
  - fuser
status: draft
---

## What is it?

`ss` (Socket Statistics) is a modern, high-performance command-line utility used to investigate network sockets in Linux. Part of the `iproute2` package, it acts as the official, vastly superior replacement for the deprecated `netstat` command, dumping exhaustive statistics about TCP, UDP, RAW, and UNIX domain sockets.

## Why does it exist?

The legacy `netstat` utility operated by sequentially opening, reading, and text-parsing massive files in the `/proc/net/` directory. On heavily loaded web servers maintaining hundreds of thousands of concurrent connections, running `netstat` consumed immense CPU cycles and blocked execution for minutes. `ss` was engineered to solve this bottleneck. It bypasses `/proc/` text parsing entirely, utilizing the `sock_diag` Netlink kernel subsystem to request and retrieve packed binary arrays of socket data directly from kernel RAM in milliseconds.

## Syntax

```bash
ss [OPTIONS] [ FILTER ]
```

## Flags

| Flag                | Description                                                                                     | Example              |
| ------------------- | ----------------------------------------------------------------------------------------------- | -------------------- |
| `-t`, `--tcp`       | Restricts the output specifically to TCP (Transmission Control Protocol) sockets.               | `ss -t`              |
| `-u`, `--udp`       | Restricts the output specifically to UDP (User Datagram Protocol) sockets.                      | `ss -u`              |
| `-x`, `--unix`      | Displays UNIX domain sockets (IPC communication mechanisms).                                    | `ss -x`              |
| `-a`, `--all`       | Displays all sockets, including both listening daemons and established connections.             | `ss -a`              |
| `-l`, `--listening` | Restricts output strictly to sockets that are actively listening for incoming connections.      | `ss -lt`             |
| `-p`, `--processes` | Displays the PID and name of the program/application that currently owns the socket.            | `ss -ltp`            |
| `-n`, `--numeric`   | Displays raw IP addresses and port numbers, bypassing slow DNS and port-name resolution.        | `ss -nt`             |
| `-s`, `--summary`   | Prints a high-level statistical summary of socket types (ideal for broad capacity checks).      | `ss -s`              |
| `-e`, `--extended`  | Shows extended socket details (user ID, inode numbers).                                         | `ss -lne`            |
| `-m`, `--memory`    | Shows internal kernel socket memory usage (useful for tuning TCP buffers).                      | `ss -tm`             |
| `-i`, `--info`      | Shows profound internal TCP metrics (RTT, congestion window, retransmissions).                  | `ss -it`             |
| `-K`, `--kill`      | Forcibly closes sockets matching the filter criteria (requires highly specific modern kernels). | `ss -K dport = 8080` |

## Examples

```bash
ss -tulpn
```

> This is the definitive diagnostic combination. It lists all actively listening (`-l`) TCP (`-t`) and UDP (`-u`) ports, bypassing DNS resolution (`-n`) for speed, and displays the exact process ID and program name (`-p`) locking the port.

```bash
ss -tn state established
```

> This leverages the powerful `ss` state filtering engine. Instead of dumping everything and using `grep`, it natively filters the kernel query to return _only_ TCP sockets (`-t`) that have fully completed the 3-way handshake (`state established`), drastically reducing CPU overhead.

```bash
ss -lnt '( sport = :80 or sport = :443 )'
```

> This demonstrates advanced expression filtering. It asks the kernel specifically for listening TCP sockets where the local source port (`sport`) is either HTTP (80) or HTTPS (443), returning precise results instantly.

```bash
ss -it state established
```

> This dumps profound internal TCP telemetry (`-i`). Network engineers use this to debug connection throughput, as it reveals the active RTT (Round Trip Time), CWND (Congestion Window), and packet retransmission statistics for every live connection.

```bash
ss -s
```

> This returns a massive, instantaneous summary block detailing exactly how many sockets are currently bound, established, orphaned, or stuck in `TIME_WAIT` across the entire operating system, without listing the individual IPs.

## Real-World Scenarios

**Diagnosing TCP Port Exhaustion (SYN Floods / TIME_WAIT)**

```bash
ss -tn state time-wait | wc -l
```

> High-throughput microservices or reverse proxies frequently run out of available ephemeral ports. Engineers use `ss` state filters to rapidly count how many thousands of sockets are stuck in the `TIME_WAIT` teardown state, indicating a need to tune `net.ipv4.tcp_tw_reuse` in sysctl.

**Identifying Malicious Process Network Activity**

```bash
sudo ss -tp state established | grep -E "nc|bash|python"
```

> Security incident responders sweeping a compromised machine use `ss -p` to map outbound established connections back to specific binaries, actively hunting for reverse shells initiated by Python or Netcat.

**Tuning TCP Receive/Transmit Buffers**

```bash
ss -tm
```

> Application performance tuning experts use the memory flag (`-m`) to observe the active `skmem` (socket memory) allocations. If the `rmem` (receive memory) values are maxing out, it mathematically proves the application is reading data off the socket slower than the network is delivering it, causing bottlenecks.

## When should it NOT be used?

- **For packet capture and payload inspection:** **Reason:** `ss` only provides statistical telemetry and state data about the socket endpoints. It cannot capture, read, or intercept the actual bytes flowing through the connection. **Use instead:** `tcpdump` or `wireshark`.
- **Mapping files to processes non-network related:** **Reason:** While `ss` covers network sockets perfectly, `lsof` covers everything (open logs, devices, memory maps). **Use instead:** `lsof`.

## Alternatives

- **`netstat`:** The legacy predecessor. **Tradeoff:** Universally known, but officially deprecated, functionally incomplete regarding modern kernel metrics, and catastrophically slow on busy servers compared to `ss`.
- **`lsof -i`:** File descriptor mapping. **Tradeoff:** Exceptional at finding the process using a port, but lacks the deep internal TCP queue metrics (like RTT or CWND) natively exposed by `ss`.

## How it works internally

The speed and power of `ss` are derived from the **Netlink `sock_diag`** kernel subsystem.

Legacy tools opened text files in `/proc/net/tcp`, which forced the kernel to generate massive strings of text on the fly, lock tables, and forced user-space utilities to parse heavy strings.

When you run `ss`, it establishes a fast binary Netlink socket communication channel directly to the kernel. `ss` transmits a highly optimized binary request (a `struct inet_diag_req_v2`) containing its specific filters (e.g., "Give me only established TCP connections on port 80").

The kernel's `sock_diag` module receives this, performs the filtering directly inside kernel memory (avoiding context switches and text generation), and packs the matching socket states into a tight binary struct array. It streams this array back to `ss` over the Netlink socket. `ss` simply deserializes the binary payload and formats it for the terminal. This architecture reduces CPU overhead by orders of magnitude compared to `netstat`.

## Performance Notes

- **DNS Resolution Bottleneck:** Like all network tools, `ss` defaults to reverse-DNS resolution. Running `ss` on a server with 10,000 connections without the `-n` (numeric) flag will hang the terminal as it initiates 10,000 synchronous DNS queries. _Always_ use `-n`.
- **Kernel-Side Filtering:** Using native `ss` state filters (e.g., `state established`) is significantly faster than dumping all sockets and piping to `grep`. Native filters instruct the kernel to discard irrelevant sockets before they even leave RAM, minimizing IPC overhead.

## Security Notes

- **Privilege Masking:** Any user can run `ss -t`, but the crucial `-p` (process mapping) flag requires root privileges (`sudo`). The kernel blocks unprivileged users from reading the `/proc/<pid>/fd/` structures of processes they do not own, so the PID/Program column will silently output blanks for system daemons unless executed as root.
- **Socket Killing (`-K`):** Modern `ss` includes the extremely destructive `-K` flag, which forcefully injects `TCP_CLOSE` states into the kernel to instantly terminate active connections matching a filter. This is highly dangerous and requires absolute `CAP_NET_ADMIN` capabilities.

## Common Mistakes

- **Assuming `ss` defaults to all connections:** Running `ss` and wondering why listening ports aren't shown. **Why it's wrong:** By default, `ss` _only_ displays non-listening, established sockets. To see listening daemons, you must explicitly pass `-l` (listening) or `-a` (all).
- **Getting trapped in complex filter syntax quotes:** Running `ss -nt sport = 80`. **Why it's wrong:** Bash intercepts the spaces and equals signs, confusing the arguments. You must aggressively single-quote `ss` filter expressions: `ss -nt '( sport = :80 )'`.
- **Using `grep` instead of state filters:** Running `ss -ant | grep TIME-WAIT`. **Why it's wrong:** It forces the kernel to format and send every single socket state over IPC, wasting CPU. `ss -ant state time-wait` is the mathematically correct and performant methodology.

## Best Practices

- Force yourself to abandon `netstat -tulpn` in favor of `ss -tulpn`. The flags are identical, the output is nearly identical, but the performance and modern distributions dictate `ss` is the future.
- When diagnosing complex application latency, always append the `-i` (internal TCP info) flag to verify if network congestion (high retransmits, collapsed congestion windows) is the actual culprit before blaming application code.
- Use native filter syntax (`ss -nt dport = :443`) in bash monitoring scripts to ensure resource-efficient, sub-millisecond execution times.

## Interview Questions

- _Query:_ What is the underlying architectural mechanism that makes `ss` orders of magnitude faster than `netstat` on a server handling 100,000 concurrent connections?
  - _A:_ `netstat` relies on sequentially reading and string-parsing massive, dynamically generated plaintext files in `/proc/net/`, which induces enormous CPU parsing overhead and locks kernel tables. `ss` bypasses the `/proc` filesystem entirely. It uses binary `Netlink` sockets (the `sock_diag` module) to query the kernel, applying filters directly in kernel-space and retrieving tight, packed binary structs instantly.
- _Query:_ A web server is unresponsive. You run `ss -t` and observe 15,000 connections stuck in the `SYN-RECV` state. What kind of attack is the server currently experiencing?
  - _A:_ The server is experiencing a TCP SYN Flood (a Denial of Service attack). Attackers are sending massive waves of initial TCP SYN packets. The server allocates a socket, replies with a SYN-ACK, and enters `SYN-RECV` waiting for the final ACK, which the attacker intentionally never sends, eventually exhausting the server's socket connection queue.
- _Query:_ Why must you use the `sudo` command when executing `ss -tulpn` to determine which application is listening on a specific port?
  - _A:_ The `-p` flag requires `ss` to map the socket's inode number to a specific Process ID. It achieves this by reading the file descriptors in `/proc/<pid>/fd/`. The Linux kernel enforces strict access controls on the `/proc` filesystem; standard users cannot inspect the file descriptors of processes owned by `root` (like Nginx or SSH). Without `sudo`, the Process/PID column will be rendered blank.

## Practice Problems

- _Problem:_ Generate a clean, numerical list of every TCP port actively listening for connections on the host, including the name and PID of the program bound to it.
  - _Hint:_ Combine the flags for TCP, Listening, Numeric, and Program output with root privileges.
  - _Solution:_ `sudo ss -tlnp` (This is the definitive port audit command, mirroring the classic `netstat` workflow but via high-speed Netlink).
- _Problem:_ Query the kernel for all established TCP connections actively communicating with the remote port `443` (HTTPS), utilizing native kernel filtering rather than `grep`.
  - _Hint:_ Combine the tcp and numeric flags, and append the unquoted state and dport filter string syntax.
  - _Solution:_ `ss -tn state established dport = :443` (This filters the data directly inside the kernel, returning only actively connected HTTPS outbound streams).

## References

- [Man Page for ss (Linux)](https://man7.org/linux/man-pages/man8/ss.8.html)
- [iproute2 Package Documentation](https://wiki.linuxfoundation.org/networking/iproute2)
