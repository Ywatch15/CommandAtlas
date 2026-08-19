---
slug: umask
name: umask
aliases: [user file creation mode mask]
category: permissions
tags: [linux, permissions, security, umask, default-permissions]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh, powershell]
intentPhrases:
  - 'set default file permissions'
  - 'change umask value linux'
  - 'view current umask'
  - 'configure default umask bash'
relatedCommands: [chmod, chown, chgrp]
alternatives: [chmod]
status: draft
---

## What is it?

`umask` (user file-creation mode mask) is a shell built-in utility and environment attribute that determines the default file and directory permissions assigned when new files or directories are created. It acts as a subtractive mask against initial system creation permissions.

## Why does it exist?

When applications create new files or directories, they request default base permissions—typically `666` (read/write for all) for files and `777` (read/write/execute for all) for directories. Without a central filtering mechanism, every newly created file would be globally accessible to all system users. `umask` exists to provide a system-wide or per-user security filter that automatically strips unwanted default permissions.

## Syntax

```bash
umask
umask [-S]
umask MODE
```

## Flags

| Flag   | Description                                                                               | Example      |
| ------ | ----------------------------------------------------------------------------------------- | ------------ |
| `-S`   | Displays the current umask setting in symbolic human-readable notation.                   | `umask -S`   |
| `-p`   | Outputs umask in a reusable format suitable for shell initialization scripts.             | `umask -p`   |
| `MODE` | Specifies the new octal (e.g., `0022`) or symbolic (e.g., `u=rwx,g=rx,o=rx`) umask value. | `umask 0027` |

## Examples

```bash
umask
```

> Displays the current session's octal umask value (e.g., `0022` or `0002`).

```bash
umask -S
```

> Prints the default creation permissions in symbolic format (e.g., `u=rwx,g=rx,o=rx`).

```bash
umask 0027
```

> Sets the umask to `0027`. New files will have default permissions `640` (`rw-r-----`) and new directories `750` (`rwxr-x---`).

```bash
umask 0077
```

> Sets a restrictive umask where all newly created files and directories are completely inaccessible to Group and Others (`600` for files, `700` for directories).

## Real-World Scenarios

**Hardening System Profiles**

```bash
# Inside /etc/profile or ~/.bashrc
umask 0027
```

> Administrators enforce `umask 0027` in login scripts for sensitive servers, ensuring user data is private from general system users by default.

**Collaborative Web Root Provisioning**

```bash
umask 0002
```

> Multi-user build environments set `umask 0002`, ensuring newly generated build artifacts remain writable by group members (`664` files, `775` directories).

## When should it NOT be used?

- **Modifying permissions of existing files:** Changing permissions on existing items on disk. **Reason:** `umask` only affects future file creation within the current process tree. **Use instead:** `chmod`.

## Alternatives

- **`chmod`:** Direct permission modification for existing items. **Tradeoff:** Works on files already created on disk, whereas `umask` sets environment creation defaults.

## How it works internally

When a process executes the `open(..., O_CREAT, mode)` or `mkdir(..., mode)` system call, the Linux kernel calculates final permissions using bitwise operations:

```
final_permissions = base_mode & (~umask)
```

For files, base mode is `0666`. For directories, base mode is `0777`. If umask is `0022`, file permissions become `0666 & ~0022 = 0644` (`rw-r--r--`).

## Performance Notes

- `umask` is a lightweight shell builtin and kernel process attribute with zero disk I/O overhead.

## Security Notes

- **Overly permissive umasks:** A umask of `0000` creates globally writable files (`666`) and directories (`777`), opening severe local security vulnerabilities.
- **Inheritance:** Child processes inherit the umask of their parent process.

## Common Mistakes

- **Confusing umask with chmod values:** Thinking umask `0755` grants 755 permissions. **Why it's wrong:** Umask is subtractive; setting umask `0755` strips all permissions for group/others, leaving mode `700`.
- **Expecting execute bits on files:** Expecting umask `0000` to create executable files. **Why it's wrong:** Operating systems start files at base mode `666` (no execute bits).

## Best Practices

- Use `umask 0022` for standard desktop/server environments and `0027` or `0077` for high-security environments.
- Define umask centrally in `/etc/profile` or `/etc/bash.bashrc`.

## Interview Questions

- _Query:_ If umask is set to `0022`, what are the default permissions for a newly created file and a newly created directory?
  - _A:_ A new file receives `644` (`rw-r--r--`) because file base `666` minus `022` equals `644`. A new directory receives `755` (`rwxr-xr-x`) because directory base `777` minus `022` equals `755`.
- _Query:_ How does the kernel calculate resulting permissions using umask mathematically?
  - _A:_ The kernel performs a bitwise AND between the requested mode and the bitwise NOT of the umask: `mode & (~umask)`.

## Practice Problems

- _Problem:_ Display the current umask in symbolic notation.
  - _Hint:_ Use umask with the -S flag.
  - _Solution:_ `umask -S` (Outputs symbolic mode).
- _Problem:_ Set umask so new files are read/write for owner only.
  - _Hint:_ Use octal mask 0077.
  - _Solution:_ `umask 0077` (Strips all group and others permissions).

## References

- [GNU Coreutils - umask invocation](https://www.gnu.org/software/coreutils/manual/html_node/umask-invocation.html)
- [Man Page for umask (Linux)](https://man7.org/linux/man-pages/man2/umask.2.html)
