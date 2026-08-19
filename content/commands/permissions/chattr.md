---
slug: chattr
name: chattr
aliases: [change attributes]
category: permissions
tags: [linux, file-system, security, attributes, ext4, immutability]
difficulty: intermediate
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'prevent file deletion by root'
  - 'make file immutable linux'
  - 'set append-only attribute'
  - 'lock file from modification'
  - 'change extended filesystem attributes'
relatedCommands: [lsattr, chmod, chown, setfacl]
alternatives: [chmod, setfacl]
status: draft
---

## What is it?

`chattr` (change attributes) is a low-level Linux utility used to modify advanced file attributes on extended filesystems (like ext2, ext3, ext4, and modern xfs/btrfs). It controls hardware-level filesystem behaviors—such as making a file completely immutable or strictly append-only—which operate entirely independently of the standard UNIX user/group/other (UGO) permission bits.

## Why does it exist?

Standard POSIX file permissions (`chmod`, `chown`) are bypassable by the `root` user. If a system is compromised or an administrator makes a typographical error (like `rm -rf /etc`), standard permissions offer no protection. `chattr` exists to leverage the underlying filesystem driver's advanced features, establishing absolute behavioral locks (like immutability) at the inode level. This ensures that even the `root` user or kernel-level processes cannot delete, rename, or modify a protected file until the specific filesystem attribute is explicitly revoked.

## Syntax

```bash
chattr [ -RVf ] [ -v version ] [ mode ] files...
```

## Flags

| Flag | Description                                                                                          | Example                         |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------------------- |
| `+i` | Sets the Immutable attribute. The file cannot be modified, deleted, renamed, or hard-linked.         | `chattr +i /etc/resolv.conf`    |
| `-i` | Removes the Immutable attribute, returning the file to standard modifiable state.                    | `chattr -i /etc/resolv.conf`    |
| `+a` | Sets the Append-only attribute. The file can only be opened in append mode for writing.              | `chattr +a /var/log/syslog`     |
| `-a` | Removes the Append-only attribute.                                                                   | `chattr -a /var/log/syslog`     |
| `-R` | Recursively changes attributes for directories and their contents.                                   | `chattr -R +i /secure_archive/` |
| `-V` | Verbose mode. Prints the program version and details the attribute changes as they occur.            | `chattr -V +a access.log`       |
| `-f` | Force mode. Suppresses most error messages (e.g., if the filesystem does not support the attribute). | `chattr -f +i *.txt`            |
| `+c` | Sets the Compress attribute. The filesystem transparently compresses the file on disk.               | `chattr +c massive_archive.dat` |
| `+s` | Sets the Secure Deletion attribute. When deleted, its blocks are zeroed out (filesystem dependent).  | `chattr +s private_key.pem`     |
| `+S` | Sets the Synchronous Updates attribute. All changes are written to disk immediately (like `sync`).   | `chattr +S critical_db.db`      |
| `+d` | Sets the No Dump attribute. The file is ignored when the `dump` backup utility is run.               | `chattr +d /tmp/cache`          |

## Examples

```bash
sudo chattr +i /etc/passwd
```

> This locks the critical `/etc/passwd` file with the immutable attribute. No user, not even `root`, can add new users, delete the file, or change existing passwords until the attribute is removed.

```bash
sudo chattr +a /var/log/auth.log
```

> This applies the append-only attribute to an authentication log. Applications can continually write new log entries to the end of the file, but attackers cannot delete or overwrite previous entries to cover their tracks.

```bash
sudo chattr -R -i /var/www/html/
```

> This recursively searches through a web directory and strips the immutable flag (`-i`) from all files and subdirectories, unlocking them for a massive software deployment or update.

```bash
sudo chattr +d /home/user/Downloads/
```

> This sets the "no dump" attribute on a directory. System backup tools honoring this flag will skip this directory, saving backup storage space by ignoring temporary or easily replaceable files.

```bash
sudo chattr =i secret.txt
```

> This utilizes the equals (`=`) operator instead of `+` or `-`. It forces the file's attributes to be _exactly_ and only `i` (immutable), wiping out any other extended attributes the file may have currently possessed.

## Real-World Scenarios

**Protecting Dynamic Configuration Files from Overwrites**

```bash
sudo chattr +i /etc/resolv.conf
```

> Systems administrators managing servers where DHCP or NetworkManager aggressively and erroneously overwrites DNS settings use `chattr +i` to permanently lock `/etc/resolv.conf`, forcing the OS to respect their manually configured nameservers.

**Hardening Audit Logs Against Tampering**

```bash
sudo chattr +a /var/log/secure
```

> Security engineers constructing hardened bastion hosts set critical audit logs to append-only. If the server is breached, the attacker can gain root access but remains mathematically unable to erase their command history from the log file without first unsetting the attribute, creating a detectable audit trail.

**Preventing Accidental Mount Point Deletion**

```bash
sudo chattr +i /mnt/nfs_share
```

> To prevent backup scripts from writing terabytes of data directly to the local root filesystem when an NFS mount drops, administrators make the empty underlying mount point directory immutable. If the mount fails, writes to the directory are instantly rejected by the kernel.

## When should it NOT be used?

- **Controlling multi-user access levels:** **Reason:** `chattr` affects the file at the filesystem hardware level universally. If a file is immutable, nobody can write to it. It cannot specify that User A can read while User B can write. **Use instead:** `chmod` or `setfacl`.
- **On virtual, memory, or network filesystems:** **Reason:** `chattr` utilizes `ioctl` system calls specific to local block-storage filesystems (like ext4, XFS). Running it on `tmpfs`, `sysfs`, or `NFS` mounts will throw an "Inappropriate ioctl for device" error. **Use instead:** Standard file permissions.

## Alternatives

- **`chmod`:** The POSIX standard permission tool. **Tradeoff:** `chmod` handles Read/Write/Execute bits for Users/Groups/Others, but provides zero protection against the `root` user, whereas `chattr` locks files against everyone.
- **`setfacl`:** Access Control Lists. **Tradeoff:** `setfacl` provides granular, multi-user access rules (e.g., granting 5 specific users write access), but lacks hardware-level behavioral flags like append-only or secure deletion.

## How it works internally

`chattr` bypasses the standard Linux Virtual File System (VFS) permissions layer entirely.

When you execute `chattr +i file`, the utility opens a file descriptor and issues a specific `ioctl()` (Input/Output Control) system call—typically `FS_IOC_SETFLAGS` or `EXT4_IOC_SETFLAGS`—directly to the underlying filesystem driver (e.g., the ext4 kernel module).

The filesystem driver intercepts this request and modifies a hidden 32-bit integer bitmask stored directly inside the file's physical `inode` on the disk platter. When any process (including a root-owned process) attempts to invoke the `unlink()`, `write()`, or `rename()` system calls on that file, the kernel's VFS layer queries the filesystem driver. The driver checks the inode flags, detects the `EXT4_IMMUTABLE_FL` bit, and intercepts the operation, instantly returning an `EPERM` (Operation not permitted) error before the data modification can even begin.

## Performance Notes

- Executing `chattr` is virtually instantaneous because it alters a single 32-bit metadata flag inside the file's pre-existing inode; it does not read or move any actual file data blocks.
- Applying `chattr -R` to directories containing millions of files incurs heavy I/O latency, as the utility must traverse the directory tree and issue an `ioctl()` system call for every single inode encountered.

## Security Notes

- **Root Exclusivity:** Modifying critical attributes like `+i` (immutable) or `+a` (append-only) requires the `CAP_LINUX_IMMUTABLE` kernel capability, meaning it can only be executed by `root`. Standard users cannot make their own files immutable to evade disk quotas.
- **Rootkit Defense & Evasion:** `chattr` is a double-edged sword. Security engineers use it to lock down core binaries (`/bin/ls`). Conversely, attackers deploying rootkits frequently use `chattr +i` on their malicious payloads to prevent antivirus software or administrators from deleting the malware.

## Common Mistakes

- **Trying to use `rm -f` on an immutable file:** Running `sudo rm -f secret.txt` and receiving "Operation not permitted." **Why it's wrong:** The `-f` force flag in `rm` only overrides standard POSIX permissions and prompts. It cannot bypass an inode-level immutable lock. You must run `chattr -i secret.txt` first.
- **Applying `+i` to a directory and expecting files inside to be frozen:** **Why it's wrong:** Making a directory immutable prevents creating, deleting, or renaming files _within_ that directory. However, it does _not_ stop users from modifying the contents of already existing files inside it. The files themselves must be made immutable.
- **Expecting `+s` (secure deletion) to work universally:** **Why it's wrong:** Modern journaling filesystems (like ext4) and flash storage (SSDs with wear-leveling) often ignore the secure deletion (`s`) flag entirely because physical block overwriting disrupts journal consistency and flash translation layers.

## Best Practices

- Lock critical, static boot configurations (like `/etc/fstab` or `/boot/grub/grub.cfg`) with `+i` on hardened production servers to prevent rogue orchestration scripts from accidentally rendering the server unbootable.
- When troubleshooting an inexplicable "Permission denied" error as the `root` user, immediately run `lsattr` on the target file to check for hidden immutability flags before assuming the disk is corrupted.
- Use the append-only (`+a`) attribute on centralized syslog ingestion files so that even if the logging daemon is compromised, historical forensic logs remain undeletable.

## Interview Questions

- **Q:** You are logged in as the `root` user. You attempt to delete a file using `rm -rf /var/www/index.html`, but you receive an "Operation not permitted" error. The filesystem is mounted read-write. What is the cause, and how do you delete the file?
  - **A:** The file has been locked at the filesystem inode level using the immutable attribute. Standard POSIX permissions and root privileges cannot override this hardware-level flag. To delete the file, you must first remove the attribute by executing `chattr -i /var/www/index.html`, after which the `rm` command will succeed.
- **Q:** What is the technical distinction between applying `chattr +i` (immutable) versus `chattr +a` (append-only) to a log file?
  - **A:** The `+i` (immutable) flag freezes the file completely; no process can write to it, delete it, or rename it, making it useless for active logging. The `+a` (append-only) flag prevents deletion, renaming, or overwriting of existing data, but explicitly allows processes to open the file in append mode (`>>`) to write new data to the end of the file.
- **Q:** Why does `chattr` work on ext4 filesystems but fail completely when attempted on a `/tmp` directory (tmpfs) or a Windows-formatted USB drive (FAT32)?
  - **A:** `chattr` modifies advanced extended attributes stored directly inside specific Linux filesystem inodes. `tmpfs` is a virtual RAM filesystem, and FAT32 is a legacy Windows filesystem; neither possesses the architectural inode structures or drivers required to understand or store Linux-specific `ioctl` extended attribute bitmasks.

## Practice Problems

- _Problem:_ An attacker might try to alter the `/etc/shadow` file. Apply an attribute to this file that guarantees no user, including root, can modify, rename, or delete it under any circumstances.
  - _Hint:_ Use the flag that establishes absolute file immutability.
  - _Solution:_ `sudo chattr +i /etc/shadow` (This locks the inode entirely).
- _Problem:_ Secure the `/var/log/auth.log` file so that the logging daemon can continue to add new lines to it, but past logs can never be altered or deleted.
  - _Hint:_ Use the flag that restricts write access strictly to append operations.
  - _Solution:_ `sudo chattr +a /var/log/auth.log` (This allows EOF writing but prevents destructive operations).

## References

- [Man Page for chattr (Linux)](https://man7.org/linux/man-pages/man1/chattr.1.html)
- [Arch Linux Wiki - File permissions and attributes](https://wiki.archlinux.org/title/File_permissions_and_attributes)
