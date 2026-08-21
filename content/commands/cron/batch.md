---
slug: batch
name: batch
aliases:
  - at -b
category: cron
tags:
  - cron
  - scheduling
  - load-average
  - batch-jobs
  - background
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - run job when system load permits
  - execute batch task low load
  - schedule command under load threshold
  - defer job to idle time
  - queue background load-managed job
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`batch` is a command-line utility used to queue and execute commands when system load levels permit. It functions as a specialized wrapper around the `at` scheduling utility, automatically deferring task execution until the system's 1-minute load average drops below 0.8 (or a custom configured threshold).

## Why does it exist?

Heavy administrative operations—such as compiling large software packages, indexing databases, or running massive backup compression tasks—can consume immense CPU and I/O resources, severely degrading interactive system responsiveness if executed during peak working hours. `batch` exists to optimize server resource utilization, allowing administrators to submit resource-intensive jobs immediately while guaranteeing the operating system will hold execution until off-peak idle periods when system load permits.

## Syntax

```bash
batch [-V] [-q queue] [-f file] [-m]
```

## Flags

| Flag        | Description                                                                       | Example                             |
| ----------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| `-V`        | Prints the version number of the batch utility to standard error and exits.       | `batch -V`                          |
| `-q queue`  | Specifies a designated processing queue for batch execution.                      | `batch -q b -f maintenance.sh`      |
| `-f file`   | Reads commands to be executed from the specified file rather than standard input. | `batch -f /opt/scripts/optimize.sh` |
| `-m`        | Sends an email notification to the user when the batch job finishes executing.    | `batch -m`                          |
| `-M`        | Suppresses email notifications even if standard output or error was generated.    | `batch -M`                          |
| `-h`        | Displays brief usage documentation and supported command-line options.            | `batch -h`                          |
| `--help`    | Outputs standard help documentation details.                                      | `batch --help`                      |
| `--version` | Displays version information and copyright details.                               | `batch --version`                   |
| `-v`        | Displays the job submission details and load threshold status.                    | `batch -v`                          |
| `-d`        | Debug mode, printing internal queue injection steps.                              | `batch -d`                          |

## Examples

```bash
batch
```

> This opens an interactive `batch>` prompt where you can type shell commands terminated by `Ctrl+D`, queuing them to run as soon as system load drops below the threshold.

```bash
echo "apt-get upgrade -y" | batch
```

> This pipes a package upgrade command into `batch`, deferring system updates until server CPU utilization and load averages subside.

```bash
batch -f /usr/local/bin/heavy_index.sh
```

> This submits an intensive database indexing script file to the batch queue, ensuring it executes safely during idle system periods.

```bash
batch -M -f /var/backups/compress.sh
```

> This schedules a heavy backup compression task in the batch queue while suppressing all email generation (`-M`) upon completion.

```bash
batch -v < compile_job.sh
```

> This submits a compilation job with verbose reporting enabled (`-v`), confirming queue submission parameters and target load criteria.

## Real-World Scenarios

**Deferring Heavy Software Compilations**

```bash
batch -f ./compile_kernel.sh
```

> Software developers and systems engineers building custom Linux kernels submit compilation tasks via `batch`, allowing heavy multi-threaded builds to run automatically overnight when servers are idle.

**Scheduling Resource-Intensive Database Maintenance**

```bash
echo "vacuumdb --all --analyze" | batch
```

> Database administrators queue heavy maintenance operations like PostgreSQL table vacuuming into `batch` to prevent locking and CPU starvation on live production web applications.

**Bulk Log Archival and Compression**

```bash
batch -f /opt/scripts/compress_logs.sh
```

> Infrastructure automation pipelines pipe massive log archival tasks into `batch` to ensure compression utilities do not spike system load averages while users are actively connected.

## When should it NOT be used?

- **Time-critical jobs requiring execution at a precise clock time:** **Reason:** `batch` execution timing is entirely variable and dependent on system load averages; it does not run at a specific hour. **Use instead:** `at` or `cron`.
- **Running continuous background daemon services:** **Reason:** `batch` is built for single-run deferred batch tasks, not persistent daemon processes. **Use instead:** Systemd service units.

## Alternatives

- **`at`:** The general-purpose deferred task scheduler. **Tradeoff:** `at` executes jobs at specific times or intervals, whereas `batch` executes jobs dynamically based on system load thresholds.
- **`nice` and `ionice`:** Process priority schedulers. **Tradeoff:** `nice` lowers a running process's CPU priority immediately, whereas `batch` holds the job off entirely until system load drops.

## How it works internally

`batch` is implemented as a specialized symbolic link or wrapper binary pointing to the `at` command utility, invoked implicitly with the `-b` flag.

When you submit a job via `batch`, the utility writes the command script and environment snapshot into the system spool directory (`/var/spool/cron/atjobs/`), assigning it to a specific low-priority batch queue (traditionally queue `b`).

The background daemon `atd` continuously monitors system load averages by reading `/proc/loadavg` (on Linux systems). While the 1-minute load average remains above the hardcoded threshold (traditionally `0.8`), `atd` halts execution of jobs in the batch queue. As soon as system load drops below `0.8`, `atd` awakens, forks a child process with dropped user privileges, and executes the waiting batch jobs sequentially.

## Performance Notes

- `batch` actively protects system performance by throttling resource-heavy tasks, preventing CPU thrashing and context-switching bottlenecks during peak operational hours.
- Because load evaluation depends on kernel load average polling intervals, jobs may experience minor scheduling delays even after load drops.

## Security Notes

- **Access Control Restrictions:** Like `at`, `batch` is governed by `/etc/at.allow` and `/etc/at.deny` configuration files, preventing unauthorized users from flooding system execution queues.
- **Privilege Boundary Enforcement:** Batch jobs execute under the exact UID/GID of the submitting user, ensuring resource-heavy tasks cannot run with elevated privileges unless explicitly piped via `sudo batch`.

## Common Mistakes

- **Expecting immediate execution:** Running `batch` and wondering why your script hasn't started. **Why it's wrong:** If your server's 1-minute load average is above 0.8, `batch` will intentionally hold the job indefinitely until the system becomes idle.
- **Using `batch` for time-sensitive releases:** **Why it's wrong:** `batch` has no concept of deadlines; it runs solely based on CPU load. Use `at` if a job must run by a specific time.

## Best Practices

- Use `batch` for all heavy administrative maintenance scripts (backups, compilations, indexing) to maintain high interactive server responsiveness for users.
- Combine `batch` with resource nice levels (`nice -n 19 batch`) to achieve double protection against system resource starvation.

## Interview Questions

**Q:** What is the fundamental mechanism that determines when a job submitted via `batch` begins execution?
**A:** Unlike standard schedulers that trigger tasks based on absolute clock times, `batch` relies on the `atd` daemon monitoring the system's 1-minute load average via `/proc/loadavg`. Execution is held until the load average drops below the threshold (typically `0.8`).
**Q:** How does `batch` relate structurally to the `at` command utility in Unix-like operating systems?
**A:** `batch` is architecturally a specialized wrapper or alias for the `at` utility invoked with the `-b` flag, sharing the exact same spool directory infrastructure and background daemon (`atd`).
**Q:** Why is `batch` preferred over immediate execution for resource-intensive tasks on multi-tenant servers?
**A:** `batch` automatically defers CPU-heavy and I/O-intensive tasks until off-peak idle periods, preventing resource contention, high load averages, and latency degradation for active users.

## Practice Problems

**Problem:** Queue a system maintenance script `/opt/maintenance.sh` to run automatically whenever system load permits.
**Hint:** Use the file input flag combined with the batch scheduling command.
**Solution:** `batch -f /opt/maintenance.sh` (This queues the maintenance script into the load-managed batch execution queue).
**Problem:** Pipe a database optimization command into the batch queue, suppressing all email notifications.
**Hint:** Combine the pipe input, batch command, and suppress-email flag.
**Solution:** `echo "optimize_db" | batch -M` (The `-M` flag ensures no mail is dispatched upon completion).

## References

- [Man Page for batch (Linux)](https://man7.org/linux/man-pages/man1/batch.1.html)
- [GNU/Linux At Daemon Documentation](https://www.gnu.org/software/inetutils/)
