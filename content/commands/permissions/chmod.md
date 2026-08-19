---
slug: chmod
name: chmod
aliases: [change mode]
category: permissions
tags: [linux, permissions, security, mode, filesystem]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'change file permissions'
  - 'make file executable linux'
  - 'set 755 permissions'
  - 'restrict access to file'
  - 'add execute permission to script'
relatedCommands:
  [chown, chgrp, ls, getfacl, setfacl, setuid, setgid, sticky-bit, chattr, umask, visudo]
alternatives: [setfacl, chattr, umask]
status: draft
---

## What is it?

`chmod` (change mode) is a core POSIX utility used to modify the read, write, and execute permissions of files and directories. It dictates the fundamental access control policies of the Linux filesystem by assigning explicit authorization boundaries for the file's Owner (User), the assigned Group, and everyone else (Others).

## Why does it exist?

The UNIX security model is built on absolute file isolation, relying on a 9-bit permission matrix to govern access. Without a mechanism to alter these bits, scripts could not be executed, private cryptographic keys would be globally readable, and collaborative directories would be impossible to secure. `chmod` exists to provide an interface to manipulate these low-level inode permission bits using both intuitive symbolic logic (adding/removing rights) and absolute octal mathematics.

## Syntax

```bash
chmod [OPTION]... MODE[,MODE]... FILE...
chmod [OPTION]... OCTAL-MODE FILE...
chmod [OPTION]... --reference=RFILE FILE...
```

## Flags

| Flag                  | Description                                                                                            | Example                              |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `-R`, `--recursive`   | Operates on files and directories recursively, changing permissions across entire trees.               | `chmod -R 755 /var/www/`             |
| `-c`, `--changes`     | Like verbose, but only reports output when a permission is successfully changed.                       | `chmod -c u+x script.sh`             |
| `-v`, `--verbose`     | Outputs a diagnostic message for every file processed, detailing the before and after mode.            | `chmod -v 600 *.key`                 |
| `-f`, `--silent`      | Suppresses most error messages (such as "Operation not permitted" on unowned files).                   | `chmod -f -R 644 /tmp/`              |
| `--reference=<RFILE>` | Copies the permission mode from a reference file and applies it identically to target files.           | `chmod --reference=good.txt bad.txt` |
| `+x` / `-x`           | (Symbolic) Adds or removes the execution (`x`) permission for a file or directory.                     | `chmod +x deploy.sh`                 |
| `u+rwx`               | (Symbolic) Adds read, write, and execute permissions specifically for the User (Owner).                | `chmod u+rwx binary`                 |
| `g-w`, `o-rwx`        | (Symbolic) Removes write from Group (`g-w`) and strips all permissions from Others (`o-rwx`).          | `chmod g-w,o-rwx file`               |
| `a+X`                 | (Symbolic) Adds execution to All, but _only_ if the target is a directory or already executable.       | `chmod -R a+rX /public/`             |
| `+s`                  | (Special) Sets the SetUID (`u+s`) or SetGID (`g+s`) bit, executing files as the owner/group.           | `chmod g+s /shared_dir/`             |
| `+t`                  | (Special) Sets the Sticky bit (`+t`) on directories to prevent users from deleting each other's files. | `chmod +t /tmp/`                     |

## Examples

```bash
chmod +x install.sh
```

> This uses symbolic notation to append the execute (`x`) bit to `install.sh` for all users (`a` is implied). The script can now be run directly as an executable program (`./install.sh`) rather than passed to an interpreter (`bash install.sh`).

```bash
chmod 600 ~/.ssh/id_rsa
```

> This uses absolute octal notation to secure a private SSH key. `600` strictly assigns read/write permissions to the Owner, and absolutely zero permissions (0) to Groups and Others, which is mandatory for SSH to accept the key.

```bash
chmod -R u=rwX,go=rX /var/www/html/
```

> This recursively secures a web directory. It sets the Owner to Read/Write, and Groups/Others to Read-Only. Crucially, it uses the capital `X` flag, which safely applies execute permissions _only_ to directories (allowing traversal) while leaving standard files untouched.

```bash
chmod g+s /var/collaborative_data/
```

> This applies the SetGID bit (`s`) to a directory. Any new files or subdirectories created inside this directory will automatically inherit the group ownership of the directory itself, ensuring seamless collaboration among team members.

```bash
chmod -c 755 /usr/local/bin/*
```

> This iterates through a binary directory applying standard executable permissions (`755`), utilizing the changes flag (`-c`) to print a confirmation log strictly for files that actually required their permissions to be updated.

## Real-World Scenarios

**Securing Cryptographic Infrastructure**

```bash
chmod 700 ~/.gnupg
chmod 600 ~/.gnupg/*
```

> Security administrators strictly lockdown GPG and SSH directories. Directories require execute permissions (`7`) to be traversed, but files inside must be stripped of execution and globally isolated (`600`) to prevent credential harvesting by unprivileged lateral attackers.

**Provisioning Public Upload Directories**

```bash
chmod 1777 /var/app/uploads/
```

> Web servers requiring open upload folders are given absolute `777` permissions (everyone can write), but prefixed with the Sticky Bit (`1`). This ensures a malicious user can upload their own files, but the kernel mathematically prevents them from deleting or overwriting files uploaded by other users.

**Automated Remediation of Deployment Permissions**

```bash
find /app/data -type f -exec chmod 644 {} +
find /app/data -type d -exec chmod 755 {} +
```

> CI/CD pipelines deploying raw code artifacts use `find` to segregate files from directories, executing `chmod` via `xargs` to ensure all raw code is non-executable (`644`), while all directories are traversable (`755`), fixing sloppy permissions pushed from Windows developer laptops.

## When should it NOT be used?

- **Granting permissions to a specific secondary user:** **Reason:** Standard POSIX modes only support one Owner and one Group. If Alice owns a file and wants to give read access to Bob (but not the whole group), `chmod` cannot do this securely. **Use instead:** Access Control Lists (`setfacl -m u:bob:r file`).
- **"Fixing" permission denied errors by running `chmod 777`:** **Reason:** Setting a file globally readable, writable, and executable obliterates the Linux security model and opens the server to trivial exploitation. **Use instead:** Proper `chown` ownership alignment or explicit group assignments.

## Alternatives

- **`setfacl`:** Extended Access Control Lists. **Tradeoff:** Provides granular, infinite access rules for specific individuals and distinct groups, overriding basic POSIX bits. Highly powerful but significantly more complex to audit and maintain.
- **`chattr`:** Immutable attributes. **Tradeoff:** `chmod` relies on user identity to block writes; `chattr` locks the file at the filesystem hardware level, preventing even the `root` user from modifying it.

## How it works internally

Every file in a Linux filesystem possesses an `inode` data structure. Inside this inode resides a 16-bit integer field called `st_mode`.

The lowest 9 bits of `st_mode` represent the standard permissions (3 bits for User, 3 for Group, 3 for Other). Each 3-bit octal number represents Read (4), Write (2), and Execute (1). Above these 9 bits sit the 3 Special bits: SetUID (4000), SetGID (2000), and the Sticky Bit (1000).

When you execute `chmod 755 file`, the utility converts the arguments into an integer and invokes the `chmod()` or `fchmodat()` system call. The kernel verifies that the executing user is either the exact Owner of the file or the `root` user. If authorized, the kernel calculates a bitwise mask and physically overwrites the `st_mode` integer directly inside the file's inode on the storage disk. This operation is instantaneous and atomic. Any running processes possessing open file handles to the file are generally unaffected, but new access attempts are evaluated against the new `st_mode` mask immediately.

## Performance Notes

- Applying `chmod` to a single file executes in microseconds.
- Executing `chmod -R` on a dense directory structure (e.g., millions of web cache files) incurs severe disk I/O penalties. The utility must perform an `opendir()`, `lstat()`, and `fchmodat()` system call sequentially for every single file in the hierarchy.

## Security Notes

- **The 777 Anti-Pattern:** A file set to `777` can be altered by any unprivileged user on the system, including web-facing daemons. Attackers routinely search for `777` directories to drop and execute malicious payloads.
- **SetUID / SetGID Risks:** Setting `chmod u+s` on an executable file causes the program to run with the privileges of the file's owner, not the user executing it. If an administrator sets `chmod u+s /bin/bash`, any standard user running that binary instantly gains a root shell.
- **Execution Bits on Directories:** In Linux, the Execute (`x`) bit on a directory does not mean "run"; it means "traverse". If a user lacks the `x` bit on a directory, they cannot `cd` into it or access any files inside it, even if they explicitly own the files inside.

## Common Mistakes

- **Applying `-R 777` defensively:** Running `chmod -R 777 /var/www` to fix an Nginx 403 error. **Why it's wrong:** You have globally compromised the web server. Furthermore, making everything executable breaks standard files. The correct fix is `chown -R www-data:www-data` and `chmod -R 755`.
- **Using lowercase `-R u+x` on mixed directories:** Running `chmod -R u+x folder/`. **Why it's wrong:** This makes every plain text file, image, and log inside the folder executable. You must use the capital `X` (`chmod -R u+X folder/`), which intelligently applies execution rights _only_ to directories and files that already have an execute bit set.
- **Confusing user privileges:** Trying to `chmod` a file owned by `root` as a standard user. **Why it's wrong:** Only the absolute owner of a file (or `root`) can alter its permissions. Group members with write access still cannot run `chmod`.

## Best Practices

- Internalize octal arithmetic: Read is 4, Write is 2, Execute is 1. (e.g., `Read + Write = 6`, `Read + Execute = 5`, `All = 7`).
- When fixing complex directory structures, always avoid recursive `chmod` combinations. Use `find` to isolate files from directories before applying specific masks (`find . -type d -exec chmod 755 {} +`).
- Utilize `--reference` in automated configuration management scripts to safely clone and enforce known-good permission profiles from secure template files onto newly generated configurations.

## Interview Questions

- _Query:_ What does the capital `X` accomplish in a command like `chmod -R u=rwX /project`, and why is it superior to using the lowercase `x`?
  - _A:_ The lowercase `x` blindly applies the execute permission to every single file and directory it encounters, resulting in text files and images becoming executable binaries. The capital `X` is a conditional flag: it applies the execute bit to directories (allowing traversal) but only applies it to files if they _already_ possess an execute bit for some other user. It secures directories without corrupting plain files.
- _Query:_ What is the functional security purpose of the "Sticky Bit" (`chmod +t`), and on what specific system directory is it almost always applied by default?
  - _A:_ The Sticky Bit is used on globally writable directories to protect files from lateral interference. When applied, it instructs the kernel that only the specific creator/owner of a file (or the root user) is permitted to delete or rename that file. It is famously applied to the `/tmp` directory (`chmod 1777 /tmp`) so all users can write temporary data without allowing malicious users to delete other people's temp files.
- _Query:_ A user issues `chmod 000 secret.txt`. Can the `root` user still read the contents of this file? Why?
  - _A:_ Yes. The `root` user (UID 0) operates entirely above the standard POSIX permission matrix. The Linux kernel's Virtual File System (VFS) bypasses standard `st_mode` read/write permission checks when it detects the executor possesses root capabilities, granting absolute access regardless of the `000` mode.

## Practice Problems

- _Problem:_ Remove all read, write, and execute permissions from the `Others` (global) category for a file named `config.yaml`, while ensuring the Owner retains Read and Write access.
  - _Hint:_ Use symbolic notation to subtract all permissions from the 'o' category, and set the 'u' category explicitly.
  - _Solution:_ `chmod o-rwx,u=rw config.yaml` (This securely locks the file down, stripping public access without utilizing complex octal math).
- _Problem:_ Recursively adjust permissions for a directory named `/data/shared` so that the Owner has full access (`7`), the Group has read and execute access (`5`), and Others have absolutely no access (`0`).
  - _Hint:_ Combine the recursive flag with the appropriate three-digit octal permission mask.
  - _Solution:_ `chmod -R 750 /data/shared` (The `-R` cascades the exact octal mask down through all nested items).

## References

- [GNU Coreutils - chmod invocation](https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html)
- [Man Page for chmod (Linux)](https://man7.org/linux/man-pages/man1/chmod.1.html)
