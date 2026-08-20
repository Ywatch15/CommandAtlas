---
slug: tail
name: tail
aliases: []
category: text-processing
tags:
  - linux
  - text-processing
  - monitoring
  - logs
  - coreutils
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
  - view end of file linux
  - follow log file real time
  - read last lines of text
  - watch file for changes bash
  - extract tail of file
relatedCommands:
  - head
  - less
  - cat
  - grep
  - watch
  - more
  - tac
  - tee
alternatives:
  - journalctl
status: draft
---

## What is it?

`tail` is a POSIX-standard command-line utility that extracts and outputs the final contiguous section (typically the last 10 lines) of a file or piped data stream. Crucially, it incorporates a real-time monitoring mode (`-f` or "follow"), which holds the file descriptor open and streams newly appended data directly to the terminal, serving as the definitive tool for observing application logs and system activity as it happens.

## Why does it exist?

Log files and data streams continuously grow, often reaching gigabytes in size. When an application crashes, an administrator does not need to see the millions of successful transactions from last month; they need the stack trace written five seconds ago. Opening the file with `cat` or `vim` forces the OS to load gigabytes of useless text into RAM. `tail` exists to bypass this. By utilizing low-level filesystem seeks to jump directly to the end of the file, it extracts critical, recent context instantaneously with near-zero memory footprint. The `follow` functionality transformed `tail` from a simple parser into the foundational, indispensable live-monitoring daemon for all Unix environments.

## Syntax

```bash
tail [OPTION]... [FILE]...
```

## Flags

| Flag                           | Description                                                                                                                                                             | Example                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `-n <K>`, `--lines=K`          | Outputs the last `K` lines. If prefixed with a plus (`+K`), it outputs all lines starting from line `K` to the end of the file.                                         | `tail -n 50 app.log`                |
| `-c <K>`, `--bytes=K`          | Outputs the last `K` bytes instead of lines. Supports suffixes like `K`, `M`, `G`.                                                                                      | `tail -c 5M backup.sql`             |
| `-f`, `--follow[=how]`         | Keeps the file open and appends data as the file grows. By default, relies on file descriptors (`descriptor`).                                                          | `tail -f /var/log/syslog`           |
| `-F`                           | Equivalent to `--follow=name --retry`. Unbreakable follow. If the file is deleted or rotated (renamed), it automatically reattaches to the new file with the same name. | `tail -F /var/log/nginx/access.log` |
| `--pid=PID`                    | Used exclusively with `-f`. Monitors the specified process ID and automatically exits the `tail` command when that process terminates.                                  | `tail -f log.txt --pid=1234`        |
| `-q`, `--quiet`                | Never outputs headers containing file names, even when tailing multiple files simultaneously.                                                                           | `tail -q -n 5 *.txt`                |
| `-v`, `--verbose`              | Always outputs a header containing the file name before printing the contents.                                                                                          | `tail -v -n 10 file1 file2`         |
| `-s <N>`, `--sleep-interval=N` | Changes the polling interval in seconds when `-f` is used on systems that do not support `inotify`.                                                                     | `tail -f -s 3 debug.log`            |
| `--retry`                      | Keeps trying to open a file if it is inaccessible or doesn't exist yet (used with `-f`).                                                                                | `tail -f --retry future.log`        |

## Examples

```bash
tail /var/log/messages
```

> The universal baseline check. Instantly jumps to the end of the system messages log and prints exactly the last 10 lines to standard output, returning the terminal prompt immediately.

```bash
tail -f /var/log/nginx/error.log
```

> The live debugging session. Prints the last 10 lines for context, then blocks the terminal. It hooks into the kernel and streams any new HTTP errors appended by NGINX directly to the screen in real-time until the user presses `Ctrl+C`.

```bash
tail -n +15 config.yaml
```

> Skipping file headers. The heavily underutilized `+` operator commands `tail` to start reading at exactly line 15 and print everything from there to the absolute end of the file, cleanly bypassing 14 lines of useless licensing boilerplate at the top of the file.

```bash
tail -F /var/log/auth.log | grep --line-buffered "Failed password"
```

> Resilient real-time threat monitoring. Using capital `-F` ensures that when the Linux `logrotate` daemon zips up `auth.log` at midnight and creates a new one, `tail` seamlessly disconnects from the old inode and attaches to the new one. The pipeline into `grep --line-buffered` creates a live, unbreakable stream highlighting brute-force SSH attacks as they happen.

```bash
my_script.sh > output.log & tail -f output.log --pid=$!
```

> Lifecycle bound tracking. A script is launched in the background (`&`). `tail` is immediately attached to its log file. By passing `--pid=$!` (the background process ID), the kernel tells `tail` to automatically exit and return control of the terminal the millisecond the background script finishes execution.

## Real-World Scenarios

**Monitoring Multiple Microservices**

```bash
tail -f /opt/app1/logs/err.log /opt/app2/logs/err.log
```

> When multiple legacy applications drop logs to separate flat files on the same host, passing multiple files to `tail -f` causes it to multiplex the streams natively. It automatically injects beautiful `==> filename <==` headers every time the stream switches, allowing a single terminal to coherently monitor cross-application transactions.

**Isolating Log Spikes**

```bash
tail -n 100000 production.log > incident_slice.log
```

> During an active incident generating massive log spam, scrolling the terminal is impossible. An SRE slices exactly the last 100,000 lines (representing the last 5 minutes of chaos) and dumps them into an isolated, static artifact file, allowing them to comfortably load `incident_slice.log` into `vim` without the live system continuously appending new data and thrashing the editor.

## When should it NOT be used?

- **Time-Bounded Searches:** **Do not use `tail` to find logs "from yesterday."** `tail` strictly counts lines or bytes. It has absolutely no concept of time or date formatting inside the text. To extract logs within a specific time window, you must use `journalctl --since yesterday` or complex `awk` timestamp parsing.
- **Piping Massive Output:** Be careful when using `tail` at the _end_ of a massive pipeline (e.g., `cat 50GB_file | awk '{...}' | tail -n 10`). `tail` must receive and buffer the entire 50GB stream from `awk` just to find the last 10 lines. It is wildly inefficient. Always filter or seek as close to the disk as possible.

## Alternatives

- **`less +F`:** **Best for interactive monitoring.** Opens a file in the `less` pager and mimics `tail -f` (following live data). Pressing `Ctrl+C` temporarily pauses the stream, allowing you to use native `less` search functions (like `/ERROR`) to explore the text, before pressing `F` to resume live streaming.
- **`journalctl -f`:** **Best for modern systemd environments.** `systemd` intercepts all stdout logs natively. `journalctl` completely replaces `tail` for monitoring OS daemons and container output without worrying about file paths or log rotation.
- **`multitail`:** **Best for complex dashboards.** An external ncurses utility that splits the terminal into visual windows, tailing 5 different logs in different colored panes simultaneously.

## How it works internally

`tail` is a highly optimized C binary that utilizes different algorithms depending on the input stream and the requested flags.

If the input is a seekable file (a physical file on disk), `tail` issues an `lseek()` system call to jump directly to the end of the file descriptor (byte size minus 0). It reads a chunk of bytes backward into a buffer, counting newline characters (`\n`). Once it counts 10 newlines (the default), it marks the pointer, switches directions, and issues sequential `write()` calls to dump the buffer to standard output. This allows `tail` to read the end of a 10TB file in microseconds.

If the input is an un-seekable pipe (e.g., `dmesg | tail`), `tail` physically cannot jump to the end. It is forced to allocate a circular buffer in RAM holding exactly 10 lines. It reads the incoming stream byte-by-byte, continuously overwriting the oldest line in the buffer. When the pipe finally closes, it prints the surviving contents of the buffer.

For the `-f` (follow) flag on modern Linux, `tail` leverages the `inotify` kernel subsystem. Instead of burning CPU by aggressively polling the file with `stat()` every second, `tail` registers an event listener with the kernel. The kernel puts the `tail` process to sleep. The microsecond an application writes new data to the monitored file, the kernel fires an `IN_MODIFY` interrupt, waking `tail` up to instantly print the newly appended bytes.

## Performance Notes

- **The Inotify Limit:** When running `tail -f` on hundreds of files simultaneously (e.g., `tail -f /var/log/containers/*.log`), you might hit the kernel's `fs.inotify.max_user_watches` limit. `tail` will fallback to legacy polling mode, which uses significantly more CPU.

## Security Notes

- **Log Injection:** When using `tail -f`, you are blindly printing untrusted byte streams to your terminal emulator. If a malicious web request contains raw ANSI terminal escape sequences in the User-Agent field, and the web server logs it unfiltered, `tail` will output those sequences. This can theoretically alter your terminal colors, clear your screen, or execute arbitrary terminal emulator exploits.

## Common Mistakes

- **Using `-f` on rotated logs**
  - _Mistake:_ Leaving `tail -f /var/log/syslog` open overnight to monitor a server, and returning to find the terminal stopped updating at 4:00 AM, even though the server is active.
  - _Why:_ The `-f` flag tracks the _file descriptor_ (the raw physical inode on the disk). At 4:00 AM, `logrotate` renamed the file to `syslog.1` and created a brand new `syslog` file for the OS to write to. `tail` is still blindly hooked into the old inode (`syslog.1`), which is no longer receiving data. You _must_ use `-F` (capital F) to force `tail` to track the _filename string_ and automatically reattach when rotation occurs.
- **Confusing `+` and `-` in line counts**
  - _Mistake:_ Using `tail -n +100` to get the last 100 lines.
  - _Why:_ In `tail` syntax, `+` is an explicit directive meaning "Start at this absolute line number and go to the end." To get the last 100 lines, use `-n 100` or `-n -100`.

## Best Practices

- **Combine with `grep --line-buffered`:** When piping a live `tail -f` stream into `grep` (e.g., `tail -f app.log | grep ERROR`), the GNU `grep` utility detects it is writing to a pipe and aggressively buffers the output to save CPU. This means you won't see the errors in your terminal until the buffer fills up (which could take hours). Always append `--line-buffered` to `grep` to force it to flush the match instantly to the screen.

## Interview Questions

**Q: Explain the operational difference between running `tail -f /var/log/app.log` and `tail -F /var/log/app.log`, and describe the specific administrative scenario where the lowercase `-f` will fail.**
**A:** Lowercase `-f` follows the file descriptor (the inode) provided by the OS. Uppercase `-F` follows the actual string name of the file, utilizing retry logic. If a system administrator has configured `logrotate` to compress and archive log files daily, `logrotate` renames `app.log` to `app.log.1` and provisions a brand new `app.log` file. Lowercase `-f` will stay attached to the old, renamed inode and stop displaying new events. Uppercase `-F` detects the rotation, releases the old inode, and seamlessly hooks into the newly provisioned file, keeping the live stream intact.

**Q: You want to extract all data from line 500 to the absolute end of a massive log file. You cannot use `sed` or `awk`. Write the `tail` command to accomplish this.**
**A:** `tail -n +500 file.log`. The `+` symbol alters the standard behavior, instructing `tail` to begin reading at exactly the specified line number and continue sequentially until it reaches the End of File (EOF).

## Practice Problems

**Problem:** You are monitoring a web server. You want to follow the `access.log` file in real-time, but to avoid flooding your screen with irrelevant history, you want the command to output exactly 0 lines of historical context when it first launches.
**Hint:** Combine the follow flag with a strict numeric line limit flag.
**Solution:**

```bash
tail -f -n 0 access.log
```

**Problem:** A backup script (PID 9432) is running in the background and dumping output to `backup.log`. Write the command to follow the log in real-time, but instruct the command to automatically terminate and return you to the bash prompt the exact moment PID 9432 finishes running.
**Hint:** Use the follow flag and the explicit process ID tracker flag.
**Solution:**

```bash
tail -f backup.log --pid=9432
```

## References

- [tail(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/tail)
- [GNU Coreutils Manual: tail invocation](https://www.gnu.org/software/coreutils/manual/html_node/tail-invocation.html)
