---
slug: date
name: date
aliases: []
category: linux
tags:
  - time
  - system-clock
  - formatting
  - shell-scripting
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
  - get current time
  - format date string
  - set system clock
  - convert timestamp to date
  - get unix epoch time
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`date` is a command-line utility used to display the current system time and date in highly customizable formats, or to forcefully set the kernel's software clock. It excels at parsing, converting, and translating arbitrary time strings and Unix epoch timestamps into human-readable or machine-parsable layouts.

## Why does it exist?

Before the advent of automated chronometry daemons (like `chronyd` or `systemd-timesyncd`), administrators required a manual tool to query and manually adjust the kernel's software clock. `date` was built to provide this interface while exposing the rich string-formatting capabilities of the C library's `strftime()` function, fulfilling the critical need for shell scripts to dynamically generate precise timestamps for logs, backups, and file naming.

## Syntax

```bash
date [OPTION]... [+FORMAT]
date [-u|--utc|--universal] [MMDDhhmm[[CC]YY][.ss]]
```

## Flags

| Flag                          | Description                                                                                                    | Example                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `-d`, `--date=STRING`         | Displays the time described by `STRING` instead of the current active system time.                             | `date -d "tomorrow"`            |
| `-u`, `--utc`                 | Prints or sets the time in Coordinated Universal Time (UTC) rather than the local timezone.                    | `date -u`                       |
| `-I[FMT]`, `--iso-8601[=FMT]` | Outputs the date/time in standard ISO 8601 format (FMT can be `date`, `hours`, `minutes`, `seconds`, or `ns`). | `date -Iseconds`                |
| `-R`, `--rfc-email`           | Outputs the date and time in the RFC 5322 format, typically used in email headers.                             | `date -R`                       |
| `--rfc-3339=FMT`              | Outputs the date/time in RFC 3339 format, often preferred for JSON or API payloads.                            | `date --rfc-3339=seconds`       |
| `-r`, `--reference=FILE`      | Displays the last modification time (mtime) of the specified file instead of the current clock.                | `date -r /etc/passwd`           |
| `-s`, `--set=STRING`          | Sets the system software clock to the time described by `STRING` (requires root).                              | `date -s "2024-01-01 12:00:00"` |
| `-f`, `--file=DATEFILE`       | Reads multiple date strings line by line from a file and parses each one sequentially.                         | `date -f dates.txt`             |
| `--debug`                     | Annotates the parsed date string with warnings and logic steps to debug complex `-d` inputs.                   | `date --debug -d "last fri"`    |
| `--help`                      | Displays a comprehensive summary of all valid format specifiers (e.g., `%Y`, `%m`, `%d`) and exits.            | `date --help`                   |

## Examples

```bash
date +"%Y-%m-%d %H:%M:%S"
```

> This prints the current local time in a standard SQL-friendly format. The `+` symbol instructs `date` to use the provided string as a formatting template, where `%Y` is the 4-digit year, `%m` the month, and `%H` the 24-hour clock.

```bash
date +%s
```

> This prints the current Unix Epoch time. `%s` is a specialized format specifier that outputs the exact number of seconds that have elapsed since 00:00:00 UTC on January 1, 1970 (excluding leap seconds).

```bash
date -d "2023-10-31 15:00:00" +%s
```

> This converts a specific, human-readable date string into a Unix Epoch integer. The `-d` flag sets the internal parser's target time, and `+%s` formats that target into seconds.

```bash
date -d "last friday - 2 days"
```

> This utilizes the GNU `date` tool's Bison-based natural language parser. It calculates the date occurring two days prior to the most recent Friday, relative to the current system clock, and outputs it in the default format.

```bash
date -r /var/log/syslog -I
```

> Instead of checking the current system clock, this queries the filesystem for the last modification metadata (mtime) of the `syslog` file, and prints that date strictly in ISO 8601 (`YYYY-MM-DD`) format.

## Real-World Scenarios

**Timestamping automated backup archives.**

```bash
tar -czf database-backup-$(date +%F).tar.gz /var/lib/postgresql/data
```

> When scripting daily cron jobs, administrators use `$(date +%F)` (a shortcut for `%Y-%m-%d`) to dynamically generate a unique filename for the backup archive. This prevents consecutive runs from destructively overwriting previous backups.

**Measuring exact script execution duration.**

```bash
START=$(date +%s); sleep 5; END=$(date +%s); echo "Duration: $((END-START))s"
```

> To profile script performance, developers capture the Unix Epoch time immediately before and after a workload. By converting the times to simple integers, the script performs native arithmetic to calculate the exact execution latency.

**Normalizing UTC server logs to a local timezone.**

```bash
date -d "2023-11-05T14:32:00Z"
```

> When analyzing infrastructure logs standardized to UTC (indicated by the `Z` suffix), an administrator can pipe or paste the ISO 8601 string into `date -d`. The command natively translates the UTC time into the server's locally configured `TZ` timezone for easier cognitive processing.

## When should it NOT be used?

- **Keeping production servers synchronized.** Running `date -s` via a cron job. **Reason:** Hard-setting the system clock causes abrupt time jumps backward or forward, which corrupts database transactions, breaks clustered filesystems, and invalidates temporary SSL handshakes. **Use instead:** NTP daemons like `chronyd` or `systemd-timesyncd` which gracefully "slew" (speed up or slow down) the clock.
- **Parsing millions of dates in tight shell loops.** **Reason:** Spawning the `/bin/date` executable as a child process inside a `while` loop for 100,000 log lines introduces massive OS context-switching overhead, bringing the script to a crawl. **Use instead:** Native datetime libraries in `awk`, `perl`, or `python` which process the stream within a single process.
- **High-precision application profiling.** **Reason:** While `date +%N` can request nanoseconds, the latency introduced by shell evaluation and binary execution makes it fundamentally unreliable for sub-millisecond benchmarking. **Use instead:** Native language profilers or the `perf` subsystem.

## Alternatives

- **`timedatectl`:** The systemd utility for time management. **Tradeoff:** It is vastly superior for permanently configuring timezones, toggling NTP synchronization, and querying hardware clocks, but it lacks the string-formatting (`+%Y`) and natural language parsing (`-d`) required for shell scripting.
- **`hwclock`:** Interacts directly with the motherboard's battery-backed Real-Time Clock (RTC). **Tradeoff:** Operates at a lower hardware level than `date` (which queries the kernel's software clock). It is primarily used by the OS during boot and shutdown to sync the two clocks, not for daily script formatting.
- **`printf "%T"`:** A built-in time formatting feature available in Bash 4.2+. **Tradeoff:** Because it is a builtin, it eliminates the `fork()` overhead of the `date` binary entirely, making it incredibly fast in loops. However, it supports a highly restricted set of format strings and completely lacks relative/natural language parsing.

## How it works internally

When invoked, `date` executes the `gettimeofday()` or `clock_gettime()` system call to fetch the kernel's current software chronometer (which stores time strictly as the number of seconds and nanoseconds since the Unix Epoch). It then consults the `TZ` environment variable; if absent, it reads the compiled zoneinfo database (usually symlinked at `/etc/localtime`) to determine the active timezone offset and daylight saving rules.

For formatting, the binary passes the localized time data to the standard C library function `strftime()`. This function acts as a template engine, translating format specifiers (like `%B` for full month name) into localized text based on the active `LC_TIME` locale setting.

When the `-d` (date string) flag is provided, GNU `date` relies on `get_date()`, a highly complex lexical parser generated using Bison/Yacc. This parser evaluates leap years, overlapping timezone declarations, and relative natural language tokens (e.g., "next Thursday", "ago", "+2 months") to calculate the intended temporal offset before passing the result to the formatter.

## Performance Notes

- Calling `date` requires a `fork()` and `execve()` system call. While a single invocation executes in roughly 1 to 2 milliseconds, utilizing it inside a deeply nested shell loop processing large text files will bottleneck execution strictly due to OS process creation overhead.
- The natural language parser invoked by the `-d` flag is significantly more CPU-intensive than standard time formatting, as it requires extensive string tokenization, lexing, and offset arithmetic.
- Prepending `TZ=UTC` to the command (e.g., `TZ=UTC date`) is marginally faster than local time execution, as it instructs the C library to bypass opening and parsing the binary `/etc/localtime` file entirely.

## Security Notes

- **Time-Jacking Vulnerabilities:** Allowing unprivileged users or service accounts to execute `date -s` via `sudo` without a password is a critical risk. Attackers can deliberately wind the server clock backward to bypass Time-Based One-Time Passwords (TOTP), validate expired SSL certificates, or break Kerberos ticket verification.
- **Log Forging:** Shell scripts frequently rely on `date` to generate timestamps for audit logs. Because `date` inherently trusts the user's `TZ` environment variable, an attacker can trivially falsify the logged time of their malicious actions by injecting a manipulated timezone offset (e.g., `TZ="UTC-10" ./audit_script.sh`).
- **Format String Injection:** If a shell script directly passes unsanitized user input into the formatting parameter (e.g., `date "+$USER_INPUT"`), it causes unpredictable parsing behavior and output mangling, though it stops short of arbitrary code execution due to `strftime`'s internal bounds checking.

## Common Mistakes

- **Using `%h` for hours:** Running `date +%h:%m:%s` expecting the time. **Why it's wrong:** In `strftime` syntax, `%h` is the abbreviation for the month (e.g., Jan), and `%m` is the numeric month (e.g., 01). Hours and minutes are represented by uppercase `%H` and `%M`. The correct command is `date +%H:%M:%S`.
- **Confusing BSD and GNU date flags:** Attempting to use `date -d "tomorrow"` on a macOS machine. **Why it's wrong:** macOS utilizes BSD `date`, which uses the `-v` flag (`date -v+1d`) for relative time adjustment. The `-d` flag is exclusive to GNU Coreutils, causing scripts developed on Linux to fail on Mac.
- **Failing to quote the format string:** Typing `date +%Y %m %d` in the shell. **Why it's wrong:** The shell splits arguments on empty spaces before passing them to the binary. `date` sees `+%Y` as the format string, and interprets `%m` and `%d` as separate file arguments, leading to an error. You must quote the entire string: `date "+%Y %m %d"`.

## Best Practices

- Always use ISO 8601 formatting (`date -Iseconds` or `date +%Y-%m-%dT%H:%M:%S%z`) when generating application logs or JSON payloads. This guarantees unambiguous, timezone-aware machine parsing across distributed microservices.
- Prefix shell script invocations with `TZ=UTC` (e.g., `TIMESTAMP=$(TZ=UTC date +%F)`) in cloud environments to ensure timestamps are generated strictly in UTC, regardless of how the underlying host operating system was configured by a separate team.
- Capture the timestamp into a variable at the very beginning of a script (`RUN_TIME=$(date +%s)`) rather than querying `date` repeatedly throughout the script. This ensures temporal consistency across all database entries and file names generated during that specific execution run.

## Interview Questions

**Q:** How do you reliably calculate yesterday's date in a shell script, outputting strictly in YYYY-MM-DD format?
**A:** You use the `-d` (date string) flag for natural language parsing alongside the `%F` format shortcut. The command is `date -d "yesterday" +%F` (or `date -d "1 day ago" +%F`).

**Q:** What exactly is the Unix Epoch, and how do you instruct the `date` command to output the current Epoch time?
**A:** The Unix Epoch is the total number of seconds that have elapsed since 00:00:00 UTC on January 1, 1970, excluding leap seconds. You can print the current system Epoch time by running `date +%s`.

**Q:** If a shell script processing a 50,000-line CSV file is running extremely slowly, and you notice `date` is being called to format the time for every single line, what is the architectural problem?
**A:** `date` is an external binary executable. Calling it inside a loop forces the operating system to perform a `fork()` and `exec()` system call 50,000 times, introducing massive context-switching overhead. The formatting should be refactored to use a language like `awk` or Bash 4's built-in `printf "%T"`.

## Practice Problems

**Problem:** Write a single command to display the current time in Coordinated Universal Time (UTC), formatted exactly as `YYYY-MM-DD HH:MM:SS`.
**Hint:** You must use the universal time flag, and combine the standard formatting specifiers inside a quoted string.
**Solution:** `date -u +"%Y-%m-%d %H:%M:%S"` (The `-u` flag overrides the local timezone to UTC, and the `+` prefix initiates the specific layout sequence).

**Problem:** Using GNU date, calculate exactly what day of the week January 1, 2030, falls on.
**Hint:** Use the string parsing flag to set the target time, and find the format specifier that extracts the full weekday name.
**Solution:** `date -d "2030-01-01" +%A` (The `-d` flag sets the internal clock to the target date, and `%A` extracts the localized full weekday name, outputting "Tuesday").

## References

- [date(1) - Linux manual page](https://man7.org/linux/man-pages/man1/date.1.html)
- [GNU Coreutils: date invocation](https://www.gnu.org/software/coreutils/manual/html_node/date-invocation.html)
  === END FILE ===
