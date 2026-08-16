---
slug: cp
name: cp
aliases: [copy]
category: file-systems
tags: [linux, file-management, copy, coreutils, filesystem]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'copy a file'
  - 'duplicate a directory'
  - 'backup file linux'
  - 'copy files recursively'
  - 'preserve file attributes'
relatedCommands: [mv, rm]
alternatives: []
status: draft
---

## What is it?

`cp` (copy) is a fundamental POSIX utility used to duplicate files and directories within a file system. It reads the byte streams of a source target and writes them identically to a specified destination, providing granular control over how file attributes (like timestamps, ownership, and symbolic links) are preserved or modified during the duplication process.

## Why does it exist?

Operating systems require an atomic, reliable mechanism to replicate user data. Moving a file (`mv`) simply alters inode pointers on the same partition, but duplicating data requires explicit memory buffering and physical disk writes. `cp` exists to abstract the complex, low-level C system calls (`open`, `read`, `write`, `close`) into a universal command-line interface. It handles complex edge cases—such as preventing infinite loops when copying directories recursively, managing hard links, and safely handling sparse files—which would otherwise require developers to write custom C programs for basic file management.

## Syntax

```bash
cp [OPTION]... [-T] SOURCE DEST
cp [OPTION]... SOURCE... DIRECTORY
cp [OPTION]... -t DIRECTORY SOURCE...
```

## Flags

| Flag                      | Description                                                                                                                                                               | Example                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `-r`, `-R`, `--recursive` | Recursively copies directories and all their underlying contents. Required if the source is a folder.                                                                     | `cp -r /var/log ./log_backup`      |
| `-a`, `--archive`         | The "archive" flag. Equivalent to `-dR --preserve=all`. It recursively copies directories while maintaining all original symlinks, file modes, ownership, and timestamps. | `cp -a /var/www /mnt/backup/`      |
| `-p`                      | Preserves the specified attributes (mode, ownership, timestamps) of the source file in the destination copy.                                                              | `cp -p config.ini /etc/config.ini` |
| `-i`, `--interactive`     | Prompts the user (`y/N`) before overwriting any existing file at the destination.                                                                                         | `cp -i script.sh /usr/local/bin/`  |
| `-u`, `--update`          | Copies the source file only if it is newer than the destination file, or if the destination file does not exist.                                                          | `cp -u *.txt /backup/`             |
| `-f`, `--force`           | If a destination file exists but cannot be opened for writing, `cp` will delete it and try the copy again.                                                                | `cp -f locked.dat /tmp/`           |
| `-v`, `--verbose`         | Explains what is being done, printing each filename as it is successfully copied.                                                                                         | `cp -rv ./src ./dest`              |
| `-l`, `--link`            | Hard links files instead of copying bytes. Creates a new directory entry pointing to the exact same physical inode.                                                       | `cp -l huge_file.iso clone.iso`    |
| `-s`, `--symbolic-link`   | Creates symbolic links (shortcuts) pointing to the source files instead of actually copying the data.                                                                     | `cp -s /opt/app/binary /usr/bin/`  |
| `--reflink[=WHEN]`        | Leverages Copy-on-Write (CoW) filesystems (Btrfs, XFS) to instantly clone files without duplicating physical disk blocks.                                                 | `cp --reflink=always a.txt b.txt`  |

## Examples

```bash
cp file1.txt file2.txt
```

> The most basic invocation. Duplicates the byte stream of `file1.txt` into a new file named `file2.txt` in the current directory. The new file will have the current timestamp and be owned by the user executing the command.

```bash
cp -a /etc/nginx /backup/nginx-$(date +%F)
```

> Performs an exact, recursive archive copy. The `/etc/nginx` folder is duplicated into `/backup/`, maintaining all internal symbolic links perfectly intact, and preserving the exact `root` ownership and modification times of the original configuration files.

```bash
cp -i * /mnt/usb_drive/
```

> Copies all non-hidden files in the current directory to an external drive. The `-i` flag ensures that if a file with the same name already exists on the USB drive, the shell will pause and explicitly ask the user for permission to overwrite it, preventing data loss.

```bash
cp -u /data/prod/*.csv /data/archive/
```

> Executes a differential copy. `cp` compares the modification timestamps of the source files against the destination. It only executes physical disk writes for `.csv` files that are newer, saving immense amounts of time and I/O when synchronizing large datasets manually.

```bash
cp -t /var/www/html/ index.html style.css script.js
```

> Uses the target directory flag (`-t`). This allows you to specify the destination directory _first_, followed by an arbitrary number of source files. This is highly useful when constructing complex `xargs` pipelines.

## Real-World Scenarios

**Instantaneous Zero-Copy Cloning (CoW)**

```bash
cp --reflink=always massive_database.db clone_database.db
```

> On modern enterprise filesystems like XFS or ZFS, copying a 50GB file normally takes minutes of blocking disk I/O. By forcing `--reflink`, `cp` simply creates a new metadata pointer to the existing physical blocks on the disk. The command finishes in milliseconds, and physical disk space is only consumed later if the `clone_database.db` is modified (Copy-on-Write).

**Safe Configuration Rollbacks**

```bash
cp -p sshd_config sshd_config.bak
# ... edit sshd_config ...
```

> Before editing a critical system configuration file, an administrator creates an inline backup. By using `-p`, the `.bak` file retains the exact same strict permissions (`0600`) as the original file, ensuring the backup doesn't accidentally become world-readable.

## When should it NOT be used?

- **Synchronizing remote environments:** **Do not use `cp` over mounted network drives for synchronization.** `cp` is inefficient for updates as it lacks a robust delta-transfer algorithm. Always use `rsync`, which compares file chunks and only transmits the bytes that changed over the network.
- **Cloning raw block devices:** **Do not use `cp /dev/sda /dev/sdb`.** While technically possible in Unix, `cp` utilizes user-space memory buffers and doesn't handle disk geometry or partition UUID collisions well. Use `dd` or `partclone` for raw bit-for-bit block device imaging.
- **Massive folder migrations:** For moving directories with millions of tiny files, `cp`'s single-threaded nature can bottleneck. Utilizing `tar cf - . | (cd /dest; tar xvf -)` or parallelized `rsync` is often significantly faster as it pipelines the I/O.

## Alternatives

- **`rsync`:** **Best for synchronization and remote copies.** Offers advanced features like bandwidth limiting, progress bars (`-P`), delta-transfers, and resuming interrupted copies.
- **`dd`:** **Best for low-level byte manipulation.** Reads and writes raw data blocks directly, bypassing standard filesystem abstraction. Essential for creating bootable USBs or forensic disk imaging.
- **`install`:** **Best for build pipelines.** Combines `cp` with `chmod` and `chown`. Used in `Makefiles` to copy compiled binaries into `/usr/bin` while simultaneously setting the correct execution bits and stripping debug symbols.

## How it works internally

When you run `cp source dest`, the utility traditionally executes a simple loop using standard C library system calls: it opens the source file (`open()` with `O_RDONLY`), opens the destination file (`open()` with `O_WRONLY|O_CREAT`), allocates a user-space memory buffer (typically a few kilobytes to megabytes), reads a chunk of bytes into the buffer (`read()`), and writes those bytes to the destination (`write()`).

However, modern GNU `cp` is heavily optimized. It first calls `stat()` to determine file sizes, file types (to ensure it isn't entering an infinite loop by copying a directory into itself), and whether the files are sparse (containing massive blocks of zeros).

On modern Linux kernels (v4.5+), `cp` automatically attempts to use the `copy_file_range()` system call. This allows the kernel to copy the data directly between file descriptors entirely within kernel space, completely bypassing the expensive overhead of transferring the data up into the user-space buffer and back down. If the underlying filesystem supports Copy-on-Write (CoW), `copy_file_range()` instantly executes a reflink clone instead of moving physical bytes. If the advanced syscall fails, `cp` seamlessly falls back to the traditional `read()/write()` loop.

## Performance Notes

- **Sparse File Handling:** By default (`--sparse=auto`), `cp` detects files containing large, empty holes (like virtual machine disk images). Instead of physically writing gigabytes of zeros to the destination, it seeks past the holes, recreating a sparse file on the destination and drastically saving disk space and I/O time.
- **Buffer Bloat:** Standard `cp` without kernel-space acceleration can severely pollute the Linux page cache. Copying a 100GB file fills the system RAM with cached file pages, potentially forcing the kernel to swap out active application memory to disk, causing temporary system-wide degradation.

## Security Notes

- **Dangling Symlink Exploits:** If you run `cp -a` as root to backup a user's directory, and the user has maliciously created a symlink pointing to `/etc/shadow`, the backup might duplicate the sensitive file into a location the user can read.
- **Preserving SUID Bits:** When copying executable binaries, using `cp -a` or `cp -p` preserves the `setuid` and `setgid` bits. This can unintentionally duplicate privileged binaries into unprotected directories, expanding the attack surface.

## Common Mistakes

- **Forgetting `-r` on directories**
  - _Mistake:_ Running `cp /var/log ./backups` and getting `cp: -r not specified; omitting directory '/var/log'`.
  - _Why:_ By design, `cp` operates on files. It explicitly refuses to traverse into directories unless the recursive flag is set, preventing unintended massive disk I/O operations.
- **Misunderstanding Trailing Slashes**
  - _Mistake:_ `cp -r src dest` behaves differently than `cp -r src/ dest`.
  - _Why:_ If `dest` does not exist, `cp -r src dest` creates a folder named `dest` containing the _contents_ of `src`. If `dest` _does_ exist, it copies the entire `src` folder _inside_ `dest` (creating `dest/src/`). Adding a trailing slash to the source (`src/`) forces `cp` to explicitly copy the _contents_ of the source, regardless of the destination's existence.

## Best Practices

- **Default to `-a` for Backups:** When backing up system configurations, never use naked `cp -r`. Always use `cp -a`. Losing original ownership, group assignments, and strict permission modes on files like `/etc/ssh/sshd_config` will break the system upon restoration.
- **Alias `cp` to `cp -i`:** Many system administrators place `alias cp="cp -i"` in the root `.bashrc`. It costs nothing and provides a mandatory safety net, preventing tired engineers from accidentally overwriting production databases with empty files.

## Interview Questions

**Q: Explain the difference between `cp -r` and `cp -a`.**
**A:** `cp -r` (recursive) simply copies a directory and its contents, creating new files with the current user's ownership, current timestamps, and default permissions modified by the system `umask`. `cp -a` (archive) implies recursive but also aggressively preserves the exact ownership (user/group), timestamps, specific file permissions, SELinux contexts, and copies symbolic links as links rather than resolving and copying their target files.

**Q: You are copying a 10GB file locally on an XFS filesystem. How can you instruct `cp` to complete this copy instantaneously without using 10GB of additional disk space immediately?**
**A:** You use the `--reflink=always` flag. This leverages the Copy-on-Write (CoW) capabilities of the XFS filesystem. `cp` will instruct the kernel to create a new file that shares the exact same physical data blocks as the original file. Additional disk space is only consumed later if the contents of the new or original file are modified.

## Practice Problems

**Problem:** You are currently in `/home/user`. You need to copy the directory `/opt/app` into your current directory, but you want `cp` to print the name of every file to the terminal as it copies them so you can monitor progress.
**Hint:** Combine the recursive flag with the verbosity flag.
**Solution:**

```bash
cp -rv /opt/app .
```

**Problem:** You want to backup `database.sqlite` to `database.sqlite.bak`. However, you only want the copy to execute if `database.sqlite` has been modified more recently than the backup file, or if the backup file doesn't exist yet.
**Hint:** Use the update flag.
**Solution:**

```bash
cp -u database.sqlite database.sqlite.bak
```

## References

- [cp(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/cp)
- [GNU Coreutils Manual: cp invocation](https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html)
