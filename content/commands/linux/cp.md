---
slug: cp
name: cp
aliases: []
category: linux
tags: [file-management, copy, filesystem]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'copy a file'
  - 'duplicate a file'
  - 'copy directory recursively'
  - 'copy files preserving permissions'
  - 'backup a file before editing'
relatedCommands: [grep]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-07-21
author: commandatlas
---

## What is it?

`cp` copies one or more files or directories from a source path to a destination path.

## Why does it exist?

File copying is a primitive operation in any operating system. `cp` gives the shell a
composable, scriptable copy primitive that works uniformly across files, directories,
and device paths, without requiring a file manager or GUI. It integrates naturally
into shell pipelines and scripts where copying is one step of a larger operation.

## Syntax

```bash
cp [options] source destination
cp [options] source... directory
```

When a single `source` and a single `destination` are given, `cp` copies `source` to
`destination`. If `destination` is an existing directory, `source` is copied into it.
When multiple sources are given, `destination` must be a directory.

## Flags

| Flag        | Description                                                                | Example                                    |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| `-r` / `-R` | Copy directories recursively (required for directories)                    | `cp -r ./src ./backup-src`                 |
| `-p`        | Preserve mode, ownership, and timestamps                                   | `cp -p config.yml config.yml.bak`          |
| `-a`        | Archive mode: equivalent to `-r -p` plus copies symlinks as symlinks       | `cp -a ./project ./project-backup`         |
| `-i`        | Interactive: prompt before overwriting an existing destination file        | `cp -i important.txt /backup/`             |
| `-n`        | No-clobber: do not overwrite existing files (no prompt, just skip)         | `cp -n *.conf /etc/myapp/`                 |
| `-u`        | Copy only when source is newer than destination, or destination missing    | `cp -u *.log /archive/`                    |
| `-v`        | Verbose: print each file as it is copied                                   | `cp -rv ./src ./dst`                       |
| `-l`        | Hard link instead of copying (same filesystem only)                        | `cp -l original.txt hardlink.txt`          |
| `-s`        | Create a symbolic link instead of copying                                  | `cp -s /absolute/path/orig.txt link.txt`   |
| `--backup`  | Make a backup of each destination file that would be overwritten           | `cp --backup=numbered file.txt /dest/`     |
| `-T`        | Treat destination as a file, not a directory (prevents copying into a dir) | `cp -T src.txt /path/to/exactly-this-name` |

## Examples

```bash
cp config.yml config.yml.bak
```

> Creates a backup copy of `config.yml` in the same directory. The original is
> unchanged. This is the single most common use of `cp`.

```bash
cp -r ./src ./build/src
```

> Copies the entire `./src` directory tree into `./build/src`. Without `-r`, `cp`
> refuses to copy a directory and exits with an error.

```bash
cp -a /var/www/html /var/backups/html-$(date +%Y%m%d)
```

> Archive copy: preserves all metadata (permissions, timestamps, symlinks) and
> uses a datestamped destination directory. This is the correct approach when
> backing up a web root or any directory where permissions matter.

```bash
cp -uv *.log /var/archive/
```

> Copies only log files that are newer than their archive counterparts (or don't
> exist in the archive yet), with verbose output. Suitable for incremental archiving.

```bash
cp -i sensitive.conf /etc/myapp/
```

> Prompts before overwriting `/etc/myapp/sensitive.conf` if it already exists.
> Use `-i` whenever copying to a destination where accidental overwrite is costly.

## Real-World Scenarios

**Config file backup before editing**: `cp -p /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak`
creates a timestamped backup with original ownership and permissions intact, so a bad
edit can be reverted with another `cp`.

**Deploying static files**: `cp -r --preserve=mode dist/ /var/www/html/` copies a
build output directory to a web root while preserving the file permissions set by
the build tool.

**Incremental archive to external drive**: `cp -au /home/user/Documents /mnt/backup/`
copies only changed documents to the backup drive without re-copying everything — the
`-u` flag makes this safe to run repeatedly without unnecessary I/O.

**Creating a template from an existing project**: `cp -r ./template ./new-project` gives
an independent copy that can be modified without affecting the original.

## When should it NOT be used?

- **Large dataset synchronization**: `rsync` is almost always better — it handles
  partial transfers, network copying, checksumming, and delta transfers. `cp` always
  copies the entire file, even if only one byte changed.
- **Copying across filesystems with complex permissions (e.g. ACLs)**: `cp -a`
  preserves standard POSIX permissions but may not preserve extended attributes or
  ACLs on all systems. Use `rsync -aX` or `tar` for those cases.
- **Moving files**: if the goal is to move (not copy), use `mv`, which is an atomic
  rename within the same filesystem. `cp` followed by `rm` is non-atomic and wastes
  I/O if on the same filesystem.
- **Copying files with hardlinks intact**: `cp -r` breaks hardlinks (each hardlinked
  file becomes an independent copy). Use `cp -al` or `rsync --hard-links` if
  preserving the hardlink graph matters.

## Alternatives

- **`rsync`**: the correct tool for syncing directories — handles delta transfers,
  network destinations, checksumming, and partial-transfer resume. Use `rsync -a`
  in place of `cp -a` for almost all non-trivial copy scenarios.
- **`mv`**: for within-filesystem moves (rename), `mv` is atomic. Never use `cp` +
  `rm` when `mv` applies.
- **`install`**: copies files and sets mode/ownership in one step; used in Makefiles
  and package install scripts. More precise than `cp` for deploying binaries with
  specific permissions.

## How it works internally

On the same filesystem, `cp` performs a read-write loop: opens the source file for
reading, creates/truncates the destination, and copies data in chunks. It does **not**
use a rename or copy-on-write shortcut — every byte is read and written, making `cp`
O(size) in time and I/O.

On Linux with modern kernels, `cp` may use the `copy_file_range(2)` system call or
`sendfile(2)`, which allows the kernel to copy data between files without round-
tripping through userspace buffers — this is significantly faster for large files on
the same filesystem or across NFS.

`cp -l` (hard link) and `cp -s` (symlink) don't copy data at all — they create a new
directory entry pointing to the same inode (hard link) or a symlink inode pointing at
the original path (symlink). Both are O(1) in file size.

## Performance Notes

- `cp` on the same filesystem is limited by disk I/O bandwidth, not CPU. For very
  large copies, `rsync --checksum` can be faster for subsequent runs because it
  skips unchanged files; `cp` always copies.
- For copying many small files, the overhead per file (open/create system calls) can
  dominate. `tar | tar` (pipe) or `rsync` handle this case more efficiently.
- `cp -a` is noticeably slower than `cp` alone because it makes additional system
  calls to read and restore timestamps and permissions per file.

## Security Notes

- `cp` silently overwrites the destination unless `-i` or `-n` is used. In scripts
  that operate on important files, always prefer `-n` (no-clobber) unless overwriting
  is explicitly intended, and log the operation.
- `cp` without `-p` does NOT preserve the source file's permissions — the destination
  is created with the process's umask applied. This can inadvertently make a
  previously restricted file world-readable. Use `cp -p` or `cp -a` when permissions
  must be preserved.
- When copying setuid/setgid files, `cp` without explicit flags may strip the setuid
  bit depending on the kernel and umask. Verify permissions on the copy explicitly.

## Common Mistakes

- **Omitting `-r` for directories**: `cp dir/ dest/` without `-r` errors immediately.
  Always use `cp -r` for directories.
- **Trailing slash behavior**: `cp -r src/ dest/` copies the _contents_ of `src/` into
  `dest/`, while `cp -r src dest/` copies `src` itself (as a subdirectory) into `dest/`.
  The trailing slash on the source changes what gets copied. This is a common source
  of "where did my files go?" confusion.
- **Forgetting that `cp` follows symlinks by default**: `cp` copies the file a symlink
  points to, not the symlink itself. Use `cp -a` or `cp -d` to preserve symlinks.
- **Assuming `-i` is the default**: it is not on most Linux systems (it may be aliased
  in some shell configs). In scripts, always specify the intended overwrite behavior
  explicitly.

## Best Practices

- Use `cp -a` instead of `cp -r` when the copy is intended as a backup or archive —
  `-a` preserves timestamps, symlinks, and permissions, which `-r` alone does not.
- In scripts, prefer `-n` (no-clobber) for safety unless overwriting is explicitly
  the intent, and combine with `-v` to log what was and was not copied.
- For deployment or synchronization scenarios, use `rsync` instead of `cp` — it is
  safer (delta transfer, resumable), faster for repeated runs, and handles edge cases
  (`cp` does not) like files being modified during the copy.
- Always verify that the destination has the expected permissions after copying,
  especially when copying config files or binaries to system directories.

## Interview Questions

**Q:** What is the difference between `cp -r` and `cp -a`?
**A:** Both copy directories recursively. `-a` (archive) additionally preserves
symbolic links as symbolic links (rather than following them), preserves file
timestamps, and preserves permissions and ownership. `-r` alone copies directory
structure and file data but may change timestamps and permissions based on the
current umask.

**Q:** How would you copy a file without overwriting the destination if it already exists?
**A:** Use `cp -n source destination`. The `-n` (no-clobber) flag skips the copy if
the destination already exists, without prompting and without error.

**Q:** What is the difference between a hard link (created by `cp -l`) and a copy?
**A:** A hard link creates a second directory entry pointing to the same inode (same
data blocks on disk). Changes to the data are visible through both names. A copy
creates a new, independent inode — changes to one file do not affect the other. Hard
links cannot cross filesystem boundaries and cannot link directories.

**Q:** Why should you use `rsync` instead of `cp` for deploying files to a server?
**A:** `rsync` transfers only changed bytes (delta transfer), supports resuming
interrupted transfers, can verify integrity with checksums, and works natively over
SSH. `cp` always copies the full file, has no resume capability, and cannot copy to
remote hosts without a separate tool.

## Practice Problems

**Problem:** Create a backup of the directory `./config` that preserves all file
permissions and timestamps, naming the backup `./config-backup-YYYYMMDD`.
**Hint:** Use `-a` and command substitution for the date.
**Solution:** `cp -a ./config ./config-backup-$(date +%Y%m%d)`

**Problem:** Copy all `.conf` files from `/etc/myapp/` to `/backup/myapp/` without
overwriting any files that already exist in the destination.
**Hint:** Use the no-clobber flag.
**Solution:** `cp -n /etc/myapp/*.conf /backup/myapp/`

**Problem:** Explain what happens (and why) when you run:
`cp -r src/ dest/` versus `cp -r src dest/` — assuming `dest/` already exists.
**Hint:** Think about trailing slash behavior.
**Solution:** `cp -r src/ dest/` copies the _contents_ of `src/` into `dest/`,
resulting in `dest/file1`, `dest/file2`, etc. `cp -r src dest/` copies `src` itself
as a subdirectory, resulting in `dest/src/file1`, `dest/src/file2`, etc. The trailing
slash on the source tells `cp` to treat the source as "the contents of this directory"
rather than "this directory itself."

## References

- [cp man page — man7.org](https://www.man7.org/linux/man-pages/man1/cp.1.html)
- [GNU coreutils cp documentation](https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html)
