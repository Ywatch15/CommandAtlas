---
slug: wc
name: wc
aliases:
  - word count
category: text-processing
tags:
  - text-processing
  - metrics
  - bash
  - coreutils
  - linux
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
  - count lines in file
  - count words in linux
  - find size of file in bytes
  - how many lines returned by command
  - wc command usage
relatedCommands:
  - grep
  - ls
  - find
  - awk
  - sort
  - split
  - uniq
alternatives:
  - awk
status: draft
---

## What is it?

`wc` (word count) is a heavily optimized POSIX utility that reads one or more files (or standard input pipelines) and prints the newline count, word count, character count, and absolute byte size of the provided data. It serves as the primary mathematical aggregator in shell scripting for determining array lengths, file sizes, and command output volume.

## Why does it exist?

While UNIX pipelines allow administrators to filter and manipulate text indefinitely, there must be a mechanism to extract absolute numerical metrics from those streams to drive conditional logic (e.g., "If there are more than 10 errors, trigger an alert"). `wc` exists to fulfill this capability instantly. By scanning physical bytes directly from the kernel stream without loading the entire payload into memory, it provides lightning-fast counting mathematics, acting as the definitive closing statement for millions of global shell pipelines.

## Syntax

```bash
wc [OPTION]... [FILE]...
command | wc [OPTION]...
```

## Flags

| Flag                      | Description                                                                     | Example                                               |
| ------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `-l`, `--lines`           | Prints only the count of newline (`\n`) characters in the input stream.         | `wc -l access.log`                                    |
| `-w`, `--words`           | Prints only the count of words (defined as strings separated by whitespace).    | `wc -w essay.txt`                                     |
| `-c`, `--bytes`           | Prints only the absolute byte count of the file or stream.                      | `wc -c payload.bin`                                   |
| `-m`, `--chars`           | Prints only the character count (differs from bytes in multi-byte UTF-8 files). | `wc -m foreign_text.txt`                              |
| `-L`, `--max-line-length` | Prints the length (in characters) of the absolute longest line in the file.     | `wc -L script.sh`                                     |
| `--files0-from=F`         | Reads input from files defined in a NUL-terminated list (crucial for `find`).   | `find . -name "*.c" -print0 \| wc -l --files0-from=-` |
| `--help`                  | Outputs brief usage documentation and supported command-line options.           | `wc --help`                                           |
| `--version`               | Displays version information and copyright details for the coreutils package.   | `wc --version`                                        |

## Examples

```bash
wc /etc/passwd
```

> This is the default execution without flags. `wc` reads the file and outputs exactly four columns: the newline count, the word count, the byte count, and the file name (e.g., `42 98 2354 /etc/passwd`).

```bash
ls -1 /etc | wc -l
```

> This is the most ubiquitous pipeline pattern in UNIX. The `ls -1` command lists every file in a directory on a new line. Piping this into `wc -l` instantly returns a pure integer representing the exact total number of files within that directory.

```bash
wc -c video.mp4
```

> This skips line and word counting entirely, executing a pure byte-count (`-c`). For physical files, `wc` leverages kernel metadata to return the exact physical size of the binary file instantly, acting as a script-friendly alternative to `ls -l` or `stat`.

```bash
cat data.txt | wc -L
```

> This evaluates text geometry. The `-L` flag commands `wc` to scan every single line in the stream, returning a single integer representing the character count of the absolute longest line, which is useful when preparing data for fixed-width database ingestion.

```bash
wc -l file1.txt file2.txt
```

> When provided multiple file arguments, `wc` processes them sequentially, outputting the specific metric (lines) for each individual file, and automatically appending a final `total` row summing the metrics across all provided inputs.

## Real-World Scenarios

**Dynamic Rate Limiting and Queues**

```bash
while [ $(jobs -r | wc -l) -ge 10 ]; do
    sleep 1
done
```

> Automation scripts executing massive parallel workloads use `wc -l` to throttle execution. The script parses the active shell jobs list (`jobs -r`), pipes it to `wc` to get an active integer count, and forcefully pauses the script until the active worker count drops below 10.

**Validating Network Health**

```bash
ACTIVE_CONNS=$(ss -tun state established | wc -l)
if [ "$ACTIVE_CONNS" -gt 5000 ]; then systemctl restart nginx; fi
```

> Observability pipelines execute `ss` (socket statistics) to dump a list of established TCP network connections. `wc -l` reduces this massive text block to a single integer, allowing the script to instantly evaluate load limits and trigger automated daemon restarts.

**Auditing Codebase Complexity**

```bash
find src/ -name "*.py" -print0 | wc -l --files0-from=-
```

> Software engineers audit massive repositories using `find` to isolate specific source files. The `--files0-from=-` flag allows `wc` to safely consume a NUL-terminated list of file paths from standard input, aggregating the absolute total line count of the entire Python codebase without breaking on spaces in filenames.

## When should it NOT be used?

- **Checking the length of a single bash variable:** **Reason:** Running `echo $VAR | wc -c` spawns unnecessary subshells, invokes external binaries, and adds an errant newline character to the count. **Use instead:** Native bash string expansion: `${#VAR}`.
- **Counting occurrences of a specific word or pattern:** **Reason:** `wc` strictly counts total words or lines; it has no regex engine to isolate specific strings. **Use instead:** `grep -c "pattern" file`.
- **Checking if a file is completely empty:** **Reason:** While `[ $(wc -c < file) -eq 0 ]` works, it executes an external binary to read the entire file. **Use instead:** The native shell file test operator: `[ -s file ]` (returns true if size > 0).

## Alternatives

- **`grep -c ""`:** Pipeline counting. **Tradeoff:** Extremely fast for counting lines, but technically counts regex matches, making it less semantically clear than `wc -l` for pure line counting.
- **`stat -c %s`:** File byte counting. **Tradeoff:** When checking file size, `stat` queries the kernel inode metadata instantly, whereas `wc -c` technically opens and reads the file if it is a stream. `stat` is vastly superior for physical file byte-checks.
- **`awk 'END {print NR}'`:** Advanced streaming. **Tradeoff:** `awk` natively tracks the Number of Records (`NR`). Highly useful if you are already manipulating the text with `awk`, but `wc -l` is heavily C-optimized and executes faster for pure counting.

## How it works internally

`wc` is a highly optimized Finite State Machine executed in user-space.

When processing streams (like `-l` or `-w`), `wc` allocates a modest memory buffer (usually 16KB or 64KB) and issues continuous `read()` system calls against the file descriptor or standard input pipe. It scans the raw byte array in memory using tightly optimized C `while` loops.

For line counting (`-l`), the engine literally just counts the number of `\n` (newline, ASCII `0x0A`) byte characters in the buffer.

For word counting (`-w`), it maintains a boolean state flag (`in_word`). When it encounters a non-whitespace character, it flips the flag to `True` and increments the word counter. When it encounters whitespace (Space, Tab, Newline, determined by `iswspace()`), it flips the flag to `False`.

Crucially, modern GNU `wc -c` (byte count) includes a profound kernel optimization. If the user executes `wc -c file.txt` against a physical file (not a pipe), `wc` completely skips the `read()` loop. It executes an `fstat()` system call to query the kernel's inode metadata directly, extracting the `st_size` value and returning it instantly, making `-c` an $O(1)$ operation on local files.

## Performance Notes

- Counting the lines (`-l`) of a 100GB log file is bound entirely by the read speed of the underlying hard drive. The CPU string-parsing overhead is virtually nonexistent due to SIMD (Single Instruction, Multiple Data) optimizations in modern glibc libraries.
- The `-m` (character count) flag is significantly slower than `-c` (byte count) on UTF-8 systems. `-c` blindly counts raw physical bytes. `-m` forces the engine to decode the UTF-8 multibyte stream, validating multi-byte sequences into logical glyphs before incrementing the counter, incurring heavy CPU latency.

## Security Notes

- **No inherent security risks:** `wc` performs strictly read-only operations on data streams. It does not execute code or alter filesystem state.

## Common Mistakes

- **The Trailing Newline Trap:** Running `echo -n "hello" | wc -l`. **Why it's wrong:** `wc -l` strictly counts `\n` characters. Because `echo -n` suppresses the newline, `wc` outputs `0`, even though there is clearly text on the line. If a file is missing an EOF newline, `wc -l` will perpetually undercount the true line total by 1.
- **Getting filenames in variable assignment:** Running `LINES=$(wc -l file.txt)`. **Why it's wrong:** The output will be `42 file.txt`. When used in math later, Bash crashes because of the text string. You must redirect the file into the binary: `LINES=$(wc -l < file.txt)`. This strips the filename, returning purely the integer `42`.
- **Confusing Bytes (`-c`) and Characters (`-m`):** **Why it's wrong:** If a text file contains the emoji `🚀`, it is exactly 1 character, but 4 bytes in UTF-8. `wc -c` returns 4. `wc -m` returns 1. If you are validating database string limits (VARCHAR), confusing these flags results in catastrophic truncation errors.

## Best Practices

- When executing `wc` in bash scripts for variable assignment, universally utilize standard input redirection (`wc -l < file.txt`) rather than passing the file as an argument (`wc -l file.txt`) to strip the filename from the output stream.
- If you need to quickly sum the byte size of multiple files without writing `awk` logic, use `wc -c file1 file2 file3 | tail -n 1 | awk '{print $1}'` to extract the bottom `total` line automatically generated by the utility.

## Interview Questions

- _Query:_ A developer runs `printf "Line 1\nLine 2" | wc -l`. The terminal outputs `1`, even though there are clearly two lines of text. Explain the architectural definition of `-l` that causes this discrepancy.
  - _A:_ The `-l` flag in `wc` does not technically count "lines of text." It strictly counts the number of newline characters (`\n`) present in the byte stream. Because the `printf` statement explicitly omits the final trailing newline after `Line 2`, there is mathematically only one `\n` character in the entire string. Thus, `wc` accurately returns `1`.
- _Query:_ In a shell script, what is the functional difference between defining a variable using `COUNT=$(wc -l mylog.txt)` versus `COUNT=$(wc -l < mylog.txt)`, and why is the latter considered a required best practice?
  - _A:_ The first syntax passes the filename as a standard argument. `wc` will output both the count and the filename (e.g., `500 mylog.txt`). The `$COUNT` variable now contains a string. If the script attempts to use `$COUNT` in a math evaluation (`[ $COUNT -gt 100 ]`), Bash will crash. The second syntax uses shell redirection `<` to stream the file contents via standard input. `wc` receives the data anonymously, outputting strictly the integer `500`, guaranteeing mathematical safety in the script.
- _Query:_ A system contains a 50-Gigabyte text file. Why does executing `wc -c file.txt` return the result almost instantly, whereas executing `wc -m file.txt` freezes the terminal for several minutes?
  - _A:_ `wc -c` (byte count) is heavily optimized by the kernel. When executed against a physical file, `wc` bypasses reading the data entirely and invokes an `fstat()` system call, reading the file's exact physical byte size from the hard drive's inode metadata instantly ($O(1)$ time). `wc -m` (character count) must account for multi-byte Unicode (UTF-8) characters. It cannot rely on metadata. It must physically open the 50GB file, read every single byte into memory, and mathematically decode the UTF-8 sequences to calculate the true logical character count, resulting in massive disk I/O and CPU overhead ($O(n)$ time).

## Practice Problems

- _Problem:_ Count exactly how many files and directories exist in the absolute root (`/`) directory, returning only a pure integer.
  - _Hint:_ List the contents of the directory formatting them one per line, and pipe the output to the line-counting utility.
  - _Solution:_ `ls -1 / | wc -l` (This pipes the isolated directory listing and suppresses output to a single integer).
- _Problem:_ Output the absolute physical byte size of a file named `database.sqlite` into a variable named `DB_SIZE`, ensuring the filename itself is completely omitted from the variable's value.
  - _Hint:_ Utilize the specific byte-counting flag and enforce anonymous standard input redirection to strip the filename.
  - _Solution:_ `DB_SIZE=$(wc -c < database.sqlite)` (The `<` operator hides the file origin from the `wc` binary).

## References

- [GNU Coreutils - wc invocation](https://www.gnu.org/software/coreutils/manual/html_node/wc-invocation.html)
- [POSIX Standard - wc utility](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/wc.html)
  === END FILE ===
