---
slug: bc
name: bc
aliases: [basic calculator]
category: unix
tags: [linux, math, calculation, scripting, arbitrary-precision]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'perform floating point math in bash'
  - 'calculate arbitrary precision numbers'
  - 'convert decimal to hexadecimal bash'
  - 'shell script math with decimals'
  - 'evaluate complex math expressions linux'
relatedCommands: [awk, sed]
alternatives: [awk]
status: draft
---

## What is it?

`bc` (Basic Calculator) is a POSIX-standard, arbitrary-precision calculator language and command-line utility. It provides a highly robust environment for evaluating mathematical expressions—including floating-point arithmetic, variable assignment, looping, and base conversions—that standard shell built-ins (like `expr` or `$(( ))`) are fundamentally incapable of processing.

## Why does it exist?

Native Unix shells (like Bash and sh) possess mathematical evaluation engines strictly limited to integer arithmetic; if a script evaluates `5 / 2`, the shell returns `2`, discarding the fractional remainder. This limitation makes shell scripts useless for financial calculations, precise percentage monitoring, or complex infrastructure telemetry conversions. `bc` exists to fill this gap. By implementing a Turing-complete, C-like language atop an arbitrary-precision math library, `bc` processes floating-point mathematics natively, enabling administrators to pipeline complex decimal computations directly into their shell automation.

## Syntax

```bash
bc [options] [file...]
echo "expression" | bc [options]
```

## Flags

| Flag                        | Description                                                                                                                   | Example            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `-l`, `--mathlib`           | Loads the standard math library and implicitly sets the default floating-point `scale` (decimal places) to 20 instead of 0.   | `echo "s(1)"       | bc -l` |
| `-q`, `--quiet`             | Suppresses the verbose GNU licensing and version banner printed when `bc` starts in interactive mode.                         | `bc -q`            |
| `-i`, `--interactive`       | Forces interactive mode, bypassing batch execution constraints even when standard input is not a terminal.                    | `bc -i`            |
| `-w`, `--warn`              | Outputs warnings for extensions provided by POSIX `bc` but not found in traditional UNIX `bc`.                                | `bc -w script.bc`  |
| `-s`, `--standard`          | Enforces strict POSIX compliance. `bc` will reject and throw fatal errors for any GNU extensions (like `read()`).             | `bc -s script.bc`  |
| `-h`, `--help`              | Prints usage information and exits.                                                                                           | `bc -h`            |
| `-v`, `--version`           | Prints the version and copyright information and exits.                                                                       | `bc -v`            |
| `-c`, `--compile`           | Compiles the `bc` code into an intermediate, internal bytecode without actually executing it (used for debugging the parser). | `bc -c math.bc`    |
| `-e <expr>`, `--expression` | (GNU bc 1.07+) Directly evaluates the provided expression from the command line without requiring a pipe.                     | `bc -e "5 / 2"`    |
| `-f <file>`, `--file`       | (GNU bc 1.07+) Evaluates a specific file and continues. Useful alongside `-e`.                                                | `bc -f formula.bc` |

## Examples

```bash
echo "scale=2; 5 / 2" | bc
```

> The standard floating-point pipeline. By setting the `scale` variable to `2` before the calculation, `bc` is instructed to calculate and preserve exactly two decimal places, returning `2.50` instead of the integer `2`.

```bash
echo "obase=16; ibase=10; 255" | bc
```

> Base conversion. `bc` natively converts between numerical bases. This command sets the input base (`ibase`) to 10 (decimal) and the output base (`obase`) to 16 (hexadecimal). It evaluates the decimal number `255` and outputs `FF`.

```bash
echo "2^100" | bc
```

> Arbitrary precision. Standard 64-bit shell integers overflow at `2^63`. `bc` has no such limit; it mathematically calculates two to the power of 100 and flawlessly prints the 31-digit resultant integer.

```bash
bc -l <<< "s(3.14159/2)"
```

> Utilizing the standard math library. The `-l` flag loads advanced trigonometric functions. The `s()` function computes the sine of the provided radians, utilizing here-strings (`<<<`) instead of a `echo` pipe for cleaner bash execution.

```bash
# Inside script.sh
FREE_RAM=4096
TOTAL_RAM=16384
PERCENT=$(echo "scale=4; ($FREE_RAM / $TOTAL_RAM) * 100" | bc)
```

> System telemetry calculations. A bash script calculates the percentage of free RAM. Because Bash drops floating-point data, the variables are securely piped into `bc`, executing the division and multiplication, returning `25.0000`.

## Real-World Scenarios

**Dynamic Auto-Scaling Thresholds**

```bash
LOAD_AVG=$(cat /proc/loadavg | awk '{print $1}')
if [ $(echo "$LOAD_AVG > 4.5" | bc) -eq 1 ]; then
    echo "High load detected. Scaling cluster."
fi
```

> When writing infrastructure self-healing scripts, system load averages are always floating-point numbers (e.g., `4.15`). Bash's `if [ "$LOAD_AVG" -gt 4 ]` will crash with a syntax error. Piping the logical comparison directly to `bc` bypasses this; `bc` evaluates `4.15 > 4.5`, determines it is false, and outputs `0`, allowing the shell script to parse the boolean integer safely.

**Batch Processing Complex Math Files**

```bash
cat << 'EOF' > formula.bc
scale=4
define f(x) {
    if (x <= 1) return (1);
    return (x * f(x-1));
}
f(5)
EOF
bc -q formula.bc
```

> `bc` is a complete programming language supporting functions, variables, and recursive logic. An administrator writes a raw mathematical script calculating a factorial algorithm (`f(x)`) and executes it cleanly via the CLI, outputting `120.0000`.

## When should it NOT be used?

- **Simple Integer Math:** **Do not use `bc` to increment a loop counter.** If you are simply doing `i = i + 1`, utilizing `i=$(echo "$i + 1" | bc)` spawns a heavy child process on every loop iteration, drastically slowing down the script. Always use native shell arithmetic `$(( i + 1 ))` for integers.
- **Massive Matrix Mathematics:** `bc` evaluates operations linearly and does not support optimized array/matrix algebra (like LAPACK). For data science or heavy statistical processing, `bc` is painfully slow. Use Python with `numpy` or `R`.

## Alternatives

- **`awk 'BEGIN { print 5/2 }'`:** **Best for inline scripting.** `awk` supports floating-point math natively and is often faster to invoke in a bash script because it doesn't require setting the `scale` variable manually to get decimal outputs.
- **`python3 -c "print(5/2)"`:** **Best for complex logic.** If the math involves complex formatting, JSON parsing, or date manipulation alongside the arithmetic, Python's massive standard library completely eclipses `bc`.

## How it works internally

`bc` was historically implemented as a compiler that translated its C-like syntax into DC (Desk Calculator) reverse-polish notation instructions, which were then piped to the `/usr/bin/dc` binary for execution.

Modern GNU `bc` abandons this. It is a standalone C program containing its own lexical analyzer (generated by `flex`) and parser (generated by `bison` or `yacc`).

When you pipe an expression to `bc`, the lexer tokenizes the string into operators, identifiers, and numbers. The parser constructs an Abstract Syntax Tree (AST) and translates the AST into a highly optimized, internal bytecode.

The `bc` virtual machine executes this bytecode. Crucially, `bc` does not use the CPU's native Hardware Floating Point Unit (FPU). Native hardware floats (like IEEE 754 `double`) suffer from precision rounding errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). Instead, `bc` represents every number as a dynamic base-10 or base-100 linked list of integers in memory. It performs addition, multiplication, and division mathematically column-by-column, exactly like humans do on paper. This software-defined math ensures infinite precision, allowing `bc` to calculate a million digits of Pi flawlessly, but renders it orders of magnitude slower than native FPU calculations.

## Performance Notes

- **Subshell Spawning:** The primary performance bottleneck when using `bc` in bash is the constant forking of the `/usr/bin/bc` process. If executed 10,000 times inside a `while` loop, the kernel spends 95% of its time spawning and tearing down processes, and only 5% doing actual math.

## Security Notes

- **Safe Execution Environment:** `bc` is an entirely closed mathematical virtual machine. It lacks the ability to execute shell commands, open network sockets, or alter the filesystem. It is perfectly safe to pass untrusted user input directly into `echo "$INPUT" | bc`, as the worst an attacker can do is trigger a syntax error or a slow, CPU-intensive calculation.

## Common Mistakes

- **Forgetting to set `scale`**
  - _Mistake:_ `echo "10 / 3" | bc` returns `3`.
  - _Why:_ By default, `bc` sets the `scale` variable (the number of decimal places to preserve) to `0`. It performs truncating integer division. You must explicitly set `scale`: `echo "scale=2; 10 / 3" | bc` to retrieve `3.33`.
- **Order of `obase` and `ibase`**
  - _Mistake:_ `echo "obase=16; ibase=16; 10" | bc` returns `10` instead of `16`.
  - _Why:_ Variables are evaluated sequentially. When you set `obase=16`, the output base is Hex. When you then set `ibase=16`, you are setting the input base to the value "16"... but because `obase` is currently Hex, the string `16` is evaluated as Hexadecimal $1 \times 16 + 6 = 22$. You just set the input base to 22. **Always set `ibase` before `obase`** to avoid base-parsing paradoxes.
- **Using `^` for floating-point exponents**
  - _Mistake:_ `echo "2.5 ^ 2.5" | bc`
  - _Why:_ In `bc`, the right-hand side of the exponentiation operator (`^`) must mathematically be an integer. It will silently truncate `2.5` to `2` and calculate `2.5 ^ 2`. To do true floating-point exponentiation, you must load the math library (`-l`) and use logarithms: `e(2.5 * l(2.5))`.

## Best Practices

- **Use the `-l` flag by default:** Cultivate the habit of always calling `bc -l`. Even if you aren't using trigonometric functions, `-l` alters the default `scale` from 0 to 20, immediately resolving the floating-point truncation problem without requiring you to manually type `scale=20;`.

## Interview Questions

**Q: You want to use `bc` to calculate a percentage in a bash script: `echo "50 / 100" | bc`. The output is `0`. Explain why this happens and write the exact command to output `0.50`.**
**A:** `bc` defaults to a `scale` (decimal precision) of 0, meaning it performs strict truncating integer division. Since 50 is less than 100, the result is `0.5`, which truncates to `0`. To fix this, you must instruct `bc` to retain decimal places by setting the scale variable or using the math library flag: `echo "scale=2; 50 / 100" | bc` or `echo "50 / 100" | bc -l`.

**Q: Explain why financial and scientific shell scripts prefer calculating numbers through `bc` rather than shelling out to languages like C or Python to use hardware floating-point operations.**
**A:** Hardware floating-point units (FPU) use IEEE 754 binary fractions, which cannot perfectly represent certain base-10 decimals (like `0.1`), leading to tiny, compounding rounding errors. `bc` uses arbitrary-precision, software-defined base-10 arithmetic. It calculates numbers exactly as a human does on paper, guaranteeing that `0.1 + 0.2` equals exactly `0.3` without any loss of precision, which is absolutely mandatory for strict financial auditing.

## Practice Problems

**Problem:** You are processing hardware MAC addresses in a script. You need to convert the decimal integer `43981` into a raw hexadecimal string using `bc`. Write the command pipeline.
**Hint:** Set the output base to 16 before passing the number.
**Solution:**

```bash
echo "obase=16; 43981" | bc
```

**Problem:** You have a variable `$MEMORY_USED=5000` and `$MEMORY_TOTAL=8000`. You need to divide `USED` by `TOTAL` to find the utilization ratio. You must use `bc`, but you want the command to automatically configure a high decimal precision without you needing to explicitly type out the `scale=` variable. Write the command.
**Hint:** Use the flag that automatically imports the standard math library and sets the scale to 20.
**Solution:**

```bash
echo "$MEMORY_USED / $MEMORY_TOTAL" | bc -l
```

## References

- [bc(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/bc)
- [GNU bc documentation](https://www.gnu.org/software/bc/manual/html_mono/bc.html)
