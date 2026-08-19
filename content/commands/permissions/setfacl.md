---
slug: setfacl
name: setfacl
aliases: [set access control list]
category: permissions
tags: [linux, permissions, security, acl, setfacl]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'set access control list linux'
  - 'grant user permission to specific file'
  - 'modify acl permissions setfacl'
  - 'add default directory acl'
relatedCommands: [getfacl, chmod, chown, chgrp, chattr]
alternatives: [chmod, chattr, chgrp, setgid, sticky-bit]
status: draft
---

## What is it?

`setfacl` (set file access control lists) is a Linux command-line utility used to define fine-grained access rights for files and directories beyond the traditional POSIX owner/group/other permission bits. It allows administrators to grant specific users or groups custom read, write, and execute permissions.

## Why does it exist?

Standard POSIX file permissions only permit one owner user and one owner group per file. When complex enterprise collaboration requires granting user Alice write access, user Bob read-only access, and group Finance execution rights on a single directory without changing file ownership, standard `chmod` is insufficient. `setfacl` exists to break this limitation by providing arbitrary, granular Access Control Lists (ACLs).

## Syntax

```bash
setfacl [OPTIONS] -m ACL_SPEC FILE...
setfacl [OPTIONS] -x ACL_SPEC FILE...
setfacl [OPTIONS] -b FILE...
```

## Flags

| Flag                 | Description                                                                                | Example                           |
| -------------------- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| `-m`, `--modify`     | Modifies existing ACL entries or adds new entries to the target file or directory.         | `setfacl -m u:alice:rwx file.txt` |
| `-x`, `--remove`     | Removes specified ACL entries from the file or directory.                                  | `setfacl -x u:bob file.txt`       |
| `-b`, `--remove-all` | Removes all extended ACL entries, restoring standard POSIX permission evaluation.          | `setfacl -b file.txt`             |
| `-R`, `--recursive`  | Applies ACL operations recursively to all subdirectories and files.                        | `setfacl -R -m g:devs:rwx /app`   |
| `-d`, `--default`    | Sets default ACL entries on a directory that automatically inherit to newly created items. | `setfacl -d -m u:alice:rwx /dir`  |

## Examples

```bash
setfacl -m u:developer:rw- project_notes.md
```

> Grants the user `developer` explicit read and write permissions on `project_notes.md` without changing the file's primary owner or group assignment.

```bash
setfacl -m g:auditors:r-x /var/log/audit/
```

> Grants all members of the `auditors` group read and execute (directory access) permissions across the target directory.

```bash
setfacl -d -m g:team:rwx /opt/shared_workspace/
```

> Sets a default ACL on `/opt/shared_workspace/`. Any file or directory subsequently created within this directory automatically inherits `rwx` rights for the `team` group.

```bash
setfacl -b /var/www/html/index.html
```

> Removes all extended Access Control List rules from `index.html`, falling back purely to standard POSIX `chmod` permission bits.

## Real-World Scenarios

**Multi-Department File Sharing**

```bash
setfacl -m u:auditor:r /finance/reports/
setfacl -m g:accounting:rw /finance/reports/
```

> Systems engineers configure enterprise storage nodes to grant external compliance auditors read access while accounting teams maintain full read/write capabilities without altering overall filesystem ownership.

**Inherited Project Permissions**

```bash
setfacl -m g:ci_cd:rwx /deploy/staging
setfacl -d -m g:ci_cd:rwx /deploy/staging
```

> Setting both active and default ACLs ensures automated deployment scripts and human engineers retain uninterrupted write and execute access across all sub-folders created during build pipelines.

## When should it NOT be used?

- **Basic file permission changes:** Granting standard owner or group access. **Reason:** Standard POSIX permissions using `chmod` are simpler to audit and operate faster. **Use instead:** `chmod`.
- **Filesystems lacking ACL support:** Systems running without `acl` mount options on legacy storage. **Reason:** Execution fails if the filesystem driver does not support extended attributes. **Use instead:** Group management with `chgrp` and `chmod`.

## Alternatives

- **`chmod`:** Standard POSIX mode modification. **Tradeoff:** Simpler and universally supported across all Unix systems, but restricted to single-user/single-group boundaries.

## How it works internally

`setfacl` interacts with extended filesystem attributes (xattrs) stored in the disk's inode metadata blocks. When `setfacl` is invoked, it makes a `setxattr()` system call using the `system.posix_acl_access` or `system.posix_acl_default` attribute namespace.

During access evaluation, the Linux Virtual File System (VFS) kernel layer first checks if the calling process matches the file owner. If not, it checks extended ACL entries for matching User IDs (UIDs) or Group IDs (GIDs). If an ACL entry matches, permission is evaluated against the ACL entry masked by the ACL mask entry (`mask::`).

## Performance Notes

- Reading and writing files with extended ACLs incurs a minor kernel lookup overhead due to reading extended attributes from disk or filesystem inodes.
- Recursively applying `setfacl -R` across millions of small files can saturate disk I/O; batching changes or configuring default ACLs before populating data is recommended.

## Security Notes

- Extended ACLs are indicated by a trailing `+` character in standard `ls -l` output (e.g., `-rw-r--r--+`). Administrators unaware of ACLs may overlook hidden access grants.
- Backup utilities must explicitly support extended attributes (such as `tar --acls` or `rsync -A`) to preserve ACL rules during data migration.

## Common Mistakes

- **Forgetting the default flag on directories:** Setting ACLs on a directory with `-m` only without `-d`. **Why it's wrong:** New files created inside the directory will not inherit the ACL rules.
- **Ignoring the ACL mask:** Manually running `chmod` on a file with ACLs. **Why it's wrong:** `chmod` modifies the ACL mask entry, potentially restricting or revoking configured ACL permissions.

## Best Practices

- Always combine directory ACL assignments with default ACLs (`-d`) to ensure predictable permissions for future files.
- Document ACL policies in system administration runbooks, as extended attributes are not visible in basic listing commands.

## Interview Questions

- _Query:_ What is the difference between an active ACL and a default ACL in Linux?
  - _A:_ Active ACLs control access to an existing file or directory immediately. Default ACLs apply only to directories and define the initial ACL permissions automatically inherited by newly created files and subdirectories inside that directory.
- _Query:_ How do you identify if a file has an Access Control List applied?
  - _A:_ Running `ls -l` reveals a `+` sign at the end of the 9-character POSIX permission string (e.g., `-rw-r--r--+`). To view the detailed rules, use `getfacl <filename>`.

## Practice Problems

- _Problem:_ Grant user `sec_analyst` read-only access to `/var/log/syslog` without altering file ownership.
  - _Hint:_ Use the modify flag with user specifier.
  - _Solution:_ `sudo setfacl -m u:sec_analyst:r /var/log/syslog` (Grants explicit read access).
- _Problem:_ Remove all extended ACLs from `/tmp/scratch.txt`.
  - _Hint:_ Use the remove-all flag.
  - _Solution:_ `setfacl -b /tmp/scratch.txt` (Clears extended ACL entries).

## References

- [POSIX Access Control Lists on Linux](https://man7.org/linux/man-pages/man1/setfacl.1.html)
- [Arch Linux Wiki - Access Control Lists](https://wiki.archlinux.org/title/Access_Control_Lists)
