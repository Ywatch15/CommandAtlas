---
slug: tmux
name: tmux
aliases: []
category: linux
tags:
  - tmux
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
  - keep process running after ssh disconnects
  - split terminal into multiple panes
  - manage multiple terminal sessions
  - share terminal session with another user
  - attach to background terminal session
relatedCommands:
  - nohup
  - autossh
alternatives:
  - bg
  - fg
  - nohup
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`tmux` (Terminal Multiplexer) is a command-line utility that allows multiple virtual terminal sessions to be created, accessed, and controlled from a single physical terminal or window. It provides the ability to detach from a running session—leaving all running processes executing in the background—and later reattach to that exact session from a different machine or terminal emulator. System administrators and developers rely on it to orchestrate complex multi-pane development environments and to safeguard long-running tasks against unstable network connections.

## Why does it exist?

Historically, if an SSH connection dropped, the operating system would send a `SIGHUP` (Hangup) signal to the user's login shell, which in turn terminated all child processes—instantly killing database migrations, compiler jobs, or server processes. While tools like `nohup` could prevent this, they offered no way to re-interact with the process later. GNU `screen` solved this by acting as a persistent middleman, but suffered from an aging, monolithic codebase. `tmux` was created as a modern, BSD-licensed alternative with a robust client-server architecture, highly scriptable command interface, and natively clean memory management for managing pseudoterminals (ptys).

## Syntax

```bash
tmux [global-options] [command] [command-flags]
```

## Flags

_Note: `tmux` operates using a combination of global flags and subcommands. The table below covers the most critical global flags alongside the most heavily used subcommands._

| Flag / Command         | Description                                                                                                 | Example                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `-2`                   | Forces `tmux` to assume the terminal supports 256 colors, bypassing faulty terminfo databases.              | `tmux -2 attach`                 |
| `-u`                   | Explicitly informs `tmux` that the terminal supports UTF-8, fixing rendering issues with unicode borders.   | `tmux -u`                        |
| `-S path`              | Specifies an alternate Unix domain socket path for the server, essential for sharing sessions across users. | `tmux -S /tmp/shared`            |
| `-c shell-cmd`         | Executes a specific shell command in the target pane or new session instead of a default interactive shell. | `tmux new -c "top"`              |
| `new-session` (`new`)  | Creates a new tmux session. Often used with `-s` to name the session.                                       | `tmux new -s dev`                |
| `attach-session` (`a`) | Attaches the current terminal to an existing, detached tmux session.                                        | `tmux a -t dev`                  |
| `list-sessions` (`ls`) | Lists all currently running tmux sessions managed by the active server.                                     | `tmux ls`                        |
| `kill-session`         | Destroys a specific session and sends SIGTERM to all child processes running within it.                     | `tmux kill-session -t dev`       |
| `kill-server`          | Forcibly terminates the `tmux` server and destroys all sessions, windows, and panes.                        | `tmux kill-server`               |
| `send-keys`            | Programmatically sends keystrokes (including control characters) to a specific pane.                        | `tmux send-keys -t dev "ls" C-m` |
| `source-file`          | Reloads the `tmux` configuration file into the running server without needing a restart.                    | `tmux source-file ~/.tmux.conf`  |

## Examples

```bash
tmux new-session -s db_migration
```

> Starts a new tmux session explicitly named "db_migration". Naming sessions (rather than letting them default to 0, 1, 2) makes it significantly easier to identify and attach to the correct workspace later using `tmux ls`.

```bash
tmux attach -t db_migration
```

> Attaches your current physical terminal to the backgrounded "db_migration" session. If the session is currently attached elsewhere, both clients will see the same mirrored output in real-time.

```bash
tmux list-sessions
```

> Queries the background server and prints all active sessions, including their window count, creation date, and whether they are currently attached to a client.

```bash
tmux send-keys -t my_session:0.1 "npm run start" C-m
```

> Non-interactively sends the string "npm run start" followed by the Enter key (`C-m` represents Ctrl+M, or carriage return) to session `my_session`, window `0`, pane `1`. This is a powerful mechanism for scripting complex environment setups.

```bash
tmux kill-session -a -t main
```

> Kills _all_ running tmux sessions except (`-a` for all, used contextually as "all others" with `-t`) the one named "main". Excellent for cleaning up stray sessions accumulated during a long workday.

## Real-World Scenarios

**Safeguarding Remote Migrations**

```bash
tmux new -s deploy
# [Inside tmux] ./run_database_migration.sh
# [Press Ctrl+B, then D to detach]
```

> When running a 3-hour database schema update over a VPN, engineers start the process inside a `tmux` session and immediately detach. If the VPN drops or the laptop goes to sleep, the migration continues safely on the server. The engineer reconnects later and runs `tmux attach` to check the progress.

**Scripted Workspace Initialization**

```bash
tmux new-session -d -s webdev 'vim'
tmux split-window -h -t webdev 'npm run watch'
tmux split-window -v -t webdev 'tail -f /var/log/nginx/error.log'
tmux attach -t webdev
```

> Developers use bash scripts containing `tmux` commands to automatically orchestrate their IDE layout. The script creates a detached session (`-d`), opens an editor in the main pane, vertically splits it for a build watcher, horizontally splits that for a log tail, and finally attaches the user to the fully prepared environment.

**Multi-User Pair Programming**

```bash
# User A (Host):
tmux -S /tmp/pair_socket new -s pairing
chmod 777 /tmp/pair_socket

# User B (Guest, over SSH):
tmux -S /tmp/pair_socket attach -t pairing
```

> By explicitly defining the Unix domain socket path and adjusting its permissions, two different Linux users can attach to the exact same `tmux` instance. Both users share the same cursor and view, enabling seamless remote pair programming or incident response collaboration.

## When should it NOT be used?

- **Running Background Daemons:** **Do not use `tmux` as a poor man's process manager.** Running long-term web servers or background workers inside a detached tmux session makes log rotation, crash recovery, and boot-time startup impossible. Use `systemd`, `supervisor`, or Docker containers instead.
- **Simple Output Redirection:** **Do not use `tmux` if you just want to ignore terminal output.** If you only need to run a script and log its output without keeping a shell open, `nohup ./script.sh > output.log 2>&1 &` is vastly lighter and less complex.
- **Non-Interactive GUI Apps:** **Do not use `tmux` for X11/Wayland applications.** `tmux` multiplexes pseudoterminals (text streams). While X11 forwarding (`$DISPLAY`) can technically be passed into a tmux session, managing graphical app lifecycles via a text multiplexer leads to broken sockets and zombie windows.

## Alternatives

- **`screen`:** **Best for legacy systems.** GNU Screen is the predecessor to tmux. While its configuration is archaic and it lacks modern pane management, it is pre-installed on almost every Unix system in existence, making it invaluable when you cannot install packages.
- **`zellij`:** **Best for discoverability and modern extensions.** Zellij is a newer, Rust-based terminal workspace. It features a persistent UI that teaches users keyboard shortcuts on the fly (no need to memorize a prefix key) and supports WebAssembly-based plugins.
- **`byobu`:** **Best for out-of-the-box experience.** Byobu is not a separate multiplexer, but a sophisticated wrapper around `tmux` (or `screen`). It provides a pre-configured, highly informative status bar (CPU, memory, updates) and intuitive function-key bindings without requiring manual `.tmux.conf` configuration.

## How it works internally

`tmux` strictly enforces a client-server architecture. When you run `tmux`, it first checks for an existing background server by looking for a Unix domain socket in `/tmp/tmux-<UID>/`. If no server exists, the `tmux` command forks itself. The parent becomes the client, and the child background daemonizes to become the server.

The server is responsible for interacting with the operating system kernel. It requests pseudoterminals (ptys) via `/dev/ptmx` and forks the child shells (like `/bin/bash`). Because these child shells are parented by the `tmux` server—which has no attached physical TTY—they are fully immune to `SIGHUP` signals originating from SSH dropouts.

The client process is simply a dumb renderer. It reads keystrokes from the user's physical terminal, sends them over the Unix socket to the server, and receives highly optimized terminal escape sequences back. The server maintains a complete internal state of every virtual screen (the scrollback buffer, cursor position, and colors). When a client attaches, the server diffs the client's screen size against the internal state and redraws it. I/O multiplexing within the server is handled asynchronously via the `libevent` library.

## Performance Notes

- **Scrollback Memory Consumption:** `tmux` stores scrollback history in RAM. Setting `history-limit` to an absurdly high number (e.g., `1000000`) in `.tmux.conf` across dozens of panes can cause the `tmux` server process to consume gigabytes of memory. Keep it reasonable (e.g., `10000` to `50000`).
- **Rendering Bottlenecks:** Because the `tmux` server parses and buffers all standard output before redrawing it to the client, accidentally `cat`ing a multi-gigabyte binary file can temporarily lock up the multiplexer, as a single CPU core pegs at 100% processing millions of escape characters.

## Security Notes

- **Socket Hijacking:** The `tmux` server's Unix socket defaults to `0600` permissions, restricted to the owning user. If you use `-S` to create a custom socket and arbitrarily `chmod 777` it for pair programming, _any_ user on that system can attach to your session and execute commands with your user privileges, resulting in total account compromise.
- **Environment Variable Stale State:** When you detach and reattach later, `tmux` preserves the original environment variables from when the server started. This means `SSH_AUTH_SOCK` (used for SSH agent forwarding) or `DISPLAY` variables will become stale and break if your upstream SSH connection properties change between attachments.
- **Nested Root Sessions:** Leaving a detached `tmux` session running with a root shell inside (via `sudo su`) is highly dangerous. If an attacker gains standard access to your user account, they can simply run `tmux attach` and instantly escalate to root without a password prompt.

## Common Mistakes

- **Nesting Multiplexers Blindly**
  - _Mistake:_ Opening `tmux`, SSHing into a server, and running `tmux` again, resulting in keystrokes being captured by the outer session instead of the inner one.
  - _Why:_ Both instances listen for the same prefix key (default `Ctrl+B`). If you must nest, configure the inner `.tmux.conf` to use a different prefix (like `Ctrl+A`), or press `Ctrl+B` twice to send the prefix to the inner session.
- **Restarting tmux to Load Configs**
  - _Mistake:_ Editing `~/.tmux.conf` and completely killing all sessions to make the changes take effect.
  - _Why:_ The config is evaluated by the server. You can reload it live without losing running processes by typing `Ctrl+B`, then `:`, and entering `source-file ~/.tmux.conf`.
- **Losing System Clipboard Functionality**
  - _Mistake:_ Highlighting text in a tmux pane and pressing `Ctrl+C`, only to find the text isn't in the OS clipboard.
  - _Why:_ `tmux` maintains its own internal clipboard buffer isolated from the host OS (X11/Wayland/macOS). Getting them to sync requires explicit `.tmux.conf` bindings using tools like `xclip`, `wl-copy`, or `pbcopy`.

## Best Practices

- **Change the Default Prefix:** The default `Ctrl+B` prefix requires an awkward hand stretch. Rebind it in your `.tmux.conf` to `Ctrl+A` (the legacy GNU screen standard) or `Ctrl+Space` for vastly improved ergonomics.
- **Use tmux-resurrect / tmux-continuum:** Install these community plugins to continuously save your session layouts and running foreground commands to disk. If the physical server reboots, you can restore your entire workspace with a single keystroke.
- **Set Base Index to 1:** By default, `tmux` numbers windows starting at `0`. Because `0` is on the far right of most keyboards, navigating to the first window is annoying. Add `set -g base-index 1` and `setw -g pane-base-index 1` to your config to align numbering with keyboard layout.

## Interview Questions

**Q: How does `tmux` prevent processes from terminating when a user's SSH connection abruptly drops?**
**A:** `tmux` relies on a client-server model. When you run a process inside `tmux`, its parent process is the background `tmux` server daemon, which holds the pseudoterminal (pty). When the SSH connection drops, the kernel sends a `SIGHUP` to the SSH client shell, but the `tmux` server ignores this and remains running, keeping the child ptys and their processes alive.

**Q: Explain the hierarchy of abstractions in `tmux` (Session, Window, Pane).**
**A:** A _Session_ is the highest-level container, representing a collection of one or more windows. A _Window_ is a single visible screen or workspace (analogous to a tab in a web browser) that occupies the entire terminal view. A _Pane_ is a subdivision of a Window, created by splitting the screen horizontally or vertically, running its own distinct shell process.

**Q: You have a detached tmux session running a script, and you want to cleanly terminate the session from standard bash without attaching to it. How?**
**A:** You can use the `kill-session` command targeting the specific session name. For example: `tmux kill-session -t session_name`. This bypasses the UI entirely and instructs the tmux server to send `SIGTERM` to the processes within that session and destroy the container.

## Practice Problems

**Problem:** You are currently attached to a `tmux` session but realize you need to change your `history-limit` in `~/.tmux.conf`. How do you apply the change to your _currently running_ session without detaching or killing it?
**Hint:** `tmux` has an internal command prompt accessed by pressing the prefix key followed by `:`.
**Solution:** Press `Ctrl+B` then `:`. In the yellow prompt at the bottom, type `source-file ~/.tmux.conf` and press Enter.

**Problem:** Write a single bash command that creates a new, completely detached tmux session named "worker", runs the command `python3 processor.py`, and immediately exits the tmux context, leaving the python script running in the background.
**Hint:** You need to start a new session, ensure it stays detached, specify the session name, and use the flag that defines the shell command to execute.
**Solution:**

```bash
tmux new-session -d -s worker "python3 processor.py"
```

## References

- [tmux(1) - OpenBSD manual page](https://man.openbsd.org/tmux.1)
- [tmux GitHub Wiki - Getting Started](https://github.com/tmux/tmux/wiki)
- [libevent - An event notification library](https://libevent.org/)
