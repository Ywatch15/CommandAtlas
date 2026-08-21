---
slug: atq
name: atq
aliases:
  - at -l
category: cron
tags:
  - cron
  - scheduling
  - queue
  - jobs
  - utilities
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
  - list pending at jobs
  - view at queue
  - check scheduled one-time tasks
  - show pending deferred jobs
  - audit at queue jobs
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`atq` is a command-line utility used to list all pending deferred jobs residing in the user's `at` queue. It scans the system spool directories and outputs a formatted list displaying job identification numbers, scheduled execution timestamps, assigned queue letters, and owner usernames.

## Why does it exist?

Once one-off deferred tasks are submitted via the `at` command, administrators and standard users require an audit mechanism to inspect the queue state. Without a dedicated listing utility, users would have to manually parse complex filenames inside raw system spool directories. `atq` exists to bridge this gap, presenting a clean, human-readable summary of all pending future tasks.

## Syntax

```bash
atq [-V] [-q queue]
```

## Flags

| Flag        | Description                                                                    | Example         |
| ----------- | ------------------------------------------------------------------------------ | --------------- |
| `-V`        | Prints the version number of the atq utility to standard error and exits.      | `atq -V`        |
| `-q queue`  | Limits the listing output strictly to a specified processing queue (a-z, A-Z). | `atq -q b`      |
| `-v`        | Lists completed but not yet deleted jobs or displays extended output format.   | `atq -v`        |
| `-h`        | Displays brief usage documentation and supported command-line options.         | `atq -h`        |
| `--help`    | Outputs standard help documentation details.                                   | `atq --help`    |
| `--version` | Displays version information and copyright details.                            | `atq --version` |
| `-f`        | Forces output formatting (supported on select UNIX variants).                  | `atq -f`        |
| `-p`        | Prints job PIDs or process group details where applicable.                     | `atq -p`        |
| `-d`        | Debug mode, printing internal queue parsing steps.                             | `atq -d`        |
| `-s`        | Sorts output strictly by job ID rather than execution timestamp.               | `atq -s`        |

## Examples

```bash
atq
```

> This queries the system `at` queue and outputs a table showing the job number, scheduled date and time, queue letter, and owner username for all pending tasks owned by the current user.

```bash
sudo atq
```

> When executed with superuser privileges (`sudo`), `atq` bypasses user boundaries and lists _all_ pending deferred jobs queued across every user account on the system.

```bash
atq -q c
```

> This filters the queue listing to display exclusively the jobs assigned to processing queue `c`, allowing administrators to inspect workload priorities.

```bash
atq | grep "2026-10-15"
```

> This pipes the output of `atq` into `grep` to filter and inspect whether any deferred jobs are scheduled for a specific future target date.

```bash
atq | awk '{print $1}'
```

> This extracts strictly the job ID numbers from the `atq` output stream, making it useful for automation scripts that batch-process queue management.

## Real-World Scenarios

**Auditing Pending System Maintenance Tasks**

```bash
sudo atq
```

> Lead system administrators review the global `at` queue before performing major kernel upgrades or reboots to ensure no conflicting maintenance scripts or automated reboots are scheduled to fire simultaneously.

**Verifying Successful Job Submission**

```bash
echo "systemctl restart apache2" | at 04:00 && atq
```

> Engineers piping commands into `at` immediately follow up with `atq` to visually verify that their job was successfully parsed, assigned an ID number, and queued into the system spool.

**Cleaning Up Obsolete or Forgotten Scheduled Tasks**

```bash
atq | grep "root"
```

> Security auditors inspect user queues to check for lingering administrative tasks or unauthorized background scripts left active by departing team members.

## When should it NOT be used?

- **Checking recurring cron schedule configurations:** **Reason:** `atq` only inspects one-off deferred jobs in the `at` queue; it cannot display standard periodic crontab entries or systemd timers. **Use instead:** `crontab -l` or `systemctl list-timers`.
- **Inspecting detailed command payloads inside jobs:** **Reason:** `atq` only displays scheduling metadata (ID, time, queue, user); it does not print the actual bash commands queued inside the job. **Use instead:** `at -c <job_id>`.

## Alternatives

- **`at -l`:** The built-in shorthand equivalent flag provided by the `at` binary itself. **Tradeoff:** `at -l` performs the exact same queue listing operation as `atq`, but `atq` is the dedicated POSIX command name optimized for script readability.
- **`crontab -l`:** Lists recurring cron jobs. **Tradeoff:** It displays repeating schedules rather than one-time deferred tasks.

## How it works internally

`atq` operates by reading the contents of the system's `at` spool directory (typically located at `/var/spool/cron/atjobs/`).

When invoked, the utility iterates through the files in the spool directory, inspecting their permissions to ensure non-root users only see files matching their respective UIDs (while root users with `sudo` can read all files). It parses the filename encoding scheme, which embeds the queue letter and hexadecimal sequence number, and reads the internal metadata headers of each job file to extract the precise scheduled execution timestamp.

`atq` then sorts the discovered jobs chronologically by their execution time and formats the output into columns showing the job ID, formatted date, time, queue assignment, and owner. The command exits with `0` upon successful auditing, or non-zero if spool directories are inaccessible.

## Performance Notes

- `atq` executes almost instantaneously because it performs local filesystem directory scans and metadata parsing without spawning complex database queries.
- In environments hosting massive backlogs of millions of pending jobs, `atq` can experience minor I/O latency when sorting and formatting spool entries.

## Security Notes

- **User Isolation:** Standard users executing `atq` are restricted by filesystem permissions and daemon checks to view _only_ their own pending jobs, preventing unauthorized inspection of other users' scheduled tasks.
- **Privilege Escalation:** Running `atq` via `sudo` grants complete visibility into all system tasks, exposing potential administrative workflows and usernames to inspection.

## Common Mistakes

- **Expecting `atq` to show job contents:** Running `atq` and wondering why you cannot see the actual script commands. **Why it's wrong:** `atq` is strictly a metadata listing tool. You must use `at -c <job_id>` to inspect the command payload.
- **Forgetting `sudo` when auditing system-wide jobs:** Running plain `atq` and seeing an empty list while knowing jobs were scheduled. **Why it's wrong:** Standard users only see their own jobs. If root scheduled the job, you must run `sudo atq`.

## Best Practices

- Always run `atq` immediately after submitting important one-off tasks to confirm they are registered correctly in the spool queue with proper timestamps.
- Combine `atq` with text-processing utilities like `awk` or `grep` when writing automation scripts designed to audit or filter system queues.

## Interview Questions

**Q:** What is the primary operational difference between the output of `atq` versus checking `crontab -l`?
**A:** `atq` lists pending one-off deferred jobs queued via the `at` command, whereas `crontab -l` lists recurring, repeating periodic tasks scheduled via the cron daemon.
**Q:** Why can a standard, unprivileged user running `atq` see their own scheduled jobs but not those of other system users?
**A:** System spool directories enforcing `at` jobs are protected by strict Unix filesystem permissions and daemon checks, ensuring that non-root users can only read files matching their specific User ID (UID).
**Q:** What information elements does `atq` display for each pending job in its standard output table?
**A:** Standard output displays the unique job identification number, the scheduled execution date and time, the processing queue letter assignment, and the owner username.

## Practice Problems

**Problem:** List all pending `at` jobs currently scheduled across the entire system with superuser privileges.
**Hint:** Prefix the queue listing utility with sudo.
**Solution:** `sudo atq` (Invoking with sudo elevates permissions to display all pending jobs regardless of user ownership).
**Problem:** Filter the output of `atq` to display only jobs assigned to the specific queue `b`.
**Hint:** Use the queue specification flag combined with atq.
**Solution:** `atq -q b` (The `-q` flag restricts the listing strictly to the designated processing queue letter).

## References

- [Man Page for atq (Linux)](https://man7.org/linux/man-pages/man1/atq.1.html)
- [GNU/Linux At Utilities Documentation](https://www.gnu.org/software/inetutils/)
