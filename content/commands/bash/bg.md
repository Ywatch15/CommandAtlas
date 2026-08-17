---
slug: bg
name: bg
aliases:
  - background
category: bash
tags:
  - shell
  - built-in
  - job-control
  - processes
  - background
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
  - resume stopped job
  - run process in background
  - continue suspended task
  - send process to background
relatedCommands: [fg, jobs]
alternatives: [screen, tmux]
status: draft
---

## What is it?

`bg` (background) is a shell job-control built-in that resumes execution of a suspended (stopped) process, allowing it to continue running in the background without tying up the active terminal. It is typically used in conjunction with the `Ctrl+Z` keyboard shortcut, allowing a user to pause a long-running foreground task, send it to the background via `bg`, and regain control of their shell prompt.

## Why does it exist?

Before terminal multiplexers like `tmux` or `screen` existed, a user only had one terminal prompt. If they executed a script that took 30 minutes to run (e.g., a massive `tar` compression), their terminal was completely blocked. If they hadn't appended the `&` operator to start it in the background initially, they were stuck. Job control mechanisms (specifically `SIGTSTP` via `Ctrl+Z`, followed by `bg`) exist to retroactively fix this. It provides the flexibility to pause a process, liberate the terminal for other work, and instruct the OS scheduler to resume the task silently.

## Syntax

```bash
bg [jobspec ...]
```

## Flags

_Note: `bg` is a job-control built-in. It accepts no standard dashed flags. Instead, it accepts one or more "jobspecs" (Job Specifications) which identify which background job to target._

| Jobspec      | Description                                                                                                              | Example      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `%n`         | Targets the job with the specified job number `n` (found via the `jobs` command).                                        | `bg %2`      |
| `%+` or `%%` | Targets the "current" job. This is usually the most recently suspended job. This is the default if no argument is given. | `bg %+`      |
| `%-`         | Targets the "previous" job (the job that was current before the current job).                                            | `bg %-`      |
| `%string`    | Targets the job whose command line _begins_ with the provided string.                                                    | `bg %tar`    |
| `?string`    | Targets the job whose command line _contains_ the provided string anywhere within it.                                    | `bg ?backup` |

## Examples

```bash
bg
```

> The standard invocation. It resumes the most recently suspended job (the default `%+` job) in the background.

```bash
bg %2
```

> Explicitly resumes job number 2 in the background, regardless of which job was most recently suspended.

```bash
bg %tar %gzip
```

> Resumes multiple stopped jobs simultaneously. It finds the job starting with `tar` and the job starting with `gzip` and sends both `SIGCONT` signals.

## Real-World Scenarios

**Rescuing a Blocked Terminal**

```bash
# Running a massive database dump in the foreground
mysqldump -u root -p massive_db > backup.sql
# Terminal is locked. Press Ctrl+Z
[1]+  Stopped                 mysqldump -u root -p massive_db > backup.sql
bg
# Job resumes in the background, prompt is returned.
```

> A database administrator forgets to use the `&` operator when starting a 50GB database dump. Instead of canceling the job (`Ctrl+C`) and wasting the last 10 minutes of progress, they suspend it with `Ctrl+Z` and use `bg` to seamlessly shift it to the background.

**Managing Multiple Downloads**

```bash
wget [http://example.com/huge_iso1.iso](http://example.com/huge_iso1.iso)
# Ctrl+Z
bg
wget [http://example.com/huge_iso2.iso](http://example.com/huge_iso2.iso)
# Ctrl+Z
bg
jobs
```

> An engineer needs to download several massive files but only has one SSH session. They start a download, suspend it, background it, and repeat. `bg` allows them to orchestrate parallel execution directly from a single prompt.

## When should it NOT be used?

- **Processes requiring interactive input:** **Do not background a job that expects user input.** If you `bg` a script that eventually prompts `Are you sure? [y/N]`, the job will immediately be stopped again by the OS (receiving a `SIGTTIN` signal) because background jobs are denied access to `stdin`.
- **Long-running jobs over SSH:** **Do not use `bg` if you plan to disconnect from SSH.** Backgrounding a job via `bg` ties the process to your current shell session. If you close your terminal or the SSH connection drops, a `SIGHUP` (hangup) signal is sent, killing the background job. Use `nohup` or `tmux` for persistence.

## Alternatives

- **Ampersand (`&`):** **Best for proactive backgrounding.** If you know a job will take a long time _before_ you execute it, simply append `&` (e.g., `sleep 100 &`). It bypasses the need for `Ctrl+Z` and `bg` entirely.
- **Terminal Multiplexers (`tmux` / `screen`):** **Best for robust session management.** Instead of pushing processes to the background, you create virtual terminal windows. They survive SSH disconnects and allow you to see the application's output natively.
- **`nohup` / `disown`:** **Best for detaching processes.** Allows a backgrounded process to survive the termination of the parent shell.

## How it works internally

Job control is deeply integrated into the Unix kernel's process group and signal handling architecture.

When you run a command, it is assigned a process group ID. When you press `Ctrl+Z`, the terminal driver intercepts the keystroke and sends a `SIGTSTP` (Terminal Stop) signal to the foreground process group. The kernel halts the process's execution scheduling, placing it in a `T` (Stopped) state.

When you type `bg`, the shell identifies the target process group based on the jobspec. It then makes a `kill()` system call to send the `SIGCONT` (Continue) signal to that process group.

Crucially, the shell _does not_ give the terminal's controlling focus (via `tcsetpgrp()`) back to the process. The process wakes up and resumes executing CPU instructions, but it remains detached from standard input (`stdin`). If the background process attempts to read from the keyboard, the kernel intercepts the read and sends a `SIGTTIN` signal, instantly stopping the process again.

## Performance Notes

- **Instantaneous Context Switching:** Sending signals via the kernel is extremely fast. `bg` executes instantly and consumes negligible resources.
- **Standard Output Interruption:** Processes resumed via `bg` still retain their connection to standard output (`stdout`) and standard error (`stderr`). If the process is highly verbose, it will indiscriminately vomit text all over your active terminal prompt while you are trying to type.

## Security Notes

- **Job Visibility:** Background jobs belong to the shell session. They cannot be seen or manipulated using job specs (`%1`) by other users or even other terminal windows opened by the same user.
- **Unintended Execution:** Be careful when using string-based jobspecs (e.g., `bg %script`). If you have multiple scripts suspended, you might accidentally resume a destructive script you meant to keep paused, simply because its name matched the string first.

## Common Mistakes

- **Thinking `bg` prevents disconnect termination**
  - _Mistake:_ Using `Ctrl+Z` and `bg` on a long compilation job, then closing the laptop lid.
  - _Why:_ `bg` only moves the job to the background; it remains a child of the current shell. Closing the terminal sends `SIGHUP` to all child processes, terminating the compilation. You must use `disown` after `bg` to decouple the job from the shell's lifecycle.
- **Backgrounding interactive tasks**
  - _Mistake:_ Running `nano config.txt`, hitting `Ctrl+Z`, and typing `bg`.
  - _Why:_ `nano` is a text editor requiring continuous input and output. The moment `bg` sends `SIGCONT`, the OS sees a background task attempting terminal I/O and immediately suspends it again.

## Best Practices

- **Redirect Output Beforehand:** If you suspect you might need to background a job, always redirect its output first (`script.sh > out.log`). If you forget and use `bg`, the output will corrupt your active terminal display.
- **Combine with `disown`:** If you rescue a long-running job with `Ctrl+Z` and `bg`, but realize you need to leave for the day, follow it immediately with `disown %1`. This removes the job from the shell's job table, shielding it from `SIGHUP` when you log out.

## Interview Questions

**Q: You run a script, realize it will take an hour, press `Ctrl+Z`, and then type `bg`. What exact POSIX signals are sent to the process during this sequence?**
**A:** Pressing `Ctrl+Z` sends the `SIGTSTP` (Terminal Stop) signal, which suspends the process. Typing `bg` commands the shell to send the `SIGCONT` (Continue) signal, which wakes the process up and allows the OS scheduler to allocate CPU time to it in the background.

**Q: A backgrounded job suddenly transitions from "Running" to "Stopped" in the `jobs` list without you pressing anything. Why?**
**A:** The background process attempted to read input from the terminal (standard input). Because background jobs are prohibited from stealing terminal input, the kernel automatically sends it a `SIGTTIN` signal, which suspends the process until it is brought back to the foreground.

## Practice Problems

**Problem:** You pressed `Ctrl+Z` to stop a script named `data_import.sh`. You want to resume it in the background, but you also want to ensure it isn't killed when you close your SSH session. Write the two commands to achieve this.
**Hint:** Use the command to resume it, then use the shell built-in to remove it from the job table.
**Solution:**

```bash
bg
disown
```

**Problem:** You have three suspended jobs. You want to background the job that explicitly started with the command `wget`.
**Hint:** Use the string-based jobspec identifier.
**Solution:**

```bash
bg %wget
```

## References

- [Bash Reference Manual: Job Control Builtins](https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html)
- [POSIX Specification for bg](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/bg.html)
