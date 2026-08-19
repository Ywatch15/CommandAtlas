---
slug: case
name: case
aliases: [switch]
category: shell-scripting
tags: [shell, built-in, bash, scripting, control-flow, logic]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'match string against multiple patterns'
  - 'bash switch statement'
  - 'shell script menu selection'
  - 'conditional pattern matching bash'
  - 'handle multiple conditions in shell'
relatedCommands: [if, getopts]
alternatives: []
status: draft
---

## What is it?

`case` is a shell control-flow keyword that executes a specific block of commands by matching a given string against a series of patterns. It serves as the POSIX shell equivalent of the `switch` statement found in higher-level programming languages, providing a cleaner, more readable, and highly optimized alternative to deeply nested `if-elif-else` chains when evaluating a single variable against multiple potential values.

## Why does it exist?

When a shell script needs to parse user input, evaluate command-line arguments, or route logic based on configuration values, writing ten sequential `if [ "$VAR" = "value" ]` statements is visually noisy and computationally inefficient. `case` exists to streamline this specific branching logic. By leveraging native shell globbing (wildcard matching) rather than invoking external binaries or complex test evaluations, `case` enables developers to map strings to execution blocks rapidly, making it the foundational construct for interactive menus, `init.d` daemon scripts, and argument parsers.

## Syntax

```bash
case WORD in
    PATTERN1)
        COMMANDS
        ;;
    PATTERN2 | PATTERN3)
        COMMANDS
        ;;
    *)
        DEFAULT_COMMANDS
        ;;
esac
```

## Flags

_Note: `case` is a shell keyword, not an external binary. It uses standard shell pattern matching (globbing) operators and specific termination tokens rather than dashed flags._

| Operator / Token | Description                                                                                                                                                        | Example               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `in`             | The mandatory keyword separating the target word from the list of patterns.                                                                                        | `case "$var" in`      |
| `esac`           | The mandatory keyword terminating the `case` block ("case" spelled backwards).                                                                                     | `esac`                |
| `)`              | The mandatory delimiter that closes a pattern definition, signaling the start of the command block.                                                                | `start)`              |
| `\|`             | The logical OR operator. Allows multiple distinct patterns to trigger the exact same command block.                                                                | `start \| run)`       |
| `;;`             | The standard block terminator. Executes the block and instantly exits the entire `case` statement.                                                                 | `echo "Done";;`       |
| `;&`             | (Bash 4.0+) Fall-through terminator. Executes the current block, then seamlessly executes the commands in the _next_ block, ignoring the next block's pattern.     | `echo "A" ;&`         |
| `;;&`            | (Bash 4.0+) Continue-evaluating terminator. Executes the current block, then continues testing the remaining patterns in the `case` statement for further matches. | `echo "A" ;;&`        |
| `*`              | The wildcard glob. Matches zero or more of any character. Commonly used as the final "catch-all" or default pattern.                                               | `*) echo "Unknown";;` |
| `?`              | The single-character glob. Matches exactly one arbitrary character.                                                                                                | `a?c)`                |
| `[...]`          | The character class glob. Matches any single character enclosed within the brackets.                                                                               | `[yY][eE][sS])`       |
| `[!...]`         | The negated character class. Matches any single character _not_ enclosed within the brackets.                                                                      | `[!0-9])`             |

## Examples

```bash
case "$1" in
    start)
        systemctl start nginx
        ;;
    stop)
        systemctl stop nginx
        ;;
    *)
        echo "Usage: $0 {start|stop}"
        exit 1
        ;;
esac
```

> The classic init script router. Evaluates the first positional parameter (`$1`). If it's "start", it boots the server. If "stop", it halts it. The `*` acts as a fail-safe, catching any invalid or missing arguments and printing the help text.

```bash
case "$REPLY" in
    [Yy]|[Yy][Ee][Ss])
        echo "Proceeding with installation..."
        ;;
    [Nn]|[Nn][Oo])
        echo "Aborting."
        exit 0
        ;;
esac
```

> Robust user input parsing. By combining character classes and the logical OR (`|`) operator, this block cleanly accepts "y", "Y", "yes", "YES", or "Yes" as valid confirmations, providing excellent user ergonomics without complex regex.

```bash
case "$filename" in
    *.tar.gz | *.tgz)
        tar -xzf "$filename"
        ;;
    *.zip)
        unzip "$filename"
        ;;
esac
```

> Extension-based routing. The `case` statement utilizes wildcard globs (`*`) to evaluate file extensions dynamically. It routes compressed files to the correct extraction utility based entirely on their string suffixes.

```bash
# Bash 4.0+ Fall-through
case "$LOG_LEVEL" in
    DEBUG) echo "Debug enabled" ;&
    INFO)  echo "Info enabled"  ;&
    WARN)  echo "Warnings only" ;;
esac
```

> Utilizing the `;&` fall-through operator. If `$LOG_LEVEL` is `DEBUG`, the script prints the debug message, falls through to print the info message, and falls through again to print the warning message, compounding the execution sequentially without duplicating code.

```bash
case "$(uname -s)" in
    Linux*)     machine="Linux";;
    Darwin*)    machine="Mac";;
    CYGWIN*)    machine="Cygwin";;
esac
```

> Subshell evaluation. The `case` statement evaluates the stdout of the `uname -s` command directly. This is the canonical method for writing cross-platform bash scripts that dynamically alter their behavior based on the host operating system.

## Real-World Scenarios

**State Machine Implementation**

```bash
STATE="INIT"
while true; do
    case "$STATE" in
        "INIT")
            setup_env
            STATE="FETCH"
            ;;
        "FETCH")
            download_data || STATE="ERROR"
            STATE="PROCESS"
            ;;
        "PROCESS")
            parse_data
            break
            ;;
        "ERROR")
            cleanup_and_exit
            ;;
    esac
done
```

> Complex deployment scripts often require robust state management. By combining a `while` loop with a `case` statement, the engineer builds a deterministic Finite State Machine (FSM). The script transitions cleanly between discrete operational states, providing highly resilient error recovery and step tracking.

**Processing Complex Flags Manually**

```bash
while [ $# -gt 0 ]; do
    case "$1" in
        --force) FORCE=1; shift ;;
        --path=*) PATH_VAL="${1#*=}"; shift ;;
        *) echo "Unknown: $1"; exit 1 ;;
    esac
done
```

> While `getopts` is excellent for short flags (like `-f`), it cannot handle GNU-style long flags (like `--force`). Engineers use a `while` loop and a `case` statement to shift through `$@`. The `--path=*` pattern matches key-value flags, and `${1#*=}` uses parameter expansion to extract the value perfectly.

## When should it NOT be used?

- **Regex Matching:** **Do not use `case` if you need complex Regular Expressions.** `case` uses bash _globbing_ (like `*` and `?`), not POSIX regular expressions. If you need to match `^[A-Z]{3}-[0-9]+$`, `case` cannot help you. You must use `if [[ "$VAR" =~ $REGEX ]]`.
- **Mathematical Comparisons:** **Do not use `case` to evaluate integers.** If you need to check if a number is greater than 100, `case` is strictly evaluating the string characters. Use `if [ "$NUM" -gt 100 ]` or `if (( NUM > 100 ))` for numerical logic.

## Alternatives

- **`if-elif-else`:** **Best for complex, multi-variable conditions.** If your logic evaluates completely different variables on each branch (e.g., `if [ "$A" = 1 ]; then ... elif [ "$B" = 2 ]; then ...`), `case` cannot be used, as `case` only targets a single variable.
- **Associative Arrays (Dictionaries):** **Best for massive key-value lookups.** In Bash 4+, if your `case` statement maps 50 strings to 50 values, declaring an associative array (`declare -A map`) and using `$VAL=${map[$KEY]}` is significantly faster and cleaner.

## How it works internally

In Bash, `case` is a reserved word parsed deeply by the shell's Abstract Syntax Tree (AST) compiler.

When the shell executes a `case` statement, it undergoes a specific sequence:

1.  **Word Expansion:** The shell performs tilde expansion, parameter expansion, command substitution, arithmetic expansion, and quote removal on the target `WORD`. Crucially, it _does not_ perform word splitting or pathname expansion on the target word.
2.  **Pattern Iteration:** The shell iterates through the defined patterns from top to bottom. It expands each pattern using the same rules, but enables pattern matching (globbing).
3.  **String Matching:** The shell uses its internal `fnmatch()` C library implementation (or equivalent) to compare the expanded `WORD` against the expanded `PATTERN`.
4.  **Execution & Termination:** If `fnmatch()` returns a match, the associated command block executes. If the block ends with `;;`, the shell instantly breaks out of the AST node and continues executing the script below `esac`.

Because it relies on the highly optimized internal `fnmatch()` engine rather than forking external binaries like `test` or `[` for every condition, a 20-branch `case` statement evaluates significantly faster than a 20-branch `if-elif` chain in interpreted shell scripts.

## Performance Notes

- **Short-Circuiting:** The `case` statement evaluates sequentially from top to bottom. For maximum performance in highly iterative loops, always place the most statistically probable patterns at the very top of the `case` statement, ensuring the shell hits the short-circuit `;;` terminator as early as possible.

## Security Notes

- **Unquoted Variables:** Unlike `if [ $VAR = "x" ]`, which crashes with a "too many arguments" syntax error if `$VAR` contains spaces, the target word in a `case` statement (`case $VAR in`) does not strictly require quotes to prevent word splitting. However, quoting `"$VAR"` is still fiercely recommended to prevent malicious inputs from accidentally triggering wildcard expansions during the initial evaluation.

## Common Mistakes

- **Forgetting the double semicolons**
  - _Mistake:_ Writing the command block but forgetting to append `;;` at the end.
  - _Why:_ The bash parser expects an explicit terminator. Without `;;`, the shell will throw a syntax error (`syntax error near unexpected token`) and refuse to execute the script entirely.
- **Using regex character classes improperly**
  - _Mistake:_ Using `case "$IP" in [0-9]+\.[0-9]+...`
  - _Why:_ Bash globs do not understand the regex `+` (one or more) or `{3}` (exactly three) quantifiers natively. It treats the `+` as a literal plus sign. To match complex IP structures, you must abandon `case` for `[[ =~ ]]`.

## Best Practices

- **Always include a default `*)` catch-all:** Even if you mathematically guarantee the input will be A or B, always include a `*)` block that explicitly calls `exit 1` or prints a warning. Silent failures are the root cause of the most insidious script bugs.
- **Indent pattern blocks:** Enforce strict indentation. Patterns should be indented one level from `case`, and the commands should be indented one level from the pattern. The `;;` should align with the commands. This maximizes visual readability.

## Interview Questions

**Q: You have a script that checks a log level variable using a `case` statement. You want the `DEBUG` pattern to execute its own commands, and then also execute the commands defined in the `INFO` pattern below it. How do you construct the `case` terminator to achieve this?**
**A:** Instead of using the standard double-semicolon `;;` terminator, you must use the fall-through terminator `;&` (introduced in Bash 4.0). This executes the current block and immediately drops down to execute the commands in the directly adjacent block without evaluating its pattern.

**Q: Explain the technical difference in string matching between `if [[ "$VAR" == *"ERROR"* ]]; then` and `case "$VAR" in *ERROR*)`.**
**A:** Technically, there is no difference in the matching algorithm. Both constructs utilize the shell's internal globbing (pattern matching) engine to achieve the exact same substring match. However, the `case` statement is syntactically cleaner when evaluating the same variable against multiple different substrings sequentially, whereas the `if` statement is better for single evaluations.

## Practice Problems

**Problem:** You are writing an OS detection script. Write a `case` statement that evaluates the string inside the variable `$OS_NAME`. If it is "ubuntu" or "debian", set `$PKG="apt"`. If it is "centos" or "fedora" or "rhel", set `$PKG="dnf"`. If it is anything else, print an error and exit.
**Hint:** Use the logical OR operator inside the pattern definitions, and don't forget the catch-all.
**Solution:**

```bash
case "$OS_NAME" in
    ubuntu | debian)
        PKG="apt"
        ;;
    centos | fedora | rhel)
        PKG="dnf"
        ;;
    *)
        echo "Unsupported OS"
        exit 1
        ;;
esac
```

**Problem:** You want to check if a user input string (`$INPUT`) starts with exactly three numbers. Write a `case` pattern to match this using glob character classes.
**Hint:** Use three separate character brackets followed by a wildcard.
**Solution:**

```bash
case "$INPUT" in
    [0-9][0-9][0-9]*)
        echo "Starts with three digits"
        ;;
esac
```

## References

- [Bash Reference Manual: Conditional Constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)
- [POSIX Specification for case](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_09_04)
