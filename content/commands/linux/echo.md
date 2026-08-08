---
slug: echo
name: echo
aliases: []
category: linux
tags:
  - shell-scripting
  - text-processing
  - stdout
  - scripting
  - variables
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
  - print text to terminal
  - write variable to file
  - output string in bash
  - display environment variable
  - append text to file
relatedCommands:
  - cat
  - env
alternatives:
  - cat
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`echo` is a fundamental command-line utility and shell builtin used to print text, string payloads, and evaluated variables to standard output (stdout). By default, it processes the raw arguments provided to it, concatenates them with a single space, and appends a trailing newline character.

## Why does it exist?

Early operating systems needed a minimal, robust mechanism to provide visual feedback to users, inject textual data into pipelines, and inspect the values of environment variables dynamically. `echo` serves as the foundational standard output generator for shell scripts, enabling raw data injection into data streams and files without requiring the complex, structured formatting paradigms found in C's `printf`.

## Syntax

```bash
echo [SHORT-OPTION]... [STRING]...
```

## Flags

_(Note: Because `echo` is extremely minimalistic, its operational flags are limited. The following table includes its core execution flags as well as the specific escape sequences it processes when the `-e` flag is active, which act as internal formatting operators.)_

| Flag / Sequence | Description                                                                                                    | Example                        |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `-n`            | Do not output the trailing newline character at the end of the string.                                         | `echo -n "Prompt: "`           |
| `-e`            | Enables the interpretation of backslash escape sequences in the string.                                        | `echo -e "Line1\nLine2"`       |
| `-E`            | Explicitly disables the interpretation of backslash escapes (this is the default behavior in Bash).            | `echo -E "Raw \n text"`        |
| `--help`        | Outputs a brief usage message and exits (GNU coreutils external binary only).                                  | `/bin/echo --help`             |
| `--version`     | Outputs version information and exits (GNU coreutils external binary only).                                    | `/bin/echo --version`          |
| `\n`            | Outputs a newline character (requires `-e`).                                                                   | `echo -e "A\nB"`               |
| `\t`            | Outputs a horizontal tab character (requires `-e`).                                                            | `echo -e "Col1\tCol2"`         |
| `\r`            | Outputs a carriage return, moving the cursor to the beginning of the current line (requires `-e`).             | `echo -e "Loading...\rDone"`   |
| `\c`            | Suppresses any further output, including the trailing newline, effectively halting the string (requires `-e`). | `echo -e "Start\cIgnore this"` |
| `\a`            | Outputs an alert (bell) character, triggering the terminal's audible or visual bell (requires `-e`).           | `echo -e "Error!\a"`           |
| `\b`            | Outputs a backspace character, deleting the preceding character in the terminal display (requires `-e`).       | `echo -e "foo\bb"`             |
| `\e`            | Outputs an escape character, strictly used to initiate ANSI color and formatting codes (requires `-e`).        | `echo -e "\e[31mRed\e[0m"`     |

## Examples

```bash
echo "Hello World"
```

> This prints the raw string to the terminal, automatically appending a newline at the end. The double quotes ensure the shell treats the words as a single contiguous string argument rather than two separate arguments.

```bash
echo $PATH
```

> This asks the shell to evaluate the `PATH` environment variable and pass its value to `echo`. It prints the colon-separated list of directories your system searches for executable binaries.

```bash
echo -n "Enter your username: "
```

> The `-n` flag prevents the trailing newline from being printed. This leaves the terminal cursor resting immediately after the colon and space, which is commonly used in bash scripts just before a `read` command to create a clean user prompt.

```bash
echo -e "ID\tName\tStatus\n1\tApp\tActive"
```

> The `-e` flag instructs `echo` to interpret the backslashes. It translates `\t` into horizontal tabs and `\n` into a line break, structuring the raw text into a neat, column-based visual layout.

```bash
echo "daemon off;" >> /etc/nginx/nginx.conf
```

> This uses the `>>` redirection operator to take the standard output of `echo` and append it to the very end of the specified configuration file, ensuring existing data is not overwritten.

## Real-World Scenarios

**Injecting configurations into protected system files**

```bash
echo "127.0.0.1 db.local" | sudo tee -a /etc/hosts > /dev/null
```

> Direct redirection (`>`) fails on protected files because the shell evaluates the redirection as the unprivileged user. Piping the output of `echo` into `sudo tee -a` ensures the append operation is executed with root privileges, while `> /dev/null` keeps the terminal output clean.

**Generating dynamic JSON payloads for API requests**

```bash
echo "{\"id\": \"$USER_ID\", \"status\": \"active\"}" > payload.json
```

> Shell scripts interacting with REST APIs routinely use `echo` to construct JSON bodies on the fly. Escaping the internal double quotes (`\"`) ensures the shell preserves the JSON syntax, while expanding the bash variable `$USER_ID` natively.

**Probing network ports via bash pseudo-devices**

```bash
echo > /dev/tcp/192.168.1.1/80
```

> You can use `echo` combined with Bash's `/dev/tcp/` pseudo-device feature to perform a rapid, dependency-free port sweep. If the port is open, the empty string is sent and the command succeeds; if closed, the shell throws a connection refused error.

**Emptying application log files without deleting them**

```bash
echo -n > /var/log/application.log
```

> When dealing with massive log files on a production server, running `rm` might break the logging daemon's active file descriptor. Redirecting an empty, newline-free string (`-n`) into the file truncates the data completely on disk while preserving the inode and file permissions.

## When should it NOT be used?

- **Formatting complex, tabulated, or aligned data:** `echo` struggles with dynamic padding, floating-point numbers, and right-alignment. **Reason:** It lacks the formatting specifiers of C-style string manipulation. **Use instead:** `printf`, which provides robust `%s`, `%d`, and `%f` formatters.
- **Printing arbitrary, untrusted user input:** Running `echo $USER_INPUT`. **Reason:** If the input inadvertently contains `-e`, `-n`, or `-E` as the first word, `echo` interprets it as an operational flag rather than text to print, leading to unpredictable script behavior and logic bugs. **Use instead:** `printf "%s\n" "$USER_INPUT"`.
- **Cross-platform POSIX script portability:** Different shells implement `echo -e` divergently. **Reason:** In standard Bash, escapes are disabled by default. In `dash` (the default `/bin/sh` in Ubuntu), escapes are _enabled_ by default and `-e` is printed as literal text. **Use instead:** `printf` for guaranteed cross-shell behavior.

## Alternatives

- **`printf`:** The POSIX-standard formatting tool. **Tradeoff:** `printf` is significantly more robust, prevents option-injection attacks, and behaves identically across all shells, but its syntax is slightly more verbose (requiring explicit `\n` declarations).
- **`cat` (with Here-Docs):** Reading text from a block. **Tradeoff:** For writing multi-line configuration files, chaining five `echo` commands is difficult to read. `cat <<EOF` is vastly superior for injecting large blocks of formatted text.
- **`tee`:** The standard output splitter. **Tradeoff:** `echo "text" > file` sends data only to the file. `echo "text" | tee file` sends the data to the file _and_ prints it to the user's terminal simultaneously.

## How it works internally

`echo` exists in two forms: as a compiled external binary (`/bin/echo` or `/usr/bin/echo` provided by GNU Coreutils) and as a shell builtin (integrated directly into the source code of Bash, Zsh, and Dash). When you type `echo` in a terminal, the shell's builtin takes precedence.

Before `echo` executes, the shell's lexical analyzer evaluates the entire command line. It performs variable expansion (`$USER`), command substitution (`$(date)`), and filename expansion/globbing (`*`). `echo` is entirely blind to this process; it only receives the final array of argument strings (`argv`).

Once invoked, the `echo` builtin iterates through the argument array. It writes each string to file descriptor 1 (standard output), inserting a single space character (`0x20`) between each argument. Finally, it uses the `write()` system call to append a newline character (`0x0A`), unless the `-n` flag was parsed. If the operation succeeds, it exits with a status code of `0`. If the stdout pipe is broken or the disk is full during redirection, it returns a non-zero exit code.

## Performance Notes

- Because `echo` is executed as a shell builtin 99% of the time, it avoids the `fork()` and `execve()` system calls, making its execution virtually instantaneous (nanosecond latency).
- Calling the external binary explicitly via `/bin/echo` inside a tight `while` loop forces the OS to spawn thousands of temporary processes, which will cause massive CPU overhead and severely bottleneck your script.
- Redirecting `echo` multiple times to build a large file (e.g., thousands of `echo "data" >> file` calls) is highly inefficient due to repetitive file open/close syscalls. Aggregate the data into a variable or use a Here-Doc instead.

## Security Notes

- **Information Disclosure:** Running commands like `echo $DB_PASSWORD` instantly leaks the credential to the visible terminal display. More critically, it writes the plaintext secret permanently into the user's `~/.bash_history` file, compromising it for any subsequent auditor or attacker.
- **Unintended Shell Globbing:** Executing `echo $UNQUOTED_VAR` is dangerous if the variable contains an asterisk `*`. The shell expands the asterisk before `echo` runs, causing the command to unexpectedly print the names of every file in the current directory, potentially leaking filesystem structure.
- **Option Injection Vulnerabilities:** In Bash, `echo` does not support the `--` end-of-options delimiter. If you run `echo "$VAR"` and the variable is populated with `-e`, `echo` swallows the word as a flag and prints nothing, completely breaking automated text generation pipelines.

## Common Mistakes

- **Forgetting double quotes around variables:** Writing `echo $MESSAGE` instead of `echo "$MESSAGE"`. **Why it's wrong:** Without quotes, the shell performs word splitting. If `$MESSAGE` contains multiple spaces or newlines, the shell collapses them into single spaces, completely destroying the text's formatting.
- **Assuming single and double quotes behave identically:** Writing `echo 'My path is $PATH'`. **Why it's wrong:** Single quotes (`'`) enforce strict literal interpretation, preventing the shell from evaluating variables. This will print the literal string `$PATH` rather than the actual directory paths.
- **Attempting to pipe to protected files directly:** Writing `sudo echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf`. **Why it's wrong:** The shell evaluates the `>>` redirection as your current unprivileged user before `sudo` executes. It fails immediately with "Permission denied".

## Best Practices

- Always enclose variables in double quotes (`echo "$VAR"`) to preserve internal whitespace, newlines, and prevent accidental path expansion (globbing).
- In robust, production-grade shell scripts intended to run across various Linux distributions, Unix variants, and macOS, completely avoid `echo -e` and `echo -n`. Standardize on `printf` for guaranteed cross-platform consistency.
- When using ANSI escape codes with `echo -e` to colorize terminal output, always remember to append the ANSI reset code (`\033[0m`) at the end of your string. Failing to do so will permanently colorize the user's terminal prompt after the script exits.

## Interview Questions

**Q:** Why does `ls | echo` produce a blank line instead of printing the files in the directory?
**A:** `echo` is designed to print its command-line arguments, not read from standard input (stdin). When you pipe `ls` into `echo`, `echo` ignores the piped data stream entirely and simply executes without arguments, printing a default blank newline.

**Q:** What is the technical difference between executing `echo` and executing `/bin/echo`?
**A:** `echo` uses the shell's internal builtin, executing directly within the shell's existing memory space without spawning a new process. `/bin/echo` bypasses the builtin and executes the standalone GNU coreutils binary, which forces the operating system to perform expensive `fork()` and `execve()` system calls.

**Q:** How do you safely print a variable to the screen if you cannot guarantee that the variable doesn't start with a hyphen (like `-n` or `-e`)?
**A:** You should completely avoid `echo`, as it lacks an end-of-options delimiter to protect against option injection. You must use `printf "%s\n" "$VAR"`, which strictly separates the formatting directive from the arbitrary payload.

## Practice Problems

**Problem:** Print the exact string `"Current directory is: $PWD"` to the terminal, ensuring the shell actively evaluates and outputs the directory path.
**Hint:** Use the quotation marks that permit variable expansion.
**Solution:** `echo "Current directory is: $PWD"` (Double quotes allow `$PWD` to be evaluated, whereas single quotes would treat it literally).

**Problem:** Write a single command that prints the word "Success" in green text, and immediately resets the terminal color back to default.
**Hint:** You must use the flag that enables backslash escapes, and use the standard ANSI color code `\033[32m` for green and `\033[0m` for reset.
**Solution:** `echo -e "\033[32mSuccess\033[0m"` (The `-e` flag allows the `\033` escape codes to modify the terminal's text rendering engine dynamically).

## References

- [echo(1) - Linux manual page](https://man7.org/linux/man-pages/man1/echo.1.html)
- [Bash Builtin Commands (GNU Bash Manual)](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html)
  === END FILE ===
