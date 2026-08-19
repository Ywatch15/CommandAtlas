---
slug: lsattr
name: lsattr
aliases: [list attributes]
category: permissions
tags: [linux, file-system, security, attributes, ext4, audit]
difficulty: intermediate
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'list extended file attributes linux'
  - 'check if file is immutable'
  - 'view ext4 filesystem flags'
  - 'audit append-only files'
  - 'find locked files linux'
relatedCommands: [chattr, ls, getfacl]
alternatives: [ls]
status: draft
---

## What is it?

`lsattr` (list attributes) is a diagnostic command-line utility used to display extended file attributes on Linux filesystems (primarily ext2, ext3, ext4, and modern derivatives). It exposes hidden, hardware-level filesystem locks—such as immutability, append-only modes, and synchronous update flags—that dictate kernel-level file manipulation behavior.

## Why does it exist?

Standard UNIX permission tools (`ls -l`) strictly display Read, Write, Execute, and ownership boundaries. However, robust Linux filesystems embed a secondary layer of behavioral logic deep within the file's physical `inode` to protect critical system configurations from root-level alteration. Because these flags bypass standard permission matrices entirely, a dedicated tool was required to extract and format this embedded `ioctl` telemetry. `lsattr` exists to reveal these invisible constraints, preventing administrators from spending hours debugging inexplicable "Operation not permitted" errors.

## Syntax

```bash
lsattr [ -RVadv ] [ -l ] [ files... ]
```

## Flags

| Flag / Attribute    | Description                                                                                         | Example                     |
| ------------------- | --------------------------------------------------------------------------------------------------- | --------------------------- |
| `-R`                | Recursively traverses directories, listing extended attributes for all nested files.                | `lsattr -R /etc/`           |
| `-V`                | Verbose mode. Prints the `lsattr` program version along with the output.                            | `lsattr -V secret.key`      |
| `-a`                | Displays attributes for all files, explicitly including hidden dotfiles (`.`).                      | `lsattr -a ~/`              |
| `-d`                | Lists the attributes of directories themselves, rather than descending into their contents.         | `lsattr -d /tmp/`           |
| `-v`                | Lists the file's version/generation number (internal filesystem tracking metric).                   | `lsattr -v config.json`     |
| `-l`                | (Long format) Expands the single-character attributes into full, human-readable words.              | `lsattr -l /var/log/syslog` |
| `i` (Immutable)     | Output flag: The file cannot be modified, deleted, renamed, or linked by any user (including root). | `----i---------e----`       |
| `a` (Append-only)   | Output flag: The file can only be opened in append mode (writing new data to the end).              | `-----a--------e----`       |
| `e` (Extents)       | Output flag: The file utilizes modern ext4 "extents" for mapping blocks on disk.                    | `--------------e----`       |
| `s` (Secure Delete) | Output flag: The file is flagged to have its physical data blocks zeroed out upon deletion.         | `s-------------e----`       |

## Examples

```bash
lsattr /etc/resolv.conf
```

> This queries the target file and returns a string of characters (e.g., `----i---------e----`). The presence of the `i` reveals that the file is locked with the immutable attribute, explaining why editing the DNS configuration fails even with `sudo`.

```bash
lsattr -d /var/log/secure
```

> This evaluates the target as a directory object rather than its contents (`-d`). It outputs the attributes applied directly to the folder's inode, identifying if the directory itself is protected against structural tampering.

```bash
lsattr -R -a /boot/
```

> This initiates a deep, recursive scan (`-R`) across the critical boot partition, explicitly exposing attributes on heavily restricted hidden configuration files (`-a`) to audit against malicious rootkit interference.

```bash
lsattr -l /var/log/syslog
```

> This translates the cryptic character mask into a plain-English, comma-separated list (`-l`). Instead of interpreting `-----a--------e----`, the administrator instantly reads `Append_Only, Extents`.

```bash
lsattr -v target.bin
```

> This dumps the extended attribute mask alongside the file's raw internal generation version number (`-v`). This metric is used primarily by NFS (Network File System) daemons to track file state consistency across remote procedure calls.

## Real-World Scenarios

**Incident Response and Rootkit Detection**

```bash
lsattr -R /bin /sbin /usr/bin | grep "\-i\-"
```

> Security operations engineers rapidly scan absolute core system binary directories, piping the output through `grep` to isolate any executable files carrying the `i` (immutable) attribute. Attackers aggressively utilize immutability to lock their dropped rootkits and backdoors onto compromised servers, making this a high-fidelity Indicator of Compromise (IoC).

**Debugging Mystifying "Operation not permitted" Errors**

```bash
sudo rm -f database.db
# Error: Operation not permitted
lsattr database.db
```

> When a root user inexplicably fails to remove a file with forced flags, they immediately abandon `ls -l` and execute `lsattr`. The command instantly proves whether the file is artificially frozen at the VFS inode layer, guiding them to execute `chattr -i` as the remediation step.

**Auditing Mandatory Append-Only Compliance Logs**

```bash
lsattr /var/log/audit/audit.log
```

> Compliance auditors tracking strict financial regulations (like PCI-DSS) utilize `lsattr` to mathematically prove that centralized intrusion and authentication logs are strictly locked with the `a` (append-only) attribute, verifying that hackers cannot erase their tracks to hide breaches.

## When should it NOT be used?

- **Checking standard read/write user access:** **Reason:** `lsattr` reveals structural hardware-level flags, not the POSIX authorization matrix. It cannot tell you if the `www-data` user has read access. **Use instead:** `ls -l` or `getfacl`.
- **On memory-based or foreign network filesystems:** **Reason:** Extended attributes are highly specific to localized Linux block-storage paradigms (ext4, XFS). Running `lsattr` against a mounted CIFS/SMB share, NFS share, or `tmpfs` RAM disk will return "Inappropriate ioctl for device".

## Alternatives

- **`stat`:** Inode telemetry display. **Tradeoff:** `stat` dumps a comprehensive diagnostic block showing raw block sizes, byte counts, and exact modification micro-timestamps. While occasionally revealing similar extended properties depending on the filesystem, it lacks the concise, grepable bitmask format of `lsattr`.
- **`ls -l`:** Standard listing. **Tradeoff:** Universally supported and fast, but completely blind to the `ioctl` attributes extracted by `lsattr`.

## How it works internally

The standard `ls` command relies heavily on the `stat()` system call to retrieve metadata from a file's inode. However, the `stat` struct does not contain fields for advanced filesystem attributes.

When you execute `lsattr`, the utility opens a file descriptor to the target file and issues an `ioctl()` (Input/Output Control) system call directly to the Linux kernel—specifically `FS_IOC_GETFLAGS` or `EXT4_IOC_GETFLAGS`.

The underlying filesystem driver (such as the ext4 kernel module) intercepts this request. It reads the raw physical inode from the spinning disk or SSD, extracts a highly specialized 32-bit integer bitmask (where each bit represents a flag, e.g., `0x00000010` for immutable), and returns this integer to user-space. `lsattr` interprets this bitmask, translates the active bits into their corresponding human-readable ASCII characters (`i`, `a`, `e`), and aligns them into a 16-character fixed-width string for terminal rendering.

## Performance Notes

- Executing `lsattr` on individual files executes in single-digit microseconds; the `ioctl` call interacts with heavily cached kernel inode mappings.
- Executing a recursive scan (`lsattr -R /`) on a spinning Hard Disk Drive (HDD) induces catastrophic disk thrashing. The utility forces the disk read head to physically seek and query the extended `ioctl` metadata for every single file on the partition, taking hours to complete.

## Security Notes

- **Unprivileged Visibility:** While altering extended attributes requires absolute root privileges via `chattr`, merely _reading_ these attributes using `lsattr` is unprivileged. Any user with directory execution/traversal rights can audit the defensive posture of system files.
- **The 'e' (Extents) Illusion:** A common security trap is assuming the ubiquitously present `e` attribute provides security. It does not. The `e` flag merely indicates the file is mapped on the disk using modern ext4 physical block extents rather than legacy indirect block mapping. It has no bearing on authorization or immutability.

## Common Mistakes

- **Mistaking the output for standard permissions:** Reading `----i---------e----` and assuming the dashes represent missing Read/Write bits. **Why it's wrong:** The dashes in `lsattr` output represent inactive extended attributes, not POSIX permissions. A file showing only dashes (`-------------------`) is perfectly normal and simply means no special locks are applied.
- **Forgetting `-d` on directories:** Running `lsattr /var/www` to see if the folder is locked. **Why it's wrong:** Without `-d`, `lsattr` enters the folder and lists the attributes of the HTML files inside. You must use `lsattr -d /var/www` to query the metadata of the directory inode itself.
- **Assuming a blank output means no protection:** Running `lsattr` on an XFS filesystem and seeing strange behavior. **Why it's wrong:** While modern `lsattr` implementations support XFS (via `FS_IOC_GETFLAGS`), advanced XFS-specific attributes require the `xfs_io` administrative utility for accurate auditing.

## Best Practices

- Integrate `lsattr -l` into automated compliance scraping scripts. The verbose long-format string output (e.g., `Immutable, Extents`) is far more resilient to parsing errors than extracting a single `i` character from a 16-byte fixed-width string.
- When a critical deployment script relies on overwriting configuration files, proactively place `lsattr` checks directly preceding the write attempt. It enables the script to fail gracefully with an actionable "File Immutable" log rather than crashing violently on a generic bash permission error.

## Interview Questions

- _Query:_ An operations engineer attempts to execute `rm -rf /etc/custom_config.conf` as the `root` user, but the kernel rejects the operation with "Operation not permitted". What command should they immediately execute, and what exact character are they looking for in the output?
  - _A:_ They should immediately execute `lsattr /etc/custom_config.conf`. They are looking for the letter `i` in the resulting attribute bitmask string (e.g., `----i---------e----`). This indicates the file has the hardware-level `immutable` attribute applied, which supersedes root user permissions and mathematically blocks the `unlink()` deletion system call.
- _Query:_ What is the functional and architectural difference between the information exposed by `ls -l` versus `lsattr`?
  - _A:_ `ls -l` interacts with the standard POSIX matrix; it reveals the Read, Write, and Execute authorization bits tied to Users, Groups, and Others. `lsattr` utilizes the `ioctl` system call to expose extended, hardware-level filesystem attributes embedded inside the inode—such as immutability (`i`) and append-only (`a`) modes—which dictate raw file mutability regardless of human user identity.
- _Query:_ Why does almost every file on a modern Ubuntu or Red Hat system default to displaying the `e` character when `lsattr` is executed?
  - _A:_ The `e` character indicates that the file utilizes "extents". Extents are a high-performance block mapping architecture introduced in the ext4 filesystem, replacing legacy ext3 indirect block mapping. It simply describes how the physical data payload is geometrically mapped across the disk platter, it does not indicate any special security or access control modifications.

## Practice Problems

- _Problem:_ Generate a deeply detailed, recursive attribute map of the `/etc/` directory, translating all the cryptic attribute letters into human-readable words for a compliance report.
  - _Hint:_ Combine the recursive flag with the long-format translation flag.
  - _Solution:_ `lsattr -R -l /etc/` (This descends the entire configuration tree, outputting clear, actionable text like `Immutable` or `Append_Only`).
- _Problem:_ Verify if the directory `/mnt/secure_archive/` is protected by immutability, ensuring the command outputs the attributes of the directory itself and does not dive into the massive repository of files inside it.
  - _Hint:_ Use the directory isolation flag to prevent internal traversal.
  - _Solution:_ `lsattr -d /mnt/secure_archive/` (The `-d` flag restricts the `ioctl` query exclusively to the parent directory's inode).

## References

- [Man Page for lsattr (Linux)](https://man7.org/linux/man-pages/man1/lsattr.1.html)
- [Arch Linux Wiki - File permissions and attributes](https://wiki.archlinux.org/title/File_permissions_and_attributes)
