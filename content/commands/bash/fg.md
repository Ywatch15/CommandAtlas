---
slug: fg
name: fg
aliases:
  - foreground
category: bash
tags:
  - shell
  - built-in
  - job-control
  - processes
  - foreground
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - bring job to foreground
  - resume stopped job
  - return to suspended process
  - interact with background job
relatedCommands:
  - bg
  - jobs
alternatives:
  - screen
  - tmux
status: draft
---

## What is it?

`fg` (foreground) is a shell job-control built-in that brings a background or suspended job back to the active foreground of the terminal. It restores the process's access to standard input (the keyboard) and standard output, effectively giving the job complete control over the terminal session until it finishes, is suspended again, or is terminated.

## Why does it exist?

Unix systems frequently handle concurrent tasks within a single terminal via job control. Users often append `&` to run a process in the background, or use `Ctrl+Z` to suspend a foreground editor (like `vim` or `nano`) to quickly run a shell command. `fg` exists as the retrieval mechanism for these workflows. It allows the user to seamlessly toggle control of the terminal UI back to a specific paused or hidden application, bridging the gap between multitasking and interactive command-line environments.

## Syntax

```bash
fg [jobspec]
```

## Flags

_Note: Like `bg`, `fg` is a pure job-control built-in and accepts no dashed flags. It exclusively uses jobspecs to identify targets._

| Jobspec      | Description                                                                                                         | Example      |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| `%n`         | Targets the job with the specified job number `n` (found via the `jobs` command).                                   | `fg %1`      |
| `%+` or `%%` | Targets the "current" job. This is the most recently suspended or backgrounded job. This is the default if omitted. | `fg %+`      |
| `%-`         | Targets the "previous" job (the job that was current before the current job).                                       | `fg %-`      |
| `%string`    | Targets the job whose command line _begins_ with the provided string.                                               | `fg %vim`    |
| `?string`    | Targets the job whose command line _contains_ the provided string.                                                  | `fg ?config` |

## Examples

```bash
fg
```

> The standard invocation. Brings the most recently suspended or backgrounded job (the `+` job in the `jobs` list) back to the foreground and resumes its execution.

```bash
fg %2
```

> Explicitly brings job number 2 to the foreground. This is required if you are juggling multiple suspended tasks (e.g., multiple text editors).

```bash
fg %nano
```

> Uses string matching to bring a specific application to the foreground. If you suspended `nano /etc/fstab`, typing `fg %nano` instantly restores the editor without needing to look up the exact job number.

## Real-World Scenarios

**Toggling Between Code and Shell**

```bash
# Inside vim editing script.sh
# Press Ctrl+Z
[1]+  Stopped                 vim script.sh
chmod +x script.sh
./script.sh
# Discover an error
fg
# Instantly back inside vim to fix the error
```

> This is a classic Unix workflow. Instead of saving, quitting `vim`, running a test, and reopening `vim` (which wastes time and loses cursor position), a developer uses `Ctrl+Z` to drop to the shell, tests the code, and uses `fg` to snap perfectly back into their editing session.

**Rescuing Input-Starved Background Jobs**

```bash
apt-get upgrade -y &
# ... time passes ...
jobs
[1]+  Stopped (tty input)     apt-get upgrade -y
fg
# Provide the required [Y/n] input
```

> An administrator starts a package upgrade in the background. Halfway through, the package manager halts, prompting about overwriting a config file. Because background jobs cannot read keyboard input, the OS suspends it. The admin types `jobs` to see it is stopped, uses `fg` to bring it to the foreground, presses 'Y', and allows it to finish.

## When should it NOT be used?

- **Jobs detached via `disown`:** **Do not use `fg` on disowned processes.** Once you run `disown %1`, the job is removed from the shell's internal job table. `fg %1` will return an error because the shell no longer has a reference to manage the process, even if it is still running in the OS.
- **Shared Terminal Multiplexers:** **Do not confuse shell `fg` with window switching in `tmux` or `screen`.** `fg` only manages child processes of the current shell. It cannot bring a process from a different SSH session or `tmux` pane into your current view.

## Alternatives

- **Terminal Multiplexers (`tmux` / `screen`):** **Best for heavy multitasking.** Instead of constantly suspending and foregrounding tasks in a single shell, multiplexers allow you to view multiple foreground tasks simultaneously via split panes or virtual windows.

## How it works internally

When you type `fg %1`, the shell performs a coordinated kernel dance using process groups and terminal control.

First, if the target job is currently in a Stopped state (`T` state in `top`/`ps`), the shell sends a `SIGCONT` (Continue) signal to the process group, waking it up.

Next, the shell must yield control of the physical terminal. In Unix, every terminal device (TTY/PTY) has a "foreground process group" associated with it. Only this specific group is permitted to read keystrokes from the user (`stdin`). The shell issues a `tcsetpgrp()` system call, changing the terminal's foreground process group ID from itself (the shell) to the process group ID of the targeted job.

Once the terminal focus is handed over, the shell waits (using the `waitpid()` system call) for the job to finish or be suspended again. When the job completes or receives a `SIGTSTP` (Ctrl+Z), the kernel signals the shell, and the shell reclaims control of the terminal using `tcsetpgrp()` again, re-displaying your bash prompt.

## Performance Notes

- **Negligible Latency:** The system calls involved (`kill` for `SIGCONT` and `tcsetpgrp`) execute in user-space/kernel boundaries instantly. Context switching a job from background to foreground has virtually zero performance overhead.

## Security Notes

- **State Preservation:** Bringing an editor like `vi` or `nano` to the foreground restores its exact state in memory. If a privileged user suspends a root-level `visudo` edit, walks away, and an attacker gains access to the unlocked terminal, typing `fg` drops them directly into the privileged editor without re-prompting for a password.

## Common Mistakes

- **Forgetting which job is the default**
  - _Mistake:_ Juggling a `vi` session and a database dump, pressing `Ctrl+Z` on the dump, typing `fg`, and accidentally bringing the database dump back to the foreground instead of `vi`.
  - _Why:_ A naked `fg` command always targets the _most recently suspended_ job (the `+` job). If you suspend multiple things, you must use `jobs` to identify the correct `%n` jobspec, otherwise you lose track of terminal focus.
- **Trying to `fg` a PID**
  - _Mistake:_ Finding a process using `ps aux | grep script`, seeing its PID is 4592, and typing `fg 4592`.
  - _Why:_ Job control built-ins do not accept raw OS Process IDs (PIDs). They strictly accept internal shell jobspecs. You must use `%` followed by the job number (e.g., `fg %1`).

## Best Practices

- **Use `jobs` before `fg`:** If you have been working in a terminal for hours and have lost track of suspended tasks, never type a blind `fg`. Always type `jobs` first to audit the stack and use explicit job numbers (`fg %2`).
- **Embrace String Matching:** Instead of memorizing numbers, use string matching. If you have a node server running, `fg %node` is incredibly semantic and heavily reduces cognitive load during fast-paced development.

## Interview Questions

**Q: You background a job using `command &`. Later, you need to interact with it, so you run `fg`. What specific system call does the shell use to give that process access to the keyboard?**
**A:** The shell uses the `tcsetpgrp()` system call. This changes the foreground process group ID associated with the controlling terminal to match the background job, authorizing the kernel to send `stdin` (keyboard input) to that process instead of the shell.

**Q: If a background job attempts to read from standard input (`stdin`), what happens to it, and how does `fg` resolve the situation?**
**A:** The kernel intercepts the unauthorized read attempt and sends the background process a `SIGTTIN` signal, forcing it into a suspended (Stopped) state. To resolve this, the user must execute `fg`, which brings the job to the foreground, restoring its access to `stdin`, and sends a `SIGCONT` signal to resume its execution so it can capture the input.

## Practice Problems

**Problem:** You used `Ctrl+Z` to suspend a script named `deploy.sh`. You then started a database migration and suspended that too. You want to bring `deploy.sh` back to the foreground without checking its job number. Write the command.
**Hint:** Use the string-matching jobspec.
**Solution:**

```bash
fg %deploy
```

**Problem:** You want to bring the second job in your job table to the foreground. Write the command.
**Hint:** Use the numeric jobspec.
**Solution:**

```bash
fg %2
```

## References

- [Bash Reference Manual: Job Control Builtins](https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html)
- [POSIX Specification for fg](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/fg.html)
