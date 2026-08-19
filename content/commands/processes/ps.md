---
slug: ps
name: ps
aliases:
  - process status
category: processes
tags:
  - linux
  - process-management
  - monitoring
  - sysadmin
  - top
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
  - list running processes
  - view process tree
  - check memory usage per process
  - find process by user
  - show all processes linux
relatedCommands:
  - top
  - pgrep
  - kill
  - pstree
  - pidof
alternatives:
  - top
  - htop
status: draft
---

## What is it?

`ps` (Process Status) is a core POSIX utility that captures and reports a static snapshot of the currently running processes on a Linux or Unix system. It extracts real-time kernel data—including process IDs (PIDs), memory consumption, CPU utilization, state (sleeping, running, zombie), and the exact command-line arguments used to launch the binaries—formatting them into highly customizable tabular outputs.

## Why does it exist?

Operating systems spawn thousands of background daemons, user tasks, and kernel threads. When a system slows down or an application hangs, administrators need immediate visibility into the kernel's process scheduler. While interactive tools like `top` exist for live monitoring, `ps` exists to provide an unbuffered, deterministic, and highly scriptable snapshot. Its output is designed to be easily piped into tools like `grep`, `awk`, and `kill`, serving as the foundational data-gathering tool for almost all automated system health checks and incident response scripts.

## Syntax

```bash
ps [options]
```

## Flags

_Note: `ps` is infamous for supporting three distinct flag syntaxes simultaneously: UNIX options (preceded by `-`), BSD options (no dash), and GNU long options (preceded by `--`). Mixing them can cause unexpected behavior._

| Flag              | Description                                                                                                                                                         | Example                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `aux`             | (BSD) The universal standard. Displays all processes (`a`), includes processes without an attached terminal (`x`), and provides user-oriented format columns (`u`). | `ps aux`               |
| `-e`, `-A`        | (UNIX) Selects all processes running on the system. Functionally similar to `ax` in BSD syntax.                                                                     | `ps -e`                |
| `-f`              | (UNIX) Does a "full-format" listing. Shows UID, PID, PPID, Start Time, and the full command-line string.                                                            | `ps -ef`               |
| `-o <format>`     | Customizes the output columns. Allows administrators to explicitly define which metrics to display (e.g., `pid,pcpu,pmem,comm`).                                    | `ps -eo pid,pmem,comm` |
| `-u <user>`       | Filters the output to display only processes owned by the specified effective user ID or name.                                                                      | `ps -u postgres`       |
| `-p <pid>`        | Restricts the output to a specific Process ID or a comma-separated list of PIDs.                                                                                    | `ps -p 1234,5678`      |
| `-C <name>`       | Selects processes strictly by their executable command name.                                                                                                        | `ps -C nginx`          |
| `--sort <[-]key>` | Sorts the tabular output based on a specific column. A `-` prefix indicates descending order.                                                                       | `ps aux --sort=-%mem`  |
| `Z`               | (BSD) Appends the SELinux security context (MAC policy) to the output.                                                                                              | `ps auxZ`              |
| `-H`              | Displays processes in a hierarchical format, visually indenting child processes under their parents.                                                                | `ps -efH`              |

## Examples

```bash
ps aux
```

> The absolute muscle-memory invocation for all Linux engineers. Outputs every process on the system. The columns include `USER`, `PID`, `%CPU`, `%MEM`, `VSZ` (Virtual Memory Size), `RSS` (Resident Set Size/Physical RAM), `TTY`, `STAT` (State), `START`, `TIME`, and `COMMAND`.

```bash
ps -ef | grep nginx
```

> The classic discovery pipeline. `ps -ef` lists all processes with full command-line arguments. Piping it to `grep` isolates the specific application, allowing an engineer to see the PID, parent PID (PPID), and the exact configuration file the process was launched with.

```bash
ps -eo pid,ppid,user,%mem,%cpu,cmd --sort=-%mem | head -n 10
```

> An advanced diagnostic query. It defines a highly specific custom format (`-o`), sorts the entire process table mathematically by memory consumption in descending order (`--sort=-%mem`), and extracts only the top 10 most memory-hungry processes on the server.

```bash
ps -p 1234 -o lstart,etime
```

> Extracts timing metrics. Targets a single known PID and explicitly asks the kernel to return the exact timestamp the process was started (`lstart`) and the total elapsed time it has been running (`etime`), bypassing all other irrelevant data.

```bash
ps -u apache -f
```

> User isolation. Retrieves all processes owned by the `apache` user and applies the full-format (`-f`) layout to easily map out the worker pool process tree.

## Real-World Scenarios

**Hunting for Zombie Processes**

```bash
ps aux | awk '{if ($8=="Z") print $0}'
```

> When a child process terminates but its parent fails to read its exit status, it becomes a Zombie (`Z` in the STAT column). Zombies consume Process Table slots and can prevent new processes from spawning. This command parses the massive `ps aux` output and isolates any process exhibiting the "Z" state flag for remediation.

**Auditing Docker/Container Breakouts**

```bash
ps -eo pid,user,args,cgroup | grep "docker"
```

> Because containers share the host's kernel, a host-level `ps` command can see inside all containers. Security engineers output the `cgroup` (Control Group) column to definitively identify which running process belongs to which specific Docker container namespace, aiding in identifying breakout attempts.

## When should it NOT be used?

- **Live Monitoring:** **Do not run `ps` repeatedly in a loop.** `ps` only captures a static snapshot in time. If you need to watch processes dynamically change CPU usage over 5 minutes, use `top` or `htop`.
- **Finding PIDs for Automation:** **Do not use `ps aux | grep app | awk '{print $2}'`.** This is a brittle anti-pattern. If you only need a PID to feed to a `kill` command, always use `pgrep app` or `pidof app`.
- **High-Frequency Scripting:** Executing `ps aux` on a heavily loaded server forces the kernel to generate data for 100,000+ processes. Doing this inside a highly concurrent monitoring script will cause measurable CPU spikes. Query `/proc/[pid]/stat` directly for hyper-optimized monitoring.

## Alternatives

- **`top` / `htop`:** **Best for visual analysis.** Provides an interactive, dynamically updating terminal dashboard of system resources and process hierarchies.
- **`pgrep`:** **Best for scripting.** Silently queries the process table and returns raw, unformatted PIDs perfectly structured for bash variables.
- **`pstree`:** **Best for architectural visualization.** Specifically designed to map out parent-child relationships visually, rather than listing flat tables.

## How it works internally

`ps` is a user-space utility that does not maintain a background daemon. When executed, it crawls the Linux `/proc` virtual filesystem.

For every numeric directory in `/proc` (each representing an active PID), `ps` opens and parses multiple files:

- `/proc/[pid]/stat`: Contains raw, space-separated values representing the PID, PPID, state (R/S/Z/D), and raw CPU tick counters.
- `/proc/[pid]/status`: Contains human-readable memory metrics (VmRSS, VmSize) and User/Group ID mappings.
- `/proc/[pid]/cmdline`: Contains the null-separated array of the exact command-line arguments used to spawn the process.

`ps` aggregates all this data into memory. It translates the raw kernel clock ticks into human-readable `%CPU` percentages (by comparing the process ticks against the total system uptime). It resolves the numeric UIDs to usernames by querying `/etc/passwd`. Finally, it applies the user-specified formatting and sorting logic before writing the massive ASCII table to standard output.

## Performance Notes

- **Snapshot Accuracy:** The `%CPU` column in `ps` does not represent live CPU usage over the last 1 second. It represents the _lifetime average_ CPU usage of the process since it was spawned. For long-running daemons, this number will often appear very low (e.g., `0.1%`) even if it is currently pegging a CPU core at 100%. Use `top` for live polling.

## Security Notes

- **Command-Line Secret Leakage:** The `COMMAND` column outputs exactly what was typed to start the process. If a script executes `mysql -u root -pSuperSecretPass`, running `ps aux` exposes that plaintext password to every user on the system. Always use environment variables or configuration files for secrets.
- **`hidepid` Mount Option:** On hardened systems, the `/proc` filesystem is mounted with `hidepid=1` or `2`. In this state, if a standard user runs `ps aux`, they will _only_ see their own processes. The kernel hides processes owned by other users or `root` entirely, preventing local reconnaissance.

## Common Mistakes

- **The `grep` self-match**
  - _Mistake:_ Running `ps aux | grep my_script` and wondering why the output always shows two results, even when the script is stopped.
  - _Why:_ The `grep my_script` command itself becomes a running process in the OS before `ps` executes. Therefore, `ps` captures the `grep` command in its snapshot. To avoid this, use `pgrep` or a regex trick: `ps aux | grep [m]y_script`.
- **Mixing BSD and UNIX flags**
  - _Mistake:_ Typing `ps -aux`.
  - _Why:_ In BSD syntax, `aux` means "all users, with tty, user format". When you add a dash (`-`), it becomes UNIX syntax. `-a` means "all with tty", `-u` means "specific user", and `x` is an error. Always use `ps aux` or `ps -ef`, but do not mix the dash paradigms.

## Best Practices

- **Use `STAT` Codes for Diagnosis:** Learn the state codes. `R` is Running. `S` is Interruptible Sleep (waiting for an event, completely normal). `D` is Uninterruptible Sleep (usually indicating catastrophic Disk/NFS hardware failure). `Z` is Zombie.
- **Format Outputs for Easy Parsing:** When writing automated reports, avoid parsing `ps aux`. Explicitly define your columns: `ps -eo pid,user,comm`. This ensures that updates to the OS or terminal width do not break your `awk` scripts.

## Interview Questions

**Q: You notice a process in `ps aux` has the state `D` (Uninterruptible Sleep). You try to kill it using `kill -9 <pid>`, but the process does not die. Why is this happening?**
**A:** A process in the `D` state is waiting directly on a hardware I/O operation inside the kernel (usually a failing hard drive, unresponsive NFS mount, or deadlocked driver). While in this state, the kernel refuses to deliver _any_ signals to the process, including `SIGKILL` (-9). The only way to remove the process is to resolve the underlying hardware issue or forcefully reboot the server.

**Q: Explain the fundamental difference in how `ps` calculates the `%CPU` column compared to how `top` calculates it.**
**A:** `ps` calculates the lifetime average. It takes the total CPU time the process has consumed since it started, divided by the total time the process has been alive. `top` calculates real-time polling. It takes a snapshot of CPU time, waits for a delay (e.g., 3 seconds), takes another snapshot, calculates the delta, and outputs the CPU usage specifically for that 3-second window.

## Practice Problems

**Problem:** You want to see every process running on the system, but you want the output explicitly sorted by the amount of physical RAM (`RSS`) they are consuming, displaying the largest consumers at the top.
**Hint:** Use the custom formatting flag, specify the columns, and use the sort flag with a descending modifier.
**Solution:**

```bash
ps -eo pid,user,rss,comm --sort=-rss
```

**Problem:** You are running an application named `backend-api` under the service account `appuser`. Write the command to output only the processes owned by this specific user, using the full-format UNIX display.
**Hint:** Use the user isolation flag combined with the full-format flag.
**Solution:**

```bash
ps -u appuser -f
```

## References

- [ps(1) - Linux man page](https://linux.die.net/man/1/ps)
- [Understanding Linux Process States](https://man7.org/linux/man-pages/man1/ps.1.html#PROCESS_STATE_CODES)
