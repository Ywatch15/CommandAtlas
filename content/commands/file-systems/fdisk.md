---
slug: fdisk
name: fdisk
aliases:
  - format disk
category: file-systems
tags:
  - linux
  - storage
  - disk
  - partitions
  - formatting
  - filesystem
difficulty: intermediate
supportedOS:
  - linux
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - create disk partition
  - format a drive linux
  - manage partition table
  - change partition type
  - list physical drives
relatedCommands: [parted, mkfs, lsblk, mount, blkid, df, fsck]
alternatives: [parted]
status: draft
---

## What is it?

`fdisk` is a low-level, dialog-driven command-line utility used to view, create, delete, and manipulate disk partition tables on Linux and Unix systems. It interacts directly with the raw block device, allowing system administrators to divide a physical hard drive or logical cloud volume into multiple distinct, manageable logical segments (partitions) before formatting them with file systems.

## Why does it exist?

Operating systems and hardware firmware (like BIOS or UEFI) need a standardized map to understand where one logical volume ends and another begins on a physical disk platter. `fdisk` exists as the historical standard tool to manage these maps—specifically the traditional Master Boot Record (MBR) and, in modern versions, GUID Partition Table (GPT) architectures. By providing a menu-driven text interface, it abstracts the complex sector-level math and hexadecimal partition type codes required to safely define booting sectors and swap space boundaries.

## Syntax

```bash
fdisk [options] <device>
fdisk -l [device...]
```

## Flags

| Flag                                  | Description                                                                                                                      | Example                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `-l`, `--list`                        | Lists the partition tables for the specified devices. If no device is given, it lists partition tables for all attached disks.   | `fdisk -l /dev/nvme0n1`     |
| `-u`, `--units[=cylinders\|sectors]`  | Sets the display units to cylinders or sectors. Sectors (the default) is the only reliable metric for modern disk geometries.    | `fdisk -u=sectors /dev/sda` |
| `-x`, `--list-details`                | Like `-l`, but outputs extra detailed, extended information about the physical geometry and partition alignment boundaries.      | `fdisk -x`                  |
| `-c`, `--compatibility[=dos\|nondos]` | Disables DOS-compatible mode (the default is `nondos`). DOS compatibility is obsolete and ruins sector alignment on modern SSDs. | `fdisk -c=nondos /dev/sdb`  |
| `-s`, `--getsz`                       | (Legacy) Prints the size of a partition in 512-byte blocks. Deprecated in favor of `blockdev`.                                   | `fdisk -s /dev/sda1`        |
| `-W`, `--wipe <mode>`                 | Wipes filesystem, RAID, and partition-table signatures from the device. Modes: `auto`, `always`, `never`.                        | `fdisk -W always /dev/sdb`  |

### Interactive Menu Commands

_(When running `fdisk /dev/sda`, you enter an interactive prompt. These are the core internal commands.)_

| Command | Action                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------- |
| `p`     | Prints the current in-memory partition table to the terminal.                                     |
| `n`     | Creates a new partition, prompting for start and end sectors.                                     |
| `d`     | Deletes an existing partition from the table.                                                     |
| `t`     | Changes the partition type (e.g., changing Linux Native to Linux Swap `82` or EFI System `EF00`). |
| `g`     | Creates a brand new, empty GUID Partition Table (GPT) on the device.                              |
| `o`     | Creates a brand new, empty DOS (MBR) partition table on the device.                               |
| `w`     | Writes the changes from memory to the physical disk and gracefully exits `fdisk`.                 |
| `q`     | Quits the interactive interface completely without saving any changes to the disk.                |

## Examples

```bash
fdisk -l
```

> The universal discovery command. Requires root privileges. It scans the kernel and outputs the raw physical geometries (size, sectors, bytes) and defined partition boundaries for every block device (`/dev/sda`, `/dev/nvme0n1`) currently attached to the system.

```bash
fdisk /dev/sdb
```

> Enters the interactive menu-driven interface specifically for the second SCSI/SATA disk (`sdb`). All subsequent key presses (`p`, `n`, `w`) will operate strictly on this specific block device.

```bash
# Inside fdisk /dev/sdb:
# Press 'n' (new), 'p' (primary), '1' (partition number), 'Enter' (default first sector), '+50G' (last sector)
# Press 'w' (write)
```

> The standard workflow to provision a new 50 Gigabyte partition on an unformatted disk. By leveraging the `+50G` syntax for the last sector, `fdisk` mathematically calculates the exact sector boundaries required, sparing the administrator from manual block arithmetic.

```bash
fdisk -l /dev/xvdf
```

> Scans and lists the partition table for a specific AWS Elastic Block Store (EBS) volume (`xvdf`), helping a cloud engineer verify if a newly attached disk is completely raw or already contains formatted partitions.

## Real-World Scenarios

**Expanding a Partition After Cloud Disk Resizing**

```bash
fdisk /dev/sda
# Press 'd' (delete partition)
# Press 'n' (new partition), select same starting sector as the deleted one, use default last sector (to consume new free space)
# Press 'w' (write and exit)
partprobe /dev/sda
xfs_growfs /
```

> When an engineer increases the size of a VM's root disk in the AWS/Azure console, the OS sees the new raw space, but the partition table does not expand automatically. The engineer uses `fdisk` to carefully delete the partition boundary and recreate it utilizing the expanded space, ensuring the starting sector remains identical to prevent data loss. _(Note: `growpart` is a safer, automated modern alternative for this specific task)._

**Provisioning Swap Space**

```bash
fdisk /dev/sdc
# Press 'n' for new partition, 'Enter', 'Enter', '+8G'
# Press 't' to change type, enter '82' (Linux swap)
# Press 'w' to save
mkswap /dev/sdc1
swapon /dev/sdc1
```

> An administrator attaches a dedicated fast SSD to a server to act as virtual memory. They use `fdisk` to carve out an 8GB slice, and crucially, use the `t` command to change the hex code to `82`, explicitly flagging the partition as Swap space before writing the table to disk.

## When should it NOT be used?

- **Disks larger than 2TB (MBR limitation):** **Do not use `fdisk` in DOS mode for massive arrays.** Traditional DOS/MBR partition tables use 32-bit sector addressing, strictly limiting them to addressing a maximum of 2TB. Modern `fdisk` supports GPT, but tools like `gdisk` (GPT fdisk) or `parted` are specifically optimized for navigating complex GPT tables on massive SAN arrays.
- **Scripted / Automated Environments:** **Do not use `fdisk` in Bash or Ansible scripts.** `fdisk` is inherently interactive and relies on `stdin`. Piping text into it (`echo -e "n\np\n1\n\n\nw" | fdisk`) is incredibly brittle. Use `parted` or `sfdisk` for non-interactive, programmatic partitioning.
- **Creating File Systems:** **`fdisk` does not format disks.** It only creates the boundaries. After running `fdisk`, you still cannot mount the disk until you apply a file system using `mkfs.ext4`, `mkfs.xfs`, etc.

## Alternatives

- **`parted` (GNU Parted):** **Best for programmatic automation and GPT.** Highly robust, supports non-interactive execution on the command line (e.g., `parted -s /dev/sdb mkpart primary 0% 100%`), and handles massive disks perfectly.
- **`gdisk`:** **Best for pure GPT manipulation.** An interactive tool modeled identically after `fdisk`, but engineered from the ground up strictly for GUID Partition Tables.
- **`cfdisk` / `cgdisk`:** **Best for visual UI.** Provides a curses-based, visually friendly terminal interface allowing users to navigate free space with arrow keys rather than typing arcane letters.

## How it works internally

A hard drive is a contiguous sequence of 512-byte or 4096-byte sectors. To make sense of this, an architectural map is written to the very beginning of the disk.

When you run `fdisk /dev/sda`, the program issues an `open()` system call to the raw block device. It reads the very first 512 bytes of the disk—the Master Boot Record (MBR). This sector contains the bootloader code and a 64-byte partition table detailing the start and end cylinders/sectors of up to four primary partitions.

`fdisk` loads this 64-byte table into memory. When you issue interactive commands (like `n` for new or `d` for delete), you are exclusively modifying `fdisk`'s in-memory C-struct representation of the table. Absolutely no data on the physical hard drive is touched.

When you finally press `w` (write), `fdisk` executes an `ioctl()` system call to request permission from the kernel, translates its in-memory table into the strict 64-byte hexadecimal MBR format (or standard GPT structures), and issues a `write()` system call to overwrite sector 0 of the physical disk.

Finally, `fdisk` issues the `BLKRRPART` `ioctl` to the Linux kernel. This forces the kernel to instantly re-read the newly written partition table from the disk, allowing `udev` to dynamically create the new `/dev/sda1` or `/dev/sda2` device nodes in the filesystem without requiring a system reboot.

## Performance Notes

- **Sector Alignment:** Modern SSDs and Advanced Format hard drives utilize 4096-byte physical sectors. Legacy `fdisk` implementations historically aligned partitions to cylinder boundaries (often 512 bytes), resulting in misaligned partitions spanning physical blocks. This caused severe write amplification and degraded SSD performance by 50%. Modern `fdisk` completely abandons cylinders and forces 1 MiB (2048 sector) alignment by default, ensuring perfect performance compatibility with all modern flash storage.

## Security Notes

- **Catastrophic Data Loss:** `fdisk` is one of the most dangerous commands on a Linux system. Because it operates underneath the file system logic, deleting a partition boundary with `fdisk` instantly severs the OS's ability to locate or read the files within it. Always triple-check the output of `fdisk -l` to ensure you are targeting `/dev/sdb` (the blank disk) and not `/dev/sda` (the active OS).
- **Raw Disk Access:** Executing `fdisk` requires root privileges because interacting with raw block devices bypasses all kernel-level file permission structures, allowing low-level modification of absolute sector data.

## Common Mistakes

- **Formatting the raw device instead of the partition**
  - _Mistake:_ Using `fdisk` to create `/dev/sdb1`, but then running `mkfs.ext4 /dev/sdb`.
  - _Why:_ `/dev/sdb` is the entire physical disk. By formatting `sdb` directly, you instantly obliterate the partition table `fdisk` just painstakingly created, formatting the raw metal. You must always format the specific partition node (`/dev/sdb1`).
- **Forgetting `w` (Write)**
  - _Mistake:_ Spending 10 minutes carefully designing 5 partitions, feeling satisfied, and pressing `q` or `Ctrl+C`.
  - _Why:_ `fdisk` is purely transactional in memory. Exiting with `q` discards all changes. You must press `w` to commit the table to the disk platter.
- **"Device or resource busy" on write**
  - _Mistake:_ Attempting to alter the partition table of a disk while one of its partitions is currently `mount`ed to a directory or in use as `swap`.
  - _Why:_ The kernel locks the partition table of actively mounted drives. While `fdisk` will successfully write the new table to sector 0, the kernel will refuse to re-read it, issuing a warning. The new boundaries will not take effect until the machine is fully rebooted. Always `umount` drives before partitioning.

## Best Practices

- **Default to GPT (`g`):** Unless you are deploying to a 20-year-old legacy BIOS system, always press `g` when initializing a blank disk in `fdisk` to create a GUID Partition Table. It supports partitions over 2TB, allows 128 partitions (eliminating the messy primary/extended/logical MBR hacks), and keeps a backup table at the end of the disk for corruption recovery.
- **Use `+Size` syntax:** When prompted for the "Last sector" during partition creation, never do manual math. Let `fdisk` calculate the alignment. Simply type `+100G` for 100 Gigabytes, or `+500M` for Megabytes.

## Interview Questions

**Q: You use `fdisk` to create a new partition, `/dev/sdb1`, and press `w` to write the changes. The command succeeds, but when you run `lsblk`, `/dev/sdb1` does not exist, and `mkfs.ext4 /dev/sdb1` fails. What is the most likely cause, and how do you fix it without rebooting?**
**A:** The kernel failed to re-read the partition table because the disk `/dev/sdb` is likely in use (e.g., another partition on it is actively mounted). While the changes were written to the physical disk platter, the kernel's in-memory representation is stale. To fix this without rebooting, unmount all partitions on `/dev/sdb` and run `partprobe /dev/sdb` or `blockdev --rereadpt /dev/sdb` to force the kernel to refresh its device nodes.

**Q: A junior administrator needs to automate the partitioning of 50 attached cloud volumes within a bash script. They plan to use `echo -e "n\np\n1\n\n\nw" | fdisk /dev/sdb`. Why is this an anti-pattern, and what tool should they use instead?**
**A:** `fdisk` is designed exclusively as an interactive, menu-driven tool. Piping raw keystrokes into it is incredibly brittle; if a disk already contains a signature, `fdisk` will inject an unexpected interactive prompt ("Do you want to remove the signature? [Y/N]"), causing the echo pipeline to misalign and fail catastrophically. For programmatic, non-interactive partitioning, they should strictly use GNU `parted` or `sfdisk`.

## Practice Problems

**Problem:** You are connected to a new server and want to view the partition tables, disk sizes, and block paths for every drive attached to the system without entering any interactive menus. Write the command.
**Hint:** Use the flag designed for global listing.
**Solution:**

```bash
fdisk -l
```

**Problem:** You are inside the `fdisk /dev/sdc` interactive prompt. You need to create a new, empty GPT (GUID Partition Table) architecture on this disk, completely wiping out its old MBR layout. What single letter command do you type?
**Hint:** MBR creation is `o`. GPT creation is another single letter command.
**Solution:**

```bash
g
```

## References

- [fdisk(8) - Linux man page](https://linux.die.net/man/8/fdisk)
- [Partitioning with fdisk (Arch Wiki)](https://wiki.archlinux.org/title/Fdisk)
