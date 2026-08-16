---
slug: df
name: df
aliases:
  - disk free
category: file-systems
tags:
  - linux
  - storage
  - disk-space
  - monitoring
  - filesystem
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
  - check disk space
  - show free storage
  - list mounted filesystems
  - view disk usage linux
  - check available disk capacity
relatedCommands:
  - du
  - mount
  - lsblk
  - fdisk
  - fsck
alternatives: []
status: draft
---

## What is it?

`df` (disk free) is a standard POSIX utility that reports the amount of available and consumed disk space across all mounted file systems. It provides a macroscopic view of storage capacity, displaying total size, used space, available space, and the percentage utilized, allowing administrators to rapidly identify storage bottlenecks or failing partitions.

## Why does it exist?

While `du` calculates space by recursively reading individual file sizes, this is incredibly slow and CPU-intensive for massive file systems. Operating system kernels continuously track overall block allocation at the filesystem level. `df` exists to query these internal kernel data structures directly. By executing extremely fast, low-level system calls, `df` provides instantaneous, highly accurate capacity metrics for entire disk partitions and network mounts, serving as the foundational metric for virtually all infrastructure monitoring and alerting tools.

## Syntax

```bash
df [OPTION]... [FILE]...
```

## Flags

| Flag                     | Description                                                                                                               | Example                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `-h`, `--human-readable` | Prints sizes in easy-to-read powers of 1024 (e.g., 1K, 234M, 2G, 5T) instead of raw 1K blocks.                            | `df -h`                           |
| `-H`, `--human-readable` | (macOS/BSD) Prints sizes in powers of 1000 (e.g., 1KB = 1000 bytes). On Linux, this is `-H` or `--si`.                    | `df -H`                           |
| `-i`, `--inodes`         | Instead of block usage, lists inode usage (total, used, free, and percentage) for the file systems.                       | `df -i`                           |
| `-T`, `--print-type`     | Appends a column displaying the underlying filesystem type (e.g., `ext4`, `xfs`, `nfs`, `tmpfs`).                         | `df -Th`                          |
| `-a`, `--all`            | Includes pseudo, duplicate, and inaccessible file systems (like `/proc`, `/sys`, or `cgroup`) normally hidden by default. | `df -a`                           |
| `-t <type>`              | Filters the output to display _only_ file systems of a specific type (e.g., only `nfs` or `ext4`).                        | `df -t ext4`                      |
| `-x <type>`              | Filters the output to exclude specific file system types (e.g., ignoring noisy `squashfs` loop mounts).                   | `df -x squashfs`                  |
| `--output[=FIELD_LIST]`  | Allows custom formatting by defining exactly which columns to print (e.g., `source`, `pcent`, `target`).                  | `df --output=source,pcent,target` |

## Examples

```bash
df -h
```

> The universal standard invocation. Displays all physical mounts in human-readable gigabytes and megabytes. It outputs columns for Filesystem, Size, Used, Avail, Use%, and Mounted on.

```bash
df -Th -x tmpfs -x devtmpfs
```

> An incredibly useful operational command. It prints human-readable sizes and filesystem types (`-T`), but explicitly filters out the volatile RAM-backed pseudo-filesystems (`tmpfs`, `devtmpfs`) that clutter standard output, leaving only physical hard drives and network mounts visible.

```bash
df -i /var
```

> Investigates inode exhaustion. Sometimes a disk shows 50% space free, but no new files can be written. This command checks the specific `/var` partition to see if the available index nodes (inodes) have been 100% depleted by millions of tiny log files.

```bash
df -h /home/user/project
```

> Resolves a path to its mount point. Instead of listing all disks, passing a specific directory forces `df` to traverse upward, outputting the specific disk partition and capacity metrics strictly for the volume where that directory resides.

```bash
df --output=source,pcent,target | grep 9[0-9]%
```

> A primitive alerting script. It uses custom output formatting to extract just the device, the percentage used, and the mount point. It pipes this clean output into `grep` to immediately highlight any partition that is 90% to 99% full.

## Real-World Scenarios

**Auditing Snap/Docker Clutter**

```bash
df -h -x squashfs -x overlay
```

> Modern Linux systems using Snap packages or extensive Docker configurations mount dozens of immutable loopback filesystems (`squashfs`) and container layers (`overlay`). Running a naked `df -h` results in an unreadable wall of text. System administrators actively filter out these specific filesystem types to focus exclusively on the core `/`, `/boot`, and `/data` logical volumes.

**Network Share Monitoring**

```bash
df -t nfs -t cifs -h
```

> In enterprise environments, servers often mount dozens of remote NAS shares via NFS or Samba (CIFS). If a backup job fails, an engineer uses the type-inclusion flags to isolate and check the capacity of _only_ the remote network drives, completely ignoring the local SAS/SATA drives.

## When should it NOT be used?

- **Finding large directories:** **Do not use `df` to find what is consuming space.** `df` only tells you _that_ a 500GB partition is full; it has no concept of internal directories or files. You must use `du -sh *` or tools like `ncdu` to identify which specific folder contains the 400GB database dump.
- **Checking exact byte counts:** **Avoid `-h` if precision matters.** Human-readable flags round aggressively. If you are auditing exact block alignments or comparing checksum boundaries, run `df` without `-h` to view capacity in strict 1-kilobyte block increments.

## Alternatives

- **`du` (Disk Usage):** **Best for granular auditing.** While `df` looks at the partition, `du` recursively counts the size of individual files and directories within that partition.
- **`ncdu` / `dua`:** **Best for interactive visualization.** External utilities that provide beautiful, ncurses-based graphical interfaces to visually navigate and delete large files consuming disk space.
- **`lsblk`:** **Best for topology.** Shows block devices and their mount points, but focuses on hardware topology (LVM, physical disks, partitions) rather than available filesystem capacity.

## How it works internally

When you execute `df`, the utility reads the `/proc/mounts` (or historically `/etc/mtab`) file provided by the Linux kernel to acquire a list of all actively mounted file systems and their respective mount points.

For each valid mount point, `df` issues a `statvfs()` or `statfs()` system call. This is a highly efficient kernel call that queries the filesystem's superblock. The superblock holds the master metadata for the filesystem, including `f_blocks` (total data blocks), `f_bfree` (free blocks), and `f_files` (total inodes).

Because it only reads the 100-byte superblock metadata in memory rather than traversing the physical hard drive, `df` returns results practically instantaneously, even on petabyte-scale storage arrays.

_Note on discrepancies:_ `df` calculates usage based on block allocation. If a massive file is deleted using `rm`, but a running process (like a web server or database) still has an open file handle to it, the kernel reclaims the directory link but _does not_ free the data blocks. `df` will show the disk as full, while `du` will not see the deleted file, causing confusion until the holding process is restarted.

## Performance Notes

- **Stale NFS Mounts:** `df` issues a `statvfs()` call to every mounted filesystem. If an NFS or CIFS network mount is unresponsive or has dropped off the network (a "stale mount"), the system call blocks. Running `df` will cause your terminal to hang completely until the kernel's TCP timeout threshold is reached (often several minutes). To bypass this, pass a local path explicitly (e.g., `df -h /`).

## Security Notes

- **Reserved Root Blocks:** Ext3/Ext4 filesystems reserve 5% of disk space for the `root` user by default. If `df -h` shows `Use%` at 100%, a standard user cannot write data, but the `root` user still has 5% buffer space to safely log in, utilize critical utilities, and clean up the disk to prevent an absolute system lockup.

## Common Mistakes

- **Confusing MB with MiB**
  - _Mistake:_ Provisioning a 100GB cloud volume, running `df -h`, and complaining to the cloud provider that the disk only shows ~93G.
  - _Why:_ Storage manufacturers market drives in Base-10 (1 GB = 1,000,000,000 bytes). Linux `df -h` displays Base-2 (1 GiB = 1,073,741,824 bytes). The disk space is identical; the mathematical calculation unit differs. Use `df -H` to see the Base-10 equivalent.
- **Ignoring Inodes**
  - _Mistake:_ Seeing 40% free space in `df -h`, but getting `No space left on device` errors when trying to `touch` a new file.
  - _Why:_ A filesystem has a finite number of data blocks (space) and inodes (file pointers). If a cron job generates millions of 1-byte log files, you exhaust your inodes before exhausting your block space. You must use `df -i` to diagnose this.

## Best Practices

- **Use Specific Paths in Scripts:** If a script needs to check if there is enough room to download a file, do not parse the global `df -h` output. Use `df -h /target/dir` to instantly isolate the specific partition without worrying about complex `grep` filtering.
- **Alias the defaults:** In personal environments, adding `alias df='df -Th -x squashfs -x tmpfs -x devtmpfs'` to your `~/.bashrc` drastically improves quality of life, stripping out all modern container/snap noise and showing only actionable physical volumes.

## Interview Questions

**Q: You run `df -h` and it shows `/var` is 100% full. You run `du -sh /var/*` and sum up the directories, but they only total 20GB on a 100GB disk. What is the technical explanation for this discrepancy?**
**A:** This is caused by deleted files that are still held open by a running process. When a file is deleted (`rm`), it is removed from the directory tree (which is why `du` cannot see it). However, if an application (like a database or logger) still holds an open file descriptor, the kernel will not physically deallocate the blocks. `df` reads the raw block allocation table, so it correctly reports the blocks as still in use. You must find the process (often using `lsof +L1`) and restart it to release the file handle and free the blocks.

**Q: Explain what `df -i` does and when you would use it.**
**A:** `df -i` displays the usage and availability of index nodes (inodes) instead of raw disk storage blocks. Every file or directory on a Linux filesystem requires exactly one inode. You use this command when a system throws a "No space left on device" error, but a standard `df -h` shows plenty of gigabytes remaining. This indicates the disk has been filled with millions of microscopic files, exhausting the inode allocation.

## Practice Problems

**Problem:** You are monitoring a cluster. Write a command to display the disk space in human-readable format, but include an extra column that explicitly names the filesystem format type (e.g., ext4, xfs).
**Hint:** Combine the human-readable flag with the type flag.
**Solution:**

```bash
df -Th
```

**Problem:** You want to check the disk space of your home directory (`~`), but you only want the command to output the statistics for the partition where your home directory lives, ignoring all other system mounts.
**Hint:** Pass the specific directory path as an argument to the command.
**Solution:**

```bash
df -h ~
```

## References

- [df(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/df)
- [GNU Coreutils Manual: df invocation](https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html)
