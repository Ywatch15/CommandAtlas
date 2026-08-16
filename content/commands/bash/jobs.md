---
slug: jobs
name: jobs
aliases: []
category: bash
tags:
  - shell
  - built-in
  - job-control
  - processes
  - monitoring
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
  - list background jobs
  - show suspended processes
  - check active shell tasks
  - view stopped jobs
relatedCommands:
  - bg
  - fg
  - ps
alternatives:
  - ps
status: draft
---

## What is it?

`jobs` is a shell built-in command that lists the status of all active jobs executing under the current shell session. It displays tasks that are currently running in the background (via the `&` operator) or suspended (via `Ctrl+Z`). It serves as the primary auditing tool for job control, providing the unique job numbers (jobspecs) required by commands like `fg`, `bg`, and `kill` to manipulate those specific processes.

## Why does it exist?

Operating system tools like `ps` or `top` display every process running on the entire machine, using raw OS Process IDs (PIDs). When a developer backgrounds multiple scripts in a single terminal, sifting through a global `ps` output to find their specific tasks is tedious. `jobs` exists to provide a localized, session-scoped view. It abstracts raw PIDs into simple, sequential integers (Job 1, Job 2) that are easy to type, offering a streamlined interface strictly for processes launched by the active terminal window.

## Syntax

```bash
jobs [-lnprs] [jobspec ...]
```

## Flags

_Note: Because `jobs` is a shell built-in, flag behavior can vary slightly between Bash, Zsh, and POSIX sh. The following are standard Bash flags._

| Flag | Description                                                                                                                         | Example   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `-l` | (Long format) Includes the actual OS Process IDs (PIDs) alongside the standard job number and status information.                   | `jobs -l` |
| `-p` | Prints _only_ the Process IDs (PIDs) of the active jobs. Useful for piping into external kill commands.                             | `jobs -p` |
| `-n` | Restricts output to only display jobs whose status has changed (e.g., from Running to Done) since the last time `jobs` was queried. | `jobs -n` |
| `-r` | Restricts output to only display jobs that are actively `Running` in the background.                                                | `jobs -r` |
| `-s` | Restricts output to only display jobs that are `Stopped` (suspended).                                                               | `jobs -s` |

## Examples

```bash
jobs
```

> The standard invocation. Outputs a list of all jobs managed by the shell. The output looks like: `[1]-  Running   sleep 100 &` and `[2]+  Stopped   vim file.txt`.

```bash
jobs -l
```

> Outputs the same list, but includes the OS-level PID. Example: `[1]+ 15482 Stopped   vim file.txt`. This is critical when you need to bridge shell job control with OS-level tools like `strace` or `gdb` that require a PID.

```bash
jobs -p | xargs kill -9
```

> A powerful combination. `jobs -p` extracts only the raw PIDs of all background/suspended jobs. `xargs` passes those PIDs to `kill -9`, forcefully terminating every single job spawned by the current shell instantly.

```bash
jobs %vi
```

> Queries the status of a specific job using string matching, rather than listing the entire table.

## Real-World Scenarios

**Auditing a Cluttered Workspace**

```bash
# Developer has been working for 4 hours
jobs
# [1]   Stopped                 top
# [2]   Stopped                 nano ~/.bashrc
# [3]-  Running                 ./test-suite.sh &
# [4]+  Stopped                 man grep
```

> After a long session of multitasking, a developer's shell environment becomes cluttered with forgotten paused editors and background tasks consuming memory. Typing `jobs` reveals the forgotten state, allowing the developer to systematically `fg %1` and `q`, or `kill %2` to clean up the workspace before logging out.

**Waiting on Parallel Execution**

```bash
./compile_module_a.sh &
./compile_module_b.sh &
jobs -r
# Checks if they are still running. If so:
wait
```

> A build script launches multiple compilations in the background to utilize multiple CPU cores. The engineer uses `jobs -r` to visually verify both tasks are successfully running, and then issues the `wait` command, which blocks the terminal until the job table empties.

## When should it NOT be used?

- **Checking Global Processes:** **Do not use `jobs` to find a process started by someone else.** `jobs` only shows processes spawned by your exact, current shell instance. If a cron job or another SSH session launched a script, `jobs` is blind to it. Use `ps aux` or `top`.
- **Auditing Disowned Processes:** **Do not use `jobs` to track daemons.** If you launched a server and used the `disown` built-in, the shell deletes the process from its internal job table. The process is still running on the OS, but `jobs` will return empty.

## Alternatives

- **`ps` (Process Status):** **Best for global visibility.** Shows all processes on the system, their resource consumption, and hierarchical parent/child relationships, completely independent of shell scoping.
- **`htop` / `btop`:** **Best for interactive monitoring.** Provides a real-time, color-coded, graphical interface in the terminal to monitor all system processes, CPU, and memory usage.

## How it works internally

Every interactive shell maintains a private, internal data structure known as the "job table."

When you launch a process in the background (`&`) or suspend a foreground process (`Ctrl+Z`), the shell assigns that process group an integer index (the jobspec, like `%1`) and records its OS Process ID (PID), its command-line string, and its current execution state (`Running`, `Stopped`, `Done`, `Terminated`) into this table.

The shell continuously monitors these child processes. When the OS kernel alters the state of a child process (e.g., it dies, or suspends due to `SIGTTIN`), the kernel sends a `SIGCHLD` signal to the parent shell. The shell intercepts this signal, calls `waitpid()` in a non-blocking manner to reap the status of the child, and silently updates the job table in memory.

When you execute the `jobs` command, the shell simply iterates over this internal memory structure and prints it to the screen. It does not actively query the OS kernel at the moment you run the command; it relies entirely on the asynchronously maintained table.

The `+` and `-` markers in the output indicate the "current" and "previous" jobs. The `+` marks the job that most recently changed state (usually the last suspended job), making it the default target for a naked `fg` or `bg` command.

## Performance Notes

- **Zero OS Overhead:** Because `jobs` reads a local data structure cached in the shell's memory space, it executes instantaneously with absolutely zero OS-level API calls or context switches.

## Security Notes

- **Session Isolation:** The job table is strictly bound to the active terminal session. It cannot be used as an escalation or reconnaissance vector to view processes running under different user accounts or different TTYs.

## Common Mistakes

- **Using `kill` on job numbers without the `%` symbol**
  - _Mistake:_ Seeing `[2] Running script.sh` in the output and typing `kill 2`.
  - _Why:_ The `kill` built-in expects either an OS PID or a shell jobspec. If you type `kill 2`, it asks the OS to terminate PID 2 (which is usually `kthreadd`, a core kernel process, and will fail). To target the shell job, you must include the percent sign: `kill %2`.
- **Assuming empty output means no custom scripts are running**
  - _Mistake:_ Typing `jobs`, seeing no output, and assuming it's safe to restart the server without killing long-running tasks.
  - _Why:_ Scripts launched via `nohup`, `tmux`, `screen`, systemd, or those that have been `disown`ed will not appear in the job table, despite actively running on the machine.

## Best Practices

- **Check before closing SSH:** Make it a habit to type `jobs` before exiting an SSH session. Exiting the shell sends a `SIGHUP` signal to all background jobs, killing them instantly. If `jobs` reveals running tasks, you must `disown` them or wait for completion to prevent data corruption.
- **Use `-l` when debugging:** When a background job starts behaving erratically or consuming massive CPU, standard `jobs` isn't enough. Use `jobs -l` to extract the PID, allowing you to pass it into `strace -p <PID>` to debug the system calls the rogue process is making.

## Interview Questions

**Q: In the output of the `jobs` command, one job is marked with a `+` sign and another with a `-` sign. What do these symbols mean?**
**A:** The `+` designates the "current" job. This is the default job that will be targeted if you run `fg` or `bg` without specifying a job number. It is typically the most recently suspended or backgrounded job. The `-` designates the "previous" job, which will become the default `+` job if the current `+` job terminates.

**Q: You want to forcefully terminate every background job running in your current terminal session in a single line of bash. How do you combine `jobs` and `kill` to achieve this?**
**A:** You can use `kill -9 $(jobs -p)`. The `jobs -p` command suppresses standard output and extracts only the raw OS PIDs of the active jobs. Command substitution passes those PIDs as arguments to `kill -9`, destroying them all.

## Practice Problems

**Problem:** You have a long list of jobs, but you only want to view the ones that are currently suspended (stopped), ignoring the ones actively running in the background.
**Hint:** Use the specific flag designed to filter by stopped state.
**Solution:**

```bash
jobs -s
```

**Problem:** You need the actual Process ID (PID) of your background jobs to pass into an external monitoring script, but the default `jobs` output doesn't show PIDs. Write the command to display the job list with PIDs included.
**Hint:** Use the long format flag.
**Solution:**

```bash
jobs -l
```

## References

- [Bash Reference Manual: Job Control Builtins](https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html)
- [POSIX Specification for jobs](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/jobs.html)
