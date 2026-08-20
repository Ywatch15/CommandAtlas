---
slug: trap
name: trap
aliases: []
category: shell-scripting
tags:
  - bash
  - shell
  - signals
  - cleanup
  - control-flow
  - robustness
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
  - catch exit signal bash
  - clean up temp files on script exit
  - intercept ctrl+c in shell script
  - handle bash errors automatically
  - trap sigint sigterm
relatedCommands:
  - kill
  - killall
  - wait
  - return
  - exit
alternatives: []
status: draft
---

## What is it?

`trap` is a shell built-in command used to intercept and respond to system-level signals (like `SIGINT` from Ctrl+C, or `SIGTERM` from a kill command) or internal shell events (like `EXIT` or `ERR`). It allows administrators to register specific commands or functions that the shell guarantees to execute immediately whenever the targeted signal is received, preempting the standard shutdown sequence.

## Why does it exist?

Robust automation scripts frequently create temporary files, lock out databases, or open network tunnels during execution. If an operator presses Ctrl+C, or if the script hits a fatal error halfway through, standard execution halts instantly, leaving orphaned temporary files clogging the disk or database locks permanently frozen. `trap` exists to provide a deterministic teardown sequence. By binding a cleanup function to termination signals, developers guarantee that their infrastructure state is safely reverted and garbage is collected regardless of how violently the script is killed.

## Syntax

```bash
trap [-lp] [[arg] signal_spec ...]
```

## Flags

| Flag / Signal  | Description                                                                                   | Example                          |
| -------------- | --------------------------------------------------------------------------------------------- | -------------------------------- |
| `-l`           | Lists all supported signal names and their corresponding integer values.                      | `trap -l`                        |
| `-p`           | Prints the list of currently configured traps and the commands bound to them.                 | `trap -p EXIT`                   |
| `EXIT` (0)     | A pseudo-signal triggered anytime the script terminates (success, failure, or end of file).   | `trap cleanup EXIT`              |
| `ERR`          | A pseudo-signal triggered anytime a command within the script returns a non-zero exit status. | `trap error_alert ERR`           |
| `DEBUG`        | A pseudo-signal triggered immediately _before_ every single command in the script executes.   | `trap 'echo Executing...' DEBUG` |
| `SIGINT` (2)   | The Interrupt signal, universally triggered by pressing `Ctrl+C` in the interactive terminal. | `trap '' SIGINT`                 |
| `SIGTERM` (15) | The Termination signal, the default polite shutdown request sent by the `kill` command.       | `trap shutdown SIGTERM`          |
| `SIGHUP` (1)   | The Hangup signal, triggered when the SSH session or terminal window is unexpectedly closed.  | `trap save_state SIGHUP`         |
| `""` (Empty)   | Binding an empty string ignores the signal entirely, making the script immune to it.          | `trap '' SIGINT`                 |
| `-` (Dash)     | Resets the specific signal back to its original, default OS behavior.                         | `trap - SIGINT`                  |

## Examples

```bash
trap 'rm -f /tmp/lockfile.tmp' EXIT
```

> This is the canonical cleanup pattern. The instant the script terminates—whether it finishes naturally, errors out, or is killed—the shell intercepts the `EXIT` event and ensures the `/tmp/lockfile.tmp` is deleted before returning control to the OS.

```bash
cleanup() {
    echo "Caught interruption signal. Rolling back database..."
    psql -c "ROLLBACK;"
    exit 1
}
trap cleanup SIGINT SIGTERM
```

> This maps a custom teardown function (`cleanup`) to multiple specific interruption signals. If the user presses Ctrl+C (`SIGINT`) or a daemon issues a kill request (`SIGTERM`), the shell pauses the kill, executes the database rollback function, and safely exits.

```bash
trap '' SIGINT SIGHUP
```

> Providing an empty string disables the signals completely. In this configuration, if the user presses Ctrl+C or their terminal disconnects, the script blindly ignores the event and forces execution to continue uninterrupted.

```bash
trap 'echo "Command failed at line $LINENO"' ERR
```

> This implements automated error handling. If any command in the script fails with a non-zero exit code, the `ERR` trap executes, utilizing the automatic `$LINENO` variable to instantly print the exact line number where the failure occurred.

```bash
trap -p
```

> This diagnostic command lists all actively configured traps in the current shell session, validating that cleanup routines have been successfully mapped to the correct signals.

## Real-World Scenarios

**Idempotent Execution Locks**

```bash
LOCKFILE="/tmp/deploy.lock"
if ! mkdir "$LOCKFILE" 2>/dev/null; then echo "Already running"; exit 1; fi
trap 'rm -rf "$LOCKFILE"' EXIT
```

> Mission-critical deployment scripts utilize `mkdir` to create an atomic lockfile. Because the `trap ... EXIT` is declared immediately afterward, the developer guarantees the lockfile is purged when the script finishes, ensuring a failed deployment doesn't permanently freeze future runs.

**Secure Password Wiping in Memory/Disk**

```bash
TEMP_SECRET=$(mktemp)
trap 'shred -u "$TEMP_SECRET"' EXIT
aws secretsmanager get-secret-value > "$TEMP_SECRET"
```

> Security automation scripts extracting high-value cryptographic keys store them in temporary files. Wrapping the execution in a `trap` that calls `shred` mathematically guarantees the plaintext secret is overwritten and physically destroyed from the disk sector immediately after the script completes, preventing credential harvesting.

## When should it NOT be used?

- **Attempting to catch `SIGKILL` (-9):** **Reason:** The `SIGKILL` and `SIGSTOP` signals are structurally uncatchable. The Linux kernel intercepts them and destroys the process instantly. The shell is never notified, so the `trap` cannot fire. **Use instead:** `SIGTERM` handlers paired with systemd timeout limits.
- **Complex multi-threaded background cleanup:** **Reason:** `trap` is bound to the specific shell process that declared it. If a script launches background jobs (`&`), a trap on the parent script will not execute inside the background subshells if the parent is killed abruptly.

## Alternatives

- **`systemd` `ExecStopPost=`:** Infrastructure teardown. **Tradeoff:** If the script is running as a daemon, `systemd` handles lifecycle management far more robustly. Using `ExecStopPost=` in a unit file guarantees cleanup commands execute regardless of how violently the main application crashed (including `SIGKILL`), which `trap` cannot do.

## How it works internally

`trap` relies on the POSIX `sigaction()` C system call within the Bash interpreter.

When Bash boots, it registers default signal handlers with the Linux kernel for standard signals (e.g., closing the shell on `SIGTERM`). When you declare a `trap 'cmd' SIGINT`, the Bash execution engine allocates memory for your command string and overwrites its internal jump table for `SIGINT`.

When the user presses Ctrl+C, the kernel sends the `SIGINT` interrupt to the Bash process. The kernel pauses Bash's current execution thread and forces it to jump to its registered signal handler subroutine. Bash looks at its internal table, sees your custom `trap` string, and hands the string over to its internal `eval` parser. It executes your commands, and once finished, resumes whatever it was doing (or exits, if your trap explicitly calls `exit`).

The `EXIT`, `ERR`, and `DEBUG` traps are "pseudo-signals." The kernel knows nothing about them. They are purely internal Bash hooks. The Bash engine natively intercepts its own shutdown sequence, error-handling routines, or pre-execution loops to manually trigger the trapped strings.

## Performance Notes

- Declaring a `trap` introduces absolutely zero execution overhead, as it merely updates a memory pointer in a hash table. The performance penalty only occurs if the trap is actually triggered.
- The `DEBUG` trap severely degrades execution speed. Because it forces Bash to stop and evaluate the trapped command _before every single line of code_ executed in the script, it slows processing exponentially. Reserve it strictly for deep troubleshooting.

## Security Notes

- **Expansion Vulnerabilities:** Writing `trap "rm $TEMP_FILE" EXIT` using double quotes is a massive security trap. Double quotes expand the variable at the exact moment the trap is _declared_. If the script later changes `$TEMP_FILE` to `/`, the trap will blindly execute `rm /` on exit. **Always use single quotes** (`trap 'rm "$TEMP_FILE"' EXIT`) to defer variable expansion until the exact millisecond the trap _executes_.

## Common Mistakes

- **Trying to trap SIGKILL (-9):** Running `trap cleanup SIGKILL`. **Why it's wrong:** The kernel strictly forbids user-space applications from intercepting or ignoring `SIGKILL`. The trap command will throw an error: `trap: SIGKILL: invalid signal specification`.
- **Forgetting to call `exit` inside a custom signal trap:** Writing `trap 'echo Cleaning' SIGINT`. **Why it's wrong:** If a user hits Ctrl+C, the trap fires, echoes "Cleaning", and then the script _keeps running_ where it left off. If you trap an interruption signal, your trap function must explicitly call `exit` to finalize the shutdown. (Note: This does not apply to `EXIT` traps, which fire after the exit is already guaranteed).
- **Declaring the trap too late:** Creating temporary files on lines 1-10, and declaring the `trap` on line 11. **Why it's wrong:** If the script crashes on line 5, the trap was never registered in memory, and the cleanup will not occur. Traps must be declared at the absolute top of the script.

## Best Practices

- Universally standardize on using the `EXIT` pseudo-signal (e.g., `trap cleanup EXIT`) instead of attempting to list `SIGINT SIGTERM SIGHUP`. The `EXIT` signal acts as an omni-catcher: if an external signal kills the script, the script initiates a shutdown, which triggers `EXIT` natively, ensuring 100% coverage with simpler syntax.
- Always structure your cleanup payload as a dedicated bash function (e.g., `teardown() { ... }`) and pass the function name to the trap (`trap teardown EXIT`). This prevents messy, unreadable semicolon-delimited command chains inside the string parameter.
- Enforce idempotency in your trap functions. Because the `EXIT` trap fires whether the script fails early or completes successfully, the cleanup commands must use `-f` (force) flags or existence checks so they don't crash if asked to delete a temporary file that wasn't created yet.

## Interview Questions

- _Query:_ A developer writes `trap "rm $TEMPFILE" EXIT` on line 2 of their script. On line 50, the script dynamically alters the value of `$TEMPFILE` to `/var/log`. When the script finishes, it deletes the wrong file. Explain the architectural shell expansion error that caused this.
  - _A:_ The developer used double quotes (`" "`) around the trap payload. In Bash, double quotes force immediate variable expansion. The shell evaluated `$TEMPFILE` on line 2, locked that exact string value into the trap memory, and ignored the subsequent changes. To fix this, the developer must use single quotes (`'rm "$TEMPFILE"'`), which instruct the shell to defer variable expansion until the exact moment the `EXIT` trap is physically triggered.
- _Query:_ Why is it a fundamental best practice to utilize the `EXIT` pseudo-signal for script teardown routines, rather than explicitly trapping `SIGINT` (Ctrl+C) and `SIGTERM`?
  - _A:_ Trapping specific OS signals misses edge cases. If a script successfully completes all its tasks, it doesn't receive a `SIGTERM`; it simply ends. Therefore, a `SIGTERM` trap wouldn't fire, leaving temporary files behind. The `EXIT` pseudo-signal is natively triggered by Bash upon _any_ termination event—whether it's a successful natural end, a script crash, or an external `kill` signal—guaranteeing universal, reliable execution of the cleanup block.
- _Query:_ A user executes `kill -9` against a bash script. Will the script's configured `trap cleanup SIGTERM EXIT` trigger? Why or why not?
  - _A:_ No, the cleanup trap will not trigger. `kill -9` issues the `SIGKILL` signal. The Linux kernel's process scheduler intercepts `SIGKILL` and instantly destroys the application's memory allocation and thread context. The target application (the Bash script) is completely bypassed; it receives no warning and has absolutely no mechanical opportunity to execute its trap handler.

## Practice Problems

- _Problem:_ Ensure that a highly sensitive configuration script ignores the user pressing `Ctrl+C` entirely, forcing the script to run to completion regardless of terminal interrupts.
  - _Hint:_ Bind the exact interrupt signal to an empty payload string.
  - _Solution:_ `trap '' SIGINT` (The empty string overwrites the default shutdown behavior with a null operation, rendering the script immune to keyboard interrupts).
- _Problem:_ Write a robust sequence that creates a temporary directory using `mktemp -d`, and registers a trap to forcefully and recursively delete that specific directory the moment the script exits, regardless of success or failure. Use single quotes to defer expansion.
  - _Hint:_ Declare the variable, then define an `EXIT` trap calling a dedicated cleanup function or a carefully quoted inline command.
  - _Solution:_ `TEMP_DIR=$(mktemp -d); trap 'rm -rf "$TEMP_DIR"' EXIT` (This perfectly structures safe, self-cleaning automation, deferring variable expansion until termination).

## References

- [Bash Reference Manual - Bourne Shell Builtins (trap)](https://www.gnu.org/software/bash/manual/bash.html#Bourne-Shell-Builtins)
- [Greg's Wiki (BashFAQ) - How do I clean up temporary files?](https://mywiki.wooledge.org/SignalTrap)
