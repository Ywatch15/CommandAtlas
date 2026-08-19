---
slug: expr
name: expr
aliases: []
category: shell-scripting
tags: [shell, calculation, strings, math, legacy, POSIX]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'evaluate math expression shell'
  - 'calculate string length bash'
  - 'extract substring unix'
  - 'add numbers in shell script'
  - 'posIX integer math'
relatedCommands: [let, awk, test]
alternatives: [let]
status: draft
---

## What is it?

`expr` (evaluate expression) is a POSIX-standard command-line utility used to evaluate mathematical, string, and logical expressions. Before modern shells (like Bash and Zsh) integrated native arithmetic expansions (`$(( ))`), `expr` was the absolute standard for performing integer math, extracting substrings, and evaluating primitive regular expressions inside Unix shell scripts.

## Why does it exist?

In the early days of Unix (specifically the Bourne shell `sh`), the shell possessed absolutely no internal mathematical capabilities. It treated everything as strings. If a script needed to increment a loop counter (`i = i + 1`), the shell was incapable of calculating the result. `expr` was engineered as an external, compiled C binary to bridge this gap. A script would pass strings to `expr`, which would parse them, perform the mathematical or logical C-level computation, and print the resulting string to standard output so the shell could capture it via command substitution `` `expr $i + 1` ``.

## Syntax

```bash
expr EXPRESSION
```

## Flags

_Note: `expr` evaluates arguments sequentially. It relies almost entirely on operators rather than dashed flags._

| Operator                        | Description                                                                                                                       | Example                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `+`, `-`, `*`, `/`, `%`         | Standard arithmetic operators (Addition, Subtraction, Multiplication, Division, Modulo). Asterisks must be escaped.               | `expr 5 \* 3`                 |
| `=`, `!=`, `>`, `<`, `>=`, `<=` | Logical comparison operators. Returns `1` if true, `0` if false. Operators like `<` must be escaped to prevent shell redirection. | `expr 5 \>= 3`                |
| `\|`                            | Logical OR. Returns the first argument if it is neither null nor 0, otherwise returns the second argument. Must be escaped.       | `expr "$VAR" \| "default"`    |
| `\&`                            | Logical AND. Returns the first argument if neither argument is null or 0, otherwise returns 0. Must be escaped.                   | `expr "$A" \& "$B"`           |
| `match STRING REGEX`            | Compares the string against an anchored POSIX regular expression. Returns the matched length or capture group.                    | `expr match "apples" "app.*"` |
| `substr STRING POS LEN`         | Extracts a substring starting at index POS (1-based) for a specific LENgth.                                                       | `expr substr "Ubuntu" 1 4`    |
| `index STRING CHARS`            | Returns the numerical index of the first occurrence of any character from CHARS found in STRING.                                  | `expr index "hello" "o"`      |
| `length STRING`                 | Calculates and returns the total integer length of the specified string.                                                          | `expr length "hello world"`   |

## Examples

```bash
expr 10 + 20
```

> The most basic arithmetic. Calculates the sum and outputs `30`. Note the mandatory spaces between the numbers and the operator.

```bash
COUNT=1
COUNT=$(expr $COUNT + 1)
```

> The classic POSIX loop incrementer. It passes the variable and the literal `1` to `expr`, captures the mathematical output `2` using command substitution, and reassigns it to the variable.

```bash
expr 10 \* 5
```

> Demonstrates mandatory shell escaping. If executed as `expr 10 * 5`, the bash shell evaluates the `*` as a glob and passes a list of all files in the directory to `expr`, causing a syntax error. The backslash (`\*`) forces the shell to pass the literal asterisk to `expr` for multiplication.

```bash
expr substr "LinuxKernel" 1 5
```

> String manipulation. Extracts a substring starting at the 1st character and capturing exactly 5 characters. The output is `Linux`. Note that unlike modern programming arrays, `expr` strings are 1-indexed, not 0-indexed.

```bash
expr match "app-worker-01" "app-.*-\([0-9]*\)"
```

> Advanced regex extraction. The `match` operator anchors the regex to the start of the string. By enclosing `[0-9]*` in escaped parentheses `\(\)`, `expr` changes its behavior from returning the length of the match to outputting the specific captured string payload, returning `01`.

## Real-World Scenarios

**Legacy Script Maintenance**

```sh
#!/bin/sh
TOTAL=$(expr "$1" + "$2")
if [ $(expr "$TOTAL" \> 100) -eq 1 ]; then
    echo "Limit exceeded"
fi
```

> Maintaining scripts targeting highly constrained embedded systems (like OpenWrt routers) or extremely legacy Solaris/AIX hardware where the `/bin/sh` shell is strictly POSIX-compliant. Modern `$(( ))` syntax might fail in these environments, making `expr` the only reliable fallback for integer evaluation.

**Fallback Default Variable Assignment**

```sh
USER_ID=$(expr "$PROVIDED_ID" \| "9999")
```

> Before advanced Bash parameter expansion (`${PROVIDED_ID:-9999}`) existed, engineers used the logical OR operator of `expr`. If `$PROVIDED_ID` is empty or 0, `expr` automatically evaluates and returns the default string `"9999"`.

## When should it NOT be used?

- **Modern Bash/Zsh Scripting:** **Avoid `expr` entirely in modern scripts.** It is obsolete. Arithmetic expansion (`$(( 5 + 5 ))`) is native, thousands of times faster, and doesn't require escaping asterisks. String manipulation should be handled via native parameter expansion (`${string:0:5}`).
- **Floating Point Math:** **`expr` strictly evaluates integers.** If you run `expr 5 / 2`, it will output `2`, discarding the remainder. For floating-point operations, you must pipe strings to `bc` or `awk`.
- **Missing Spaces:** `expr` evaluates discrete arguments. `expr 5+5` passes a single argument, resulting in the literal string `5+5`. You must strictly enforce spaces: `expr 5 + 5`.

## Alternatives

- **`$(( ... ))` (Arithmetic Expansion):** **Best for modern shell math.** Evaluates math natively inside the shell process without spawning external binaries. Supports `+`, `-`, `*`, `/`, `%`, `**`, and logical bitwise operations effortlessly.
- **`bc` (Basic Calculator):** **Best for floating-point math.** An external binary that parses complex mathematical structures and arbitrary-precision decimals (e.g., `echo "scale=2; 5/2" | bc`).
- **`${string:offset:length}`:** **Best for string manipulation.** Native Bash/Zsh parameter expansion that completely deprecates `expr substr`.

## How it works internally

`expr` is a standalone, compiled binary located at `/usr/bin/expr` (managed by GNU Coreutils on Linux).

When you execute `expr 5 + 5`, the shell forks a new process and executes the `expr` binary. The `expr` C program reads the `argv` array passed by the kernel (e.g., `argv[1]="5"`, `argv[2]="+"`, `argv[3]="5"`).

It parses the arguments, looking for recognized operator tokens. Upon finding the `+`, it validates that the surrounding arguments contain only digit characters. It invokes the C standard library `atol()` function (ASCII to Long) to convert the string arrays into physical 64-bit integers in memory. It performs standard C-level addition, converts the resulting integer back to an ASCII string array, and writes it to standard output (`stdout`).

Because it is an external binary, the entire `fork()`, `execve()`, and string-conversion lifecycle must occur for every single evaluation. If placed inside a loop of 10,000 iterations, the kernel must spawn and destroy 10,000 discrete `expr` processes.

## Performance Notes

- **Catastrophic Loop Overhead:** In a benchmark, executing `$(( i = i + 1 ))` 100,000 times natively in Bash takes roughly `0.1` seconds. Executing `i=$(expr$i + 1)` 100,000 times forces 100,000 process forks, taking roughly `30.0` seconds. `expr` is computationally devastating in heavy loops.

## Security Notes

- **Command Injection:** If taking unsanitized user input for string evaluation, `expr` is highly susceptible to shell injection if the variables are not rigorously quoted. `expr $USER_INPUT + 1` where `$USER_INPUT` is `1 ; rm -rf /` will bypass `expr` and execute the destructive command. Always use `expr "$USER_INPUT" + 1`.

## Common Mistakes

- **Forgetting to escape shell metacharacters**
  - _Mistake:_ `expr 5 * 2` or `expr 5 > 2`.
  - _Why:_ The shell evaluates `*` (expand all files) and `>` (redirect output to a file named `2`) before `expr` ever sees the command. The result is a syntax error or a newly created blank file. You must use `expr 5 \* 2` and `expr 5 \> 2`.
- **Not providing spaces**
  - _Mistake:_ `expr "hello":"he"` expecting a regex match.
  - _Why:_ `expr` requires each component to be a distinct argument in the `argv` array. It must be separated by spaces: `expr "hello" : "he"`.

## Best Practices

- **Use exclusively for POSIX `/bin/sh` compliance:** The only time a professional should write `expr` in 2024 is when developing scripts for Alpine Linux (Busybox), embedded systems, or legacy UNIX constraints where Bash extensions are strictly unavailable.
- **Leverage `$?` for boolean logic:** `expr` returns an exit status of `0` if the expression evaluates to non-null/non-zero (true), and `1` if the expression evaluates to null/zero (false). This allows `expr` to be used cleanly in conditional loops: `if expr "$STR" : ".*" >/dev/null; then`.

## Interview Questions

**Q: You write a script containing the command `RESULT=$(expr 10 * 5)`. When you run it, you get a syntax error. What is the fundamental mechanism causing this error, and how do you fix it?**
**A:** The fundamental issue is shell expansion. Before the shell executes the `expr` binary, it parses the command line. It sees the `*` character and interprets it as a filename expansion glob, expanding it to a list of all files in the current directory. `expr` receives a massive, invalid array of file names instead of the multiplication operator. You must fix it by escaping the asterisk from the shell using a backslash: `expr 10 \* 5`.

**Q: Explain the architectural difference and performance impact between evaluating math using `expr` versus `$(( ))` in a Bash script.**
**A:** `expr` is an external compiled binary (`/usr/bin/expr`). Executing it requires the shell to invoke the `fork()` and `execve()` system calls to spawn a completely new child process, perform the math, and return the string, which is heavily CPU-intensive. `$(( ))` is an internal Bash arithmetic expansion construct. The shell evaluates the math directly within its own existing memory space, requiring zero process forks, making it magnitudes faster.

## Practice Problems

**Problem:** You are maintaining an ancient POSIX script. You need to calculate the remainder (modulo) of 15 divided by 4, and store it in a variable named `REMAINDER`. Write the command using `expr`.
**Hint:** Use command substitution and the modulo operator with correct spacing.
**Solution:**

```bash
REMAINDER=$(expr 15 % 4)
```

**Problem:** You have a string `ERROR: Segment Fault` in a variable `$LOG`. Write an `expr` command to extract exactly the first 5 characters from this string to isolate the word "ERROR".
**Hint:** Use the substring operator. Remember `expr` strings are 1-indexed.
**Solution:**

```bash
expr substr "$LOG" 1 5
```

## References

- [expr(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/expr)
- [POSIX Specification for expr](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/expr.html)
