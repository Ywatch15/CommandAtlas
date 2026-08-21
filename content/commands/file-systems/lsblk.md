---
slug: lsblk
name: lsblk
aliases: []
category: file-systems
tags:
  - linux
  - storage
  - disk
  - partitions
  - block-device
  - formatting
difficulty: intermediate
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - list block devices linux
  - show disk partitions and sizes
  - find where drive is mounted
  - get disk UUID and filesystem type
  - view storage topology
relatedCommands:
  - fdisk
  - parted
  - blkid
  - mount
  - mkfs
  - df
  - umount
  - dd
alternatives:
  - blkid
status: draft
---

## What is it?

`lsblk` is a Linux command-line utility that lists information about all available or specified block devices (hard drives, SSDs, flash drives, LVM volumes, loop devices). It gathers data from the `sysfs` filesystem and `udev` databases, presenting a tree-like topology of devices and their nested partitions, mount points, and storage properties.

## Why does it exist?

Navigating Linux storage architecture—where raw disks are partitioned, encrypted with LUKS, grouped into LVM volumes, and mapped to complex mount points—is visually confusing. Legacy tools like `fdisk -l` produce unreadable flat text blocks. `lsblk` exists to provide an instant, hierarchical, and programmable map of a system's block storage topology, making it essential for systems engineers to identify drives safely before executing destructive operations like formatting or partitioning.

## Syntax

```bash
lsblk [options] [device...]
```

## Flags

| Flag                    | Description                                                                                      | Example                                |
| ----------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `-f`, `--fs`            | Outputs filesystem information, including UUIDs, labels, and FSTYPE (e.g., ext4, xfs).           | `lsblk -f`                             |
| `-m`, `--perms`         | Displays device ownership, user groups, and specific file permission modes.                      | `lsblk -m`                             |
| `-o`, `--output <list>` | Specifies exactly which columns to output (e.g., NAME, SIZE, TYPE, MOUNTPOINT).                  | `lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT` |
| `-J`, `--json`          | Formats the output strictly as a JSON object, ideal for programmatic parsing.                    | `lsblk -J`                             |
| `-t`, `--topology`      | Outputs internal block device topology (alignment, logical/physical sector sizes).               | `lsblk -t`                             |
| `-b`, `--bytes`         | Prints the SIZE column in raw bytes rather than human-readable formats (e.g., GB/MB).            | `lsblk -b`                             |
| `-d`, `--nodeps`        | Prevents the printing of nested partitions or dependencies; lists only top-level parent devices. | `lsblk -d`                             |
| `-P`, `--pairs`         | Formats output as key-value pairs (`KEY="value"`), useful for simple shell `eval` parsing.       | `lsblk -P`                             |
| `-S`, `--scsi`          | Lists only physical SCSI devices, excluding partitions, LVMs, and loop devices.                  | `lsblk -S`                             |
| `-a`, `--all`           | Includes empty or inactive devices (like empty CD-ROM drives or unused loop devices).            | `lsblk -a`                             |
| `-x`, `--sort <col>`    | Sorts the output lines by the specified column name.                                             | `lsblk -x SIZE`                        |

## Examples

```bash
lsblk
```

> This runs the default invocation, outputting an ASCII tree displaying device names (`sda`, `nvme0n1`), major/minor numbers, removable flags, sizes, read-only status, type (disk/part), and active mount points.

```bash
lsblk -f
```

> This lists devices with their filesystem contexts, exposing the UUID, filesystem type (`ext4`, `vfat`, `swap`), and filesystem labels, which is critical when editing `/etc/fstab` for persistent mounting.

```bash
lsblk -d -o NAME,SIZE,MODEL
```

> This limits the output to only top-level parent disks (`-d`, ignoring partitions) and selectively prints strictly the device name, capacity, and hardware model string.

```bash
lsblk -J -o NAME,SIZE,MOUNTPOINT
```

> This serializes the selected block device columns into a highly structured JSON document, which is frequently used by Ansible or Python automation scripts to audit server storage infrastructure dynamically.

```bash
lsblk /dev/nvme1n1
```

> This queries the topology specifically for a single attached NVMe drive, ignoring the rest of the host's storage devices.

## Real-World Scenarios

**Identifying New EBS Volumes in AWS**

```bash
lsblk
```

> Cloud engineers attaching new EBS volumes to EC2 instances run `lsblk` immediately to locate the newly injected, unformatted raw block device (e.g., `/dev/xvdf`) before provisioning filesystems.

**Gathering UUIDs for `/etc/fstab` Configurations**

```bash
lsblk -f /dev/sdb1
```

> Systems administrators configuring permanent storage mounts query the exact UUID and FSTYPE of a target partition, copying the UUID into `/etc/fstab` to ensure the disk mounts reliably across reboots regardless of device letter reassignment.

**Automated Storage Infrastructure Audits**

```bash
lsblk -J -b | jq '.blockdevices[] | select(.type=="disk") | .size'
```

> DevSecOps pipelines parse raw disk byte capacities using `lsblk` combined with `jq` to validate that provisioned cloud instances meet exact storage compliance baselines before allowing workloads to start.

## When should it NOT be used?

- **Modifying, creating, or resizing partitions:** **Reason:** `lsblk` is strictly a read-only reporting and querying utility. It cannot write partition tables or format drives. **Use instead:** `parted`, `fdisk`, or `mkfs`.
- **Inspecting detailed LVM volume group internals:** **Reason:** While `lsblk` shows the topology of logical volumes, it lacks detailed metadata regarding Physical Extents, Volume Group free space, and snapshot statuses. **Use instead:** `pvs`, `vgs`, and `lvs`.

## Alternatives

- **`blkid`:** Command-line utility to locate/print block device attributes. **Tradeoff:** `blkid` excels specifically at printing raw UUIDs and filesystem types quickly for scripts, but lacks the visual dependency tree structure of `lsblk`.
- **`fdisk -l`:** Legacy partition table manipulator. **Tradeoff:** `fdisk` reads the actual MBR/GPT partition tables directly from disk headers, whereas `lsblk` queries kernel RAM state (`sysfs`), making `lsblk` faster and non-blocking but potentially unaware of unsynced disk states.

## How it works internally

`lsblk` does not perform direct disk I/O to read partition tables or superblocks off the physical hardware. Instead, it operates entirely by querying the Linux kernel's internal RAM data structures.

It traverses the `/sys/dev/block/` and `/sys/block/` virtual filesystems (sysfs) to gather the major/minor numbers, sizes, and hierarchical relationships of devices. For extended filesystem metadata (like UUIDs, labels, and FSTYPEs triggered by the `-f` flag), it reads the cached udev database located at `/run/udev/data/`.

Because it relies on these cached kernel mappings, `lsblk` is exceptionally fast and can run without root privileges (though non-root users may not see advanced udev metadata or UUIDs). It constructs an internal tree mapping disks to partitions to LVMs to LUKS crypts, rendering the final ASCII or JSON output to stdout.

## Performance Notes

- Execution is effectively instantaneous. Because it reads kernel `sysfs` memory rather than spinning up physical disks or waking sleeping network mounts, it is highly optimized for polling inside monitoring loops.
- Running `lsblk` does not wake sleeping hard drives (standby mode), preventing unnecessary power spikes and disk spin-up delays in large storage arrays.

## Security Notes

- **Privilege Masking:** While standard users can execute `lsblk` and see device sizes and names, Linux limits access to specific `udev` metadata. If you omit `sudo`, the UUID, LABEL, and FSTYPE columns may be silently left blank for certain devices to prevent unprivileged reconnaissance.
- **Non-Destructive Nature:** As a pure querying tool, `lsblk` is completely safe to run in strict production environments; it cannot corrupt partition tables or invoke destructive formatting.

## Common Mistakes

- **Confusing block devices with character devices:** Expecting serial ports (`tty`) or random generators (`/dev/urandom`) to show up. **Why it's wrong:** `lsblk` only lists _block_ storage devices (data read/written in fixed-size blocks). Character devices stream data bit-by-bit and are tracked elsewhere.
- **Trusting `lsblk` immediately after `fdisk` without syncing:** **Why it's wrong:** If you rewrite a partition table using `parted` but the kernel hasn't re-read the partition table yet (requiring `partprobe`), `lsblk` will show stale data because it reads from `sysfs`, not the physical disk.
- **Using hardcoded device names in scripts:** Piping `/dev/sda` outputs. **Why it's wrong:** Device letters (`sda`, `nvme0n1`) are non-deterministic and can shift across reboots. Always query and mount by UUID.

## Best Practices

- Always execute `lsblk -f` to positively identify a target disk's UUID and size _before_ executing destructive commands like `mkfs` or `dd`, ensuring you do not accidentally wipe the host OS drive.
- Leverage the `-J` (JSON) flag in shell scripts or Python automation; parsing JSON is vastly more resilient to `lsblk` column shifts or terminal line wrapping than using `awk` or `grep`.
- Run `sudo lsblk` instead of unprivileged `lsblk` when gathering UUIDs for mounting, guaranteeing that udev permissions do not mask critical filesystem identifiers.

## Interview Questions

**Q:** Why might a newly created filesystem partition show up in `fdisk -l` but fail to appear when you immediately run `lsblk`?
**A:** `fdisk -l` reads the raw MBR or GPT partition table directly off the physical disk. `lsblk` reads the active state from the kernel's virtual `sysfs` filesystem. If the kernel has not been informed of the partition table changes (via a system call like `partprobe`), `lsblk` will display outdated topology data.
**Q:** What is the critical advantage of using `lsblk` output to gather data for `/etc/fstab` compared to using `/dev/sdX` paths?
**A:** `/dev/sdX` device node letters are dynamically assigned by the kernel at boot and can change depending on device initialization speed or new hardware. `lsblk -f` provides the filesystem UUID, which is a static, immutable identifier baked into the filesystem superblock, ensuring permanent, deterministic mounting regardless of physical port changes.
**Q:** How does `lsblk -d` alter the default reporting structure of the command?
**A:** The `-d` (nodeps) flag instructs `lsblk` to ignore dependencies. It strips away all nested partitions, LVMs, and loop devices from the output tree, displaying only the top-level parent block devices (the raw physical or virtual disks themselves).

## Practice Problems

**Problem:** Display a hierarchical list of block devices including their UUIDs and filesystem types, ensuring you have the necessary privileges to see all metadata.
**Hint:** Combine the filesystem flag with superuser privileges.
**Solution:** `sudo lsblk -f` (This fetches and displays complete `udev` metadata including FSTYPE and UUIDs).
**Problem:** Output the topology of the system's storage strictly as a JSON document containing only the NAME, SIZE, and MOUNTPOINT columns.
**Hint:** Combine the JSON flag and the specific output column formatting flag.
**Solution:** `lsblk -J -o NAME,SIZE,MOUNTPOINT` (This serializes the specific requested columns into a programmable JSON array).

## References

- [Man Page for lsblk (Linux)](https://man7.org/linux/man-pages/man8/lsblk.8.html)
- [Kernel.org - sysfs Documentation](https://www.kernel.org/doc/Documentation/filesystems/sysfs.txt)
