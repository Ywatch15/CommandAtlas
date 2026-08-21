---
slug: nohup
name: nohup
aliases:
  - no hangup
category: processes
tags:
  - linux
  - processes
  - background
  - signals
  - terminal
  - sysadmin
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
  - keep script running after logout
  - run process in background linux
  - prevent command from closing with terminal
  - ignore sighup signal
  - redirect background job output
relatedCommands:
  - bg
  - fg
  - jobs
  - screen
  - tmux
alternatives:
  - screen
  - tmux
status: draft
---

## What is it?

`nohup` (No Hangup) is a POSIX command-line wrapper utility that executes a specified program while intentionally ignoring the `SIGHUP` (Signal 1) terminal hangup signal. It prevents background processes from being automatically assassinated by the Linux kernel when the user logs out, closes their SSH session, or disconnects their terminal emulator.

## Why does it exist?

In UNIX architecture, process lifetimes are hierarchically tied to the terminal (TTY/PTY) session that spawned them. When a user closes an SSH window, the kernel broadcasts a `SIGHUP` (Hangup) signal to the terminal's session leader, which cascades down to brutally terminate all child processes executing in that session window. Before advanced terminal multiplexers (like `tmux`) or system supervisors (`systemd`) existed, administrators required a native, zero-configuration mechanism to launch long-running scripts (like database migrations or compilations) and log off safely. `nohup` exists to sever this signal dependency entirely.

## Syntax

```bash
nohup COMMAND [ARG]...
```

## Flags

| Flag        | Description                                                                   | Example           |
| ----------- | ----------------------------------------------------------------------------- | ----------------- |
| `--help`    | Outputs brief usage documentation and exits.                                  | `nohup --help`    |
| `--version` | Displays version information and copyright details for the coreutils package. | `nohup --version` |

_(Note: The GNU implementation of `nohup` acts strictly as an execution wrapper and possesses only the two generic help/version flags. Its power is derived purely from how it interacts with shell control operators, specifically the background ampersand `&` and standard I/O redirection)._

## Examples

```bash
nohup ./long_running_script.sh &
```

> This is the canonical invocation. `nohup` intercepts and masks the SIGHUP signal, while the `&` operator (a bash shell feature, not a `nohup` flag) forces the process into the background, returning control of the prompt to the user immediately so they can safely log out.

```bash
nohup python3 massive_data_import.py > custom_output.log 2>&1 &
```

> By default, `nohup` dumps all terminal output into a file named `nohup.out`. This command explicitly redirects both standard output (`>`) and standard error (`2>&1`) into a custom log file (`custom_output.log`), preventing the default file from bloating.

````bash
nohup ping google.com </dev/null &
```> This explicitly severs the standard input stream by redirecting `/dev/null` into the command. Some older interactive applications will freeze in the background if they attempt to read from a terminal input stream that no longer exists; bridging STDIN to null prevents this lockup.

## Real-World Scenarios
**Executing Fire-and-Forget Database Migrations**
```bash
nohup php artisan migrate > migration_$(date +%s).log 2>&1 &
````

> Software developers SSH into a production server to trigger a massive, multi-hour database schema migration. By wrapping the command in `nohup` and `&`, they guarantee that if their corporate VPN drops and the SSH pipe severs, the database migration will seamlessly continue executing on the server without crashing halfway through.

**Bootstrapping Ephemeral Ad-Hoc Web Servers**

```bash
nohup python3 -m http.server 8080 > access.log &
```

> Systems administrators sharing files inside a secure, restricted subnet spin up a temporary Python web server. Using `nohup` ensures the server survives after they close their terminal tab, while piping the access data securely into a log file for auditability.

## When should it NOT be used?

- **Running permanent, production background daemons:** **Reason:** `nohup` lacks process supervision, automatic restart on crash, and proper syslog integration. If the server reboots, the `nohup` process does not come back. **Use instead:** Write a proper `systemd` service unit file (`/etc/systemd/system/app.service`).
- **Interactive terminal sessions requiring persistence:** **Reason:** You cannot cleanly reconnect to a `nohup` process to provide keyboard input or view colored UI interfaces. **Use instead:** Terminal multiplexers like `tmux` or `screen`.

## Alternatives

- **`tmux` / `screen`:** Terminal Multiplexers. **Tradeoff:** These tools preserve the entire visual terminal environment, allowing you to disconnect and re-attach to interactive sessions (like `htop` or `vim`) later. `nohup` is strictly for blind, non-interactive execution.
- **`disown`:** Shell built-in. **Tradeoff:** If you already started a command normally and forgot `nohup`, you can press `Ctrl+Z`, type `bg` to background it, and type `disown` to detach it from the shell's SIGHUP broadcasting tree after the fact.
- **`systemd-run`:** Ephemeral systemd units. **Tradeoff:** Modern Linux allows wrapping commands inside `systemd-run`, generating an ad-hoc, fully isolated background service equipped with cgroup limits and journalctl logging, vastly superior to raw `nohup`.

## How it works internally

The behavior of `nohup` hinges on the POSIX `sigaction()` system call and Unix file descriptor manipulation.

When you execute `nohup command`, the `nohup` utility instructs the kernel to set the disposition of the `SIGHUP` (Signal 1) signal to `SIG_IGN` (Ignore) for its own process. It then executes `execvp()`, replacing itself with the target `command`. Because POSIX rules dictate that signal dispositions are inherited across `exec()` boundaries, the target application inherits the immunity to `SIGHUP`.

Simultaneously, `nohup` evaluates the application's file descriptors. A background process cannot write to a terminal that is closed. If `nohup` detects that standard output (STDOUT) is tied to a terminal (TTY), it utilizes the `dup2()` system call to forcefully redirect STDOUT into an append-only file named `nohup.out` created in the current working directory. It repeats this for standard error (STDERR), multiplexing both streams into `nohup.out`. This prevents the application from throwing fatal `SIGPIPE` or `EIO` (Input/Output) errors when it attempts to `print()` data to a severed SSH connection.

## Performance Notes

- `nohup` introduces absolutely zero execution overhead or CPU penalty. It simply modifies signal masks and file descriptors before transferring execution directly to the target application.
- Beware of disk I/O bottlenecks. If you `nohup` an application that generates thousands of log lines per second without redirecting it to `/dev/null`, the `nohup.out` file will rapidly consume gigabytes of disk space, eventually crashing the server via inode exhaustion.

## Security Notes

- **Permission Masking:** The default `nohup.out` file is created with restrictive permissions (typically `0600`), ensuring that other standard users on the system cannot read the output of the backgrounded application, preventing accidental leakage of runtime secrets or database queries written to standard output.
- **Process Spoofing:** `nohup` processes detach and drop to the background, running silently indefinitely. Attackers exploiting web servers routinely use `nohup` combined with hidden directories (e.g., `nohup ./cryptominer &`) to leave malicious payloads executing persistently even after the attacker's reverse-shell is closed.

## Common Mistakes

- **Forgetting the Ampersand (`&`):** Running `nohup ./script.sh`. **Why it's wrong:** `nohup` protects against hangups, but it _does not_ background the process. The command will seize control of your terminal and block your input. If you press `Ctrl+C` (which sends SIGINT, not SIGHUP), the script will instantly terminate, defeating the purpose. You must use the `&` operator to send it to the background.
- **Assuming it survives reboots:** **Why it's wrong:** `nohup` only shields against terminal disconnections. The process still resides purely in RAM. If the physical server reboots or encounters a kernel panic, the process is annihilated permanently.
- **Losing the Process ID (PID):** Backgrounding a script and forgetting to record the PID output by the shell. **Why it's wrong:** Without the PID, you cannot easily monitor or terminate the script later. You will be forced to hunt for it using `ps aux | grep script.sh` or `pgrep`.

## Best Practices

- Universally adopt the habit of redirecting both output streams to explicit files rather than relying on the default `nohup.out`. Example: `nohup ./app > app.log 2>&1 &`. This prevents log collisions when multiple `nohup` jobs execute in the same directory.
- Capture the Process ID dynamically in automated scripts immediately after launching the job by writing the `$!` shell variable to a lockfile: `nohup ./worker.sh & echo $! > worker.pid`. This allows subsequent scripts to easily `kill $(cat worker.pid)`.

## Interview Questions

**Q:** A developer runs `nohup ./backup.sh` but their terminal instantly freezes, preventing them from typing any new commands. Furthermore, when they close the terminal window, they discover the backup script died anyway. What critical shell operator did they forget to append to the command?
**A:** They forgot to append the background ampersand operator (`&`). `nohup` only masks the SIGHUP signal; it does not background the process. Without `&`, the script runs in the foreground, hijacking standard input. Furthermore, if they close the window improperly or hit `Ctrl+C`, the terminal sends `SIGINT` (Signal 2) or `SIGTERM` (Signal 15), which `nohup` does _not_ protect against, killing the script.
**Q:** What is the default mechanism `nohup` employs to handle standard output (`stdout`) and standard error (`stderr`) if the user does not explicitly redirect them using bash operators?
**A:** If `nohup` detects that standard output is tied to an active terminal, it automatically intercepts and redirects the stream into a file named `nohup.out` located in the current working directory (or `$HOME/nohup.out` if the current directory is read-only). It also merges standard error into this exact same file stream, ensuring no diagnostic output is lost when the terminal is severed.
**Q:** If a process is launched via `nohup` and successfully executing in the background, will it automatically resume execution if the underlying Linux server is physically rebooted?
**A:** No. `nohup` is merely a signal mask applied to a volatile RAM process. It provides absolutely no persistence across system reboots. For reboot survivability, the application must be registered as a system service utilizing an init daemon like `systemd`.

## Practice Problems

**Problem:** Execute a Python script named `data_cruncher.py` immune to terminal hangups, push it to the background, and completely discard all standard output and standard error so it generates no log files on the disk.
**Hint:** Combine the execution wrapper, redirection operators targeting the Linux black hole device, stream merging, and the background operator.
**Solution:** `nohup python3 data_cruncher.py > /dev/null 2>&1 &` (This ensures silent, untraceable background execution).
**Problem:** You launched `./massive_query.sh` normally in your terminal, but realize it will take 5 hours and you need to leave the office and close your laptop. You cannot cancel and restart it. How do you retroactively apply `nohup`-like behavior to save the job?
**Hint:** You must suspend the job, push it to the background, and sever its ties to the terminal session using native bash job control commands.
**Solution:** Press `Ctrl+Z` (suspends the job), type `bg` (resumes execution in the background), and type `disown -h %1` (instructs the bash shell to remove the job from its SIGHUP broadcast list, achieving the exact same result as `nohup`).

## References

- [GNU Coreutils - nohup invocation](https://www.gnu.org/software/coreutils/manual/html_node/nohup-invocation.html)
- [Man Page for nohup (Linux)](https://man7.org/linux/man-pages/man1/nohup.1.html)
  === END FILE ===
