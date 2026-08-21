---
slug: paste
name: paste
aliases: []
category: text-processing
tags:
  - text-processing
  - formatting
  - merge
  - columns
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
  - merge files side by side
  - combine two columns linux
  - join lines sequentially
  - transpose columns to rows
  - concatenate text horizontally
relatedCommands:
  - cat
  - cut
  - join
  - awk
alternatives:
  - join
  - awk
status: draft
---

## What is it?

`paste` is a core POSIX text-processing utility that merges corresponding lines from multiple files or data streams. While `cat` appends files vertically (one file after another), `paste` merges them horizontally, taking line 1 from file A, joining it to line 1 from file B using a designated delimiter, and writing the combined row to standard output.

## Why does it exist?

In shell scripting, manipulating relational or tabular data across disparate files is notoriously difficult. If a script generates a file containing a list of server hostnames, and another script generates a file containing their corresponding IP addresses, merging this parallel data into a single CSV requires complex `awk` arrays or heavy looping. `paste` exists to perform this exact physical horizontal alignment effortlessly, natively multiplexing multiple file descriptors simultaneously to stitch disparate data columns together instantly.

## Syntax

```bash
paste [options] [file...]
```

## Flags

| Flag        | Description                                                                                                 | Example                      |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `-d <list>` | Specifies the delimiter character(s) used to join the lines. Defaults to a single Tab (`\t`).               | `paste -d "," f1.txt f2.txt` |
| `-s`        | Serial mode. Transposes the data; pastes the lines of one file horizontally before moving to the next file. | `paste -s names.txt`         |
| `-z`        | (GNU specific) Zero-terminated. Expects lines to be separated by a NUL byte (`\0`) rather than a newline.   | `paste -z f1.bin f2.bin`     |
| `-` (Dash)  | Reads from standard input sequentially. Multiple dashes consume multiple lines from the stream.             | `ls                          | paste - - -` |

## Examples

```bash
paste names.txt ages.txt
```

> This is the default execution. It reads the first line of `names.txt`, inserts a Tab character, reads the first line of `ages.txt`, and prints the combined string to standard output. It repeats this until both files are entirely exhausted.

```bash
paste -d "," hostnames.csv ips.csv > combined.csv
```

> This executes a clean tabular merge. By explicitly redefining the delimiter to a comma (`-d ","`), it merges the two disparate single-column files into a properly formatted, two-column Comma-Separated Values (CSV) file.

```bash
paste -s -d " " items.txt
```

> This performs array flattening (transposition). If `items.txt` contains a vertical list of 10 items (one per line), the `-s` (serial) flag forces `paste` to read all 10 lines from the single file and join them horizontally, separated by a single space, transforming a vertical column into a single horizontal row.

```bash
paste -d ":|" file1 file2 file3
```

> This utilizes a rotating delimiter list. `paste` will join `file1` and `file2` using a colon (`:`), and then join `file2` and `file3` using a pipe (`|`). If there are more files, it wraps around and uses the colon again.

```bash
ls | paste -d "," - - - -
```

> This demonstrates the powerful `-` (stdin) multiplexing paradigm. The output of `ls` is piped into `paste`. Because there are four dashes (`- - - -`), `paste` consumes four consecutive lines from standard input, merges them with commas, outputs the row, and repeats. This instantly formats a vertical list into a grid of 4 columns.

## Real-World Scenarios

**Constructing Authentication Files**

```bash
paste -d ":" users.txt passwords_hashed.txt > .htpasswd
```

> Security administrators automating the generation of basic web authentication files merge a column of extracted usernames with a column of generated bcrypt hashes, instantly linking the parallel arrays via the mandated colon delimiter to form a valid `.htpasswd` payload.

**Combining Metric Telemetry**

```bash
paste -d "," <(awk '{print $1}' cpu.log) <(awk '{print $1}' ram.log)
```

> DevOps engineers use bash Process Substitution (`<()`) to feed dynamic command streams directly into `paste`. This command extracts the first column of the CPU log and the first column of the RAM log simultaneously, merging them side-by-side into a unified CSV stream for Grafana ingestion.

## When should it NOT be used?

- **Relational Database Joins:** **Reason:** `paste` performs "dumb" merging. It aligns Line 1 with Line 1. If `fileA` has "Alice" on line 1, and `fileB` has "Bob's data" on line 1, `paste` will blindly stitch them together. **Use instead:** `join`, which evaluates specific keys and performs actual mathematical relational matches (Inner/Outer joins).
- **Visual terminal formatting:** **Reason:** Merging files with uneven string lengths using default Tab delimiters causes catastrophic column misalignment on the terminal screen. **Use instead:** `column -t` or `pr -m -t`.

## Alternatives

- **`join`:** Relational merging. **Tradeoff:** `join` is infinitely safer for correlated data because it requires files to be sorted and explicitly matches data based on shared primary keys, preventing corruption if one file is missing a row. `paste` is faster but dangerous.
- **`awk 'NR==FNR{a[NR]=$0;next} {print a[FNR]","$0}'`:** The heavy processor. **Tradeoff:** `awk` can replicate `paste` natively by caching the first file in RAM and printing it alongside the second file. It is vastly more powerful but requires complex programming logic.
- **`pr -m -t`:** Parallel printing. **Tradeoff:** `pr` merges files side-by-side and pads them with spaces to ensure perfect visual column alignment, making it superior for human reading but worse for programmatic data pipelines.

## How it works internally

`paste` is a highly efficient stream multiplexer.

When executed on multiple files, `paste` does not load the files into a massive RAM array. Instead, it issues multiple `open()` system calls, establishing independent file descriptor arrays for every file passed as an argument.

It enters an execution loop. Inside the loop, it issues a `read()` (or `getline()`) system call against the first file descriptor, buffering the text up to the newline `\n`. It strips the newline, prints the string to standard output, and prints the designated delimiter from the `-d` list. It then executes a `read()` against the second file descriptor, prints the text, and prints the next delimiter.

Once it iterates through all file descriptors, it prints a final newline character `\n` to standard output and begins the loop again for the second row.

If the files are unequal in length, `paste` does not crash. If `fileA` runs out of lines, `paste` simply prints an empty string (followed by the delimiter) for that column, continuing to process `fileB` until absolutely all file descriptors report an End of File (EOF).

## Performance Notes

- **Zero-RAM Footprint:** Because `paste` multiplexes file descriptors dynamically via sequential `getline()` calls, it consumes practically zero memory. It can cleanly merge three 100-Gigabyte text files horizontally without impacting system RAM.
- **File Descriptor Limits:** If you attempt to run `paste file1 file2 ... file1050`, the utility must open 1,050 file descriptors simultaneously. This will likely exceed the kernel's default `ulimit -n` (often 1024), causing `paste` to crash with a "Too many open files" error.

## Security Notes

- **Data Desync Vulnerability:** If log aggregation scripts use `paste` to merge parallel diagnostic files, and one file drops a single line due to an application glitch, every single subsequent row merged by `paste` will be offset by one. This silent data corruption can lead to critical misattributions in security audits. Use `join` for data requiring absolute integrity.

## Common Mistakes

- **Using `paste` instead of `join` for keyed data:** **Why it's wrong:** As noted, `paste` is blind. It joins strictly by line number. If the data order drifts, the merged CSV is completely corrupted.
- **Misunderstanding the delimiter list:** Running `paste -d ",|" f1 f2 f3`. **Why it's wrong:** The `-d` flag accepts a string of rotating delimiters. It uses `,` between f1 and f2, and `|` between f2 and f3. Users often think `-d ",|"` means "split on comma or pipe". It strictly defines the _insertion_ characters.
- **Using the Serial (`-s`) flag on multiple files:** Running `paste -s f1.txt f2.txt`. **Why it's wrong:** Users expect this to paste the files together. Instead, it transposes `f1.txt` entirely onto line 1, and transposes `f2.txt` entirely onto line 2.

## Best Practices

- When utilizing `-d` with special characters (like tabs, newlines, or backslashes), wrap the delimiter string strictly in standard quotes (e.g., `paste -d '\n'`) to prevent the Bash shell from executing premature escape evaluations before the binary receives the argument.
- The idiom `ls | paste -s -d "," -` is the absolute fastest, built-in methodology to convert any vertical list output by a pipeline into a single, clean, comma-separated string, negating the need for complex `awk` or `tr` loops.

## Interview Questions

**Q:** You have a text file (`servers.txt`) containing 100 hostnames, listed one per line. What is the most efficient, native command to transpose this file so that all 100 hostnames are printed on a single horizontal line, separated by commas?
**A:** You use the `paste` command with the Serial (`-s`) flag to transpose the vertical column into a horizontal row, combined with the delimiter (`-d`) flag to enforce the comma. The command is `paste -s -d "," servers.txt`.
**Q:** What is the fundamental, architectural danger of using `paste` to merge a file containing Employee IDs with a file containing Employee Salaries, compared to using the `join` command?
**A:** `paste` performs completely blind, line-by-line mechanical stitching. It assumes Line 5 in File A perfectly correlates with Line 5 in File B. If a single line is missing, added, or sorted incorrectly in one file, all subsequent rows are misaligned, causing catastrophic data corruption. The `join` command evaluates the text against a shared primary key (e.g., the Employee ID), guaranteeing that data is only merged if the relational logic matches perfectly.
**Q:** A developer executes `cat data.txt | paste - - -`. What is the functional behavior of utilizing the dash (`-`) multiple times as arguments to the `paste` command?
**A:** The dash (`-`) is a standard POSIX convention instructing a utility to read from standard input. In `paste`, multiple dashes act as a multiplexer. The command consumes one line from standard input for the first dash, a second line for the second dash, and a third line for the third dash. It merges these three distinct sequential lines into a single horizontal row separated by tabs. This effectively formats a single vertical column into a 3-column grid.

## Practice Problems

**Problem:** Merge two files, `keys.txt` and `values.txt`, into a single horizontal row, ensuring the fields are separated exactly by an equals sign `=`.
**Hint:** Define the specific delimiter string and pass both filenames to the base command.
**Solution:** `paste -d "=" keys.txt values.txt` (This constructs a basic associative mapping array output).
**Problem:** Execute the `date` command and the `whoami` command simultaneously using Bash process substitution, and merge their respective outputs onto a single line separated by a hyphen `-`.
**Hint:** Use `<(command)` syntax to route the dynamic outputs as file descriptors directly into the merge utility, specifying the custom delimiter.
**Solution:** `paste -d "-" <(date) <(whoami)` (This leverages transient file descriptors to stitch command outputs natively without creating intermediate temp files).

## References

- [GNU Coreutils - paste invocation](https://www.gnu.org/software/coreutils/manual/html_node/paste-invocation.html)
- [POSIX Standard - paste utility](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/paste.html)
  === END FILE ===
