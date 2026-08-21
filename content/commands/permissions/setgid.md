---
slug: setgid
name: setgid
aliases: [set group id bit]
category: permissions
tags: [linux, permissions, security, chmod, setgid, permissions-bit]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'set group id bit on executable'
  - 'inherit group ownership on directory'
  - 'chmod g+s command'
  - 'enable setgid bit linux'
relatedCommands: [chmod, setuid, sticky-bit, chgrp]
alternatives: [setfacl]
status: draft
---

## What is it?

SetGID (Set Group ID) is a special Linux file permission bit that alters process execution or directory inheritance behavior. When applied to an executable file, processes spawned from it run with the group privileges of the file's group owner rather than the executing user's primary group. When applied to a directory, newly created subfiles and subdirectories automatically inherit the directory's group ownership.

## Why does it exist?

In collaborative Linux environments, multiple users in a shared group often need to edit files in a common workspace. Without SetGID, files created by User A inherit User A's primary group, blocking User B from modifying them. SetGID exists to solve group collaboration by enforcing automatic group ownership inheritance on directories, and allowing controlled group-elevated binary execution.

## Syntax

```bash
chmod g+s DIRECTORY_OR_FILE
chmod 2755 DIRECTORY_OR_FILE
chmod g-s DIRECTORY_OR_FILE
```

## Flags

| Bit / Mode | Value / Representation | Description                                                        | Example                      |
| ---------- | ---------------------- | ------------------------------------------------------------------ | ---------------------------- |
| `g+s`      | Symbolic               | Sets the SetGID bit on the specified file or directory.            | `chmod g+s /shared/docs`     |
| `g-s`      | Symbolic               | Removes the SetGID bit from the target file or directory.          | `chmod g-s /shared/docs`     |
| `2755`     | Octal (`2000`)         | Applies SetGID (`2`) combined with `rwxr-xr-x` permissions.        | `chmod 2755 /shared/bin`     |
| `2770`     | Octal (`2000`)         | Applies SetGID (`2`) for closed group collaboration (`rwxrws---`). | `chmod 2770 /shared/project` |

## Examples

```bash
chmod g+s /srv/shared_folder/
```

> Sets the SetGID bit on `/srv/shared_folder/`. Any user creating a file inside this folder will produce a file owned by the folder's group owner.

```bash
chmod 2770 /opt/finance_data/
```

> Applies SetGID (`2`) with full read/write/execute for Owner and Group (`770`) while blocking all access for Others (`0`).

```bash
chmod g-s /srv/shared_folder/
```

> Disables the SetGID bit on `/srv/shared_folder/`, reverting directory inheritance to default Linux primary group assignment.

## Real-World Scenarios

**Shared Team Workspace Directory**

```bash
chgrp devteam /projects/app
chmod 2775 /projects/app
```

> System administrators establish a shared development directory for the `devteam` group. SetGID guarantees that regardless of which developer creates a file, the group ownership remains `devteam`, allowing seamless team editing.

**Controlled Group Binary Execution**

```bash
chgrp wall-writers /usr/bin/wall
chmod 2555 /usr/bin/wall
```

> System utilities (like `wall` or `write`) use SetGID to write to terminal TTY devices owned by the `tty` or `wall-writers` group without requiring full root privileges.

## When should it NOT be used?

- **Standard user-isolated files:** Files that do not require group collaboration. **Reason:** Unnecessary SetGID bits introduce potential security risks. **Use instead:** Standard `chmod 644` or `755`.
- **Complex multi-group rules:** Scenarios requiring multiple groups to have different access levels. **Reason:** SetGID only inherits one group ID. **Use instead:** Access Control Lists with `setfacl`.

## Alternatives

- **`setfacl`:** Default ACL group inheritance. **Tradeoff:** Allows multiple group default rules on a directory, whereas SetGID only enforces the single group owner of the directory.

## How it works internally

In the inode structure on disk, SetGID corresponds to the `2000` octal bit in the special permission mask.

When a binary with SetGID executes, the kernel sets the effective group ID (`EGID`) of the process to the group ID of the file. When a file is created inside a directory with the SetGID bit set, the VFS kernel layer overrides the default behavior (which assigns the process's current `EGID`) and instead copies the parent directory's `st_gid` into the new file's inode.

## Performance Notes

- SetGID bit checks are performed directly inside the VFS kernel layer during file creation and binary execution with zero measurable performance penalty.

## Security Notes

- **SetGID Binaries:** Executable binaries with SetGID run with elevated group rights. Vulnerabilities in SetGID binaries can lead to privilege escalation within that group context.
- **Symbolic Listings:** In `ls -l` output, SetGID appears as an `s` in the group execute field (`rwxr-sr-x`). If the group execute bit is NOT set, it displays as a capital `S` (`rw-r-Sr--`), signaling an ineffective configuration.

## Common Mistakes

- **Missing Group Execute Bit:** Setting `chmod 2644 file`. **Why it's wrong:** Without the group execute bit (`x`), SetGID is inactive and shows as capital `S`.
- **Assuming SetGID transfers user ownership:** Expecting file owner (`UID`) to change on creation. **Why it's wrong:** SetGID only inherits group ownership (`GID`); user ownership remains the file creator's UID.

## Best Practices

- Combine SetGID directories with umask settings or group write permissions (`g+w`) to ensure collaborators can edit inherited files.
- Regularly audit SetGID binaries on system drives using `find / -perm -2000 -type f`.

## Interview Questions

**Q:** What is the functional difference between SetGID on a file versus a directory?
**A:** On an executable file, SetGID runs the process with the group privileges of the file's group owner. On a directory, SetGID causes all new files and subdirectories created inside it to automatically inherit the group ownership of the directory.
**Q:** What does a capital `S` in the group execute position of `ls -l` indicate?
**A:** A capital `S` indicates that the SetGID bit is set, but the underlying group execute bit (`x`) is NOT set, rendering the execution bit invalid or ineffective.

## Practice Problems

**Problem:** Enable SetGID on `/data/docs` so all new files inherit the group owner `docs_group`.
**Hint:** Use chmod with group symbolic mode.
**Solution:** `chmod g+s /data/docs` (Sets group inheritance bit).
**Problem:** Set octal mode `2770` on `/var/shared`.
**Hint:** Pass 2770 as the mode to chmod.
**Solution:** `chmod 2770 /var/shared` (Applies SetGID with owner/group full access).

## References

- [GNU Coreutils - Special Permissions](https://www.gnu.org/software/coreutils/manual/html_node/Directory-Setuid-and-Setgid.html)
- [Man Page for chmod (Linux)](https://man7.org/linux/man-pages/man1/chmod.1.html)
