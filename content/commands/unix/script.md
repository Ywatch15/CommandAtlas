---
slug: script
name: script
aliases: [terminal recorder, typescript maker]
category: unix
tags: [linux, terminal, logging, recording, session]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'record terminal session to file'
  - 'log all command outputs to text file'
  - 'record shell typescript file'
  - 'record interactive session bash'
  - 'audit user shell session'
relatedCommands: [tee, history]
alternatives: [tee]
status: draft
---

## What is it?

`script` is a POSIX-compliant utility used to record an interactive terminal session. It captures absolutely everything printed to the terminal—including standard output, standard error, user input keystrokes, and raw ANSI escape color codes—and saves the entire raw byte stream into a persistent typescript file for later review, auditing, or playback.

## Why does it exist?

While standard output redirection (`>`) and piping to `tee` are useful for logging single commands, they are completely incapable of recording interactive applications (like `vim`, `htop`, or `ssh` password prompts) because they bypass the TTY driver. `script` exists to solve this by creating a Pseudo-Terminal (PTY) wrapper. It intercepts the raw byte stream between the shell and the kernel, enabling administrators to generate mathematically perfect, unalterable forensic logs of entire remote SSH sessions or complex installation tutorials.

## Syntax

```bash
script [options] [file]
```

## Flags

| Flag                     | Description                                                                                     | Example                            |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `-a`, `--append`         | Appends the new session output to the specified file rather than overwriting it.                | `script -a session.log`            |
| `-c`, `--command <cmd>`  | Executes a specific command rather than an interactive shell, and exits when finished.          | `script -c "make build" build.log` |
| `-e`, `--return`         | Forces `script` to exit with the exact return code of the child process/command executed.       | `script -e -c "./test.sh" out.log` |
| `-f`, `--flush`          | Flushes output immediately to the file after every write, ensuring logs survive kernel panics.  | `script -f audit.log`              |
| `-q`, `--quiet`          | Suppresses the startup and exit informational messages printed by the utility.                  | `script -q session.log`            |
| `-t[file]`, `--timing`   | Outputs high-fidelity timing data to standard error or a specific file for video-like playback. | `script --timing=time.txt out.log` |
| `-I`, `--log-in <file>`  | Logs all raw user keystroke input into a separate, distinct file.                               | `script -I keystrokes.txt`         |
| `-O`, `--log-out <file>` | Explicit equivalent of specifying the main file argument, logging pure terminal output.         | `script -O terminal.log`           |
| `-V`, `--version`        | Displays version information for the `util-linux` package.                                      | `script -V`                        |
| `--force`                | Forces the command to run and overwrite the target file even if it is a symlink or hardlink.    | `script --force typescript`        |

## Examples

```bash
script
```

> This is the default execution. It spawns a new shell, announces `Script started, file is typescript`, and begins recording everything. To stop recording, the user simply types `exit` or presses `Ctrl+D`, returning them to their original shell.

```bash
script -a -f /var/log/audit/admin_session_$(date +%s).log
```

> This implements rigorous session auditing. It appends (`-a`) to the specified file and forcefully flushes (`-f`) the I/O buffer after every single keystroke. If the server loses power during the session, the log is perfectly preserved up to the millisecond of the crash.

```bash
script -q -e -c "./flaky_installer.sh" install.log
```

> This utilizes `script` as a robust command wrapper. Instead of an interactive shell, it runs the installer script inside a PTY (`-c`), capturing colored progress bars that standard `>` redirection destroys. Crucially, `-e` ensures the `script` command returns the actual exit code of `flaky_installer.sh` to the parent pipeline.

```bash
script --timing=timing.log session.log
```

> This initiates a recorded session primed for cinematic playback. It writes the terminal bytes to `session.log`, but writes microsecond delay matrices to `timing.log`. Using the companion tool `scriptreplay timing.log session.log`, an administrator can watch the entire session replay exactly as the user typed it, with perfect pacing.

```bash
script -I input.log -O output.log
```

> This isolates the byte streams. It separates the exact raw keystrokes the user typed (including backspaces and passwords) into `input.log`, while isolating the server's responses into `output.log`, facilitating deep forensic analysis of compromised sessions.

## Real-World Scenarios

**Mandatory SSH Jump-Host Auditing**

```bash
# Inside /etc/profile on the bastion host:
if [ "$USER" != "root" ]; then
    exec script -q -f -a /var/log/bastion/${USER}_$(date +%s).log
fi
```

> Security architects enforcing Zero-Trust access configure bastion hosts to intercept user logins. The user's shell is immediately replaced (`exec`) with the `script` command. The user interacts with the terminal normally, but absolutely every command, typo, and output payload is immutably flushed to a root-owned forensic directory.

**Capturing Complex Interactive Compilation Logs**

```bash
script -c "make menuconfig && make all" build.log
```

> Embedded Linux developers building kernels rely on `ncurses` GUI menus (`menuconfig`). Standard `tee` or `>` redirection breaks ncurses formatting entirely. Wrapping the build chain in `script` provides the interactive PTY required by the menu, while perfectly capturing the subsequent 10,000 lines of GCC compilation output for debugging.

## When should it NOT be used?

- **Creating tutorials for the web:** **Reason:** `script` records raw ANSI escape codes. Opening a `script` log in a web browser or `notepad` reveals a garbled mess of `^[[31m` characters instead of readable text. **Use instead:** `asciinema`, which records to JSON and renders cleanly in web browsers.
- **Logging passwords or sensitive keystrokes without safeguards:** **Reason:** `script` blindly captures raw input. If an administrator types an SSH password or API key, it is saved in plaintext to the `typescript` file on disk. **Use instead:** Configure `.bash_history` `HISTCONTROL=ignorespace` for command logging, or ensure `script` logs are strictly `chmod 600`.

## Alternatives

- **`asciinema`:** Modern terminal recording. **Tradeoff:** `asciinema` is infinitely superior for sharing tutorials, as it uploads recordings to a web service and plays them back in a fast, copy-pasteable HTML5 player, but it requires external binaries and network access not present on air-gapped servers.
- **`tee`:** Pipeline splitting. **Tradeoff:** `tee` reads standard input and writes to files. It is faster and cleaner for pure string logging, but physically incapable of providing the PTY (Pseudo-Terminal) environment required to capture interactive prompts or color codes.
- **`tmux` / `screen` logging:** Multiplexer logging. **Tradeoff:** Users can press `Ctrl+B, Shift+H` in tmux to log the current pane. Highly convenient for developers already using tmux, but harder to enforce globally via policy than `script`.

## How it works internally

`script` operates by acting as an invisible man-in-the-middle between the Linux kernel's Terminal (TTY) driver and the user's shell.

When executed, `script` utilizes the `openpty()` system call to request a new Pseudo-Terminal (PTY) master/slave pair from the kernel. It forks a new child process. The child process replaces its standard input, output, and error file descriptors with the slave end of the newly allocated PTY, and then executes a new interactive shell (e.g., `/bin/bash`).

The parent `script` process sits on the master end of the PTY. It enters an asynchronous `poll()` or `select()` loop. Whenever the user presses a key on their keyboard, the parent intercepts the byte, writes a copy to the `typescript` file, and forwards it to the child shell. When the child shell outputs text (or ANSI colors), the parent intercepts it, writes a copy to the log file, and forwards it to the physical terminal display.

Because the child shell genuinely believes it is connected to a physical interactive terminal, tools like `vim` or `top` query the PTY geometry and render correctly, completely unaware their byte stream is being shadowed to a disk file.

## Performance Notes

- By default, `script` utilizes block buffering for disk writes. If the server crashes abruptly, the last few kilobytes of the session are trapped in RAM and lost. Invoking the `-f` (flush) flag forces an `fsync()` after every write. This guarantees data persistence but introduces measurable disk I/O latency on high-throughput command streams (like running `tree /`).
- The memory overhead is effectively zero, as `script` simply acts as a fast byte-relay pipe between two file descriptors.

## Security Notes

- **Forensic Evasion:** If a malicious insider knows they are being recorded by `script`, they can intentionally output garbage ANSI escape codes to corrupt the log file. For example, echoing the "clear screen" or "overwrite line" ANSI codes will cause the `scriptreplay` tool to visually hide their commands during playback.
- **Plaintext Secrets:** `script` captures everything, including the output of `cat secret.key` or passwords passed via CLI arguments. Security policies must ensure the output directories for `script` logs have absolute `0700` permissions owned exclusively by root.

## Common Mistakes

- **Assuming the log file is readable text:** Opening `typescript` with `cat` or `vim` and seeing `^[[A^[[B`. **Why it's wrong:** The file contains raw terminal rendering bytes. If the user used backspace, `script` recorded the character, the backspace escape code, and the new character. To read it cleanly, you must `cat` it to a terminal so the terminal interprets the colors, or use `ansifilter` to strip the escape codes entirely.
- **Nesting `script` sessions:** Running `script` while already inside a `script` session. **Why it's wrong:** It creates a cascading loop of PTYs. Keystrokes are duplicated, the terminal becomes sluggish, and the resulting log file is hopelessly corrupted with recursive echo bytes.
- **Forgetting `-e` in automation:** Running `script -c "./build.sh" log.txt && echo "Success"`. **Why it's wrong:** By default, `script` returns the exit code of _itself_ (usually 0), completely swallowing the failure code of the child `./build.sh`. The pipeline assumes success even if the build failed. Always enforce `-e` to bubble up the true exit code.

## Best Practices

- When executing dangerous, high-stakes manual remediation on a production database or kernel, blindly typing `script` before you begin is the ultimate insurance policy. If you make a mistake, you have a perfect, character-for-character ledger of exactly what you broke.
- To create clean, readable logs of command output without capturing backspaces or interactive prompt garbage, pipe commands directly: `echo "data" | script -q -c "cat" clean.log`.
- When managing jump hosts, combine `script` with the `PROMPT_COMMAND` bash variable to dynamically log the active timestamp and working directory into the typescript file, enriching the forensic metadata of the session.

## Interview Questions

- _Query:_ You are writing an automation wrapper using `script -c "./install.sh" output.log` to capture colored logs from a vendor installer. The script fails, but your wrapper script proceeds as if it succeeded, causing downstream errors. What flag is missing, and why does this happen architecturally?
  - _A:_ The `-e` (or `--return`) flag is missing. Architecturally, the `script` utility forks a child process to run the installer. When the child process dies, `script` gracefully closes the PTY and exits cleanly. Because `script` itself succeeded in its task of recording, it returns a `0` (Success) exit code to the parent shell, swallowing the installer's non-zero failure code. The `-e` flag forces `script` to capture and explicitly forward the child's exit code.
- _Query:_ What is the fundamental difference in mechanism and capability between running `my_app > output.log` and `script -c "my_app" output.log`?
  - _A:_ Output redirection (`>`) bridges the application's standard output directly to a file descriptor. If `my_app` detects its output is not a TTY (a physical terminal), it will automatically disable ANSI colors, interactive progress bars, and pagination. `script` allocates a Pseudo-Terminal (PTY) from the kernel. `my_app` probes the environment, confirms it is talking to a "real" terminal, and outputs full colors and interactive UI elements, which `script` then perfectly captures to the file.
- _Query:_ Why does opening a `typescript` log file with a standard text editor (like `vim` or VS Code) often result in unreadable, garbled text filled with `^M` and `[31m` characters?
  - _A:_ `script` is not a plaintext logger; it is a raw byte stream recorder. It records the exact bytes transmitted between the shell and the terminal emulator. This includes carriage returns (`^M`), terminal bell rings, backspaces, and complex ANSI escape sequences used to draw colors or move the cursor (`[31m`). A text editor attempts to render these raw rendering instructions as literal ASCII text, resulting in visual garbage.

## Practice Problems

- _Problem:_ Launch an interactive recording session that saves its output to a file named `db_maintenance.log`. Ensure the utility flushes the data to the disk instantly after every keystroke, and suppress the "Script started" terminal banner.
  - _Hint:_ Combine the flush flag with the quiet flag, and specify the target file.
  - _Solution:_ `script -f -q db_maintenance.log` (This creates an invisible, crash-proof forensic ledger).
- _Problem:_ Execute a specific python script `processor.py` inside a pseudo-terminal to capture its colored output into `python_out.log`. Critically, ensure that if the python script fails, the `script` command returns that exact failure exit code to the bash shell.
  - _Hint:_ Utilize the command wrapper flag paired with the exit-code forwarding flag.
  - _Solution:_ `script -e -c "python3 processor.py" python_out.log` (This executes the binary, captures the rich TTY output, and securely bubbles up the runtime status).

## References

- [Man Page for script (Linux)](https://man7.org/linux/man-pages/man1/script.1.html)
- [Util-Linux Git Repository](https://github.com/util-linux/util-linux)
  === END FILE ===
