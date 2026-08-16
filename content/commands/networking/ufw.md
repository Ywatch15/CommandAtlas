---
slug: ufw
name: ufw
aliases: [Uncomplicated Firewall]
category: networking
tags: [linux, security, firewall, network, ubuntu, debian]
difficulty: beginner
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'manage ubuntu firewall'
  - 'open port on linux'
  - 'allow ip address ufw'
  - 'block network traffic'
  - 'check firewall status'
relatedCommands: [iptables, firewall-cmd, systemctl]
alternatives: [iptables, firewall-cmd]
status: draft
---

## What is it?

`ufw` (Uncomplicated Firewall) is a user-friendly frontend command-line interface for managing Linux firewall rules. Defaulting on Ubuntu and broadly available across Debian-based systems, it provides a heavily simplified, plain-English syntax designed to abstract away the deep complexities of raw `iptables` and `nftables` configurations, allowing administrators to secure a host in seconds without learning complex packet-filtering chains.

## Why does it exist?

The underlying Linux kernel packet filtering framework (`netfilter`, managed via `iptables` or `nftables`) is incredibly powerful but notoriously difficult to learn. Writing a raw rule to allow HTTP traffic requires understanding PREROUTING chains, stateful connection tracking (`-m state --state NEW,ESTABLISHED`), and target jumps. For 95% of servers, administrators only need to open two or three standard ports. `ufw` exists to democratize security. By executing straightforward commands like `ufw allow http`, it dynamically generates and applies the complex, underlying `netfilter` rules in the background, minimizing the risk of a simple typo leaving a server entirely exposed or locked out.

## Syntax

```bash
ufw [--dry-run] [options] [rule syntax]
```

## Flags

| Command / Flag       | Description                                                                                                                     | Example                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `enable` / `disable` | Turns the firewall on or off. Enabling configures UFW to start automatically on system boot.                                    | `ufw enable`                |
| `status`             | Shows the active state of the firewall (active/inactive) and a list of all currently applied rules.                             | `ufw status`                |
| `status numbered`    | Displays the rules with sequential ID numbers. Absolutely critical for deleting specific rules easily.                          | `ufw status numbered`       |
| `allow`              | Adds a rule allowing inbound traffic to a specific port, protocol, or from a specific IP.                                       | `ufw allow 22/tcp`          |
| `deny`               | Adds a rule explicitly blocking and dropping traffic matching the specified criteria.                                           | `ufw deny 3306`             |
| `reject`             | Denies traffic, but actively sends a "Connection Refused" (RST/ICMP) packet back to the sender instead of silently dropping it. | `ufw reject out smtp`       |
| `limit`              | Allows traffic but actively rate-limits connections (e.g., blocking an IP if it attempts 6 connections within 30 seconds).      | `ufw limit ssh`             |
| `delete`             | Removes an existing rule. Best used in conjunction with `status numbered`.                                                      | `ufw delete 3`              |
| `reset`              | Completely flushes all custom rules, resets default policies, and disables the firewall. Returns to a blank slate.              | `ufw reset`                 |
| `default`            | Sets the baseline fallback policy for traffic that doesn't match any explicit rules (usually deny incoming, allow outgoing).    | `ufw default deny incoming` |

## Examples

```bash
ufw allow 443/tcp
```

> The standard port-opening command. Instantly opens port 443 for inbound TCP traffic (HTTPS). UFW automatically updates the underlying kernel rules and persists the configuration so it survives reboots.

```bash
ufw allow from 192.168.1.50 to any port 5432
```

> Enforces IP whitelisting. Instead of exposing a PostgreSQL database (port 5432) to the entire world, this granular rule strictly permits access _only_ if the connection originates from the specific internal IP address `192.168.1.50`.

```bash
ufw limit ssh
```

> Deploys instant brute-force protection. UFW opens the SSH port (22) but automatically injects advanced `iptables` rate-limiting modules. If an attacker attempts to log in more than 6 times in 30 seconds, their IP is actively blocked, heavily mitigating automated dictionary attacks.

```bash
ufw status verbose
```

> Provides a detailed operational summary. It lists the active rules, but additionally confirms the default routing policies (e.g., `Default: deny (incoming), allow (outgoing)`), the logging status, and the underlying routing mode.

```bash
ufw delete allow 80/tcp
```

> The declarative deletion method. Instead of using numbers, you can delete a rule by supplying the exact syntax you used to create it. This finds the active rule allowing port 80 and strips it from the firewall.

## Real-World Scenarios

**Bootstrapping a Secure Web Server**

```bash
ufw reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

> When provisioning a new cloud VPS, the baseline OS is often completely unprotected. A deployment script executes this exact sequence to ensure strict traffic control. It establishes a secure default-drop policy, explicitly punches holes only for administrative and web traffic, and permanently enables the protection layer before deploying application code.

**Rapid Incident Response**

```bash
ufw insert 1 deny from 203.0.113.100
```

> During a live web-application attack, an administrator identifies a malicious IP address flooding the server. Instead of just appending a block rule to the end of the list (which might be overridden by an earlier `allow` rule), they use `insert 1`. This forcefully injects the block rule at the absolute top of the firewall chain, guaranteeing the malicious packets are dropped before hitting any other evaluation logic.

## When should it NOT be used?

- **Docker Environments:** **UFW and Docker are highly antagonistic.** Docker natively manipulates `iptables` directly to perform port-forwarding and NAT. If you use `docker run -p 8080:80`, Docker bypasses UFW entirely, exposing port 8080 to the internet even if UFW states the firewall is active and denies all traffic. Managing Docker with UFW requires complex, manual `iptables` bridge overrides.
- **Complex Enterprise Routing:** If your server acts as a core network router requiring complex SNAT/DNAT routing, multi-interface masquerading, or deep packet inspection/mangling, UFW's simplified syntax is too restrictive. Use `nftables` or `firewall-cmd`.
- **Red Hat / CentOS Systems:** `ufw` is an Ubuntu/Canonical project. While porting is possible, RHEL ecosystems natively use `firewalld`. Mixing the two causes catastrophic configuration clashes.

## Alternatives

- **`firewall-cmd` (`firewalld`):** **Best for RHEL/CentOS.** The default firewall manager for the Red Hat ecosystem. More complex than UFW but natively supports multi-homed "zones" for advanced network interface separation.
- **`iptables` / `nftables`:** **Best for absolute control.** The actual low-level utilities. UFW is simply a frontend wrapper written in Python that translates your commands into these raw kernel primitives.

## How it works internally

UFW does not filter packets. It is a configuration manager written in Python.

When you execute `ufw allow 80`, UFW parses the command and updates its flat-file configurations located in `/etc/ufw/` (such as `user.rules` and `user6.rules`).

It then translates these directives into complex `iptables-restore` (or `nftables` in newer releases) commands. It structures rules into distinct chains (e.g., `ufw-user-input`, `ufw-before-input`).

When you run `ufw enable`, it hooks into the system boot process (via `systemd` or `init`). During boot, before the network interfaces are brought fully online, the UFW service reads the saved `.rules` files and executes the underlying netfilter commands, rapidly injecting the compiled firewall logic into the Linux kernel's memory space.

UFW natively handles both IPv4 and IPv6 simultaneously. When you type `ufw allow 22`, UFW automatically translates and applies the rule to both the `iptables` (IPv4) and `ip6tables` (IPv6) kernel structures, saving the administrator from maintaining two separate, divergent firewall schemas.

## Performance Notes

- **Rule Ordering Matters:** Firewalls evaluate rules sequentially from top to bottom. Once a packet matches a rule, evaluation stops. If you have 5,000 explicitly blocked IP addresses, and your `allow 443` rule is at the bottom, every legitimate web request must be checked against 5,000 rules, burning CPU cycles. Use `ufw insert 1 allow 443` to ensure high-volume legitimate traffic hits an `allow` rule immediately.

## Security Notes

- **Remote Lockout Threat:** UFW does not have an automatic rollback feature. If you are connected via SSH and run `ufw enable` _before_ explicitly running `ufw allow ssh`, UFW will instantly drop your active connection and lock you out of the server permanently. You will have to use the cloud provider's out-of-band serial console to recover access.
- **The Default Policy:** By default, UFW drops incoming traffic. This means internal services (like an unsecured Redis or MongoDB instance bound to `0.0.0.0`) are shielded from the internet. If an administrator blindly runs `ufw default allow incoming` while debugging, they instantly expose every running application to global exploitation.

## Common Mistakes

- **Forgetting to allow SSH before enabling**
  - _Mistake:_ Installing a server, typing `ufw enable`, and losing the SSH connection instantly.
  - _Why:_ The default UFW posture denies all incoming connections. You must _always_ execute `ufw allow ssh` prior to enabling the service to ensure the administrative pathway remains unblocked.
- **Trying to delete rules loosely**
  - _Mistake:_ Running `ufw allow 80`, later deciding to block it, and running `ufw deny 80`.
  - _Why:_ This does not delete the first rule; it creates a conflicting rule. Depending on rule order, port 80 might still be open. You must explicitly remove rules using `ufw delete allow 80` or use `ufw status numbered` and `ufw delete <number>`.

## Best Practices

- **Leverage Application Profiles:** UFW supports app profiles stored in `/etc/ufw/applications.d/`. Instead of opening raw ports (`ufw allow 80 443`), use `ufw allow 'Nginx Full'`. This is vastly more readable for future audits and groups multi-port requirements logically.
- **Use `status numbered` for maintenance:** Never guess when deleting rules. Always run `ufw status numbered` to view the exact execution order, then issue `ufw delete 4`. It guarantees you surgically remove the exact line of logic intended without accidentally wiping a similar rule.

## Interview Questions

**Q: You have an active UFW firewall. You use Docker to run a web server mapped to port 8080 (`docker run -p 8080:80 nginx`). You check `ufw status` and port 8080 is NOT listed. However, you can access the website from the public internet. How is this possible, and why did UFW fail to block it?**
**A:** Docker fundamentally bypasses UFW. UFW manages the standard `INPUT` chain in `iptables`. Docker operates by injecting NAT routing rules into the `PREROUTING` and `DOCKER` chains, which are evaluated by the Linux kernel _before_ the UFW `INPUT` chain. Therefore, the kernel routes the internet traffic directly to the Docker container, and UFW is completely unaware the traffic even exists.

**Q: Explain the exact sequence of commands you would run to completely wipe out all existing UFW rules and return the firewall to a safe, default state where only SSH and HTTP are allowed.**
**A:**

1. `ufw reset` (Flushes all custom rules and disables the firewall)
2. `ufw default deny incoming` (Ensures safe baseline policy)
3. `ufw default allow outgoing` (Allows server to reach the internet)
4. `ufw allow ssh` (Maintains administrative access)
5. `ufw allow http` (Permits web traffic)
6. `ufw enable` (Activates the new rule set)

## Practice Problems

**Problem:** A malicious actor at IP address `203.0.113.55` is attacking your server. Write the command to explicitly drop all traffic from this IP address, regardless of what port they are attempting to hit.
**Hint:** Use the explicit IP source syntax with the deny action.
**Solution:**

```bash
ufw deny from 203.0.113.55
```

**Problem:** You have several complex rules configured. You need to delete one specific rule, but typing out the exact syntax is tedious and prone to typos. Write the command to display your firewall rules with ID numbers next to them, so you can delete a rule by its number.
**Hint:** Request the status using the specific numbered output format.
**Solution:**

```bash
ufw status numbered
```

## References

- [UFW (Uncomplicated Firewall) - Ubuntu Wiki](https://help.ubuntu.com/community/UFW)
- [UFW manual page](https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html)
