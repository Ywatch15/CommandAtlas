---
slug: tee
name: tee
aliases: [pipe splitter]
category: unix
tags: [linux, pipe, logging, output, text-processing]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'write output to file and stdout bash'
  - 'append command output to log file tee'
  - 'sudo write to protected file tee'
  - 'split stdout stream to multiple files'
  - 'save output while viewing it'
relatedCommands: [cat, script, tail]
alternatives: [cat]
status: draft
---

## What is it?

`tee` is a core POSIX command-line utility that reads data from standard input (stdin) and simultaneously writes identical copies of that data to standard output (stdout) and to one or more physical files. Shaped like a "T" pipe fitting in plumbing, it splits a single data stream into two directions, allowing operators to view command output in real-time on the terminal while immutably logging it to disk.

## Why does it exist?

Standard bash redirection (`>`) consumes a data stream and writes it to a file, rendering the terminal completely blank during execution. If a compile job takes 3 hours, the operator sits blindly, unaware of progress or errors. Conversely, letting the job print to the screen means the output is permanently lost when the terminal buffer clears. `tee` exists to eliminate this mutual exclusivity. Furthermore, it solves a profound architectural limitation in Linux privilege elevation: allowing `sudo` commands to write to root-owned files across unprivileged shell pipes.

## Syntax

```bash
command | tee [OPTIONS] [FILE...]
```

## Flags

| Flag                        | Description                                                                                              | Example                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `-a`, `--append`            | Appends the incoming data to the given files, rather than overwriting/truncating them.                   | `echo "log" \| tee -a app.log`             |
| `-i`, `--ignore-interrupts` | Ignores interrupt signals (SIGINT/Ctrl+C), ensuring the file write completes even if the terminal drops. | `make \| tee -i build.log`                 |
| `-p`                        | Diagnoses errors writing to non-pipes securely (POSIX behavior adjustment for pipeline crashes).         | `tail -f log \| tee -p out`                |
| `--output-error=[MODE]`     | Determines behavior when a write error occurs (`warn`, `warn-nopipe`, `exit`, `exit-nopipe`).            | `cat data \| tee --output-error=exit file` |
| `--help`                    | Outputs brief usage documentation and supported command-line options.                                    | `tee --help`                               |
| `--version`                 | Displays version information and copyright details for the coreutils package.                            | `tee --version`                            |

_(Note: `tee` is an incredibly focused utility; it fundamentally relies on only `-a` and `-i` for 99% of real-world operations.)_

## Examples

```bash
ping google.com | tee latency.log
```

> This is the canonical execution. The standard output of the `ping` command is streamed into `tee`. `tee` instantly prints every line to the terminal screen so the operator can visually monitor the pings, while simultaneously writing a perfect replica of the stream to `latency.log`.

```bash
echo "192.168.1.5" | tee -a whitelist.txt blacklist.txt > /dev/null
```

> This demonstrates multi-file multiplexing. The IP address is passed to `tee`, which utilizes the append flag (`-a`) to safely add the IP to the absolute end of _both_ files simultaneously. Redirecting the final stdout stream to `/dev/null` silences the terminal output.

```bash
curl -s [https://api.ipify.org](https://api.ipify.org) | tee public_ip.txt | grep -q "10."
```

> This showcases pipeline bridging. The HTTP response is grabbed by `curl`, piped into `tee` which saves the raw IP payload to disk for logging, and then pushes the exact same stream downstream into `grep`, seamlessly linking data persistence with conditional stream logic.

```bash
echo "root_password_hash" | sudo tee /etc/shadow
```

> This is a mandatory privilege escalation pattern. Standard shell redirection (`sudo echo data > /etc/shadow`) fails with "Permission denied" because the `>` operator is evaluated by the _unprivileged_ parent shell before `sudo` executes. Piping the data into `sudo tee` ensures the file-writing process executes with elevated `root` permissions, successfully overriding the file.

```bash
dmesg | tee >(grep "error" > errors.log) >(grep "warn" > warnings.log) > /dev/null
```

> This utilizes advanced Bash Process Substitution (`>()`). `tee` duplicates the stream of kernel messages and pushes copies simultaneously into two independent `grep` subshells executing in parallel, routing errors and warnings to disparate files in a single pass.

## Real-World Scenarios

**Secure Configuration Injection**

````bash
cat <<EOF /etc/nginx/sites-available/app.conf 80; EOF ``` app.internal; listen server server_name sudo tee { | }> Systems administrators writing robust setup scripts must frequently generate complex, multi-line configuration blocks for system daemons. They pipe an unprivileged Here-Document into `sudo tee`. This perfectly bypasses permission denied errors on `/etc`, writes the exact block to disk, and echoes it to the console for visual confirmation during automated runs.

**Preserving High-Latency Build Artifacts**
```bash
make -j8 | tee build_$(date +%s).log
````

> C/C++ developers compile massive codebases using `make`. Because compilation errors scroll past the terminal buffer limit in milliseconds, they pipe the entire process through `tee`. If the build crashes, they review the frozen file artifact in `vim` to locate the exact GCC compiler error without needing to re-run the 30-minute compilation.

## When should it NOT be used?

- **Capturing interactive terminal sessions:** **Reason:** `tee` only captures `stdout` pipelines. It cannot capture programs that hijack the terminal TTY (like `vim`, `htop`, or password prompts) or raw stderr (unless explicitly merged via `2>&1`). **Use instead:** `script`, which utilizes a pseudo-terminal to capture raw keystrokes and interactive prompts.
- **Simple file writes where output isn't needed:** **Reason:** Executing `echo "Hello" | tee file.txt > /dev/null` is an inefficient anti-pattern. **Use instead:** `echo "Hello" > file.txt`.

## Alternatives

- **`>` / `>>` (Shell Redirection):** The standard mechanism. **Tradeoff:** Supremely fast and built natively into the shell (no external binary `fork()` overhead), but completely blind; the user loses all visibility into the terminal stream while the command executes.
- **`script`:** Full session recording. **Tradeoff:** Perfect for logging interactive sessions, complete with ANSI color codes and backspaces, but generates messy, un-grepable binary-like files, whereas `tee` produces pristine plain text.
- **`logger`:** Syslog routing. **Tradeoff:** Pipes text directly into the system's central logging facility (`journald` or `/var/log/syslog`) rather than arbitrary flat files, inherently managing log rotation and structured metadata.

## How it works internally

`tee` is one of the simplest binary implementations in the GNU Coreutils suite.

When `tee` executes, it parses the command line to identify the output files and opens a file descriptor for every single file provided (respecting the `O_APPEND` kernel flag if `-a` is utilized).

It then enters a highly optimized, infinite `while` loop. It issues a `read()` system call on file descriptor 0 (standard input), pulling a chunk of bytes into a memory buffer. Immediately, it issues a `write()` system call on file descriptor 1 (standard output), pushing the exact buffer to the terminal screen.

Subsequently, it loops through every additional file descriptor it opened, executing identical `write()` calls, dumping the memory buffer onto the physical disk drives. Once all descriptors have received the buffer, the cycle repeats. When the upstream command finishes and closes the pipe, `tee` detects an EOF (0 bytes read), elegantly closes all file descriptors, and terminates cleanly.

## Performance Notes

- **I/O Blocking:** Because `tee` writes synchronously to both the screen and the disk in a single thread, the pipeline's overall speed is bottlenecked by the slowest output destination. If you pipe output to a slow, latent NFS network share, the terminal output will stutter and the upstream command (like `make`) will freeze, waiting for `tee` to empty the pipe buffer.
- **Zero CPU Overheard:** `tee` performs absolutely no mathematical manipulation, string parsing, or regex evaluation. It strictly shuttles raw bytes between hardware drivers, consuming negligible CPU overhead.

## Security Notes

- **The Sudo Redirection Bypass:** Unprivileged users often erroneously believe `sudo echo "1" > /proc/sys/net/ipv4/ip_forward` works. The shell (running as standard user) attempts to open the protected `/proc` file for redirection _before_ `sudo` executes, resulting in `Permission Denied`. Piping to `sudo tee` is the canonical, mathematically secure architectural solution because `tee` executes completely as root _before_ it attempts the `open()` system call.

## Common Mistakes

- **Missing Standard Error (stderr):** Running `curl http://broken | tee log.txt`. **Why it's wrong:** The `curl` command prints errors to `stderr` (file descriptor 2), but the pipe `|` only forwards `stdout` (file descriptor 1) to `tee`. The errors will display on the screen but will _not_ be saved in `log.txt`. You must merge the streams: `curl http://broken 2>&1 | tee log.txt`.
- **Overwriting files accidentally:** Running `echo "new line" | tee data.csv`. **Why it's wrong:** By default, `tee` behaves exactly like `>`. It opens the file with the truncate flag, instantly shredding all existing data in `data.csv` to 0 bytes before writing. Always remember to append the `-a` flag for safe logging.
- **Breaking pipeline exit codes:** Running `false | tee log.txt && echo "Success"`. **Why it's wrong:** In Bash, the exit code of a pipeline is strictly the exit code of the _last_ command in the pipe. Because `tee` succeeded in writing the file, it returns `0`, masking the `false` failure. The script erroneously echoes "Success". You must enable `set -o pipefail` in bash to accurately catch upstream failures.

## Best Practices

- Universally enable `set -o pipefail` at the top of robust deployment scripts. This instructs bash to evaluate the exit code of the entire pipeline, ensuring that if a critical `make` command fails while piped into `tee`, the script correctly catches the error and aborts.
- When executing data aggregations across massive loops, never put `tee -a` _inside_ the loop (which opens and closes the file 10,000 times, causing massive disk I/O latency). Instead, redirect the entire loop globally: `done | tee output.log`.
- Combine `tee` with `/dev/tty` for explicit terminal messaging inside deep cron jobs. If stdout is captured by the cron daemon, routing critical warnings via `tee /dev/tty` explicitly forces the message onto the active physical terminal session if an administrator is logged in.

## Interview Questions

**Q:** A junior administrator attempts to secure a configuration file by running `sudo echo "bind=127.0.0.1" > /etc/redis/redis.conf`. The command fails with a "Permission denied" error, even though `sudo` was used. Why does this architectural failure occur, and how do you rewrite it using `tee`?
**A:** The shell interpreter evaluates redirection operators (`>`) _before_ executing the binary commands. The unprivileged shell itself attempts to open `/etc/redis/redis.conf` with write permissions to prepare the pipeline. The OS kernel instantly rejects this, preventing the `sudo` command from ever actually executing. To resolve this, you must rewrite it as `echo "bind=127.0.0.1" | sudo tee /etc/redis/redis.conf`. The shell sets up a harmless pipe, and the `tee` binary runs entirely with root privileges, successfully executing the `open()` and `write()` system calls.
**Q:** You run a complex script that generates both standard output data and error messages. `my_script.sh | tee run.log`. When reviewing `run.log`, the standard output is present, but all the error messages are missing, even though you saw them on your terminal screen. What caused this, and how do you capture both?
**A:** The standard pipe operator (`|`) natively only captures and forwards File Descriptor 1 (Standard Output). File Descriptor 2 (Standard Error) bypasses the pipe entirely and is pushed directly to the terminal screen by the kernel. Because `tee` never received the error stream, it couldn't write it to the file. To capture both, you must merge stderr into stdout before the pipe using `2>&1 | tee run.log`, or in modern bash, use the shorthand `|& tee run.log`.
**Q:** What is the purpose of the `-a` flag in the `tee` command, and what destructive action occurs if a developer forgets to include it when interacting with an existing log file?
**A:** The `-a` (append) flag instructs the `tee` command to open the target file with the `O_APPEND` system flag, ensuring that new incoming data is safely written to the absolute end of the file. If a developer forgets this flag, `tee` defaults to the `O_TRUNC` flag. The exact millisecond the command executes, the operating system shreds the existing file down to 0 bytes, permanently destroying all previous log data before writing the new stream.

## Practice Problems

**Problem:** Append the exact string `10.50.0.5 blocked.local` to the protected system file `/etc/hosts`. Ensure the string is appended, not overwritten, safely bypass the permission restrictions using root privileges, and silence the command so it does not print the output back to the terminal.
**Hint:** Echo the string into a pipeline, use the privilege-escalated utility with the append flag, and redirect its standard output to the black hole device.
**Solution:** `echo "10.50.0.5 blocked.local" | sudo tee -a /etc/hosts > /dev/null` (This perfectly executes safe, silent, root-level configuration injections).
**Problem:** Execute a deployment script `./deploy.sh`. Capture _both_ standard output and standard error seamlessly, stream the combined output directly into a file named `deployment.log`, and ensure the command ignores any `Ctrl+C` interrupt signals to guarantee the log writing completes even if the terminal drops.
**Hint:** Utilize bash stream merging, pipe into the target utility, and apply the specific signal-immunity flag.
**Solution:** `./deploy.sh 2>&1 | tee -i deployment.log` (This merges the streams mathematically and shields the logging process from premature termination).

## References

- [GNU Coreutils - tee invocation](https://www.gnu.org/software/coreutils/manual/html_node/tee-invocation.html)
- [POSIX Standard - tee utility](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/tee.html)
  === END FILE ===
