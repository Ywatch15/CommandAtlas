---
slug: ps
name: ps
aliases: []
category: processes
tags:
  - ps
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
  - find process ID
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`ps` (process status) displays information about active processes currently running on the system.

## Why does it exist?

`ps` allows administrators to inspect running processes, resource usage, process IDs (PID), and parent-child relationships.

## Syntax

```bash
ps [options]
```

## Flags

| Flag  | Description                                       | Example          |
| ----- | ------------------------------------------------- | ---------------- |
| `aux` | Display all processes for all users in BSD syntax | `ps aux`         |
| `-ef` | Display all processes in standard POSIX syntax    | `ps -ef`         |
| `-u`  | Filter by username                                | `ps -u www-data` |

## Examples

```bash
ps aux | grep nginx
```

> Lists all active Nginx processes along with CPU and memory statistics.

## Real-World Scenarios

**Identifying hung process PIDs**: Searching for a hung daemon process ID to send a termination signal.

## When should it NOT be used?

- **Real-time interactive monitoring**: `top` or `htop` provide dynamic updates compared to static snapshots from `ps`.

## Alternatives

- **`htop`**: Interactive, real-time process viewer.

## How it works internally

`ps` reads kernel status information exposed via the `/proc` virtual filesystem on Linux.

## Performance Notes

Fast and lightweight snapshot creation.

## Security Notes

Process command lines visible in `ps` output can expose sensitive CLI flags if passwords are passed directly on the command line.

## Common Mistakes

- **Confusing BSD syntax (`ps aux`) with POSIX syntax (`ps -ef`)**: Mixing dash prefixes with BSD option sets can produce unexpected output formats.

## Best Practices

- Prefer `pgrep` when searching purely for process IDs in shell scripts.

## Interview Questions

**Q:** What is the difference between `ps aux` and `ps -ef`?
**A:** `ps aux` uses BSD style listing CPU/memory percentages, while `ps -ef` follows UNIX/POSIX syntax listing PPIDs and start times.

## Practice Problems

**Problem:** Find the process ID of a process named `node`.
**Solution:** `ps aux | grep node` (or `pgrep node`)

## References

- [ps man page](https://www.man7.org/linux/man-pages/man1/ps.1.html)
