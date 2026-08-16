---
slug: chmod
name: chmod
aliases: []
category: permissions
tags:
  - chmod
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - change file permissions
  - make file executable
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---
## What is it?

`chmod` (change mode) modifies read, write, and execute permissions of files and directories.

## Why does it exist?

`chmod` enforces access controls on POSIX filesystems, allowing users to restrict or grant access for owners, groups, and others.

## Syntax

```bash
chmod [options] mode file...
```

## Flags

| Flag | Description                       | Example                 |
| ---- | --------------------------------- | ----------------------- |
| `-R` | Change permissions recursively    | `chmod -R 755 /var/www` |
| `-v` | Verbose output for modified files | `chmod -v +x script.sh` |

## Examples

```bash
chmod +x script.sh
```

> Adds execute permission for all users on `script.sh`.

```bash
chmod 600 id_rsa
```

> Restricts read and write permissions to the file owner only.

## Real-World Scenarios

**Setting script executable permission**: Making a deployment script executable via `chmod +x deploy.sh` before invocation.

## When should it NOT be used?

- **Changing file ownership**: Use `chown` to alter the user or group owner of a file.

## Alternatives

- **`chown`**: Modifies owner and group settings rather than permission mode bits.

## How it works internally

`chmod` invokes the `chmod(2)` or `fchmodat(2)` system calls to update the inode file mode bits.

## Performance Notes

Fast filesystem operation operating directly on inode metadata.

## Security Notes

Avoid setting `777` permissions (world readable, writable, executable); restrict permissions to the minimum necessary principal.

## Common Mistakes

- **Using 777 to solve permission errors**: Exposes files to unauthorized modifications.

## Best Practices

- Use octal notation (`644` for files, `755` for directories) or clear symbolic notation (`u+x`).

## Interview Questions

**Q:** What does `chmod 755` mean?
**A:** Owner gets read, write, execute (7); Group gets read, execute (5); Others get read, execute (5).

## Practice Problems

**Problem:** Restrict SSH private key `key.pem` so only owner can read/write it.
**Solution:** `chmod 600 key.pem`

## References

- [chmod man page](https://www.man7.org/linux/man-pages/man1/chmod.1.html)
