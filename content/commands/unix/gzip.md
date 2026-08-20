---
slug: gzip
name: gzip
aliases:
  - gunzip
  - zcat
category: unix
tags:
  - linux
  - compression
  - archive
  - files
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - compress file with gzip
  - decompress gz file linux
  - gzip directory linux
  - view gz log file without extracting
  - extract tar.gz archive
relatedCommands:
  - tar
  - bzip2
  - xz
  - cpio
alternatives:
  - bzip2
  - xz
status: draft
---

## What is it?

`gzip` (GNU zip) is the definitive, historically ubiquitous file compression utility in Unix-like operating systems. It employs the DEFLATE algorithm—a combination of LZ77 dictionary-based encoding and Huffman coding—to reduce the byte size of files. Designed as a free, unencumbered replacement for the early UNIX `compress` program, it remains the absolute standard for rotating system logs, compressing HTTP web payloads, and distributing source code via `.tar.gz` archives.

## Why does it exist?

Disk space and network bandwidth were extraordinarily expensive in the 1990s. While tools like `zip` existed, they were encumbered by software patents and bundled multiple files into a single archive, violating the Unix philosophy of doing one thing well. `gzip` exists to provide a mathematically efficient, open-source compression engine that operates exclusively on streams and single files. By offloading directory archiving to `tar` and utilizing standard input/output pipes, `gzip` integrated perfectly into bash automation, becoming the undisputed backbone of Linux payload distribution.

## Syntax

```bash
gzip [options] [file...]
gunzip [options] [file...]
```

## Flags

| Flag                 | Description                                                                                                                                         | Example                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `-d`, `--decompress` | Reverses the operation, expanding a `.gz` file back to its original state. Identical to running `gunzip`.                                           | `gzip -d archive.gz`         |
| `-k`, `--keep`       | Keeps the original input file. By default, `gzip` permanently deletes the source file after compressing it.                                         | `gzip -k massive.log`        |
| `-c`, `--stdout`     | Writes the compressed (or decompressed) output strictly to standard output, preserving the original file.                                           | `gzip -c data.csv > data.gz` |
| `-f`, `--force`      | Forces compression or decompression even if the file has multiple hard links, or if the destination file already exists.                            | `gzip -f output.log`         |
| `-r`, `--recursive`  | Crawls directories recursively, compressing every single file it encounters individually (does not bundle them).                                    | `gzip -r /var/log/old/`      |
| `-t`, `--test`       | Verifies the structural integrity of a `.gz` file by checking its internal CRC32 checksum without writing data to disk.                             | `gzip -t backup.tar.gz`      |
| `-l`, `--list`       | Lists metadata for the `.gz` file, revealing the uncompressed size, compressed size, and total compression ratio.                                   | `gzip -l backup.gz`          |
| `-v`, `--verbose`    | Prints the exact name and percentage of space saved for every file processed.                                                                       | `gzip -v dataset.json`       |
| `-1` to `-9`         | Configures the compression ratio/speed tradeoff. `-1` is the fastest (least compression), `-9` is the slowest (best compression). Defaults to `-6`. | `gzip -9 production.sql`     |
| `-n`, `--no-name`    | Instructs `gzip` not to save the original filename and timestamp inside the `.gz` header, aiding in deterministic/reproducible builds.              | `gzip -n code.tar`           |

## Examples

```bash
gzip access.log
```

> The standard invocation. It reads `access.log`, mathematically compresses its contents, writes the binary payload to a new file named `access.log.gz`, and immediately executes an `unlink()` syscall to permanently delete the original `access.log` file.

```bash
gunzip database.sql.gz
```

> The standard extraction. Expands the payload, recreating `database.sql`, and deletes the `.gz` file. (This is fundamentally an alias for `gzip -d`).

```bash
gzip -k -v -9 huge_export.csv
```

> Archival compression. The `-9` flag forces the DEFLATE algorithm to spend maximum CPU cycles hunting for redundant strings to achieve the smallest possible file size. The `-k` flag ensures the original `huge_export.csv` is not deleted, providing a safety net. The `-v` flag prints a helpful status line: `huge_export.csv:  85.3% -- replaced with huge_export.csv.gz`.

```bash
tar -czvf backup.tar.gz /etc/nginx/
```

> The universal archiving pipeline. The `tar` utility aggregates the `/etc/nginx/` directory into a contiguous byte stream. The `-z` flag internally pipes that stream directly through `gzip`, resulting in the ubiquitous `.tar.gz` (or `.tgz`) Linux archive format in a single command.

```bash
cat web_requests.json | gzip -c > compressed_requests.gz
```

> Stream processing. `gzip` intercepts standard input. Because it is processing a stream, it has no original file to delete. The `-c` flag ensures the binary payload pushes to standard output, allowing safe redirection into the final archive file.

## Real-World Scenarios

**Log Rotation (logrotate)**

> The Linux `logrotate` daemon heavily relies on `gzip`. When `/var/log/syslog` reaches 100MB, the daemon renames it to `syslog.1`, restarts the syslog service, and blindly executes `gzip syslog.1`. This transforms the 100MB text file into a 5MB `.gz` file, allowing servers to keep months of historical telemetry without exhausting disk space.

**Reproducible CI/CD Builds**

```bash
tar -cf - my_app/ | gzip -n > app_release.tar.gz
```

> When building release artifacts, cryptographic hashes (like SHA256) are used for verification. By default, `gzip` injects the current timestamp into the header of the `.gz` file. This means compressing the exact same code twice results in two files with different SHA256 hashes. DevOps engineers use the `-n` (no-name) flag to suppress this metadata injection, ensuring the compressed artifact is mathematically deterministic and identical on every build.

## When should it NOT be used?

- **Modern High-Performance Infrastructure:** **`gzip` is technically obsolete for performance.** While ubiquitous, the modern `zstd` (Zstandard) algorithm created by Facebook drastically outperforms `gzip`. `zstd` offers superior compression ratios while decompressing multiple gigabytes per second, making `gzip` a bottleneck in cutting-edge data pipelines.
- **Maximum Archival Compression:** If your goal is storing a database backup on Amazon S3 Glacier where storage cost is paramount and CPU time doesn't matter, `gzip` falls short. Use `xz` (LZMA2), which achieves significantly denser compression ratios.
- **Pre-compressed Files:** **Do not run `gzip` on `.mp4`, `.jpg`, or `.zip` files.** These formats are already mathematically compressed. Running `gzip` will burn CPU, find zero repetitive patterns, and simply wrap the file in a `.gz` header, ultimately increasing the file size.

## Alternatives

- **`pigz` (Parallel Implementation of GZIP):** **The SMP upgrade.** A drop-in, fully compatible replacement for `gzip` that utilizes pthreads. It splits the input file into 128KB chunks and assigns them to multiple CPU cores, compressing a 10GB file natively 8x faster on an 8-core machine.
- **`zstd`:** **Best for modern enterprise scaling.** Unmatched speed-to-compression ratio, supporting real-time streaming pipelines.
- **`xz`:** **Best for maximum file size reduction.** Extremely slow, but achieves incredibly dense files.

## How it works internally

`gzip` is built on the DEFLATE algorithm, which executes a two-phase mathematical transformation.

1.  **LZ77 (Dictionary Coding):** `gzip` reads data into a 32-Kilobyte "sliding window" in RAM. As it encounters new text (e.g., the word "server"), it scans the previous 32KB of data. If it finds that exact string earlier in the window, it does not write the word "server" again. Instead, it writes a length-distance pair (e.g., "Go back 400 bytes, and copy 6 characters"). This aggressively eliminates redundant strings, heavily optimizing log files and repetitive JSON.
2.  **Huffman Coding (Entropy Coding):** After LZ77 replaces strings with pointers, `gzip` analyzes the resulting stream. It builds a binary tree. The most frequently occurring characters (like spaces or vowels) are assigned ultra-short 2-bit or 3-bit codes. Extremely rare characters are assigned long 12-bit codes.

Finally, `gzip` wraps this compressed payload in an 18-byte header containing a "Magic Number" (`1F 8B`) for OS identification, the original filename, and a timestamp. It appends a CRC32 (Cyclic Redundancy Check) hash to the end of the file. During decompression (`gunzip`), the engine recalculates the CRC32 hash and compares it to the appended hash, instantly throwing a fatal error if network corruption altered a single bit.

## Performance Notes

- **Single-Threaded Bottleneck:** Standard `gzip` is fundamentally single-threaded. Regardless of whether you execute it on a 2-core Raspberry Pi or a 64-core AWS EC2 instance, `gzip` will completely peg exactly one CPU core at 100% and leave the other 63 cores idle. Always install and alias `pigz` on heavy data-processing servers.

## Security Notes

- **Zip Bombs (Decompression Bombs):** Because `gzip` can represent massive strings of zeroes using tiny backward pointers, a malicious actor can craft a 10 Megabyte `.gz` file that mathematically expands into a 10 Petabyte file of null bytes. If a backend API unconditionally executes `gunzip` on user uploads into an unconstrained `/tmp` directory or RAM buffer, the server will instantly suffer an Out-of-Memory kernel panic or complete disk exhaustion.

## Common Mistakes

- **Using `-r` expecting a single archive**
  - _Mistake:_ Typing `gzip -r /home/user/documents/` to backup a folder.
  - _Why:_ `gzip` does not bundle files. The `-r` flag instructs `gzip` to crawl the directory and aggressively replace every single individual `.txt` or `.pdf` file with an individual `.txt.gz` file, destroying the original working directory structure. To bundle directories, you must use `tar -czf`.
- **Losing the original file**
  - _Mistake:_ Running `gzip production.sql` to test how small the file gets, then realizing the 50GB uncompressed database file is gone.
  - _Why:_ `gzip` assumes disk space is premium. It performs a destructive transformation by default. You must explicitly pass the `-k` (keep) flag to force it to retain the source data.

## Best Practices

- **Embrace `zcat` and `zgrep`:** Do not decompress logs just to search them. If you need to search an old rotated log, run `zgrep "ERROR" syslog.2.gz`. The `zgrep` wrapper streams the decompression transparently in RAM, executes the regex search, and never writes the massive uncompressed file back to the hard drive, preserving massive amounts of disk I/O.

## Interview Questions

**Q: You run `gzip app.log`. The command finishes. The file `app.log.gz` is created, but you notice the original `app.log` has been deleted from the directory. Why did this happen, and what flag must you use to prevent this deletion?**
**A:** By design, `gzip` is a transformative utility. It assumes that once a file is successfully compressed, the original uncompressed file is no longer needed, and it proactively calls `unlink()` to delete it to conserve disk space. To alter this behavior and retain the original file, you must append the `-k` (or `--keep`) flag.

**Q: Explain the structural difference between executing `gzip -r /my_folder` and `tar -czf archive.tar.gz /my_folder`.**
**A:** `gzip -r /my_folder` iterates through the directory and compresses every file _individually_ in place (e.g., turning `a.txt` into `a.txt.gz` and `b.txt` into `b.txt.gz`). It does not bundle them. `tar -czf /my_folder` utilizes the `tar` utility to concatenate all the files and the directory hierarchy into a single, continuous binary stream, and then pipes that single stream through `gzip` to compress it into one massive, unified `.tar.gz` archive artifact.

## Practice Problems

**Problem:** You are creating a reproducible CI/CD build script. You need to compress the file `compiled_binary.bin` using the absolute maximum compression ratio available to `gzip`. Crucially, you must instruct `gzip` to strip the timestamp metadata from the file header so the resulting `.gz` hash remains deterministic across builds.
**Hint:** Combine the flag for highest compression level with the flag that suppresses the name/timestamp.
**Solution:**

```bash
gzip -9 -n compiled_binary.bin
```

**Problem:** You have a compressed file named `archive.tar.gz` downloaded from a remote server. Before you execute a complex `tar` extraction pipeline, you want to mathematically test the internal CRC32 checksums of the `gzip` wrapper to ensure the file wasn't corrupted during the download, without actually extracting the tarball to disk.
**Hint:** Use the flag explicitly designed for integrity checking.
**Solution:**

```bash
gzip -t archive.tar.gz
```

## References

- [gzip(1) - Linux man page (GNU)](https://linux.die.net/man/1/gzip)
- [DEFLATE Compressed Data Format Specification (RFC 1951)](https://datatracker.ietf.org/doc/html/rfc1951)
