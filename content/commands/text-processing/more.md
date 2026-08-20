---
slug: more
name: more
aliases: []
category: text-processing
tags:
  - text-processing
  - viewer
  - pager
  - files
  - legacy
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
  - page through file
  - view file one page at a time
  - read text file in terminal
  - linux more command
  - primitive file reader
relatedCommands:
  - less
  - cat
  - head
  - tail
alternatives:
  - less
status: draft
---

## What is it?

`more` is a primitive, POSIX-compliant terminal pager utility used to view text files or standard input streams interactively, one screenful at a time. It halts text output when the terminal window is full, prompting the user to press the Spacebar to advance to the next page or the Enter key to advance line-by-line.

## Why does it exist?

In the early days of UNIX (circa 1978), utilizing `cat` on a large file resulted in the text scrolling past the physical CRT terminal screen faster than a human could read it, losing the data permanently in an era before graphical terminal emulators with scrollback buffers existed. `more` was written by Chuck Haley and Bill Joy to solve this fundamental I/O mismatch. It exists as the original "pager," interacting with the terminal to pause the data stream synchronously, ensuring a user can read output sequentially.

## Syntax

```bash
more [options] file...
command | more [options]
```

## Flags

| Flag        | Description                                                                                                           | Example                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `-d`        | Displays a helpful prompt (`[Press space to continue, 'q' to quit.]`) instead of ringing the terminal bell on errors. | `more -d sys.log`        |
| `-p`        | Clears the screen before displaying the next page, rather than scrolling the text up.                                 | `more -p script.sh`      |
| `-c`        | Similar to `-p`, paints the screen from top to bottom, clearing the rest of the line as it goes.                      | `more -c config.txt`     |
| `-s`        | Squeezes multiple consecutive blank lines into a single blank line, consolidating sparse files.                       | `more -s output.txt`     |
| `-u`        | Suppresses underlining. Ignores backspace (`\b`) formatting characters in the file.                                   | `more -u formatted.doc`  |
| `+num`      | Starts displaying the file at the specified line number.                                                              | `more +500 massive.csv`  |
| `+/pattern` | Starts displaying the file exactly two lines before the first match of the specified regular expression.              | `more +/ERROR error.log` |

## Examples

```bash
more /etc/passwd
```

> This opens the system password file. The utility fills the terminal height and pauses, displaying `--More-- (42%)` at the bottom left. The user presses the Spacebar to read the next page, or `q` to quit.

```bash
ls -la /usr/bin | more
```

> This prevents a massive directory listing from overflowing the terminal. The output of `ls` is piped into `more`, which buffers the stream and presents it sequentially to the operator.

```bash
more -s -d messy_data.txt
```

> This cleans up the viewing experience. If `messy_data.txt` has blocks of 20 empty lines, `-s` collapses them into a single empty line, preventing the user from paging through empty space. The `-d` flag replaces the annoying terminal beep with a human-readable instruction prompt if the user hits an invalid key.

```bash
more +/Failed /var/log/auth.log
```

> This initializes the pager with a search. `more` rapidly scans through the file without displaying it until it locates the word `Failed`. It then renders the screen starting two lines prior to the match, allowing instant context evaluation.

```bash
more +1000 data.sql
```

> This explicitly skips the first 999 lines of the file. It drops the user instantly into the pager starting at line 1000, heavily reducing manual paging on massive structured files.

## Real-World Scenarios

**Viewing Files on Severely Constrained Systems**

```bash
more /var/log/messages
```

> An administrator is attempting to debug a crashed, minimal Docker container (like Alpine) or an embedded IoT router (like OpenWrt via BusyBox). Because these systems strip out heavy binaries to save megabytes of space, `less` is completely unavailable. `more` is virtually guaranteed to be present as a POSIX fallback.

**Automated Display Pausing in Shell Scripts**

```bash
# Inside an interactive deployment script
echo "Please review the EULA before proceeding:"
more eula.txt
echo "Do you accept? (y/n)"
```

> Shell script authors use `more` natively to force the operator to physically acknowledge large blocks of text (like licenses or deployment manifests) before the script execution continues.

## When should it NOT be used?

- **When you need to scroll backward through piped data:** **Reason:** If you run `command | more`, `more` consumes the standard input stream linearly. Once a line scrolls off the top of the screen, it is gone forever. You cannot press the "Up" arrow. **Use instead:** `less`.
- **When evaluating complex logs requiring robust regex:** **Reason:** `more` has primitive search capabilities, no highlighting, and no dynamic filtering. **Use instead:** `less -R` or `rg`.

## Alternatives

- **`less`:** The modern pager. **Tradeoff:** `less` is infinitely superior in functionality. It allows backward scrolling on pipes, horizontal chopping, persistent searching, and color parsing. You should only use `more` if `less` is uninstalled.
- **`cat`:** Dump everything. **Tradeoff:** `cat` does not pause. If you are operating inside a modern terminal emulator (like iTerm2 or Windows Terminal) with a massive scrollback buffer, `cat file.txt` and using your mouse wheel is often faster than using a pager for medium-sized files.

## How it works internally

`more` is architecturally simpler than `less`. It operates by dynamically monitoring the terminal's geometric parameters via the `TIOCGWINSZ` `ioctl` call to determine the number of rows and columns available on the active TTY.

When reading a physical file, `more` opens the file descriptor and executes blocking `read()` calls, outputting text until the line count matches the TTY row limit (minus one line for the `--More--` prompt). It utilizes the `termios` library to switch the terminal from "cooked" mode (line-buffered) to "raw" mode (character-buffered). This allows `more` to intercept the Spacebar or `q` key instantaneously without requiring the user to press Enter.

Crucially, when reading from a pipe (`cat | more`), the command does not allocate massive caching buffers in RAM. It simply reads the data off the standard input pipeline byte-by-byte and pushes it to `stdout`. Because pipes in Linux are unidirectional, FIFO (First-In, First-Out) byte streams, once `more` reads and prints a byte, that byte is consumed and lost to the void. This architectural purity is exactly why `more` cannot scroll backward on piped data.

## Performance Notes

- Because `more` does not allocate caching buffers or attempt to track byte offsets for backward scrolling on pipelines, its memory footprint is effectively zero, executing safely on embedded hardware with only kilobytes of RAM.
- The `+/<pattern>` search flag is inefficient on massive files. `more` will execute a linear scan using basic string matching. If the file is 50GB and the match is at the very end, `more` will freeze the terminal for a significant time while it scans the disk.

## Security Notes

- **Shell Escape Vulnerability:** Like many legacy UNIX tools, `more` possesses an internal command feature. If an operator presses the `!` key while viewing a file, `more` allows them to execute an arbitrary shell command (e.g., `!/bin/bash`). If `more` is granted via `sudo` to an unprivileged user to view a specific log file, that user can trivially escalate to a root shell by invoking `!bash`. Use `sudoedit` or strictly configured access control lists instead.

## Common Mistakes

- **Using `more` by muscle memory instead of `less`:** **Why it's wrong:** Many veteran UNIX administrators type `| more` strictly out of decades of habit. `less` has been the superior standard for over twenty years. `more` destroys your ability to navigate backward, artificially restricting your debugging capabilities.
- **Trying to scroll backward with the UP arrow:** **Why it's wrong:** `more` maps the Spacebar to "page down" and Enter to "line down". Pressing the UP arrow will often print raw ANSI escape codes (like `^[[A`) to the terminal, corrupting the visual output, because `more` lacks keybindings for backward movement.

## Best Practices

- Never use `more` unless operating on a deeply constrained embedded system (like OpenWrt) where `less` is physically unavailable.
- If writing POSIX-compliant shell scripts intended to run across unknown environments, and you must page output to a user, setting `PAGER=more` ensures the script does not crash, as `more` is guaranteed by the POSIX standard, whereas `less` is not.

## Interview Questions

- _Query:_ What is the absolute, fundamental architectural limitation of the `more` command when evaluating data originating from a pipeline (e.g., `dmesg | more`), and how does `less` overcome this?
  - _A:_ The `more` command consumes standard input streams linearly and pushes them to standard output without caching the data in memory. Because UNIX pipes are non-rewindable FIFO streams, once `more` prints a page, that data is permanently lost. Therefore, `more` cannot scroll backward. `less` overcomes this by intercepting the pipeline data and caching it in a massive RAM buffer (or spilling it to a temporary file on disk if it gets too large), allowing the user to navigate backward through the cached payload.
- _Query:_ A junior administrator is granted `sudo more /var/log/secure` access via the `sudoers` file to audit authentication failures. How can this administrator exploit this specific command to gain full root access to the server?
  - _A:_ The `more` utility includes a built-in interactive command execution feature. While viewing the file as root, the administrator can simply type `!/bin/bash` and hit Enter. `more` will execute the shell command using its current elevated privileges, instantly dropping the user into a completely unrestricted, interactive root shell, bypassing the intended `sudoers` limitation entirely.
- _Query:_ Explain the functional output difference between executing `more -p file.txt` and `more -c file.txt`.
  - _A:_ Both flags prevent `more` from scrolling the terminal window upwards, which is useful on slow or legacy serial connections. `more -p` (page) clears the entire terminal screen completely, and then draws the next page of text from top to bottom. `more -c` (clear) does not clear the screen first; it paints the new text line-by-line from top to bottom, erasing the old text on the remainder of each specific line as it draws.

## Practice Problems

- _Problem:_ Use `more` to open a file named `database.sql`, skipping the first 250 lines, and squeeze any sequence of blank lines into a single blank line to maximize screen space.
  - _Hint:_ Combine the squeeze flag with the numerical starting line offset flag.
  - _Solution:_ `more -s +250 database.sql` (This condenses the view and jumps directly to the relevant data block).
- _Problem:_ Open `app.log` using `more`, but instruct the pager to clear the screen entirely before drawing each new page, and include a helpful navigation prompt at the bottom of the screen instead of relying on terminal bells.
  - _Hint:_ Chain the page-clear flag with the explicit prompt flag.
  - _Solution:_ `more -p -d app.log` (This creates a cleaner, more user-friendly reading experience on legacy terminals).

## References

- [Man Page for more (Linux)](https://man7.org/linux/man-pages/man1/more.1.html)
- [POSIX Standard - more utility](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/more.html)
  === END FILE ===
