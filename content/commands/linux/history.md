---
slug: history
name: history
aliases: []
category: linux
tags:
  - shell
  - bash-builtin
  - logging
  - productivity
  - cli
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
  - view previous commands
  - search command history
  - repeat last command
  - clear bash history
  - find old terminal commands
relatedCommands:
  - grep
  - clear
  - export
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`history` is a shell builtin command that displays, manipulates, and manages the chronological list of previously executed commands in a user's terminal session. It interacts directly with the shell's active in-memory history buffer and the persistent on-disk history file.

## Why does it exist?

Before interactive shells introduced history buffers, re-executing complex commands required manual retyping, leading to inefficiency and typographic errors. The `history` builtin, alongside history expansion mechanisms (like `!!`), was created to allow users to quickly audit, search, and recall past executions, fundamentally transforming CLI ergonomics and script development workflows.

## Syntax

```bash
history [n]
history -c
history -d offset
history -a|-n|-r|-w [filename]
history -p arg [arg...]
history -s arg [arg...]
```

## Flags

| Flag | Description                                                                                          | Example                 |
| ---- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| `-c` | Clears the current shell's in-memory history list entirely.                                          | `history -c`            |
| `-d` | Deletes the history entry at the specified numerical line offset.                                    | `history -d 1045`       |
| `-a` | Appends new history lines from the current session's memory to the on-disk file.                     | `history -a`            |
| `-n` | Reads history lines not already present in memory from the on-disk file into the current list.       | `history -n`            |
| `-r` | Reads the entire contents of the history file and appends them to the current in-memory list.        | `history -r`            |
| `-w` | Writes the entire current in-memory history list to the on-disk history file, overwriting it.        | `history -w`            |
| `-p` | Performs history expansion on provided arguments and prints the result without executing them.       | `history -p !!`         |
| `-s` | Appends the provided arguments to the in-memory history list as a single entry without executing it. | `history -s "rm -rf /"` |
| `-E` | (Zsh only) Prints timestamps in the European `dd.mm.yyyy hh:mm` format.                              | `history -E`            |
| `-i` | (Zsh only) Prints timestamps in the ISO-8601 `yyyy-mm-dd hh:mm` format.                              | `history -i`            |
| `-f` | (Zsh only) Prints timestamps in the US `mm/dd/yyyy hh:mm` format.                                    | `history -f`            |
| `-D` | (Zsh only) Prints the elapsed execution time for each command in the history list.                   | `history -D`            |

## Examples

```bash
history 20
```

> This prints only the last 20 commands executed in the current shell session, numbered chronologically. This is useful when the full history is thousands of lines long and you only need recent context.

```bash
history -c && history -w
```

> This first clears the active in-memory history buffer (`-c`), and then writes that empty state to the persistent `.bash_history` file (`-w`). This permanently deletes your command history.

```bash
history -d 502
```

> This targets and removes exactly line 502 from your current shell's memory. This is critical for scrubbing accidentally typed passwords or secrets before they are written to disk upon logout.

```bash
history -s "sudo systemctl restart nginx"
```

> This injects the specified string directly into the history buffer without actually running the command. You can then recall and execute it later using the Up arrow or `!`.

```bash
history | tail -n 100 | grep "docker run"
```

> This retrieves the entire history list, trims it to the last 100 entries, and filters for commands containing "docker run", helping you locate specific container launch arguments used recently.

## Real-World Scenarios

**Synchronizing history across multiple open terminals**

```bash
history -a; history -n
```

> When working in multiple terminal tabs, commands executed in Tab A are not visible in Tab B. Running this in Tab B appends its current memory to disk, then immediately reads any new lines (written by Tab A) into its memory, synchronizing the states.

**Auditing past administrative actions**

```bash
HISTTIMEFORMAT="%F %T " history | grep "usermod"
```

> When investigating a system configuration issue, setting the `HISTTIMEFORMAT` variable temporarily before calling `history` forces the shell to print precise timestamps, allowing you to establish an exact timeline of user modifications.

**Scrubbing an accidentally typed secret**

```bash
history -d $(history 1 | awk '{print $1}') && history -w
```

> If you accidentally pass a database password in plaintext, this command automatically grabs the line number of the immediately preceding command, deletes it from memory, and flushes the clean state to disk.

## When should it NOT be used?

- **Secure credential storage:** Shell history files store text in unencrypted plaintext. **Reason:** Anyone with read access to your home directory (or root) can harvest secrets. **Use instead:** Password managers, environment variable injection, or interactive prompts.
- **Multi-node compliance auditing:** `history` is strictly a node-local, per-user feature. **Reason:** It does not consolidate logs across a fleet, and users can easily bypass or delete it. **Use instead:** Centralized logging daemons like `auditd` or `syslog`.
- **Execution tracing:** Finding a command in `history` does not mean it worked. **Reason:** `history` only records what was typed and submitted, not exit codes, standard error, or completion status. **Use instead:** `script` for full session recording or `strace` for process tracing.

## Alternatives

- **`ctrl-r` (Reverse-i-search):** A built-in shell keyboard shortcut. **Tradeoff:** It is vastly faster for interactively finding and executing a single past command, but it does not provide the broad visual context of a chronological list.
- **`fc` (Fix Command):** A POSIX shell builtin. **Tradeoff:** `fc` opens history entries in a text editor (like Vim) allowing complex modifications before re-execution, but is heavier than simply viewing previous lines.
- **`atuin` / `mcfly`:** Third-party history replacements built in Rust/SQLite. **Tradeoff:** They provide rich, cross-machine synchronization and advanced fuzzy searching, but require installing custom binaries that are not available on standard POSIX servers.

## How it works internally

The shell (Bash, Zsh) maintains a linked list or array in process memory containing previously executed commands. When a command is submitted, the shell appends the raw string to this in-memory list _before_ spawning the child process to execute it. The environment variables `HISTSIZE` (maximum lines in memory) and `HISTFILESIZE` (maximum lines on disk) govern the truncation of these lists.

Upon a graceful exit (`exit` or EOF), the shell writes the in-memory list to the file specified by `$HISTFILE` (usually `~/.bash_history`). If a terminal session is killed abruptly (e.g., via `SIGKILL` or power loss), the in-memory history accumulated since the last write is permanently lost. The `history -a` command explicitly bypasses the wait for logout, flushing the buffer to disk immediately using standard POSIX system I/O routines like `write()`.

## Performance Notes

- Setting `HISTFILESIZE` to extremely large numbers (e.g., millions of lines) can noticeably delay shell startup times, as the shell sequentially reads, parses, and allocates memory for the entire file upon initialization.
- Configuring `PROMPT_COMMAND="history -a"` synchronizes history to disk after every single command. While safe, this incurs constant disk I/O, which can cause micro-stutters on slow Network File Systems (NFS).
- Searching massive history files using `grep` forces the shell to pipe thousands of lines of output to an external binary, which is slower than using native `ctrl-r` reverse searches.

## Security Notes

- **Plaintext Secrets:** Passing API keys or passwords via CLI arguments (e.g., `mysql -u root -pPassword123`) writes the secret directly to `.bash_history` in plaintext.
- **Forensic Unreliability:** Attackers frequently run `unset HISTFILE` or `kill -9 $$` to prevent the shell from writing their malicious commands to disk, making `history` fundamentally unreliable for definitive security audits.
- **Space Prefix Bypass:** If the environment variable `HISTCONTROL=ignorespace` is set, prefixing any command with a space completely bypasses the history buffer, leaving absolutely no trace of execution in the shell's memory or on disk.

## Common Mistakes

- **Running `history -c` expecting permanent deletion:** Clearing memory (`-c`) leaves the on-disk `.bash_history` file intact. **Why it's wrong:** Upon your next login, the shell reads the file back into memory, and the history returns. You must execute `history -c && history -w` to wipe both.
- **Overwriting concurrent sessions:** Opening Terminal A and Terminal B. You run commands in B, close B, then close A. **Why it's wrong:** Terminal A overwrites the history file on exit, completely erasing the commands saved by B. You must use `shopt -s histappend` to force concurrent sessions to append rather than overwrite.
- **Assuming history proves execution:** Finding a dangerous command in a user's history file and assuming they damaged the system. **Why it's wrong:** The command might have failed due to a typo, permission denial, or missing binary; history only proves intent, not execution success.

## Best Practices

- Set `HISTCONTROL=ignoreboth` in your `~/.bashrc` to prevent duplicate consecutive commands from cluttering your history, and to allow the space-prefix trick for explicitly hiding commands from the log.
- Enable `shopt -s histappend` in your configuration to ensure concurrent terminal sessions always append their history to the persistent file upon exit rather than destructively overwriting each other.
- Set `HISTTIMEFORMAT="%F %T "` to inject precise timestamps into the history file. This makes debugging timeline-dependent issues significantly easier when reviewing past actions months later.

## Interview Questions

**Q:** How do you execute a command containing a sensitive token and guarantee it is not saved to your shell history?
**A:** Ensure `HISTCONTROL=ignorespace` is set in your environment, then prefix the sensitive command with a single space. The shell will execute it normally but will intentionally skip appending it to the history buffer.

**Q:** You have two terminal windows open. If you run commands in Window A and then switch to Window B, why don't the commands from A show up when you type `history` in B?
**A:** By default, shells keep history in isolated process memory and only flush to the `.bash_history` file when the session cleanly exits. Window B cannot see Window A's in-memory history until A writes it to disk (`history -a`) and B explicitly reads it (`history -n`).

**Q:** What is the functional difference between the `HISTSIZE` and `HISTFILESIZE` variables?
**A:** `HISTSIZE` dictates the maximum number of commands the shell will keep in active memory during your current interactive session. `HISTFILESIZE` dictates the maximum number of lines the shell will write to the persistent `.bash_history` file on disk.

## Practice Problems

**Problem:** Find the exact command you ran 3 days ago that included the word "ffmpeg".
**Hint:** Use standard output piping to pass the history list to a text processing tool.
**Solution:** `history | grep "ffmpeg"` (This leverages `grep` to filter the chronologically numbered list of commands for the specific binary).

**Problem:** You accidentally typed a secret API key in a command and see it at line 405 in your `history` output. Delete only that specific line from memory, then permanently write the sanitized memory state to disk.
**Hint:** Use the delete flag followed by the write flag.
**Solution:** `history -d 405 && history -w` (The `-d` flag removes the entry from the active session's memory, and `-w` flushes this memory to overwrite the on-disk file, destroying the secret permanently).

## References

- [Bash Reference Manual - Bash History Builtins](https://www.gnu.org/software/bash/manual/html_node/Bash-History-Builtins.html)
- [history(1) - Linux manual page (via bash)](https://man7.org/linux/man-pages/man1/history.1.html)
  === END FILE ===
