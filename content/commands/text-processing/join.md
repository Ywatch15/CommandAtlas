---
slug: join
name: join
aliases: []
category: text-processing
tags:
  - linux
  - text-processing
  - data-manipulation
  - databases
  - coreutils
difficulty: advanced
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - merge two files by common column
  - sql inner join in bash
  - combine text files based on matching field
  - join lines of two files
  - relational join linux command
relatedCommands:
  - paste
  - awk
  - sort
  - cut
alternatives:
  - awk
status: draft
---

## What is it?

`join` is a powerful, POSIX-standard data manipulation utility that merges the lines of two distinct text files based on the presence of a common, shared field (column). It acts as the command-line equivalent of a relational database `INNER JOIN` (and supports `OUTER JOIN` equivalents), enabling administrators and data scientists to correlate dispersed text-based datasets natively in the shell without requiring a database engine or complex scripting languages.

## Why does it exist?

In Unix environments, data is frequently generated and stored in separate, specialized flat files (e.g., `/etc/passwd` holds user IDs, while a separate security log holds user actions). If an administrator needs to cross-reference the user IDs in the log with the names in the password file, `cat` and `grep` are insufficient. `join` exists to provide a highly optimized, native relational mapping engine. By aligning records based on a strict primary key (the shared column), it allows the immediate, in-memory synthesis of massive datasets directly within standard bash pipelines.

## Syntax

```bash
join [OPTION]... FILE1 FILE2
```

_(Note: To read from standard input for one of the files, use `-` in place of the filename)._

## Flags

| Flag                      | Description                                                                                                                       | Example                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `-t <CHAR>`               | Sets the input and output field separator (delimiter). Defaults to whitespace (spaces/tabs).                                      | `join -t ':' file1 file2`            |
| `-1 <FIELD>`              | Specifies the exact column number (1-based index) to use as the join key in the _first_ file.                                     | `join -1 3 file1 file2`              |
| `-2 <FIELD>`              | Specifies the exact column number (1-based index) to use as the join key in the _second_ file.                                    | `join -2 1 file1 file2`              |
| `-j <FIELD>`              | A shortcut to specify that the join key is located at the exact same column index in _both_ files.                                | `join -j 2 file1 file2`              |
| `-a <FILENUM>`            | Performs an Outer Join. Prints unpairable lines from the specified file (1 or 2) in addition to the standard paired lines.        | `join -a 1 file1 file2`              |
| `-v <FILENUM>`            | Performs an Anti-Join. Suppresses paired lines entirely, outputting _only_ the lines from the specified file that had no match.   | `join -v 2 file1 file2`              |
| `-e <STRING>`             | Replaces missing input fields with the specified `<STRING>` when performing outer joins. (Must be used with `-o`).                | `join -a 1 -e "NULL" -o 1.1,2.2 ...` |
| `-o <FORMAT>`             | Explicitly formats the output string. Accepts a comma-separated list of `FILE.FIELD` identifiers.                                 | `join -o 1.1,1.2,2.3 file1 file2`    |
| `-i`, `--ignore-case`     | Ignores case differences when comparing the join keys (e.g., treating "Alice" and "alice" as identical keys).                     | `join -i file1 file2`                |
| `--header`                | Treats the first line of each file as a header. It joins the headers without sorting them, then sorts/joins the rest of the data. | `join --header file1 file2`          |
| `--check-order`           | Forces `join` to instantly crash and throw an error if it detects the input files are not correctly sorted.                       | `join --check-order file1 file2`     |
| `--nocheck-order`         | Disables the safety warning if `join` detects unsorted data, allowing the execution to proceed (highly risky).                    | `join --nocheck-order file1 file2`   |
| `-z`, `--zero-terminated` | Processes lines terminated by null bytes (`\0`) instead of newlines.                                                              | `join -z file1 file2`                |

## Examples

```bash
# files must be sorted!
join file1.txt file2.txt
```

> The standard inner join. By default, it uses whitespace as the delimiter and column 1 as the primary key for both files. It outputs a merged line (Key, followed by the rest of File1's fields, followed by File2's fields) strictly for records where the Key existed in both files.

```bash
join -t ',' -1 2 -2 1 users.csv departments.csv
```

> Specifying delimiters and mismatched keys. It explicitly sets the delimiter to a comma (`-t ','`). It joins the two files by correlating the 2nd column of `users.csv` (e.g., Department_ID) with the 1st column of `departments.csv` (e.g., ID).

```bash
join -a 1 employees.txt bonuses.txt
```

> The Left Outer Join. It outputs all correctly matched employees. Crucially, the `-a 1` flag forces it to also print lines from File 1 (`employees.txt`) even if the employee did not have a matching record in `bonuses.txt`.

```bash
join -v 1 current_users.txt backup_users.txt
```

> The Delta/Anti-Join. Evaluates both files but exclusively prints the records from File 1 (`current_users.txt`) that have absolutely no match in File 2. This is the canonical method for answering: "Which new users exist today that were not in yesterday's backup?"

```bash
join -t ':' -o 1.1,1.3,2.4 /etc/passwd custom_data.txt
```

> Explicit output formatting. Instead of blindly dumping all columns from both files, `-o` meticulously crafts the output string. It prints the 1st column from File 1 (`1.1`), the 3rd column from File 1 (`1.3`), and the 4th column from File 2 (`2.4`), completely discarding all other data.

## Real-World Scenarios

**Correlating System Logs with User Databases**

```bash
# Sort both files by the target column (UID) first
sort -t ':' -k 3 /etc/passwd > sorted_passwd
sort -t ':' -k 1 audit_logs.txt > sorted_logs
join -t ':' -1 3 -2 1 sorted_passwd sorted_logs
```

> Security teams receive raw audit logs containing only numeric UIDs (User IDs) but need human-readable usernames for the final report. The engineer uses `sort` to organize both `/etc/passwd` and the audit log by the UID column. They then use `join` to stitch the files together, dynamically enriching the raw audit log with the usernames from the OS database.

## When should it NOT be used?

- **Unsorted Files:** **Never use `join` on unsorted files.** This is the primary reason `join` fails for beginners. `join` does not load files into memory; it reads them stream-by-stream. If the files are not pre-sorted lexicographically on the exact join key, `join` will silently skip matches or throw an `is not sorted` error. You must run `sort` before `join`.
- **Complex SQL Logic:** If you need to perform `GROUP BY` aggregations, multi-column compound primary keys (`JOIN ON a.id = b.id AND a.date = b.date`), or complex `WHERE` clause filtering, `join` is incapable. You must migrate the data into SQLite or use `awk` data structures.
- **Files with Header Rows (Without GNU):** On older UNIX systems, `join` treats header rows ("ID, Name, Date") as normal data. Since "ID" doesn't sort mathematically with numbers, it breaks the output. (Modern GNU `join` mitigates this with the `--header` flag, but it remains a portability risk).

## Alternatives

- **`awk`:** **The robust, memory-based alternative.** `awk 'NR==FNR{a[$1]=$2;next} {print $0, a[$1]}'` achieves an inner join without requiring the files to be sorted, because `awk` loads the entire first file into a RAM hash table. This is superior for small/medium files, but `join` is better for massive 50GB files that exceed RAM capacity.
- **`paste`:** **Best for blind lateral merging.** If two files have the exact same number of lines and are already perfectly aligned, `paste file1 file2` blindly stitches line 1 to line 1. It performs zero relational key-matching logic.
- **`sqlite3`:** **Best for complex relational algebra.** For anything beyond a simple primary-key mapping, importing the CSVs into an ephemeral, in-memory SQLite database (`sqlite3 :memory:`) allows execution of true, unconstrained SQL syntax.

## How it works internally

`join` is engineered for absolute minimal memory consumption (`O(1)` memory overhead) to allow processing of datasets massively larger than physical RAM.

It accomplishes this by demanding that the input files are strictly pre-sorted based on the join key.

When executed, `join` opens file descriptors for both files. It reads the first line of File 1 and the first line of File 2. It compares the keys using `strcmp()` (or equivalent collation comparisons).

- If Key 1 equals Key 2, it outputs the merged line, and advances the read pointer for both files.
- If Key 1 is "less than" Key 2 (alphabetically), it knows Key 1 cannot possibly exist in File 2 (because File 2 is sorted). It drops Key 1, reads the next line of File 1, and compares again.
- If Key 1 is "greater than" Key 2, it drops Key 2 and advances File 2's read pointer.

Because it only ever holds the two current lines in RAM, it can join petabytes of data instantly. The fatal drawback of this algorithm is that if the files are not perfectly sorted, the "less than/greater than" logic fails catastrophically, and `join` will falsely assume a key doesn't exist and skip it.

## Performance Notes

- **Collation Mismatches:** The single biggest performance and execution flaw when using `join` is collation (locale) mismatch. If you sort a file with `LC_ALL=C sort` but your system runs `join` using `en_US.UTF-8`, the sorting order logic will mismatch, and `join` will crash complaining the file is unsorted. Always standardize the locale: `LC_ALL=C join file1 file2`.

## Security Notes

- **Non-Destructive:** `join` is a pure data processing utility. It operates entirely in user-space RAM and stdout, lacking the capability to escalate privileges, alter file permissions, or execute arbitrary code.

## Common Mistakes

- **Ignoring the `sort` requirement**
  - _Mistake:_ Running `join a.txt b.txt` on raw, unorganized data exports.
  - _Why:_ As detailed in the internals, the algorithm fundamentally relies on sequential key matching. If the keys are out of order, the pointers misalign, and `join` will output completely blank or fragmented results. _Always_ `sort -k` your files before joining.
- **Mismatched field delimiters**
  - _Mistake:_ Using `join` on two CSV files without passing `-t ','`.
  - _Why:_ `join` defaults to whitespace (spaces and tabs). If you feed it a comma-separated file, it treats the entire line as a single monolithic column (Column 1). It will attempt to join the files by matching the entire line against the other entire line, which will always fail.
- **Unmatched column keys**
  - _Mistake:_ Attempting to join on a column that has leading spaces in File 1 but no leading spaces in File 2.
  - _Why:_ `join` performs strict, literal string comparison. `" 123"` does not equal `"123"`. You must use `awk` or `sed` to sanitize and strip whitespace from your keys before attempting the join.

## Best Practices

- **Use Process Substitution for Clean Sorting:** Instead of creating intermediate `.sorted` files on your hard drive, leverage Bash process substitution (`<()`) to sort the files dynamically in RAM right as they are fed into `join`. Example: `join -t ',' -1 1 -2 1 <(sort -t ',' -k 1 fileA.csv) <(sort -t ',' -k 1 fileB.csv)`.
- **Standardize Locales:** Always prefix `join` and its precursor `sort` commands with `LC_ALL=C`. This forces raw byte-value ASCII sorting, eliminating unpredictable Unicode dictionary sorting rules that break the `join` state machine.

## Interview Questions

**Q: You execute `join dataA.txt dataB.txt`. The command runs, outputs three lines of merged data, and then abruptly stops with an error message: `join: dataA.txt:6: is not sorted`. Explain the architectural reason `join` requires files to be sorted, and how you would alter the pipeline to fix this.**
**A:** `join` operates sequentially using two read pointers, holding only one line of each file in RAM at a time to maintain `O(1)` memory efficiency. It relies on mathematical greater-than/less-than comparisons to advance these pointers. If the files are unsorted, this sequential comparison logic breaks down, as a matching key might have been skipped earlier in the stream. You fix this by pre-sorting the files using process substitution: `join <(sort dataA.txt) <(sort dataB.txt)`.

**Q: You have two files: `employees.txt` and `terminated.txt`. Both contain employee IDs in the first column. Write the specific `join` command (assuming they are sorted) to act as an "Anti-Join", outputting _only_ the employees that exist in `employees.txt` who have NOT been terminated.**
**A:** You must use the `-v` flag, which suppresses matched lines and prints only the unpairable lines from the specified file. The command is `join -v 1 employees.txt terminated.txt`. This strictly isolates records present in File 1 that have no correlating ID in File 2.

## Practice Problems

**Problem:** You have two comma-separated files, `users.csv` and `billing.csv`. You need to merge them. The user ID is located in the 3rd column of `users.csv` and the 1st column of `billing.csv`. Write the `join` command to link them together properly. (Assume the files are already sorted).
**Hint:** Specify the delimiter flag, and use the two specific file-column index flags.
**Solution:**

```bash
join -t ',' -1 3 -2 1 users.csv billing.csv
```

**Problem:** You are joining two sorted files. You want the output to be heavily customized. You only want the final output string to consist of the 2nd column from the first file, followed by a space, followed by the 4th column of the second file. Write the command.
**Hint:** Use the specific output formatting flag and its unique dot-notation syntax.
**Solution:**

```bash
join -o 1.2,2.4 file1 file2
```

## References

- [join(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/join)
- [GNU Coreutils Manual: join invocation](https://www.gnu.org/software/coreutils/manual/html_node/join-invocation.html)
