---
slug: firewall-cmd
name: firewall-cmd
aliases: []
category: networking
tags: [linux, security, firewall, network, red-hat, firewalld]
difficulty: intermediate
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'open port in firewalld'
  - 'manage linux firewall'
  - 'reload firewall rules'
  - 'allow service through firewall'
  - 'check active firewall zones'
relatedCommands: [iptables, ufw, systemctl]
alternatives: [iptables, ufw]
status: draft
---

## What is it?

`firewall-cmd` is the primary command-line client for `firewalld`, the default dynamic firewall management daemon utilized in Red Hat Enterprise Linux (RHEL), Fedora, CentOS, and their derivatives. It provides a high-level, zone-based interface to manage network traffic filtering, allowing administrators to seamlessly open ports, whitelist services, and configure NAT routing without manually calculating complex, low-level `iptables` or `nftables` syntax chains.

## Why does it exist?

Historically, Linux firewalls were managed by directly manipulating `iptables` rules. Modifying an active `iptables` chain required flushing and reloading the entire rule set, immediately dropping all established, active network connections. Furthermore, raw `iptables` syntax is extremely complex and error-prone. `firewalld` exists to solve this by acting as an intelligent D-Bus daemon overlay. `firewall-cmd` interacts with this daemon, enabling administrators to apply rules dynamically. It introduces the concept of "Zones" (e.g., `public`, `trusted`, `dmz`), allowing different trust levels to be bound to different network interfaces, dramatically simplifying security posture management for multi-homed servers.

## Syntax

```bash
firewall-cmd [OPTIONS...]
```

## Flags

| Flag                      | Description                                                                                                                         | Example                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `--state`                 | Checks if the underlying `firewalld` daemon is actively running and processing rules.                                               | `firewall-cmd --state`                                                               |
| `--reload`                | Flushes the ephemeral runtime configuration and reapplies the saved permanent configuration without dropping connections.           | `firewall-cmd --reload`                                                              |
| `--permanent`             | Forces the command to modify the persistent XML configuration files on disk rather than the live runtime environment.               | `firewall-cmd --permanent --add-port=80/tcp`                                         |
| `--get-active-zones`      | Lists the zones that currently have active network interfaces or source subnets bound to them.                                      | `firewall-cmd --get-active-zones`                                                    |
| `--zone=<zone>`           | Explicitly targets a specific zone (e.g., `public`, `internal`) for the rule modification. Defaults to the default zone if omitted. | `firewall-cmd --zone=dmz --add-service=http`                                         |
| `--add-port=<port/proto>` | Opens a specific network port and protocol (tcp/udp) for inbound traffic.                                                           | `firewall-cmd --add-port=8080/tcp`                                                   |
| `--add-service=<service>` | Opens ports associated with a predefined service (e.g., `ssh`, `https`), relying on XML files in `/usr/lib/firewalld/services/`.    | `firewall-cmd --add-service=postgresql`                                              |
| `--remove-port=<...>`     | Closes a previously opened port, dropping subsequent traffic.                                                                       | `firewall-cmd --remove-port=8080/tcp`                                                |
| `--list-all`              | Outputs a comprehensive summary of all ports, services, interfaces, and rich rules actively configured in the target zone.          | `firewall-cmd --zone=public --list-all`                                              |
| `--add-rich-rule=<rule>`  | Injects complex, granular logic (e.g., allowing specific IPs to reach specific ports while logging the connection).                 | `firewall-cmd --add-rich-rule='rule family="ipv4" source address="10.0.0.5" reject'` |

## Examples

```bash
firewall-cmd --list-all
```

> The standard audit command. Displays the complete active configuration for the default zone (usually `public`). It shows which network interfaces are bound to the zone, which services (`ssh`, `dhcpv6-client`) are allowed, and explicitly lists open ports.

```bash
firewall-cmd --add-port=3306/tcp --permanent
firewall-cmd --reload
```

> The canonical workflow for opening a port. The first command writes the configuration to disk (`--permanent`), ensuring the port remains open after the server reboots. The second command instructs the daemon to hot-reload the disk configuration into the live kernel, applying the change immediately.

```bash
firewall-cmd --zone=trusted --add-source=192.168.50.0/24 --permanent
```

> Enforces a subnet-based trust architecture. It binds the entire `192.168.50.0/24` subnet to the `trusted` zone. Because the default policy for the `trusted` zone is `ACCEPT`, any machine originating from that subnet bypasses standard firewall restrictions and enjoys full access to the server.

```bash
firewall-cmd --add-rich-rule='rule family="ipv4" source address="203.0.113.50" port port="22" protocol="tcp" accept' --permanent
```

> Executes a granular "Rich Rule". Instead of broadly opening port 22 to the entire internet, this command explicitly whitelists a single, specific external IP address to access the SSH port, dropping all other connection attempts.

```bash
firewall-cmd --zone=public --add-masquerade --permanent
```

> Enables NAT (Network Address Translation) masquerading on the public zone. This is heavily utilized when configuring a Linux server to act as a router for a private internal network, rewriting outbound packet headers to appear as if they originated from the router itself.

## Real-World Scenarios

**Emergency Threat Mitigation**

```bash
firewall-cmd --panic-on
```

> During an active cyberattack (like an overwhelming DDoS or active data exfiltration), an administrator executes this command. It immediately overrides all existing rules, severing every single inbound and outbound network connection (including the admin's SSH session), completely quarantining the compromised machine from the network instantly. (`firewall-cmd --panic-off` reverses this, requiring console access).

**Exposing Web Services Reliably**

```bash
firewall-cmd --add-service=http --add-service=https --permanent
firewall-cmd --reload
```

> Instead of manually memorizing that HTTP is port 80 and HTTPS is 443, system administrators use the service abstraction. The daemon parses the internal XML definition files, extracts the correct ports and protocols, and injects them into the firewall. This makes the firewall configuration highly readable for future auditors.

## When should it NOT be used?

- **Docker/Kubernetes Hosts:** **Do not use `firewall-cmd` to manage ports for containerized workloads.** Docker bypasses `firewalld` by directly injecting rules into the `iptables` `DOCKER` and `PREROUTING` chains. If you map `-p 8080:80` in Docker, the port is exposed to the internet, regardless of whether you ran `firewall-cmd --add-port=8080`. They operate in parallel universes.
- **Ubuntu/Debian Systems:** `firewalld` is native to the Red Hat ecosystem. While it can be installed on Debian, Ubuntu natively relies on `ufw` (Uncomplicated Firewall). Mixing tools causes severe configuration conflicts.
- **Massive Core Routers:** For complex, enterprise-grade Linux routing appliances executing thousands of lines of BGP routing and QoS packet-mangling, the high-level `firewalld` abstractions are too rigid. Administrators typically write native `nftables` payloads directly for optimal control and kernel performance.

## Alternatives

- **`ufw` (Uncomplicated Firewall):** **Best for Debian/Ubuntu.** A similarly high-level firewall wrapper heavily adopted in the Debian ecosystem. Its syntax is significantly simpler (e.g., `ufw allow 80/tcp`) but it lacks the robust Zone-based architectures native to `firewalld`.
- **`iptables` / `nftables`:** **Best for absolute control.** The actual low-level utilities that configure the Linux kernel netfilter framework. `firewalld` is essentially a Python daemon translating your commands into raw `nftables` rules.

## How it works internally

When you execute `firewall-cmd`, it does not talk to the Linux kernel directly. Instead, it acts as an RPC (Remote Procedure Call) client.

It connects to the system D-Bus message bus and sends the requested instruction to the long-running Python daemon process, `firewalld`.

`firewalld` maintains two completely separate environments:

1.  **Runtime:** The live rules actively enforced by the kernel.
2.  **Permanent:** The XML configuration files stored in `/etc/firewalld/`.

If you run `firewall-cmd --add-port=80/tcp`, the daemon dynamically translates this request into a raw kernel command (historically invoking the `iptables` binary, but in modern RHEL 8+, it hooks directly into the `nftables` kernel API). The kernel updates its netfilter routing tables, and the port is instantly opened. However, because you did not specify `--permanent`, the XML files on the hard drive were completely untouched.

When the server reboots (or when you run `firewall-cmd --reload`), the `firewalld` daemon starts up, clears the kernel's runtime memory, and reads the XML files from the disk to reconstruct the active state, wiping out any ephemeral changes.

## Performance Notes

- **Zero-Downtime Reloads:** The architectural triumph of `firewalld` is its reload mechanism. Because the daemon explicitly tracks state, running `firewall-cmd --reload` calculates the exact mathematical diff between the new XML files and the live kernel rules, and issues targeted `nftables` updates to bridge the gap. This prevents the traditional connection dropping associated with legacy firewall restarts.

## Security Notes

- **Default Zone Danger:** By default, all network interfaces are assigned to the `public` zone. The `public` zone defaults to dropping all incoming traffic _except_ for SSH and DHCPv6. If you change your default zone to `trusted` (`--set-default-zone=trusted`), you instantly disable the firewall for all interfaces, exposing every open socket to the internet.
- **Rich Rule Evaluation:** Rich rules are evaluated before standard port and service rules. If you have a rich rule dropping all traffic from an IP, but a standard rule exposing port 80, the drop rule wins. Understanding this execution hierarchy is critical to preventing unintentional exposure.

## Common Mistakes

- **The Runtime/Permanent Trap**
  - _Mistake:_ Running `firewall-cmd --add-port=443/tcp` to fix a broken web server, celebrating when it works, and going home. The server reboots a week later and the website goes offline.
  - _Why:_ Without `--permanent`, the change is ephemeral. It vanishes on reload/reboot. A robust workflow requires applying the permanent rule and reloading the daemon: `firewall-cmd --add-port=443/tcp --permanent && firewall-cmd --reload`.
- **Reloading invalidly**
  - _Mistake:_ Using `systemctl restart firewalld` instead of `firewall-cmd --reload`.
  - _Why:_ Restarting the `systemd` service brutally terminates the daemon, temporarily flushes the kernel rules, and destroys internal state mapping, frequently causing active TCP connections to drop. Always use the CLI's native reload function.

## Best Practices

- **Leverage Zones for Interfaces:** If a server has two NICs—one facing the internet (`eth0`) and one facing a private database network (`eth1`)—bind `eth0` to the `public` zone and `eth1` to the `internal` zone (`firewall-cmd --zone=internal --change-interface=eth1`). You can now apply wildly different security policies to each network cleanly.
- **Audit with `iptables`:** Even when using `firewalld`, occasionally run `iptables-save` or `nft list ruleset`. Inspecting the raw kernel rules generated by the daemon helps you understand exactly how your high-level zones are being translated into low-level packet filters.

## Interview Questions

**Q: You successfully run `firewall-cmd --add-port=8080/tcp` to expose a new application. The application is reachable. You then run `firewall-cmd --reload`. Suddenly, the application is unreachable. What caused this?**
**A:** You forgot to append the `--permanent` flag during the initial command. `firewall-cmd` applied the port opening exclusively to the volatile "runtime" environment. When you ran `--reload`, the daemon wiped the runtime environment and reloaded the state from the XML files on disk. Because the configuration was never saved to the disk, the port was closed during the reload.

**Q: In `firewalld`, how does the daemon determine which "Zone" should handle an incoming network packet?**
**A:** The daemon evaluates packets hierarchically based on three bindings. First, it checks if the source IP of the incoming packet explicitly matches an IP bound to a zone (Source routing). Second, if no source matches, it checks which physical network interface (e.g., `eth0`) the packet arrived on, and uses the zone bound to that interface. Third, if the interface is unbound, it defaults to routing the packet through the system's global Default Zone.

## Practice Problems

**Problem:** You are deploying an internal Redis cache. You need to open TCP port 6379, but you must ensure the port remains open permanently across reboots. Write the two commands required to save this configuration and actively apply it to the running firewall.
**Hint:** First, add the port to the permanent configuration. Second, instruct the daemon to implement the saved configuration.
**Solution:**

```bash
firewall-cmd --add-port=6379/tcp --permanent
firewall-cmd --reload
```

**Problem:** You need to audit the current firewall rules to see what ports are actively open on the default zone right now. Write the command to display a summary of the active configuration.
**Hint:** Use the flag that outputs all settings for a zone.
**Solution:**

```bash
firewall-cmd --list-all
```

## References

- [firewall-cmd(1) - Linux man page](https://linux.die.net/man/1/firewall-cmd)
- [Using and Configuring firewalld (Red Hat Documentation)](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/securing_networks/using-and-configuring-firewalld_securing-networks)
