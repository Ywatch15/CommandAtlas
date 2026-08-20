---
slug: head
name: head
aliases: []
category: text-processing
tags:
  - linux
  - text-processing
  - coreutils
  - monitoring
  - streams
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
  - read first lines of file
  - preview top of file linux
  - extract first bytes of file
  - show file header
  - limit pipeline output bash
relatedCommands:
  - tail
  - cat
  - less
  - sed
  - awk
alternatives:
  - sed
  - awk
status: draft
---

## What is it?

`head` is a ubiquitous POSIX-standard command-line utility that extracts and outputs the first contiguous section (typically lines or bytes) of a file or piped data stream. By default, it prints the first 10 lines to standard output, providing a hyper-efficient mechanism to preview file contents or dynamically truncate the output of massive shell pipelines.

## Why does it exist?

Inspecting the structure of a 50-Gigabyte CSV or log file using `cat` or a graphical text editor will instantly overwhelm the terminal buffer or exhaust system RAM, causing the machine to lock up. `head` exists to prevent this resource exhaustion. It acts as an optimized, short-circuiting data valve. By reading only the explicitly requested number of bytes or lines and then immediately closing the file descriptor, it allows administrators to safely preview database schemas, verify log formatting, or capture pipeline headers in milliseconds, regardless of the target file's total size.

## Syntax

```bash
head [OPTION]... [FILE]...
```

## Flags

| Flag                        | Description                                                                                                                                         | Example                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `-n <[-]K>`, `--lines=K`    | Specifies the exact number of lines to print. If `K` is preceded by a minus sign (`-K`), it prints all lines _except_ the last `K` lines.           | `head -n 20 data.log`    |
| `-c <[-]K>`, `--bytes=K`    | Extracts data based on exact byte counts rather than lines. Supports suffixes (e.g., `K`, `M`, `G`). If `-K`, it prints all but the last `K` bytes. | `head -c 10M backup.tar` |
| `-q`, `--quiet`, `--silent` | Never prints the filename headers. This is the default when processing a single file, but `-q` forces it when processing multiple files.            | `head -q -n 5 *.txt`     |
| `-v`, `--verbose`           | Always prints a header containing the filename (`==> filename <==`) before outputting the file's contents.                                          | `head -v -n 1 data.csv`  |
| `-z`, `--zero-terminated`   | (GNU only) Instructs `head` to count lines separated by null bytes (`\0`) rather than standard newline characters (`\n`).                           | `find . -print0          | head -z -n 5` |
| `--help`                    | Prints the usage manual and standard flag documentation.                                                                                            | `head --help`            |
| `--version`                 | Outputs the version information for the GNU coreutils `head` binary.                                                                                | `head --version`         |

## Examples

```bash
head syslog
```

> The standard invocation. Reads the `syslog` file, prints exactly the first 10 lines to the terminal, and exits immediately.

```bash
head -n 50 /var/log/auth.log
```

> Modifying line counts. Bypasses the default 10-line limit to extract exactly the first 50 lines of the authentication log. (Note: On legacy UNIX systems, this is often written using the shortcut `head -50`).

```bash
ls -lt | head -n 5
```

> The canonical pipeline truncator. `ls -lt` lists all files sorted by modification time. Piping this massive list to `head` chops off the execution stream, outputting only the 5 most recently modified files in the directory.

```bash
head -c 32 /dev/urandom | base64
```

> Raw byte extraction. `head` extracts exactly 32 raw, binary bytes of cryptographically secure noise from the `/dev/urandom` infinite block device. The stream is immediately chopped off and piped into `base64` to generate a pristine, randomized 44-character password string.

```bash
head -n -5 summary.txt
```

> The negative exclusion pattern (GNU only). Instead of printing the first 5 lines, the minus sign (`-5`) commands `head` to print the entire file _except_ the absolute last 5 lines.

## Real-World Scenarios

**CSV Schema Inspection**

```bash
head -n 1 massive_database_export.csv > schema.csv
```

> Data scientists frequently receive 10GB CSV files. To load the file into Pandas or a database, they must know the exact column names. Running `head -n 1` safely and instantly extracts only the top header row containing the column names, redirecting it to a tiny file for rapid structural analysis without taxing the CPU.

**Isolating File Headers (Magic Bytes)**

```bash
head -c 4 unknown_file.dat | xxd
```

> A security engineer encounters an obscure binary file with no extension. They use `head -c 4` to extract just the first 4 bytes of the file (the "magic bytes" or file signature). Piping this to a hex dumper (`xxd`) reveals `89 50 4e 47`, instantly proving the file is a disguised PNG image.

## When should it NOT be used?

- **Tailing live logs:** **Do not use `head` to monitor active systems.** `head` only reads the absolute beginning of a file. If an application is appending errors to the end of a log, `head` will never see them. You must use `tail -f`.
- **Extracting middle sections:** `head` is mathematically anchored to byte zero. If you need lines 50 to 100, `head` cannot do it alone. You must combine it (e.g., `head -n 100 file | tail -n 50`) or use `sed -n '50,100p' file`, which is significantly cleaner.

## Alternatives

- **`tail`:** **The exact opposite.** Extracts the absolute _end_ of a file, essential for reading recent log entries.
- **`sed 10q`:** **Best for regex environments.** A `sed` command that prints 10 lines and then quits (`q`). Functionally identical to `head -n 10` but useful if you are already inside a complex `sed` script.
- **`awk 'NR<=10'`:** **Best for programmatic extraction.** Instructs `awk` to print only if the Number of Records (lines) is less than or equal to 10.

## How it works internally

`head` is an incredibly simple, highly optimized C program.

When executed, it allocates a memory buffer and utilizes the `read()` system call to begin pulling chunks of bytes from the file descriptor into user-space.

If operating in line mode (`-n`), it iterates through the buffer, counting every newline character (`\n`) it encounters. It writes the bytes to `stdout` until its internal counter matches the requested line limit.

The absolute magic of `head` is how it terminates. Once the limit is reached, `head` immediately issues the `close()` system call on the file and calls `exit(0)`.

If `head` is the recipient of a pipeline (e.g., `yes | head -n 1`), its abrupt exit destroys the read-end of the pipe. When the sender (`yes`) attempts to write its next byte to the now-broken pipe, the Linux kernel intercepts the write and sends a `SIGPIPE` (Signal 13) to the sender. The sender instantly receives this fatal signal and dies. This architectural design ensures that `head` not only stops reading, but mathematically terminates the entire upstream pipeline, saving massive CPU cycles.

## Performance Notes

- **The Negative Line Memory Cost:** Standard `head` uses almost zero RAM. However, if you use the negative line exclusion flag (`head -n -100 file.txt`), `head` must calculate where the end of the file is. It does this by allocating a rolling buffer in RAM equal to the size of the 100 lines. It streams the file through this buffer, printing the delayed output. For massive exclusion numbers, this can consume noticeable RAM.

## Security Notes

- **Non-Destructive Parsing:** `head` is entirely read-only. It cannot mutate data or execute shell commands. It is exceptionally safe to use when previewing suspicious or potentially malicious text files downloaded from the internet, as it will never execute the contents.

## Common Mistakes

- **Using `head` before `sort` in a pipeline**
  - _Mistake:_ `ps aux | head -n 10 | sort -nk 3` (Trying to find the top 10 CPU consuming processes).
  - _Why:_ Pipelines execute left to right. This command takes the _first 10 processes listed randomly by the OS_, and then sorts only those 10. The actual highest CPU consumer was probably on line 50 and was destroyed by `head`. You must sort the entire dataset _first_, and then truncate: `ps aux | sort -nk 3 | head -n 10`.
- **Confusing `-c` and `-n`**
  - _Mistake:_ Typing `head -c 10` expecting 10 lines.
  - _Why:_ `-c` explicitly means bytes/characters. The command will output exactly 10 letters and then abruptly chop the word in half. Always use `-n` for lines.

## Best Practices

- **Use `head -n 1` for idempotency checks:** In bash scripts, you can instantly check if a file has any data by reading the first line: `if [ -n "$(head -n 1 data.txt)" ]; then`. This avoids the massive I/O overhead of executing `cat` on a large file just to see if it's empty.
- **Extracting blocks with `tail` and `head`:** The canonical way to extract a block of text in standard POSIX shells without `sed` is chaining the two tools. To get lines 20 through 30: `head -n 30 file.txt | tail -n 11`. (Extract the first 30, then chop off the top 19).

## Interview Questions

**Q: You run the command `find / -type f | head -n 5`. The `find` command is capable of outputting millions of files and taking 10 minutes to run. However, this pipeline finishes in 0.1 seconds. Explain the specific kernel signal mechanism that allows this to happen so quickly.**
**A:** `head` reads exactly 5 lines from the pipeline and then immediately exits, closing its end of the pipe. When the `find` command attempts to write the 6th line into the pipeline, the Linux kernel detects that the pipe has no active reader. The kernel instantly sends a `SIGPIPE` signal to the `find` process. The default behavior of `SIGPIPE` is to terminate the process violently. Therefore, `head`'s closure forces the kernel to assassinate the `find` command, halting the 10-minute crawl instantly.

**Q: Explain the behavioral difference between `head -n 5` and `head -n -5`.**
**A:** `head -n 5` instructs the utility to read and output exactly the first 5 lines of the file, starting from line 1, and then exit. The GNU-specific `head -n -5` (note the negative sign) instructs the utility to output the _entirety_ of the file, from line 1 all the way to the end, but explicitly omitting the absolute last 5 lines of the file.

## Practice Problems

**Problem:** You are exploring a new directory and want to see the first 3 lines of _every_ `.csv` file in the directory. You want the output to clearly print the filename header `==> filename.csv <==` before showing the lines so you know which data belongs to which file.
**Hint:** Pass the wildcard to the command and explicitly enforce the verbose flag.
**Solution:**

```bash
head -v -n 3 *.csv
```

**Problem:** You need exactly 1 Megabyte of random data to test a bandwidth monitoring script. Write a command that extracts exactly 1 Megabyte of data from the `/dev/urandom` device and redirects it to a file named `test_payload.bin`.
**Hint:** Use the byte extraction flag with the `M` suffix modifier.
**Solution:**

```bash
head -c 1M /dev/urandom > test_payload.bin
```

## References

- [head(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/head)
- [GNU Coreutils Manual: head invocation](https://www.gnu.org/software/coreutils/manual/html_node/head-invocation.html)
