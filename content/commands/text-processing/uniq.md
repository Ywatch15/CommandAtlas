---
slug: uniq
name: uniq
aliases: []
category: cloud-cli
tags:
  - linux
  - text-processing
  - deduplication
  - coreutils
  - data-analysis
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
  - remove duplicate lines linux
  - find unique lines bash
  - count duplicated lines
  - show only repeated lines
  - deduplicate text file
relatedCommands:
  - sort
  - awk
  - grep
  - wc
alternatives:
  - awk
status: draft
---

## What is it?

`uniq` is a POSIX-standard command-line utility that filters out or reports adjacent, repeated lines in a text file or standard input stream. It acts as an ultra-fast data deduplication engine, heavily utilized in system administration to collapse repetitive log entries, identify anomalous data points, and mathematically calculate the frequency (counts) of specific events occurring within massive datasets.

## Why does it exist?

When analyzing systems—such as finding the most active IP address in a 50GB Apache access log—an administrator needs to count occurrences. Loading 50GB of text into a programming language like Python just to execute a `.count()` dictionary operation would instantly exhaust physical RAM and crash the server. `uniq` exists to solve this memory constraint. Because it only compares the _current_ line to the _previous_ line in a stream, it requires virtually zero memory overhead. When combined with the `sort` command (which organizes identical lines sequentially), `uniq` provides limitless, O(1) memory deduplication and frequency counting for terminal pipelines.

## Syntax

```bash
uniq [OPTION]... [INPUT [OUTPUT]]
```

## Flags

| Flag                        | Description                                                                                                                       | Example                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `-c`, `--count`             | Prefixes every line in the output with the number of times it sequentially occurred in the input stream.                          | `uniq -c ips.txt`          |
| `-d`, `--repeated`          | Strictly suppresses unique lines. Outputs _only_ the lines that were duplicated in the input stream.                              | `uniq -d names.txt`        |
| `-u`, `--unique`            | Strictly suppresses duplicate lines. Outputs _only_ the lines that appeared exactly once in the input stream.                     | `uniq -u data.csv`         |
| `-i`, `--ignore-case`       | Instructs `uniq` to ignore differences in capitalization when comparing lines (e.g., treating "ERROR" and "Error" as duplicates). | `uniq -i error.log`        |
| `-f <N>`, `--skip-fields=N` | Instructs `uniq` to skip the first `N` fields (columns separated by space) when evaluating if a line is a duplicate.              | `uniq -f 2 timestamps.log` |
| `-s <N>`, `--skip-chars=N`  | Instructs `uniq` to skip the first `N` characters of the line when evaluating if a line is a duplicate.                           | `uniq -s 10 data.txt`      |
| `-w <N>`, `--check-chars=N` | Instructs `uniq` to limit its comparison to the first `N` characters of the line (after any skipped fields/chars).                | `uniq -w 8 ids.txt`        |
| `-z`, `--zero-terminated`   | Line delimiter becomes a null byte (`\0`) instead of a newline. Required for processing filenames containing spaces securely.     | `find . -print0            | sort -z | uniq -z` |

## Examples

```bash
sort names.txt | uniq
```

> The mandatory deduplication pipeline. `sort` forces all identical lines to be grouped sequentially. `uniq` then streams the sorted list, collapsing all adjacent duplicates into a single output line, rendering a perfectly unique list. (Note: `sort -u` performs this exact action natively).

```bash
sort access.log | uniq -c | sort -nr
```

> The quintessential frequency analysis pattern. It sorts the log, collapses duplicates while appending their frequency count (`-c`), and then pipes back into `sort` using numeric descending logic (`-nr`). This cleanly outputs the most frequent entries (like the highest-traffic IP addresses) at the absolute top of the terminal.

```bash
sort database_dump.csv | uniq -d
```

> Identifying data corruption. When a primary key constraint fails, an administrator must find the offending records. By using `-d`, the command filters out all healthy, unique records, dumping exactly and exclusively the records that have duplicate entries in the database dump.

```bash
sort logs.txt | uniq -u
```

> Finding singletons. Opposite of `-d`, the `-u` flag instructs the engine to print _only_ lines that appeared exactly one time. If an automated task runs a start and stop command, this pipeline instantly isolates the task that started but never logged its corresponding stop command.

```bash
uniq -f 3 application.log
```

> Bypassing variable metadata. Log files often start with dynamic timestamps (e.g., `2023-10-24 14:00:05 INFO Transaction_OK`). Because the timestamp changes every line, the lines are never identical. `-f 3` commands `uniq` to ignore the first 3 space-separated fields (Date, Time, LogLevel), deduplicating the stream based entirely on the actual message payload (`Transaction_OK`).

## Real-World Scenarios

**Monitoring Failed SSH Attempts**

```bash
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -nr | head -n 5
```

> Security operations frequently audit raw logs. This pipeline extracts the "Failed password" lines, uses `awk` to isolate the 11th column (which contains the attacker's IP address), groups identical IPs together (`sort`), calculates the total number of attack attempts per IP (`uniq -c`), and isolates the top 5 most aggressive attacking IPs (`sort -nr | head -n 5`) for firewall blocking.

**Isolating Missing Server Deployments**

```bash
cat expected_servers.txt active_servers.txt | sort | uniq -u
```

> An administrator has a list of 50 servers that _should_ be running, and queries an API for the 48 servers that _are_ running. By dumping both lists together, sorting them, and utilizing `uniq -u`, any server that is actively running will appear twice (and be suppressed). Only the 2 servers missing from the active list will appear exactly once, instantly highlighting the offline nodes.

## When should it NOT be used?

- **On Unsorted Data:** **Never use `uniq` on a file unless it has been aggressively sorted first.** `uniq` does not hold a history of the file in memory; it only compares Line 2 against Line 1. If Line 1 is "Apple", Line 2 is "Banana", and Line 3 is "Apple", `uniq` will print all three, believing them to be unique because they are not adjacent. You must always `sort` the data first.
- **Complex Deduplication Logic:** If you need to deduplicate based on a specific column (e.g., Column 2), but want to retain the data from Column 5 of the first match, `uniq` is incapable of complex relational logic. You must use associative arrays in `awk`.
- **Simple Deduplication:** If you just want to remove duplicates and don't need counting (`-c`) or specific filtering (`-d`, `-u`), do not run `sort | uniq`. It spawns two processes unnecessarily. Simply run `sort -u` (Sort Unique), which handles the deduplication natively inside the sorting algorithm.

## Alternatives

- **`sort -u`:** **Best for raw deduplication.** Bypasses the need to pipe data to the `uniq` binary, performing the sorting and unique filtering within a single heavily optimized C process.
- **`awk '!seen[$0]++'`:** **Best for preserving original file order.** Because `uniq` demands sorted data, it fundamentally destroys the original chronological line order of a file. This specific `awk` incantation uses an in-memory hash table to deduplicate a file dynamically while maintaining its exact original top-to-bottom sequence (at the cost of RAM).

## How it works internally

`uniq` operates as an incredibly lean, sequential memory buffer.

When executed, `uniq` allocates a RAM buffer strictly large enough to hold two lines of text: a `prev_line` buffer and a `this_line` buffer. It reads the first line of standard input into `prev_line`.

It then enters a continuous `while` loop. It reads the next incoming line into `this_line`. It utilizes the highly optimized C `strcmp()` function (or locale-aware equivalents) to compare `prev_line` against `this_line`.

- If the lines are identical, it increments an internal integer counter (`match_count++`). It discards `this_line` and reads the next line.
- If the lines are different, the sequence of duplicates has ended. It evaluates the user's flags. (E.g., if `-c` is active, it prints `match_count` followed by `prev_line`). It then copies the contents of `this_line` into `prev_line`, resets `match_count` to 1, and continues the stream.

Because it never stores more than two lines of text at any given microsecond, it utilizes exactly $O(1)$ memory. An administrator can safely pipe a 10-Terabyte sorted text stream into `uniq`, and it will process the data at maximum disk I/O speeds while consuming less than a few megabytes of RAM.

## Performance Notes

- **Locale Overheads:** In Linux, string comparison speed is heavily dictated by the `LC_ALL` environment variable. If the locale is set to `en_US.UTF-8`, `uniq` must execute complex, multi-byte Unicode collation comparisons. Prepending the pipeline with `LC_ALL=C` forces raw, byte-for-byte ASCII comparison, massively accelerating both `sort` and `uniq` execution times on heavy log files.

## Security Notes

- **Benign Operations:** `uniq` is a read-only stream filter. It does not execute arbitrary code or touch filesystem descriptors beyond standard input/output. It is completely safe to run against untrusted payloads.

## Common Mistakes

- **Forgetting to sort**
  - _Mistake:_ Running `cat application.log | uniq -c` to count error types.
  - _Why:_ As stated, `uniq` only evaluates _adjacent_ lines. If "Database Error" happens on line 1, and again on line 100, `uniq` treats them as two completely separate unique events. It will not aggregate them. You MUST pipe through `sort` first.
- **Misunderstanding `-f` (skip fields) delimiters**
  - _Mistake:_ Attempting to use `uniq -f 1` on a CSV file to skip the first column.
  - _Why:_ Unlike `cut` or `awk`, `uniq` does not have a flag to define custom delimiters (like a comma). The `-f` flag is rigidly hardcoded to split fields strictly based on spaces and tabs. To deduplicate a CSV based on specific columns, you must use `awk`.

## Best Practices

- **Always use `LC_ALL=C` for logs:** When parsing massive, machine-generated server logs (like NGINX or Postgres), UTF-8 awareness is useless. Form the habit of writing `LC_ALL=C sort file | uniq -c`. It prevents localization dictionary errors and speeds up the pipeline tremendously.
- **Leverage `--check-chars` for prefix counting:** If you want to count how many log entries occurred in each specific minute (e.g., `2023-10-01 14:05:XX`), use `uniq -w 16`. This commands the engine to only compare the first 16 characters (the date and minute), treating all variations of seconds within that minute as identical duplicates for rapid time-series bucketing.

## Interview Questions

**Q: An engineer needs to remove duplicate lines from a configuration file, but it is absolutely critical that the chronological order of the lines in the file remains exactly the same. Why can't they use `sort | uniq`, and what is the standard shell alternative?**
**A:** They cannot use `sort | uniq` because the `sort` command fundamentally reorganizes the text alphabetically. By the time `uniq` processes and removes the duplicates, the original structural sequence of the configuration file is destroyed. To deduplicate while preserving the original vertical order, they must use an in-memory hash array, typically via the standard AWK idiom: `awk '!seen[$0]++' config_file`.

**Q: Explain the exact behavioral differences in output between `uniq -d`, `uniq -u`, and a standard `uniq` command.**
**A:** Assuming the input is pre-sorted:
Standard `uniq` suppresses duplicate lines, outputting exactly one instance of every line encountered (returning a completely unique list).
`uniq -d` (repeated) outputs _only_ the lines that had at least one duplicate in the original file, completely silencing singletons.
`uniq -u` (unique) outputs _only_ the lines that appeared exactly once in the original file, completely silencing any line that had duplicates.

## Practice Problems

**Problem:** You are given a sorted list of email addresses in a file named `emails.txt`. Some emails appear multiple times. You need to output a list showing only the email addresses that appeared exactly once in the file, ignoring all addresses that were duplicated. Write the command.
**Hint:** Use the flag explicitly designed to isolate singletons.
**Solution:**

```bash
uniq -u emails.txt
```

**Problem:** You have a sorted log file `events.log`. Each line begins with a 5-digit ID, a space, and then an action string (e.g., `12345 LOGIN_SUCCESS`). You want to count the occurrences of each action string, completely ignoring the 5-digit ID at the beginning of the line.
**Hint:** Use the flag to generate a count, and combine it with the flag to skip the first field during comparison.
**Solution:**

```bash
uniq -c -f 1 events.log
```

## References

- [uniq(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/uniq)
- [GNU Coreutils Manual: uniq invocation](https://www.gnu.org/software/coreutils/manual/html_node/uniq-invocation.html)
