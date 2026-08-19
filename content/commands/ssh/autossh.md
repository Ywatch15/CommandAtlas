---
slug: autossh
name: autossh
aliases: []
category: ssh
tags: [ssh, networking, tunnels, port-forwarding, reliability, sysadmin]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'keep ssh tunnel alive'
  - 'auto restart ssh connection'
  - 'persistent reverse ssh proxy'
  - 'monitor ssh session'
  - 'background ssh tunnel'
relatedCommands: [ssh, systemctl, tmux, screen]
alternatives: [ssh]
status: draft
---

## What is it?

`autossh` is a specialized command-line wrapper utility designed to start, monitor, and automatically restart SSH connections and tunnels. It continuously verifies the health of the SSH link by passing test data through a localized loopback tunnel (or relying on native SSH keepalives) and forcefully restarts the underlying `ssh` child process if the connection hangs, drops, or stops passing traffic.

## Why does it exist?

Standard SSH connections are notoriously fragile over unstable networks. If a laptop changes Wi-Fi networks, an ISP resets a router, or a NAT gateway times out a silent TCP connection, a standard SSH tunnel (such as a reverse port forward exposing a local database to the cloud) will freeze indefinitely (a "half-open" state) without exiting. `autossh` exists to solve this problem for permanent infrastructure. By completely automating connection recovery, it transforms temporary SSH tunnels into highly resilient, pseudo-VPN connections suitable for persistent production routing, headless IoT devices, and continuous background data syncing.

## Syntax

```bash
autossh [-V] [-M port[:echo_port]] [-f] [SSH_OPTIONS]
```

_(Note: Any flags not explicitly parsed by `autossh` are passed directly to the underlying `ssh` binary)._

## Flags

_Note: `autossh` relies heavily on environment variables for its configuration alongside standard CLI flags._

| Flag / Env Var       | Description                                                                                                                                                                         | Example                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `-M <port>[:echo]`   | Specifies the base monitoring port. `autossh` sends data to this port and expects it back on `port+1`. Setting to `0` disables this and relies purely on SSH `ServerAliveInterval`. | `autossh -M 20000 user@host`           |
| `-f`                 | Forces `autossh` to drop into the background immediately before executing SSH. Often requires `-N` (no command) to be passed to SSH.                                                | `autossh -f -N -R 8080:localhost:80`   |
| `-V`                 | Prints the `autossh` version and exits.                                                                                                                                             | `autossh -V`                           |
| `AUTOSSH_GATETIME`   | Defines how long (in seconds) `autossh` waits for the initial SSH connection to succeed. If it fails before this time, `autossh` exits entirely. Set to `0` to retry infinitely.    | `AUTOSSH_GATETIME=0 autossh ...`       |
| `AUTOSSH_POLL`       | Specifies the connection poll time in seconds. Defaults to 600 (10 minutes).                                                                                                        | `AUTOSSH_POLL=60 autossh ...`          |
| `AUTOSSH_FIRST_POLL` | Specifies how long to wait before the very first health check poll is sent.                                                                                                         | `AUTOSSH_FIRST_POLL=30 autossh ...`    |
| `AUTOSSH_LOGFILE`    | Forces `autossh` to write its monitoring and restart logs to a specific file instead of syslog.                                                                                     | `AUTOSSH_LOGFILE=/var/log/autossh.log` |
| `AUTOSSH_DEBUG`      | If set to `1`, forces `autossh` to log at the debug level to assist in troubleshooting loopback failures.                                                                           | `AUTOSSH_DEBUG=1 autossh ...`          |
| `AUTOSSH_PIDFILE`    | Writes the PID of the `autossh` watcher process to a file, crucial for `systemd` or `init.d` scripts managing the service.                                                          | `AUTOSSH_PIDFILE=/run/autossh.pid`     |
| `AUTOSSH_MAXSTART`   | Defines the maximum number of times `autossh` will restart the SSH process. Defaults to no limit (infinite).                                                                        | `AUTOSSH_MAXSTART=10 autossh ...`      |

## Examples

```bash
autossh -M 0 -N -L 5432:localhost:5432 dbuser@db.server.com -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3"
```

> The modern, optimized port-forwarding pattern. Disables `autossh`'s legacy port-based monitoring (`-M 0`), relying entirely on the native OpenSSH `-o ServerAliveInterval` mechanism. It forwards the local PostgreSQL port to the remote server, running in a headless state (`-N`), automatically restarting if the connection drops.

```bash
AUTOSSH_GATETIME=0 autossh -M 20000 -f -N -R 9090:localhost:80 remoteuser@bastion.com
```

> The unbreakable reverse tunnel. `AUTOSSH_GATETIME=0` ensures that if the server boots up without an active internet connection, `autossh` won't exit; it will keep retrying forever. The `-f` flag pushes the process into the background, maintaining a persistent reverse proxy from `bastion.com:9090` to the local port `80`.

```bash
AUTOSSH_DEBUG=1 AUTOSSH_LOGFILE=/tmp/autossh.log autossh -M 0 user@remote.com
```

> A deep debugging invocation. If a tunnel keeps flapping, the administrator sets these environment variables to force `autossh` to dump its state-machine logic and restart triggers directly into a temporary file for analysis.

```bash
autossh -M 0 -D 1080 -C -q -N proxyuser@jumphost.com
```

> Persistent SOCKS5 proxy creation. Establishes a dynamic application-level proxy (`-D 1080`), enables compression (`-C`), runs quietly (`-q`), and auto-recovers, providing a stable tunneling point for a local web browser to bypass corporate firewalls permanently.

```bash
autossh -M 20000 -t admin@router.local "journalctl -f"
```

> Interactive session protection. While usually used for tunnels, `autossh` can keep an interactive terminal session alive. The `-t` forces TTY allocation. If the admin's laptop disconnects and reconnects to Wi-Fi, `autossh` violently kills the hung session and automatically re-executes the `journalctl` log tail.

## Real-World Scenarios

**IoT Device Telemetry (Reverse Tunnels)**

```bash
# Executed via a systemd service on a Raspberry Pi deployed in the field
Environment="AUTOSSH_GATETIME=0"
ExecStart=/usr/bin/autossh -M 0 -N -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3" -R 10022:localhost:22 remote_admin@cloud-server.com
```

> Thousands of IoT devices sit behind strict, unpredictable NAT gateways with no inbound public IP addresses. Platform engineers configure `autossh` as a `systemd` service to dial out to a central cloud bastion, opening reverse SSH tunnels (e.g., mapping port 10022 on the cloud server to 22 on the Pi). `autossh` guarantees these tunnels recover from LTE/cellular network drops, allowing engineers to SSH _into_ the devices at any time.

**Persistent Database Tunnels for Local Development**

```bash
autossh -M 0 -f -N -L 3306:internal-db.vpc.local:3306 bastion-user@public-bastion.com
```

> Developers working from home cannot access a secure VPC database directly. Instead of launching heavy VPN clients, they run a script executing `autossh`. This binds `localhost:3306` to the private database via the bastion host, maintaining the connection silently in the background for weeks despite laptop sleep/wake cycles.

## When should it NOT be used?

- **High-Bandwidth Site-to-Site Routing:** **Do not use `autossh` to connect two office networks.** SSH tunneling wraps TCP inside TCP, leading to "TCP Meltdown" (extreme packet retransmission loops) during high packet loss or congestion. For site-to-site connectivity, always use a true Layer 3 UDP VPN like WireGuard or IPsec.
- **Single-Shot Commands:** If running a simple command like `ssh user@host 'ls'`, `autossh` adds unnecessary complexity and daemonization logic. Use standard `ssh`.
- **When Modern VPNs are Available:** Tailscale or ZeroTier provide far more robust, mesh-networked, and self-healing connectivity without the manual port-management overhead of massive `autossh` reverse-tunnel fleets.

## Alternatives

- **WireGuard / Tailscale:** **Best for modern infrastructure.** Provides true, seamless, roaming IP routing over UDP without TCP-over-TCP performance penalties, natively recovering from network changes almost instantly.
- **`systemd` with Restart=Always:** **Best for modern Linux systems.** Instead of using the `autossh` binary, a simple `systemd` unit wrapping a standard `ssh -N` command with `Restart=always` and `RestartSec=5` provides nearly identical reliability using native OS supervisors.
- **Mosh (Mobile Shell):** **Best for interactive roaming.** If you need an interactive terminal that survives suspending your laptop or switching from Wi-Fi to Cellular, Mosh is vastly superior as it uses UDP and synchronizes the terminal state asynchronously.

## How it works internally

`autossh` is a C program that acts as a supervisory parent process.

When executed, it sets up its monitoring environment and then calls `fork()` and `exec()` to launch the standard `ssh` binary as a child process, passing through all specified SSH flags.

Historically (using the `-M` flag), `autossh` verified connection health by hijacking two port numbers. If you specified `-M 20000`, `autossh` would instruct the SSH client to set up local and remote port forwards for port 20000 and 20001. `autossh` would periodically send test data into port 20000, which the SSH tunnel would route to the remote server, loop back, and return on port 20001. If `autossh` didn't receive its echo payload within the timeout, it assumed the connection was dead.

Modern `autossh` usage (with `-M 0`) delegates this pinging to OpenSSH itself using `-o ServerAliveInterval`. The SSH client sends encrypted null packets to the SSH server. If the server fails to acknowledge `ServerAliveCountMax` consecutive packets, the `ssh` client process terminates itself with an error code.

`autossh` intercepts the `SIGCHLD` signal indicating its child `ssh` process died. It evaluates the exit code. If the exit code indicates a network failure, `autossh` enters a backoff loop and respawns a brand new `ssh` child process, re-establishing the connection.

## Performance Notes

- **Memory Footprint:** The `autossh` wrapper consumes less than 1MB of RAM and virtually 0% CPU, making it perfectly suited for resource-constrained embedded systems and routers.
- **TCP-over-TCP Overhead:** Tunnels managed by `autossh` suffer from the inherent performance limits of SSH. The cryptographic encryption overhead and TCP sliding-window stacking limit maximum throughput, usually capping out around a few hundred Megabits per second depending on single-core CPU speeds.

## Security Notes

- **Unattended Authentication:** `autossh` cannot type a password or unlock a private key with a passphrase. It absolutely requires public-key authentication (using an unencrypted `id_rsa` key, or relying on `ssh-agent`) to establish the connection automatically after a failure.
- **Host Key Verification:** If a remote server's IP changes or it is rebuilt, the SSH host key changes. `ssh` will throw a strict host key checking error and prompt for interactive `(yes/no)` confirmation. Because `autossh` is a background daemon, this prompt hangs forever. In highly dynamic cloud environments, automated tunnels often require `-o StrictHostKeyChecking=accept-new` or `-o StrictHostKeyChecking=no` (which introduces Man-in-the-Middle risks).

## Common Mistakes

- **Forgetting `AUTOSSH_GATETIME=0` on boot scripts**
  - _Mistake:_ Putting `autossh` in `/etc/rc.local` or a cron `@reboot` job without setting the gatetime.
  - _Why:_ At boot, the network interface might not be fully active or DNS might not have resolved. `autossh` attempts to connect, fails immediately, and because `GATETIME` defaults to 30 seconds, it completely terminates assuming the configuration is broken. Setting `AUTOSSH_GATETIME=0` forces it to retry indefinitely from the very first failure.
- **Using legacy `-M` monitoring in modern networks**
  - _Mistake:_ Using `autossh -M 20000` to monitor a tunnel.
  - _Why:_ The legacy echo-port method opens actual listening sockets on the host. In strict enterprise environments, firewalls might block these obscure high ports, causing `autossh` to constantly tear down perfectly healthy tunnels. Always use `-M 0` and rely on SSH's internal `ServerAliveInterval` instead.

## Best Practices

- **Use `systemd` Instead Where Possible:** While `autossh` is powerful, wrapping standard `ssh` in a modern `systemd` service provides superior logging (via `journalctl`), standardized restart backoff timers, and dependency management (e.g., `After=network-online.target`), making `autossh` somewhat redundant on modern Linux.
- **Pair with `ExitOnForwardFailure`:** When creating tunnels, pass `-o ExitOnForwardFailure=yes`. If the tunnel successfully connects but the specific port you are trying to forward is already in use on the remote side, SSH will normally stay connected doing nothing. This flag forces SSH to crash, allowing `autossh` to retry the connection and re-attempt the port bind.

## Interview Questions

**Q: Explain why `-M 0` is the recommended way to run `autossh` on modern systems, and what additional SSH options must be passed to ensure the tunnel still recovers from silent network drops.**
**A:** Setting `-M 0` disables `autossh`'s legacy loopback monitoring method, which opened unnecessary network sockets and caused issues with firewalls. However, without monitoring, `autossh` won't know if a connection hangs silently (a half-open TCP state). Therefore, you must pass `-o ServerAliveInterval=<seconds>` to instruct the OpenSSH client to send internal ping packets, and `-o ServerAliveCountMax=<count>` to define the failure threshold. When the native SSH client detects a timeout, it will terminate itself, and `autossh` will catch the termination and restart the process.

**Q: You deploy an `autossh` script on a fleet of IoT devices. The devices frequently reboot, but the tunnels never come back up unless you log in and run the script manually. What environment variable is missing from your deployment configuration?**
**A:** The `AUTOSSH_GATETIME=0` environment variable is missing. By default, `autossh` uses a "gatetime" (typically 30 seconds). If the very first SSH connection attempt fails before the gatetime expires, `autossh` assumes the configuration (like the hostname or keys) is fatally broken and exits completely. At boot, network interfaces are often delayed. Setting `GATETIME=0` instructs `autossh` to ignore early failures and persistently retry until the network comes online.

## Practice Problems

**Problem:** You need to create a persistent reverse tunnel that maps port 80 on your local machine to port 8080 on a remote server named `public-proxy.com`. You want the process to drop into the background immediately, suppress normal shell execution (`-N`), and rely on native SSH keepalives (disabling the autossh monitoring port). Write the command.
**Hint:** Use `-M 0`, the background flag, the no-command flag, and the reverse tunnel flag.
**Solution:**

```bash
autossh -M 0 -f -N -R 8080:localhost:80 user@public-proxy.com
```

**Problem:** You are deploying an `autossh` script via `systemd` that forwards port 3306. You need to ensure that if the SSH connection succeeds, but port 3306 fails to bind on the remote server, the SSH client exits immediately so `autossh` can try again.
**Hint:** You need to pass a specific `ExitOnForwardFailure` SSH option using the `-o` flag.
**Solution:**

```bash
autossh -M 0 -N -o ExitOnForwardFailure=yes -L 3306:localhost:3306 target_server
```

## References

- [autossh(1) - Linux man page](https://linux.die.net/man/1/autossh)
- [OpenSSH Config Options (ssh_config)](https://linux.die.net/man/5/ssh_config)
