---
slug: hostname
name: hostname
aliases: []
category: networking
tags: [linux, networking, system-identity, configuration]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'show computer name'
  - 'set linux hostname'
  - 'find local ip address'
  - 'display fully qualified domain name'
  - 'check system identity'
relatedCommands: [ifconfig, ip]
alternatives: []
status: draft
---

## What is it?

`hostname` is a fundamental POSIX system utility used to display or temporarily modify the system's DNS name (identity). It interfaces directly with the Linux kernel to retrieve or overwrite the `nodename` attribute, allowing networking protocols, system loggers (like `syslog`), and local applications to accurately identify the specific machine they are running on within a distributed network.

## Why does it exist?

In networked environments, IP addresses are volatile and difficult for humans to track. Machines require a localized, human-readable identity to associate with logs, establish SSH trusts, and identify themselves during DHCP handshakes. The `hostname` utility exists to expose a simple standard interface to the `gethostname()` and `sethostname()` C system calls. While originally designed to manage simplistic hostnames, it evolved to encompass complex Fully Qualified Domain Name (FQDN) resolutions and IP mapping, bridging the gap between raw kernel identity and external DNS infrastructure.

## Syntax

```bash
hostname [options]
hostname [new_hostname]
```

## Flags

| Flag                       | Description                                                                                                   | Example                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `-f`, `--fqdn`, `--long`   | Displays the Fully Qualified Domain Name (FQDN) by appending the local DNS domain name to the short hostname. | `hostname -f`               |
| `-s`, `--short`            | Displays the short hostname, stripping away the DNS domain name (everything after the first dot).             | `hostname -s`               |
| `-i`, `--ip-address`       | Evaluates the resolvable hostname and returns the local network IP address(es) associated with it.            | `hostname -i`               |
| `-I`, `--all-ip-addresses` | Displays all configured IP addresses across all active network interfaces, bypassing standard DNS resolution. | `hostname -I`               |
| `-d`, `--domain`           | Displays the DNS domain name of the system (the FQDN minus the short hostname).                               | `hostname -d`               |
| `-F`, `--file <file>`      | Sets the system hostname by reading the exact string from the specified text file.                            | `hostname -F /etc/hostname` |
| `-V`, `--version`          | Outputs the version information of the `hostname` utility and exits.                                          | `hostname -V`               |

## Examples

```bash
hostname
```

> The standard invocation. Reads the kernel memory state and outputs the current, active string serving as the machine's identity (e.g., `web-worker-04`).

```bash
sudo hostname new-db-server
```

> The imperative modification pattern. Invokes the `sethostname()` syscall to immediately alter the kernel's active hostname to `new-db-server`. This change is purely ephemeral; it updates the live system memory but will completely revert to the original name upon the next reboot.

```bash
hostname -I
```

> The quick IP extraction tool. Often used in bash scripts, it sweeps the system's network interfaces and outputs a space-separated list of all actively bound IP addresses (e.g., `192.168.1.15 10.0.0.5`), completely ignoring loopback (`127.0.0.1`) interfaces.

```bash
hostname -f
```

> Extracts the Fully Qualified Domain Name. The utility resolves the local short hostname against the `/etc/hosts` file or DNS resolver (e.g., transforming `web-01` into `web-01.internal.corp.com`). Critical for configuring services like Apache or Postfix that require absolute global identifiers.

## Real-World Scenarios

**Bootstrapping Cloud Instances**

```bash
# Executed via cloud-init user-data scripts
NEW_NAME="worker-node-$(uuidgen | cut -c1-8)"
echo $NEW_NAME > /etc/hostname
hostname -F /etc/hostname
```

> When AWS EC2 or GCP instances auto-scale, they boot with randomized default hostnames. An automated bootstrapping script generates a unique structural name, writes it to the persistent `/etc/hostname` file to survive reboots, and immediately calls `hostname -F` to inject that file's contents into the live kernel, allowing subsequent log-forwarding agents to start with the correct machine identity immediately.

**Dynamic Configuration Generation**

```bash
MY_IP=$(hostname -I | awk '{print $1}')
sed -i "s/BIND_IP/$MY_IP/g" /etc/redis/redis.conf
```

> A configuration management script relies on `hostname -I` to dynamically discover the machine's primary internal IP address. It isolates the first IP in the list and uses `sed` to inject it into a database configuration file, ensuring the database binds strictly to the active network interface rather than `0.0.0.0`.

## When should it NOT be used?

- **Persistent Configuration:** **Do not use `hostname my-server` to permanently rename a machine.** `hostname` only manipulates volatile kernel memory. To permanently rename a modern Linux system, use `hostnamectl set-hostname my-server`, which modifies the live kernel _and_ writes the changes to `/etc/hostname`.
- **Parsing Multiple IPs:** `hostname -I` simply prints a flat list of IPs. If you need to know _which_ IP belongs to `eth0` versus `docker0`, `hostname` is useless. You must use `ip addr show`.

## Alternatives

- **`hostnamectl`:** **The modern standard.** Distributed with `systemd`, it permanently manages static, transient, and pretty hostnames, completely deprecating the manual `/etc/hostname` + `hostname` binary workflow on modern distributions.
- **`uname -n`:** **Best for pure identity extraction.** Retrieves the system `nodename` directly from the `uname()` system call, providing an identical result to `hostname` without relying on the specific `hostname` binary.
- **`ip addr`:** **Best for IP discovery.** The definitive tool for extracting network interface details, rendering `hostname -I` obsolete for complex routing needs.

## How it works internally

When you type `hostname`, the utility executes the `uname()` C system call (specifically inspecting the `nodename` field of the returned `utsname` structure), or directly invokes the `gethostname()` system call to request the active string from the Linux kernel.

Setting the hostname (`hostname new-name`) requires root privileges and invokes the `sethostname()` system call. This instantly overwrites the string located in the kernel's memory space (visible manually at `/proc/sys/kernel/hostname`).

The complexity arises when using flags like `-f` (FQDN) or `-i` (IP Address). The kernel _does not_ know its own FQDN. When you request the FQDN, the `hostname` utility takes the short kernel nodename and passes it to the `getaddrinfo()` function in the C standard library.

The OS resolver (governed by `/etc/nsswitch.conf`) intercepts this. It typically looks inside `/etc/hosts` first. If it finds a line mapping the local IP to a long name (e.g., `127.0.1.1 web-01.corp.local web-01`), it extracts the long name and returns it as the FQDN. If `/etc/hosts` lacks a mapping, it relies on DNS reverse-lookups to deduce its own global identity.

## Performance Notes

- **DNS Timeout Delays:** Running `hostname -f` or `hostname -i` relies on the OS resolver. If your `/etc/hosts` file is misconfigured and your local DNS server is unreachable, the `getaddrinfo()` call will block and the command will hang for several seconds until a timeout occurs.

## Security Notes

- **Service Authentication Failures:** Many local services (like Postfix, Kerberos, or `sudo`) aggressively rely on the ability to resolve the system's hostname to an IP address (`127.0.0.1`). If you run `hostname new-name` without subsequently updating the `/etc/hosts` file to match `new-name`, these services will fail to start or hang indefinitely because they cannot resolve their own local identity.

## Common Mistakes

- **Assuming FQDNs are hardcoded**
  - _Mistake:_ Using `hostname -f` expecting it to magically know the domain, but receiving the short hostname instead.
  - _Why:_ The FQDN is fundamentally a DNS construct, not a kernel property. If you have not explicitly configured an absolute entry in `/etc/hosts` tying your short hostname to a domain, or configured the network interface DHCP lease to append a search domain, `hostname -f` will simply fallback to the short kernel name.
- **Using `hostname` for permanent changes**
  - _Mistake:_ Running `sudo hostname prod-db` and deploying to production.
  - _Why:_ The change is ephemeral. During the next patch reboot, the `systemd-hostnamed` service will read the unmodified `/etc/hostname` file and revert the server's identity to the old name, causing severe metric-reporting and logging inconsistencies.

## Best Practices

- **Use `hostnamectl` for edits:** Eradicate the `hostname` command from your provisioning scripts when setting names. Always use `hostnamectl set-hostname <name>`. It safely manages the kernel update, the disk file update, and notifies other `systemd` components of the state change simultaneously.
- **Use `-I` in scripts carefully:** While `hostname -I` is an easy way to get an IP, it often returns multiple IPs on systems running Docker (due to virtual bridge interfaces). For reliable automation, use `ip -4 route get 8.8.8.8 | awk '{print $7}'` to specifically extract the primary outbound routing IP.

## Interview Questions

**Q: You log into a server, run `hostname`, and it outputs `worker-node`. However, when you run `hostname -f`, it hangs for ten seconds and then outputs `worker-node`. What misconfiguration is causing the command to hang?**
**A:** The system's DNS resolver configuration is broken or incomplete. When `hostname -f` is executed, it attempts to resolve the short name `worker-node` into a Fully Qualified Domain Name. It checks `/etc/hosts`, fails to find an entry, and attempts to query external DNS servers via `/etc/resolv.conf`. The external DNS queries drop or block, causing the command to hang until the TCP/UDP timeout threshold is reached, at which point it gives up and falls back to the short name.

**Q: Explain why running `sudo hostname my-new-server` is insufficient for permanently renaming a Linux machine.**
**A:** The `hostname` utility invokes a system call that only modifies the active string in volatile kernel memory. When the server undergoes a reboot, the initialization system (like `systemd`) reads static configuration files from the disk (specifically `/etc/hostname`) to configure the kernel. Because the disk file was never updated, the system will boot utilizing the old hostname.

## Practice Problems

**Problem:** You are writing an automated server audit script. You want to extract the primary DNS domain the server belongs to (e.g., `internal.corporate.com`), explicitly excluding the short machine name. Write the command to extract this domain suffix.
**Hint:** Use the specific flag designed for domain extraction.
**Solution:**

```bash
hostname -d
```

**Problem:** You have a Python script running that needs to bind to the machine's actual LAN IP address, not `127.0.0.1`. Write the simplest command to list the actively bound IP addresses of the server.
**Hint:** Use the flag that bypasses DNS and interrogates all network interfaces.
**Solution:**

```bash
hostname -I
```

## References

- [hostname(1) - Linux man page](https://linux.die.net/man/1/hostname)
- [hostnamectl(1) - Control the system hostname](https://www.freedesktop.org/software/systemd/man/hostnamectl.html)
