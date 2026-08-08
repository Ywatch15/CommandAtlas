---
slug: df
name: df
aliases: []
category: file-systems
tags:
  - df
difficulty: beginner
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
  - check free disk space
  - filesystem usage report
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`df` (disk free) displays total, used, and available disk space on mounted file systems.

## Why does it exist?

`df` provides quick reporting on filesystem capacity and mount points to prevent storage exhaustion.

## Syntax

```bash
df [options] [file...]
```

## Flags

| Flag | Description                                              | Example  |
| ---- | -------------------------------------------------------- | -------- |
| `-h` | Print sizes in human-readable format (e.g. 1K, 234M, 2G) | `df -h`  |
| `-T` | Print filesystem type                                    | `df -hT` |
| `-i` | List inode usage instead of block usage                  | `df -i`  |

## Examples

```bash
df -h
```

> Lists all mounted file systems with human-readable size metrics.

## Real-World Scenarios

**Monitoring server storage alerts**: Checking root (`/`) partition utilization during disk space alerts.

## When should it NOT be used?

- **Finding large individual files/folders**: `du` (disk usage) measures file sizes within specific directory trees.

## Alternatives

- **`duf`**: Modern colorful disk usage and free space utility.

## How it works internally

`df` queries system mount tables (`/proc/mounts`) and executes `statvfs(2)` call to read block count metadata.

## Performance Notes

Instantaneous execution because it inspects filesystem header stats rather than traversing directory trees.

## Security Notes

Unmounted or unreachable stale NFS mounts can cause `df` execution to hang indefinitely unless run with specific local filesystem flags.

## Common Mistakes

- **Confusing block space exhaustion with inode exhaustion**: Disk can show free space while `df -i` shows 100% inode usage (too many small files).

## Best Practices

- Always run `df -h` first when troubleshooting disk full errors on Linux servers.

## Interview Questions

**Q:** Why might a disk show full even if `du` reports less usage than total capacity?
**A:** Deleted files held open by running processes, unmounted mount points masking underlying directory data, or inode depletion (`df -i`).

## Practice Problems

**Problem:** Show filesystem type and human readable usage for `/var/log` mount.
**Solution:** `df -hT /var/log`

## References

- [df man page](https://www.man7.org/linux/man-pages/man1/df.1.html)
