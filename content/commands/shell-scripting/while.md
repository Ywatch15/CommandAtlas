---
slug: while
name: while
aliases: []
category: shell-scripting
tags: [bash, shell, loops, control-flow, execution]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'loop continuously bash'
  - 'read file line by line linux'
  - 'bash while loop condition'
  - 'infinite loop shell script'
  - 'wait for command to succeed bash'
relatedCommands: [for, read, test]
alternatives: [for]
status: draft
---

## What is it?

`while` is a fundamental POSIX shell control-flow construct that repeatedly executes a block of commands as long as a specified control condition evaluates to true (exit status `0`). It provides the core mechanism for indefinite iteration, polling loops, and streaming text data processing inside shell scripts.

## Why does it exist?

Sequential script execution is insufficient for complex automation. Operations like reading a 10,000-line text file, waiting for a remote server to reboot and accept SSH connections, or running a continuous background daemon require dynamic, repetitive logic. `while` exists to introduce this conditional looping capability, allowing scripts to evaluate the exit code of _any_ Linux binary or internal shell test interactively, halting or repeating execution based entirely on dynamic system state.

## Syntax

```bash
while [CONDITION_COMMAND]; do
    [COMMANDS]
done
```

## Flags

| Operator        | Description                                                                                           | Example                             |
| --------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `[ ]` / `[[ ]]` | The standard `test` commands used to evaluate string, math, or file conditions.                       | `while [[ $count -lt 10 ]]; do`     |
| `read`          | Shell built-in used inside the condition to parse piped strings or files line-by-line.                | `while IFS= read -r line; do`       |
| `true`          | Standard binary that always returns exit code `0`, creating an infinite loop.                         | `while true; do`                    |
| `false`         | Standard binary that always returns exit code `1`, breaking loops instantly.                          | `while false; do`                   |
| `break`         | Intercepts execution and forces an immediate exit from the entire loop entirely.                      | `[[ -z "$data" ]] && break`         |
| `continue`      | Intercepts execution, skips the rest of the current iteration, and jumps back to the top of the loop. | `[[ "$line" == "#"* ]] && continue` |
| `< file`        | I/O Redirection applied at the `done` statement to feed a file directly into the loop.                | `done < input.txt`                  |
| `> file`        | I/O Redirection applied at the `done` statement to dump all loop output to a file.                    | `done > output.log`                 |

_(Note: `while` is a shell keyword, not a binary executable. It possesses no hyphenated command-line flags. Its behavior is dictated entirely by the condition command and internal loop control operators like `break` and `continue`.)_

## Examples

```bash
count=1
while [[ $count -le 5 ]]; do
    echo "Iteration $count"
    ((count++))
done
```

> This is a standard bounded counter. The `while` loop checks the math expression (`-le 5`) using double brackets. It executes the payload, increments the variable, and loops. Once the variable hits 6, the evaluation returns `1` (False), and the loop terminates gracefully.

```bash
while IFS= read -r user; do
    echo "Provisioning account: $user"
done < users.txt
```

> This is the definitive architecture for parsing files in Bash. The `read` command serves as the condition. It pulls one line from `users.txt` per iteration. When it hits the absolute end of the file (EOF), `read` returns a non-zero exit status, which signals the `while` loop to terminate perfectly.

```bash
while ! curl -s [http://api.internal/health](http://api.internal/health) > /dev/null; do
    echo "Waiting for API to boot..."
    sleep 2
done
echo "API is online!"
```

> This creates a blocking wait-state polling loop. The exclamation point (`!`) inverts the exit status. The loop executes `curl`. If `curl` fails (returns `7` or `52`), the inversion makes the condition `True` (0), so the loop sleeps and repeats. The instant `curl` successfully hits the API (returns `0`), the inversion makes it `False`, instantly breaking the loop so the script can proceed.

```bash
while true; do
    nc -l -p 8080 -e /bin/bash
done
```

> This utilizes the `true` binary to create an infinite, unbreakable execution loop. Security engineers use this to establish persistent listeners. If a client connects and then drops the connection, the `nc` command ends, but the infinite loop instantly restarts the listener, ensuring the backdoor remains open.

```bash
while read -r line; do
    [[ "$line" == "#"* ]] && continue
    echo "Processing config: $line"
done < config.ini
```

> This leverages the `continue` operator. As the loop reads the configuration file, it evaluates if the line begins with a hash (`#`). If it does, `continue` executes, skipping the `echo` command entirely and jumping straight back to the top of the loop to read the next line, elegantly filtering out comments.

## Real-World Scenarios

**Building Command-Line Argument Parsers**

```bash
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force) FORCE=1; shift ;;
        --user)  USER="$2"; shift 2 ;;
        *) break ;;
    esac
done
```

> The `while` loop is the foundational engine for parsing CLI inputs. It continuously evaluates the `$#` variable (argument count). Combined with `shift`, the loop consumes user flags dynamically from left to right until the array is completely exhausted.

**Tailing Logs and Triggering Automated Responses**

```bash
tail -f /var/log/syslog | while read -r log_entry; do
    if [[ "$log_entry" =~ "OOMKilled" ]]; then
        curl -X POST -d '{"text": "Memory crash detected!"}' $SLACK_WEBHOOK
    fi
done
```

> Observability automation relies on infinite pipeline loops. The `tail -f` command streams data infinitely into the `while` loop. The loop evaluates every single line in real-time, executing an API payload the absolute millisecond a specific string match (like an Out-Of-Memory kill) traverses the stream.

## When should it NOT be used?

- **Iterating over an explicit, static array of items:** **Reason:** Utilizing a `while` loop with a manual counter to read an array is unnecessarily verbose and prone to off-by-one errors. **Use instead:** A `for` loop (`for item in "${ARRAY[@]}"; do`).
- **Heavy text manipulation across millions of lines:** **Reason:** Using `while read` in Bash invokes the slow shell interpreter for every single line of a file. It is catastrophically slow compared to C-compiled binaries. **Use instead:** `awk` or `sed`, which process massive files in fractions of a second.

## Alternatives

- **`for` loop:** Definite iteration. **Tradeoff:** `for` loops iterate over a predefined list (e.g., `for i in *.jpg`), executing exactly that many times. `while` loops are indefinite, executing based on dynamic, unpredictable conditions (like waiting for a network port to open).
- **`until` loop:** Inverse evaluation. **Tradeoff:** `until` executes as long as a condition is _false_, stopping when it becomes _true_. It is the exact logical opposite of `while`, but is rarely used because `while ! [condition]` is generally more readable.
- **`xargs`:** Pipeline parallelization. **Tradeoff:** If the goal is simply to run a command against every line of text, `xargs` executes drastically faster than a `while` loop and supports parallel threading (`-P`), but lacks the ability to execute complex, multi-line conditional logic.

## How it works internally

`while` is a shell compound command. It relies completely on the fundamental UNIX design principle of **Exit Status Codes**.

When the shell encounters the `while` keyword, it executes the command provided in the condition block (e.g., `[ -f file ]` or `curl`). It waits for that command to finish and inspects its resulting integer exit status (stored invisibly in the `$?` register).

If the exit status is `0` (POSIX standard for success/True), the shell moves the execution cursor inside the `do ... done` block and executes the payload commands sequentially. Once it reaches `done`, the execution cursor jumps back to the very top and re-executes the condition command.

If the condition command returns any non-zero value (e.g., `1` for false, `127` for command not found), the shell immediately bypasses the `do ... done` block and moves the execution cursor to the exact line of code following the `done` statement. This architecture makes `while` incredibly versatile, as it can evaluate the output of any external binary on the entire operating system, not just internal math expressions.

## Performance Notes

- **The Subshell Pipeline Penalty:** Writing `cat file.txt | while read line; do VAR=1; done` forces the entire `while` loop to execute inside an isolated subshell environment. This severely degrades performance and guarantees that the `VAR` variable is permanently destroyed the moment the loop finishes. _Always_ use file redirection (`done < file.txt`) to maintain memory integrity and maximize speed.
- **CPU Starvation:** An empty or misconfigured `while true; do` loop lacking a blocking command or `sleep` delay will "spin-wait," executing thousands of times a millisecond and pinning a CPU core to 100% utilization. Always inject a `sleep` command in polling loops.

## Security Notes

- **Infinite Loop Denials of Service:** If a `while` condition evaluates a dynamic variable that fails to update correctly within the loop (e.g., a counter increment is skipped due to a logic flaw), the loop will run infinitely, locking up CI/CD pipeline agents indefinitely until memory constraints kill the runner. Always implement strict iteration limits or manual timeout counters (`if [[ $i -gt 100 ]]; then break; fi`).

## Common Mistakes

- **Forgetting `IFS=` and `-r` when reading files:** Running `while read line`. **Why it's wrong:** The default `read` behavior strips leading spaces (destroying formatting) and consumes backslashes (destroying file paths). You must use `while IFS= read -r line` to guarantee data integrity.
- **Using `[` instead of `((` for math loops:** Running `while [ $i -lt 10 ]; do i=$[$i+1]; done`. **Why it's wrong:** Relying on the `test` command for intensive math loops is inefficient and archaic. Modern bash scripts should utilize native arithmetic evaluation: `while (( i < 10 )); do ((i++)); done`.
- **Creating accidental infinite loops with external commands:** Writing `while grep "error" log.txt; do echo "Found"; done`. **Why it's wrong:** `grep` scans the file, finds "error", returns 0, and echoes. The loop restarts. `grep` scans the file again, finds the same "error", returns 0, and echoes. It repeats infinitely because the condition never changes.

## Best Practices

- When polling external resources (like waiting for a database to boot), integrate exponential backoff logic or hard iteration ceilings (`((attempts++)); if ((attempts > 30)); then exit 1; fi`) to ensure scripts fail cleanly rather than hanging for days.
- To read output from a dynamic command (rather than a static file) without invoking a destructive pipeline subshell, utilize Process Substitution: `while IFS= read -r line; do ... done < <(ip addr show)`.
- Leverage the `continue` keyword aggressively. Parsing files by placing a `continue` check at the very top of the loop to skip empty lines or comments flattens the execution logic, eliminating the need for deeply nested, unreadable `if/else` pyramids.

## Interview Questions

- _Query:_ A developer writes a script containing `cat data.csv | while read -r line; do TOTAL=$((TOTAL+1)); done; echo "Total: $TOTAL"`. When the script runs, it processes 500 lines perfectly, but the final echo prints "Total: 0". Explain the architectural flaw causing this variable loss and how to correct it.
  - _A:_ The pipe operator (`|`) natively spawns a separate subshell process for the right side of the command. The `while` loop executes entirely within this isolated memory space. The `$TOTAL` variable is successfully incremented to 500 inside the subshell, but the instant the loop concludes, the subshell is destroyed, taking the variable with it. The `echo` command in the parent shell prints its own uninitialized, empty `$TOTAL` variable. To fix this, bypass the pipeline and redirect the file directly into the loop: `while read -r line; do ... done < data.csv`.
- _Query:_ What is the functional execution difference between inserting the `break` command versus the `continue` command inside a `while` loop?
  - _A:_ The `break` command halts execution instantly and violently tears down the entire looping structure; the script moves on to whatever code exists after the `done` statement. The `continue` command only halts the _current iteration_. It skips any remaining code below it, but instantly jumps back to the top of the loop, evaluates the condition, and begins the next iteration sequence.
- _Query:_ When using a `while` loop to wait for a specific network port to open (`while ! nc -z localhost 8080; do sleep 1; done`), why is it critical to include the `sleep 1` command rather than letting the loop run freely?
  - _A:_ Without a `sleep` command, the `while` loop executes a "busy wait" (or spin-wait). It will execute the `nc` binary thousands of times per second. This generates massive I/O interrupts and instantly pins the CPU core to 100% utilization, starving other applications and potentially preventing the very service you are waiting for from receiving the CPU cycles it needs to finish booting.

## Practice Problems

- _Problem:_ Create a blocking loop that continually checks if a file named `lock.tmp` exists. As long as it exists, the script should sleep for 2 seconds. The moment it disappears, the loop should exit cleanly.
  - _Hint:_ Use the file-exists evaluation command as the loop condition, and implement the sleep block.
  - _Solution:_ `while [[ -f "lock.tmp" ]]; do sleep 2; done` (This safely suspends execution while waiting for an external process to release the file lock).
- _Problem:_ Safely read a file named `inventory.txt` line by line, preserving all spacing and backslashes. Inside the loop, if the line contains the exact string `SKIP`, jump immediately to the next line without evaluating any further code in the loop.
  - _Hint:_ Apply the strict file-reading idiom, a regex or glob match evaluation, and the internal loop interruption operator.
  - _Solution:_ `while IFS= read -r line; do [[ "$line" == *"SKIP"* ]] && continue; echo "Processed: $line"; done < inventory.txt` (This flawlessly parses data and utilizes control-flow operators to filter anomalies cleanly).

## References

- [Bash Reference Manual - Looping Constructs](https://www.gnu.org/software/bash/manual/bash.html#Looping-Constructs)
- [Greg's Wiki (BashFAQ) - How can I read a file line by line?](https://mywiki.wooledge.org/BashFAQ/001)
