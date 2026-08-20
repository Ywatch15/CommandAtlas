---
slug: pidof
name: pidof
aliases: []
category: processes
tags:
  - linux
  - process-management
  - processes
  - sysadmin
  - debugging
difficulty: beginner
supportedOS:
  - linux
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - find process ID by name
  - get PID of running program
  - check if process is running linux
  - script to find daemon PID
  - locate process ID
relatedCommands:
  - pgrep
  - ps
  - kill
  - pkill
  - pstree
alternatives:
  - pgrep
status: draft
---

## What is it?

`pidof` is a command-line utility used to find the Process ID (PID) of one or more running programs by their exact executable name. It queries the system's process table and outputs a space-separated list of numeric PIDs that match the provided string, providing a fast, native way to resolve process identities for scripting and automation.

## Why does it exist?

Historically, administrators wrote brittle pipeline combinations like `ps aux | grep nginx | grep -v grep | awk '{print $2}'` just to extract the PID of a service to kill or monitor it. This approach spawned unnecessary subshells, was highly prone to matching incorrect processes (like a user editing a file named `nginx.conf`), and was computationally inefficient. `pidof` was created as part of the `sysvinit-utils` package to solve this by providing a dedicated, C-compiled binary that directly interrogates the kernel's process tree for exact binary name matches, heavily optimizing shell scripts.

## Syntax

```bash
pidof [options] program_name
```

## Flags

| Flag              | Description                                                                                                           | Example                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `-s`              | Single shot. Forces `pidof` to return only a single PID, even if multiple instances of the program are running.       | `pidof -s nginx`                |
| `-c`              | Restricts the match to processes running with the exact same root directory as the invoking `pidof` program.          | `pidof -c apache2`              |
| `-x`              | Instructs `pidof` to also return PIDs of shells running scripts that match the specified name.                        | `pidof -x backup.sh`            |
| `-o <pid>`        | Omits the specified PID (or multiple PIDs) from the output. Crucial for excluding the calling script's own PID.       | `pidof -o %PPID -o 1234 daemon` |
| `-q`              | Quiet mode. Suppresses all standard output, returning only an exit code (`0` for found, `1` for not found).           | `pidof -q sshd`                 |
| `-d <sep>`        | Specifies a custom separator (delimiter) character between PIDs instead of the default space.                         | `pidof -d , php-fpm`            |
| `-m`              | Includes processes that have mapped the specified executable into memory (e.g., dynamically loaded shared libraries). | `pidof -m libc.so.6`            |
| `-S <sep>`        | (SysVinit specific) A legacy alias for `-d` to specify the output separator.                                          | `pidof -S : bash`               |
| `-h`, `--help`    | Displays a brief help message and usage syntax.                                                                       | `pidof -h`                      |
| `-V`, `--version` | Prints the version of the `sysvinit-utils` package providing `pidof` and exits.                                       | `pidof -V`                      |

## Examples

```bash
pidof sshd
```

> The standard invocation. It scans the process table and outputs all active PIDs associated with the `sshd` binary, typically returning a space-separated list if multiple connections are active.

```bash
kill -9 $(pidof -s runaway_process)
```

> Extracts a single PID using the `-s` flag and pipes it immediately to the `kill` command. The `-s` flag acts as a safeguard, ensuring only one instance is terminated even if multiple instances have spawned.

```bash
pidof -o %PPID custom_daemon
```

> Employs the special `%PPID` syntax. This tells `pidof` to omit the Parent Process ID (the shell executing the command) from the results, preventing a script from accidentally killing itself when hunting for a daemon.

```bash
if pidof -q my_app; then echo "Running"; fi
```

> A highly efficient health check. The `-q` (quiet) flag suppresses terminal output, allowing the `if` statement to evaluate purely based on the exit code of `pidof` without redirecting output to `/dev/null`.

```bash
pidof -d ',' nginx
```

> Modifies the delimiter. Instead of returning `1234 5678`, it returns `1234,5678`. This is specifically designed for feeding PID lists directly into external monitoring tools like `strace -p` or top filters that expect comma-separated arrays.

## Real-World Scenarios

**Ensuring Single-Instance Execution (Mutex)**

```bash
if [ $(pidof -x my_cron_job.sh | wc -w) -gt 1 ]; then
    echo "Job already running. Exiting."
    exit 1
fi
```

> Cron jobs that run every minute can easily overlap if a previous execution hangs, causing a massive fork bomb. A bash script uses `pidof -x` to count how many instances of itself are running. If it detects more than one, the script immediately aborts, functioning as a lightweight, primitive mutex lock.

**Selective Daemon Reloading**

```bash
kill -HUP $(pidof -s uwsgi)
```

> When deploying updated PHP/Python configuration files, restarting the entire process drops active web requests. An administrator uses `pidof -s` to grab the single "master" PID of the worker pool and sends a `SIGHUP` signal, triggering a graceful, zero-downtime worker reload.

## When should it NOT be used?

- **Regex or Partial Matching:** **Do not use `pidof` if you don't know the exact binary name.** `pidof` matches exact executable strings. If you need to search for a process matching a regular expression (e.g., `*worker*`), you must use `pgrep`.
- **Killing processes instantly:** While you can run `kill $(pidof app)`, it is an anti-pattern. If you want to find and kill a process by name, `pkill app` or `killall app` accomplishes both actions natively in a single, safer command.
- **Java or Node.js Applications:** If you run `pidof my-spring-app.jar`, it will fail. The process name in the kernel is `java`, not the name of the jar file. You must use `pgrep -f "my-spring-app"` to match the full command-line arguments.

## Alternatives

- **`pgrep`:** **Best for modern automation.** Natively supports regular expressions, matching against full command lines (`-f`), and specific user matching (`-u`), making it vastly superior to `pidof` for complex queries.
- **`ps | grep`:** **Best for human visual inspection.** While bad for scripts, piping `ps` to `grep` allows a human to see the full context, start times, and arguments of the matched processes.

## How it works internally

`pidof` does not maintain an active tracking daemon; it performs a live, synchronous crawl of the `/proc` virtual filesystem upon execution.

When you run `pidof nginx`, the utility reads the directory entries in `/proc`. For every directory whose name is a number (representing an active PID), it navigates into that directory and opens the `/proc/[pid]/stat` or `/proc/[pid]/cmdline` file.

It compares the requested string (`nginx`) against the `comm` (command name) field inside the stat file, or evaluates the symbolic link located at `/proc/[pid]/exe`. If it matches, it adds the directory name (the PID) to its internal return array. Because `/proc` is an in-memory virtual filesystem provided directly by the kernel, this brute-force crawl executes in milliseconds, safely avoiding the heavy disk I/O of traditional file searches.

## Performance Notes

- **In-Memory Efficiency:** Because it queries `/proc`, `pidof` requires zero disk I/O. However, on highly congested servers with 50,000+ active processes, reading 50,000 `/proc/pid/stat` files sequentially can cause a minor CPU spike.
- **Namespace Blindness:** Standard `pidof` executed on a Docker host will return PIDs for processes running _inside_ containers, because the host kernel sees all processes. This can cause severe issues if you attempt to `kill` a PID assuming it belongs to the host OS.

## Security Notes

- **Information Disclosure:** Standard users can run `pidof`, but the kernel prevents them from reading specific restricted directories in `/proc`. Consequently, `pidof` will silently fail to return the PIDs of processes owned by `root` or other users if kernel security hardening (like `hidepid=2`) is active.

## Common Mistakes

- **Matching Interpreted Scripts**
  - _Mistake:_ Running `pidof python_worker.py` and getting no output.
  - _Why:_ The kernel registers the process name as the interpreter (`python`), not the script file. To find the script, you must use `pgrep -f python_worker.py`.
- **Failing to handle empty outputs**
  - _Mistake:_ Using `kill $(pidof non_existent_app)` in a bash script.
  - _Why:_ If the app is not running, `pidof` returns nothing. The command evaluates to `kill`, which causes the `kill` binary to throw a syntax error and halt the script. Always wrap it: `PIDS=$(pidof app); if [ -n "$PIDS" ]; then kill $PIDS; fi`.

## Best Practices

- **Use `%PPID` in Bash Scripts:** If writing a wrapper script that manages a daemon of the same name, always use `-o %PPID` to prevent the wrapper script from inadvertently committing suicide when it searches for the daemon.
- **Transition to `pgrep`:** While `pidof` is historically important, `pgrep` is universally recognized as the modern, POSIX-compliant standard that handles regex, users, and full-command-line matching safely.

## Interview Questions

**Q: You want to restart a daemon named `api_server`, but you only want to restart the "master" process, not the dozens of child worker processes. If `pidof api_server` returns 15 different PIDs, how do you extract only a single one?**
**A:** You use the `-s` (single shot) flag. Running `pidof -s api_server` forces the utility to return only the first PID it encounters in the process table. (Note: To guarantee it's the master process, using `pgrep -P 1 api_server` is architecturally safer).

**Q: In a bash script, you run `pidof check_db.sh` but it returns nothing, even though the script is visibly executing in another terminal. What flag is missing?**
**A:** The `-x` flag is missing. By default, `pidof` only matches compiled binary executables. Because `check_db.sh` is a shell script being executed by `/bin/bash`, you must instruct `pidof` to explicitly evaluate executing shell scripts using `-x`.

## Practice Problems

**Problem:** You are writing an automated cleanup script. You need to find all PIDs associated with the program `zombie_worker`, but you want the PIDs to be separated by a comma rather than a space so you can pass them into a specific profiling tool.
**Hint:** Use the flag that alters the output delimiter.
**Solution:**

```bash
pidof -d ',' zombie_worker
```

**Problem:** You want to check if `mysql` is running. You do not care about the actual PIDs, you only want the command to return an exit code of 0 if it is running, and output absolutely nothing to the terminal.
**Hint:** Use the quiet flag.
**Solution:**

```bash
pidof -q mysql
```

## References

- [pidof(8) - Linux man page](https://linux.die.net/man/8/pidof)
- [Linux /proc Filesystem Documentation](https://www.kernel.org/doc/html/latest/filesystems/proc.html)
