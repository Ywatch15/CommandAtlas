---
slug: killall
name: killall
aliases:
  - terminate all
category: processes
tags:
  - linux
  - processes
  - signals
  - termination
  - psmisc
difficulty: beginner
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - kill process by name
  - stop all instances of program
  - force kill application linux
  - terminate specific users processes
  - send signal to group of processes
relatedCommands:
  - kill
  - pkill
  - pgrep
  - top
  - trap
alternatives:
  - pkill
status: draft
---

## What is it?

`killall` is a command-line utility from the `psmisc` package that sends a POSIX signal to all running processes matching an exact name. Unlike the standard `kill` command which requires precise numeric Process IDs (PIDs), `killall` sweeps the kernel's process table and simultaneously dispatches signals to every instance of the named application.

## Why does it exist?

Modern applications like Nginx, Apache, or Chrome operate using a multi-process architecture, spawning one master process and dozens of identical worker processes. If an administrator needs to terminate the application, running `ps aux`, extracting 20 different PIDs, and executing `kill 1 2 3...` is highly inefficient and error-prone. `killall` exists to abstract away numeric PIDs, providing a human-friendly interface to aggressively terminate or reload entire swarms of identical processes instantly based purely on their logical executable name.

## Syntax

```bash
killall [options] name...
```

## Flags

| Flag                          | Description                                                                         | Example                             |
| ----------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| `-s <signal>`                 | Specifies the exact POSIX signal to send (defaults to `SIGTERM`).                   | `killall -s SIGKILL nginx`          |
| `-e`, `--exact`               | Requires an exact match for extremely long process names (over 15 characters).      | `killall -e very_long_process_name` |
| `-I`, `--ignore-case`         | Ignores case sensitivity when matching the process name.                            | `killall -I Apache2`                |
| `-i`, `--interactive`         | Interactively prompts the user for confirmation before killing each matched PID.    | `killall -i php-fpm`                |
| `-q`, `--quiet`               | Suppresses error messages if no matching processes are found.                       | `killall -q zombie_process`         |
| `-r`, `--regexp`              | Interprets the provided name string as a POSIX Extended Regular Expression.         | `killall -r "^node.*"`              |
| `-u <user>`, `--user`         | Restricts the kill operation strictly to processes owned by the specified username. | `killall -u deployer ruby`          |
| `-w`, `--wait`                | Blocks execution, waiting iteratively until all matched processes actually die.     | `killall -w -s SIGTERM java`        |
| `-y <time>`, `--younger-than` | Kills only processes that have been running for _less_ than the specified duration. | `killall -y 5m runaway_script`      |
| `-o <time>`, `--older-than`   | Kills only processes that have been running for _more_ than the specified duration. | `killall -o 1h memory_leak_app`     |

## Examples

```bash
killall firefox
```

> This queries the system for every single process named exactly `firefox` and sends the default `SIGTERM` (15) signal to them, commanding the entire web browser and all its isolated sandbox tabs to gracefully shut down.

```bash
killall -9 httpd
```

> This employs the numeric signal shorthand. It sends the aggressive `SIGKILL` (9) to all instances of the Apache web server (`httpd`), violently destroying the memory allocations and bypassing any graceful teardown routines if the server is severely locked up.

```bash
killall -u bob sshd
```

> This restricts the blast radius utilizing the user flag (`-u`). It explicitly searches for the `sshd` process, but _only_ dispatches the termination signal to sessions owned by the user `bob`, protecting all other active remote administrator connections.

```bash
killall -w -s SIGHUP gunicorn
```

> This is a robust automation sequence. It sends the hangup/reload signal (`SIGHUP`) to a fleet of Python application servers, and mathematically waits (`-w`) by polling the process table, only returning control to the script once all old processes have cleanly swapped.

```bash
killall -o 24h background_worker
```

> This performs selective age-based pruning. It sweeps the process table and terminates instances of `background_worker`, but strictly limits the execution to processes that have been running for _more than 24 hours_ (`-o 24h`), preserving freshly spawned tasks.

## Real-World Scenarios

**Violent Teardown of Clustered Worker Pools**

```bash
killall -9 php-fpm
```

> When a massive traffic spike causes PHP FastCGI process managers to deadlock and consume 100% of server RAM, automated remediation scripts invoke a `killall -9` to instantly eradicate the entire worker pool, allowing the system supervisor (Systemd) to reboot a clean, fresh pool instantly.

**Graceful Configuration Hot-Reloading**

```bash
killall -s SIGHUP dnsmasq
```

> Infrastructure-as-Code (IaC) agents update local DNS resolution files. Rather than restarting the entire DNS caching layer (which drops active network requests), the agent issues a `SIGHUP` via `killall` to silently force every active DNS worker to re-read the updated zone files from disk.

**Evicting Hung CI/CD Build Processes**

```bash
killall -o 2h make
```

> Build servers occasionally suffer from hung compilation threads that never exit. A nightly cron job sweeps the server utilizing the older-than (`-o`) flag, terminating any `make` processes that have inexplicably lingered for over two hours, preventing CPU starvation for the next day's builds.

## When should it NOT be used?

- **Operating on Solaris or UNIX System V environments:** **Reason:** On Linux, `killall` kills processes by name. On classic UNIX systems (like Solaris), `killall` literally kills _all_ processes on the entire system, shutting down the OS. **Never run `killall` on an unknown UNIX variant without checking `man killall` first.**
- **Terminating critical multi-component applications:** **Reason:** If you `killall mysql`, it forcefully attacks the database directly rather than passing through standard shutdown scripts, potentially corrupting transaction logs. **Use instead:** `systemctl stop mysql`.

## Alternatives

- **`pkill`:** Regex-based process signaling. **Tradeoff:** `pkill` is bundled with `pgrep`. It inherently supports fuzzy matching and complex attribute filtering (like terminal TTYs), making it significantly more powerful for complex scripting than the literal string-matching of `killall`.
- **`kill`:** Absolute PID targeting. **Tradeoff:** Slower to use for grouped processes, but mathematically safer because it guarantees you are terminating the exact intended memory thread, rather than relying on string names that could be spoofed.

## How it works internally

`killall` (part of the `psmisc` suite) operates by rapidly traversing the Linux virtual filesystem at `/proc`.

When executed, `killall` iterates through every numerical process directory (e.g., `/proc/1024`, `/proc/1025`). For each directory, it reads the `stat` and `comm` (command) virtual files to extract the executing binary's exact name.

Historically, the Linux kernel truncated process names in the `comm` file to exactly 15 characters to conserve memory. If you ask `killall` to kill `my_very_long_application_name`, and it relies solely on the `comm` file, it might accidentally kill `my_very_long_ap`, which could belong to a completely different application. Modern `killall` mitigates this by applying complex checks, reading `/proc/pid/cmdline` to extract the full execution path, and mapping memory to ensure it targets the correct binary before dispatching the `kill()` system call to the gathered array of PIDs.

## Performance Notes

- Executing `killall` is slightly heavier than `kill` because it must traverse thousands of text files inside `/proc` to parse string names, whereas `kill` passes the integer directly to the kernel. However, this parsing executes in single-digit milliseconds, making the delay imperceptible.
- Utilizing the `-w` (wait) flag forces `killall` to enter a polling loop, checking `/proc` once every second until the PIDs vanish. On applications that catch `SIGTERM` and execute 60-second graceful teardowns, the terminal will block heavily.

## Security Notes

- **Privilege Masking:** A standard user can only execute signals against processes they own. If user `bob` executes `killall nginx` (and Nginx is owned by `root` and `www-data`), `killall` will silently fail to terminate the root processes, outputting an "Operation not permitted" error.
- **Process Spoofing Risk:** Any user can compile a binary and name it `sshd`. Because `killall` matches on string names, poorly written root remediation scripts executing `killall sshd` might accidentally target a maliciously named binary, creating unintended logic flaws.

## Common Mistakes

- **Assuming substring matching:** Running `killall java` expecting it to kill `java-worker-1`. **Why it's wrong:** By default, `killall` expects an _exact_ string match against the executing binary's name. It will skip `java-worker-1`. You must use `killall -r "java.*"` to enable regex subset matching, or switch to `pkill`.
- **The 15-character truncation limit:** Trying to kill a long script name and `killall` complains it cannot find it. **Why it's wrong:** The kernel truncates the process name in memory. You must use the `-e` (exact) flag, which forces `killall` to read deep into the full execution command-line arguments to find the match.
- **Blindly issuing `-9` to swarms:** **Why it's wrong:** While `kill -9 <PID>` destroys one process, `killall -9 <database>` destroys 50 database workers instantly. None of them flush their write-ahead logs, resulting in guaranteed mass data corruption. Always default to `-15`.

## Best Practices

- In destructive automation bash scripts, defensively structure your kills: `killall -15 app || true; sleep 5; killall -9 app || true`. This attempts graceful termination, yields, and then mercilessly wipes out zombies, while `|| true` prevents the script from crashing if the app was already dead.
- When managing massive shared hosts, universally combine `killall` with the `-u <username>` flag to absolutely mathematically guarantee you do not accidentally terminate services belonging to other tenants.
- If unsure what `killall` will hit, pair it with `pgrep -l <name>` first. `pgrep` uses identical matching logic but simply lists the targets, acting as a perfect dry-run visualizer.

## Interview Questions

- _Query:_ You are hired to manage a legacy Solaris UNIX mainframe, and a process is stuck. You remember using `killall httpd` on Linux. What catastrophic outcome occurs if you run `killall` on this Solaris machine?
  - _A:_ On classic UNIX System V environments (like Solaris or IBM AIX), the `killall` command does not take a process name as an argument. It literally means "kill all processes." Executing it will send termination signals to every single active process on the machine, instantly crashing the operating system and forcing a hard reboot. This is a critical cross-platform translation danger.
- _Query:_ A developer runs `killall node` but complains that their Node.js process keeps instantly reappearing with a new PID a second later. What system component is interfering with the termination, and how should it be stopped?
  - _A:_ The process is actively managed by a process supervisor or an initialization daemon (like `systemd`, `pm2`, or `Docker`). The supervisor detects that its child process died unexpectedly (due to the `killall` signal) and fulfills its configuration by instantly respawning a new instance to maintain uptime. To permanently stop the process, the developer must use the supervisor's native command (e.g., `systemctl stop my-node-app`) rather than attacking the binary directly via the kernel.
- _Query:_ What is the functional purpose of utilizing the `-w` (wait) flag with `killall` in an automated deployment script?
  - _A:_ Sending a `SIGTERM` signal is an asynchronous request; the `killall` command returns to the bash prompt instantly before the application actually finishes its graceful shutdown sequence. If the deployment script immediately launches the new version, port conflicts will occur. The `-w` flag forces `killall` to block synchronously, polling the kernel process table until every targeted PID has successfully vanished from RAM, ensuring a clean slate before proceeding.

## Practice Problems

- _Problem:_ Terminate all running instances of the `python3` binary, but restrict the blast radius exclusively to processes owned by the user `data_analyst`.
  - _Hint:_ Combine the base command with the target user isolation flag.
  - _Solution:_ `killall -u data_analyst python3` (This precisely sweeps the process table, skipping root-owned or other user-owned python tasks).
- _Problem:_ Forcefully and aggressively destroy a frozen application named `cache_worker`, waiting until the kernel confirms all instances are dead, and ignore case-sensitivity in the name.
  - _Hint:_ Chain the case-insensitive flag, the wait block flag, the specific signal for absolute termination, and the target string.
  - _Solution:_ `killall -I -w -9 cache_worker` (This sends SIGKILL ignoring case, and blocks execution until memory is verified clear).

## References

- [Man Page for killall (Linux)](https://man7.org/linux/man-pages/man1/killall.1.html)
- [PSMisc Utilities Repository](https://gitlab.com/psmisc/psmisc)
  === END FILE ===
