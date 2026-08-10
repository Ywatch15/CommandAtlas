---
slug: exec
name: exec
aliases: []
category: bash
tags: [bash, shell, builtin, process, replacement, file-descriptors]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'replace shell process with command'
  - 'exec command in bash script'
  - 'redirect file descriptors permanently'
  - 'spawn process without new PID'
  - 'close file descriptors shell'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`exec` is a powerful shell built-in command that replaces the current shell process with a specified command, without spawning a new child process. Alternatively, when invoked without a command, it can be used to modify, open, or close file descriptors within the existing shell execution environment.

## Why does it exist?

Normally, when a shell script executes a command, it forks a child process (inheriting a new Process ID), waits for it to complete, and resumes control. In performance-critical container entrypoints or wrapper scripts where the shell script's job is complete once a primary application starts, spawning an idle parent shell process wastes system resources and prevents proper signal propagation (like SIGTERM) to the underlying application. `exec` exists to bridge this operational gap by performing an OS-level `execve` system call, completely replacing the shell process image in memory with the target binary while preserving the exact Process ID (PID).

## Syntax

```bash
exec [-cl] [-a name] [command [arguments ...]]
exec [redirection ...]
```

## Flags

| Flag          | Description                                                                                   | Example                           |
| ------------- | --------------------------------------------------------------------------------------------- | --------------------------------- |
| `-c`          | Clears the execution environment completely, executing the command with an empty environment. | `exec -c env`                     |
| `-a name`     | Passes `name` as the zeroth argument (`argv[0]`) to the invoked command.                      | `exec -a custom_name ./script.sh` |
| `-l`          | Places a dash (`-`) in the zeroth argument passed to the command, simulating a login shell.   | `exec -l bash`                    |
| (no flags)    | Replaces the current shell process image with the specified command.                          | `exec python3 app.py`             |
| (redirection) | Modifies shell file descriptors permanently without replacing the process.                    | `exec 3<>output.txt`              |

## Examples

```bash
exec python3 server.py
```

> This replaces the current bash script process entirely with the Python runtime executing `server.py`. The PID remains identical, and control never returns to the shell script.

```bash
exec 3<> /var/log/app.log
```

> This opens file descriptor 3 for both reading and writing (`<>`) pointing to the specified log file, keeping it open for subsequent shell I/O operations.

```bash
exec > >(tee -a output.log) 2>&1
```

> This redirects all standard output and standard error streams permanently for the remainder of the shell session into a background `tee` process, logging all terminal output to file.

```bash
exec 2>&1
```

> This permanently redirects standard error (`2`) to standard output (`1`) for the current shell execution context.

```bash
exec 4<&-
```

> This closes file descriptor 4 permanently within the active shell process.

## Real-World Scenarios

**Container Entrypoint Process Management in Docker**

```bash
exec node server.js
```

> Docker container entrypoint scripts routinely use `exec` to launch their Node.js, Python, or Java applications. This ensures the application runs as PID 1, allowing it to receive OS signals (like SIGTERM for graceful shutdowns) directly from the container runtime without being swallowed by an intermediate bash shell.

**Permanent I/O Redirection for Logging Wrappers**

```bash
exec >> /var/log/deploy.log 2>&1
```

> Deployment scripts use `exec` to redirect all subsequent output and error streams into a centralized log file, eliminating the need to append `>log 2>&1` to every individual command in the script.

**Customizing Process Titles via `argv[0]` Manipulation**

```bash
exec -a worker_process python3 background_task.py
```

> System administrators use the `-a` flag to disguise the process name (`argv[0]`) appearing in process monitoring tables (`ps aux`), making background tasks easier to identify.

## When should it NOT be used?

- **Executing subsidiary commands that must return control back to the script:** **Reason:** `exec` replaces the shell process entirely; execution never returns to the calling script. If you need the command to run and then continue script execution, do not use `exec`. **Use instead:** Direct command invocation (`cmd arg1`).
- **Interactive debugging where script persistence is required:** **Reason:** If an error occurs and `exec` replaces the shell prematurely, debugging contextual state is lost because the original shell process has terminated in memory.

## Alternatives

- **Direct Command Invocation (`cmd arg`):** Spawns a child process while retaining the parent shell. **Tradeoff:** It preserves the shell environment and returns control back to the script after completion, but leaves an idle parent shell process running in memory.
- **Subshells `( ... )`:** Executes commands inside an isolated subshell environment. **Tradeoff:** Subshells isolate variable changes, but still fork processes and do not perform an OS process image replacement.

## How it works internally

`exec` is a shell built-in that interfaces directly with the operating system kernel via the `execve(2)` system call.

When invoked with a command, the shell process calls `execve`, passing the binary path, argument vector (`argv`), and environment block (`environ`). The OS kernel instantly overwrites the current process's text, data, BSS, and stack segments in virtual memory with the new program binary image. Because no new process is created, the Process ID (PID) remains unchanged, and file descriptors marked with the close-on-exec flag (`FD_CLOEXEC`) are closed while others remain open.

When invoked with purely redirection operators (e.g., `exec 3>file`), Bash manipulates the process's internal file descriptor table using `dup2(2)` system calls without calling `execve`, altering how the existing shell process reads and writes I/O streams.

## Performance Notes

- `exec` is exceptionally efficient in containerized environments because it eliminates the memory overhead and process table clutter of maintaining an idle parent bash wrapper process.
- Process image replacement (`execve`) avoids the overhead of forking a new process structure when handing off execution to heavy runtime engines.

## Security Notes

- **Signal Propagation and Graceful Shutdowns:** Using `exec` as PID 1 in containers is a critical security and operational best practice. Without `exec`, container orchestration engines sending SIGTERM signals kill the parent bash shell, leaving the inner application orphaned or unresponsive.
- **Environment Leakage:** Executing commands with `exec` inherits the current shell environment; sensitive variables should be scrubbed beforehand or cleared using `exec -c`.

## Common Mistakes

- **Placing code after an unconditional `exec` command:** Writing `exec python app.py` followed by `echo "Deployment complete"`. **Why it's wrong:** Control never returns after `exec`. The `echo` command will never be executed because the shell process no longer exists in memory.
- **Forgetting process replacement consequences:** Using `exec` inside a function expecting the script to continue after the function returns. **Why it's wrong:** It terminates the entire script process, not just the function scope.
- **Mismanaging file descriptor leaks:** Opening persistent file descriptors via `exec` without closing them when finished, leading to resource exhaustion in long-running shell daemons.

## Best Practices

- Always use `exec` in Dockerfile entrypoint wrapper scripts to launch your primary application, ensuring proper PID 1 signal handling and graceful container termination.
- When redirecting global script logging via `exec >file 2>&1`, place it near the top of the script so all subsequent diagnostic output is captured automatically.
- Verify that critical file descriptors are properly managed and closed when no longer needed to prevent OS resource leaks.

## Interview Questions

- _Query:_ What happens to the Process ID (PID) of a shell script when you execute a command using `exec` versus invoking it directly?
  - _A:_ When invoked directly, the shell forks a new child process, assigning it a new PID while the parent shell waits. When invoked via `exec`, the shell performs an OS-level `execve` system call that replaces the shell process image in memory entirely with the new binary, keeping the exact same PID.
- _Query:_ Why is `exec` considered essential for container entrypoint scripts running inside Docker or Kubernetes?
  - _A:_ Containers assign PID 1 to the entrypoint process. If a bash script runs normally, it absorbs OS kill signals (like SIGTERM) and fails to forward them to the child application, breaking graceful shutdowns. Using `exec` replaces the bash shell with the application binary as PID 1, allowing it to receive termination signals directly from the container runtime.
- _Query:_ How can `exec` be used to modify file descriptors without replacing the shell process image?
  - _A:_ When invoked with zero command arguments and only redirection operators (e.g., `exec 3<>output.txt`), `exec` manipulates the process's internal file descriptor table using system calls like `dup2`, allowing scripts to open, duplicate, or close file descriptors for the remainder of the session.

## Practice Problems

- _Problem:_ Write a command that replaces the current shell process entirely with a Python 3 script named `worker.py`.
  - _Hint:_ Use the process-replacing execution built-in followed by the interpreter and script path.
  - _Solution:_ `exec python3 worker.py` (This overwrites the shell process image in memory with the Python runtime, keeping the same PID).
- _Problem:_ Permanently redirect all standard error (`2`) streams to standard output (`1`) for the remainder of the active shell session.
  - _Hint:_ Use the file descriptor duplication redirection syntax with `exec`.
  - _Solution:_ `exec 2>&1` (This updates the shell's internal file descriptor table, fusing standard error directly into standard output).

## References

- - [GNU Bash Reference Manual - The Exec Builtin](https://www.gnu.org/software/bash/manual/bash.html#The-Exec-Builtin)
- - [Advanced Bash-Scripting Guide - Chapter 20. I/O Redirection](https://tldp.org/LDP/abs/html/io-redirection.html)
