---
slug: sticky-bit
name: sticky-bit
aliases: [sticky bit]
category: permissions
tags: [linux, permissions, security, chmod, sticky-bit, tmp]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'set sticky bit on directory'
  - 'chmod +t command'
  - 'prevent users from deleting others files'
  - 'enable sticky bit linux'
relatedCommands: [chmod, setuid, setgid]
alternatives: [setfacl]
status: draft
---

## What is it?

The Sticky Bit is a special Linux filesystem permission bit applied primarily to directories. When the Sticky Bit is enabled on a directory, files within that directory can only be deleted or renamed by the file's owner, the directory's owner, or the `root` superuser—even if other users have write permissions to the directory.

## Why does it exist?

System directories like `/tmp` and `/var/tmp` require universal write permissions (`777`) so any user or service daemon can store temporary data. However, standard POSIX rules allow anyone with write access to a directory to delete any file inside it regardless of file ownership. The Sticky Bit exists to resolve this security hole, preventing unprivileged users from deleting or tampering with each other's temporary files.

## Syntax

```bash
chmod +t DIRECTORY
chmod 1777 DIRECTORY
chmod -t DIRECTORY
```

## Flags

| Bit / Mode   | Value / Representation | Description                                                            | Example              |
| ------------ | ---------------------- | ---------------------------------------------------------------------- | -------------------- |
| `+t` / `o+t` | Symbolic               | Sets the Sticky Bit on the target directory.                           | `chmod +t /var/tmp`  |
| `-t`         | Symbolic               | Removes the Sticky Bit from the directory.                             | `chmod -t /var/tmp`  |
| `1777`       | Octal (`1000`)         | Sets Sticky Bit (`1`) with universal read/write/execute (`rwxrwxrwt`). | `chmod 1777 /tmp`    |
| `1770`       | Octal (`1000`)         | Sets Sticky Bit (`1`) for restricted group directories (`rwxrwt---`).  | `chmod 1770 /shared` |

## Examples

```bash
chmod +t /shared_dropzone/
```

> Enables the Sticky Bit on `/shared_dropzone/`. Users can upload files, but cannot delete or rename files uploaded by colleagues.

```bash
chmod 1777 /tmp/app_scratch/
```

> Sets Sticky Bit (`1`) with full read, write, and execute permissions (`777`) for owner, group, and others.

```bash
chmod -t /shared_dropzone/
```

> Removes the Sticky Bit from `/shared_dropzone/`, restoring standard POSIX directory deletion rules.

## Real-World Scenarios

**Securing System Temporary Storage**

```bash
ls -ld /tmp
# drwxrwxrwt 10 root root 4096 Aug 19 12:00 /tmp
```

> Operating systems configure `/tmp` with mode `1777` (`drwxrwxrwt`). The trailing `t` confirms the Sticky Bit is active, preventing malicious local users from deleting application socket files or temporary database locks owned by other services.

**Public Submission Repositories**

```bash
mkdir /var/submissions
chgrp students /var/submissions
chmod 1770 /var/submissions
```

> Instructors configure a drop directory where all students in group `students` can submit assignment files without being able to view or overwrite classmates' submissions.

## When should it NOT be used?

- **Regular user directories:** Personal home directories or single-user folders. **Reason:** Unnecessary when directories are not globally or group writable. **Use instead:** Standard `chmod 700` or `755`.
- **Individual files:** Applying `+t` to regular files. **Reason:** On modern Linux, the Sticky Bit on regular files is ignored by the kernel. **Use instead:** Immutable attributes with `chattr +i`.

## Alternatives

- **`setfacl`:** Access Control Lists. **Tradeoff:** Can restrict deletion per-user or per-group with finer granularity, but requires ACL filesystem support.

## How it works internally

In the inode structure, the Sticky Bit is represented by the `1000` octal bit in the mode bitmask.

When a user attempts to unlink (delete) or rename a file using system calls like `unlinkat()` or `renameat()`, the Linux VFS kernel checks the parent directory's mode. If the `1000` bit is set, the kernel verifies whether the calling process's `FSUID` matches the file's owner UID, the parent directory's owner UID, or possesses `CAP_FOWNER` (root). If none match, deletion is rejected with `EPERM` ("Operation not permitted").

## Performance Notes

- Deletion checks involving the Sticky Bit execute purely in memory within the VFS layer with zero disk performance impact.

## Security Notes

- **Symlink Restrictions:** Modern Linux kernels enable `fs.protected_symlinks` and `fs.protected_hardlinks` sysctls by default, strengthening Sticky Bit directories against symlink attacks.
- **Capital 'T' Warning:** In `ls -l` output, a capital `T` (`rwxrwxr-T`) indicates the Sticky Bit is set, but the others execute bit (`x`) is NOT set.

## Common Mistakes

- **Applying Sticky Bit to regular files:** Executing `chmod +t file.txt`. **Why it's wrong:** Modern Linux ignores the Sticky Bit on regular files (historically it was used to keep swap binaries in memory).
- **Expecting Sticky Bit to prevent file edits:** Assuming users cannot modify file content. **Why it's wrong:** Sticky Bit only prevents file deletion/renaming; content modifications depend on file write permissions (`w`).

## Best Practices

- Always set the Sticky Bit on world-writable directories (`777`).
- Audit Sticky Bit directories using `find / -perm -1000 -type d`.

## Interview Questions

**Q:** What security problem does the Sticky Bit solve on `/tmp`?
**A:** Without the Sticky Bit, any user with write access to `/tmp` could delete or rename any other user's files. The Sticky Bit ensures that only the file owner, directory owner, or root can delete files inside `/tmp`.
**Q:** What is the difference between `t` and `T` in `ls -l` output?
**A:** Lowercase `t` means the Sticky Bit is set AND the others execute bit (`x`) is set. Uppercase `T` means the Sticky Bit is set BUT the others execute bit is NOT set.

## Practice Problems

**Problem:** Enable the Sticky Bit on `/srv/drop`.
**Hint:** Use chmod +t.
**Solution:** `chmod +t /srv/drop` (Adds sticky bit).
**Problem:** Set permissions `1777` on `/var/shared_tmp`.
**Hint:** Use octal mode 1777 with chmod.
**Solution:** `chmod 1777 /var/shared_tmp` (Applies sticky bit with universal read/write/execute).

## References

- [GNU Coreutils - Directory Setuid and Setgid](https://www.gnu.org/software/coreutils/manual/html_node/Directory-Setuid-and-Setgid.html)
- [Man Page for chmod (Linux)](https://man7.org/linux/man-pages/man1/chmod.1.html)
