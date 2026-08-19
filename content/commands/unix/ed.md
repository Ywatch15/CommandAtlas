---
slug: ed
name: ed
aliases: [standard line editor]
category: unix
tags: [linux, text-processing, editor, scripting]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'script file edits non-interactively'
  - 'original unix text editor'
  - 'line editor bash automation'
  - 'append text to file without editor UI'
  - 'edit file headless'
relatedCommands: [sed, vi, grep]
alternatives: [sed]
status: draft
---

## What is it?

`ed` is the original, foundational text editor for Unix operating systems, authored by Ken Thompson in 1969. It is a strictly line-oriented editor, meaning it lacks a graphical or visual terminal interface; users interact with a file by issuing cryptic, single-letter commands (like `p` to print, `s` to substitute, `d` to delete) targeting specific line numbers or regular expressions.

## Why does it exist?

In the 1970s, video terminals (like the VT100) did not exist. Programmers used teletypewriters (TTYs)—mechanical typewriters that printed on continuous rolls of physical paper. A visual editor (like modern `vim` or `nano`) that constantly redraws the entire screen is physically impossible on a typewriter. `ed` was engineered for this constraint. It operates completely silently, only printing ink to the paper when explicitly requested. While visual editors (`vi`) superseded it for human use, `ed` remains enshrined in the POSIX standard. Its command syntax birthed `grep` (Global Regular Expression Print, or `g/re/p`) and `sed` (Stream Editor), and `ed` itself remains heavily utilized today for executing deterministic, programmatic file modifications embedded deep inside bash scripts via Here-Documents.

## Syntax

```bash
ed [options] [file]
```

_(Once launched, `ed` waits for interactive commands at a blank prompt, or processes commands fed via standard input)._

## Flags

| Flag                        | Description                                                                                                                    | Example               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `-s`, `--quiet`, `--silent` | Suppresses diagnostic output (like byte counts on open/save) and the `!` prompt. Mandatory for automation scripts.             | `ed -s file.txt`      |
| `-p <string>`, `--prompt`   | Specifies a prompt string to display when waiting for interactive input (default is a blank line, making it highly confusing). | `ed -p '*' script.sh` |
| `-G`, `--traditional`       | Forces strict POSIX compatibility. Disables all modern GNU extensions, ensuring cross-platform script execution.               | `ed -G data.conf`     |
| `-v`, `--verbose`           | Be somewhat more verbose. If an error occurs, `ed` normally prints `?`. This flag forces it to print an actual error message.  | `ed -v file.txt`      |
| `-r`, `--restricted`        | Runs in restricted mode. The `!` command (which executes arbitrary shell commands) is mathematically disabled for security.    | `ed -r secure.txt`    |

## Interactive Commands

_(Commands passed to `ed`'s internal prompt)_

| Command         | Action                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `p`, `n`        | Prints the current line. `n` prints the line preceded by its line number.                                                                   |
| `1,10p`         | Prints a specific range (e.g., lines 1 through 10).                                                                                         |
| `a` / `i` / `c` | **A**ppends (after), **I**nserts (before), or **C**hanges the current line. Transitions into input mode. Enter `.` on a blank line to stop. |
| `d`             | Deletes the targeted line(s).                                                                                                               |
| `s/old/new/g`   | **S**ubstitutes the first string matching a regex with the second string. The `g` flag applies it globally across the line.                 |
| `w`             | **W**rites the buffer back to the physical file on disk.                                                                                    |
| `q`             | **Q**uits the editor. Will throw `?` if there are unsaved changes. Use `Q` to force quit without saving.                                    |

## Examples

```bash
ed -p '*' config.txt
```

> The interactive invocation. Opens `config.txt` into the internal memory buffer. The `-p '*'` flag tells `ed` to print a `*` when it is waiting for your command, preventing the user from staring blankly at a frozen screen. (Type `q` and `Enter` to exit).

```bash
ed -s file.txt <<< $'1,2d\nw\nq'
```

> The single-line automated edit. Uses a bash Here-String (`<<<`) to inject commands. It instructs `ed` to silently (`-s`) target lines 1 through 2 and delete them (`1,2d`), write the changes to disk (`w`), and quit (`q`).

```bash
ed -s application.ini << 'EOF'
/DebugMode/s/false/true/
w
q
EOF
```

> The canonical Here-Document automation pattern. A deployment script embeds an `ed` block. It searches for the line containing the regex `/DebugMode/`. Once positioned on that line, it executes a substitution (`s/false/true/`), writes, and quits. This alters the configuration file physically in-place with 100% determinism.

```bash
ed -s log.txt <<< $',s/ERROR/WARNING/g\nw\nq'
```

> Global substitution. The comma `,` is a shortcut for the range `1,$` (from the first line to the absolute last line). This command searches the entire document, replacing every instance of "ERROR" with "WARNING", identically mimicking `sed -i 's/ERROR/WARNING/g'`.

## Real-World Scenarios

**Minimal Container Recovery**

> An SRE shells into a heavily stripped-down Docker container based on Alpine Linux to fix a broken entrypoint script. The container lacks `vim`, `nano`, and `emacs`. However, because `ed` is a POSIX requirement, it is provided by the internal `busybox` binary. The SRE uses `ed`'s rudimentary commands to locate the syntax error, delete the line, and write the fix without installing external packages.

**Robust In-Place Script Edits**

> While `sed -i` is popular for in-place editing, the `-i` flag is not POSIX standard (GNU `sed` and BSD/macOS `sed` use vastly different syntaxes for `-i`, breaking cross-platform bash scripts). `ed` is the only universally guaranteed POSIX method for editing a file in-place programmatically across all Unix derivatives.

## When should it NOT be used?

- **Human Interactive Editing:** **Never use `ed` for daily typing.** It is notoriously difficult, lacks syntax highlighting, undo trees, and visual context. Use `vim`, `nano`, or VS Code. `ed` is strictly for machines.
- **Massive File Processing:** **Do not use `ed` on 50GB log files.** Like `vi`, `ed` attempts to load the _entire file_ into a temporary buffer (usually in `/tmp`) before it executes a single command. It will exhaust system memory and crash. For massive files, you must use `sed`, which streams the file sequentially, processing one line at a time with near-zero memory footprint.

## Alternatives

- **`sed` (Stream Editor):** **The modern standard for scripted edits.** `sed` was literally built by ripping the `s/.../.../` substitution engine out of `ed` and adapting it to process data streams rather than loading files into memory buffers.
- **`ex`:** The line-editing mode of `vi`. Typing `ex` (or `vi -e`) provides a more robust, modern superset of `ed` commands, though it is heavier.
- **`awk`:** **Best for column/field manipulation.** Far superior to `ed` or `sed` when dealing with structured data like CSVs.

## How it works internally

`ed` operates using a monolithic memory buffer architecture.

When you execute `ed file.txt`, the C binary opens the file and reads it entirely into a temporary swap file (historically `/tmp/ed.*`). It maintains a linked list of pointers; each node in the list points to a specific line of text in the swap file.

It also maintains a "Current Address" pointer (the dot `.`). When `ed` starts, the dot points to the last line of the file.

When you type a command like `/error/`, `ed` compiles the string into a Basic Regular Expression (BRE). It iterates through the linked list, searching for the string. If found, it moves the "Current Address" pointer to that line.

When you type `s/old/new/`, `ed` executes the substitution strictly on the line pointed to by the "Current Address". It modifies the text in the temporary swap file and updates the linked list.

When you type `w`, `ed` opens the original file `file.txt` with `O_TRUNC` (destroying its contents), and iterates sequentially through its internal linked list, writing the modified payload from the `/tmp` buffer back to the physical disk. If the machine loses power before `w` is executed, all changes are permanently lost.

## Performance Notes

- **Memory vs Stream:** Because `ed` pulls files into buffers and allows infinite backward and forward jumping (unlike `sed`), its execution speed on scripts is inherently bounded by disk I/O to the `/tmp` partition and system RAM, making it highly inefficient for massive search-and-replace tasks compared to streaming tools.

## Security Notes

- **The Shell Escape (`!`):** In `ed`, typing `!rm -rf /` executes an arbitrary shell command. If a web application takes unsanitized user input and blindly feeds it into a backend `ed` script to modify a configuration file, an attacker can inject `\n!malicious_payload\n`, achieving instant Remote Code Execution (RCE). Always execute automated `ed` scripts using the `-r` (restricted) flag to mathematically disable the `!` shell escape feature.

## Common Mistakes

- **The infamous `?` error**
  - _Mistake:_ Opening `ed`, typing `ls` because you are confused, and the terminal just prints `?`. You type `help`, it prints `?`. You type `exit`, it prints `?`.
  - _Why:_ `ed` is notoriously hostile to users. `?` means "syntax error". To escape, you must type `q` and press Enter. If you modified the file, `q` will print `?` to warn you of unsaved changes; type `q` a second time to force quit. (In modern `ed`, typing `H` toggles verbose errors, converting the `?` into actual English error messages).
- **Forgetting to write (`w`)**
  - _Mistake:_ Piping commands `echo "s/foo/bar/" | ed file.txt`. The command runs, but the file isn't changed.
  - _Why:_ You must explicitly instruct `ed` to save the buffer. The correct string is `echo -e "s/foo/bar/\nw\nq" | ed file.txt` (Substitute, Write, Quit).

## Best Practices

- **Use Here-Documents for Clarity:** In bash scripts, `echo -e` pipelines are illegible. Always use Here-Documents. It makes the series of `ed` commands read exactly like a recipe, vastly improving maintainability for future developers who must decode the legacy syntax.

## Interview Questions

**Q: You need to write a cross-platform bash script that edits a configuration file in-place. A developer suggests using `sed -i 's/foo/bar/' config.txt`. Why might this cause the script to fail in a mixed-OS environment, and how does `ed` solve this?**
**A:** The `-i` (in-place) flag is not part of the POSIX standard for `sed`. The GNU version of `sed` (standard on Linux) accepts `sed -i`, while the BSD version of `sed` (standard on macOS and FreeBSD) strictly requires an extension backup argument, like `sed -i ''`. A script using the GNU syntax will crash with a fatal error on macOS. `ed` is the only universally mandated POSIX utility capable of programmatic in-place file editing. Using `ed -s config.txt <<< $',s/foo/bar/g\nw\nq'` is mathematically guaranteed to work identically across Linux, macOS, and any certified Unix environment.

**Q: In the history of Unix, the command `grep` was named after a specific sequence of keystrokes utilized inside the `ed` editor. What is that sequence, and what does it literally instruct the editor to do?**
**A:** The sequence is `g/re/p`. It stands for **G**lobal, **R**egular **E**xpression, **P**rint. In `ed`, this specific command string instructs the editor to search Globally across the entire file buffer for lines matching the specified Regular Expression (`re`), and Print those matching lines to standard output. This exact sequence was ripped out of `ed` and compiled into a standalone binary, giving birth to the `grep` utility.

## Practice Problems

**Problem:** You are writing an automation script. You need to use `ed` to append exactly one line of text reading `New Config Line` to the absolute end of the file `settings.conf`. The script must run silently and save the file.
**Hint:** Use a Here-String `<<<`. The command to go to the end of the file is `$`. The command to append is `a`. Don't forget the `.` to end input mode, followed by write and quit.
**Solution:**

```bash
ed -s settings.conf <<< $'$\na\nNew Config Line\n.\nw\nq'
```

**Problem:** A script is running `ed` to process user-supplied configuration data. To prevent a catastrophic Remote Code Execution attack, you must invoke `ed` against `user.txt` in a mode that explicitly blocks the `!` shell-escape functionality. Write the invocation command.
**Hint:** Use the flag for restricted mode.
**Solution:**

```bash
ed -r user.txt
```

## References

- [ed(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/ed)
- [GNU ed manual](https://www.gnu.org/software/ed/manual/ed_manual.html)
