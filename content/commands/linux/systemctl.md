---
slug: systemctl
name: systemctl
aliases: []
category: linux
tags:
  - systemctl
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - start a service
  - stop a service
  - restart nginx
  - enable service on boot
  - check service status
  - list running services
relatedCommands:
  - cron
  - sysctl
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---
## What is it?

`systemctl` is the primary command-line utility used to control the **systemd init system**. It allows administrators and users with sufficient privileges to manage services, inspect system state, configure startup behavior, analyze dependencies, and interact with nearly every component managed by systemd.

Unlike older init systems that relied on shell scripts, `systemctl` communicates directly with the systemd daemon using D-Bus, making service management faster, more reliable, and dependency-aware.

## Why does it exist?

Every Linux system requires a process that starts immediately after the Linux kernel boots. This process becomes **PID 1** and is responsible for initializing the operating system.

Historically Linux distributions used SysVinit, Upstart, or OpenRC, which suffered from slow sequential startup, weak dependency management, and complicated shell scripts. systemd was introduced to solve these problems by providing parallel service startup, dependency resolution, automatic failure recovery, socket activation, timer units, and unified resource control. `systemctl` serves as the primary interface for controlling all these capabilities.

## Syntax

```bash
systemctl [OPTIONS] COMMAND [UNIT...]
```

General form:

```bash
systemctl <action> <unit>
```

Examples:

```bash
systemctl start nginx
systemctl stop apache2
systemctl restart ssh
systemctl status docker
systemctl enable mysql
```

### Understanding Units

Systemd manages resources known as **units**. Common unit types include `.service` (background daemons), `.socket` (IPC/network sockets), `.target` (groups of units), `.timer` (cron alternatives), and `.mount` (filesystem mounts). `.service` is the default type if omitted.

## Flags

| Flag / Command   | Description                                                          | Example                               |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------- |
| `start`          | Start one or more units immediately                                  | `systemctl start nginx`               |
| `stop`           | Stop one or more running units                                       | `systemctl stop apache2`              |
| `restart`        | Stop and then start a service                                        | `systemctl restart ssh`               |
| `reload`         | Reload configuration without interrupting connections                | `systemctl reload nginx`              |
| `status`         | Show detailed runtime status and recent logs                         | `systemctl status docker`             |
| `enable`         | Configure a service to start automatically on boot                   | `systemctl enable mysql`              |
| `disable`        | Prevent automatic startup on boot                                    | `systemctl disable bluetooth`         |
| `mask`           | Symlink unit to `/dev/null` to block all manual and automatic starts | `systemctl mask service`              |
| `is-active`      | Check if unit is running (exits 0 if active)                         | `systemctl is-active --quiet nginx`   |
| `is-enabled`     | Check if unit starts at boot                                         | `systemctl is-enabled nginx`          |
| `--now`          | Combine enable/disable with immediate start/stop                     | `systemctl enable --now nginx`        |
| `--failed`       | List all units currently in a failed state                           | `systemctl --failed`                  |
| `--type=service` | Filter listed units by type                                          | `systemctl list-units --type=service` |
| `--user`         | Manage per-user systemd instances without root                       | `systemctl --user status pipewire`    |
| `daemon-reload`  | Reload systemd manager configuration after unit file edits           | `systemctl daemon-reload`             |

## Examples

```bash
systemctl status nginx
```

> Displays runtime state, PID, memory usage, CPU consumption, and recent journal log entries for Nginx.

```bash
sudo systemctl enable --now docker
```

> Enables Docker to launch at boot and starts the service immediately in a single step.

```bash
systemctl list-units --failed
```

> Displays all failed services and units across the system for instant troubleshooting.

```bash
sudo systemctl daemon-reload && sudo systemctl restart myapp
```

> Flushes updated unit file definitions from disk into memory and restarts the service cleanly.

## Real-World Scenarios

**Production deployment update**: `sudo systemctl reload nginx` updates Nginx worker processes with new SSL certificates and location rules without dropping active user HTTP connections.

**Server recovery**: `systemctl --failed` identifies crashed services after an unclean reboot, allowing admins to inspect logs with `systemctl status <unit>` and recover state.

**Custom daemon management**: Writing a systemd unit file at `/etc/systemd/system/myapp.service` followed by `sudo systemctl daemon-reload` and `sudo systemctl enable --now myapp` integrates a custom application directly into OS lifecycle management.

## When should it NOT be used?

- **Containerized workloads**: Inside Docker containers, running `systemctl` is unnecessary and typically fails because containers do not run systemd as PID 1 (use container entrypoints instead).
- **Simple one-off commands**: For simple foreground commands or shell scripts, standard execution or `nohup`/`tmux` is simpler than creating a systemd service unit.
- **Non-systemd distributions**: Alpine Linux (OpenRC), Slackware, and Gentoo setups using alternative inits do not use `systemctl`.

## Alternatives

- **`ps`**: View running processes directly across all init systems.
- **`service` / `initctl`**: Legacy SysVinit and Upstart wrapper scripts.
- **`supervisord`**: User-space process monitor commonly used in container environments.

## How it works internally

`systemctl` communicates with systemd (PID 1) over D-Bus via the `/run/systemd/system/` and `/var/run/dbus/system_bus_socket` sockets. When you run `systemctl start foo`, it sends a D-Bus message requesting a job activation. Systemd calculates the dependency graph, resolves ordering constraints (`Before=`, `After=`), and forks process execution under cgroups.

Exit codes for `is-active`:

- `0` — active / running.
- `1` / non-zero — inactive, failed, or unknown.

## Performance Notes

- Running `systemctl list-units` without filters parses all active unit cgroups in memory, which is instantaneous.
- Use `--no-pager` in automated scripts to prevent `systemctl` from launching `less` when output exceeds terminal height.
- `daemon-reload` reads all unit files from disk (`/etc/systemd/system`, `/lib/systemd/system`); avoid invoking it repeatedly in tight loops.

## Security Notes

- Modifying system services (`start`, `stop`, `enable`, `mask`) requires root privileges (`sudo` or PolicyKit authentication).
- `systemctl mask` is a critical security tool to hard-disable dangerous or unwanted services so dependencies cannot start them implicitly.
- User services (`systemctl --user`) operate isolated within the unprivileged user's cgroup and permissions.

## Common Mistakes

- **Forgetting `daemon-reload`**: Editing a unit file in `/etc/systemd/system/` without running `systemctl daemon-reload` causes systemd to continue running the cached unit definition.
- **Assuming `enable` starts a service**: `systemctl enable` only configures boot startup. Use `enable --now` or run `systemctl start` explicitly.
- **Confusing `stop` with `mask`**: `stop` halts a running service, but another service or boot event can start it again. `mask` prevents all execution.

## Best Practices

- Always test unit file configuration changes using `systemctl daemon-reload` and `systemctl status` before deploying to production.
- Use `systemctl reload` over `restart` whenever configuration-only changes occur on zero-downtime services like Nginx or HAProxy.
- Prefer `--now` when enabling or disabling services to maintain clean intent in automation scripts.

## Interview Questions

**Q:** What is the difference between `systemctl enable` and `systemctl start`?
**A:** `start` launches the service process immediately in the current boot session without configuring startup behavior. `enable` creates symlinks in `/etc/systemd/system/` so the service launches automatically on future reboots, but does not start it immediately.

**Q:** What does `systemctl mask` do and how does it differ from `disable`?
**A:** `disable` removes boot-time symlinks, but the service can still be started manually or by another dependent service. `mask` links the unit file to `/dev/null`, making it impossible for systemd or any process to start the service until it is unmasked.

## Practice Problems

**Problem:** Enable and immediately start the `sshd` service, then verify its active status non-interactively in a script.
**Hint:** Use `--now` and `is-active --quiet`.
**Solution:** `sudo systemctl enable --now sshd && systemctl is-active --quiet sshd && echo "SSH active"`

## References

- [systemctl man page — freedesktop.org](https://www.freedesktop.org/software/systemd/man/systemctl.html)
- [systemd Unit Configuration Manual](https://www.freedesktop.org/software/systemd/man/systemd.unit.html)
