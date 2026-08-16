---
slug: rmdir
name: rmdir
aliases:
  - remove directory
category: file-systems
tags:
  - linux
  - file-system
  - directory
  - delete
  - safety
difficulty: beginner
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - remove empty directory
  - delete folder safely
  - remove directory structure
  - delete empty folders linux
  - safely clean up directories
relatedCommands:
  - rm
  - mkdir
  - find
  - tree
alternatives: []
status: draft
---

## What is it?

`rmdir` is a specialized POSIX command-line utility designed exclusively to remove empty directories from a filesystem. Unlike the broader `rm` command, `rmdir` enforces a strict safety mechanism: it will instantly fail and refuse to execute if the target directory contains any files, hidden files, or subdirectories.

## Why does it exist?

While `rm -r` can delete directories, its recursive, destructive power is extremely dangerous when executed via automated scripts or hurried typing. `rmdir` exists to provide a mathematically safe operation. It allows scripts and operators to attempt directory cleanup with the absolute kernel-level guarantee that no active data, nested files, or critical infrastructure will be accidentally destroyed during the process.

## Syntax

```bash
rmdir [OPTION]... DIRECTORY...
```

## Flags

| Flag                         | Description                                                                                                               | Example                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `-p`, `--parents`            | Removes the target directory and sequentially removes any parent directories that become empty as a result.               | `rmdir -p /tmp/build/stage/`              |
| `-v`, `--verbose`            | Prints a diagnostic confirmation message to standard output for every directory successfully removed.                     | `rmdir -v empty_folder`                   |
| `--ignore-fail-on-non-empty` | Suppresses the standard error output and exits with `0` even if the directory cannot be removed because it contains data. | `rmdir --ignore-fail-on-non-empty ./logs` |
| `--help`                     | Outputs brief usage documentation and supported command-line options.                                                     | `rmdir --help`                            |
| `--version`                  | Displays version information and copyright details for the coreutils package.                                             | `rmdir --version`                         |

_(Note: `rmdir` is a strictly constrained utility designed purely for safe directory removal; it deliberately lacks forceful override flags.)_

## Examples

```bash
rmdir unused_folder
```

> This attempts to delete `unused_folder`. If the folder is entirely empty (containing only the `.` and `..` filesystem references), the kernel unlinks it. If it contains a single file, the command aborts safely with an error.

```bash
rmdir -p src/main/java/utils
```

> This executes a sequential cleanup sequence. It removes `utils`, then checks if `java` is empty and removes it, checking `main`, and finally `src`. This is the exact inverse operation of `mkdir -p`.

```bash
rmdir -v /mnt/usb_drive
```

> This attempts to remove a previously used mount point directory, outputting a verbose string (e.g., `rmdir: removing directory, '/mnt/usb_drive'`) so automated shell logs can confirm the cleanup step executed.

```bash
rmdir --ignore-fail-on-non-empty /var/app/cache
```

> This attempts to clean up an application cache folder. If the folder still has active cache files inside it, the command exits silently and successfully without breaking the surrounding bash script's `set -e` error handling.

```bash
find . -type d -empty -exec rmdir {} +
```

> This leverages the `find` utility to map an entire project directory tree, isolating only strictly empty folders, and passes them efficiently to `rmdir` to prune dead structural scaffolding.

## Real-World Scenarios

**Safe Idempotent Teardown Scripts**

```bash
rmdir --ignore-fail-on-non-empty /opt/app/temp_workspace
```

> Deployment scripts handling application teardown attempt to remove temporary workspaces. Using `rmdir` ensures that if a rogue process dropped an unexpected log file into the workspace, the script won't blindly destroy it (as `rm -rf` would), preserving the artifact for debugging.

**Symmetric Directory Scaffolding Cleanup**

```bash
mkdir -p build/stage/x86; do_work; rmdir -p build/stage/x86
```

> Build systems executing ephemeral compilation stages use `rmdir -p` to gracefully roll back and collapse the exact directory hierarchy they created, leaving no lingering empty folder artifacts in the project root.

## When should it NOT be used?

- **Deleting directories containing files:** **Reason:** `rmdir` is structurally incapable of deleting files. **Use instead:** `rm -r <directory>` to wipe directories and their nested contents.
- **Removing symbolic links pointing to directories:** **Reason:** `rmdir` strictly targets directory inodes. Attempting to use it on a symlink will result in a "Not a directory" error. **Use instead:** `rm <symlink>`.

## Alternatives

- **`rm -d`:** Remove empty directory. **Tradeoff:** It provides the exact same empty-check safety behavior as `rmdir`, but is bundled inside the more dangerous `rm` binary.
- **`rm -rf`:** Force recursive removal. **Tradeoff:** Eradicates the directory and absolutely everything inside it. It requires no empty-checks, making it vastly faster but carrying catastrophic risk if aimed incorrectly.

## How it works internally

When you execute `rmdir`, the utility parses the target paths and invokes the POSIX `rmdir()` system call.

The Linux kernel intercepts this call and performs a strict validation check on the target directory's inode. It verifies that the directory's link count accurately reflects an empty state—specifically, it ensures that the only entries contained within the directory's data blocks are `.` (pointing to itself) and `..` (pointing to its parent).

If any other valid filesystem entry (files, symlinks, hidden dotfiles) is detected, the kernel immediately rejects the system call with the `ENOTEMPTY` (Directory not empty) error code. If the directory passes validation, the kernel removes the directory's entry from its parent directory, decrements the parent's link count, and frees the target directory's inode and data blocks back to the filesystem. This operation is O(1) and virtually instantaneous.

## Performance Notes

- Because `rmdir` relies on a highly optimized kernel-level check (`ENOTEMPTY`), executing it on thousands of empty directories is phenomenally fast, incurring almost zero disk I/O overhead compared to file deletion.
- Using `-p` performs a sequential series of `rmdir()` system calls up the directory tree, stopping instantly the moment it encounters a parent directory that is not empty.

## Security Notes

- **Permissions and Ownership:** You must possess Write and Execute (`wx`) permissions on the _parent_ directory to remove a child directory using `rmdir`. You do not necessarily need permissions on the empty directory itself.
- **The Sticky Bit Interaction:** If the parent directory has the sticky bit set (like `/tmp`), the kernel enforces an additional security constraint: you can only `rmdir` the empty child folder if you are the explicit owner of the child folder or the owner of the parent folder, preventing users from deleting each other's empty workspaces.

## Common Mistakes

- **Thinking a directory is empty when it contains hidden files:** Running `rmdir folder` and getting "Directory not empty", but `ls folder` shows nothing. **Why it's wrong:** Standard `ls` hides dotfiles (e.g., `.gitignore`, `.DS_Store`). The directory is not empty. You must delete the hidden files first or use `rm -rf`.
- **Trailing slash on symlinks:** Using tab-autocomplete which appends a slash (`rmdir symlink_dir/`). **Why it's wrong:** The trailing slash forces the kernel to resolve the symlink and attempt to delete the actual target directory, rather than deleting the link.
- **Attempting to remove the current working directory:** Running `rmdir .`. **Why it's wrong:** The kernel actively protects the current working directory (`CWD`) of any active process. You must `cd ..` out of the directory before you can safely remove it.

## Best Practices

- In bash scripts, prefer `rmdir` over `rm -rf` whenever the logical expectation is that a directory _should_ be empty. This turns `rmdir` into a free consistency assertion check.
- When managing dynamic caching or spool directories, integrate `rmdir --ignore-fail-on-non-empty` to cleanly reap scaffolding directories without polluting cron or CI logs with acceptable failure messages.

## Interview Questions

- _Query:_ What specific internal condition must the Linux kernel verify before it permits the `rmdir()` system call to succeed?
  - _A:_ The kernel must verify that the directory's data blocks contain absolutely no file or directory entries other than the standard `.` (current directory) and `..` (parent directory) hard links. If any other inode reference exists, it throws an `ENOTEMPTY` error.
- _Query:_ If a script executes `rmdir -p a/b/c`, and directory `b` contains a hidden file named `.config`, what will happen during execution?
  - _A:_ `rmdir` will successfully delete directory `c` (assuming it is entirely empty). It will then step up to directory `b` and attempt to delete it. Because `b` contains `.config`, the kernel throws `ENOTEMPTY`. The `rmdir` command stops execution immediately, leaving `a` and `b` intact.
- _Query:_ Why is using `rmdir` inherently safer than using `rm -r` in automated deployment pipelines?
  - _A:_ `rm -r` blindly traverses and destroys all data within a specified path. If a variable fails to expand (e.g., `rm -r $TARGET/`), it could default to destroying the root tree. `rmdir` inherently refuses to delete directories containing data, acting as a strict safety constraint against catastrophic automated data loss.

## Practice Problems

- _Problem:_ Remove an empty directory named `old_backups`, but configure the command so that it exits completely silently and successfully even if `old_backups` turns out to contain files.
  - _Hint:_ Use the strict removal utility combined with the flag that suppresses non-empty failure states.
  - _Solution:_ `rmdir --ignore-fail-on-non-empty old_backups` (This attempts a safe delete but swallows the error if the safety check fails).
- _Problem:_ Remove a nested empty folder path `projects/archived/2022/`, and ensure that if `archived` and `projects` become empty as a result, they are also automatically removed in a single command.
  - _Hint:_ Utilize the parent-traversal flag.
  - _Solution:_ `rmdir -p projects/archived/2022/` (This executes sequential deletion up the directory tree until it hits a non-empty folder).

## References

- [GNU Coreutils - rmdir invocation](https://www.gnu.org/software/coreutils/manual/html_node/rmdir-invocation.html)
- [Man Page for rmdir (Linux)](https://man7.org/linux/man-pages/man1/rmdir.1.html)
