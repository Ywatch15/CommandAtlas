---
slug: split
name: split
aliases: []
category: cloud-cli
tags:
  - linux
  - file-management
  - coreutils
  - text-processing
  - archiving
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
  - split large file into smaller pieces
  - break file into chunks linux
  - split file by line count
  - divide file by size bash
  - chunk large csv file
relatedCommands:
  - cat
  - csplit
  - wc
alternatives:
  - csplit
status: draft
---

## What is it?

`split` is a POSIX-standard command-line utility used to divide a single, monolithic file into multiple smaller, more manageable pieces. It operates purely on byte counts or line counts, sequentially reading the input file and generating sequentially named output files (e.g., `xaa`, `xab`, `xac`) until the input stream is exhausted, allowing the original file to be flawlessly reconstructed later using `cat`.

## Why does it exist?

Before cloud storage and high-bandwidth networks, administrators frequently needed to transfer massive files (like database dumps or VM images) across heavily constrained mediums—such as 1.44MB floppy disks, FAT32 filesystems with 4GB file size limits, or restrictive email attachment limits. `split` exists to mathematically fragment these payloads. In modern distributed computing, `split` is heavily utilized to shard massive datasets (like multiterabyte CSVs or logs) into equal-sized chunks, allowing cluster computing frameworks (like Hadoop or GNU Parallel) to process the distinct fragments simultaneously across multiple CPU cores or separate worker nodes.

## Syntax

```bash
split [OPTION]... [FILE [PREFIX]]
```

## Flags

| Flag                       | Description                                                                                                                | Example                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `-b`, `--bytes=SIZE`       | Splits the file strictly by byte size (e.g., `K`, `M`, `G`, `T`). Cuts mid-line without hesitation.                        | `split -b 500M huge.tar`                                  |
| `-l`, `--lines=NUMBER`     | Splits the file by line count. Ensures textual integrity by never cutting a line in half.                                  | `split -l 10000 data.csv`                                 |
| `-C`, `--line-bytes=SIZE`  | Puts at most `SIZE` bytes of records per output file, ensuring it breaks exactly on a newline character within that limit. | `split -C 50M logs.txt`                                   |
| `-n`, `--number=CHUNKS`    | Divides the file into a specific number of equal-sized chunks, or generates a round-robin extraction.                      | `split -n 5 payload.dat`                                  |
| `-d`, `--numeric-suffixes` | Uses numeric suffixes (e.g., `x00`, `x01`) instead of the default alphabetical suffixes (`xaa`, `xab`).                    | `split -d -b 1G file.iso`                                 |
| `-a`, `--suffix-length=N`  | Specifies the length of the suffix. Defaults to 2. Increase this if generating more than 676 files.                        | `split -a 4 -l 100 file.txt`                              |
| `--additional-suffix`      | Appends a custom string or file extension to the end of the generated output files.                                        | `split -d -l 500 file.csv part_ --additional-suffix=.csv` |
| `--filter=COMMAND`         | Pipes each generated chunk directly into a shell command instead of writing a raw file to disk.                            | `split -b 1G file.tar --filter='gzip > $FILE.gz'`         |

## Examples

```bash
split -b 100M massive_backup.tar.gz backup_chunk_
```

> The standard binary fragmentation pattern. It divides the monolithic archive into 100-Megabyte slices. Instead of the default `x` prefix, the output files are named `backup_chunk_aa`, `backup_chunk_ab`, making them highly identifiable. They can be recombined using `cat backup_chunk_* > massive_backup.tar.gz`.

```bash
split -l 50000 -d -a 3 massive_export.csv batch_ --additional-suffix=.csv
```

> The professional data-sharding workflow. It splits a massive CSV exactly on newline boundaries, putting 50,000 lines into each file. It forces a numeric suffix of length 3 (`-d -a 3`), prefixes them with `batch_`, and explicitly appends `.csv`, resulting in perfectly formatted files like `batch_000.csv` ready for database ingestion.

```bash
split -n l/10 application.log
```

> Chunking by fraction. The `l/10` argument directs `split` to calculate the total size of `application.log`, divide it by 10, and generate exactly 10 output files. The `l/` prefix guarantees that the splits happen cleanly on newline characters, avoiding corrupted log entries spanning two files.

```bash
split -b 500M raw_data.dat --filter='gpg -c --passphrase "$PASS" > $FILE.gpg'
```

> In-flight processing. Instead of writing raw chunks to the disk (which doubles disk usage), the `--filter` flag intercepts each 500MB chunk in memory and streams it directly to `gpg`. The shell variable `$FILE` is dynamically populated by `split` with the chunk name, resulting in cleanly encrypted, separated payload artifacts on disk.

## Real-World Scenarios

**Parallelizing Network Uploads**

```bash
split -b 5G database_dump.sql db_part_
find . -name "db_part_*" | xargs -I {} -P 4 scp {} user@remote:/backups/
```

> Transferring a 50GB file over a high-latency WAN connection using a single `scp` TCP stream rarely saturates the available bandwidth due to sliding window limits. By using `split` to chunk the file into 5GB pieces, the administrator uses `xargs` to spawn 4 parallel SSH connections, massively accelerating the overall upload time.

**Bypassing S3/Object Storage Upload Limits**

```bash
tar -czf - /var/www | split -b 4G - backup.tar.gz.part_
```

> When backing up massive directories to legacy object storage buckets that enforce strict 5GB per-object upload limits (without complex multipart APIs), the `tar` command streams the archive directly into `split`. `split` intercepts standard input (`-`) and drops sequential 4GB files to the disk on the fly, safely circumventing the cloud limitations.

## When should it NOT be used?

- **Context-Aware Parsing:** **Do not use `split` to divide logs by date or error codes.** `split` is mathematically blind; it only counts bytes and lines. If you need a new file every time a regex pattern matches (like `=== 2023-10-01 ===`), you must use `csplit`.
- **JSON/XML Sharding:** **Do not use `split -l` on structured data.** Splitting a 10GB JSON array using `split -l 1000` will violently sever the JSON array brackets `[ ]` and object braces `{ }`, rendering every resulting file structurally invalid and un-parsable. You must use dedicated JSON streaming tools like `jq`.

## Alternatives

- **`csplit` (Context Split):** **Best for pattern-based chunking.** Allows splitting a file dynamically whenever a regular expression matches (e.g., splitting a `.pem` file into distinct certificates).
- **`tar -M` (Multi-volume):** **Best for tape drives and interactive archiving.** `tar` natively supports breaking archives into multi-volume parts, historically prompting the user to "insert the next tape" when the byte limit was reached.

## How it works internally

`split` is a heavily optimized, single-pass sequential reader.

When you run `split -b 1G file`, the utility invokes the `open()` system call on the source file and allocates an internal buffer (typically matching the page size or a heavily optimized chunk). It opens the first output file descriptor (e.g., `xaa`) using `open(O_CREAT | O_WRONLY | O_TRUNC)`.

It utilizes a `while` loop, executing `read()` from the source and `write()` to the destination. It maintains a running 64-bit integer tracking the total bytes written to the current output file. The absolute microsecond that the counter equals the requested boundary (1,073,741,824 bytes for 1GB), `split` halts the `write()`, issues a `close()` on `xaa`, increments its internal suffix state machine to generate the string `xab`, opens the new file descriptor, and resumes the `read()/write()` loop.

When using `-l` (lines), `split` operates identically, but inside the loop, it utilizes `memchr()` to scan the buffer array for newline characters (`\n`), incrementing a line counter and forcing the file closure specifically after the target newline is written. Because it only ever holds a tiny buffer in user-space RAM, `split` can slice a 5 Terabyte file using less than 2 Megabytes of memory.

## Performance Notes

- **Zero-Copy Limitations:** While `split` is extremely fast, it fundamentally involves reading bytes into user-space memory and writing them back to disk, doubling disk I/O. If you split a 100GB file on the same hard drive, you incur 100GB of read penalty and 100GB of write penalty simultaneously. For maximum performance, pipe standard input into `split` or write the output chunks to a completely separate physical disk array.

## Security Notes

- **Inode Exhaustion:** If an administrator incorrectly types `split -b 1 file.txt` (meaning 1 byte per file, instead of 1G) on a 2GB file, `split` will attempt to rapidly generate 2 billion individual files in the current directory. This will instantly exhaust the filesystem's inode allocation or crash the directory indexing tree, effectively taking the partition offline until the directory is purged.

## Common Mistakes

- **Exhausting the Suffix Space**
  - _Mistake:_ Splitting a 100GB file into 1MB chunks using `split -b 1M massive.dat`. The command fails halfway through with `split: output file suffixes exhausted`.
  - _Why:_ By default, `split` uses an alphabetical suffix length of 2 (`aa` to `zz`). This mathematically limits it to producing a maximum of $26 \times 26 = 676$ files. To generate more files, you must explicitly increase the suffix length using `-a 4` (allowing 456,976 files) or `-d -a 4` for numerics.
- **Corrupting the Recombination Order**
  - _Mistake:_ Generating numeric files `x1` to `x15`, and recombining them using `cat x* > final.dat`.
  - _Why:_ The shell expands the wildcard `x*` lexicographically, not numerically. The shell sorts the files as `x1, x10, x11... x2, x3`. `cat` concatenates them in this corrupted order, completely destroying the binary integrity of the file. _Always_ use `-d` with an appropriate `-a` length to generate zero-padded files (`x01`, `x02`), which sort perfectly.

## Best Practices

- **Always use `-d` and `-a`:** Eradicate the default alphabetical suffixes from your workflow. `split -d -a 3` generates `x000, x001`, which is universally understandable by other programmers and sorts flawlessly in every single programming language and shell expansion.
- **Use Explicit Prefixes:** Never rely on the default `x` prefix. If a script fails halfway through, identifying which files belong to `split` versus standard system files is dangerous. Always provide a prefix like `split_payload_`.

## Interview Questions

**Q: You want to split a massive CSV file into exactly 5 equal-sized files to distribute to 5 worker nodes. However, you absolutely cannot have a line cut in half, as it would corrupt the CSV rows. What `split` flag provides this specific behavior?**
**A:** You must use `-n l/5` (or `--number=l/5`). The `l/` modifier specifically instructs `split` to divide the file into 5 chunks based on byte size, but mathematically adjusts the exact split boundaries to ensure they strictly align with newline (`\n`) characters, preserving record integrity.

**Q: After using `split -b 1G database.tar chunk_`, you have 5 files named `chunk_aa` through `chunk_ae`. Write the absolute safest, most efficient shell command to reassemble these files into a single, identical `restored.tar` file.**
**A:** The standard and safest method is `cat chunk_* > restored.tar`. Because the default alphabetical suffixes (`aa`, `ab`, `ac`) are strictly length-bounded and inherently sort alphabetically in the exact sequential order they were generated, bash wildcard expansion feeds them to `cat` in the perfect reconstruction sequence.

## Practice Problems

**Problem:** You have a massive error log named `production.log`. You want to split it into chunks of exactly 50,000 lines each. You want the output files to be named `prod_log_00`, `prod_log_01`, etc. Write the command.
**Hint:** Use the lines flag, the numeric suffix flag, and provide the specific prefix.
**Solution:**

```bash
split -l 50000 -d production.log prod_log_
```

**Problem:** You are receiving a massive streaming payload from `curl` and piping it into `split`. You want `split` to chunk the incoming stream into 2 Gigabyte files, and you want to automatically append the `.gz.part` extension to every file generated. Write the command.
**Hint:** Read from standard input (`-`), use the byte size flag, and use the additional suffix flag.
**Solution:**

```bash
curl [http://example.com/huge.bin](http://example.com/huge.bin) | split -b 2G - --additional-suffix=.gz.part chunk_
```

## References

- [split(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/split)
- [GNU Coreutils Manual: split invocation](https://www.gnu.org/software/coreutils/manual/html_node/split-invocation.html)
