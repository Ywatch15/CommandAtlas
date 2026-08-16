---
slug: blkid
name: blkid
aliases: []
category: file-systems
tags:
  - linux
  - storage
  - filesystem
  - devices
  - uuid
  - metadata
difficulty: beginner
supportedOS:
  - linux
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - find UUID of disk
  - list block device attributes
  - get disk filesystem type
  - locate volume by label
  - print partition uuid
relatedCommands:
  - lsblk
  - fdisk
  - mount
  - mkfs
  - parted
alternatives:
  - lsblk
status: draft
---

## What is it?

`blkid` (block identification) is a command-line utility used to locate and print block device attributes such as UUIDs (Universally Unique Identifiers), filesystem types (e.g., ext4, xfs), and volume labels. It provides a deterministic way to identify block storage devices attached to a Linux system, regardless of the order in which they were attached or initialized by the kernel.

## Why does it exist?

Historically, Linux administrators referenced disks using hardcoded device paths like `/dev/sda1` or `/dev/vdb`. However, depending on kernel initialization order, SCSI bus enumeration, or USB hotplugging, these paths are highly volatile—`/dev/sda` might become `/dev/sdb` after a reboot, causing the system to mount the wrong partition and fail to boot. `blkid` exists to solve this by exposing the immutable metadata baked into the filesystem superblocks. By enabling systems (like `/etc/fstab`) to reference disks via guaranteed unique UUIDs instead of volatile paths, `blkid` ensures robust and deterministic storage mapping across reboots.

## Syntax

```bash
blkid [options] [device...]
```

## Flags

| Flag              | Description                                                                                                                            | Example                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `-U <uuid>`       | Locates and prints the device path that matches the specified UUID. Useful in scripts to resolve a UUID to a `/dev/` node.             | `blkid -U 1234-5678`   |
| `-L <label>`      | Locates and prints the device path that matches the specified volume label.                                                            | `blkid -L ROOT_FS`     |
| `-o <format>`     | Specifies the output format. Accepts `full` (default), `value`, `list`, `device`, `udev`, or `export`.                                 | `blkid -o list`        |
| `-s <tag>`        | Restricts the output to only display the specified tag (e.g., `UUID`, `TYPE`, `LABEL`, `PARTUUID`).                                    | `blkid -s UUID`        |
| `-c <file>`       | Reads from a specific cache file instead of the default `/run/blkid/blkid.tab`. If set to `/dev/null`, it bypasses the cache entirely. | `blkid -c /dev/null`   |
| `-p`              | Bypasses the cache and performs low-level probing directly on the specified device. Requires root privileges.                          | `blkid -p /dev/sda1`   |
| `-i`              | Gathers I/O limits (e.g., physical/logical sector sizes, minimum I/O sizes). Must be combined with `-p`.                               | `blkid -p -i /dev/sda` |
| `-t <name=value>` | Searches for block devices matching a specific key-value pair (e.g., searching only for swap partitions).                              | `blkid -t TYPE=swap`   |
| `-d`              | Forces `blkid` to only scan secondary/data devices, avoiding the primary root devices.                                                 | `blkid -d`             |
| `-k`              | Lists all known file systems and RAID formats that the `libblkid` library currently supports probing for.                              | `blkid -k`             |

## Examples

```bash
blkid
```

> The standard invocation. Reads the system cache and outputs the attributes for all detected block devices. Output looks like: `/dev/sda1: UUID="e4b..." TYPE="ext4" PARTUUID="1a2b..."`.

```bash
blkid -s UUID -o value /dev/sdb1
```

> The ultimate script-friendly pattern. It targets a specific device, requests only the `UUID` tag, and formats the output as a raw `value`. This strips away all keys and quotes, returning just the string (e.g., `e4b5...`), perfectly suited for bash variable assignment.

```bash
blkid -t TYPE=ext4 -o device
```

> Performs an attribute-based search. It filters the system to find all partitions formatted as `ext4` and uses the `device` output format to return only their `/dev/` paths as a clean, newline-separated list.

```bash
blkid -c /dev/null /dev/nvme1n1
```

> Forces a fresh probe. If a disk was just formatted via `mkfs`, the `blkid` cache might be stale. Pointing the cache path to `/dev/null` forces the utility to read the superblock of the NVMe drive directly from the disk.

```bash
blkid -o list
```

> Outputs the block device attributes in a human-readable, columnar table format containing the device path, filesystem type, label, and mount point.

## Real-World Scenarios

**Safe /etc/fstab Configuration**

```bash
DISK_UUID=$(blkid -s UUID -o value /dev/sdc1)
echo "UUID=$DISK_UUID /mnt/data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
```

> Cloud engineers routinely provision and attach new Elastic Block Store (EBS) volumes. Hardcoding `/dev/sdc1` in `fstab` is dangerous because detaching and reattaching volumes can shuffle the device letters. This script extracts the immutable UUID and safely injects it into the mount table, ensuring the volume always mounts correctly upon reboot.

**Verifying Boot Partitions in Recovery Mode**

```bash
blkid -L efi
blkid -t PARTLABEL="EFI System Partition"
```

> When a Linux instance enters grub rescue or emergency mode due to a corrupted bootloader, an administrator uses `blkid` to quickly locate which `/dev/` node contains the EFI partition by querying its known label, allowing them to mount and repair the boot sequence.

## When should it NOT be used?

- **Visualizing Disk Topologies:** **Do not use `blkid` to understand disk layouts.** `blkid` produces a flat list of partitions. It does not show parent-child relationships (like LVMs sitting on top of LUKS sitting on top of a physical disk). Use `lsblk` for a clear, tree-like visualization of the storage hierarchy.
- **Checking Mount Status:** **Do not use `blkid` to see if a disk is currently mounted.** While `-o list` shows mount points, it relies on caching and isn't the primary source of truth. Use `findmnt` or `df` to inspect the active kernel mount namespace.

## Alternatives

- **`lsblk`:** **Best for human operators.** Provides a vastly superior, tree-style overview of block devices, their sizes, mount points, and relationships. Often preferred over `blkid` for daily terminal usage.
- **`file -s`:** **Best for unformatted raw data.** If a disk doesn't have a recognizable filesystem or superblock, `blkid` might return nothing. `file -s /dev/sdb` will read the raw magic bytes and attempt to identify the exact binary structure of the data on the block device.

## How it works internally

`blkid` relies on `libblkid`, a core C library within the `util-linux` package.

When you run `blkid` without arguments, it does not actually spin up the disk platters or perform intensive I/O reads. Instead, it reads a fast, in-memory cache maintained by the `udev` daemon, typically stored at `/run/blkid/blkid.tab`.

If the cache is bypassed (using `-p` or `-c /dev/null`), `libblkid` performs low-level "probing." It opens the block device file (e.g., `/dev/sda1`) using the `open()` system call in read-only mode. It then reads the first few kilobytes or megabytes of the partition, searching for specific binary signatures ("magic bytes") at known offsets. For example, to identify an `ext4` filesystem, it looks for the `0xEF53` signature at byte offset 1080 inside the superblock. Once the filesystem type is identified, `libblkid` knows exactly which offsets within that specific superblock schema contain the volume label and the UUID, extracts them, and prints them to the terminal.

## Performance Notes

- **Cache Efficiency:** The default cache-read behavior ensures `blkid` executes in milliseconds without incurring block device I/O penalties.
- **Probe Latency:** Bypassing the cache on a massive SAN attached via iSCSI or Fibre Channel can cause brief execution delays as the tool must negotiate read operations over the network protocol.

## Security Notes

- **Root Permissions Requirement:** Reading from the cache file (`/run/blkid/blkid.tab`) requires elevated permissions. Furthermore, performing direct probing (reading raw blocks from `/dev/sda`) inherently requires `root` privileges. Standard users running `blkid` will receive no output or severely restricted output.
- **UUID Spoofing:** UUIDs are not cryptographic hashes; they are randomly generated strings written to the superblock. An attacker with root access can easily rewrite a filesystem's UUID using `tune2fs -U` to match an existing disk, potentially tricking `mount` scripts into mounting malicious volumes.

## Common Mistakes

- **Assigning output with quotes in scripts**
  - _Mistake:_ Using `ID=$(blkid -s UUID /dev/sdb1)` and writing it to a file.
  - _Why:_ Without `-o value`, `blkid` outputs `UUID="1234..."`. If you inject this into a config file, you inject literal double quotes and the `UUID=` prefix, which breaks standard parsing. Always use `-o value` for variable assignments.
- **Running without `sudo` and assuming the disk is blank**
  - _Mistake:_ Typing `blkid /dev/sdb1` as a regular user, seeing no output, and assuming the disk is unformatted.
  - _Why:_ The command silently fails to read the block device due to lack of read permissions on `/dev/sdb1`. Always run `blkid` with `sudo`.

## Best Practices

- **Always use UUIDs in `/etc/fstab`:** This is the primary reason `blkid` exists. Never write `/dev/sdX` into a mount file. Hardware changes will inevitably shift the device lettering and crash your server on boot.
- **Use PARTUUID for GPT disks:** If managing UEFI/GPT disks, prefer `PARTUUID` over `UUID`. `UUID` belongs to the filesystem (and changes if you reformat the partition). `PARTUUID` belongs to the partition table slot itself, remaining constant even if you format the partition from `ext4` to `xfs`.

## Interview Questions

**Q: You just formatted a new partition `/dev/sdc1` with `ext4`, but when you run `blkid`, it still shows the old `xfs` filesystem type. Why is this happening and how do you fix it?**
**A:** `blkid` aggressively relies on a system cache (usually located at `/run/blkid/blkid.tab`) managed by `udev` to improve performance. The cache hasn't updated yet. You must bypass the cache and force a direct hardware probe by running `sudo blkid -c /dev/null /dev/sdc1` or `sudo blkid -p /dev/sdc1`.

**Q: Explain the difference between `UUID` and `PARTUUID` in `blkid` output.**
**A:** `UUID` is an attribute of the _filesystem_ written within the superblock. If you run `mkfs` and reformat the partition, the `UUID` will change. `PARTUUID` (Partition UUID) is an attribute of the _partition table_ (specifically GPT). It identifies the physical slot on the disk and will remain exactly the same even if the filesystem within that partition is completely destroyed and reformatted.

## Practice Problems

**Problem:** You are writing an automation script. You need to assign the exact raw UUID string of `/dev/vdb1` to a bash variable named `DATA_DISK_ID`, without any quotes or metadata keys. Write the command to extract this value.
**Hint:** Use the flags to specify the tag search and alter the output format.
**Solution:**

```bash
DATA_DISK_ID=$(sudo blkid -s UUID -o value /dev/vdb1)
```

**Problem:** You need to find which physical `/dev/` device path contains the boot partition, which you know has the label `boot`. Write the command to resolve the label to its device path.
**Hint:** Use the specific flag designed for label lookups.
**Solution:**

```bash
sudo blkid -L boot
```

## References

- [blkid(8) - Linux man page](https://linux.die.net/man/8/blkid)
- [util-linux repository (libblkid)](https://github.com/util-linux/util-linux/tree/master/libblkid)
