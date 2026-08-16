---
slug: anacron
name: anacron
aliases: []
category: cron
tags:
  - linux
  - daemon
  - scheduling
  - background
  - maintenance
  - laptops
difficulty: intermediate
supportedOS:
  - linux
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - run missed cron jobs
  - schedule tasks on laptop
  - execute daily maintenance tasks
  - force anacron to run
  - check anacrontab syntax
relatedCommands:
  - cron
  - crontab
alternatives:
  - cron
  - crontab
status: published
---

## What is it?

`anacron` (anachronistic cron) is a computer program that performs periodic command scheduling with frequencies specified in days. Unlike `cron`, which assumes a system is running 24/7 and triggers at exact minute intervals, `anacron` is designed for systems that are frequently powered off or suspended, such as laptops and workstations. It ensures that critical daily, weekly, and monthly system maintenance tasks (like `logrotate` or file indexing) are not permanently skipped due to downtime, executing them as soon as possible after the machine boots.

## Why does it exist?

The traditional `cron` daemon is stateless; if a machine is asleep at 2:00 AM, the 2:00 AM job is simply missed. On modern client devices, this leads to massive log accumulation, outdated search indexes, and missed security updates. `anacron` exists to provide stateful execution tracking. By persisting timestamps of when a job last ran into local spool files, `anacron` can calculate the delta upon system boot. If the required interval (e.g., 1 day) has passed, the job executes, completely eliminating the vulnerability of schedule drift caused by unpredictable hardware availability.

## Syntax

```bash
anacron [options] [job ...]
```

## Flags

| Flag        | Description                                                                                                             | Example                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `-s`        | Serializes execution. Ensures jobs run one after another rather than in parallel, preventing severe CPU spikes on boot. | `anacron -s`                     |
| `-f`        | Forces execution of jobs. Ignores the timestamps in the spool files and runs the specified jobs immediately.            | `anacron -f -n cron.daily`       |
| `-n`        | Runs jobs "now". Ignores the random delay parameters specified in the `/etc/anacrontab` file.                           | `anacron -n`                     |
| `-d`        | Prevents `anacron` from forking to the background (daemonizing). Runs in the foreground and outputs logs to stderr.     | `anacron -d`                     |
| `-q`        | Quiet mode. Suppresses standard output messages, sending only fatal errors to syslog. Useful for automated boots.       | `anacron -q`                     |
| `-t <file>` | Uses a custom anacrontab configuration file instead of the default `/etc/anacrontab`.                                   | `anacron -t /opt/custom.tab`     |
| `-S <dir>`  | Uses a custom spool directory to track execution timestamps instead of `/var/spool/anacron`.                            | `anacron -S /tmp/anacron-spool/` |
| `-T`        | Tests the `/etc/anacrontab` file for syntax errors and exits. Validates configuration before deployment.                | `anacron -T`                     |
| `-V`        | Prints version information for the `anacron` binary and immediately exits.                                              | `anacron -V`                     |
| `-h`        | Prints a brief help message containing usage instructions and flags.                                                    | `anacron -h`                     |

## Examples

```bash
anacron -s
```

> The standard invocation, usually triggered automatically during system boot or by a wrapper cron job. The `-s` flag forces jobs to execute serially. If multiple weekly and daily jobs were missed, this ensures the system disk isn't thrashed by 15 heavy I/O tasks spinning up simultaneously.

```bash
anacron -T
```

> Evaluates the syntax of `/etc/anacrontab`. System administrators execute this after making manual edits to ensure that typos or illegal characters won't cause the scheduler to crash silently during the next reboot.

```bash
anacron -f -n cron.daily
```

> Manually forces the execution of the job identifier `cron.daily` right now, bypassing both the timestamp validation (`-f`) and the configured randomized startup delay (`-n`). This is highly useful for manually triggering log rotations or backups immediately before shutting down a machine for maintenance.

```bash
anacron -d
```

> Runs the scheduler in the foreground, outputting all job dispatching events and execution statuses directly to the terminal. Developers use this flag when attempting to debug why a specific job script is exiting with an error code.

## Real-World Scenarios

**Guaranteed System Maintenance (The Cron Bridge)**

```bash
# Inside /etc/crontab
25 6 * * * root test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
```

> In most modern Linux distributions (like Ubuntu/Debian), `cron` and `anacron` work together. The system `crontab` is configured to trigger daily maintenance at 6:25 AM. However, it explicitly checks if `anacron` is installed. If `anacron` is present, `cron` does nothing, delegating the responsibility of `/etc/cron.daily/` entirely to `anacron` to guarantee the scripts run even if the machine is powered off at 6:25 AM.

**Sandboxed Custom Scheduling**

```bash
anacron -t /home/user/custom.anacrontab -S /home/user/.anacron_spool
```

> While standard `anacron` only runs as root, unprivileged users can leverage its stateful tracking for personal scripts. By passing a custom table and custom spool directory, a user can execute `anacron` via their local profile login scripts to run personal backups without requiring administrative access to `/etc/anacrontab`.

## When should it NOT be used?

- **Exact Time Execution:** **Do not use `anacron` if a job must run at exactly 3:00 PM.** `anacron` only understands intervals in _days_. It does not support minute or hour precision. If precise timing is legally or technically required, use `cron`.
- **High-Frequency Tasks:** **Do not use `anacron` for tasks running multiple times a day.** `anacron`'s minimum resolution is 1 day. If you need a script to run every 6 hours, it must be scheduled via `cron` or `systemd-timers`.
- **24/7 Server Environments:** **Avoid relying purely on `anacron` on persistent servers.** While it works, standard `cron` or `systemd-timers` are better suited for "always-on" environments, as they offer better logging, exact execution windows to avoid peak load hours, and finer resource controls.

## Alternatives

- **`cron`:** **Best for strict, minute-level precision.** The canonical scheduler. Ideal for servers with 100% uptime guarantees where missing a 3:00 AM window simply means the task waits for the next cycle.
- **`systemd-timers`:** **Best for modern replacements.** Systemd timers with the `Persistent=true` directive natively replicate `anacron`'s behavior. They track missed executions and fire them upon boot, offering superior dependency management and logging capabilities, rendering `anacron` largely obsolete on pure systemd machines.

## How it works internally

Unlike `cron`, `anacron` is not designed to run continuously in the background forever. It is usually executed once during the boot sequence by the init system, or triggered periodically via a wrapper script in `cron.hourly`.

When `anacron` launches, it reads the configuration file at `/etc/anacrontab`. This file defines jobs using four fields: `period_in_days`, `delay_in_minutes`, `job_identifier`, and `command`.

For each job, `anacron` checks the corresponding timestamp file located in `/var/spool/anacron/<job_identifier>`. It reads the date the job was last successfully completed. It calculates the difference between the current system date and the timestamp.

If the difference is greater than or equal to the `period_in_days`, `anacron` determines the job must be executed. To prevent a massive CPU spike on boot, it calculates the `delay_in_minutes` (plus an optional randomized offset). It spawns a background process that sleeps for the duration of the delay, and then executes the `command` (usually `run-parts /etc/cron.daily`).

Once the command finishes with an exit status of `0` (success), `anacron` updates the timestamp file in the spool directory to the current date and gracefully exits.

## Performance Notes

- **Boot Load Mitigation:** The mandatory `delay_in_minutes` parameter is critical for system performance. By forcing heavy tasks (like `mandb` updates or `logrotate`) to wait 5 to 45 minutes after the machine boots, `anacron` ensures that the user's login experience and initial application launches remain fast and responsive.
- **Serialization:** Using the `-s` flag forces `anacron` to wait for Job 1 to finish before starting Job 2. This prevents severe disk thrashing on older hard drives when daily, weekly, and monthly jobs all trigger on the same boot cycle.

## Security Notes

- **Root Execution:** Standard `anacron` installations are configured to run exclusively as `root`. Modifying `/etc/anacrontab` requires root privileges, ensuring standard users cannot inject malicious payloads into system-level startup maintenance routines.
- **Spool Manipulation:** The `/var/spool/anacron/` directory must be tightly permissioned. If an attacker can arbitrarily write to the timestamp files, they can force the system to skip critical security auditing scripts or log rotations by setting the timestamp artificially far into the future.

## Common Mistakes

- **Expecting immediate execution after booting**
  - _Mistake:_ Booting a laptop, seeing that a weekly backup hasn't run, and immediately manually running the backup script assuming `anacron` is broken.
  - _Why:_ `anacron` intentionally delays execution. Check the `/etc/anacrontab` file; if the weekly job has a delay of 30 minutes, it will quietly sleep in the background and execute exactly 30 minutes after boot. Manually forcing it disrupts this automated flow.
- **Adding minute/hour syntax to `/etc/anacrontab`**
  - _Mistake:_ Editing `anacrontab` and entering `30 2 * * * /script.sh` just like a standard crontab.
  - _Why:_ `anacrontab` uses a completely different syntax format (`period delay job-id command`). Using cron syntax will cause `anacron -T` to throw a fatal syntax error, halting all system maintenance.

## Best Practices

- **Use `run-parts` for organization:** Do not clutter `/etc/anacrontab` with dozens of individual scripts. Emulate standard Linux distributions by executing `run-parts /etc/cron.daily`. This allows developers to simply drop executable bash scripts into the `cron.daily` directory, automatically registering them for stateful execution without modifying core configuration files.
- **Always test syntax:** Never edit `/etc/anacrontab` directly in production without immediately running `anacron -T`. A single missing space or illegal character will break the parsing engine, resulting in silent failures for all system maintenance tasks until the typo is resolved.

## Interview Questions

**Q: A critical log rotation script must run exactly at 23:59 every night. The server it runs on is rebooted every night between 23:50 and 00:10 for hardware maintenance. Would you schedule this script using `cron` or `anacron`?**
**A:** Neither is perfect alone based on the strict requirements. `cron` will completely miss the execution if the server is down at exactly 23:59. `anacron` cannot guarantee execution at _exactly_ 23:59 because it only operates in days and uses randomized delays after boot. The optimal modern solution is `systemd-timers` with `OnCalendar=*-*-* 23:59:00` and `Persistent=true`, which guarantees exact timing if the machine is up, and immediate execution upon boot if the window was missed.

**Q: How does `anacron` know if it missed a daily job while the computer was turned off over the weekend?**
**A:** `anacron` relies on the filesystem for state management. Upon successful execution of a job, it writes the current date into a plain text file in the `/var/spool/anacron/` directory. When the computer boots on Monday, `anacron` reads this file, sees the timestamp is three days old, compares it to the defined 1-day interval, and immediately queues the job for execution.

## Practice Problems

**Problem:** You have manually updated `/etc/anacrontab` to include a new monthly job. Write the command to validate the file for formatting and syntax errors before you log out of the server.
**Hint:** Use the flag designed specifically for testing syntax without running any jobs.
**Solution:**

```bash
anacron -T
```

**Problem:** You are about to shut down a workstation for a long holiday. You want to force all daily and weekly maintenance tasks managed by `anacron` to run immediately right now, bypassing their built-in boot delays and timestamp checks.
**Hint:** Combine the flag that ignores timestamps with the flag that ignores the delay timers.
**Solution:**

```bash
anacron -f -n
```

## References

- [anacron(8) - Linux man page](https://linux.die.net/man/8/anacron)
- [anacrontab(5) - Format of anacrontab files](https://linux.die.net/man/5/anacrontab)
