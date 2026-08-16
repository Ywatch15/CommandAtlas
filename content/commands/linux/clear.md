---
slug: clear
name: clear
aliases: []
category: linux
tags:
  - clear
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
  - clear the terminal screen
  - wipe terminal output
  - clear scrollback buffer
  - reset console display
  - clean shell screen
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`clear` is a standard Unix command-line utility used to clear the visible terminal screen and push the command prompt to the top of the display. Depending on the active flags and the terminal emulator's capabilities, it can also permanently wipe the terminal's scrollback buffer.

## Why does it exist?

Historically, different hardware terminal monitors (like the DEC VT100 or Wyse 50) required entirely different, proprietary control codes to manipulate the display cursor and erase characters. `clear` was developed as a hardware-agnostic abstraction layer within the `ncurses` library. It reads the system's `$TERM` environment variable, looks up the specific byte sequence required for that display in the `terminfo` database, and sends it to standard output, ensuring developers and users do not need to hardcode hardware-specific ANSI escape sequences.

## Syntax

```bash
clear [OPTIONS]
```

## Flags

_(Note: Unlike massive GNU utilities, the `clear` binary from the `ncurses` library is an intentionally microscopic single-purpose tool. It physically possesses only the three flags listed below. Fictitious flags have been omitted to maintain strict factual accuracy.)_

| Flag      | Description                                                                                                                | Example                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `-x`      | Clears the visible screen but explicitly prevents `clear` from attempting to clear the terminal's scrollback buffer.       | `clear -x`                |
| `-T type` | Bypasses the `$TERM` environment variable and forces `clear` to use the control sequences for the specified terminal type. | `clear -T xterm-256color` |
| `-V`      | Prints the version of the `ncurses` library providing the `clear` binary and immediately exits.                            | `clear -V`                |

## Examples

```bash
clear
```

> This queries the active `$TERM` environment variable, looks up the corresponding capabilities in the terminfo database, and sends the specific ANSI escape sequence to standard output to blank the visible terminal and wipe the scrollback buffer.

```bash
clear -x
```

> This clears only the currently visible terminal screen while explicitly preserving the historical scrollback buffer. It prevents the `E3` extended capability sequence from being sent, allowing you to scroll up using your mouse or keyboard to view previous command outputs.

```bash
clear -T vt100
```

> This overrides the current `$TERM` environment variable and forces `clear` to send the exact escape sequences designed for legacy DEC VT100 terminal hardware. This is crucial when connected via a serial console or an SSH session where the `$TERM` variable is misconfigured, causing standard `clear` to fail.

```bash
alias cls='clear -x'
```

> This defines a shell alias in `~/.bashrc` to map the familiar Windows/DOS `cls` command to the Linux `clear` command. Using the `-x` flag ensures that mimicking the Windows command does not aggressively destroy the Linux terminal's scrollback history.

```bash
printf "\033[H\033[2J\033[3J"
```

> While not using the `clear` binary itself, this is the exact raw ANSI escape sequence combination that modern `clear` outputs under the hood for xterm-compatible emulators (Move cursor home, clear visible screen, clear scrollback). It is used in lightweight Docker containers where the `ncurses` package (and thus the `clear` command) is not installed.

## Real-World Scenarios

**Live Log Monitoring Separation**

```bash
tail -n 50 /var/log/syslog; sleep 5; clear; tail -f /var/log/syslog
```

> When debugging a noisy application, administrators often want a clean slate. They will cancel a running `tail`, run `clear`, and restart the `tail` command. This visually isolates the new incoming log events at the top of the monitor from the historical noise.

**Custom Dashboard Loops**

```bash
while true; do clear; free -h; df -h; sleep 2; done
```

> Before tools like `watch` were universally available, administrators used `clear` inside infinite `while` loops to create real-time, refreshing system dashboards. The screen clears and redraws the memory and disk usage every two seconds.

**Serial Console Recovery**

```bash
export TERM=dumb && clear
```

> When a terminal session becomes severely corrupted over a faulty serial line—often resulting in the screen printing staircase patterns or unrecognized glyphs—administrators redefine the terminal type to `dumb` and execute `clear` to establish a safe, basic baseline for the display.

## When should it NOT be used?

- **Inside CI/CD Pipeline Scripts:** Do not put `clear` in scripts executed by Jenkins, GitHub Actions, or cron. **Reason:** These environments do not have interactive TTYs (terminals). `clear` will dump raw ANSI escape codes (like `^[[H^[[2J`) directly into your build logs, rendering them unreadable. **Use instead:** Simply let the script output flow naturally; no clearing is needed in headless environments.
- **Redirecting Output to Files:** Do not run commands like `clear > output.txt`. **Reason:** `clear` does not output empty spaces; it outputs terminal control characters. The resulting file will contain hidden escape sequences rather than blank lines. **Use instead:** `echo -e "\n\n"` if you genuinely need blank line spacing in a text file.
- **Recovering a completely garbled terminal state:** If binary data was `cat`ted to the screen and the font character set is corrupted, `clear` will only move the prompt; it will not fix the broken character mapping. **Reason:** `clear` only wipes the display, it does not reinitialize the terminal's state machine. **Use instead:** The `reset` command.

## Alternatives

- **`ctrl+l` (Keyboard Shortcut):** A built-in feature of the Readline library used by Bash and Zsh. **Tradeoff:** It is vastly faster and more ergonomic than typing `clear`, but depending on the shell configuration, it often acts like `clear -x` (preserving scrollback) rather than a hard clear.
- **`reset`:** A command that completely reinitializes the terminal state. **Tradeoff:** It fixes corrupted character sets, broken line-wrapping, and raw mode issues that `clear` cannot fix, but it takes nearly a full second to execute and visibly flashes the screen.
- **`tput clear`:** The direct interface to the `terminfo` database. **Tradeoff:** It behaves identically to `clear` but is technically more portable in strict POSIX shell scripts that already rely heavily on other `tput` cursor-manipulation commands.

## How it works internally

The `clear` binary is part of the `ncurses` (new curses) library. When invoked, it reads the `$TERM` environment variable (e.g., `xterm-256color`, `tmux-256color`, `linux`). It then queries the compiled `terminfo` database (usually located in `/usr/share/terminfo/` or `/lib/terminfo/`) to find the exact capabilities of that specific terminal.

It specifically looks for the `clear` string capability. For a standard ANSI-compatible terminal, this translates to the escape sequence `\x1b[H\x1b[2J`.

1. `\x1b[` is the Control Sequence Introducer (CSI).
2. `H` instructs the terminal emulator to move the cursor to the "home" position (row 1, column 1).
3. `2J` instructs the emulator to erase the entire visible display.

In 2011, modern terminal emulators added an unofficial extended capability called `E3`. If `clear` detects the `E3` capability in the terminfo database (and the `-x` flag is not provided), it also sends `\x1b[3J`, which explicitly instructs the terminal emulator software (like GNOME Terminal or iTerm2) to permanently delete the scrollback buffer from the computer's RAM. The binary writes these bytes directly to standard output and immediately exits with a status code of `0`.

## Performance Notes

- Running `clear` involves the operating system invoking the `fork()` and `execve()` system calls to launch the `/usr/bin/clear` binary. While taking only milliseconds, using the `ctrl+l` shortcut avoids process forking entirely because it is handled natively by the shell's internal Readline memory space.
- In exceptionally tight bash loops processing output, calling `tput clear` or `clear` repeatedly causes high CPU overhead. Storing the escape sequence in a variable (e.g., `CLEAR_SEQ=$(tput clear)`) and calling `echo -ne "$CLEAR_SEQ"` is orders of magnitude faster.

## Security Notes

- **Deceptive Masking (Malware):** Malicious shell scripts frequently execute `clear` immediately after running to hide warnings, curl commands, or trace outputs from the user's visible terminal, giving the illusion that nothing occurred.
- **Forensic Persistence:** Users often type `clear` believing it securely destroys the data on the screen (such as accidentally `cat`ting a private key). If the `-x` flag is used, or if the terminal emulator does not support the `E3` extension, the sensitive data remains fully intact in the scrollback buffer and can be easily retrieved by scrolling up or scraping the terminal emulator's memory space.
- **Terminal Multiplexers:** When running inside `tmux` or `screen`, standard `clear` commands are intercepted by the multiplexer. The multiplexer translates the command for the host terminal, but the sensitive data may still persist in the multiplexer's distinct internal scrollback history.

## Common Mistakes

- **Using `clear` to fix a broken terminal:** A user `cat`s a compiled binary file, the terminal starts printing weird glyphs, and the user runs `clear`. **Why it's wrong:** `clear` only wipes the screen; it does not reset the terminal's character set mapping (G0/G1) which was corrupted by the binary output. The user must type `reset` (even if they can't see the letters they are typing) and press Enter.
- **Piping `clear` over SSH:** Executing `ssh user@server 'clear; ./run_job.sh'`. **Why it's wrong:** If the SSH session is not allocated a pseudo-TTY (using `ssh -t`), the `clear` command will fail because there is no terminal to query, resulting in a "terminals database is inaccessible" error.
- **Assuming `$TERM` is always accurate:** Running `clear` in a minimal chroot or rescue shell where `$TERM` is empty. **Why it's wrong:** `clear` relies entirely on `$TERM`. If it is missing, `clear` aborts. The user must manually run `export TERM=linux` or `clear -T linux` to restore functionality.

## Best Practices

- Rely on `ctrl+l` (the Readline shortcut) for daily interactive use. It is faster, doesn't spawn a new process, and integrates perfectly with your ongoing command prompt typing without destroying your current line.
- If you are writing interactive CLI tools in shell scripts, do not use `clear`. Use `tput smcup` to save the terminal state and switch to the alternate screen buffer, and `tput rmcup` to restore the original terminal state when your tool exits (this is how `less` and `vim` work).
- If you must securely wipe sensitive data from the screen in a highly secure environment, ensure you are not using `clear -x`, and explicitly verify your specific terminal emulator respects the `E3` scrollback wipe command.

## Interview Questions

**Q:** What is the technical difference between the `clear` and `reset` commands?
**A:** `clear` only outputs a specific ANSI escape sequence to blank the current screen and move the cursor to the top-left corner. `reset` performs a deep reinitialization of the terminal's state machine, restoring default character mappings, fixing raw mode issues, and resetting echo settings, making it the required tool for fixing a corrupted terminal display.

**Q:** Why might the `clear` command return an error like "TERM environment variable not set"?
**A:** `clear` is not a magic binary; it works by looking up the terminal type in the `terminfo` database to determine which exact escape sequence to use. If the `$TERM` variable is missing (common in minimal containers or serial connections), it has no idea which sequence to send and aborts.

**Q:** If you execute `clear > output.txt`, what is actually written into `output.txt`?
**A:** The file will not contain empty spaces or blank lines. It will contain the raw ANSI escape control codes (such as `\033[H\033[2J`) that `clear` generated based on your `$TERM` variable, causing the file to look like random garbage characters if viewed in a standard text editor.

## Practice Problems

**Problem:** You are logged into a server, and you want to clear the screen to make it easier to read new output, but you absolutely must retain the ability to scroll up and read the previous 100 lines of compilation logs.
**Hint:** Use the flag that explicitly prevents the scrollback buffer from being wiped.
**Solution:** `clear -x` (This triggers a soft clear, pushing the current view down but preserving the history).

**Problem:** You are connected to a router via a rudimentary serial console. The `$TERM` variable is corrupted, and running `clear` throws a terminfo error. Force `clear` to use the universally accepted fallback terminal type (`vt100`) without modifying your environment variables.
**Hint:** Use the flag that specifies the terminal type directly.
**Solution:** `clear -T vt100` (This bypasses the `$TERM` check and directly queries the database for VT100 escape codes).

## References

- [clear(1) - Linux manual page (ncurses)](https://man7.org/linux/man-pages/man1/clear.1.html)
- [terminfo(5) - Terminal capability data base](https://man7.org/linux/man-pages/man5/terminfo.5.html)
  === END FILE ===
