---
slug: iptables
name: iptables
aliases: []
category: networking
tags: [linux, security, firewall, network, nat, netfilter]
difficulty: advanced
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'configure linux firewall'
  - 'block ip address iptables'
  - 'open port 80 iptables'
  - 'setup network address translation nat'
  - 'list active firewall rules'
relatedCommands: [ip, netstat, ufw, firewall-cmd]
alternatives: [ufw, firewall-cmd]
status: draft
---

## What is it?

`iptables` is a user-space utility program that allows system administrators to configure the IP packet filter rules of the Linux kernel firewall, implemented via the Netfilter framework. It is used to define highly granular rulesets that inspect, allow, block, modify, or route incoming, outgoing, and forwarded network traffic.

## Why does it exist?

Operating systems connected to untrusted networks require a robust mechanism to defend against unauthorized access, drop malicious packets, and route internal traffic to external interfaces (NAT). While the Linux kernel provides the `Netfilter` hooks to intercept network packets, it requires an interface to define the logic. `iptables` exists to provide this interface, allowing operators to construct complex chains of conditional rules (matching by IP, port, or state) to dictate exactly how the kernel handles every traversing packet.

## Syntax

```bash
iptables [-t table] {-A|-C|-D} chain rule-specification
iptables [-t table] {-L|-F|-Z} [chain]
```

## Flags

| Flag               | Description                                                                                       | Example                                                |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `-t <table>`       | Specifies the table to operate on (`filter`, `nat`, `mangle`, `raw`). Defaults to `filter`.       | `iptables -t nat -L`                                   |
| `-A`, `--append`   | Appends one or more rules to the end of the specified chain (e.g., `INPUT`, `FORWARD`).           | `iptables -A INPUT -p tcp`                             |
| `-I`, `--insert`   | Inserts a rule into a chain at the specified index (defaults to index 1, the very top).           | `iptables -I INPUT 1 -p tcp`                           |
| `-D`, `--delete`   | Deletes a rule from a chain, either by matching the exact rule specification or by index number.  | `iptables -D INPUT 1`                                  |
| `-L`, `--list`     | Lists all the rules currently configured within the selected chain.                               | `iptables -L -n -v`                                    |
| `-F`, `--flush`    | Deletes (flushes) all rules within the selected chain or table.                                   | `iptables -F INPUT`                                    |
| `-P`, `--policy`   | Sets the default policy (action) for a built-in chain (e.g., `ACCEPT` or `DROP`).                 | `iptables -P FORWARD DROP`                             |
| `-p`, `--protocol` | Specifies the network protocol to match (e.g., `tcp`, `udp`, `icmp`, `all`).                      | `iptables -A INPUT -p icmp`                            |
| `-s`, `--source`   | Matches the source IP address or CIDR network of the packet.                                      | `iptables -A INPUT -s 10.0.0.0/8`                      |
| `--dport`          | Matches a specific destination port or port range (requires `-p tcp` or `-p udp`).                | `iptables -A INPUT -p tcp --dport 22`                  |
| `-j`, `--jump`     | Specifies the action to take if the packet matches the rule (`ACCEPT`, `DROP`, `REJECT`, `SNAT`). | `iptables -A INPUT -j DROP`                            |
| `-m`, `--match`    | Loads extended matching modules (e.g., `state`, `conntrack`, `multiport`).                        | `iptables -A INPUT -m conntrack --ctstate ESTABLISHED` |

## Examples

```bash
iptables -L -n -v
```

> This lists all rules in the default `filter` table. The `-n` flag prevents reverse-DNS resolution (preventing extreme latency), and `-v` displays packet and byte counters confirming if rules are actively blocking traffic.

```bash
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

> This appends a rule to the `INPUT` chain, instructing the kernel to `ACCEPT` (allow) any incoming TCP packets destined for port `22` (SSH), ensuring remote administrative access remains open.

```bash
iptables -I INPUT 1 -s 203.0.113.50 -j DROP
```

> This forcefully inserts a rule at position `1` (the very top of the chain) to `DROP` all traffic originating from a malicious IP address, overriding any subsequent `ACCEPT` rules below it.

```bash
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

> This implements stateful inspection. It accepts all incoming packets that belong to existing connections (or connections related to them, like FTP data streams), ensuring outbound requests receive their return traffic.

```bash
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

> This operates on the `nat` table. It instructs the kernel to dynamically rewrite the source IP of all outbound traffic leaving the `eth0` interface to match `eth0`'s IP address, functioning as standard home-router NAT.

## Real-World Scenarios

**Implementing a Default-Deny Firewall Posture**

```bash
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
```

> Security engineers lock down web servers by setting the default policy to `DROP`. They then whitelist the loopback interface, allow return traffic for established connections, and punch a single hole exclusively for HTTP web traffic.

**Port Forwarding to Internal Containers/VMs**

```bash
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 192.168.1.10:80
```

> DevOps administrators map a host port to an isolated internal environment. Any external request hitting the host on port `8080` undergoes Destination NAT (`DNAT`) and is seamlessly rewritten and routed to the internal virtual machine on port `80`.

**Throttling Brute Force SSH Attacks**

```bash
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
```

> Systems administrators leverage the `recent` module to track incoming SSH requests. If a single IP attempts to initiate more than 3 new connections within 60 seconds, `iptables` automatically drops the 4th packet, mitigating automated brute-force attacks.

## When should it NOT be used?

- **Modern infrastructure using `nftables`:** **Reason:** `iptables` is officially deprecated in modern Linux kernels in favor of `nftables`, which provides atomic rule updates, better syntax, and superior performance. **Use instead:** `nft`.
- **Managing complex dynamic infrastructure (Docker/K8s):** **Reason:** Container orchestration engines manipulate iptables heavily in the background. Manually writing static rules using the `iptables` CLI will cause violent conflicts with Docker's networking overlay. **Use instead:** Security Groups (Cloud) or Kubernetes NetworkPolicies.

## Alternatives

- **`nftables` (`nft`):** The modern kernel replacement for Netfilter. **Tradeoff:** `nftables` completely replaces the fragmented `iptables`, `ip6tables`, and `arptables` with a single unified, transactional CLI tool, but requires learning a completely different scripting syntax.
- **`ufw` (Uncomplicated Firewall):** Ubuntu/Debian frontend. **Tradeoff:** `ufw` translates incredibly simple commands (`ufw allow 80`) into complex `iptables` rules, masking the steep learning curve, but sacrificing deep granular routing control.
- **`firewalld`:** RHEL/CentOS dynamic firewall manager. **Tradeoff:** It introduces the concept of network "zones" and allows runtime updates without dropping active connections.

## How it works internally

`iptables` is merely a user-space configuration tool; the actual filtering occurs in the Linux kernel via the **Netfilter** framework.

Netfilter provides a set of hooks at specific points in the networking stack: `PREROUTING` (before routing decisions), `INPUT` (destined for local sockets), `FORWARD` (routing through the box), `OUTPUT` (originating from local sockets), and `POSTROUTING` (just before transmission).

When you run `iptables`, the CLI translates your command into binary structures and uses a specialized `setsockopt()` system call to push the new ruleset into the kernel memory. The kernel groups these rules into **Tables** (`filter` for security, `nat` for translation, `mangle` for packet alteration).

As a packet traverses the network stack, Netfilter matches it sequentially against the ordered list of rules within the relevant table/chain. The moment a packet matches a rule containing a terminating action (`-j ACCEPT` or `-j DROP`), evaluation halts for that chain, and the action is executed. If no rules match, the chain's default Policy (`-P`) dictates the packet's fate. On modern systems, `iptables` is often a compatibility wrapper (`iptables-nft`) that transparently translates legacy iptables syntax into `nftables` byte-code.

## Performance Notes

- Rule evaluation in `iptables` is strictly linear O(N). If you have 10,000 IP addresses individually banned via `-A INPUT -s IP -j DROP`, every legitimate packet must be evaluated against all 10,000 rules before being accepted, resulting in devastating CPU consumption and network latency.
- To resolve linear evaluation bottlenecks, operators must use `ipset`, which stores thousands of IP addresses in a high-speed kernel hash table that `iptables` can query in O(1) constant time (`-m set --match-set`).

## Security Notes

- **Rule Ordering Vulnerabilities:** Appending (`-A`) a block rule at the end of a chain where a blanket `ACCEPT` rule already exists higher up renders the block rule entirely useless. Strict evaluation ordering must be maintained.
- **Volatile Memory:** Rules added via the `iptables` CLI are strictly ephemeral. If the server reboots, all firewall rules vanish, leaving the system wide open. You must persist rules using `iptables-save > /etc/iptables/rules.v4` and a boot-time restoration script (`iptables-persistent`).

## Common Mistakes

- **Locking yourself out via SSH:** Running `iptables -P INPUT DROP` before adding a rule allowing SSH. **Why it's wrong:** The instant you hit Enter, the kernel drops your active SSH connection and bans new ones. You are permanently locked out of the server and must access it via out-of-band serial consoles.
- **Forgetting to allow established connections:** Setting an INPUT drop policy and opening outbound port 80, but web requests fail. **Why it's wrong:** While outbound requests succeed, the remote server's response packets hit the `INPUT` chain and are dropped. You must explicitly allow `ESTABLISHED` return traffic.
- **Running `iptables -F` on Docker hosts:** **Why it's wrong:** Docker heavily relies on custom NAT tables and `DOCKER-USER` chains to route container traffic. Running a global flush wipes out Docker's routing, instantly taking down all containerized applications.

## Best Practices

- Always structure firewall scripts defensively: set default policies to `ACCEPT` while building rules, define the `ESTABLISHED,RELATED` connection tracking rule first, ensure SSH is allowed, and only switch the default policy to `DROP` at the very end of the script.
- Use the `iptables-apply` command when writing rule files. It acts as a safety mechanism, applying rules and prompting for confirmation. If you lose SSH connectivity and don't confirm within 10 seconds, it automatically rolls back the changes.
- Minimize logging: using `-j LOG` on broad rules (like dropped internet noise) will quickly exhaust system disk space via `/var/log/syslog` bloat. Always use `-m limit` when logging packets.

## Interview Questions

- **Q:** Describe the architectural difference between the `filter` table and the `nat` table in iptables.
  - **A:** The `filter` table is the default table used strictly for security decisions: deciding whether to `ACCEPT`, `DROP`, or `REJECT` a packet traversing the network stack. The `nat` table is used exclusively for altering packet headers (Network Address Translation). It rewrites source or destination IPs and ports (SNAT/DNAT/MASQUERADE) to facilitate routing, but does not perform security filtering.
- **Q:** Why does replacing 5,000 individual `iptables -A INPUT -s <IP> -j DROP` rules with a single `ipset` rule drastically improve network throughput?
  - **A:** Standard `iptables` chains evaluate packets linearly. Every incoming packet must be checked sequentially against all 5,000 rules, causing massive CPU overhead. `ipset` stores the 5,000 IPs in a highly optimized kernel hash table. A single iptables rule queries this hash table, validating the packet's source IP in O(1) constant time, eliminating the evaluation bottleneck.
- **Q:** You run `iptables -F` to flush all rules, expecting everything to be permitted, but suddenly all network connectivity to the server stops. What happened?
  - **A:** Flushing the rules deletes all custom rules, but it does _not_ reset the chain's default Policy. If the administrator had previously run `iptables -P INPUT DROP`, flushing the explicit `ACCEPT` rules leaves only the default `DROP` policy active, instantly blocking all inbound traffic. You must run `iptables -P INPUT ACCEPT` before flushing.

## Practice Problems

- _Problem:_ Append a rule to the firewall that drops all incoming ICMP (ping) requests to the server to prevent basic network discovery, while leaving all other traffic untouched.
  - _Hint:_ Target the input chain, specify the protocol, and set the jump target to drop.
  - _Solution:_ `iptables -A INPUT -p icmp -j DROP` (This intercepts ICMP echo requests and silently discards the packets).
- _Problem:_ Delete a previously added rule from the INPUT chain that allowed port 8080, assuming you don't want to type out the entire rule specification again.
  - _Hint:_ List the rules with line numbers, then use the delete command specifying the chain and line index.
  - _Solution:_ `iptables -L INPUT --line-numbers` followed by `iptables -D INPUT <line_number>` (This precisely unlinks and removes the specific rule based on its array index).

## References

- [Netfilter/iptables Project Homepage](https://www.netfilter.org/)
- [Man Page for iptables (Linux)](https://man7.org/linux/man-pages/man8/iptables.8.html)
