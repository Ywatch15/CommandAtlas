---
slug: screen
name: screen
aliases: []
category: linux
tags:
  - screen
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
  - run process in background
  - resume ssh session
  - keep terminal alive after disconnect
  - multiplex shell
  - share terminal session
relatedCommands: []
alternatives:
  - bg
  - fg
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

GNU `screen` is a full-screen window manager that multiplexes a physical terminal between several processes (typically interactive shells). It allows you to detach a running session from the current display and reattach it later from a completely different location, ensuring long-running processes survive network disconnects.

## Why does it exist?

Before terminal multiplexers existed, an unstable network connection (like a dropped modem or interrupted SSH session) would send a `SIGHUP` (hangup) signal to all child processes, instantly killing long-running compilations, database migrations, or server scripts. `screen` was created in 1987 to act as an intermediate daemon holding the pseudo-terminal (PTY) open independent of the network state, effectively bridging the gap between volatile remote connections and persistent server-side execution.

## Syntax

```bash
screen [-opts] [cmd [args]]
screen -r [host.tty.pid]
```

## Flags

| Flag             | Description                                                                                                 | Example                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `-S sessionname` | Assigns a human-readable name to the session to make identification and reattachment easier.                | `screen -S database_migration`   |
| `-ls`, `-list`   | Lists all currently active and detached screen sessions for the current user.                               | `screen -ls`                     |
| `-r`             | Reattaches to a detached screen session.                                                                    | `screen -r 14532`                |
| `-d`             | Detaches the specified screen session from its current display (often paired with `-r` to steal a session). | `screen -d -r compile_job`       |
| `-x`             | Attaches to a session that is already attached elsewhere, creating a shared, multi-display view.            | `screen -x shared_session`       |
| `-dm`            | Starts `screen` in detached mode, spawning the specified command entirely in the background.                | `screen -dmS worker ./script.sh` |
| `-R`             | Reattaches to the first available detached session, or creates a new one if none exist.                     | `screen -R`                      |
| `-wipe`          | Lists active sessions while simultaneously destroying sockets for sessions that have died/crashed.          | `screen -wipe`                   |
| `-X`             | Sends a specified screen command directly to a running session without attaching to it.                     | `screen -S worker -X quit`       |
| `-L`             | Turns on automatic output logging, writing everything displayed in the window to `screenlog.0`.             | `screen -L -S audit_log`         |
| `-h num`         | Sets the history scrollback buffer size to the specified number of lines.                                   | `screen -h 10000`                |

## Examples

```bash
screen -S system_upgrade
```

> This initiates a new, interactive `screen` session named `system_upgrade`. All commands run in this shell will survive if your SSH connection drops. To detach manually, you type `Ctrl-A` followed by `d`.

```bash
screen -ls
```

> This queries the Unix domain sockets in `/var/run/screen/` to list all sessions owned by your user, displaying their PID, assigned name, and current status (Attached or Detached).

```bash
screen -d -r backend_build
```

> This forcefully detaches the `backend_build` session from wherever it is currently running (e.g., your office computer) and immediately reattaches it to your current terminal (e.g., your laptop at home).

```bash
screen -dmS cache_worker ./redis_sync.sh
```

> This executes the `redis_sync.sh` script inside a new `screen` session named `cache_worker`, but starts it completely detached in the background. Your current terminal prompt returns instantly.

```bash
screen -S cache_worker -X quit
```

> This passes the internal `quit` command to the detached `cache_worker` session. It gracefully terminates the screen daemon and all child processes within it without requiring you to attach to it first.

## Real-World Scenarios

**Protecting Critical OS Upgrades**

```bash
screen -S dist-upgrade
sudo apt-get dist-upgrade
```

> When upgrading a Linux kernel or core packages over SSH, a VPN drop can brick the operating system by leaving `dpkg` in an inconsistent state. Wrapping the operation in `screen` ensures the upgrade finishes cleanly in the background even if your laptop loses Wi-Fi.

**Collaborative Remote Debugging**

```bash
screen -S pair_programming
# Teammate runs: screen -x pair_programming
```

> By using the `-x` flag, two administrators logged into the same server as the same user can attach to the exact same terminal simultaneously. Keystrokes and outputs are mirrored in real-time, functioning as a native, low-latency screen share for CLI debugging.

**Daemonizing Legacy Scripts**

```bash
screen -dmS legacy_poller /opt/scripts/poll_api.py
```

> When an administrator inherits a blocking Python script that needs to run continuously but lacks a proper `systemd` service file, `screen -dmS` acts as a quick-and-dirty daemonization wrapper, keeping the script alive after the administrator logs out.

## When should it NOT be used?

- **Complex split-pane terminal layouts:** Using `screen`'s native split-window commands (`Ctrl-A S`). **Reason:** `screen`'s window splitting is notoriously clunky, lacks persistent layouts, and struggles with vertical splits on older versions. **Use instead:** `tmux`, which treats panes as a first-class, easily scriptable feature.
- **Proper system service management:** Using `screen -dm` to run web servers or databases in production. **Reason:** `screen` lacks restart policies, dependency mapping, standard logging rotation, and crash monitoring. **Use instead:** A proper init system like `systemd` or `supervisord`.
- **Highly secure multi-user environments:** Enabling `screen`'s multi-user mode (`Ctrl-A :multiuser on`). **Reason:** It requires the `screen` binary to have the `setuid` bit set, which has historically been the source of numerous privilege escalation CVEs. **Use instead:** Read-only terminal mirroring tools or secure SSH sharing.

## Alternatives

- **`tmux` (Terminal Multiplexer):** The modern standard. **Tradeoff:** `tmux` employs a robust client-server architecture, features vastly superior pane management, and is actively maintained, whereas `screen` is largely considered legacy. However, `screen` is installed by default on almost all legacy Unix systems where `tmux` is not.
- **`nohup` (No Hang Up):** A POSIX command. **Tradeoff:** `nohup` ignores the `SIGHUP` signal and redirects output to a file, which is perfect for fire-and-forget background tasks. However, unlike `screen`, you can never interactively reattach to the running process to provide standard input.
- **`byobu`:** A text-based window manager. **Tradeoff:** `byobu` is actually an enhancement wrapper built _on top_ of `screen` (or `tmux`). It provides a pre-configured status bar, F-key keyboard shortcuts, and a gentler learning curve for users who dislike `screen`'s `Ctrl-A` prefix.

## How it works internally

When you launch `screen`, it allocates a master/slave pseudo-terminal (PTY) pair using system calls like `posix_openpt()`. It creates a Unix domain socket, typically located in `/var/run/screen/S-$USER/`, which acts as the IPC (Inter-Process Communication) bridge.

The `screen` binary then forks. The parent process (the client) connects your physical terminal's standard input and output to the Unix socket. The child process (the server daemon) connects the other end of the socket to the master side of the PTY, and spawns your shell (e.g., `/bin/bash`) on the slave side of the PTY.

When an SSH connection drops, the kernel sends `SIGHUP` to the client process. The client dies, but the server daemon (which is a background process not attached to the SSH TTY) ignores the `SIGHUP` and continues running. The child shell and its programs remain entirely unaware that the physical screen disappeared because they are communicating with the virtual PTY held open by the daemon. Running `screen -r` simply spawns a new client process that connects to the surviving daemon's Unix socket, redrawing the terminal state from the daemon's memory buffer.

## Performance Notes

- `screen` introduces a translation layer between the executing program and the terminal emulator. While CPU overhead is generally negligible, rendering extremely complex text-user interfaces (like `htop` or `nmon`) inside `screen` over a high-latency SSH connection can feel noticeably sluggish compared to a direct SSH session.
- Setting an excessively large scrollback buffer (e.g., `defscrollback 100000` in `.screenrc`) across dozens of multiplexed windows will consume a significant amount of RAM per user, as this buffer is held directly in the memory space of the screen daemon.

## Security Notes

- **Socket Permissions:** The security of a detached session relies entirely on the file permissions of the Unix domain socket in `/var/run/screen/`. If an attacker gains standard user access to your account, they can simply type `screen -r` to hijack any active root SSH sessions or database connections you left running inside the multiplexer.
- **Root Shell Abandonment:** Administrators frequently run `sudo su` inside a `screen` session and then detach. This leaves a fully authenticated root shell idling in the background. Best practice dictates returning to standard user privileges _before_ detaching.

## Common Mistakes

- **Forgetting to name sessions:** Starting sessions by typing only `screen`. **Why it's wrong:** When you run `screen -ls`, you will see indistinct names like `3142.pts-0.hostname` and `5122.pts-0.hostname`, making it impossible to remember which session holds the database migration versus the compilation job. Always use `-S`.
- **Exiting instead of detaching:** Pressing `Ctrl-D` or typing `exit` in the shell when you want to leave the screen. **Why it's wrong:** `Ctrl-D` sends an EOF to the shell, terminating it. If it is the last shell in the screen session, the screen daemon itself terminates. To detach while leaving processes running, you must type the prefix `Ctrl-A`, followed by `d`.
- **Nesting screen sessions:** Running `screen` while already inside an attached `screen` session. **Why it's wrong:** The outer session intercepts the `Ctrl-A` prefix command, making it incredibly difficult to control the inner session. If you must nest, you must use `Ctrl-A a` to pass the literal prefix to the inner session.

## Best Practices

- Use `screen -d -r` as your default reattachment muscle memory. This ensures that if your previous SSH session was abruptly severed (leaving the server thinking the screen is still attached), it will forcefully detach the ghost connection and grant you immediate access.
- Customize the `~/.screenrc` file to add a persistent status bar at the bottom of the window, displaying the names of open tabs and the server time. Add `hardstatus alwayslastline "%{b kw}%H %{r}%1`%Lw%{R}%n%f* %t%{r}%+Lw %{k g}%c"` for a functional overview.
- If you frequently use `Emacs` or other programs that rely heavily on `Ctrl-A` (go to beginning of line), change `screen`'s default escape prefix in your `.screenrc` to something less conflicting, such as `escape ^Jj` (Ctrl-J).

## Interview Questions

**Q:** How does `screen` prevent a long-running script from being terminated when an SSH connection is unexpectedly closed?
**A:** When an SSH connection closes, a `SIGHUP` signal is sent to the terminal's processes. `screen` prevents termination by running a background daemon that holds a pseudo-terminal (PTY) open for the script. The script is attached to this virtual PTY, not the SSH session, so it never receives the `SIGHUP`.

**Q:** What is the technical difference between running a script with `nohup ./script.sh &` and running it via `screen -dmS job ./script.sh`?
**A:** `nohup` instructs the kernel to ignore the hangup signal and rigidly redirects `stdout`/`stderr` to a file; you cannot interact with the process once launched. `screen` spawns a fully interactive virtual terminal; you can attach to it later to provide keyboard input, view dynamic visual output, and detach again at will.

**Q:** How do you execute a command inside a detached screen session from the outside, without actually attaching your terminal to it?
**A:** You use the `-X` (execute) flag combined with the `-S` (session name) flag. For example, `screen -S session_name -X stuff "ls -l^M"` injects the `ls -l` command directly into the standard input of the detached shell.

## Practice Problems

**Problem:** You need to run a backup script named `/opt/backup.sh` completely in the background so you can log off immediately, and you want to name the session `nightly_backup`.
**Hint:** Combine the flags for starting in detached mode and naming the session.
**Solution:** `screen -dmS nightly_backup /opt/backup.sh`

**Problem:** You run `screen -ls` and see a session named `8832.compile_job`. However, it says `(Attached)` because your SSH client crashed earlier, and the server hasn't timed out the connection. Reattach to this session, forcing the ghost connection to drop.
**Hint:** Use the combination of detach and reattach flags targeting the specific session.
**Solution:** `screen -d -r 8832.compile_job`

## References

- [screen(1) - Linux manual page](https://man7.org/linux/man-pages/man1/screen.1.html)
- [GNU Screen Official Documentation](https://www.gnu.org/software/screen/manual/screen.html)
  === END FILE ===
