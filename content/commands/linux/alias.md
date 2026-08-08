---
slug: alias
name: alias
aliases: []
category: linux
tags:
  - alias
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
  - create custom command
  - shorten terminal command
  - list shell aliases
  - override default command behavior
  - make shortcut for long command
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`alias` is a shell builtin command that instructs the command-line interpreter to replace one string with another before executing it. It is used to create custom, memorable shortcuts for long, complex, or frequently used command sequences.

## Why does it exist?

Early Unix environments required users to frequently type repetitive commands with verbose flags over slow teletype connections. `alias` was introduced into shell environments (originating in `csh` and adopted by Bourne-compatible shells) to improve human-computer ergonomics. It allows administrators and developers to personalize their terminal experience, enforce safer defaults (like prompting before deletion), and reduce keystroke fatigue without the overhead of writing and managing external executable scripts.

## Syntax

```bash
alias [name[=value] ...]
alias -p
```

## Flags

_(Note: Because `alias` is a shell builtin rather than a standalone binary, its available flags depend entirely on the shell executing it. The table below covers the exhaustive set across Bash, Zsh, and Ksh.)_

| Flag | Description                                                                                                               | Example                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `-p` | Prints all currently defined aliases in a reusable `name=value` format. (Bash, Zsh, Ksh)                                  | `alias -p > saved_aliases.sh`   |
| `-g` | Defines a global alias, which is expanded anywhere it appears on the command line, not just as the first word. (Zsh only) | `alias -g G="                   | grep"` |
| `-s` | Defines a suffix alias, mapping file extensions to specific handler programs. (Zsh only)                                  | `alias -s txt=nano`             |
| `-m` | Treats the provided arguments as string patterns and prints matching aliases. (Zsh only)                                  | `alias -m "git*"`               |
| `-L` | Prints aliases in a format suitable for re-entry into the shell. (Zsh only)                                               | `alias -L`                      |
| `-r` | Restricts operations to regular aliases, ignoring global or suffix variants. (Zsh only)                                   | `alias -r -p`                   |
| `-t` | Creates or lists tracked aliases, which the shell uses to cache binary paths for faster execution. (Ksh only)             | `alias -t vi`                   |
| `-x` | Exports the alias so that it is inherited by subshells. (Ksh only, Bash uses functions for this)                          | `alias -x ll="ls -l"`           |
| `-d` | Defines a directory alias, creating a shortcut for navigation. (Ksh only)                                                 | `alias -d proj="/var/www/html"` |

## Examples

```bash
alias ll="ls -alF"
```

> This maps the custom string `ll` to the `ls -alF` command. When you type `ll` and press Enter, the shell intercepts it, substitutes the defined string, and executes the directory listing with hidden files, detailed metadata, and file type indicators.

```bash
alias update="sudo apt update && sudo apt upgrade -y"
```

> This creates a single shortcut that chains multiple commands using the `&&` logical operator. It elevates privileges to update the package index, and if successful, immediately proceeds to upgrade all installed packages without prompting.

```bash
alias sudo='sudo '
```

> Adding a trailing space to the value of an alias forces the shell's parser to check the _next_ word on the command line for alias expansion. Without this, typing `sudo ll` would fail, because `sudo` operates on external binaries, not shell-internal aliases.

```bash
alias -p | grep "docker"
```

> This utilizes the `-p` flag to dump all active aliases to standard output, then pipes that output to `grep` to filter and display only the shortcuts you have configured for Docker operations.

```bash
alias -g L="| less"
```

> (Zsh specific) This creates a global alias. You can type `cat /var/log/syslog L`, and Zsh will intercept the trailing `L`, expanding the command into `cat /var/log/syslog | less`.

## Real-World Scenarios

**Enforcing Destructive Command Safety**

```bash
alias rm="rm -i"
alias cp="cp -i"
alias mv="mv -i"
```

> System administrators routinely place these aliases in `/etc/bash.bashrc`. They intercept the standard removal, copy, and move binaries and append the `-i` (interactive) flag, forcing the OS to ask for explicit confirmation before overwriting or deleting files, preventing catastrophic data loss.

**Git Workflow Optimization**

```bash
alias gs="git status"
alias gc="git commit -m"
alias gl="git log --oneline --graph --decorate"
```

> Developers working in terminals map verbose Git operations to two-letter shortcuts. This drastically reduces the cognitive load and physical keystrokes required for continuous source control management throughout the day.

**Dynamic Container Execution**

```bash
alias dshell="docker exec -it \$(docker ps -q -l) /bin/bash"
```

> This alias uses command substitution inside its definition to automatically find the most recently launched Docker container (`docker ps -q -l`) and immediately drop the user into an interactive bash shell inside that container.

## When should it NOT be used?

- **Commands requiring middle-arguments:** If you want a shortcut like `mkdir {name} && cd {name}`, do not use an alias. **Reason:** Aliases blindly append all typed arguments to the very end of the expanded string. **Use instead:** A shell function, which allows you to place variables like `$1` anywhere in the command structure.
- **Shell scripts and automation:** Do not rely on aliases inside `.sh` files or cron jobs. **Reason:** By default, POSIX shells and Bash explicitly disable alias expansion in non-interactive environments (unless forced with `shopt -s expand_aliases`), causing scripts to fail with "command not found" errors. **Use instead:** Absolute paths or shell variables.
- **Complex conditional logic:** If your shortcut requires `if/else` statements, loops, or error handling. **Reason:** Aliases are simple text-substitution mechanisms expanded during the lexical analysis phase, making multi-line control flow fragile and difficult to quote correctly. **Use instead:** A dedicated bash script placed in your `$PATH`.

## Alternatives

- **Shell Functions (`function name() {}`):** A shell builtin feature. **Tradeoff:** Functions are slightly more verbose to define than aliases, but they are vastly more powerful, supporting positional parameters (`$1`, `$2`), local variables, and complex control flow natively.
- **External Shell Scripts:** Executable files written in any language and placed in `$PATH` (e.g., `/usr/local/bin`). **Tradeoff:** Scripts are universally accessible to any shell (Bash, Zsh, Fish) and external programs, whereas aliases are isolated to the specific shell configuration that loaded them.
- **`command` builtin:** A shell builtin used specifically to _bypass_ aliases. **Tradeoff:** If `rm` is aliased to `rm -i`, running `command rm file.txt` ignores the alias and executes the underlying binary directly.

## How it works internally

`alias` is not an external executable (you will not find it in `/usr/bin/alias`); it is integrated directly into the shell's lexical analyzer.

When you press Enter, the shell reads the line of text and breaks it into tokens. Before parsing grammar or executing anything, the shell looks at the first token (the command word). It checks an internal, in-memory hash table of active aliases. If the token matches an alias key, the shell textually replaces the token with the alias's value.

The shell then recursively evaluates the newly expanded text. To prevent infinite loops (e.g., `alias grep="grep --color=auto"`), the shell tags the alias name during expansion. If the parser encounters the exact same alias name again during the current line's evaluation, it skips expansion. Crucially, because alias expansion happens pre-execution, aliases do not spawn subshells and have no associated Process ID (PID). They exist entirely as a string-manipulation step within the parent shell process.

## Performance Notes

- Alias execution has absolute zero runtime overhead compared to launching external scripts, as the substitution is resolved entirely in the shell's memory space before the `execve()` system call is ever invoked.
- Defining thousands of complex aliases in a `~/.bashrc` file will marginally increase the startup time (by a few milliseconds) of new terminal windows due to the I/O of reading the file and populating the shell's hash table.

## Security Notes

- **Environment Hijacking:** An attacker who gains write access to a user's `~/.bashrc` can maliciously alias common commands. For example, `alias sudo='sudo -S id >/dev/null 2>&1; sudo '` could be used to silently harvest credentials or execute payloads in the background while appearing to function normally.
- **Defensive Bypassing:** When operating as root on a compromised or untrusted system, administrators should use absolute paths (e.g., `/bin/ls`) or prepend a backslash (`\ls`) to bypass all alias expansion and ensure they are executing the genuine system binary, not a malicious local alias.

## Common Mistakes

- **Adding spaces around the equals sign:** Writing `alias ll = "ls -l"`. **Why it's wrong:** The shell splits arguments by spaces before the `alias` command parses them. It interprets this as an attempt to define an alias for `ll`, another for `=`, and another for `"ls -l"`. It fails with syntax errors. It must be strictly contiguous: `alias ll="ls -l"`.
- **Attempting to pass positional arguments:** Writing `alias mkcd="mkdir $1 && cd $1"`. **Why it's wrong:** The shell evaluates `$1` at the exact moment the alias is defined in your `.bashrc` (where it is usually empty). It does not dynamically evaluate it at runtime. Any arguments you type will just be appended to the end of the expansion.
- **Expecting aliases to work in `sudo` by default:** Defining `alias update="apt update"` and running `sudo update`. **Why it's wrong:** Alias expansion only applies to the first word (`sudo`). To fix this, you must define an alias for sudo with a trailing space (`alias sudo="sudo "`), which instructs the parser to check the next word for aliases as well.

## Best Practices

- Keep your environment organized by storing all custom shortcuts in a dedicated `~/.bash_aliases` file. Ensure your primary `~/.bashrc` file contains a snippet that sources this file if it exists, keeping your configurations modular.
- Use single quotes (`'`) instead of double quotes (`"`) when defining aliases that contain variables you want evaluated at execution time rather than at definition time (e.g., `alias timestamp='echo $(date)'`).
- If you frequently share terminal snippets or write tutorials, avoid using your personal aliases in the shared code to prevent confusing users whose environments lack your custom definitions.

## Interview Questions

**Q:** How do you temporarily bypass an alias? For instance, if `rm` is aliased to `rm -i`, how do you run the standard, non-interactive `rm` command just once?
**A:** You can escape the command name by prepending a backslash (`\rm`), use the `command` builtin (`command rm`), or specify the absolute path (`/bin/rm`). Any of these methods instructs the lexical analyzer to skip alias substitution.

**Q:** Why doesn't an alias definition like `alias ls='ls --color=auto'` cause an infinite recursive loop causing the shell to crash?
**A:** The shell's parser tracks the state of alias expansions on a per-line basis. When a token is expanded, its name is marked. If the resulting expanded text contains a word identical to a marked alias, the parser ignores it and proceeds to the next token, safely breaking the recursive loop.

**Q:** Why might an alias function perfectly in your interactive terminal, but fail with a "command not found" error when placed inside a bash script?
**A:** By default, POSIX shells and Bash explicitly disable alias expansion in non-interactive environments (like executing a `.sh` file) to ensure scripts run predictably. To use them in a script, you must explicitly enable them using `shopt -s expand_aliases` before defining or calling them.

## Practice Problems

**Problem:** You often mistype the `clear` command as `cls` (from your Windows muscle memory). Create a persistent shortcut so that typing `cls` clears your Linux terminal.
**Hint:** Map the new command string to the existing Linux binary.
**Solution:** `alias cls="clear"` (To make it persistent, add this exact string to your `~/.bashrc` or `~/.bash_aliases` file).

**Problem:** You have defined `alias grep='grep --color=auto'`. You are writing a script that parses text and want to use `grep`, but you must ensure no ANSI color codes are accidentally injected into your output. How do you invoke `grep` to guarantee the alias is ignored?
**Hint:** Use the shell prefix designed to bypass aliases, or escape the command.
**Solution:** `\grep "pattern" file.txt` or `command grep "pattern" file.txt`.

## References

- [GNU Bash Reference Manual - Aliases](https://www.gnu.org/software/bash/manual/html_node/Aliases.html)
- [bash(1) - Linux manual page](https://man7.org/linux/man-pages/man1/bash.1.html)
  === END FILE ===
