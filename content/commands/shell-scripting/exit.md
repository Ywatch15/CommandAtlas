---
slug: exit
name: exit
aliases: []
category: shell-scripting
tags: [shell, built-in, bash, scripting, execution, error-handling]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'stop bash script'
  - 'return exit code shell'
  - 'close terminal window'
  - 'fail pipeline gracefully'
  - 'set status code linux'
relatedCommands: [return, kill, trap, wait]
alternatives: [return]
status: draft
---

## What is it?

`exit` is a core shell built-in command used to immediately terminate the execution of the current shell process. It allows the terminating process to pass a specific numeric status code (ranging from 0 to 255) back to its parent process, serving as the universal POSIX mechanism for communicating success, failure, or specific error states between interacting applications and automation pipelines.

## Why does it exist?

Operating systems require a deterministic method to evaluate the outcome of a child process. If a CI/CD pipeline runs a deployment script, the pipeline must know if the deployment succeeded or failed to decide whether to proceed to the next step. `exit` exists to bridge this execution context. By leveraging the `waitpid()` system call architecture, it ensures that scripts do not just stop silently, but actively broadcast their terminal state, forming the bedrock of logical chaining (`&&` and `||`) and error handling in all Unix-like environments.

## Syntax

```bash
exit [n]
```

## Flags

_Note: `exit` does not accept standard dashed flags. It accepts a single, unsigned 8-bit integer parameter. The values below represent standard POSIX and Bash exit code conventions._

| Value / Code | Description                                                                         | Example    |
| ------------ | ----------------------------------------------------------------------------------- | ---------- |
| `0`          | Success. The process completed perfectly without errors.                            | `exit 0`   |
| `1`          | Catchall for general errors (e.g., divide by zero, bad configuration).              | `exit 1`   |
| `2`          | Misuse of shell built-ins or incorrect command-line arguments.                      | `exit 2`   |
| `126`        | Command invoked cannot execute (usually a permission issue, lacks `+x`).            | `exit 126` |
| `127`        | Command not found (e.g., typo in binary name or missing from `$PATH`).              | `exit 127` |
| `128`        | Invalid argument to `exit` itself.                                                  | `exit 128` |
| `128 + N`    | Fatal error signal `N`. E.g., `130` implies terminated by `SIGINT` (128 + 2).       | `exit 130` |
| `137`        | Terminated by `SIGKILL` (128 + 9). Often caused by OOM (Out Of Memory) killer.      | `exit 137` |
| `255`        | Out of range exit code. Represents an exit code of -1 or unmapped failures.         | `exit 255` |
| Omitted      | If no number is provided, `exit` returns the status of the _last executed command_. | `exit`     |

## Examples

```bash
exit 0
```

> The standard success terminator. Often placed at the absolute end of a bash script to explicitly signal to the calling process (like a cron daemon or Jenkins runner) that the logic executed flawlessly.

```bash
if [ ! -f "/etc/config.json" ]; then
    echo "Error: Configuration file missing." >&2
    exit 1
fi
```

> The canonical error trap. If a critical prerequisite is missing, the script prints an error specifically to `stderr` (`>&2`) and immediately aborts execution, returning `1` to inform the parent process of the failure.

```bash
ping -c 1 google.com > /dev/null
exit
```

> Implicit status passing. Because no integer is provided, the `exit` command inherits and returns the exit status of the very last command executed (the `ping` command). If `ping` succeeded, the script exits with `0`; if it failed, it exits with non-zero.

```bash
# Executed directly in an interactive SSH terminal
exit
```

> Session termination. When typed directly into an interactive bash prompt, `exit` terminates the active login shell process. Because the shell is the primary process holding the SSH connection open, the SSH daemon detects the closure and gracefully severs the network connection.

## Real-World Scenarios

**Ensuring Root Execution**

```bash
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root." >&2
    exit 87
fi
```

> System administration scripts that manipulate `/etc` or restart daemons will fail messily if run as a standard user. By evaluating the User ID at the very top of the script, the code cleanly aborts using a custom error code (`87`), preventing hundreds of "Permission denied" errors from flooding the terminal.

**Triggering CI/CD Failures**

```bash
make build || exit 1
make test || exit 1
docker push my-app:latest
```

> In heavily pipelined workflows, relying on `set -e` is sometimes too broad. Developers use explicit `|| exit 1` statements to guarantee that if the compilation or testing phases fail, the script terminates violently, physically preventing a broken artifact from being pushed to the production registry.

## When should it NOT be used?

- **Inside Functions:** **Do not use `exit` inside a reusable shell `function`.** If you call a function and it hits an `exit` command, it doesn't just exit the function; it instantly obliterates the entire running script process. To exit a function prematurely and return control to the main script, use the `return` keyword instead.
- **Background Subshells:** If you run `( command1; exit 1; command2 ) &`, the `exit` only terminates the isolated subshell process. The primary script continues executing entirely unaffected.

## Alternatives

- **`return`:** **Best for function scoping.** Exits a specific bash function and returns a status code to the main script block, allowing the script to decide how to handle the function's failure without dying abruptly.
- **`kill -9 $$`:** **Best for immediate, untrappable death.** `exit` invokes cleanup hooks (like `trap ... EXIT`). If you need the script to violently and instantly self-destruct without executing cleanup handlers, kill its own PID.

## How it works internally

When the `exit n` command is executed, the bash shell performs several internal teardown sequences.

First, it checks if any signal handlers have been registered using `trap 'commands' EXIT`. If so, the shell pauses the termination and executes the commands defined in the trap (useful for deleting temporary files or dropping lockfiles).

Next, the shell process invokes the underlying `_exit()` or `exit_group()` C system call, passing the 8-bit integer `n`. The Linux kernel receives this system call and begins tearing down the process. It closes all open file descriptors, frees the allocated RAM and virtual memory namespaces, and transitions the process into a `Zombie` state.

Crucially, the kernel sends a `SIGCHLD` signal to the Parent Process (the process that originally executed the script). The parent process is expected to be waiting on the `waitpid()` system call. `waitpid()` reads the 8-bit exit code left behind in the Zombie process's `task_struct`, reaps the Zombie, and assigns the integer to the `$?` variable in the parent's environment, completing the communication lifecycle.

## Performance Notes

- **Subshell Overhead:** While `exit` is instantaneous, be aware that scripts heavily utilizing subshells `$(command)` will invoke `exit` silently thousands of times. The kernel overhead of `fork()` and `exit()` during rapid subshell execution is the primary bottleneck in slow shell scripts.

## Security Notes

- **Masking Failures:** A script that catches a critical failure but subsequently executes `exit 0` is actively lying to the orchestrator (like Kubernetes or Ansible). This causes the orchestrator to believe the node is healthy, potentially routing production traffic to a broken application. Always map failure states to non-zero exits.
- **Information Leakage:** Custom exit codes (like `exit 42`) can be used to pass very basic information back to a parent script. However, because the exit code is restricted to a single unsigned 8-bit integer (0-255), attempting to execute `exit 256` will mathematically overflow and return `0` (Success), creating severe, silent logic vulnerabilities.

## Common Mistakes

- **Returning values larger than 255**
  - _Mistake:_ `exit 404` to signal an HTTP Not Found error.
  - _Why:_ The OS strictly masks the exit code using an 8-bit integer (`status & 255`). `404` bitwise ANDed with `255` wraps around and results in an exit code of `148`. Always keep custom exit codes strictly between `1` and `255`.
- **Relying on `exit` in piped commands**
  - _Mistake:_ `cat data.txt | while read line; do if [ "$line" = "bad" ]; then exit 1; fi; done; echo "Finished"`
  - _Why:_ In bash, segments of a pipeline execute in isolated subshells. The `exit 1` inside the `while` loop only kills the subshell. The parent script ignores it and continues on to print "Finished". You must inspect the `PIPESTATUS` array to catch pipeline failures.

## Best Practices

- **Use `set -e` (errexit):** Instead of manually appending `|| exit 1` to every single command in a 500-line deployment script, place `set -e` at the top of the file. This commands the shell to automatically and instantly `exit` if _any_ command returns a non-zero status, ensuring the script fails fast.
- **Standardize Custom Codes:** If writing complex internal tools, document your exit codes. Use `exit 2` for syntax errors, `exit 3` for network failures, and `exit 4` for missing files. This allows the calling wrapper scripts to deploy intelligent retry logic based on the specific error type.

## Interview Questions

**Q: You write a script that runs `exit 256`. The parent script checks the exit code using `echo $?`. What exact number is printed to the screen, and why?**
**A:** The number `0` is printed. The `exit` system call strictly accepts an unsigned 8-bit integer (representing values from 0 to 255). When a number larger than 255 is provided, the shell mathematically evaluates it modulo 256. `256 % 256` evaluates to `0`, which falsely signals perfect success to the parent process.

**Q: Explain the behavioral difference between using the `exit` command and the `return` command inside a Bash function.**
**A:** The `return` command simply halts the execution of the current function, passing the status code back to the primary script, which continues executing the lines immediately following the function call. The `exit` command halts the function _and_ completely obliterates the entire running script process, instantly returning control to the terminal or orchestrator.

## Practice Problems

**Problem:** You are writing an automated cleanup script. At the end of the script, you run a command `rm -rf /tmp/cache/*`. Write the exact `exit` command syntax required to ensure your script inherits and exits with whatever status code that specific `rm` command generated.
**Hint:** Use the command without passing an explicit integer argument.
**Solution:**

```bash
exit
```

**Problem:** You need a script to gracefully terminate, but before the process dies completely, you want it to automatically run the command `rm /var/run/app.lock`. Write the specific bash initialization syntax (trap) required to catch the `exit` signal and execute this command.
**Hint:** Use the built-in designed to catch signals and bind it to the `EXIT` pseudo-signal.
**Solution:**

```bash
trap 'rm /var/run/app.lock' EXIT
```

## References

- [Bash Reference Manual: Bourne Shell Builtins](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-exit)
- [Exit Codes With Special Meanings (Advanced Bash-Scripting Guide)](https://tldp.org/LDP/abs/html/exitcodes.html)
