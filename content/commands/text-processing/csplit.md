---
slug: csplit
name: csplit
aliases:
  - context split
category: text-processing
tags:
  - linux
  - text-processing
  - split
  - files
  - regex
  - coreutils
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - split file by regex pattern
  - divide text file by context
  - split log file by date or error
  - break file at specific string
  - split file into sections linux
relatedCommands:
  - split
  - awk
  - sed
  - grep
alternatives:
  - split
  - awk
status: draft
---

## What is it?

`csplit` (context split) is a POSIX-compliant command-line utility used to divide a single file into multiple smaller files based on context lines—specifically, regular expressions or line numbers. Unlike its sibling command `split` (which divides files strictly by byte count or a fixed number of lines), `csplit` reads the content of the file and dynamically creates a new output file every time it encounters a line matching a specified pattern, making it ideal for structurally bounded text.

## Why does it exist?

Log files, configuration dumps, and codebases often contain distinct, logically separated sections of varying lengths (e.g., a massive server log file where each day begins with a `=== 2023-10-01 ===` header). Segmenting these files mechanically by byte size tears lines in half and destroys contextual boundaries. `csplit` exists to provide an intelligent, regex-aware segmentation engine. It allows system administrators and developers to safely fragment monolithic data dumps into parsable, discrete artifacts (like extracting individual certificates from a `.pem` chain bundle) entirely via native shell commands, without writing complex `awk` or Python state-machine scripts.

## Syntax

```bash
csplit [OPTION]... FILE PATTERN...
```

## Flags

| Flag                           | Description                                                                                                                        | Example                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `-f`, `--prefix=PREFIX`        | Changes the default output filename prefix from `xx` to a custom string.                                                           | `csplit -f log_part_ server.log ...` |
| `-b`, `--suffix-format=FORMAT` | Uses `sprintf` formatting for the suffix sequence instead of the default `%02d` (e.g., `00`, `01`).                                | `csplit -b "%04d.txt" file.txt ...`  |
| `-k`, `--keep-files`           | Instructs `csplit` not to delete the output files if it encounters an error (like a regex match failing).                          | `csplit -k data.txt /ERROR/`         |
| `-n`, `--digits=DIGITS`        | Specifies the exact number of digits to use in the numeric suffix of generated files. Defaults to 2.                               | `csplit -n 4 massive.txt ...`        |
| `-s`, `--quiet`, `--silent`    | Suppresses standard output. By default, `csplit` prints the byte size of each generated file to the terminal.                      | `csplit -s data.txt /START/`         |
| `-z`, `--elide-empty-files`    | Prevents the creation of zero-byte (empty) output files when a pattern matches the very first line of a file.                      | `csplit -z dump.txt /^# /`           |
| `--suppress-matched`           | (GNU only) Drops the line that matched the PATTERN entirely, so it does not appear in either the preceding or the new output file. | `csplit --suppress-matched ...`      |
| `--help`                       | Prints the usage manual, flags, and pattern formatting rules.                                                                      | `csplit --help`                      |
| `--version`                    | Outputs the GNU coreutils version of the binary.                                                                                   | `csplit --version`                   |

_Pattern Syntax Note: Patterns must be enclosed in forward slashes `/regex/` (to include the matched line in the new file) or percent signs `%regex%` (to skip the matched line)._

## Examples

```bash
csplit server.log /ERROR/
```

> The standard invocation. It searches `server.log` and creates two files: `xx00` (containing everything _before_ the first occurrence of "ERROR") and `xx01` (containing the "ERROR" line and everything after it).

```bash
csplit -z -f cert_ chain.pem '/-----BEGIN CERTIFICATE-----/' '{*}'
```

> The ultimate certificate extractor. It splits a monolithic `.pem` bundle into individual certificate files (`cert_00`, `cert_01`). The `{*}` operator tells `csplit` to repeat the pattern match infinitely until the end of the file. The `-z` flag prevents it from creating an empty `cert_00` file if the bundle starts immediately with the BEGIN header.

```bash
csplit mycode.c 150 300 450
```

> Splitting by strict line numbers. Instead of regex, this passes exact integers. It creates four files: lines 1-149, 150-299, 300-449, and 450 to the end of the file.

```bash
csplit data.txt '/^Chapter/' '{5}'
```

> Bounded repetition. Instructs the engine to split the file every time a line begins with "Chapter", but strictly limits the splitting to exactly 5 repetitions. The 6th file will contain the remainder of the document.

```bash
csplit -k -s system.log '%START%' '/END/'
```

> Advanced exclusion and error handling. The `%START%` pattern tells `csplit` to skip (discard) all lines up to the first "START" string. It then copies into the first file until it hits "END". The `-k` flag ensures that if "END" is never found, it keeps whatever it managed to extract rather than deleting the temporary file and aborting.

## Real-World Scenarios

**Deconstructing Monolithic SQL Dumps**

```bash
csplit -z -f table_ dump.sql '/^CREATE TABLE/' '{*}'
```

> Database administrators often deal with massive `.sql` dump files containing dozens of tables. Attempting to restore a single table requires scrolling through gigabytes of text. This command gracefully splits the dump into dozens of smaller files, one for each table, allowing the admin to easily identify and restore exactly the table they need.

**Log Segmentation by Date**

```bash
csplit -z -b "%02d.log" application.log '/^2023-11-[0-9][0-9]/' '{*}'
```

> A DevOps engineer has a flat application log spanning a month and needs to ship it to a forensics team broken down by day. This command uses regex to detect the YYYY-MM-DD timestamp format at the start of a line and splits the file dynamically at midnight boundaries, generating `xx00.log`, `xx01.log`, etc.

## When should it NOT be used?

- **Simple Byte/Size chunking:** **Do not use `csplit` if you just need files to fit on a USB drive.** If you want 100MB chunks, use the standard `split -b 100M file` command, which is mathematically faster and doesn't waste CPU evaluating regex context.
- **Massive Log Files with high-frequency matches:** **Do not use `csplit` to split a file into 100,000 pieces.** If you split a file on every single newline or every timestamp, `csplit` must open, write, and close 100,000 distinct file descriptors on your hard drive, causing severe inode exhaustion and disk thrashing. Use `awk` to route data directly to designated streams.

## Alternatives

- **`awk`:** **Best for highly complex routing.** `awk '/pattern/ {filename="file" NR ".txt"} {print > filename}'`. `awk` is significantly more powerful because it can name the output files dynamically based on content _inside_ the matched line (e.g., naming the file after the username extracted from the log).
- **`split`:** **Best for dumb, rapid fragmentation.** Completely blind to file context; slices files strictly by rigid line counts or megabyte chunks.

## How it works internally

`csplit` is a C program that relies heavily on the POSIX `regex.h` library and internal line-buffering mechanisms.

When executed, `csplit` does not load the entire file into memory (which would crash on multi-gigabyte logs). Instead, it reads the input file sequentially into a dynamic chunk buffer. It compiles the provided `PATTERN` strings into executable regular expressions via `regcomp()`.

For every line read, it executes `regexec()` to test for a match. If a match is found (and it is a `/pattern/`), it closes the current output file descriptor (e.g., `xx00`), increments its internal suffix counter, opens a new file descriptor (`xx01`), and flushes the line buffer into the new file.

The `{n}` and `{*}` repetition operators are internal loop directives. If `{n}` is specified, `csplit` repeats the current regex evaluation for `n` matches. If a requested pattern is not found before the End of File (EOF), `csplit` considers this a fatal error. By default, it aggressively calls `unlink()` on all files it just created (cleaning up its mess) and exits with `1`. The `-k` (keep files) flag explicitly disables this `unlink()` cleanup phase.

## Performance Notes

- **Regex Overhead:** `csplit` must evaluate the regular expression against _every single line_ of the input file. If you use a highly complex, backtracking-prone regular expression on a 50GB file, `csplit` will become severely CPU-bottlenecked. Keep the regex anchored (e.g., `^PATTERN`) to allow the engine to fail-fast.

## Security Notes

- **Disk Space and Inode Exhaustion:** Because the `{*}` operator repeats infinitely, an attacker who controls the input file can feed `csplit` a file containing millions of matching patterns. `csplit` will obediently attempt to create millions of tiny files, instantly exhausting the host filesystem's available inodes and triggering a Denial of Service (DoS) for the entire server.

## Common Mistakes

- **Forgetting single quotes around the pattern**
  - _Mistake:_ Running `csplit file.txt /*/`
  - _Why:_ The bash shell interprets `/*/` as a directory glob and attempts to expand it. Even if it doesn't expand, bash removes the unquoted asterisks. You must strictly protect the pattern from the shell: `csplit file.txt '/*/'`.
- **Losing files due to missing matches**
  - _Mistake:_ Running a script to split logs, and suddenly all the split files vanish.
  - _Why:_ `csplit` is highly strict. If you tell it to split 5 times, and it only finds 4 matches before hitting the end of the file, it deletes the 4 files it just created and aborts. Always use the `-k` (keep) flag in production scripts to prevent catastrophic data loss during unexpected parsing failures.
- **Creating empty files with `-z` omission**
  - _Mistake:_ Splitting a certificate bundle and wondering why `cert_00` is 0 bytes.
  - _Why:_ The pattern matched the very first line of the file. `csplit` created the first file, saw the match on line 1, immediately closed it at 0 bytes, and opened the second file to store the match. The `-z` flag instructs `csplit` to silently discard any 0-byte files it generates.

## Best Practices

- **Prefix explicitly:** Always use `-f` to name your output files logically (e.g., `-f error_log_`). Leaving the default `xx` prefix makes cleanup dangerous, as running `rm xx*` might accidentally delete unrelated files in the same directory.
- **Use `%pattern%` to skip junk:** If a file has a massive 500-line header of legal boilerplate before the data starts, do not split it and delete the first file. Use `csplit file.txt '%HEADER_END%'` to instruct the engine to silently swallow and discard all text until the match.

## Interview Questions

**Q: You use `csplit` with the `{5}` repetition operator on a log file. You expect 6 files to be created. The command finishes, but no new files exist in your directory. What happened, and which flag prevents this?**
**A:** `csplit` failed to find the pattern 5 times before reaching the end of the file. By default, `csplit` treats missing expected patterns as a fatal error and immediately deletes (unlinks) any files it successfully generated during the run to prevent leaving the user with partial data. To retain the successfully split files regardless of the error, you must use the `-k` (or `--keep-files`) flag.

**Q: Explain the functional difference between wrapping a pattern in forward slashes `/PATTERN/` versus percent signs `%PATTERN%` in `csplit`.**
**A:** Wrapping a pattern in forward slashes `/` instructs `csplit` to output the line that matched the pattern (and all subsequent lines until the next split) into a newly created file. Wrapping a pattern in percent signs `%` instructs `csplit` to skip to the matched line, completely discarding all text read up to that point without writing it to any file.

## Practice Problems

**Problem:** You have a file `data.txt`. You want to split it at every occurrence of the string `[BREAK]`, repeating for the entire file. You want to suppress the byte-count terminal output, and you want to ensure no 0-byte files are left behind.
**Hint:** Combine the quiet, elide-empty, and wildcard repetition flags.
**Solution:**

```bash
csplit -s -z data.txt '/\[BREAK\]/' '{*}'
```

**Problem:** You want to split a script `app.py` into exactly two files. The first file should contain everything up to line `150`, and the second file should contain line 150 to the end. Name the output files `part_00` and `part_01`.
**Hint:** Pass the exact integer line number instead of a regex, and use the prefix flag.
**Solution:**

```bash
csplit -f part_ app.py 150
```

## References

- [csplit(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/csplit)
- [GNU Coreutils Manual: csplit invocation](https://www.gnu.org/software/coreutils/manual/html_node/csplit-invocation.html)
