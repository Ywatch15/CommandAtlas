---
slug: sshd
name: sshd
aliases: ['ssh daemon']
category: ssh
tags: [ssh, daemon, server, networking, security, authentication]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'start openSSH server'
  - 'test sshd config syntax'
  - 'run ssh daemon on custom port'
  - 'debug ssh connection issues server side'
  - 'configure ssh server daemon'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`sshd` (OpenSSH Daemon) is the server-side component of the Secure Shell (SSH) protocol suite. It binds to network interfaces, continuously listens for incoming TCP connection requests from SSH clients, and rigorously manages the complex cryptographic handshakes, user authentication, and pseudo-terminal (PTY) allocations required to grant secure, encrypted remote access to a host system.

## Why does it exist?

Prior to the widespread adoption of SSH in the late 1990s, remote administration relied heavily on tools like `telnet`, `rlogin`, and `ftp`. These legacy protocols transmitted all data—including root passwords and highly sensitive payloads—in raw plaintext across networks, making them fundamentally insecure against packet sniffing. `sshd` was developed to mathematically eliminate this vulnerability. It exists to enforce absolute Transport Layer Security, providing an uncrackable, encrypted tunnel for authentication, command execution, and port forwarding, establishing the bedrock of modern secure systems administration.

## Syntax

```bash
sshd [-deD] [-f config_file] [-p port] [-h host_key_file] [options]
```

## Flags

| Flag          | Description                                                                                                | Example                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `-t`          | Test mode. Checks the configuration file for syntax validity and keys for sanity, then cleanly exits.      | `sshd -t`                               |
| `-T`          | Extended test mode. Evaluates the configuration and dumps the exact, effective parameters it will use.     | `sshd -T`                               |
| `-d`          | Debug mode. Runs the daemon in the foreground and prints verbose cryptographic handshake logs to stderr.   | `sshd -d -p 2222`                       |
| `-D`          | Prevents the daemon from detaching into the background (ideal for systemd or Docker container management). | `sshd -D`                               |
| `-f <file>`   | Specifies a custom configuration file path instead of the default `/etc/ssh/sshd_config`.                  | `sshd -f /opt/custom_sshd_config`       |
| `-p <port>`   | Overrides the configuration file and forces the daemon to listen on a specific TCP port.                   | `sshd -p 22022`                         |
| `-h <file>`   | Specifies a specific host key file to use for cryptographic identity, bypassing default locations.         | `sshd -h /etc/ssh/ssh_host_ed25519_key` |
| `-e`          | Forces `sshd` to send its operational logs to standard error instead of the system syslog facility.        | `sshd -e -D`                            |
| `-q`          | Quiet mode. Suppresses standard informational logs, only reporting fatal errors.                           | `sshd -q`                               |
| `-o <option>` | Injects raw `sshd_config` parameters directly via the command line to override file settings.              | `sshd -o "PermitRootLogin no"`          |

## Examples

```bash
sudo sshd -t
```

> This is a mandatory safety check. It commands the `sshd` binary to parse the `/etc/ssh/sshd_config` file and validate the cryptographic host keys. If there are any syntax errors (like a misspelled keyword), it outputs the exact line number. If the configuration is perfect, it exits silently with a `0` status code.

```bash
sudo sshd -T | grep -i password
```

> This utilizes Extended Test mode. Because `sshd_config` relies heavily on complex `Match` blocks and default fallback values, visually reading the file is often misleading. `-T` dumps the _actual, evaluated_ configuration state the daemon will run with, allowing administrators to definitively `grep` for boolean states like `passwordauthentication`.

```bash
sudo /usr/sbin/sshd -d -p 2222
```

> This launches a temporary, isolated SSH daemon on port `2222` running in the foreground with verbose debugging (`-d`). This is the definitive methodology for debugging mysterious authentication failures (like broken PAM modules or key rejections) without disrupting the primary, stable SSH service running on port 22.

```bash
sudo sshd -D -e
```

> This commands the daemon to remain in the foreground (`-D`) and route all logs to standard error (`-e`). This exact invocation pattern is required when packaging an SSH server inside an Alpine or Ubuntu Docker container, as container runtimes expect the primary PID 1 process to stay attached and log to standard streams.

```bash
sudo sshd -f /etc/ssh/sshd_config.recovery -p 8080
```

> During catastrophic lockouts, administrators with console access can spin up a secondary fallback daemon relying on a stripped-down, highly permissive recovery configuration file, binding it to an alternate port to bypass restrictive network firewalls and regain access.

## Real-World Scenarios

**Validating Configuration Changes Safely**

```bash
vi /etc/ssh/sshd_config
# Modify PermitRootLogin to 'no'
sshd -t && systemctl reload sshd
```

> If an administrator introduces a typo into the configuration and blindly executes `systemctl restart sshd`, the daemon will crash, permanently severing all SSH access to the remote machine. Best practice mandates running `sshd -t` first, leveraging the logical AND (`&&`) to ensure the service only reloads if the syntax is mathematically perfect.

**Debugging "Permission Denied" Authentication Mysteries**

```bash
# On Server:
sudo /usr/sbin/sshd -d -p 2222
# On Client:
ssh -vvv -p 2222 user@server
```

> When a user insists their public key is correct but authentication continually fails, operators launch a debug daemon on an alternate port. The verbose output explicitly reveals backend failures, such as `Authentication refused: bad ownership or modes for directory /home/user`, pinpointing exact permission boundary violations that are normally suppressed in standard system logs for security reasons.

## When should it NOT be used?

- **For routine start/stop management on modern Linux:** **Reason:** Directly invoking the `sshd` binary bypasses the system's `init` system (like Systemd). It will lack proper Cgroup isolation, automatic restart policies, and unified `journalctl` logging. **Use instead:** `systemctl restart sshd` or `service sshd restart`.
- **As an outbound client connection tool:** **Reason:** `sshd` is strictly the server daemon (the listener). It cannot initiate outbound connections to remote servers. **Use instead:** The `ssh` binary.

## Alternatives

- **`dropbear`:** Lightweight SSH server. **Tradeoff:** `dropbear` is engineered specifically for deeply constrained embedded systems and IoT devices with minimal RAM footprints. It is highly optimized but lacks the profound enterprise feature set (like complex PAM integration or Certificate Authorities) of OpenSSH `sshd`.
- **`telnetd`:** The legacy predecessor. **Tradeoff:** Never use this. It transmits data in plaintext and is obsolete in all modern security contexts.

## How it works internally

The architecture of `sshd` revolves around robust **Privilege Separation** to minimize the impact of potential vulnerabilities.

When `sshd` boots (usually invoked via Systemd), it runs as a master process with absolute `root` privileges, binding to port 22 and waiting for `accept()` system calls from incoming TCP connections.

When a client connects, the master `sshd` process immediately `fork()`s a child process to handle the connection. To protect the system, it employs Privilege Separation (enforced via the `UsePrivilegeSeparation` directive). This child process drops its root privileges entirely, sandboxing itself into a highly restricted, unprivileged environment (often under the user `sshd`) and confining itself into a `chroot` jail.

This unprivileged child performs the dangerous, complex work of parsing the network packets, executing the cryptographic Key Exchange (Diffie-Hellman), and authenticating the user. If the authentication payload is valid, it signals the master root process via a local IPC socket.

The master process then validates the request. If authorized, the master process spawns a _new_ process, explicitly transitioning its UID/GID to the authenticated user (e.g., `alice`). It allocates a Pseudo-Terminal (PTY) via `/dev/ptmx`, sets up the environment variables, and invokes the user's default login shell (e.g., `/bin/bash`), bridging standard I/O securely across the encrypted network socket.

## Performance Notes

- High-frequency concurrent connection attempts (like an automated Ansible playbook hitting 500 nodes simultaneously) can overwhelm the daemon. The `MaxStartups` directive in `sshd_config` governs unauthenticated connection limits. If exceeded, `sshd` will begin aggressively dropping connections to protect the server from resource exhaustion (DoS).
- Cryptographic Key Exchange is computationally heavy. On low-powered IoT hardware, restricting the `KexAlgorithms` to modern, lightweight elliptic curves (like Curve25519) drastically reduces CPU spikes during connection handshakes compared to massive Diffie-Hellman groups.

## Security Notes

- **Disable Password Authentication:** The most critical security mandate for `sshd` is setting `PasswordAuthentication no`. Exposing password-based SSH to the public internet guarantees constant, automated brute-force attacks. Require asymmetric public-key authentication universally.
- **Root Login Prohibition:** Setting `PermitRootLogin no` prevents attackers from brute-forcing the `root` user directly. Administrators should log in as an unprivileged named user and escalate privileges via `sudo`, providing a comprehensive audit trail.
- **Port Obfuscation:** Changing the default port (`Port 2222`) is security-by-obscurity. It drastically reduces internet "background noise" and script-kiddie log spam, but offers zero actual defense against a targeted Nmap scan. It must be paired with active defenses like `fail2ban` or hardware firewalls.

## Common Mistakes

- **Editing `sshd_config` and restarting blindly:** **Why it's wrong:** A single typo in the configuration file causes the `systemctl restart sshd` command to fail. The daemon dies and does not come back up. If you exit your active terminal, you are permanently locked out of the remote server. Always run `sshd -t` first, and prefer `systemctl reload sshd` (which sends a `SIGHUP` and preserves active connections).
- **Incorrect `authorized_keys` permissions:** **Why it's wrong:** OpenSSH enforces "Strict Modes". If a user's home directory (`/home/user/`) or `.ssh` folder is globally writable (`chmod 777`), `sshd` silently refuses to read the `authorized_keys` file to prevent privilege escalation attacks. Permissions must be rigidly clamped (`700` for `.ssh`, `600` for keys).
- **Opening port 22 directly to the internet:** **Why it's wrong:** Unless strictly necessary, SSH should reside behind a VPN (WireGuard), a Zero-Trust tunnel (Tailscale/Cloudflare Access), or strict IP whitelists (Security Groups).

## Best Practices

- Implement `Match` blocks in `/etc/ssh/sshd_config` for granular security. For example, you can globally disable password authentication, but explicitly allow it only if the connection originates from a specific trusted internal IP subnet: `Match Address 10.0.0.0/8 \n PasswordAuthentication yes`.
- Standardize on utilizing SSH Certificates (`TrustedUserCAKeys`). Instead of distributing hundreds of static public keys to thousands of servers via automation, you configure `sshd` once to trust a cryptographic Certificate Authority. This allows time-limited, identity-bound access without ever modifying the servers again.
- Configure aggressive idle timeouts (`ClientAliveInterval 300` and `ClientAliveCountMax 2`) to automatically sever inactive, lingering terminal sessions, freeing up server sockets and satisfying security compliance mandates.

## Interview Questions

**Q:** What is the purpose and execution flow of running `sshd -t` on a production server?
**A:** `sshd -t` invokes the daemon in Test Mode. It instructs the binary to parse the `/etc/ssh/sshd_config` file and mathematically validate the server's cryptographic host keys. It checks for syntactic correctness, unsupported parameters, and permission boundary violations. If the validation passes, the command exits silently with a success code. It is an absolute mandatory safeguard that must be executed to ensure the daemon won't crash before an administrator issues a restart or reload command.
**Q:** An organization enforces a policy stating `PermitRootLogin no`. However, backup automation software running from a secure central server requires root-level filesystem access via SSH to snapshot the data. How can you modify `sshd_config` to securely satisfy this requirement without exposing root globally?
**A:** You can utilize the `Match` block directive within `sshd_config` to apply granular, overriding policies. You would keep the global `PermitRootLogin no` policy, but append a block at the very bottom of the file like `Match Address 10.50.0.50`, followed by `PermitRootLogin prohibit-password`. This mathematically restricts root logins exclusively to the exact, trusted IP address of the backup server, and further requires cryptographic key-based authentication, rejecting standard passwords entirely.
**Q:** Describe the concept of "Privilege Separation" implemented natively within the OpenSSH daemon architecture.
**A:** Because parsing network packets and performing complex cryptographic math are notoriously prone to memory corruption vulnerabilities (like buffer overflows), OpenSSH isolates this risk. The master `sshd` process runs as root to bind to port 22. However, upon receiving a connection, it immediately forks a child process that drops all root privileges and traps itself inside an empty `chroot` jail. This unprivileged child handles the dangerous, complex network authentication phase. If an attacker successfully exploits a vulnerability during the handshake, they are trapped inside the unprivileged jail, unable to compromise the host OS.

## Practice Problems

**Problem:** Your automated deployment script is generating an error stating that an `sshd_config` parameter is invalid, but the file is massive and complex. Execute a command to parse the configuration file and pinpoint the exact line number of the syntax error.
**Hint:** Utilize the specific test mode flag associated with the daemon.
**Solution:** `sshd -t` (If a syntax error exists, the daemon will print a fatal error explicitly detailing the invalid keyword and its line number to standard error).
**Problem:** You need to debug a complex authentication issue with a specific user. Launch an isolated, temporary SSH daemon on port `2222`, forcing it to remain attached to your terminal in the foreground while outputting highly verbose, detailed cryptographic handshake logs.
**Hint:** Combine the debug mode flag (which implicitly forces foreground execution) with the specific port override flag.
**Solution:** `sudo /usr/sbin/sshd -d -p 2222` (This spins up an ephemeral listener that logs every interaction to the screen, automatically terminating itself the moment the client connection closes).

## References

- [OpenSSH Manual Pages - sshd](https://man.openbsd.org/sshd.8)
- [OpenSSH Manual Pages - sshd_config](https://man.openbsd.org/sshd_config.5)
