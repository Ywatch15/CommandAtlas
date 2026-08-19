---
slug: xz
name: xz
aliases: [unxz, xzcat, lzma]
category: unix
tags: [linux, compression, archive, files, lzma]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'compress file with xz maximum ratio'
  - 'decompress tar.xz archive'
  - 'xz multithreaded compression -T0'
  - 'xz decompress keep original file'
  - 'xz compress level'
relatedCommands: [tar, gzip, bzip2]
alternatives: [gzip, bzip2]
status: draft
---

## What is it?

`xz` is a robust, modern data compression utility utilizing the Lempel-Ziv-Markov chain-Algorithm (LZMA2). It serves as the direct, mathematically superior successor to `bzip2` and `gzip`, delivering profoundly high compression ratios (yielding significantly smaller files) at the direct expense of increased CPU and RAM utilization during the compression phase.

## Why does it exist?

As source code repositories, kernel images, and database dumps scaled into the gigabyte and terabyte ranges, network bandwidth and storage costs became critical bottlenecks. `gzip` was incredibly fast but offered poor compression ratios. `bzip2` offered better ratios but was agonizingly slow. `xz` exists to maximize the absolute compression threshold. By implementing massive dictionary sizes (up to 4GB) and advanced Markov chain probability modeling, it routinely shrinks files 30% smaller than `gzip`. Furthermore, it was explicitly architected with _asymmetry_: compressing data is mathematically expensive, but decompressing data is blisteringly fast and requires very little RAM, making it the perfect format for software distribution.

## Syntax

```bash
xz [options] [file...]
unxz [options] [file...]
```

## Flags

| Flag                              | Description                                                                                                  | Example                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `-d`, `--decompress`              | Forces decompression mode (identical to running `unxz`).                                                     | `xz -d backup.sql.xz`    |
| `-k`, `--keep`                    | Prevents `xz` from automatically deleting the original file after the operation completes.                   | `xz -k massive_log.txt`  |
| `-t`, `--test`                    | Tests the integrity of the compressed file by decoding it in memory, without writing to disk.                | `xz -t payload.xz`       |
| `-l`, `--list`                    | Parses the archive metadata, displaying the exact compression ratio and original byte sizes.                 | `xz -l archive.xz`       |
| `-0` through `-9`                 | Sets the compression level. `-0` is fastest, `-9` provides the maximum compression ratio (defaults to `-6`). | `xz -9 deep_archive.tar` |
| `-e`, `--extreme`                 | Instructs the LZMA2 engine to utilize exponentially more CPU time to squeeze out fractional ratio gains.     | `xz -9e database.sql`    |
| `-T <threads>`, `--threads=<num>` | Enables multi-threading. Specifies the number of concurrent CPU cores to utilize (`0` uses all available).   | `xz -T 0 data.img`       |
| `-c`, `--stdout`                  | Forces the output (compressed or decompressed) to standard output, enabling pipeline chaining.               | `xz -c file > file.xz`   |
| `-q`, `--quiet`                   | Suppresses warnings; specifying twice suppresses error messages as well.                                     | `xz -q temp.txt`         |
| `-v`, `--verbose`                 | Displays a live, dynamic progress indicator detailing time elapsed and current compression ratio.            | `xz -v big_file.bin`     |

## Examples

```bash
xz access.log
```

> This is the default execution. The utility reads `access.log`, compresses it using the default Level 6 dictionary configuration, writes the output to `access.log.xz`, and _permanently deletes_ the original `access.log` file from the disk to save space.

```bash
xz -d backup.tar.xz
```

> This initiates decompression (`-d`). It reads the `xz` payload, recreates the original `backup.tar` file, and deletes the `.xz` archive. (Note: Typing `unxz backup.tar.xz` executes the exact same underlying logic).

```bash
xz -k -T 0 -9 database_dump.sql
```

> This represents a highly aggressive, modernized execution. It preserves the original file (`-k`), maxes out the compression mathematics (`-9`), and utilizes every single available CPU core on the machine (`-T 0`) to drastically accelerate the otherwise slow LZMA2 processing time.

```bash
xz -l ubuntu_rootfs.tar.xz
```

> This acts as an instantaneous metadata probe. Instead of decompressing the gigabytes of data, it reads the internal `xz` file headers, cleanly outputting a table showing the uncompressed size, compressed size, and exact compression ratio (e.g., `0.235`, meaning the file was shrunk to 23.5% of its original size).

```bash
cat massive_stream.json | xz -c > compressed_stream.json.xz
```

> This utilizes pipeline architecture. The `-c` flag forces `xz` to write its binary payload directly to standard output rather than attempting to write a file. This is mandatory when `xz` receives data from standard input, routing the output perfectly into the bash redirection operator.

## Real-World Scenarios

**Distributing Minimal Container Base Images**

```bash
tar -cvf - / | xz -9e -T 0 > /mnt/build/alpine_rootfs.tar.xz
```

> OS developers packaging raw filesystems for Docker image registries pipeline `tar` directly into `xz`. They invoke the "extreme" (`-e`) flag because they are compiling the image once. The extra 30 minutes of CPU time spent compressing yields a file 10MB smaller, which saves petabytes of bandwidth globally when downloaded millions of times by end-users.

**Rapid Log Rotation and Archival**

```bash
find /var/log/app -name "*.log.1" -exec xz -T 2 {} +
```

> SREs managing server health use `find` to isolate rotated logs. By passing them to `xz`, they reclaim vastly more expensive SSD storage space than `gzip` could achieve, explicitly capping the threads (`-T 2`) to ensure the compression background task doesn't inadvertently starve the production web server of CPU cycles.

## When should it NOT be used?

- **Real-time network streaming/RPC payloads:** **Reason:** The LZMA2 algorithm demands extreme CPU cycles and buffering time to build its complex dictionaries. Using it to compress live gRPC traffic or websocket data introduces unacceptable, multi-second latency. **Use instead:** `zstd` (Zstandard) or `lz4`, which prioritize real-time bandwidth speeds over maximum ratio.
- **Compressing images, video, or audio files:** **Reason:** Media files (JPEG, MP4, MP3) are already mathematically compressed via complex algorithms (like H.264). Running `xz` on an MP4 file will consume 100% CPU for an hour and result in an output file that is often _larger_ than the original.

## Alternatives

- **`zstd` (Zstandard):** The modern rival. **Tradeoff:** `zstd` (developed by Facebook) is mathematically engineered for speed. It decompresses 3x to 5x faster than `xz` and compresses significantly faster, trading off a very negligible fraction of `xz`'s absolute maximum compression ratio. It is rapidly becoming the new industry standard.
- **`gzip`:** The legacy standard. **Tradeoff:** Universally installed on every computing device on earth since 1992. Yields poor compression compared to `xz`, but its ubiquitous nature guarantees cross-platform compatibility without installing external packages.
- **`bzip2`:** The obsolete predecessor. **Tradeoff:** Utilizes Burrows-Wheeler block sorting. Slower to decompress than `xz` and yields worse ratios. Entirely superseded by `xz` in the open-source community.

## How it works internally

`xz` relies on the **LZMA2** (Lempel-Ziv-Markov chain-Algorithm) compression engine.

Unlike traditional `gzip` (which uses a small, rigid 32KB sliding window), `xz` relies on massive, configurable dictionaries (up to 4 Gigabytes in size). When compressing, the engine loads massive chunks of the file into RAM. It scans the data, identifying incredibly long, complex repeating byte sequences, and replaces those sequences with microscopic mathematical pointers referencing the dictionary block.

The Markov chain probability modeling predicts the likelihood of specific bits appearing next based on previous bits, allowing it to mathematically squash the binary representation of the data down to theoretical limits.

This creates the hallmark asymmetry of `xz`. Squeezing the data (Compression) requires the CPU to search massive RAM dictionaries, creating intense resource bottlenecks. However, expanding the data (Decompression) is trivial: the CPU simply reads the pointers, looks up the exact sequence in the dictionary, and dumps it to disk. Decompression requires almost zero math and uses a fraction of the RAM required to compress.

## Performance Notes

- **The RAM Trap:** The `-9` flag commands `xz` to use a 64MB dictionary. When using `-T 0` on a 16-core machine, `xz` spins up 16 independent compression threads, _each_ requiring its own 64MB dictionary and massive overhead buffers. Executing `xz -T 0 -9` on a 16-core machine can violently consume over 10GB of RAM instantly, crashing constrained servers via the OOM Killer.
- **Extreme Limits:** The `-e` (extreme) modifier rarely improves compression by more than 1%, but drastically increases compression time. It alters the underlying LZMA2 parser to search deeper into the history buffer for edge-case string matches.

## Security Notes

- **The XZ Backdoor (CVE-2024-3094):** In early 2024, a highly sophisticated, multi-year supply chain attack successfully injected a malicious payload directly into the upstream `xz` library code (liblzma). The backdoor explicitly targeted OpenSSH (`sshd`), which linked against `liblzma` for systemd notification support. It allowed the attacker to bypass authentication and execute remote code via malformed RSA certificates. It is an industry-defining example of the immense security risk inherent in ubiquitous, low-level compression libraries. Always ensure `xz-utils` is patched to a secure version.

## Common Mistakes

- **Losing the original file:** Running `xz backup.tar`. **Why it's wrong:** By default, UNIX compression tools are destructive. They replace the file on disk to save space. If you meant to create a copy and keep the original, you must use the `-k` (keep) flag, or your original uncompressed artifact is gone forever.
- **Using `tar -czvf` expecting XZ compression:** **Why it's wrong:** Muscle memory often dictates `tar -czvf`. The `-z` flag invokes `gzip`. To invoke `xz`, you must use the capital `-J` flag (`tar -cJvf file.tar.xz`).
- **Compressing already compressed archives:** Running `xz backup.tar.gz`. **Why it's wrong:** You are applying LZMA2 math to an already obfuscated `gzip` byte stream. The entropy is maximized. It wastes CPU time and achieves zero reduction in size. You must decompress the `.gz` first, or compress the raw `.tar`.

## Best Practices

- Universally append the `-T 0` flag on modern multi-core infrastructure. The default `xz` binary is strictly single-threaded, leaving 15 cores completely idle while compression takes hours. `-T 0` slashes execution time linearly with core count.
- If developing automated backup scripts, combine `xz -v` with shell redirection to capture the live compression metrics into an operational log, ensuring visibility if the compression ratio suddenly drops (indicating potential data structure changes or encryption at the source).
- For massive database dumps, pipeline the export directly into the compressor (`mysqldump | xz -c > dump.sql.xz`) rather than dumping to disk first. This entirely eliminates the massive disk I/O bottleneck of writing and then reading 500GB of raw text data.

## Interview Questions

- _Query:_ What is the fundamental, mathematical "asymmetry" of the LZMA2 algorithm used by `xz`, and why makes it the definitive choice for distributing Linux kernel source code globally?
  - _A:_ LZMA2 is highly asymmetric regarding computational overhead. The compression phase is mathematically agonizing; it requires massive RAM and CPU cycles to build complex dictionaries and optimize the binary pointers. However, the decompression phase requires virtually zero CPU overhead and very little RAM. It is perfect for Linux distribution because the maintainers "pay" the heavy CPU cost exactly once during compilation, while millions of end-users decompress the payload instantly on low-powered laptops and Raspberry Pis.
- _Query:_ A developer executes `xz -9 -T 0 massive_file.txt` on a 32-core server with 8GB of RAM. Three minutes later, the server completely locks up and the `xz` process is violently killed by the operating system. What architectural flaw in the command caused this crash?
  - _A:_ The developer triggered an Out-Of-Memory (OOM) exhaustion event. The `-9` flag commands `xz` to allocate massive memory buffers (over 600MB per thread) to achieve maximum compression. The `-T 0` flag spawns a dedicated compression thread for every available CPU core (32 threads). 32 threads requiring 600MB each demands roughly 19GB of RAM. Because the server only has 8GB, it rapidly exhausted physical memory, forcing the kernel's OOM killer to assassinate the process to protect the OS.
- _Query:_ Why is it mathematically pointless (and computationally wasteful) to execute the `xz` command against a file named `database_backup.zip`?
  - _A:_ A `.zip` file is already heavily compressed. Compression algorithms rely on finding repeated patterns of bytes in the data and replacing them with smaller pointers. Once a file is compressed, its byte structure exhibits extremely high entropy, resembling pure random noise. Running `xz` on high-entropy data gives the LZMA2 engine no repeating patterns to exploit, resulting in 100% CPU utilization for zero storage gains.

## Practice Problems

- _Problem:_ Compress a critical text file named `syslog.1`, mathematically enforcing the absolute maximum compression ratio possible. Ensure the command utilizes 4 concurrent CPU threads, and explicitly instruct the utility _not_ to delete the original `syslog.1` file when finished.
  - _Hint:_ Combine the maximum level integer flag, the thread constraint flag, and the retention flag.
  - _Solution:_ `xz -9 -T 4 -k syslog.1` (This executes a heavily optimized, non-destructive compression pass).
- _Problem:_ Without uncompressing the file `archive.tar.xz` to the physical disk, output the internal metadata to the terminal so you can visually verify the exact byte size of the file before it was originally compressed.
  - _Hint:_ Utilize the specific flag designed to probe and format the archive header statistics.
  - _Solution:_ `xz -l archive.tar.xz` (This reads the mathematical metadata ledger without executing the expensive decompression engine).

## References

- [XZ Utils Documentation (Tukaani)](https://tukaani.org/xz/)
- [Man Page for xz (Linux)](https://man7.org/linux/man-pages/man1/xz.1.html)
  === END FILE ===
