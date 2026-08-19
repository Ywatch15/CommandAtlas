---
slug: shift
name: shift
aliases: []
category: shell-scripting
tags: [bash, shell, variables, arguments, parsing, loop]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'parse bash arguments'
  - 'shift positional parameters'
  - 'process command line flags shell'
  - 'iterate through arguments bash'
  - 'remove first argument in bash script'
relatedCommands: [while, case, getopts, test]
alternatives: [getopts]
status: draft
---

## What is it?

`shift` is a shell built-in command that shifts the positional parameters (the arguments passed to a script or function) to the left. When executed, it discards the first argument (`$1`), reassigns the value of the second argument (`$2`) into `$1`, `$3` into `$2`, and mathematically decrements the total argument count variable (`$#`), providing the foundational mechanism for manually parsing command-line flags.

## Why does it exist?

Bash scripts frequently accept dynamic, unordered flags and values (e.g., `./script.sh --user admin --force`). Shells assign these inputs strictly to numeric variables (`$1`, `$2`, `$3`). Because a script doesn't know in advance how many arguments the user will provide or what order they will appear in, relying on hardcoded numeric variables is impossible. `shift` exists to solve this by creating a "consumption" mechanism. Combined with a `while` loop, it allows a script to inspect `$1`, process it, destroy it, and shift the entire queue down, efficiently iterating through an infinite string of parameters.

## Syntax

```bash
shift [n]
```

## Flags

| Argument    | Description                                                                                        | Example              |
| ----------- | -------------------------------------------------------------------------------------------------- | -------------------- |
| `n`         | (Optional) The integer number of positions to shift the parameters left. Defaults to `1`.          | `shift 2`            |
| `$1, $2...` | The positional parameter variables that are actively overwritten and shifted by the command.       | `echo $1`            |
| `$#`        | The total count of arguments currently available. Automatically decremented by `n` upon execution. | `while [ $# -gt 0 ]` |
| `$@` / `$*` | The array representing all current parameters. Shifting alters the contents of this entire array.  | `for arg in "$@"`    |
| `$0`        | The name of the script/command itself. This variable is strictly protected and _never_ shifted.    | `echo $0`            |

_(Note: `shift` is a fundamental shell control operator. It possesses no hyphenated command-line flags, only the single integer argument `n`.)_

## Examples

```bash
# Script executed as: ./deploy.sh argA argB argC
shift
echo "$1"
```

> Initially, `$1` holds `argA`. Executing `shift` discards `argA`, permanently reassigning `argB` to `$1`, and `argC` to `$2`. The `echo` command prints `argB`.

```bash
# Script executed as: ./deploy.sh --user admin --force
shift 2
echo "$1"
```

> By providing an integer argument (`2`), the command aggressively shifts the array by two positions simultaneously. It drops both `--user` and `admin`, elevating `--force` to the `$1` position.

```bash
my_function() {
  local target="$1"
  shift
  echo "Target: $target. Remaining args: $@"
}
```

> `shift` works identically inside local functions. It extracts the primary argument (`$1`) into a named variable, executes a shift to strip it from the array, and passes the entire remaining array (`$@`) downstream to other processes.

## Real-World Scenarios

**Building Command-Line Argument Parsers**

```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--user)
      USERNAME="$2"
      shift 2
      ;;
    -f|--force)
      FORCE=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done
```

> This is the canonical, industry-standard pattern for parsing complex CLI flags without relying on `getopts`. The `while` loop ensures processing continues as long as arguments exist. A `case` statement evaluates the current first argument (`$1`). If it finds `--user`, it saves `$2` to a variable, and violently shifts the array by `2` to consume both the flag and the value. If it hits a single boolean flag like `--force`, it only shifts by `1`.

**Extracting Prefix Commands for Wrappers**

```bash
# Wrapper script executing: ./wrapper.sh node server.js --port 8080
COMMAND="$1"
shift
echo "Logging execution of $COMMAND..."
exec "$COMMAND" "$@"
```

> System administrators building wrapper scripts (for logging or privilege elevation) extract the main execution binary target from `$1`, execute a `shift` to remove it from the array, and then safely pass the pristine, uncorrupted array of remaining arguments (`"$@"`) directly into the executable.

## When should it NOT be used?

- **Parsing strictly formatted, single-letter short flags:** **Reason:** If you need to parse combined short flags (like `tar -xzf`), manually writing `shift` logic requires massive, complex regex evaluations to decouple the strings. **Use instead:** `getopts`, which natively handles short flag clustering effortlessly.
- **When you need to reference the original arguments later:** **Reason:** `shift` is a highly destructive operation. It permanently overwrites the positional variables and the `$@` array in memory. If you need to log the exact invocation string at the end of the script, it will be gone. **Use instead:** Save the original array (`ORIG_ARGS=("$@")`) before invoking `shift`.

## Alternatives

- **`getopts`:** Standard POSIX option parser. **Tradeoff:** `getopts` is vastly superior and mathematically safer for parsing single-letter flags (like `-a -b value`), but it is structurally incapable of natively parsing modern GNU-style double-dash long flags (like `--user admin`). `shift` parses long flags effortlessly.
- **`for arg in "$@"`:** Standard array iteration. **Tradeoff:** A `for` loop iterates sequentially without destroying the array. However, if an argument is a key-value pair (`--user admin`), a `for` loop evaluates them as two separate, disconnected iterations, requiring complex state-tracking variables. `shift` solves this by consuming both simultaneously.

## How it works internally

`shift` is a built-in shell command. It does not spawn a new process.

When you pass arguments to a script, the Bash execution engine allocates an internal C-style array (the Argument Vector, `argv`) mapping the memory addresses of the strings to the variables `$1`, `$2`, etc. It also tracks the total length of this array in the `$#` variable.

When `shift n` is executed, the interpreter does not actually move heavy string data around in RAM or reallocate variables. It performs a lightweight pointer manipulation. It simply mathematically increments the starting index pointer of the `argv` array by `n` positions. Consequently, the variable `$1` maps to the new memory address, the previous entries drop out of scope, and the engine mathematically subtracts `n` from the `$#` integer registry.

If a script executes `shift n` where `n` is mathematically greater than the total available arguments remaining (`$#`), the Bash engine catches the mathematical bounds violation, aborts the shift entirely, and throws a non-fatal `shift count out of range` error.

## Performance Notes

- Because `shift` relies purely on internal array pointer manipulation inside the interpreter's RAM, it executes in single-digit microseconds. You can safely execute `shift` thousands of times in a dense `while` loop parsing massive argument strings without inducing CPU load.

## Security Notes

- **Argument Injection Protection:** Shifting arguments does not alter their quoting state or escape characters. If an argument contained dangerous characters (`--message "rm -rf *"`), shifting it down to `$1` keeps it safely treated as a literal string payload, provided the script developer properly quotes the variable (`"$1"`) during subsequent usage.

## Common Mistakes

- **Shifting past the end of the array:** Writing a loop that blindly calls `shift 2` when only 1 argument remains. **Why it's wrong:** If a user types `./script.sh --user` but forgets to provide the username value, `shift 2` will encounter an out-of-bounds error and fail. Always perform bounds checking (`[[ -n "$2" ]]`) before multi-shifting.
- **Assuming `$0` gets shifted:** Trying to use `shift` to alter the script name. **Why it's wrong:** The variable `$0` is permanently locked to the script's invocation name. It exists completely outside the `$1-$N` array and is totally immune to the `shift` command.
- **Forgetting to quote `$@` after a shift:** Running `wrapper.sh "$@"` instead of `wrapper.sh "$@"`. **Why it's wrong:** While `shift` correctly adjusts the array, passing unquoted `$@` to the next command subjects all remaining arguments to word-splitting, breaking file paths containing spaces.

## Best Practices

- When building `case` statement parsers utilizing `while [[ $# -gt 0 ]]`, always include a catch-all `*)` clause that triggers an `echo "Unknown argument"` and `exit 1`. If you forget this and encounter an unknown flag, the loop will spin infinitely, failing to `shift`, and lock up the server CPU.
- Always strictly quote your variable extractions (`VALUE="$2"`) before executing the `shift 2` command to prevent space-delimited string corruption.
- If your script accepts both short flags (`-u`) and long flags (`--user`), alias them cleanly in the case statement (`-u|--user)`) to allow a unified `shift` consumption model.

## Interview Questions

- _Query:_ You have written a deployment script that accepts an infinite list of server IP addresses as arguments. Explain why iterating through them using `while [ "$#" -gt 0 ]; do deploy "$1"; shift; done` is structurally superior to trying to access them via hardcoded `$1`, `$2`, `$3` variables.
  - _A:_ Hardcoding variables is physically limited; a developer cannot write out `$1` through `$999`. The `while/shift` pattern creates a dynamic consumption loop. It continuously processes the very first argument (`$1`), executes the payload, and then uses `shift` to destroy it, shuffling the entire infinite array down one position. The loop continues evaluating `$1` until `$#` (the total argument count) drops to zero, perfectly handling an arbitrary, limitless number of inputs.
- _Query:_ During a command-line parsing loop, a developer parses the `--password` flag and executes `shift 2`. Why does this specific flag require shifting by 2, whereas a flag like `--verbose` only requires `shift 1`?
  - _A:_ The `--password` flag expects a corresponding value immediately following it (e.g., `--password Secret123`). These are parsed by the shell as two distinct, separate arguments in the array (`$1` and `$2`). To move the array cursor to the next valid flag, the script must consume _both_ the flag and its value, necessitating `shift 2`. A boolean flag like `--verbose` stands alone, requiring only `shift 1` to consume it.
- _Query:_ What happens to the `$@` and `$*` variables when the `shift` command is executed successfully?
  - _A:_ The `$@` and `$*` variables are dynamic arrays representing all currently available positional parameters. When `shift` executes, the leading argument is permanently dropped, and the entire contents of the `$@` and `$*` arrays are updated mathematically to reflect the new, truncated state of the remaining parameters.

## Practice Problems

- _Problem:_ Write a `while` loop that continuously prints the value of `$1` to the terminal and then shifts the parameters, halting only when the total count of remaining arguments reaches zero.
  - _Hint:_ Combine the argument count variable (`$#`), a while loop, the echo command, and the shift operator.
  - _Solution:_ `while [ $# -gt 0 ]; do echo "$1"; shift; done` (This safely iterates and exhausts the array sequence).
- _Problem:_ Write a `case` statement snippet evaluating `$1`. If `$1` equals `--target`, assign the value of `$2` to the variable `TARGET_IP`, and shift the positional parameters by 2 to consume both the flag and the value.
  - _Hint:_ Use bash case syntax, variable assignment, and supply the numeric integer to the shift command.
  - _Solution:_ `case $1 in --target) TARGET_IP="$2"; shift 2 ;; esac` (This is the foundational logic gate for robust argument parsing).

## References

- [Bash Reference Manual - Bourne Shell Builtins (shift)](https://www.gnu.org/software/bash/manual/bash.html#Bourne-Shell-Builtins)
- [Bash Hackers Wiki - Argument Parsing](https://wiki.bash-hackers.org/howto/getopts_tutorial)
