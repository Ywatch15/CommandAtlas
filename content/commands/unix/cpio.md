---
slug: cpio
name: cpio
aliases: [copy in out]
category: unix
tags: [linux, archive, backup, files]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'create cpio archive from find output'
  - 'extract cpio archive linux'
  - 'list files inside cpio archive'
  - 'pass file list to archiver bash'
  - 'backup files from find command'
relatedCommands: [tar, find, gzip]
alternatives: [tar]
status: draft
---

## What is it?

`cpio` (Copy In/Out) is a legacy, POSIX-standard archival utility. It is designed to pack and unpack collections of files into a single, contiguous binary stream or archive file. Unlike `tar`, which was built to archive entire directories blindly onto magnetic tape, `cpio` operates strictly on streams: it accepts an exact list of file paths via standard input and generates the archive to standard output, offering unparalleled programmatic control over exactly which files are included or excluded from the resulting package.

## Why does it exist?

While `tar` dominates modern archiving, it historically struggled with complex file selection and preserving intricate filesystem structures like device nodes, sockets, and exact hard-link topologies. `cpio` exists to integrate perfectly with the Unix philosophy of pipelines. By relying on tools like `find` to dynamically generate the list of files, `cpio` acts purely as the packing engine. This architectural separation made it the absolute standard for low-level system packaging. It remains the underlying format for Red Hat RPM packages (`rpm2cpio`) and is the mandatory, hardcoded archive format used by the Linux kernel for the `initramfs` (Initial RAM Filesystem) boot image.

## Syntax

```bash
# Copy-out (Create archive)
find ... | cpio -o [options] > archive.cpio

# Copy-in (Extract archive)
cpio -i [options] < archive.cpio

# Pass-through (Copy directory structure)
find ... | cpio -p [options] destination_dir
```

## Flags

| Flag                                 | Description                                                                                                                             | Example                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `-o`, `--create`                     | "Copy-out" mode. Creates a new archive. Reads a list of filenames from standard input and writes the archive stream to standard output. | `find . \| cpio -o > out.cpio` |
| `-i`, `--extract`                    | "Copy-in" mode. Extracts files from a `cpio` stream provided via standard input into the current directory.                             | `cpio -i < in.cpio`            |
| `-p`, `--pass-through`               | Copies files directly from one directory tree to another, bypassing the creation of an intermediate archive file entirely.              | `find . \| cpio -p /dest`      |
| `-v`, `--verbose`                    | Lists the names of the files processed. Combining with `-t` creates a table of contents similar to `ls -l`.                             | `cpio -iv < data.cpio`         |
| `-d`, `--make-directories`           | Instructs `cpio` to dynamically create any necessary parent directories during extraction if they do not currently exist.               | `cpio -id < out.cpio`          |
| `-m`, `--preserve-modification-time` | Retains the original modification timestamps of the files being extracted, rather than applying the current extraction time.            | `cpio -idm < archive.cpio`     |
| `-H <FORMAT>`, `--format`            | Specifies the header format to use (e.g., `bin`, `crc`, `newc`). Modern Linux initramfs strictly requires the `newc` format.            | `cpio -H newc -o > initrd`     |
| `-t`, `--list`                       | Parses the archive stream and prints the table of contents (filenames) without actually extracting any data to the disk.                | `cpio -it < archive.cpio`      |
| `-F <FILE>`, `--file`                | Explicitly reads from or writes to the specified file, bypassing standard input/output redirection.                                     | `cpio -i -F archive.cpio`      |
| `--quiet`                            | Suppresses the final output message detailing the number of blocks copied, ensuring clean pipeline execution.                           | `cpio -o --quiet > file`       |

## Examples

```bash
find . -depth -print | cpio -o > backup.cpio
```

> The standard archival pattern. `find` recursively lists every file and folder in the current directory. `cpio` receives this list, opens the files, encodes their attributes into headers, and streams the concatenated binary payload into `backup.cpio`.

```bash
cpio -idv < backup.cpio
```

> The standard extraction pattern. `cpio` reads the archive from standard input. It extracts the files (`-i`), automatically creates any missing parent directories (`-d`), and prints each extracted filename to the terminal (`-v`).

```bash
find . -name "*.txt" -print0 | cpio -o -H newc -0 > text_files.cpio
```

> Modern, secure archiving. It uses `find -print0` to output filenames separated by null bytes (`\0`), preventing filenames with spaces or newlines from shattering the archive. `cpio` uses `-0` to accept the null-separated list, and encodes the archive using the modern `newc` SVR4 format to support large inodes.

```bash
rpm2cpio my-package.rpm | cpio -idmv
```

> The forensic RPM extraction pipeline. An `.rpm` file is fundamentally an envelope surrounding a `cpio` payload. The `rpm2cpio` utility strips the RPM metadata, piping the raw `cpio` stream directly into the extraction command, allowing the administrator to unpack the software directly into the local directory without installing it globally.

```bash
find /etc/nginx -depth -print | cpio -pdm /backup/nginx_conf/
```

> The pass-through copy. Instead of generating a `.cpio` file, this command reads the files from `/etc/nginx` and physically replicates them inside `/backup/nginx_conf/`. It aggressively preserves exact hard links, ownership, and timestamps (`-m`), making it a highly robust alternative to `cp -a` for complex system directory cloning.

## Real-World Scenarios

**Modifying the Linux Initramfs**

```bash
# Decompress and extract
zcat /boot/initramfs-linux.img | cpio -idm

# ... inject custom drivers or rescue scripts ...

# Re-pack and compress
find . | cpio -H newc -o | gzip -9 > /boot/initramfs-custom.img
```

> The `initramfs` is the lifeblood of Linux booting. It is mathematically required to be a gzipped `cpio` archive using the `newc` header format. Platform engineers use this exact sequence to unpack the boot image, inject custom RAID controller drivers, and repackage it, enabling the kernel to successfully mount exotic enterprise storage arrays during the initial boot phase.

## When should it NOT be used?

- **General User Archiving:** **Do not use `cpio` to send files to coworkers.** `cpio` is a low-level systems tool. Its requirement for external `find` piping makes it unergonomic, and Windows/macOS users will struggle to extract it natively. Always use `tar -czf` or `zip` for human-facing archives.
- **Compression without pipes:** `cpio` has absolutely no built-in compression algorithms. It strictly aggregates bytes. You cannot type `cpio -z` like you can with `tar`. You must manually pipe the output through `gzip` or `zstd` (e.g., `cpio -o | gzip > archive.cpio.gz`).

## Alternatives

- **`tar`:** **Best for daily use.** Syntactically easier (it crawls directories natively without needing `find`), features built-in compression flags, and is the absolute universal standard for open-source distribution.
- **`rsync`:** **Best for directory cloning.** If using `cpio -p` to clone a directory, `rsync -a` is vastly superior as it supports delta-transfers, resumability, and network transport.
- **`pax`:** **The POSIX successor.** `pax` was designed by the POSIX committee to unify `tar` and `cpio` into a single, cohesive command with standard flags, though it never achieved the widespread popularity of `tar`.

## How it works internally

`cpio` operates as a pure stream processor. It does not load files into memory; it reads a file, writes its header, streams its payload, and moves to the next file.

The core of `cpio` is the header structure. When `cpio -o` reads a filepath string (e.g., `./doc.txt`), it executes the `lstat()` system call to gather the file's metadata.

It constructs a binary header block. In the modern `newc` format (SVR4 cpio), this header is an ASCII representation of hexadecimal values containing the inode number, file mode (permissions), UID, GID, mtime, file size, and the length of the filename string.

It writes this header to `stdout`, writes the filename string itself, pads the stream with null bytes to ensure 4-byte architectural alignment, and finally invokes a `read/write` loop to push the actual raw binary bytes of the file's payload into `stdout`. It pads the end of the payload, and repeats for the next file.

At the end of the input stream, `cpio` explicitly writes a special termination header with the magic filename `TRAILER!!!`. During extraction (`cpio -i`), the engine reads the stream, parses the headers to recreate the files using `open()` and `chmod()`, and halts cleanly when it intercepts the `TRAILER!!!` magic string.

## Performance Notes

- **I/O Bound Pipeline:** Because `cpio` relies heavily on `find` for input and `gzip` for output, the performance is almost entirely dictated by disk I/O and the CPU efficiency of the compression algorithm in the pipeline. The `cpio` aggregation step itself has virtually zero overhead.

## Security Notes

- **Directory Traversal (Zip Slip):** Historically, if a malicious `cpio` archive was crafted containing files with absolute paths (e.g., `/etc/passwd`) or deeply nested relative paths (`../../../../etc/shadow`), running `cpio -i` as root would blindly follow those paths and overwrite critical host system files. Modern versions of GNU `cpio` (since ~2015) default to `--no-absolute-filenames` to mitigate this, stripping leading slashes, but caution is still required when extracting untrusted RPMs or archives.

## Common Mistakes

- **Forgetting `-d` on extraction**
  - _Mistake:_ Running `cpio -i < archive.cpio`. The terminal floods with "No such file or directory" errors.
  - _Why:_ Unlike `tar`, `cpio` is ruthlessly minimal. It attempts to extract a file like `src/app.py`. If the `src` directory does not physically exist in your current folder, `cpio` refuses to create it and the extraction fails. You must _always_ supply the `-d` (make directories) flag during extraction: `cpio -id < archive.cpio`.
- **Passing directories instead of files**
  - _Mistake:_ `echo "/var/log" | cpio -o > out.cpio`.
  - _Why:_ `cpio` does not recurse natively. If you pass a directory string, `cpio` creates an archive containing exactly one item: an empty directory node named `/var/log`. It completely ignores the files inside it. You must use `find /var/log` to list every internal file explicitly.
- **Whitespace Fragmentation**
  - _Mistake:_ Using standard `find | cpio` when filenames contain spaces or newlines.
  - _Why:_ The pipeline passes strings. If a file is named `bad \n file.txt`, `cpio` perceives this as two separate file requests, crashes attempting to find them, and corrupts the archive. Always use `find . -print0 | cpio -0 -o`.

## Best Practices

- **Always use the `newc` format:** The legacy default `bin` (binary) format in `cpio` utilizes 16-bit fields for inode numbers. Modern Linux filesystems regularly exceed 65,535 inodes. Attempting to use the default format will crash `cpio` with `inode number out of range`. Always append `-H newc` to utilize the modern SVR4 32-bit format.

## Interview Questions

**Q: A developer needs to modify the Linux initial ramdisk (`initramfs`). They successfully extract the image using `cpio -id < initramfs.img`. They add a new script, and pack it back up using `tar -czf new_initramfs.img ./*`. When they reboot the server, the kernel panics and fails to boot. Why?**
**A:** The Linux kernel's early boot loader is hardcoded to specifically decompress and parse the `cpio` format (specifically the `newc` header format). The kernel does not contain the code required to parse a `tar` header structure. By using `tar` to repackage the archive instead of `cpio -H newc -o`, the developer generated an incompatible byte-stream that the kernel mathematically could not read, resulting in a catastrophic failure to mount the root environment.

**Q: Explain the structural difference between how `tar` and `cpio` process an instruction to archive a directory.**
**A:** `tar` is fully autonomous. When given a directory path, `tar` contains internal recursive logic; it will independently open the directory, crawl the subdirectories, map all the files, and build the archive. `cpio` is a passive stream processor. It possesses zero recursive logic. It must be explicitly fed a line-by-line list of absolute or relative file paths via `stdin` (usually generated by `find`). If fed a directory path, `cpio` will only archive the directory node itself, completely ignoring its contents.

## Practice Problems

**Problem:** You are given a file named `payload.cpio`. You need to extract all files from it into the current directory. You must ensure that the command automatically creates any missing parent directories, and you want to see the names of the files printed to the terminal as they extract.
**Hint:** Use standard input redirection to feed the file into the extract command, and combine the flags for extract, make-directories, and verbose.
**Solution:**

```bash
cpio -idv < payload.cpio
```

**Problem:** You need to create an archive of all `.conf` files in `/etc/`. You want to generate a `find` command that outputs the files, pipe it to `cpio`, and output the archive to `configs.cpio`. Critically, you must use the modern SVR4 header format to prevent inode overflow errors.
**Hint:** Use `find` to isolate `.conf` files. Pipe to `cpio` using copy-out mode and the specific Header format flag.
**Solution:**

```bash
find /etc -name "*.conf" | cpio -o -H newc > configs.cpio
```

## References

- [cpio(1) - Linux man page (GNU)](https://linux.die.net/man/1/cpio)
- [Linux Kernel Initramfs Documentation](https://www.kernel.org/doc/html/latest/filesystems/ramfs-rootfs-initramfs.html)
