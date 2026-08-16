---
slug: watch
name: watch
aliases: []
category: linux
tags:
  - watch
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - run command repeatedly
  - monitor command output in real time
  - refresh terminal command
  - highlight changes in command output
  - execute command every second
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---
## What is it?

`watch` is a command-line utility that repeatedly executes a specified program at a fixed interval and displays its standard output and standard error fullscreen. It utilizes terminal control sequences to overwrite the display in place, providing a flicker-free, real-time dashboard for any arbitrary command.

## Why does it exist?

Before `watch`, administrators wishing to monitor the changing output of a static command had to write clumsy shell loops like `while true; do clear; command; sleep 2; done`. This approach caused severe visual flickering because `clear` wipes the entire screen before the command has time to generate new text. `watch` exists to solve this by leveraging the `ncurses` library to perform intelligent, in-place screen updates, while also offering advanced features like diff-highlighting and drift-compensated timing.

## Syntax

```bash
watch [OPTIONS] COMMAND
```

## Flags

| Flag                               | Description                                                                                                      | Example                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `-n`, `--interval SECONDS`         | Specifies the update interval in seconds. Supports fractional seconds (e.g., `0.5`). Defaults to 2.              | `watch -n 1 df -h`              |
| `-d`, `--differences[=cumulative]` | Highlights the differences between successive updates. `cumulative` makes highlights permanent.                  | `watch -d ls -l`                |
| `-t`, `--no-title`                 | Turns off the header showing the interval, command, and current time at the top of the display.                  | `watch -t free -m`              |
| `-b`, `--beep`                     | Triggers a terminal bell sound if the executed command returns a non-zero exit status.                           | `watch -b make`                 |
| `-e`, `--errexit`                  | Freezes updates and waits for a keypress if the executed command returns a non-zero exit status.                 | `watch -e script.sh`            |
| `-g`, `--chgexit`                  | Exits the `watch` utility entirely the moment the output of the command changes.                                 | `watch -g ls -l file.txt`       |
| `-c`, `--color`                    | Interprets ANSI color and style sequences, allowing colorized output to render correctly.                        | `watch -c dmesg --color=always` |
| `-x`, `--exec`                     | Passes the command directly to `exec` rather than wrapping it in `sh -c`, avoiding shell parsing overhead.       | `watch -x ping 8.8.8.8`         |
| `-w`, `--no-wrap`                  | Truncates long lines that exceed the terminal width instead of wrapping them to the next line.                   | `watch -w ps aux`               |
| `-p`, `--precise`                  | Attempts to run the command at exactly the interval fraction, compensating for the command's own execution time. | `watch -p -n 1 date`            |

## Examples

```bash
watch -n 1 free -m
```

> This runs the `free -m` command every exactly one second, displaying the system's memory usage dynamically. It replaces the default 2-second interval, providing higher-resolution monitoring during memory-intensive operations.

```bash
watch -d "ls -lh /var/log/syslog"
```

> This monitors a specific log file's metadata. The `-d` flag instructs `watch` to highlight any text that changes between executions. When the log file grows, the new file size and timestamp will momentarily flash in reverse video.

```bash
watch "ps -eo pid,user,%cpu,command --sort=-%cpu | head -n 10"
```

> This constructs a custom alternative to `top` by repeatedly sorting all system processes by CPU usage and restricting the output to the top 10 offenders. The double quotes ensure the pipe (`|`) is passed to `watch` rather than evaluated by the parent shell.

```bash
watch -g "kubectl get pods | grep my-app" && notify-send "Pods updated!"
```

> This monitors the state of a Kubernetes pod. The `-g` (change exit) flag causes `watch` to run continuously until the pod's status text changes (e.g., from `ContainerCreating` to `Running`). Once it changes, `watch` terminates, allowing the subsequent desktop notification command to execute.

```bash
watch -c -n 0.5 "ip -color=always address"
```

> This monitors network interfaces twice per second. Because standard commands strip color codes when their output is not a TTY (which `watch` intercepts), you must force the underlying command to emit colors (`-color=always`) and instruct `watch` to interpret them (`-c`).

## Real-World Scenarios

**Tracking massive file transfers**

```bash
watch -d ls -lh /mnt/backup/large_archive.tar.gz
```

> When copying terabytes of data using tools that lack progress bars (like standard `cp`), administrators run this in a separate pane. It provides a real-time, diff-highlighted view of the destination file's expanding size.

**Monitoring active network connections**

```bash
watch -n 1 "ss -tpan | grep ESTAB"
```

> During a suspected denial-of-service attack or connection bottleneck, security engineers use this to maintain a live, filtering dashboard of all successfully established TCP connections, instantly seeing new IPs as they connect.

**Polling for hardware temperature spikes**

```bash
watch -n 2 sensors
```

> When stress-testing CPU overclocks or diagnosing thermal throttling, this command repeatedly invokes the `lm-sensors` utility, providing a flicker-free dashboard of core temperatures and fan RPMs.

## When should it NOT be used?

- **Logging output to a file:** Running `watch command > log.txt`. **Reason:** `watch` outputs a continuous stream of ANSI cursor-positioning escape codes designed for a terminal emulator. The resulting file will be filled with unreadable control characters. **Use instead:** A standard shell `while` loop writing to the file, or the `cron` daemon.
- **Executing expensive, slow commands frequently:** Running `watch -n 0.1 find / -name "foo"`. **Reason:** `watch` spawns a completely new process tree every interval. If the command takes longer to execute than the interval itself, it will peg the CPU and potentially cause process starvation.
- **Monitoring appending log files:** Running `watch tail -n 20 /var/log/messages`. **Reason:** This repeatedly reads the end of the file from disk every two seconds. **Use instead:** `tail -f /var/log/messages`, which uses non-polling kernel `inotify` events to stream changes instantly with zero overhead.

## Alternatives

- **`top` / `htop`:** Dedicated process monitors. **Tradeoff:** They are vastly superior for monitoring CPU, memory, and process states natively without spawning child processes every second, but they cannot monitor arbitrary commands (like checking a REST API or parsing an `ls` output).
- **`while sleep; do` loops:** The manual shell approach. **Tradeoff:** While loops can safely redirect output to files and avoid the `ncurses` dependency, they suffer from severe terminal flickering if used with `clear` to emulate a dashboard.
- **`inotifywait`:** A filesystem event watcher. **Tradeoff:** It reacts instantly to file modifications based on kernel events rather than polling blindly on an interval, but it is strictly limited to filesystem events, whereas `watch` can monitor anything.

## How it works internally

When you launch `watch`, it initializes the terminal display using the `ncurses` library, setting up a full-screen buffer. By default, it does not execute your command directly. Instead, it concatenates your arguments and passes them to the Bourne shell via `sh -c "your command"`. This ensures that standard shell features like pipes (`|`), redirects (`>`), and wildcards (`*`) work identically to how they function on the command line.

`watch` manages time using a polling loop. In its standard mode, it sleeps for the specified interval, wakes up, forks a child process to run `sh -c`, captures the standard output and standard error via a pipe, and renders it to the ncurses buffer. It then calculates the screen differences (if `-d` is used) and redraws only the modified characters to prevent flickering.

If the `-p` (precise) flag is used, `watch` relies on the `gettimeofday()` system call. Instead of blindly sleeping for 2 seconds (which causes drift, as a command taking 0.5 seconds means the _actual_ interval becomes 2.5 seconds), it calculates the exact microsecond offset of the command's execution time and dynamically shortens the `sleep()` duration to guarantee the command triggers at exactly the top of the requested interval.

## Performance Notes

- Because `watch` utilizes `/bin/sh -c`, every tick requires the kernel to perform a `fork()` to create the shell, followed by an `exec()` to run the target binary. For sub-second intervals (`-n 0.1`), this constant process creation generates measurable CPU overhead.
- You can eliminate the `/bin/sh` overhead by using the `-x` (`--exec`) flag, which forces `watch` to pass the command directly to the `execvp()` system call. However, this entirely disables shell pipes and redirections.

## Security Notes

- **Command Injection:** If you write a script that incorporates untrusted user input directly into a `watch` command (e.g., `watch "ls $USER_INPUT"`), you are vulnerable to arbitrary code execution because `watch` passes the entire string directly to `sh -c`.
- **Alias Bypass:** Security audits sometimes rely on shell aliases to restrict or warn users when running dangerous commands. Because `watch` executes commands in a non-interactive `/bin/sh` session, it completely ignores `~/.bashrc` aliases and functions, directly executing the underlying binaries.

## Common Mistakes

- **Forgetting to quote piped commands:** Running `watch ls -l | grep txt`. **Why it's wrong:** The parent shell parses this before `watch` ever sees it. It runs `watch ls -l` (monitoring the whole directory) and pipes the _interactive curses output_ of `watch` into `grep`, breaking the display entirely. You must quote the entire string: `watch "ls -l | grep txt"`.
- **Expecting bash aliases to work:** Running `watch ll`. **Why it's wrong:** `ll` is usually an alias for `ls -l` defined in your `.bashrc`. `watch` uses `/bin/sh`, which does not read your bash profile. It will fail with "command not found". You must use the actual binary name.
- **Missing color output:** Running `watch grep "error" log.txt` expecting the matched words to be red. **Why it's wrong:** GNU tools check if `stdout` is a terminal before emitting ANSI colors. Since `watch` captures output via a pipe, the tool strips colors. You must force color (`grep --color=always`) and tell watch to parse it (`watch -c "grep --color=always 'error' log.txt"`).

## Best Practices

- When monitoring output that occasionally exceeds your terminal height, keep in mind that `watch` silently truncates vertical output; it does not allow scrolling. Pipe the internal command through `head -n $(tput lines)` or `tail` to ensure the specific data you care about remains in the visible frame.
- Use the `-g` (change exit) flag as a powerful automation trigger in bash scripts. It allows you to pause script execution without complex `while` loops until a specific system state (reflected by a command's output) naturally resolves.

## Interview Questions

**Q:** Why does `watch ls | grep foo` ruin the terminal display, and how do you fix it?
**A:** The parent shell interprets the pipe, meaning it runs the `watch` interface and pipes its raw ncurses control sequences into `grep`, which destroys the visual rendering. You fix it by quoting the argument so the pipe is evaluated inside the watch loop: `watch "ls | grep foo"`.

**Q:** How would you use `watch` to pause a deployment script until a specific file named `ready.txt` appears in a directory?
**A:** You would use the change exit flag (`-g`), which terminates the program when the output changes. The command would be: `watch -g "ls ready.txt"`. The script will hang on this line until the `ls` command output changes from "No such file" to the filename, at which point `watch` exits and the script proceeds.

**Q:** Why doesn't the command `watch my_custom_bash_function` work, even though you just defined the function in your current terminal?
**A:** By default, `watch` executes the command string by spawning a fresh, non-interactive `/bin/sh` child process. This child process does not inherit bash functions, aliases, or unexported local variables from your interactive bash session.

## Practice Problems

**Problem:** You are monitoring a directory using `watch ls -l`. You want `watch` to highlight any new files or permission changes in reverse video, and you want those highlights to remain on the screen permanently even after the next refresh.
**Hint:** Look for the differences flag, and specifically its optional modifier.
**Solution:** `watch --differences=cumulative ls -l`

**Problem:** Execute a command that monitors the `free -m` memory output every `0.5` seconds, but hide the `watch` header (the top line showing the interval and timestamp) to maximize screen real estate.
**Hint:** Combine the interval flag with the no-title flag.
**Solution:** `watch -n 0.5 -t free -m`

## References

- [watch(1) - Linux manual page](https://man7.org/linux/man-pages/man1/watch.1.html)
  === END FILE ===
