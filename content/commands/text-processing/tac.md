---
slug: tac
name: tac
aliases:
  - reverse cat
category: cloud-cli
tags:
  - linux
  - text-processing
  - streams
  - coreutils
  - logs
difficulty: beginner
supportedOS:
  - linux
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - read file backwards bash
  - reverse line order linux
  - print file from bottom to top
  - tac command usage
  - cat in reverse
relatedCommands:
  - cat
  - tail
  - sed
  - awk
alternatives:
  - sed
  - awk
status: draft
---

## What is it?

`tac` (which is `cat` spelled backwards) is a POSIX text-processing utility that concatenates and prints files to standard output in reverse line order. It reads the entirety of the specified files or standard input stream and outputs the absolute last line first, working sequentially backward until it reaches the first line of the file.

## Why does it exist?

System log files (like `/var/log/syslog` or application errors) are appended sequentially, meaning the most recent, critical error events are buried at the absolute bottom of massive gigabyte files. If an administrator pipes a log file to `grep`, the terminal prints chronological errors, forcing the user to scroll to the bottom. `tac` exists to invert this chronology. By flipping the data stream vertically, it ensures that the newest events are processed and presented first in bash pipelines, drastically accelerating human investigation and automated log parsing.

## Syntax

```bash
tac [OPTION]... [FILE]...
```

## Flags

| Flag                                | Description                                                                                                                                           | Example                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `-b`, `--before`                    | Attaches the separator character to the _beginning_ of the matched record rather than the end. Useful for parsing multi-line blocks like XML or JSON. | `tac -b -s "<record>"` |
| `-r`, `--regex`                     | Instructs `tac` to interpret the string provided to the `-s` flag as a full POSIX regular expression rather than a literal string.                    | `tac -r -s "^====$"`   |
| `-s <STRING>`, `--separator=STRING` | Overrides the default line separator (the newline character `\n`). Instructs `tac` to split and reverse the file based on custom textual boundaries.  | `tac -s "---"`         |
| `--help`                            | Prints the usage manual and standard flag documentation.                                                                                              | `tac --help`           |
| `--version`                         | Outputs the version information for the GNU coreutils `tac` binary.                                                                                   | `tac --version`        |

## Examples

```bash
tac /var/log/auth.log | head -n 20
```

> The quintessential `tac` workflow. It reverses the entire authentication log so the most recent events are at the top, and uses `head` to display exactly the 20 newest login attempts to the administrator instantly.

```bash
tac file1.txt file2.txt
```

> Concatenation behavior. `tac` reads `file1.txt`, prints its lines entirely in reverse order from bottom to top, and _then_ reads `file2.txt` and prints its lines entirely in reverse order.

```bash
tac -s "" paragraph_data.txt
```

> Reversing by paragraph. Passing an empty string as the separator instructs `tac` to use multiple consecutive blank lines (a paragraph boundary) as the delimiter. It reverses the order of the paragraphs in the document, but leaves the lines _within_ each paragraph in their normal order.

```bash
tac -b -r -s "^==> [A-Za-z]+ <==\n" monolithic.log
```

> Advanced chunk reversal. A monolithic log file contains sections bounded by headers like `==> ERROR <==`. By using `-r` (regex), `-s` (defining the separator), and `-b` (attaching the header to the block _before_ the split), `tac` perfectly identifies the massive multi-line chunks, reverses the order of the chunks themselves, but keeps the header securely attached to the top of its respective data payload.

## Real-World Scenarios

**Finding the Last Occurence in a Log**

```bash
tac /var/log/nginx/access.log | grep -m 1 "HTTP/1.1\" 500"
```

> An administrator needs to find the exact timestamp of the _most recent_ HTTP 500 error on a web server. Standard `grep` scans from the beginning of the file, taking minutes on a massive log and requiring the admin to filter out older errors. `tac` starts from the bottom. The pipe into `grep -m 1` ensures that the microsecond the single newest error is found, the pipeline terminates successfully, resolving the query in milliseconds.

**Parsing Stack Traces Backwards**

```bash
tail -n 5000 application.log | tac | awk '/^Exception/ {print; exit}'
```

> When an application crashes, it dumps a massive, multi-line stack trace. The developer only cares about the root `Exception` that triggered the trace, which is printed _before_ the trace itself. The script tails the recent logs, reverses the stream, and uses `awk` to find the exact line where the exception started, exiting instantly.

## When should it NOT be used?

- **Reversing characters on a single line:** **Do not use `tac` to reverse strings.** `tac` only reverses the vertical order of lines. If a line says "Hello", `tac` outputs "Hello". To reverse the text horizontally to "olleH", you must use the `rev` command.
- **Massive Files without `tail`:** **Do not run `tac` on a 500GB log file blindly.** To output the last line first, `tac` must physically `lseek()` to the absolute end of the file on the hard drive and read backwards. If the file is a continuous stream (like `journalctl | tac`), `tac` cannot seek; it is forced to buffer the _entire 500GB stream_ into system memory or temporary files before it can print a single line, causing extreme I/O thrashing and RAM exhaustion.

## Alternatives

- **`sed '1!G;h;$!d'`:** **Best for environments missing `tac`.** `tac` is a GNU Coreutils tool and is notoriously missing from macOS/BSD natively. This cryptic `sed` command pushes every line into the hold space and prints it at the end, effectively mirroring `tac` using POSIX standards.
- **`tail -r`:** **Best for BSD/macOS.** The BSD implementation of `tail` includes the `-r` flag, which behaves identically to `tac`. (Note: GNU `tail` on Linux completely removed this flag).
- **`awk '{a[i++]=$0} END {for (j=i-1; j>=0;) print a[j--] }'`:** An alternative programmatic approach for reversing streams in memory using arrays.

## How it works internally

`tac` is a C binary that utilizes heavily optimized file descriptor manipulation.

When you pass a standard file to `tac file.txt`, it recognizes that the file is "seekable" (a physical entity on a disk). It invokes the `lseek()` system call to jump directly to the absolute end of the file minus a chunk size (e.g., jumping to byte 1,073,733,824 in a 1GB file). It issues a `read()` to pull that chunk into user-space RAM.

It scans the RAM buffer backwards, searching for the newline `\n` character. When it finds one, it writes the string from that newline to the end of the buffer to `stdout`. It continues backwards until the buffer is empty, issues another `lseek()` further back in the file, and repeats. This is incredibly efficient, requiring near-zero memory footprint.

However, if you pipe data into `tac` (e.g., `cat file.txt | tac`), the data is a continuous pipe (`FIFO`). You cannot `lseek()` a pipe. `tac` is physically forced to read the incoming byte stream and dump it entirely into a temporary file in `/tmp/` (or RAM if it's small enough). Only after the upstream process closes the pipe does `tac` `lseek()` to the end of its generated temporary file and begin printing backwards.

## Performance Notes

- **Pipelining Latency:** Because `tac` cannot print the first line of its output until it has received the absolute last line of its input, inserting `tac` into the middle of an active pipeline destroys asynchronous streaming. The pipeline will physically block and hang at the `tac` node until the upstream data source is completely exhausted.

## Security Notes

- **`/tmp` Directory Exhaustion:** When receiving massive, non-seekable piped streams (like a massive SQL dump), `tac` utilizes the `/tmp` directory to buffer the data. If the piped stream exceeds the available capacity of the `/tmp` partition, `tac` will fail and potentially impact other system services relying on `/tmp` space. Ensure `TMPDIR` is configured safely for massive sorts or reverses.

## Common Mistakes

- **Assuming `tac` reverses files perfectly across pipes**
  - _Mistake:_ Using `cat massive_file | tac` instead of `tac massive_file`.
  - _Why:_ As explained above, `cat | tac` forces `tac` to buffer the entire file to `/tmp`, generating massive disk writes. Passing the filename directly (`tac massive_file`) allows the C binary to `lseek()` the disk efficiently, bypassing the temp file entirely.
- **Applying `-b` (before) flag incorrectly**
  - _Mistake:_ Running `tac -s "|" file.txt` and getting garbled output on the next line.
  - _Why:_ When splitting by custom strings, standard `tac` attaches the separator to the end of the line. If your separator logically belongs to the _start_ of the chunk (like an XML `<node>` tag), you must append `-b` to instruct `tac` to attach the separator string cleanly to the top of the reversed payload chunk.

## Best Practices

- **Pre-Filter Before Reversing:** Never do `tac huge.log | grep "ERROR"`. You are forcing the kernel to read a massive file backwards just to filter it. Always filter first: `grep "ERROR" huge.log | tac`. This massively shrinks the payload before handing it to the blocking, buffering logic of `tac`.

## Interview Questions

**Q: You write a script that runs `journalctl -u nginx | tac | head -n 10`. The command works perfectly, returning the last 10 log lines. However, the command takes exactly 3 minutes to execute on a busy server. How would you optimize this to return instantly?**
**A:** The performance issue is a pipeline bottleneck. `journalctl` generates millions of lines of output. `tac` cannot output a single character until it has buffered the entire multi-gigabyte stream from `journalctl` in memory/tmp space. `head` then reads 10 lines and kills the pipeline. The optimization is to use `journalctl`'s native reverse capability or limit it upstream. The vastly superior, instantaneous command is `journalctl -u nginx -n 10 -r` (where `-r` tells `journalctl` to reverse its own output, and `-n` limits it at the source), or simply `tail -n 10 /var/log/nginx/error.log | tac`.

**Q: Explain the exact functional difference between the `tac` command and the `rev` command in Linux text processing.**
**A:** `tac` processes files vertically. It reverses the chronological order of lines in a file, reading from the bottom line up to the top line, but the text within the lines remains perfectly readable from left to right. `rev` processes files horizontally. It reads the file top to bottom normally, but physically mirrors the string on each line character-by-character, turning the string "hello world" into "dlrow olleh".

## Practice Problems

**Problem:** You are monitoring an application. You need to print the contents of `error.log` in reverse chronological order (newest at top), but you only care about the absolute last 50 lines of the file. Write the most optimized pipeline to achieve this without forcing `tac` to read the whole file.
**Hint:** Use `tail` to grab the lines first, then reverse them.
**Solution:**

```bash
tail -n 50 error.log | tac
```

**Problem:** You have a file `data.txt` where records are separated by a double equal sign `==`. You need to reverse the order of these records using `tac`, ensuring that the `==` separator remains attached to the _beginning_ of each record after it is reversed.
**Hint:** Use the separator flag and the flag that attaches the separator before the payload.
**Solution:**

```bash
tac -b -s "==" data.txt
```

## References

- [tac(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/tac)
- [GNU Coreutils Manual: tac invocation](https://www.gnu.org/software/coreutils/manual/html_node/tac-invocation.html)
