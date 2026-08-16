---
slug: parted
name: parted
aliases: [gnu parted]
category: file-systems
tags: [linux, storage, disk, partitions, gpt, formatting]
difficulty: advanced
supportedOS: [linux, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'create disk partition linux'
  - 'initialize gpt disk parted'
  - 'resize partition command line'
  - 'script disk partitioning'
  - 'create massive storage volume'
relatedCommands: [fdisk, lsblk, mkfs, blkid]
alternatives: [fdisk]
status: draft
---

## What is it?

`parted` is a powerful command-line partition manipulation program designed to create, destroy, resize, check, and copy disk partitions and their underlying filesystems. It supports a vast array of partition table formats (notably GPT and MBR) and is purpose-built to handle massive multi-terabyte enterprise storage arrays accurately.

## Why does it exist?

Historically, Linux storage partitioning was dominated by `fdisk`, which relied entirely on the DOS/MBR (Master Boot Record) partition table format. However, MBR uses 32-bit sector addressing, imposing a strict architectural limit of 2 Terabytes maximum disk capacity. As enterprise storage outgrew this limitation, the GUID Partition Table (GPT) standard emerged. `parted` was developed to provide robust, scriptable support for GPT and large-sector disks, filling the gap left by legacy tools and enabling the configuration of massive modern cloud and SAN storage volumes.

## Syntax

```bash
parted [options] [device [command [options...]...]]
```

## Flags

| Flag / Command             | Description                                                                              | Example                                       |
| -------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| `-s`, `--script`           | Runs `parted` in non-interactive batch mode; never prompts the user for confirmation.    | `parted -s /dev/nvme0n1 print`                |
| `-a`, `--align <type>`     | Forces specific partition alignment algorithms (e.g., `optimal`, `minimal`, `cylinder`). | `parted -a optimal /dev/sdb`                  |
| `-l`, `--list`             | Lists the partition layout and capacity of all block devices detected on the system.     | `parted -l`                                   |
| `-m`, `--machine`          | Formats output in a colon-separated, machine-readable syntax ideal for parsing scripts.  | `parted -m /dev/sda print`                    |
| `mklabel <label>`          | Writes a new partition table/label format to the disk (e.g., `gpt`, `msdos`).            | `parted /dev/sdc mklabel gpt`                 |
| `mkpart <type> [fs]`       | Creates a new partition with an optional filesystem hint, start point, and end point.    | `parted /dev/sdb mkpart primary ext4 0% 100%` |
| `print`                    | Displays the current partition table, alignment geometry, and disk capacities.           | `parted /dev/sda print`                       |
| `rm <number>`              | Deletes the specified partition number from the active disk.                             | `parted /dev/sdc rm 2`                        |
| `resizepart <num>`         | Alters the ending boundary of an existing partition to grow or shrink its capacity.      | `parted /dev/sdb resizepart 1 500GB`          |
| `set <num> <flag> <state>` | Toggles partition flags (e.g., `boot`, `lvm`, `raid`) to `on` or `off`.                  | `parted /dev/sda set 1 boot on`               |

## Examples

```bash
parted -l
```

> This enumerates every attached block device on the system, outputting detailed summaries of disk capacities, logical/physical sector geometries, and complete partition layout tables for each drive.

```bash
parted -s /dev/nvme1n1 mklabel gpt
```

> This operates in silent script mode (`-s`), taking a raw NVMe block device and writing a completely new, blank GUID Partition Table (GPT) to its header, permanently destroying any prior partition structures.

```bash
parted -s -a optimal /dev/sdb mkpart primary ext4 0% 100%
```

> This is the definitive command for provisioning a new secondary data drive. It silently creates a single primary partition utilizing 100% of the disk's capacity, instructing the kernel to calculate mathematically `optimal` block alignment.

```bash
parted /dev/sdc resizepart 1 100%
```

> After expanding an underlying cloud EBS volume via a web console, this command updates the Linux kernel partition boundary, instructing partition `1` to expand its ending sector to consume the newly available 100% of the physical disk footprint.

```bash
parted -s /dev/sdd set 2 lvm on
```

> This modifies metadata on partition number `2` silently, toggling the `lvm` flag to `on`. This explicitly identifies the partition as a Physical Volume candidate intended for use by the Logical Volume Manager suite.

## Real-World Scenarios

**Automated Cloud Initialization Scripts (Cloud-Init)**

```bash
parted -s -a optimal /dev/nvme1n1 mklabel gpt mkpart primary ext4 0% 100%
```

> Infrastructure-as-Code pipelines deploying massive fleet instances execute chained `parted` commands within `cloud-init` user data to automatically identify, label, partition, and align attached terabyte cloud storage volumes instantly without human intervention.

**Expanding Live Database Storage Volumes**

```bash
parted -s /dev/sdb resizepart 1 100% && resize2fs /dev/sdb1
```

> Systems administrators combatting "disk full" alerts on production databases expand the virtual SAN or Cloud Block Storage volume first, then use `parted resizepart` to extend the partition table boundary live, immediately followed by `resize2fs` to expand the actual filesystem into the newly claimed space.

**Preparing Advanced Software RAID Arrays**

```bash
parted -s /dev/sdc mklabel gpt mkpart primary 1MiB 100% set 1 raid on
```

> Storage engineers building complex `mdadm` RAID arrays script the exact partitioning boundaries across dozens of identical hard drives, ensuring strict 1MiB offset alignments to prevent severe write amplification on modern SSDs.

## When should it NOT be used?

- **Operating on simple, standard legacy boot disks (< 2TB):** **Reason:** While `parted` works perfectly, `fdisk` possesses a far simpler interactive menu system and remains the ubiquitous default for legacy MBR drives. **Use instead:** `fdisk`.
- **Creating the actual filesystem structures (formatting):** **Reason:** `parted mkpart` accepts a filesystem type (like `ext4`), but this only sets a hexadecimal ID _hint_ in the partition table. It does not actually format the drive with superblocks and inodes. **Use instead:** Always follow `parted` with the `mkfs` utility.

## Alternatives

- **`fdisk` / `gdisk`:** Interactive partition editors. **Tradeoff:** `fdisk` and `gdisk` provide highly interactive, protective menus that hold changes in memory until you type `w` to write them. `parted` executes commands immediately against the disk, making it far superior for automation scripts but slightly more dangerous for interactive human use.
- **`sfdisk`:** Scriptable fdisk. **Tradeoff:** `sfdisk` allows dumping and restoring raw partition tables via standard input text streams, making it excellent for cloning exact disk layouts across identical hardware arrays, a niche where `parted` syntax is more cumbersome.

## How it works internally

`parted` interfaces directly with the raw block device via the Linux kernel's block layer (`/dev/sdX`).

When commands like `mklabel` or `mkpart` are invoked, `parted` seeks specific sectors on the physical disk to manipulate partition data structures. For MBR (`msdos`), it edits the 64-byte partition table located in the very first 512-byte sector of the disk. For GPT, it writes a Primary Header to LBA 1 (Logical Block Address 1), constructs an array of partition entries immediately following it, and explicitly writes a Secondary Header copy at the very last LBA of the disk for redundancy.

Crucially, after writing these raw bits to the disk hardware, `parted` issues a `BLKRRPART` ioctl system call to the Linux kernel. This forces the kernel to instantly drop its cached partition tables and re-read the hardware state, immediately populating the newly mapped `/dev/sdb1` device nodes into the virtual `/dev/` tree so they are accessible for mounting or formatting.

## Performance Notes

- **Sector Alignment Constraints:** Modern Advanced Format SSDs and NVMe drives utilize 4KB (or larger) physical sectors. If a partition starts exactly at sector 63 (the legacy MBR default), every single 4K write operation spans two physical blocks, resulting in massive Read-Modify-Write latency overhead (Write Amplification). Using `parted -a optimal` ensures partitions snap strictly to 1MiB boundaries, guaranteeing flawless SSD hardware alignment and maximal throughput.

## Security Notes

- **Immediate Execution Danger:** Unlike `fdisk`, which creates a safe RAM buffer and requires a specific `write` command, `parted` applies destructive partition table modifications to the physical disk _immediately_ upon pressing enter. A typographical error in `parted` causes instant, catastrophic data loss.
- **Root Isolation:** Manipulating raw block devices bypasses all user-space filesystem access controls. `parted` enforces strict UID 0 (root) execution requirements to prevent unauthorized tampering of hardware mapping structures.

## Common Mistakes

- **Confusing MB and MiB specifications:** Running `mkpart primary 0MB 1000MB`. **Why it's wrong:** Using base-10 Megabytes (`MB`) instead of base-2 Mebibytes (`MiB`) frequently throws mathematical alignment errors in `parted`, creating unaligned partitions that degrade SSD performance. Use percentage boundaries (`0% 100%`) or explicit `MiB`/`GiB` designations.
- **Assuming `parted` formats the drive:** Running `mkpart primary ext4 0% 100%` and immediately trying to `mount` the partition. **Why it's wrong:** The `ext4` keyword merely sets a metadata flag indicating the _intended_ filesystem. You must independently execute `mkfs.ext4` afterward to build the actual filesystem structures.
- **Starting partitions at exactly `0`:** Running `mkpart primary 0 100%`. **Why it's wrong:** Sector 0 physically holds the GPT/MBR header tables. Forcing a partition to start exactly at sector 0 overwrites the partition table itself, corrupting the disk. Using `0%` forces `parted` to calculate the safest optimal offset mathematically (usually starting at 1MiB).

## Best Practices

- Universally adopt GPT (`mklabel gpt`) instead of MBR (`mklabel msdos`) for all new infrastructure, resolving capacity limits and providing inherent header corruption recovery mechanisms.
- Always utilize the `-s` (script) and `-a optimal` flags in automation pipelines to guarantee non-blocking, performance-aligned execution across diverse cloud storage arrays.
- Prefer utilizing percentage boundaries (`0% 100%`) over hardcoded sector or gigabyte counts to ensure your provisioning scripts scale perfectly regardless of the underlying disk hardware capacity.

## Interview Questions

- _Query:_ What is the primary architectural advantage of utilizing the GPT (GUID Partition Table) format over the traditional MBR (Master Boot Record) format?
  - _A:_ MBR utilizes 32-bit sector pointers, creating an absolute hardware limit of 2 Terabytes of addressable space per disk, and only supports 4 primary partitions. GPT uses 64-bit LBA addressing, supporting disk sizes in the Zettabytes, allows for 128 primary partitions, and writes a redundant backup partition header to the very end of the disk for corruption recovery.
- _Query:_ Why is it critical to include the `-a optimal` flag when writing an automated shell script utilizing `parted` to provision Solid State Drives (SSDs)?
  - _A:_ Physical SSDs utilize page sizes of 4KB or larger. If a partition boundary is not aligned to these physical hardware blocks, every filesystem write straddles two physical flash pages, severely degrading write speed and degrading the drive's lifespan via Write Amplification. `-a optimal` ensures mathematically perfect 1MiB offset alignments matching modern storage physics.
- _Query:_ A developer complains that an automation script utilizing `fdisk` hangs indefinitely when executed inside a CI pipeline. Why does this happen, and why is `parted` the solution?
  - _A:_ `fdisk` is inherently designed as an interactive CLI application; it pauses execution to prompt users for geometric inputs and confirmation before writing. In a headless CI pipeline, there is no user to press 'enter', so the script hangs. `parted` explicitly supports a `-s` (script) batch mode, allowing complete partition manipulation in a single, non-interactive execution string.

## Practice Problems

- _Problem:_ Execute an automated, non-interactive command to rewrite the partition table of an attached blank disk (`/dev/sdc`) to the modern GPT standard.
  - _Hint:_ Combine the silent script mode flag with the label creation command.
  - _Solution:_ `parted -s /dev/sdc mklabel gpt` (The `-s` flag bypasses all interactive confirmation prompts while initializing the GPT header).
- _Problem:_ Create a single primary partition that spans the absolute entire capacity of `/dev/sdc`, ensuring the kernel calculates optimal sector alignment for the underlying SSD hardware.
  - _Hint:_ Invoke script mode, alignment mode, the partition creation command, and use percentage indicators for boundaries.
  - _Solution:_ `parted -s -a optimal /dev/sdc mkpart primary ext4 0% 100%` (This instantly provisions the partition spanning the full disk geometry flawlessly aligned to physical sectors).

## References

- [GNU Parted Manual](https://www.gnu.org/software/parted/manual/parted.html)
- [Man Page for parted (Linux)](https://man7.org/linux/man-pages/man8/parted.8.html)
