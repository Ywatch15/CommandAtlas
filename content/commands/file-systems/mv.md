---
slug: mv
name: mv
aliases:
  - move
category: file-systems
tags:
  - linux
  - files
  - coreutils
  - move
  - rename
  - inode
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
  - move file linux
  - rename file or directory
  - move folder to another location
  - safely overwrite files
  - batch move files
relatedCommands: [cp, rm, find]
alternatives: []
status: draft
---

## What is it?

`mv` is a core POSIX command-line utility used to move files and directories from one location to another, or to rename them within the same directory. Depending on the source and destination boundaries, it operates either by rewriting lightweight filesystem metadata pointers (inodes) or by physically copying and subsequently deleting data blocks.

## Why does it exist?

Managing file lifecycles requires repositioning data and updating human-readable naming conventions. Providing separate tools for "renaming" versus "moving" data is redundant within UNIX architectural paradigms, as both actions fundamentally represent identical alterations to directory mapping structures. `mv` exists to unify these operations, providing a deterministic, atomic mechanism to manipulate directory entries and migrate data safely across filesystem boundaries.

## Syntax

```bash
mv [OPTION]... [-T] SOURCE DEST
mv [OPTION]... SOURCE... DIRECTORY
mv [OPTION]... -t DIRECTORY SOURCE...
```

## Flags

| Flag                             | Description                                                                                                      | Example                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `-i`, `--interactive`            | Prompts the user for confirmation before silently overwriting an existing destination file.                      | `mv -i backup.zip /archive/`                 |
| `-n`, `--no-clobber`             | Prevents overwriting any existing files entirely, succeeding silently if the target exists.                      | `mv -n *.log /var/log/old/`                  |
| `-f`, `--force`                  | Overwrites destination files immediately, overriding any previous `-i` flags and ignoring prompts.               | `mv -f update.tar /tmp/`                     |
| `-u`, `--update`                 | Moves files only if the source file is newer than the destination, or if the destination is missing.             | `mv -u ./src/* ./build/`                     |
| `-v`, `--verbose`                | Prints a continuous log showing the names of each file as it is successfully moved.                              | `mv -v *.jpg ./photos/`                      |
| `-b`, `--backup`                 | Creates a backup of any destination file that would be overwritten, appending a `~` to the filename.             | `mv -b config.json /etc/app/`                |
| `-S`, `--suffix <SUFFIX>`        | Specifies a custom string suffix to append when using the `-b` (backup) flag.                                    | `mv -b -S .bak data.db /db/`                 |
| `-t`, `--target-directory <DIR>` | Specifies the destination directory explicitly before listing multiple source files (ideal for xargs).           | `find . -name "*.txt" \| xargs mv -t /docs/` |
| `-T`, `--no-target-directory`    | Treats the destination strictly as a normal file, preventing accidental moves into a directory of the same name. | `mv -T new_folder /old_folder`               |
| `--strip-trailing-slashes`       | Removes trailing slashes from source arguments, ensuring correct directory rename behavior.                      | `mv --strip-trailing-slashes dir/ newdir`    |

## Examples

```bash
mv script.sh execution.sh
```

> This renames a single file within the current directory. Because the destination is not a directory, the filesystem merely alters the filename mapping associated with the file's underlying inode.

```bash
mv -i app.config /etc/app/app.config
```

> This moves a configuration file from the local directory into a system path. The interactive flag (`-i`) ensures that if a legacy config already exists at the destination, the command will pause and demand a `[y/N]` confirmation before overwriting it.

```bash
mv -u *.png ./images/
```

> This executes an update-move operation. It evaluates every `.png` file in the current directory against files of the same name in `./images/`. It only moves the file if the source modification timestamp is newer than the destination's, acting as a crude but fast delta sync.

```bash
find /var/log -name "*.gz" | xargs mv -t /archive/logs/
```

> This leverages the target directory flag (`-t`). By placing the destination directory at the beginning of the `mv` command structure, `xargs` can safely append an unlimited number of piped source files to the end of the argument list without breaking syntax logic.

```bash
mv -b -S .old database.sqlite /production/database.sqlite
```

> This moves a local database file into production. If a database already exists there, the backup flags automatically rename the existing production file to `database.sqlite.old` before inserting the new file, ensuring instantaneous, safe rollbacks.

## Real-World Scenarios

**Atomic Zero-Downtime Deployments**

```bash
mv new_release.jar production.jar
```

> Deployment scripts rely on `mv` within the same filesystem because the kernel guarantees that renaming over an existing file is a strictly atomic operation. Active applications accessing the old file descriptor keep running safely, while new requests instantly hit the updated binary without milliseconds of "file missing" downtime.

**Consolidating Stale Artifacts**

```bash
mv -n /build_output/*.tar.gz /long_term_storage/
```

> CI/CD pipelines sweeping directories use the no-clobber (`-n`) flag to dump hundreds of compiled artifacts into a centralized storage bucket. If an artifact with the exact same name was already stored previously, the command skips it safely without crashing the pipeline.

**Safe Configuration Overwrites**

```bash
mv -b config.yml /etc/application/config.yml
```

> Operations engineers hot-patching application configurations use backup flags to ensure the previous working configuration is automatically preserved right next to the new one, providing an immediate reversion path if the service fails to restart.

## When should it NOT be used?

- **Renaming hundreds of files using complex regex patterns:** **Reason:** `mv` expects literal strings and basic shell expansion; using bash `for` loops to parse complex string replacements with `mv` is error-prone and brittle. **Use instead:** The `rename` utility (e.g., `rename 's/.jpeg$/.jpg/' *.jpeg`).
- **Moving massive datasets across different filesystems or networks:** **Reason:** If `mv` fails halfway through copying across filesystems, it leaves data in an inconsistent state without resume capabilities. **Use instead:** `rsync -avP --remove-source-files`.

## Alternatives

- **`rsync`:** Robust file synchronization. **Tradeoff:** `rsync` ensures data integrity, handles network transfers, and resumes interrupted transfers safely. However, it requires significantly more overhead and typing than a simple local `mv` command.
- **`rename`:** Perl-based batch renaming. **Tradeoff:** `rename` excels at executing complex regular expressions across thousands of files simultaneously (like changing extensions or padding numbers), whereas `mv` handles only basic literal moves.

## How it works internally

When you execute `mv`, the utility evaluates the source and destination paths. Its behavior diverges radically based on one critical condition: **Are the source and destination on the exact same mounted filesystem?**

**Same Filesystem (The Rename):** If moving data within the same disk partition, `mv` simply invokes the `rename(2)` system call. The kernel modifies the directory mapping data structures. It updates the directory entry (the string name) pointing to the underlying inode, unlinks the old name, and updates timestamps. No actual file data blocks are read, copied, or written. This process operates in O(1) constant time, making moving a 50GB database instant. Furthermore, this operation is strictly **atomic**.

**Different Filesystems (The Copy & Delete):** If moving from `/dev/sda1` to `/dev/sdb1`, the kernel cannot share inodes across partition boundaries. `mv` detects the `EXDEV` (cross-device link) error. It falls back to invoking `read()` and `write()` system calls, physically copying every single byte of data to the new filesystem. Once the copy finishes completely, it invokes `unlink()` to delete the original source file. This operates in O(N) linear time and is non-atomic.

## Performance Notes

- As noted above, moving files across partition boundaries incurs severe disk I/O penalties and high latency proportional to the file size.
- When managing massive directories (e.g., moving a folder with 2 million files), moving the parent directory name is instant, but attempting to move `folder/*` forces the shell to expand 2 million arguments, which will crash the terminal with an `Argument list too long` error.

## Security Notes

- **Preservation of SetUID and ACLs:** Moving files across filesystems (which initiates a copy) may result in the loss of advanced extended attributes, ACLs, or SELinux contexts depending on the destination filesystem's mounting capabilities.
- **Symlink Hijacking Risks:** Moving directories that contain symbolic links requires strict attention to trailing slashes to prevent overwriting the symlink pointer itself instead of placing files inside the destination.

## Common Mistakes

- **Trailing slash ambiguity:** Running `mv mydir newdir` vs `mv mydir/ newdir`. **Why it's wrong:** If `newdir` exists, `mv mydir newdir` places `mydir` _inside_ `newdir`. If you use `--strip-trailing-slashes`, it behaves predictably, but trailing slashes natively confuse bash expansion and `mv` directory traversal logic.
- **Accidental mass overwrites:** Running `mv *.txt /dest` when `/dest` is accidentally not a directory. **Why it's wrong:** If `/dest` is missing, `mv` assumes you want to rename the file. It will move the first text file, then the second text file overwrites the first, and so on, destroying all files except the final one. Use `-t /dest` to strictly enforce directory targets.
- **Hanging on cross-device moves:** Moving a 100GB log file to a mapped NFS network drive and pressing `Ctrl+C` because it "froze". **Why it's wrong:** The command didn't freeze; it transitioned to a physical byte-copy process over the network. Interrupting it leaves a corrupted, half-copied file at the destination.

## Best Practices

- Always enforce the target directory explicitly using `mv -t /destination/file1 file2` when writing automation scripts. If the destination directory does not exist, the script will safely fail rather than silently destroying data via sequential overwrites.
- Adopt the habit of appending `-i` (interactive) or `-n` (no-clobber) when operating as the root user to prevent catastrophic accidental overwrites of critical configuration files like `/etc/passwd`.
- Leverage `-b` (backup) during hot-patch operations on production servers to guarantee automatic reversion states are preserved identically alongside the updated binaries.

## Interview Questions

**Q:** A developer runs `mv database.sql /mnt/external_drive/` and notices it takes 15 minutes to complete, whereas `mv database.sql /var/lib/mysql/` completes instantly. Explain the architectural reason for this behavior.
**A:** When moving data within the same filesystem (`/var/lib/mysql`), `mv` uses the `rename()` system call. The kernel simply alters the directory pointer to the inode, requiring zero data transfer (O(1) time). When moving to an external drive (`/mnt/`), it crosses a filesystem boundary. Inodes cannot span partitions, so `mv` must physically read, copy, and rewrite every byte of data to the new drive before deleting the source, incurring massive disk I/O overhead.
**Q:** What is the functional purpose of utilizing the `-t` (target directory) flag in automated bash scripts or `xargs` pipelines?
**A:** By default, `mv` expects the very last argument in the command string to be the destination directory. When piping dynamic lists of files via `xargs` or shell expansion, keeping the destination at the end is syntactically difficult. The `-t /dest` flag declares the destination upfront, allowing `xargs` to safely append an unlimited number of source files to the end of the command string.
**Q:** How do deployment systems exploit the behavior of the `mv` command to achieve zero-downtime binary updates on Linux?
**A:** On the same filesystem, renaming a file over an existing file is a strictly atomic operation implemented in the kernel. The application binary path is replaced instantaneously. Active processes holding an open file descriptor to the old binary continue executing from memory safely, while all subsequent connections instantly access the newly moved binary, eliminating the millisecond gap where the file might appear "missing."

## Practice Problems

**Problem:** Move all `.csv` files from the current directory into an existing `/data/processed/` directory, ensuring that if a file of the same name already exists in the destination, it is _not_ overwritten.
**Hint:** Combine the bash wildcard expansion with the no-clobber safety flag.
**Solution:** `mv -n *.csv /data/processed/` (The `-n` flag silently skips operations where the destination file already exists).
**Problem:** Rename the file `server.conf` to `production.conf`, but if `production.conf` already exists, force `mv` to create an automatic backup of it appended with a `.bak` suffix.
**Hint:** Use the backup flag in conjunction with the specific suffix flag.
**Solution:** `mv -b -S .bak server.conf production.conf` (This executes the rename, safely rotating the existing target to `production.conf.bak`).

## References

- [GNU Coreutils - mv invocation](https://www.gnu.org/software/coreutils/manual/html_node/mv-invocation.html)
- [Man Page for mv (Linux)](https://man7.org/linux/man-pages/man1/mv.1.html)
