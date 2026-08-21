---
slug: nmap
name: nmap
aliases: [network mapper]
category: networking
tags: [security, networking, port-scanning, reconnaissance, vulnerability, diagnostics]
difficulty: advanced
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'scan network for open ports'
  - 'discover hosts on subnet'
  - 'find operating system nmap'
  - 'detect service versions nmap'
  - 'run vulnerability scan nmap'
relatedCommands: [nc, mtr, ping, tcpdump, arp, ss]
alternatives: []
status: draft
---

## What is it?

`nmap` (Network Mapper) is a vastly powerful open-source utility for network discovery and security auditing. It utilizes raw IP packets in novel ways to determine what hosts are available on a network, what services (application name and version) those hosts are offering, what operating systems they are running, and what types of packet filters or firewalls are in use.

## Why does it exist?

Network administrators and penetration testers require absolute visibility into the true state of their infrastructure. Standard tools like `ping` are easily blocked, and `netstat` only maps the local host. `nmap` exists to actively interrogate remote networks from the outside in. By analyzing subtle variations in how remote TCP/IP stacks respond to perfectly crafted, malformed, or half-open packets, `nmap` can deduce hardware layouts, bypass rudimentary firewalls, and expose vulnerable exposed services reliably and at scale.

## Syntax

```bash
nmap [Scan Type(s)] [Options] {target specification}
```

## Flags

| Flag               | Description                                                                                                    | Example                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `-sS`              | TCP SYN scan (Stealth Scan). Performs a half-open handshake, hiding from basic application logs.               | `nmap -sS 192.168.1.1`          |
| `-sT`              | TCP Connect scan. Completes the full 3-way handshake; slower but doesn't require root privileges.              | `nmap -sT target.com`           |
| `-sU`              | UDP scan. Scans for open UDP ports (e.g., DNS, SNMP, DHCP) which are notoriously difficult to map.             | `nmap -sU -p 53 1.1.1.1`        |
| `-p <port ranges>` | Specifies exact ports to scan (e.g., `22,80,1-1024`, or `-p-` for all 65535 ports).                            | `nmap -p 1-1024 localhost`      |
| `-O`               | Enables OS fingerprinting, attempting to determine the target's operating system via packet quirks.            | `nmap -O 10.0.0.5`              |
| `-sV`              | Enables Service Version detection, interrogating open ports to identify exact application versions.            | `nmap -sV -p 80,443 domain.com` |
| `-A`               | "Aggressive" mode: enables OS detection, version detection, script scanning, and traceroute simultaneously.    | `nmap -A scanme.nmap.org`       |
| `-sn`              | Ping Scan (No port scan). Determines which hosts are up on a subnet without checking individual ports.         | `nmap -sn 192.168.1.0/24`       |
| `-Pn`              | Treat all hosts as online. Bypasses the initial ping discovery phase, forcing a scan on hosts that block ICMP. | `nmap -Pn 10.0.0.15`            |
| `-T<0-5>`          | Sets the timing template (higher is faster). `T4` is aggressive and fast; `T0` is slow and evasive.            | `nmap -T4 10.0.1.0/24`          |
| `--script <name>`  | Executes specific Nmap Scripting Engine (NSE) scripts (e.g., `vuln`, `safe`, `http-title`).                    | `nmap --script vuln target.com` |

## Examples

```bash
nmap -sn 10.0.0.0/24
```

> This performs a highly efficient Ping Sweep across a /24 subnet. It uses ARP requests (on local networks) or ICMP echoes to identify which specific IP addresses belong to actively responding devices, entirely skipping the time-consuming port scanning phase.

```bash
nmap -sS -p 22,80,443 target-server.com
```

> This executes a targeted "Stealth" SYN scan on three specific ports. The scanner sends a SYN packet, waits for a SYN/ACK, and immediately drops the connection with an RST packet before the application layer can log a completed connection.

```bash
nmap -A -T4 192.168.1.50
```

> This unleashes a comprehensive, aggressive audit against a single host. It executes at high speed (`T4`), identifies open ports, probes them to discover exact software versions (`sV`), attempts OS fingerprinting (`O`), maps the routing path (`traceroute`), and runs default safety scripts.

```bash
nmap -p- -sV 10.0.5.10
```

> This performs an exhaustive scan across all 65,535 possible TCP ports (`-p-`), followed by deeply interrogating any discovered open ports to extract service banners and protocol versions (`-sV`).

```bash
nmap --script=http-vuln-cve2021-41773 -p 8080 target.com
```

> This leverages the Nmap Scripting Engine (NSE) to execute a highly specialized vulnerability check (in this case, an Apache path traversal exploit) directly against port 8080 on the target domain.

## Real-World Scenarios

**Validating Cloud Security Group Configurations**

```bash
nmap -Pn -p 3306 database.production.cloud
```

> Cloud engineers use Nmap to audit external security postures. By forcing a scan (`-Pn`) on a specific database port from an external IP, they mathematically prove whether external AWS Security Groups or Azure Firewalls are actively blocking public internet traffic as designed.

**Shadow IT and Rogue Device Discovery**

```bash
sudo nmap -sn -PR 10.50.0.0/16
```

> Corporate network administrators run massive ARP-based ping sweeps across their internal corporate subnets. Comparing the MAC addresses and responding IP addresses against their DHCP manifests allows them to isolate rogue routers or unauthorized employee devices plugged into office switches.

**Vulnerability Auditing and Patch Verification**

```bash
nmap -sV --script vuln 192.168.10.0/24
```

> Security teams execute version detection combined with the `vuln` script category across entire subnets. Nmap checks the version banners of SSH, SMB, and HTTP daemons against known CVE databases, highlighting exactly which servers require immediate patching.

## When should it NOT be used?

- **Scanning infrastructure you do not own or have explicit authorization to test:** **Reason:** Aggressive Nmap scanning triggers Intrusion Detection Systems (IDS). Scanning third-party infrastructure without permission is frequently interpreted as a hostile cyberattack and may violate terms of service or regional laws.
- **Scanning massive, internet-wide IP ranges (millions of IPs):** **Reason:** Nmap tracks states for every connection and timing delays aggressively. Scanning the entire internet with Nmap takes weeks. **Use instead:** `masscan` or `zmap`, which use asynchronous stateless architectures to scan the internet in minutes.

## Alternatives

- **`masscan`:** Asynchronous port scanner. **Tradeoff:** `masscan` is vastly faster than Nmap for scanning massive IP ranges, but it cannot perform Nmap's deep application layer banner grabbing, OS fingerprinting, or NSE scripting.
- **`rustscan`:** Modern fast wrapper. **Tradeoff:** `rustscan` blasts through ports asynchronously to find open ones in milliseconds, and then automatically pipes those specific open ports into Nmap for deep analysis, bridging the speed gap perfectly.

## How it works internally

Nmap operates by constructing and injecting raw IP packets onto the network interface, bypassing standard OS TCP/IP socket limitations.

During a **SYN Scan (`-sS`)**, Nmap utilizes raw sockets to construct a TCP SYN packet. If the target port is open, the remote kernel responds with a SYN/ACK. Nmap's custom network stack intercepts this packet, logs the port as "open," and instantly injects an RST (Reset) packet. This prevents the OS kernel (which didn't initiate the handshake) from interfering, and crucially, aborts the handshake before the remote application (like Apache) is ever notified, leaving no application log.

For **OS Fingerprinting (`-O`)**, Nmap sends a battery of highly specific, slightly malformed TCP, UDP, and ICMP packets (e.g., setting odd TCP flags, altering window sizes, or manipulating ICMP error quoting). Different operating system kernels (Windows, Linux, FreeBSD) respond to these edge-case packets in mathematically distinct ways. Nmap calculates a fingerprint based on these quirks and matches it against a massive local database (`nmap-os-db`) to deduce the kernel version.

## Performance Notes

- Host discovery and port scanning are heavily bound by network latency and packet loss. Nmap maintains complex, dynamic internal timing algorithms that adjust timeout windows and retransmission rates based on measured network jitter to ensure accuracy. Overriding this with `-T5` (Insane) on flaky networks will result in massive false-negatives (missing open ports).
- Version detection (`-sV`) is slow. It establishes full TCP connections, sends protocol-specific probes (HTTP GETs, SSL Client Hellos), and waits for the remote service to return parsable banner strings, pausing the scan significantly.

## Security Notes

- **Root Privileges:** Constructing custom IP headers and TCP flags requires Raw Socket access, which is strictly isolated to the `root` user (`CAP_NET_RAW` capability). Running Nmap as a standard user strips away SYN scanning and OS fingerprinting, forcing it to fall back to noisy, slow `connect()` (`-sT`) scans.
- **IDS/IPS Evasion:** Firewalls easily detect the sequential port-banging signature of a default Nmap scan. Security professionals utilize fragmentation (`-f`), randomized target sequencing (`--randomize-hosts`), and decoy source IPs (`-D`) to obfuscate the scanning signature from traffic analyzers.

## Common Mistakes

- **Assuming a closed port is a blocked port:** **Why it's wrong:** Nmap defines ports rigorously. `Open` means an application accepted the connection. `Closed` means the server actively rejected it (sent an RST), proving the host is alive but no app is listening. `Filtered` means the packet was dropped into a black hole (firewall block). Knowing the difference is critical for diagnostics.
- **Forgetting `-Pn` on ping-blocking firewalls:** Running `nmap 10.0.0.5` and getting "Host seems down." **Why it's wrong:** By default, Nmap pings the host first. If the host blocks ICMP ping but allows port 80, Nmap assumes the host is dead and skips the port scan entirely. Always use `-Pn` to force a scan on stealthy hosts.
- **Blindly trusting version banners:** Assuming `Nginx 1.14` is vulnerable because Nmap said so. **Why it's wrong:** Enterprise Linux distributions (like RHEL/Debian) backport security patches into older versions without updating the banner string. The banner may say 1.14, but it is fully patched against 1.14 CVEs.

## Best Practices

- When executing broad network audits, adopt a two-phase approach: first, use a fast ping sweep (`-sn`) or port sweep restricted to top ports to identify live hosts. Output this to a list, then feed that list back into Nmap for deep, targeted, aggressive scanning (`-A -p-`).
- Always utilize the output formatting flags (`-oN` for normal, `-oX` for XML, `-oG` for Grepable) to save comprehensive scan results to disk. Complex scans take hours; losing terminal history means losing the data. The `-oA` flag outputs all three formats simultaneously.

## Interview Questions

**Q:** Describe the exact TCP packet exchange that occurs during an Nmap stealth SYN scan (`-sS`) against an open port, and explain why it requires root privileges.
**A:** Nmap constructs and sends a raw TCP SYN packet. The target responds with a SYN/ACK packet, indicating the port is open. Nmap intercepts this and immediately replies with an RST (Reset) packet to tear down the connection. Because it does not complete the 3-way handshake (missing the final ACK), the remote application usually doesn't log the interaction. This requires root privileges because standard OS socket APIs don't allow applications to craft raw IP headers or inject RST packets mid-handshake; it requires low-level raw socket access.
**Q:** You scan a target with `nmap 192.168.1.100` and Nmap reports "Host seems down", but you can successfully reach the web server on that IP via your browser. Why did Nmap fail, and what flag fixes it?
**A:** By default, Nmap executes a host discovery phase (usually an ICMP Ping or TCP ACK to port 80) to verify a host is alive before wasting time port scanning it. If a firewall blocks ICMP, Nmap assumes the host is dead and aborts. Passing the `-Pn` (Treat all hosts as online) flag instructs Nmap to bypass the ping discovery phase and aggressively scan the specified ports regardless.
**Q:** How does Nmap deduce the operating system of a remote target (using the `-O` flag) without having any administrative access to it?
**A:** Nmap relies on TCP/IP stack fingerprinting. Different OS vendors (Microsoft, Linux kernel teams, BSD) implement the RFC specifications for networking slightly differently. Nmap sends an array of edge-case and malformed packets to the target and analyzes the responses—checking variations in initial TTL values, TCP window sizes, fragmentation handling, and option ordering. It matches this unique behavioral signature against an internal database to identify the OS and kernel version.

## Practice Problems

**Problem:** Execute a scan against the subnet `10.10.5.0/24` to discover which IP addresses are actively online, without performing any port scanning, and save the output to a grepable file named `live_hosts.txt`.
**Hint:** Combine the Ping scan flag with the Grepable output format flag.
**Solution:** `nmap -sn 10.10.5.0/24 -oG live_hosts.txt` (This sweeps the subnet using ARP/ICMP efficiently and saves a clean, parseable text record).
**Problem:** Perform an aggressive scan against a specific host `192.168.50.25`, forcing Nmap to treat the host as online, scanning all 65,535 TCP ports, and attempting to determine the exact service versions running on any discovered open ports.
**Hint:** Combine the "no ping" flag, the all-ports designation, and the service version detection flag.
**Solution:** `nmap -Pn -p- -sV 192.168.50.25` (This bypasses discovery, exhaustively maps every possible port, and heavily interrogates them for version banners).

## References

- [Nmap Network Scanning (Official Book)](https://nmap.org/book/)
- [Nmap Reference Guide](https://nmap.org/book/man.html)
