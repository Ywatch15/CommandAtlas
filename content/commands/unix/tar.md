---
slug: tar
name: tar
aliases: [tape archive]
category: unix
tags: [linux, archive, compression, backup, files]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'extract tar gz file linux'
  - 'create compressed archive'
  - 'list contents of tarball'
  - 'extract specific file from tar'
  - 'compress directory to tar.bz2'
relatedCommands: [gzip, xz, bzip2, cpio]
alternatives: [cpio]
status: draft
---

## What is it?

`tar` (Tape Archive) is the ubiquitous UNIX utility for collecting many files into one single continuous archive file (commonly called a "tarball"), and conversely, extracting them. It rigorously preserves absolute directory structures, file permissions, ownership metadata, and symbolic links, acting as the fundamental packaging format for open-source software distribution and system backups.

## Why does it exist?

In early UNIX architecture, backing up hundreds of scattered files to sequential-access magnetic tape drives was inefficient. The tape drive needed a single, continuous stream of bytes. `tar` was engineered to concatenate disparate files end-to-end, injecting 512-byte metadata headers between them so they could be reconstructed later. Crucially, `tar` exists separate from compression tools. The UNIX philosophy dictates that one tool does one thing well: `tar` strictly aggregates files, while tools like `gzip` or `xz` compress the resulting stream, providing unparalleled flexibility in archiving mathematics.

## Syntax

```bash
tar [MODE] [OPTIONS] [FILE...]
```

## Flags

| Flag / Mode        | Description                                                                                   | Example                                 |
| ------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| `-c`, `--create`   | (Mode) Creates a new archive from the specified files or directories.                         | `tar -cvf backup.tar /data`             |
| `-x`, `--extract`  | (Mode) Extracts the contents of an existing archive.                                          | `tar -xvf source.tar`                   |
| `-t`, `--list`     | (Mode) Lists the contents of an archive without actually extracting them.                     | `tar -tvf archive.tar.gz`               |
| `-f <file>`        | Specifies the archive filename to create or read from (mandatory for file I/O).               | `tar -xf target.tar`                    |
| `-v`, `--verbose`  | Verbose mode. Prints the filenames to standard output as they are processed.                  | `tar -cvf a.tar file1`                  |
| `-z`, `--gzip`     | Filters the archive through `gzip` for fast, standard compression (`.tar.gz`).                | `tar -czvf code.tar.gz src/`            |
| `-j`, `--bzip2`    | Filters the archive through `bzip2` for higher compression (`.tar.bz2`).                      | `tar -cjvf data.tar.bz2 /var`           |
| `-J`, `--xz`       | Filters the archive through `xz` (LZMA2) for maximum compression ratio (`.tar.xz`).           | `tar -cJvf root.tar.xz /`               |
| `-C <dir>`         | Changes the working directory _before_ performing the extract or create operation.            | `tar -xf app.tar -C /opt/`              |
| `-p`, `--preserve` | Strictly preserves exact file permissions, ACLs, and ownership on extraction (requires root). | `tar -xpvf backup.tar`                  |
| `--exclude=<pat>`  | Explicitly prevents files or directories matching the pattern from being archived.            | `tar -cvf app.tar --exclude="*.log" ./` |

## Examples

```bash
tar -xzvf latest_release.tar.gz
```

> This is the definitive extraction command. It Extracts (`-x`), filters the stream through Gzip (`-z`), prints the filenames to the screen Verbose (`-v`), and reads from the File (`-f`) named `latest_release.tar.gz`, unpacking it into the current directory.

```bash
tar -czvf project_backup.tar.gz ./project_folder
```

> This creates a standard compressed archive. It Creates (`-c`), compresses with Gzip (`-z`), is Verbose (`-v`), and targets the File (`-f`) `project_backup.tar.gz`, ingesting the entire `project_folder` recursively.

```bash
tar -tvf massive_database.tar.bz2 | grep "config"
```

> This performs a non-destructive audit. The `-t` (list) mode streams the internal manifest of the heavily compressed archive without unpacking a single byte to disk. Piping it to `grep` allows an administrator to instantly verify if a specific configuration file is buried inside the 50GB backup.

```bash
tar -xvf bundle.tar -C /usr/local/bin specific_tool.sh
```

> This is a surgical extraction. Instead of unpacking the entire archive, it explicitly extracts _only_ `specific_tool.sh`. Crucially, the `-C` flag redirects the extraction target directly into `/usr/local/bin`, bypassing the current working directory.

```bash
tar -cvf /dev/st0 /home/admin
```

> Demonstrating its original namesake, this archives the admin's home directory and streams the raw byte payload entirely uncompressed directly to the physical SCSI Magnetic Tape drive hardware (`/dev/st0`).

## Real-World Scenarios

**Building Docker Container Image Layers**

```bash
docker export my_container > filesystem.tar
# Later...
cat filesystem.tar | docker import - my_new_image
```

> OCI container orchestration relies fundamentally on tarballs. Tools like Docker export running container filesystems directly to flat `.tar` archives, which are later imported, stacked, and hashed to create lightweight, immutable base images.

**Executing Secure System-Level Migrations**

```bash
sudo tar -cvpf - --exclude=/proc --exclude=/sys --exclude=/dev / | ssh root@10.0.0.5 "tar -xvpf - -C /mnt/new_disk"
```

> Systems engineers execute absolute server clones across the network without writing intermediate files. The first `tar` archives the entire root filesystem (preserving critical permissions via `-p`, and intelligently excluding virtual memory filesystems). The `-f -` flag pipes the binary stream directly into SSH, where the receiving `tar` instantly unpacks the stream onto the newly attached storage disk.

## When should it NOT be used?

- **Archiving files for Windows users:** **Reason:** Windows natively understands `.zip` files. While Windows 10+ added `tar` support, sending a `.tar.gz` to non-technical users creates extreme friction. **Use instead:** `zip` and `unzip`.
- **Extracting a single file from a 50GB solid `.tar.xz` archive:** **Reason:** Because `tar` is a sequential stream, it has no central index directory. To extract the very last file in a 50GB `tar.xz`, the utility must decompress and mathematically evaluate the entire 50GB stream linearly. **Use instead:** `zip` format, which possesses a random-access central directory.

## Alternatives

- **`zip` / `unzip`:** The commercial standard. **Tradeoff:** `zip` inherently combines archiving and compression into a single mathematical pass and supports random-access extraction. However, the legacy `.zip` format destroys strict Linux ownership, permissions, and soft-link metadata, making it catastrophic for system backups.
- **`rsync`:** Network synchronization. **Tradeoff:** If the goal is moving 1,000 files to another server, `rsync` mathematically transfers only the changed bytes over the network, whereas `tar` blindly wraps and transmits the entire payload.
- **`cpio`:** POSIX archiver. **Tradeoff:** Historically used for RPM packages and initial RAM disks (`initramfs`). Functionally similar to `tar`, but relies entirely on receiving file lists from `find` via standard input rather than navigating directories itself.

## How it works internally

The `tar` utility relies on the POSIX `ustar` (or modern GNU/pax) format specification.

Unlike a database or a ZIP file, a tarball contains no master index at the beginning or end of the file. It is a strictly linear, concatenated byte stream.

When `tar` archives a file, it first writes a 512-byte header block to the stream. This header contains strictly formatted ASCII strings dictating the file's name, size, user ID, group ID, octal permission mode (e.g., `0644`), and a checksum. Immediately following this 512-byte header, `tar` writes the raw binary payload of the file, padding the absolute end of the file with null bytes (`\0`) to ensure it aligns perfectly with a 512-byte block boundary. It then writes the header for the next file. At the absolute end of the archive, `tar` writes two consecutive 512-byte blocks of pure zeroes to signify EOF.

Because `tar` knows nothing about compression, passing `-z` (gzip) or `-J` (xz) causes the `tar` binary to automatically `fork()` a child process of the specified compression utility. `tar` builds the 512-byte blocks and pipes them through memory into the compressor, which executes its mathematical dictionary algorithms and writes the finalized, compressed byte stream to the disk.

## Performance Notes

- **Compression Asymmetry:** The `-z` (gzip) flag is fast but yields moderate compression. The `-J` (xz) flag utilizes the LZMA2 algorithm, providing extreme compression ratios (often 30% smaller than gzip), but requires significantly more RAM and executes exponentially slower.
- **Multithreading:** Standard `tar` compression pipelines are strictly single-threaded. To utilize modern multi-core processors on massive archives, you must utilize external threaded tools: `tar -cvf - /data | pigz > backup.tar.gz`.

## Security Notes

- **Tar Slip (Directory Traversal) Vulnerability:** A maliciously crafted `.tar` file can contain headers dictating arbitrary extraction paths like `../../../../etc/shadow`. Historically, extracting this archive would overwrite critical host OS files. Modern GNU `tar` mitigates this by aggressively stripping absolute leading slashes (`/`) and explicitly rejecting parent directory traversals (`../`) during extraction, though exploiting older versions or poorly written parsers remains a severe threat.
- **Untrusted Archive Execution:** Never execute `tar -xvf` as `root` on an archive downloaded from an untrusted source. `tar` restores exact file ownership and SetUID permission bits (`-p`) if run as root. A malicious archive could drop a hidden bash binary with the root SetUID bit enabled into your `/tmp` directory, granting any unprivileged user instant root access.

## Common Mistakes

- **Creating a "Tar Bomb":** Running `tar -xvf source_code.tar.gz` and suddenly discovering 5,000 files dumped directly into your clean `~/Downloads` directory. **Why it's wrong:** The archive creator failed to place the files inside a top-level directory before creating the archive. Always run `tar -tvf` (list) first to verify if the archive is self-contained.
- **Screwing up the flag order:** Running `tar -cvzf backup.tar /data`. **Why it's wrong:** The `-f` flag expects the absolute next argument to be the filename. Passing `-cvzf` means the filename must follow immediately. If you type `tar -cvfz backup.tar`, `tar` will interpret `z` as the filename, create an archive named `z`, and attempt to parse `backup.tar` as an input directory, throwing fatal errors. Keep `f` at the absolute end of the cluster.
- **Forgetting to exclude the archive itself:** Running `tar -cvf backup.tar /folder`. If `backup.tar` is created _inside_ `/folder`, `tar` will eventually try to archive the archive it is currently creating, resulting in infinite recursive loops or "file changed as we read it" corruption warnings.

## Best Practices

- Universally append the `-p` (preserve) flag and execute via `sudo` when restoring full system backups or web-server `var/www` directories. Without `-p`, extracted files adopt the `umask` and ownership of the user running the command, instantly breaking Nginx or database access rights.
- When executing surgical file extractions from an archive, you must specify the exact path exactly as it appears in the `tar -tvf` output. If the manifest says `src/main.c`, extracting `main.c` will fail; you must request `tar -xf app.tar src/main.c`.
- Memorize the `czvf` (Create Ze Verbose File) and `xzvf` (eXtract Ze Verbose File) acronyms. It is the universally accepted muscle-memory pattern for interacting with tarballs across the global UNIX community.

## Interview Questions

**Q:** What is the fundamental architectural reason why a developer cannot easily extract the very last file from a 10GB `.tar.gz` archive without waiting several minutes, whereas extracting a file from a 10GB `.zip` file is nearly instantaneous?
**A:** A `.zip` file is structurally a random-access archive. It contains a "Central Directory" at the absolute end of the file containing exact byte offsets for every compressed payload. The utility jumps straight to the offset and extracts the file. A `.tar.gz` is a single, continuous, sequentially compressed stream. It lacks an index. To find the last file, the utility must uncompress and sequentially scan every single 512-byte `tar` header sequentially through the entire 10GB payload until it locates the target filename.
**Q:** A developer runs `tar -cvf backup.tar /etc/nginx`. A warning appears stating: `tar: Removing leading '/' from member names`. Why does `tar` execute this behavior by default, and what security exploit does it prevent?
**A:** By default, GNU `tar` strips absolute paths (leading slashes) to make the archive relative. If `tar` preserved the absolute `/etc/nginx` path, and a user downloaded the archive and extracted it, `tar` would violently overwrite the user's actual host system `/etc/nginx` configurations. Stripping the slash ensures the archive extracts safely into the user's current working directory (e.g., `./etc/nginx`), neutralizing accidental overwrites or malicious "Tar Slip" directory traversal attacks.
**Q:** Explain the mechanical execution pipeline when an administrator types `tar -czvf code.tar.gz ./src`. How does `tar` interact with `gzip`?
**A:** The `tar` utility itself possesses no mathematical compression algorithms. When the `-z` flag is supplied, `tar` executes a `fork()` system call to spawn the external `gzip` binary. `tar` builds the 512-byte POSIX headers and payload blocks in memory, and writes them directly into an inter-process pipe connected to the `gzip` child process. `gzip` executes the LZ77 deflation math on the stream and writes the final compressed byte payload to the target file.

## Practice Problems

**Problem:** Create a highly compressed archive using LZMA2 (`xz`) algorithms of the `/opt/app` directory. Ensure the target file is named `app_release.tar.xz`, display the files as they are processed, and explicitly exclude any directories named `.git`.
**Hint:** Combine the create, xz, verbose, and file flags in the correct order, and utilize the long-form exclusion parameter.
**Solution:** `tar -cJvf app_release.tar.xz --exclude=".git" /opt/app` (This builds a pristine, repository-free release payload).
**Problem:** Extract the contents of `database_backup.tar.gz` entirely, but force the extraction to drop the files into the `/mnt/recovery/` directory instead of your current location. Maintain the exact user ownership and permissions originally stored in the archive.
**Hint:** Chain the extraction, gzip, file, and preserve flags, and append the specific change-directory switch.
**Solution:** `sudo tar -xzvpf database_backup.tar.gz -C /mnt/recovery/` (The `sudo` and `-p` combination guarantees perfect metadata preservation across the target volume).

## References

- [GNU Tar Manual](https://www.gnu.org/software/tar/manual/tar.html)
- [POSIX Standard - pax (tar successor)](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pax.html)
  === END FILE ===
