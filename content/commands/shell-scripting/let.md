---
slug: let
name: let
aliases: []
category: shell-scripting
tags: [shell, built-in, bash, math, arithmetic, variables]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh]
intentPhrases:
  - 'perform math in bash script'
  - 'increment variable shell'
  - 'evaluate arithmetic expression bash'
  - 'add numbers linux shell'
  - 'bitwise operations bash'
relatedCommands: [expr, awk]
alternatives: [expr]
status: draft
---

## What is it?

`let` is a built-in shell command in Bash and Zsh utilized to evaluate arithmetic expressions dynamically. It enables variables to undergo complex mathematical and bitwise operations—such as incrementing, modulo division, and exponentiation—converting the shell's default string-based text into strictly evaluated integers directly within the kernel's memory space, bypassing the need for external binaries like `expr`.

## Why does it exist?

The Bourne shell (`sh`) treated all variables exclusively as text strings. Performing math meant spawning the external C-compiled `/usr/bin/expr` binary, which was computationally devastating for tight loops due to constant `fork()` and `execve()` overhead. As Bash evolved to support robust programming paradigms, `let` was introduced to provide an internal, native mathematical parser. It allows developers to write clean, C-style syntax (like `let count++` or `let a=b+c`) that executes instantaneously in the shell's active memory pool, facilitating high-speed loops, counters, and capacity calculations.

## Syntax

```bash
let arg [arg ...]
```

## Flags

_Note: `let` does not accept dashed command-line flags. Its behavior is dictated entirely by standard C-style arithmetic operators passed within the argument string._

| Operator                     | Description                                                                                                    | Example                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `++`, `--`                   | Pre/Post-increment and decrement. Adds or subtracts 1 from the specified variable.                             | `let count++`                 |
| `+`, `-`, `*`, `/`, `%`      | Standard arithmetic operators (Addition, Subtraction, Multiplication, Integer Division, Modulo).               | `let "a = 5 % 2"`             |
| `**`                         | Exponentiation (Power). Raises a number to the power of another.                                               | `let "bytes = 2 ** 10"`       |
| `+=`, `-=`, `*=`, `/=`, `%=` | Assignment operators. Performs the math operation and assigns the result directly back to the target variable. | `let total+=50`               |
| `<<`, `>>`                   | Bitwise left shift and right shift. Highly efficient for binary multiplication/division.                       | `let "mask = 1 << 8"`         |
| `&`, `\|`, `^`, `~`          | Bitwise AND, OR, Exclusive OR (XOR), and NOT operators for binary manipulation.                                | `let "flag = val & 15"`       |
| `==`, `!=`, `<`, `>`         | Comparative operators. Returns `1` if true, `0` if false (not to be confused with shell exit codes).           | `let "is_max = count == 100"` |

## Examples

```bash
let a=5+4
```

> The most basic calculation. It evaluates `5+4` and assigns the integer `9` to the variable `a`. Notice the strict absence of spaces around the equals sign and operators. If spaces are used without quotes, the command will fail.

```bash
let "total = price * quantity"
```

> Advanced evaluation using quotes. By wrapping the entire expression in double quotes, the developer can freely use spaces for readability. Crucially, inside a `let` statement, variable prefixes (`$`) are completely optional; the parser automatically recognizes `price` and `quantity` as shell variables and extracts their integer values.

```bash
let i++
```

> The canonical loop incrementer. Used relentlessly inside `while` and `until` loops. It takes the variable `i`, evaluates it as an integer, adds `1`, and assigns it back to `i` in a single, hyper-optimized operation.

```bash
let "kb = 1024" "mb = kb * 1024" "gb = mb * 1024"
```

> Sequential multi-argument evaluation. `let` can accept multiple distinct expression arguments separated by spaces. It evaluates them in sequence from left to right, allowing complex cascading variable definitions on a single line.

## Real-World Scenarios

**Calculating Pagination Offsets**

```bash
PAGE_SIZE=50
CURRENT_PAGE=3
let "OFFSET = (CURRENT_PAGE - 1) * PAGE_SIZE"
```

> When writing a shell script that pulls massive JSON payloads from a REST API via `curl`, the script must calculate query offsets dynamically. `let` handles the order of operations (parentheses) cleanly, establishing the correct memory boundary before making the HTTP request.

**Exponential Backoff Retries**

```bash
RETRY_COUNT=0
MAX_DELAY=60
while [ $RETRY_COUNT -lt 5 ]; do
    curl -f [http://api.service.com](http://api.service.com) && break
    let "DELAY = 2 ** RETRY_COUNT"
    sleep $DELAY
    let RETRY_COUNT++
done
```

> High-resiliency networking scripts cannot simply spam failing servers. By using `let` with the exponentiation operator (`**`), the script implements a perfect exponential backoff algorithm. The sleep delay dynamically expands from 1, to 2, to 4, to 8 seconds upon successive failures, drastically reducing network congestion.

## When should it NOT be used?

- **Floating-Point Mathematics:** **Do not use `let` for decimals.** Bash natively possesses absolutely zero concept of floating-point numbers. If you run `let "val = 5 / 2"`, the result is strictly `2`. If you need precision (e.g., `2.5`), you must pipe strings to an external calculator like `bc` or `awk`.
- **Command Substitution Assignments:** If you need to print a mathematical result inline (e.g., `echo "The total is $(let a=5+5)"`), it will fail because `let` assigns variables, it does not print to `stdout`. You must use the modern `echo "The total is $(( 5 + 5 ))"`.

## Alternatives

- **`$(( ... ))` (Arithmetic Expansion):** **Best for modern scripting.** This is the POSIX-compliant evolution of `let`. It executes identical internal C-math logic but returns the output as a string replacement, allowing it to be used dynamically inside `echo` statements or arrays without requiring intermediary variable assignments.
- **`(( ... ))` (Arithmetic Evaluation):** **Best for logic conditions.** A modern construct that completely replaces the `let` keyword (e.g., writing `(( count++ ))` instead of `let count++`). It is visually cleaner and less prone to quoting errors.

## How it works internally

When the Bash parser encounters the `let` keyword, it triggers the shell's internal arithmetic evaluator (the same engine utilized by `$(( ))`).

The evaluator processes the arguments as C-language expressions. It attempts to parse strings as `long` integers (typically 64-bit on modern systems). If it encounters a string that isn't a number (like the word `count`), it checks the shell's symbol table to see if a variable by that name exists. If it exists, it extracts its value. If it does not exist, or the string is completely empty, the evaluator defaults the value to `0`.

The evaluator strictly adheres to standard C operator precedence (e.g., multiplication before addition). Once the mathematical evaluation is complete, the resulting 64-bit integer is converted back into an ASCII string and injected back into the shell's variable hash table under the specified assignment name.

Crucially, `let` intercepts the return code. If the final mathematical evaluation results in the integer `0` (e.g., `let "x = 5 - 5"`), the `let` command exits with a failure status code of `1`. If the math results in any non-zero integer, it exits with a success status code of `0`.

## Performance Notes

- **Base Radix Expansion:** `let` natively understands numerical bases. Evaluating `let "val = 8#10"` correctly interprets the `10` as an octal value, returning the decimal `8`. Prefixing numbers with `0x` parses them as Hexadecimal, enabling incredibly fast bitwise and hex conversions without shelling out to `printf`.

## Security Notes

- **Arbitrary Execution Injection:** `let` attempts to recursively evaluate strings as variables. If a script accepts unsanitized user input and passes it to `let` (e.g., `let "val = $USER_INPUT"`), an attacker passing `a=0; rm -rf /` can theoretically trigger severe code injection vulnerabilities depending on the shell context. Always sanitize inputs before exposing them to arithmetic evaluation.

## Common Mistakes

- **Quoting and Spacing errors**
  - _Mistake:_ Writing `let a = 5 + 5`.
  - _Why:_ The shell splits arguments by spaces. It parses this as `let` receiving the arguments `a`, `=`, `5`, `+`, `5`. Because `a` is not a valid expression on its own, it fails. You must eliminate all spaces (`let a=5+5`) or aggressively quote the entire expression (`let "a = 5 + 5"`).
- **Misinterpreting the Exit Code**
  - _Mistake:_ Using `set -e` (exit on error) at the top of a script, then running `let count=0`, and wondering why the entire script crashes and dies instantly.
  - _Why:_ If the mathematical result of a `let` expression is exactly zero, `let` throws an exit code of `1` (Failure). Because `set -e` forces scripts to abort on any `1` exit code, the script suicides. If initializing counters under `set -e`, always use standard assignment (`count=0`) instead of `let`.

## Best Practices

- **Migrate to `(( ))`:** While `let` is perfectly functional, the modern Bash community heavily prefers the `(( expression ))` syntax. It explicitly demarcates mathematical zones, eliminates the need for aggressive double-quoting, and is generally more robust against whitespace parsing errors.
- **Omit the Dollar Signs:** Inside a `let` block or `(( ))` block, variables do not need `$`. Writing `let "total = cost + tax"` is parsed faster and is vastly more readable than `let "total = $cost +$tax"`.

## Interview Questions

**Q: A bash script operates under `set -e` (abort on error). The script executes the line `let "remaining_retries = 3 - 3"`. The script instantly crashes and exits. Explain the architectural reason behind this crash.**
**A:** The `let` built-in command evaluates mathematical expressions. By design, if the final result of the evaluated expression is the integer `0`, `let` returns a POSIX exit status code of `1` (Failure). Because the script is running under `set -e`, the shell detects this non-zero exit code and interprets it as a fatal error, terminating the script immediately.

**Q: In Bash, what is the functional difference between `let x=5/2` and `x=$(echo "scale=1; 5/2" | bc)`?**
**A:** The `let` command utilizes the shell's internal arithmetic engine, which strictly supports only integer mathematics. `let x=5/2` drops the remainder and assigns the integer `2` to `x`, but executes instantaneously. The `bc` pipeline routes the string to an external binary that supports floating-point math. It correctly calculates the precision, outputting `2.5`, but incurs a heavy performance penalty because it requires forking a child process.

## Practice Problems

**Problem:** You are maintaining an old bash script. You need to assign the variable `TOTAL` to be the result of the variable `base` multiplied by `100`, plus the variable `offset`. Write this mathematical evaluation using the `let` keyword and ensure spaces are used for readability.
**Hint:** Use double quotes to safely encapsulate the spaces and mathematical operators. Dollar signs are optional.
**Solution:**

```bash
let "TOTAL = (base * 100) + offset"
```

**Problem:** A script uses a variable named `failure_count`. Write the shortest, most idiomatic `let` command to increment this variable's value by exactly 1.
**Hint:** Use the C-style post-increment operator. No spaces are needed.
**Solution:**

```bash
let failure_count++
```

## References

- [Bash Reference Manual: Shell Arithmetic](https://www.gnu.org/software/bash/manual/html_node/Shell-Arithmetic.html)
- [Advanced Bash-Scripting Guide: Arithmetic Operations](https://tldp.org/LDP/abs/html/arithexp.html)
