---
slug: test
name: test
aliases:
  - '['
  - '[[ ]]'
category: shell-scripting
tags:
  - bash
  - shell
  - conditions
  - logic
  - file-system
  - evaluation
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - check if file exists bash
  - compare strings shell script
  - bash if statement conditions
  - check if variable is empty
  - evaluate math expression bash
relatedCommands:
  - if
  - while
  - expr
  - return
  - shift
alternatives:
  - expr
status: draft
---

## What is it?

`test` is a fundamental shell utility used to evaluate conditional expressions, checking file types, evaluating string lengths, and comparing numerical values. While technically a standalone binary, it is universally used via its syntactic aliases: the classic single bracket `[ ]` (the POSIX test command) and the modern, heavily optimized double bracket `[[ ]]` (the Bash/Zsh specific conditional keyword).

## Why does it exist?

Shell scripting relies fundamentally on branching logic (`if`, `while`) to automate workflows. However, the `if` statement itself only evaluates the integer exit code of a command; it has no mathematical or file-inspection capabilities. `test` exists to bridge this gap. It provides a vast dictionary of evaluation operators (e.g., "does this file exist?", "is this integer greater than 5?"). It parses these queries and returns an exit code of `0` (Success/True) or `1` (Failure/False), seamlessly driving the shell's control-flow structures.

## Syntax

```bash
test [EXPRESSION]
[ [EXPRESSION] ]
[[ [EXPRESSION] ]]
```

## Flags

| Operator       | Description                                                                                         | Example                 |
| -------------- | --------------------------------------------------------------------------------------------------- | ----------------------- |
| `-f <file>`    | Returns True if the specified path exists and is a regular file.                                    | `[ -f "/etc/passwd" ]`  |
| `-d <dir>`     | Returns True if the specified path exists and is a directory.                                       | `[ -d "/var/log" ]`     |
| `-e <path>`    | Returns True if the specified path exists, regardless of its type (file, dir, link).                | `[ -e "/dev/sda" ]`     |
| `-z <string>`  | Returns True if the length of the string is exactly zero (empty).                                   | `[ -z "$MY_VAR" ]`      |
| `-n <string>`  | Returns True if the length of the string is non-zero (not empty).                                   | `[ -n "$MY_VAR" ]`      |
| `str1 = str2`  | Returns True if the two strings are exactly identical.                                              | `[ "$ENV" = "prod" ]`   |
| `str1 != str2` | Returns True if the two strings do not match.                                                       | `[ "$USER" != "root" ]` |
| `-eq`, `-ne`   | Returns True if integer 1 is mathematically Equal (`-eq`) or Not Equal (`-ne`) to integer 2.        | `[ $COUNT -eq 10 ]`     |
| `-lt`, `-gt`   | Returns True if integer 1 is Less Than (`-lt`) or Greater Than (`-gt`) integer 2.                   | `[ $AGE -gt 18 ]`       |
| `&&`, `        |                                                                                                     | `                       | (Double Bracket Only) Logical AND / Logical OR operators. | `[[ -f file && -s file ]]` |
| `=~`           | (Double Bracket Only) Evaluates the string on the left against the Regular Expression on the right. | `[[ "$IP" =~ ^10. ]]`   |

## Examples

```bash
if [ -f "/var/run/app.pid" ]; then echo "Running"; fi
```

> This uses the classic POSIX single bracket `[ ]` test. It inspects the filesystem to verify if the `.pid` file exists. The `if` statement evaluates the hidden `0` or `1` exit status returned by the bracket evaluation to determine which code branch to execute.

```bash
[ -z "$1" ] && echo "Error: Argument required" && exit 1
```

> This executes a rapid, single-line validation check without needing an `if` block. It evaluates whether the first positional parameter (`$1`) is a zero-length (empty) string using `-z`. If True, the `&&` short-circuit operator executes the subsequent error and exit commands.

```bash
[[ "$OS_NAME" == *"Ubuntu"* ]]
```

> This demonstrates a massive advantage of the modern double bracket `[[ ]]`. It supports native pattern-matching wildcards. The right side (`*"Ubuntu"*`) is treated as a glob pattern, checking if the substring "Ubuntu" exists anywhere within the `$OS_NAME` variable.

```bash
if [[ $HTTP_CODE -ge 400 && $HTTP_CODE -lt 500 ]]; then
```

> This relies on the double bracket `[[ ]]` to safely evaluate combined mathematical comparisons using Greater Than or Equal To (`-ge`) and Less Than (`-lt`), chained cleanly with the native logical AND (`&&`) operator.

```bash
[[ "$EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,4}$ ]]
```

> This employs the advanced regular expression operator (`=~`), exclusively available in `[[ ]]`. It evaluates the string inside `$EMAIL` directly against an unquoted PCRE regex pattern to mathematically validate structural formatting in a single microsecond pass.

## Real-World Scenarios

**Idempotent Directory Provisioning**

```bash
[[ ! -d "/opt/app/data" ]] && mkdir -p "/opt/app/data"
```

> Infrastructure bootstrapping scripts use the logical NOT (`!`) operator combined with the directory test (`-d`). This ensures the script mathematically verifies the folder is missing before attempting to create it, preventing unnecessary execution noise.

**Validating Command Availability**

```bash
if ! command -v jq >/dev/null 2>&1; then
    echo "jq is missing. Please install."
    exit 1
fi
```

> While `test` commands inspect files, cloud-init scripts frequently invert the logic. By placing the `!` immediately before a raw command, the `if` statement bypasses the `[ ]` completely, natively evaluating the exit code of the binary to verify software installation.

**Parsing Mixed Configuration States**

```bash
if [[ "$ENV" == "prod" && -f "/etc/ssl/cert.pem" ]]; then
```

> Deployment orchestration scripts leverage double brackets to simultaneously evaluate complex string matching (`"prod"`) alongside physical hardware filesystem audits (`-f`), dictating precisely when sensitive TLS blocks should be enabled.

## When should it NOT be used?

- **Executing arithmetic calculations:** **Reason:** `[ 1 + 1 -eq 2 ]` is invalid syntax. The `test` command evaluates states; it cannot compute math. **Use instead:** Arithmetic expansion `(( 1 + 1 == 2 ))`.
- **Using `[ ]` for complex multi-condition logic:** **Reason:** Using single brackets for logic requires messy syntax like `[ -f a ] && [ -f b ]` or dangerous `-a` flags. **Use instead:** The modern double bracket `[[ -f a && -f b ]]`.

## Alternatives

- **Double Parentheses `(( ))`:** Mathematical evaluation. **Tradeoff:** `(( x > 5 ))` uses C-style math operators (`>`, `<`) rather than obscure shell operators (`-gt`, `-lt`). It is infinitely superior for pure integer math but cannot check file states (`-f`).
- **`expr`:** Legacy expression evaluator. **Tradeoff:** An antiquated, slow external binary previously used for math and string comparisons before shells implemented native `[[ ]]` and `(( ]]` built-ins.

## How it works internally

The distinction between `[ ]` and `[[ ]]` is the most critical architectural concept in shell scripting.

The single bracket `[` is a direct alias for the `test` command (literally a binary located at `/usr/bin/[`). Because it is a standard command, the Bash interpreter performs word splitting and wildcard expansion on the variables _before_ passing them to the command. This is why `[ -z $VAR ]` crashes if `$VAR` contains a space; it expands to `[ -z Hello World ]`, causing a "too many arguments" syntax error. Variables must always be quoted (`[ -z "$VAR" ]`).

The double bracket `[[` is fundamentally different. It is a deeply integrated **Bash Keyword**, not a command. When Bash encounters `[[`, it suspends standard word splitting and pathname expansion completely. This creates a secure, isolated sandbox. `[[ -z $VAR ]]` works perfectly even if the variable contains spaces or is empty, because Bash evaluates the literal variable object internally rather than passing it as split string arguments. It also enables advanced C-based regex matching (`=~`) and logical chaining (`&&`) that the legacy `test` binary is structurally incapable of understanding.

## Performance Notes

- Because `[[` is a native shell keyword, it bypasses binary execution routing and argument array parsing, making it measurably faster than `[` in loops executing millions of iterations.
- Evaluating Regular Expressions (`=~`) inside `[[` compiles the regex engine on the fly. It is vastly faster than piping the variable to an external `grep` process, but slightly slower than simple string equality (`==`).

## Security Notes

- **String Expansion Vulnerabilities:** Using the legacy `[` test without rigidly quoting variables is the leading cause of shell script crashes and logic injection. Unquoted variables containing wildcards (like `*`) will be expanded by the shell, transforming a simple string check into an array of hundreds of file names, triggering catastrophic syntax evaluation failures. Universally adopt `[[` to neutralize this threat.

## Common Mistakes

- **Using math operators (`<`, `>`) in single brackets:** Running `[ 5 > 3 ]`. **Why it's wrong:** In single brackets, `>` is interpreted by the shell as a file redirection operator. The command creates an empty file named `3` and compares nothing. You must use `[ 5 -gt 3 ]` or switch to math context `(( 5 > 3 ))`.
- **Quoting Regex strings in double brackets:** Running `[[ "$IP" =~ "^10." ]]`. **Why it's wrong:** Quoting the right-hand side of a `=~` operator forces Bash to treat it as a literal string, destroying its regex meta-character properties. Regex patterns must be unquoted.
- **Confusing `=` and `==`:** While `[ a = b ]` is standard POSIX, `[[ a == b ]]` allows pattern matching. Using `=` in double brackets is tolerated but breaks strict syntactic convention.

## Best Practices

- Universally deprecate the use of single brackets `[` unless you are specifically authoring a strict, POSIX-compliant script for a minimal `sh` or `dash` shell (like inside Alpine Docker containers).
- For all modern Bash and Zsh scripting, exclusively utilize `[[` for string/file evaluations and `((` for integer math evaluations. This eliminates 90% of variable quoting bugs.
- When evaluating uninitialized or potentially empty variables in legacy single brackets, use the `"x$VAR" = "x"` pattern to prevent syntax parsing crashes if the variable evaluates to a true null pointer.

## Interview Questions

- _Query:_ What is the fundamental, architectural difference between using a single bracket `[` and a double bracket `[[` when writing an `if` statement in Bash?
  - _A:_ The single bracket `[` is a standard command (an alias for `test`). Because it is a command, Bash aggressively performs word-splitting and variable expansion on the arguments before the command runs, meaning unquoted variables containing spaces will crash the script with a syntax error. The double bracket `[[` is a native Bash keyword. It suspends word splitting entirely, creating a safe sandbox that handles empty or spaced variables securely without quotes, while introducing advanced features like regex evaluation (`=~`).
- _Query:_ A developer writes `if [ $USERS > 50 ]; then`. The script executes without an error, but a mysterious blank file named `50` suddenly appears in the directory, and the logic behaves incorrectly. What caused this?
  - _A:_ Inside single brackets, the `>` symbol is not interpreted as "Greater Than"; it is intercepted by the Bash shell as the standard output redirection operator. The shell evaluates `[ $USERS ]`, which returns True, and then redirects the output of that invisible operation to a new file named `50`. The developer must use the specific integer evaluation operator `[ $USERS -gt 50 ]` to perform math.
- _Query:_ In a double bracket `[[` evaluation, what does the `=~` operator do, and what is the critical rule regarding quotation marks on the right side of the operator?
  - _A:_ The `=~` operator instructs the shell to execute a Perl-Compatible Regular Expression (PCRE) match. The string on the left is evaluated against the regex pattern on the right. Crucially, the right-hand regex pattern must _not_ be enclosed in quotes. If it is quoted, Bash strips its regex powers and treats it as a strict literal string comparison.

## Practice Problems

- _Problem:_ Write a modern, secure conditional evaluation that checks if a directory named `/opt/data` physically exists, and if a variable named `BACKUP_READY` contains the exact string `true`. Ensure both conditions must be met.
  - _Hint:_ Utilize the modern double-bracket syntax to chain the file directory flag with a standard string equality check.
  - _Solution:_ `[[ -d "/opt/data" && "$BACKUP_READY" == "true" ]]` (This securely evaluates the hardware state and the memory state simultaneously without word-splitting risks).
- _Problem:_ Evaluate the variable `APP_VERSION` to confirm if it begins with the number `2`, followed by a dot, and ends with any number of digits (e.g., `2.15`).
  - _Hint:_ Use the double-bracket syntax paired with the regular expression matching operator, ensuring the right side remains unquoted.
  - _Solution:_ `[[ "$APP_VERSION" =~ ^2.[0-9]+$ ]]` (This natively executes the regex evaluation in microseconds inside the shell memory).

## References

- [Bash Reference Manual - Conditional Constructs](https://www.gnu.org/software/bash/manual/bash.html#Conditional-Constructs)
- [Greg's Wiki (BashFAQ) - Test and brackets](https://mywiki.wooledge.org/BashFAQ/031)
