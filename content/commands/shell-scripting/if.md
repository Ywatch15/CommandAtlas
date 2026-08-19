---
slug: if
name: if
aliases: []
category: shell-scripting
tags: [shell, built-in, bash, scripting, control-flow, conditionals]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'bash if statement'
  - 'conditional execution shell'
  - 'check if file exists bash'
  - 'compare strings in shell script'
  - 'if else shell logic'
relatedCommands: [test, case, expr]
alternatives: [case]
status: draft
---

## What is it?

`if` is the primary conditional execution construct in shell scripting. It evaluates the exit status code (0 for success, non-zero for failure) of a specified command or test expression. Based on that evaluation, it directs the shell to execute a specific block of code, enabling branching logic, error handling, and environment-aware execution pipelines that form the backbone of all automated shell scripts.

## Why does it exist?

Scripts are inherently linear—they execute top-to-bottom. However, systems are dynamic. A deployment script must verify a directory exists before copying files to it; otherwise, the copy command throws errors and corrupts data. `if` exists to introduce logical routing. While administrators could technically chain commands together using logical operators (`cmd1 && cmd2 || cmd3`), doing so for complex, multi-line logic blocks becomes unreadable. The `if` keyword, combined with its `elif` and `else` branches, abstracts the underlying POSIX exit-code evaluation into a structured, readable, and highly maintainable language construct.

## Syntax

```bash
if TEST-COMMANDS; then
    CONSEQUENT-COMMANDS
[elif MORE-TEST-COMMANDS; then
    MORE-CONSEQUENT-COMMANDS]
[else
    ALTERNATE-CONSEQUENT-COMMANDS]
fi
```

## Flags

_Note: `if` relies heavily on test commands. It uses the traditional `[` (the `test` binary) or the modern Bash `[[` keyword. The operators below belong to these test constructs, not `if` itself._

| Operator     | Description                                                                                                          | Example                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `-eq`, `-ne` | Numeric comparison (Equal, Not Equal). Only evaluates integers.                                                      | `if [ "$num" -eq 10 ]; then`              |
| `-lt`, `-gt` | Numeric comparison (Less Than, Greater Than).                                                                        | `if [ "$count" -gt 5 ]; then`             |
| `=`, `!=`    | String comparison (Equal, Not Equal). Requires spaces around the operator.                                           | `if [ "$status" = "active" ]; then`       |
| `=~`         | (Bash `[[ ]]` only) Regular Expression match. Evaluates the left string against the unquoted regex on the right.     | `if [[ "$ip" =~ ^[0-9]+\. ]]; then`       |
| `-z`, `-n`   | String length evaluation. `-z` is true if the string is empty (zero length). `-n` is true if the string has content. | `if [ -z "$password" ]; then`             |
| `-f`, `-d`   | Filesystem evaluation. Returns true if the path exists and is a regular file (`-f`) or a directory (`-d`).           | `if [ -d "/var/log" ]; then`              |
| `-s`         | Filesystem evaluation. Returns true if the file exists and its size is strictly greater than zero bytes.             | `if [ -s "output.txt" ]; then`            |
| `&&`, `\|\|` | (Bash `[[ ]]` only) Logical AND / Logical OR. Combines multiple expressions inside a single test block.              | `if [[ -f "$file" && -s "$file" ]]; then` |
| `!`          | Logical NOT. Inverts the boolean result of the subsequent command or test evaluation.                                | `if ! grep -q "ERROR" log.txt; then`      |

## Examples

```bash
if [ "$USER" = "root" ]; then
    echo "Executing administrative tasks."
else
    echo "Permission denied."
    exit 1
fi
```

> The standard string comparison routing. It evaluates the `$USER` variable against a string literal. If it matches, the primary block executes; if not, it falls back to the `else` block, preventing unprivileged execution.

```bash
if grep -q "panic" /var/log/syslog; then
    systemctl restart myapp
fi
```

> Direct command evaluation. The `if` statement does not require brackets. It executes the `grep` command. The `-q` (quiet) flag suppresses terminal output. `grep` returns an exit code of `0` if it finds the word "panic", which `if` interprets as "true", immediately executing the restart command.

```bash
if [[ -f "/tmp/lock" && "$(stat -c %Y /tmp/lock)" -lt "$(( $(date +%s) - 3600 ))" ]]; then
    rm /tmp/lock
fi
```

> Modern Bash extended testing. The double brackets `[[` allow the use of the `&&` operator directly inside the evaluation block. This checks if a lockfile exists AND if its modification timestamp is older than one hour, safely cleaning up stale locks.

```bash
if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$ ]]; then
    echo "Valid email syntax."
fi
```

> Advanced pattern matching. Using the `=~` operator exclusively available in the `[[` construct, the shell bypasses `grep` and evaluates the string directly against a POSIX regular expression engine loaded into kernel memory.

## Real-World Scenarios

**Idempotent Directory Provisioning**

```bash
CONFIG_DIR="/etc/myapp/conf.d"
if [ ! -d "$CONFIG_DIR" ]; then
    mkdir -p "$CONFIG_DIR"
    chown root:appgroup "$CONFIG_DIR"
    chmod 750 "$CONFIG_DIR"
fi
```

> Infrastructure automation scripts must be idempotent (safe to run multiple times). Using the logical NOT operator (`!`) combined with the directory check (`-d`), the script verifies the absence of the folder. If missing, it provisions it. If present, it skips the block, preventing `mkdir` from throwing fatal "File exists" errors that break deployment pipelines.

## When should it NOT be used?

- **Short, Single-Command Execution:** If you only need to run a command based on the success of another, an `if` block is verbose. Do not write `if [ -d /tmp ]; then rm -rf /tmp/*; fi`. Use logical operators instead: `[ -d /tmp ] && rm -rf /tmp/*`.
- **Checking 10+ String Matches:** If evaluating a single variable against numerous specific strings (e.g., matching OS types or command-line flags), a massive chain of `if-elif-else` statements is computationally slower and heavily unreadable. Always use a `case` statement.

## Alternatives

- **Logical Operators (`&&`, `||`):** **Best for inline brevity.** Executes the right-hand command strictly based on the exit code of the left-hand command.
- **`case`:** **Best for multi-path routing.** Highly optimized for evaluating a single string against a large dictionary of potential patterns.

## How it works internally

`if` is a shell reserved keyword. When the shell's Abstract Syntax Tree (AST) parser encounters it, it triggers conditional execution logic.

The crucial architectural detail is that `if` **only understands process exit codes**. When you write `if [ -f "file.txt" ]; then`, the shell doesn't interpret the brackets natively. The `[` is actually a symlink to an executable binary (usually `/usr/bin/test` or a shell built-in matching it).

The shell spawns the `[` command, passing `-f` and `file.txt` as arguments in the `argv` array. The `test` command evaluates the filesystem and calls the `exit(0)` system call if the file exists, or `exit(1)` if it does not.

The shell captures this integer. The `if` keyword evaluates the integer: if it receives `0` (POSIX success), it routes execution to the `then` AST node. If it receives any non-zero integer, it jumps over the `then` block and searches the AST for an `elif`, `else`, or the terminating `fi` node.

Modern bash scripting prefers `[[` (double brackets). `[[` is not a binary; it is a shell keyword. Because it doesn't invoke `/usr/bin/test`, it doesn't perform word splitting or pathname expansion on the variables inside it, making it vastly safer and more performant for complex evaluations.

## Performance Notes

- **Single Bracket Forking:** In purely strict POSIX `/bin/sh` scripts using external `/usr/bin/[` binaries, every `if` evaluation triggers a `fork()` and `execve()` system call. In tight loops, this causes massive CPU thrashing. Modern Bash heavily optimizes this by interpreting `[` and `[[` as internal built-ins, executing the logic natively in RAM.

## Security Notes

- **Unquoted Variables in Single Brackets:** If a script uses `if [ $VAR = "admin" ]`, and an attacker manipulates the variable to contain spaces (e.g., `VAR="admin bypass"`), the shell performs word splitting before passing the arguments to the `test` command. The command receives 4 arguments instead of 3, resulting in a `too many arguments` syntax error, potentially crashing the script and bypassing subsequent security checks. **Always quote variables:** `if [ "$VAR" = "admin" ]`, or strictly use double brackets `if [[ $VAR == "admin" ]]`, which suppress word splitting.

## Common Mistakes

- **Using `=` for numeric comparisons**
  - _Mistake:_ `if [ "$NUM" = 10 ]; then`
  - _Why:_ The `=` operator performs a lexicographical string comparison. If `$NUM` happens to contain padding (e.g., ` 10`), the strings do not match perfectly, and the evaluation fails. To evaluate the mathematical integer value, you must use the `-eq` numeric operator: `if [ "$NUM" -eq 10 ]; then`.
- **Forgetting spaces around brackets**
  - _Mistake:_ `if ["$A" == "$B"]; then`
  - _Why:_ The shell treats `[` as a command. If there is no space, the shell attempts to execute a binary literally named `["$A"`, which doesn't exist, throwing a `command not found` error. You must space the arguments perfectly: `if [ "$A" == "$B" ]; then`.

## Best Practices

- **Enforce Double Brackets (`[[ ]]`):** Unless you are explicitly writing scripts for legacy Solaris machines or constrained Alpine Linux `/bin/sh` containers, permanently abandon `[ ]`. The modern `[[ ]]` keyword prevents word splitting bugs, supports unquoted variables, enables `&&` and `||` logic, and unlocks `=~` regex parsing, making it unequivocally superior for robust automation.
- **Leverage Command Exit Codes Directly:** Stop writing `if [ "$(grep error log.txt)" != "" ]`. This forces a subshell to buffer output into memory and execute string comparisons. Write `if grep -q error log.txt; then`. This allows `grep` to terminate instantly upon finding a match, utilizing the exit code directly.

## Interview Questions

**Q: You are reviewing a bash script and see the line `if [[ $COUNT > 5 ]]; then`. The script executes without syntax errors, but the logic behaves erratically when `$COUNT` reaches 10. What is fundamentally wrong with this evaluation?**
**A:** The script is using the `>` operator inside double brackets, which executes an alphabetical (lexicographical) string comparison, not a mathematical evaluation. Because the character '1' comes before the character '5' in the ASCII table, the string "10" is evaluated as being "less than" the string "5", causing the condition to fail. To perform mathematical comparison, the operator must be changed to the numeric `-gt` (greater than) flag: `if [[ $COUNT -gt 5 ]]; then`.

**Q: Explain the exact architectural reason why placing the `!` operator before a command (e.g., `if ! mkdir /data; then`) allows the shell to reverse the logical execution path.**
**A:** The `if` keyword evaluates the exit status code of a process. A successful command returns a `0` exit code, which `if` considers "true". A failing command returns a non-zero exit code (e.g., `1`), which `if` considers "false". The `!` (Logical NOT) is a shell pipeline operator. It intercepts the exit code returned by the command. If it receives a `0`, it converts it to a `1`. If it receives a `1`, it converts it to a `0`. The `if` statement then evaluates this flipped integer, successfully routing the execution down the alternate path.

## Practice Problems

**Problem:** You are writing an initialization script. You need to verify if the file `/opt/app/config.json` exists AND that it is not completely empty (i.e., its size is strictly greater than zero bytes). Write the modern Bash `if` statement using double brackets to evaluate both filesystem conditions simultaneously.
**Hint:** Use the flag for regular files and the flag for non-zero size, combined with the logical AND operator inside the brackets.
**Solution:**

```bash
if [[ -f "/opt/app/config.json" && -s "/opt/app/config.json" ]]; then
```

**Problem:** You have a variable `$STATUS`. You need to check if the variable is completely empty (zero length). Write the standard POSIX-compliant single-bracket `if` statement to evaluate this, ensuring the variable is safely quoted.
**Hint:** Use the specific flag designed to check for zero-length strings.
**Solution:**

```bash
if [ -z "$STATUS" ]; then
```

## References

- [Bash Reference Manual: Conditional Constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)
- [Advanced Bash-Scripting Guide: Test Constructs](https://tldp.org/LDP/abs/html/testconstructs.html)
