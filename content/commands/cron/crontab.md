---
slug: crontab
name: crontab
aliases: []
category: cron
tags:
  - crontab
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
  - schedule cron job
  - edit crontab
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`crontab` (cron table) maintains crontab files used by the cron daemon to schedule periodic tasks.

## Why does it exist?

`crontab` allows per-user management of automated background tasks executed at defined time intervals (minute, hour, day, month, day-of-week).

## Syntax

```bash
crontab [options] [file]
```

## Flags

| Flag | Description                             | Example      |
| ---- | --------------------------------------- | ------------ |
| `-e` | Edit the current user's crontab         | `crontab -e` |
| `-l` | List the current user's crontab entries | `crontab -l` |
| `-r` | Remove the current user's crontab       | `crontab -r` |

## Examples

```bash
crontab -l
```

> Displays all active cron schedules for the current user.

## Real-World Scenarios

**Automated backups**: Scheduling a daily database backup script at 2 AM (`0 2 * * * /usr/local/bin/backup.sh`).

## When should it NOT be used?

- **Complex multi-step workflow dependency pipelines**: Distributed task schedulers (Airflow, Temporal) or systemd timers offer better logging and retry semantics.

## Alternatives

- **`systemd.timer`**: Modern Linux systemd service timer units.

## How it works internally

`crontab` reads user entry files stored under `/var/spool/cron/crontabs/` and notifies `crond` to reload schedule tables in memory.

## Performance Notes

Cron daemon wakes up every minute to evaluate active schedule expressions.

## Security Notes

Use `/etc/cron.allow` and `/etc/cron.deny` to restrict crontab execution access on multi-tenant servers.

## Common Mistakes

- **Assuming full user shell environment in cron jobs**: Cron runs with a minimal `PATH`; binary paths must be explicit or set in crontab header.

## Best Practices

- Always redirect stdout/stderr in crontab entries (`>> /var/log/myjob.log 2>&1`) to prevent silent failures or unexpected system emails.

## Interview Questions

**Q:** What does `*/15 * * * *` mean in a crontab entry?
**A:** Execute every 15 minutes.

## Practice Problems

**Problem:** Schedule script `/opt/cleanup.sh` to run every Sunday at midnight.
**Solution:** `0 0 * * 0 /opt/cleanup.sh`

## References

- [crontab man page](https://www.man7.org/linux/man-pages/man1/crontab.1.html)
