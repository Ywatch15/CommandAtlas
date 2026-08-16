---
slug: fsck
name: fsck
aliases:
  - file system check
category: file-systems
tags:
  - linux
  - filesystem
  - repair
  - storage
  - recovery
  - maintenance
difficulty: advanced
supportedOS:
  - linux
  - unix
  - macos
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - repair broken filesystem
  - check hard drive for errors
  - fix corrupted disk linux
  - force fsck on boot
  - check ext4 consistency
relatedCommands:
  - mount
  - df
  - fdisk
  - tune2fs
alternatives: []
status: draft
---

## What is it?

`fsck` (File System Consistency Check) is a critical diagnostic and repair utility for Linux operating systems. It acts as a standardized wrapper that identifies the specific formatting of a target block device (e.g., ext4, vfat, xfs) and seamlessly invokes the appropriate underlying filesystem-specific checker (like `fsck.ext4`) to detect corruption, repair orphaned inodes, fix bad superblocks, and restore logical consistency after unexpected hardware failures or kernel panics.

## Why does it exist?

Filesystems maintain complex, deeply interdependent metadata structures (inodes, bit maps, directory trees, and journaling logs) to map logical files to physical disk blocks. When a server loses power abruptly, cached memory buffers drop before writing to the disk, leaving the filesystem mathematically inconsistent. If an OS attempts to write to an inconsistent filesystem, it causes compounding, catastrophic data corruption. `fsck` exists to provide an offline, surgical repair capability. It parses the broken metadata trees, reconnects orphaned data blocks to the `lost+found` directory, and guarantees the structural integrity of the partition before the kernel is permitted to mount it for active read/write operations.

## Syntax

```bash
fsck [options] -- [fs-options] [<filesystem>...]
```

## Flags

| Flag        | Description                                                                                                                                                           | Example                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `-A`        | Walks through the `/etc/fstab` file and sequentially checks all filesystems authorized for checking. Used primarily by the OS during the boot sequence.               | `fsck -A`                     |
| `-R`        | Used with `-A`. Instructs `fsck` to skip checking the root (`/`) filesystem. Root is usually checked separately earlier in the boot phase.                            | `fsck -AR`                    |
| `-C`        | Displays a visual progress bar (completion/status indicator) for filesystems that support it (like ext3/ext4). Excellent for monitoring long repairs.                 | `fsck -C /dev/sdb1`           |
| `-N`        | A dry-run flag. Displays exactly what actions `fsck` _would_ take and which backend checker it would invoke, without actually executing anything.                     | `fsck -N /dev/sdc1`           |
| `-t <type>` | Forces `fsck` to bypass automatic probing and exclusively use the specified filesystem checker type (e.g., `ext4`, `xfs`, `vfat`).                                    | `fsck -t ext4 /dev/nvme0n1p1` |
| `-a`        | (Legacy) Automatically repairs the filesystem without prompting for confirmation. Deprecated and inherently dangerous on severely corrupted disks.                    | `fsck -a /dev/sda1`           |
| `-p`        | (Modern) Safely automatically repairs the filesystem. If a repair requires human judgment or might cause data loss, it halts and exits with an error code.            | `fsck -p /dev/sdb1`           |
| `-y`        | Forcefully answers "yes" to all interactive repair prompts. Highly destructive. Used when automated recovery of massive corruption is preferred over total data loss. | `fsck -y /dev/sdc1`           |
| `-V`        | Verbose mode. Prints the specific backend command being executed (e.g., `fsck.ext4 -y /dev/sdb1`).                                                                    | `fsck -V /dev/sdb1`           |

## Examples

```bash
fsck /dev/sdb1
```

> The standard interactive invocation. Assesses `/dev/sdb1`, identifies the filesystem type, and runs the checker. If it detects a broken inode or disconnected data block, it pauses and explicitly asks the user (`y/n`) for permission to repair it.

```bash
fsck -p /dev/nvme1n1
```

> The automated safe-mode check. Commonly used in maintenance scripts. It scans the disk and automatically fixes minor, deterministic errors (like clearing an un-flushed journal). If it encounters complex corruption requiring a destructive decision, it safely aborts.

```bash
fsck -N -t ext4 /dev/sdc2
```

> A dry-run exploration. It evaluates the disk, overriding automatic detection to assume the disk is `ext4`, and prints out the exact `/sbin/fsck.ext4` command syntax it would execute, without touching the physical metal.

```bash
fsck -y /dev/mapper/vg0-data
```

> The aggressive repair operation. Deployed when a Logical Volume (LVM) is heavily corrupted and the administrator has thousands of orphaned inode prompts. The `-y` flag blindly accepts every single destructive repair proposal the algorithm suggests, salvaging whatever data remains into the `/lost+found` directory.

## Real-World Scenarios

**Forcing a Boot-Time Check via Touch**

```bash
touch /forcefsck
reboot
```

> On legacy `sysvinit` and some `systemd` systems, the root filesystem cannot be checked while active. By creating an empty file named `forcefsck` at the root directory, the administrator instructs the init system's boot sequence to run an aggressive `fsck -y` against the root partition before mounting it, clearing the flag afterward.

**Rescuing a Non-Booting Instance (Emergency Shell)**

```bash
# Server boots into Emergency Mode due to corruption
umount /dev/sda2
fsck -y /dev/sda2
mount -a
exit
```

> Following a catastrophic host power failure in a cloud environment, a VM drops into emergency maintenance mode. The administrator unmounts the corrupted volume, runs a forceful automated repair, remounts the fixed filesystem, and exits the rescue shell, allowing the standard boot sequence to resume safely.

## When should it NOT be used?

- **On Mounted Filesystems:** **NEVER run `fsck` on an actively mounted, read-write filesystem.** If the OS is writing new data to blocks while `fsck` is simultaneously altering the underlying metadata mapping trees, it will trigger a race condition resulting in absolute, catastrophic, and unrecoverable data loss.
- **On XFS Filesystems:** **Do not use the generic `fsck` for XFS.** The XFS filesystem architecture handles crash recovery differently via internal journaling replays during the `mount` process. If an XFS drive is mathematically corrupted, `fsck` does nothing; you must explicitly execute the dedicated `xfs_repair /dev/sdX` utility.
- **For Secure Erase / Bad Sector Scanning:** **`fsck` repairs logical mapping, not physical hardware.** If your hard drive is dying and throwing clicking noises (I/O errors), `fsck` will attempt to map around it but cannot save the drive. Use `badblocks` or `smartctl` for physical disk diagnostics.

## Alternatives

- **Backend Checkers (`e2fsck`, `dosfsck`, `btrfsck`):** **Best for advanced recovery.** `fsck` is merely a frontend wrapper. Invoking the filesystem-specific checker directly (e.g., `e2fsck -b 32768 /dev/sda1`) unlocks highly advanced flags, such as attempting recovery utilizing alternative backup superblocks spread across the disk.
- **`xfs_repair`:** **Required for XFS.** The strictly mandated repair utility for Red Hat/CentOS default filesystems, offering heavily parallelized memory repair algorithms that bypass the standard `fsck` wrapper entirely.

## How it works internally

When you execute `fsck /dev/sdb1`, the `fsck` binary (usually provided by the `util-linux` package) acts as a traffic cop.

First, it checks `/etc/fstab` or probes the raw block device (using `libblkid`) to discover the partition's filesystem type. If it determines the partition is `ext4`, `fsck` searches the `$PATH` for a binary named `/sbin/fsck.ext4`. It then forks a new process, passing the target block device and any unified flags to that specific backend tool.

The backend checker (e.g., `e2fsck` for ext2/3/4) performs a mathematical validation across multiple predefined passes:

1.  **Pass 1:** Scans the inode tables and blocks. It cross-references the block allocation bitmaps against the inodes claiming them to detect blocks claimed by two different files simultaneously.
2.  **Pass 2:** Scans directory trees. It ensures every directory points to a valid inode, validating the hierarchical naming structure.
3.  **Pass 3:** Checks directory connectivity. Any valid file inodes that are mathematically disconnected from the root directory tree are identified as "orphaned".
4.  **Pass 4 & 5:** Summarizes reference counts and global cylinder group bitmaps to ensure the filesystem's tracking of free space matches the reality of the block scan.

If orphans are found, the checker creates a new directory pointer and places the disconnected files into the `/lost+found` directory located at the root of the partition, assigning them numerical filenames matching their raw inode numbers so administrators can manually inspect and recover the lost data.

## Performance Notes

- **Massive Memory Footprint:** Running `fsck` on multi-terabyte arrays containing billions of files requires the utility to load colossal allocation bitmaps and inode tables into the system's RAM. If the system lacks sufficient RAM, `fsck` will swap to disk, degrading the repair process from hours to potentially days.
- **Journal Replay Bypassing:** On modern journaled filesystems (ext4), if the system crashes cleanly, the subsequent boot `fsck` doesn't scan the entire disk. It simply reads the journal log and replays the uncommitted transactions. A full, time-consuming block scan only triggers if the journal itself is corrupted or if the superblock is explicitly flagged with an "unclean" state bit.

## Security Notes

- **Destructive Capabilities:** `fsck` is a root-exclusive tool. Because it manipulates foundational block structures, an attacker with `fsck` permissions could deliberately scramble inode mappings to irreversibly destroy forensic evidence or operational data.
- **The `/lost+found` Directory:** Files recovered into `/lost+found` retain their original file permissions. However, if sensitive files (like database fragments or TLS keys) are orphaned during corruption, they become aggregated in this central directory. Administrators must ensure `/lost+found` maintains strict `700` (root-only) permissions to prevent unprivileged users from reading recovered system secrets.

## Common Mistakes

- **Running `fsck` on a mounted drive**
  - _Mistake:_ Seeing an error on `/data`, and running `sudo fsck -y /dev/sdb1` while applications are still writing to it.
  - _Why:_ This is the cardinal sin of Linux administration. The kernel's in-memory view of the filesystem will violently clash with the metadata `fsck` is forcing onto the disk, resulting in immediate kernel panics and irreversible loss of the entire partition structure. **Always `umount /data` first.**
- **Ignoring the `xfs` exception**
  - _Mistake:_ Trying to fix a CentOS 8 boot volume by running `fsck.xfs /dev/sda1`.
  - _Why:_ `fsck.xfs` does absolutely nothing; it is a dummy script provided purely so the `fsck -A` boot process doesn't fail. To actually repair XFS, you must use `xfs_repair`.

## Best Practices

- **Force Checks Periodically (Ext4):** Configure `tune2fs -c 30 /dev/sda1` to force a complete, thorough `fsck` block scan every 30 mounts, preventing silent metadata rot from accumulating undetected over years of stable uptime.
- **Use LVM Snapshots for Dangerous Repairs:** If dealing with a heavily corrupted Logical Volume, do not run `fsck -y` blindly. Take an LVM snapshot of the corrupted volume first. Run `fsck` against the snapshot. If the repair algorithm mangles the remaining data, you can discard the snapshot and try a different recovery method against the original corrupted state.

## Interview Questions

**Q: You attempt to run `fsck /dev/sda1` but the terminal warns you that the drive is currently mounted. Why is it dangerous to proceed, and what is the exact mechanism that causes data loss in this scenario?**
**A:** Proceeding is extremely dangerous because of caching mechanisms. The operating system kernel holds portions of the filesystem metadata (like inode tables) in its active RAM buffers. If you run `fsck` on a mounted drive, `fsck` manipulates the raw blocks on the physical disk independently. When the kernel eventually flushes its cached RAM buffers to the disk, it blindly overwrites the repairs `fsck` just made, causing severe structural conflicts, split-brain scenarios, and absolute data corruption. You must unmount the drive so `fsck` has exclusive, locked access to the physical blocks.

**Q: After surviving a hard crash, you run `fsck` on a partition. It outputs several messages about fixing orphaned nodes. Where does `fsck` place the data from these nodes, and why?**
**A:** `fsck` places orphaned files into a special directory at the root of the partition named `/lost+found`. These are files whose data blocks are perfectly intact on the disk, but the directory tree pointers linking them to human-readable filenames (like `/home/user/document.txt`) were corrupted or lost during the crash. Because `fsck` does not know the original name or location, it links them to `/lost+found` and names the files using their raw numeric inode ID.

## Practice Problems

**Problem:** You are booted into a rescue USB drive. You need to repair the unmounted `ext4` partition `/dev/nvme0n1p2`. You want the tool to automatically fix safe errors, but halt and exit if it encounters a situation that might lead to data loss.
**Hint:** Avoid the aggressive "yes" flag. Use the flag designed for safe, automated repairs.
**Solution:**

```bash
fsck -p /dev/nvme0n1p2
```

**Problem:** You have unmounted `/dev/sdc1`, which contains terabytes of data. You want to execute an automated, aggressive repair, but because it will take hours, you must enable the visual completion progress bar so you can monitor the status.
**Hint:** Combine the "yes" flag with the flag that outputs a status bar.
**Solution:**

```bash
fsck -y -C /dev/sdc1
```

## References

- [fsck(8) - Linux man page](https://linux.die.net/man/8/fsck)
- [e2fsck(8) - check a Linux ext2/ext3/ext4 file system](https://linux.die.net/man/8/e2fsck)
- [XFS file system repair](https://linux.die.net/man/8/xfs_repair)
