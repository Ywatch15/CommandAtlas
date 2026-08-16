---
slug: mount
name: mount
aliases: []
category: file-systems
tags:
  - linux
  - storage
  - filesystem
  - attach
  - fstab
  - hierarchy
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - attach a filesystem linux
  - mount a disk drive
  - bind mount directory
  - remount filesystem read write
  - mount all fstab entries
relatedCommands:
  - umount
  - lsblk
  - fdisk
  - mkfs
  - blkid
  - df
  - fsck
alternatives: []
status: draft
---

## What is it?

`mount` is a core Linux command-line utility used to attach filesystems residing on block devices (like hard drives, USBs, or network shares) into the main OS directory tree (the Virtual File System hierarchy). It translates physical hardware boundaries into navigable folder structures accessible by user applications.

## Why does it exist?

Unlike Windows, which assigns arbitrary drive letters (C:, D:) to physical partitions, UNIX-like operating systems operate on a single, unified, hierarchical directory tree starting at the root `/`. `mount` exists to fulfill this architectural design by seamlessly grafting isolated physical devices, virtual filesystems, and network shares onto designated "mount point" directories, creating the illusion of a single contiguous storage system.

## Syntax

```bash
mount [-l|-h|-V]
mount -a [-fFnrsvw] [-t fstype] [-O optlist]
mount [-fnrsvw] [-o options] device|dir
mount [-fnrsvw] [-t fstype] [-o options] device dir
```

## Flags

| Flag                | Description                                                                               | Example                                  |
| ------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| `-t <fstype>`       | Specifies the type of filesystem being mounted (e.g., `ext4`, `nfs`, `cifs`, `vfat`).     | `mount -t nfs 10.0.0.5:/share /mnt`      |
| `-o <options>`      | Supplies a comma-separated list of mount options (e.g., `ro`, `rw`, `noexec`, `remount`). | `mount -o ro,nosuid /dev/sdb1 /mnt/data` |
| `-a`, `--all`       | Mounts all filesystems configured in `/etc/fstab` (excluding those marked `noauto`).      | `mount -a`                               |
| `-B`, `--bind`      | Remounts a subtree or directory somewhere else within the filesystem hierarchy.           | `mount --bind /var/www /opt/web-backup`  |
| `-R`, `--rbind`     | Recursively bind-mounts a directory and all of its submounts to another location.         | `mount --rbind /dev /mnt/chroot/dev`     |
| `-r`, `--read-only` | Mounts the specified filesystem in strictly read-only mode, protecting data from writes.  | `mount -r /dev/sdc1 /mnt/archive`        |
| `-w`, `--rw`        | Mounts the filesystem in read-write mode (this is the default behavior).                  | `mount -w /dev/sdb1 /data`               |
| `-v`, `--verbose`   | Produces detailed output explaining what the mount command is currently doing.            | `mount -v /dev/sda1 /boot`               |
| `-f`, `--fake`      | Performs a dry run; executes all preparation steps but bypasses the actual system call.   | `mount -f -a`                            |
| `-n`, `--no-mtab`   | Mounts without writing a corresponding record into `/etc/mtab`.                           | `mount -n -t tmpfs tmpfs /tmp`           |

## Examples

```bash
mount /dev/nvme0n1p1 /mnt/data
```

> This invokes the kernel's auto-discovery mechanism to detect the filesystem type on the specified NVMe partition and actively attaches it to the `/mnt/data` directory with default read/write permissions.

```bash
mount -a
```

> This parses the system's `/etc/fstab` configuration file and automatically mounts any permanent filesystems defined within it that are not already actively attached.

```bash
mount -o remount,rw /
```

> This dynamically updates the mount options of the actively mounted root filesystem (`/`), transitioning it from read-only mode to read-write mode without requiring unmounting and disrupting running system processes.

```bash
mount -t cifs -o username=admin,password=secret //192.168.1.100/shared /mnt/smb
```

> This explicitly specifies the Common Internet File System protocol (`-t cifs`) to connect to a Windows-compatible network share, passing authentication credentials via mount options.

```bash
mount --bind /etc/nginx/ /var/chroot/etc/nginx/
```

> This creates a bind mount, taking an existing populated directory and projecting its exact contents into a secondary location. This is heavily utilized when configuring isolated `chroot` jail environments for locked-down daemon services.

## Real-World Scenarios

**Recovering a Broken System via Live CD**

```bash
mount /dev/sda2 /mnt
mount --rbind /dev /mnt/dev
mount --rbind /proc /mnt/proc
mount --rbind /sys /mnt/sys
chroot /mnt
```

> Operations engineers repairing a broken bootloader boot from a Live USB, mount the broken root partition, recursively bind-mount (`--rbind`) the critical virtual kernel filesystems, and `chroot` into the environment to safely execute `grub-install`.

**Enforcing Strict Security Baselines on Temp Storage**

```bash
mount -o remount,noexec,nosuid,nodev /tmp
```

> Security automated hardening scripts remount the `/tmp` directory dynamically to prevent any binary file execution (`noexec`) or SetUID privilege escalation (`nosuid`), drastically neutralizing common web application payload exploits.

**Provisioning In-Memory Filesystems for High-Speed Caching**

```bash
mount -t tmpfs -o size=2G tmpfs /var/cache/app
```

> Database administrators mount a `tmpfs` (RAM disk) explicitly bounded to 2GB to serve as an ultra-low-latency cache directory, bypassing physical disk I/O entirely for ephemeral session data.

## When should it NOT be used?

- **Persistent Reboot-Survivable Configuration:** **Reason:** Commands executed via the `mount` CLI are strictly ephemeral. If the server reboots, the mount drops. **Use instead:** Add the UUID and mount parameters to `/etc/fstab` or create a `systemd.mount` unit file.
- **Mounting remote cloud object storage (S3/GCS) efficiently:** **Reason:** Standard VFS mounts require POSIX semantics which object storage lacks; utilizing FUSE drivers (like `s3fs`) incurs massive latency penalties. **Use instead:** Native AWS/GCP SDKs within the application.

## Alternatives

- **`/etc/fstab`:** The static configuration file. **Tradeoff:** Fstab guarantees persistence across system reboots and coordinates with system initialization, whereas `mount` is dynamic, manual, and ephemeral.
- **`systemd.mount`:** Native Systemd mount units. **Tradeoff:** Provides advanced dependency resolution (e.g., waiting for network interfaces before mounting NFS) and auto-mounting triggers, but requires verbose ini-style configuration files rather than quick one-line commands.

## How it works internally

When you execute `mount`, the utility parses your arguments and attempts to identify the filesystem type (if omitted) by invoking the `libblkid` library, which scans the target device's superblock for magic numbers.

Once parameters are validated, the CLI invokes the Linux kernel's `mount()` system call. The kernel's Virtual File System (VFS) layer intercepts this call. It passes the request to the specific filesystem driver module (e.g., `ext4.ko` or `nfs.ko`). The driver reads the device's metadata structures from disk and populates internal VFS RAM structures (inodes and dentry caches).

The VFS then takes the `dentry` of the root of the new filesystem and logically grafts it over the `dentry` of the target "mount point" directory on the host. Any files previously residing inside the mount point directory become inaccessible (shadowed) until the device is unmounted. Finally, the mount state is recorded by the kernel and exposed to user-space via `/proc/mounts` (which `/etc/mtab` is typically symlinked to).

## Performance Notes

- Mounting with the `noatime` option prevents the kernel from writing access timestamps to the disk metadata every single time a file is read, significantly extending the lifespan of SSDs and accelerating I/O bound workloads like databases.
- Mounting massive, heavily populated filesystems executes almost instantly because `mount` only maps the superblock and root inode structures into RAM; it does not scan or inventory the nested files upon attachment.

## Security Notes

- **Absolute Root Authority:** The `mount` system call interfaces directly with kernel memory structures and block devices. Standard unprivileged users are strictly blocked from mounting filesystems unless an administrator explicitly grants them permission for a specific mount point inside `/etc/fstab` using the `user` flag.
- **Malicious USB Devices:** Mounting untrusted filesystems formatted by attackers can exploit buffer overflows in kernel parsing drivers (like NTFS or ext4 parsers), leading to instant root-level system compromise. Always use `nosuid` and `nodev` options when mounting external media.

## Common Mistakes

- **Shadowing Data:** Mounting a partition over `/var/log` when `/var/log` already contains gigabytes of files. **Why it's wrong:** The existing files are completely hidden and inaccessible, though they still consume disk space. Mount points should generally be empty directories.
- **Using device letters instead of UUIDs:** Running `mount /dev/sdb1 /data`. **Why it's wrong:** Device letters can shift dynamically on reboot. If `sdb` becomes `sdc`, automation breaks. Always use `mount UUID=1234... /data`.
- **Forgetting to unmount before resizing:** Executing `parted` or `resize2fs` on an actively mounted partition. **Why it's wrong:** While extending is often supported live, shrinking an actively mounted filesystem will cause severe kernel panics and catastrophic data corruption.

## Best Practices

- Test `/etc/fstab` syntax immediately after editing by running `mount -a`. If it throws an error, fix it before rebooting, otherwise the system will crash into an unbootable emergency maintenance shell.
- Enforce security isolation by mounting ephemeral web application upload directories with `noexec,nosuid,nodev` to prevent attackers from executing uploaded shellcode.
- Utilize `--bind` mounts to securely expose specific internal directories to isolated chroot jail environments without replicating physical data.

## Interview Questions

- _Query:_ A junior admin modifies `/etc/fstab` to add a new NFS mount. What single command should they run to apply the changes and verify the syntax without rebooting the server?
  - _A:_ They should execute `sudo mount -a`. This command instructs the mount utility to parse `/etc/fstab` and attempt to attach all filesystems defined within it. If there is a syntax error or network failure, it will report it immediately, preventing a fatal boot-loop.
- _Query:_ What is the architectural purpose of a "bind mount" (`mount --bind`), and how does it differ from a standard filesystem mount or a symbolic link?
  - _A:_ A bind mount creates an alternate VFS path to an existing directory tree. Unlike a symbolic link (which is just a text pointer that applications can resolve or ignore), a bind mount intercepts path resolution at the kernel VFS layer. Applications chrooted into a directory cannot escape or bypass a bind mount, making it the secure method for injecting directories into locked-down daemon jails.
- _Query:_ Why do security hardening baselines mandate adding the `noexec` option when mounting shared temporary directories like `/tmp`?
  - _A:_ Directories like `/tmp` are globally writable. If a malicious actor uploads an executable payload or shell script to the server, they will drop it in `/tmp`. The `noexec` mount option instructs the kernel to strictly deny execute permissions to any binary residing on that mount point, neutralizing the payload execution vector.

## Practice Problems

- _Problem:_ Without requiring a reboot or interrupting active processes, transition the root filesystem (`/`) from a read-only state back to a writable state so you can edit a configuration file.
  - _Hint:_ Use the dynamic mount option override syntax targeted at the root directory.
  - _Solution:_ `mount -o remount,rw /` (This issues a live kernel instruction to drop the read-only lock and enable write operations immediately).
- _Problem:_ Using the `/etc/fstab` file you just updated, instruct the kernel to mount all configured and pending partitions to verify your configuration.
  - _Hint:_ Use the specific flag designed to evaluate and process the fstab file.
  - _Solution:_ `mount -a` (This parses configuration files and safely attaches all defined but unmounted volumes).

## References

- [Man Page for mount (Linux)](https://man7.org/linux/man-pages/man8/mount.8.html)
- [Kernel.org - Shared Subtrees and Bind Mounts](https://www.kernel.org/doc/Documentation/filesystems/sharedsubtree.txt)
