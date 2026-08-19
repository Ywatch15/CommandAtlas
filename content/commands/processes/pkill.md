---
slug: pkill
name: pkill
aliases: []
category: processes
tags:
  - linux
  - process-management
  - signals
  - termination
  - sysadmin
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - kill process by name
  - terminate all user processes
  - send signal to program linux
  - force kill application
  - stop daemon by name
relatedCommands:
  - kill
  - pgrep
  - killall
  - top
alternatives:
  - killall
  - kill
status: draft
---

## What is it?

`pkill` is a robust command-line utility used to send a POSIX signal (defaulting to `SIGTERM`) to one or more running processes based on their name, specific attributes, or regular expression matching. Operating as the destructive sibling to `pgrep`, it eliminates the multi-step process of manually looking up a Process ID (PID) before invoking the standard `kill` command.

## Why does it exist?

The traditional `kill` command fundamentally requires a numeric PID. In automated environments, extracting a PID requires fragile pipelines (e.g., `ps aux | grep nginx | awk '{print $2}' | xargs kill`). This pattern is highly susceptible to race conditions and false positives. `pkill` exists to provide a native, atomic action. It safely wraps process discovery and signal transmission into a single C-compiled binary, ensuring that developers can reliably and safely restart, terminate, or pause groups of processes across the OS using clean string matching and user isolation.

## Syntax

```bash
pkill [options] pattern
```

## Flags

| Flag            | Description                                                                                                 | Example                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `-SIGNAL`       | Specifies the signal to send (e.g., `-9` for SIGKILL, `-1` for SIGHUP). Defaults to `-15` (SIGTERM).        | `pkill -9 nginx`              |
| `-u <user>`     | Restricts the kill operation strictly to processes whose Effective User ID matches the specified user.      | `pkill -u www-data php-fpm`   |
| `-f`            | Matches the pattern against the _entire_ command line (including arguments), not just the executable name.  | `pkill -f "python worker.py"` |
| `-x`            | Requires an exact match of the process name. Prevents `pkill ssh` from accidentally killing `ssh-agent`.    | `pkill -x ssh`                |
| `-P <ppid>`     | Kills all child processes spawned by the specified Parent Process ID.                                       | `pkill -P 1234`               |
| `-t <tty>`      | Kills processes associated with a specific terminal (e.g., kicking a user off a specific SSH session).      | `pkill -t pts/2`              |
| `-o`            | Only kills the oldest (first created) process matching the pattern.                                         | `pkill -o chrome`             |
| `-n`            | Only kills the newest (most recently created) process matching the pattern.                                 | `pkill -n chrome`             |
| `-e`, `--echo`  | Prints the names and PIDs of the processes that were successfully signaled. Excellent for auditing scripts. | `pkill -e -9 node`            |
| `-c`, `--count` | Suppresses standard execution but prints the total number of processes that matched and were signaled.      | `pkill -c ruby`               |

## Examples

```bash
pkill memcached
```

> The standard invocation. Sends a graceful `SIGTERM` (Signal 15) to every process on the system whose executable name contains the string `memcached`, allowing them to flush their memory to disk before exiting.

```bash
pkill -9 -u alice
```

> The user-purge command. Forcefully terminates (`SIGKILL`) every single process owned by the user `alice`. Administrators use this to instantly sever a compromised user account's entire session and all associated background tasks.

```bash
pkill -HUP -x sshd
```

> Sends a `SIGHUP` (Signal 1) to the process exactly named `sshd`. In daemon management, `SIGHUP` instructs the process to softly reload its configuration files (`/etc/ssh/sshd_config`) without disconnecting active SSH sessions.

```bash
pkill -f "celery -A myapp worker"
```

> Matches the full execution string. Because background workers (like Celery or Sidekiq) all show up as the `python` or `ruby` binary in the kernel, searching by name fails. The `-f` flag expands the search to the arguments, safely killing only the specific worker pool.

```bash
pkill -e -P 5678
```

> Orphan cleanup. Kills all immediate child processes belonging to Parent PID 5678, and uses `-e` to explicitly print the PIDs and names of the processes being destroyed to the terminal for confirmation.

## Real-World Scenarios

**Emergency OOM Mitigation**

```bash
pkill -9 -o java
```

> When a server runs out of memory and becomes entirely unresponsive, an administrator manages to log in. Instead of killing all Java microservices, they use the `-o` (oldest) flag to forcefully terminate only the longest-running JVM (likely the one suffering from a massive memory leak), stabilizing the node while preserving newer requests.

**Resetting Stale CI/CD Environments**

```bash
pkill -u jenkins -f "chrome --headless"
```

> End-to-end testing pipelines frequently leave behind orphaned headless browser processes that consume massive amounts of RAM. A teardown script safely isolates and kills only the headless Chrome instances owned by the `jenkins` user, ensuring clean test runs for subsequent jobs.

## When should it NOT be used?

- **Systemd Managed Services:** **Do not use `pkill` to manage core system daemons.** If you run `pkill nginx`, `systemd` detects the process death as a failure and instantly restarts it. Always use `systemctl stop nginx` or `systemctl reload nginx` so the init system tracks the intended state.
- **Vague String Matching:** **Never run `pkill root` or `pkill sh`.** Because `pkill` defaults to substring matching, running `pkill vi` will kill `vim`, but it will also aggressively kill a custom script named `provider_service` because it contains the letters "vi". Always use `-x` for exact matches.

## Alternatives

- **`killall`:** **Best for exact binary matching.** `killall` enforces exact name matching by default, making it slightly safer than `pkill` for beginners, but it lacks the advanced regex and full-command-line `-f` capabilities of `pkill`.
- **`kill`:** **Best for deterministic, PID-based targeting.** If you already know the PID, `kill` removes all risk of accidental substring matching.

## How it works internally

`pkill` is compiled from the same C source code as `pgrep`.

When executed, `pkill` reads the `/proc` directory. It iterates through every numbered directory (representing active PIDs). It reads the `stat`, `status`, and `cmdline` files within each directory to evaluate the process's effective UID, terminal association, and binary name.

It matches the user-provided string against these values using standard POSIX extended regular expressions. It complies a list of all PIDs that evaluate to true.

Finally, `pkill` iterates through this compiled array of PIDs and issues the `kill()` system call for each one, passing the requested signal integer (defaulting to 15). If the executing user does not possess sufficient privileges (e.g., attempting to kill a process owned by `root` while running as a standard user), the `kill()` syscall returns an `EPERM` error, which `pkill` quietly ignores unless running in verbose mode.

## Performance Notes

- **Regex Overhead:** Searching thousands of processes using complex regex with the `-f` (full command line) flag requires reading thousands of `/proc/[pid]/cmdline` files and executing string evaluations in memory. While fast, running heavy `-f` regex sweeps in high-frequency monitoring loops can induce measurable CPU load.

## Security Notes

- **Unprivileged Signal Boundaries:** A standard user can run `pkill`, but the kernel strictly enforces that a user can only send signals to processes matching their own Real or Effective UID.
- **Denial of Service via Substrings:** If a script uses `pkill $USER_INPUT`, a malicious user passing the string `a` will cause `pkill` to signal every single process on the system containing the letter 'a', causing a catastrophic Denial of Service. Always validate inputs or enforce `-x`.

## Common Mistakes

- **Using `-9` immediately**
  - _Mistake:_ Typing `pkill -9 myapp` every time an app needs to restart.
  - _Why:_ `SIGKILL` (-9) cannot be caught or handled by the application. Open database transactions are torn, temporary files are orphaned, and caches are corrupted. Always try standard `pkill myapp` (SIGTERM) first, allowing the app 5 seconds to gracefully shut down.
- **Confusing user flags**
  - _Mistake:_ Using `pkill root`.
  - _Why:_ This does not kill processes owned by root. It kills processes whose _name_ contains the string "root". To target a user, you must explicitly use `pkill -u root`.
- **Killing interpreters instead of scripts**
  - _Mistake:_ Running `pkill my_script.py` and nothing happens.
  - _Why:_ The kernel tracks the process name as `python`, not the script name. You must use `pkill -f my_script.py` to match against the arguments.

## Best Practices

- **Audit Before Killing:** If you are unsure what a complex `pkill` command will hit, _always_ run `pgrep` with the exact same flags first (e.g., `pgrep -a -f "node server.js"`). `pgrep` safely lists what will be targeted. Once verified, swap `pgrep` for `pkill`.
- **Use `-e` for Logging:** In automated teardown scripts, always append `-e` (`pkill -e myapp`). When the script logs are reviewed later, administrators can see the exact PID and process name that was destroyed, proving the script behaved correctly.

## Interview Questions

**Q: You want to gracefully reload the configuration of a service named `haproxy` without terminating active connections. You know the service accepts the `SIGHUP` signal for this purpose. Write the `pkill` command to achieve this.**
**A:** `pkill -HUP haproxy` or `pkill -1 haproxy`. This sends the Hangup signal instead of the default Terminate signal.

**Q: Why is `pkill -f "java -jar app.jar"` necessary, whereas `pkill java` is considered highly dangerous on a shared server?**
**A:** `pkill java` targets the base executable name. It will send a termination signal to _every_ JVM running on the server, potentially taking down unrelated databases, logging agents, or APIs. Using `-f "java -jar app.jar"` forces `pkill` to evaluate the entire command-line string, ensuring it only targets the specific application running that exact JAR file.

## Practice Problems

**Problem:** A user named `dev_tester` has left several processes running that are consuming memory. Write a single command to forcefully and instantly kill (SIGKILL) all processes owned by this specific user.
**Hint:** Combine the SIGKILL integer flag with the specific user-targeting flag.
**Solution:**

```bash
pkill -9 -u dev_tester
```

**Problem:** You need to kill a background script named `data_sync.sh`, but you want to guarantee that you only kill it if the process name is an exact match, preventing you from accidentally killing a process named `data_sync_backup.sh`.
**Hint:** Use the flag that enforces exact string matching.
**Solution:**

```bash
pkill -x data_sync.sh
```

## References

- [pkill(1) - Linux man page](https://linux.die.net/man/1/pkill)
- [Linux Signals (signal(7))](https://linux.die.net/man/7/signal)
