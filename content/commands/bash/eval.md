---
slug: eval
name: eval
aliases: []
category: bash
tags:
  - bash
  - shell
  - builtin
  - evaluation
  - execution
  - metaprogramming
difficulty: advanced
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - evaluate string as bash command
  - execute dynamic shell command string
  - bash metaprogramming eval
  - construct and execute command dynamically
  - evaluate arguments as shell command
relatedCommands: [source]
alternatives: [source]
status: draft
---

## What is it?

`eval` is a powerful shell built-in command that takes its arguments, concatenates them into a single string, parses that string as a bash command, and executes the resulting command within the current shell environment. It provides a mechanism for dynamic code evaluation and shell metaprogramming.

## Why does it exist?

Standard shell parsing executes commands by performing variable expansion, word splitting, and globbing in a strict, predefined order. When developers need to construct variable names dynamically (indirect variable referencing) or evaluate strings that contain complex shell syntax (such as redirections, pipes, or compound commands) read from configuration files or generated at runtime, standard execution fails. `eval` exists to solve this architectural limitation by forcing the shell to perform a _second pass_ of parsing and evaluation on the constructed string.

## Syntax

```bash
eval [arg ...]
```

## Flags

| Flag       | Description                                                                                                             | Example              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------- |
| (no flags) | `eval` does not accept command-line flags; any leading hyphens are treated as arguments.                                | `eval "-echo hello"` |
| `--`       | Some shells support `--` to delimit arguments, though strictly speaking `eval` evaluates all arguments unconditionally. | `eval -- "ls -la"`   |

## Examples

```bash
eval "echo Hello World"
```

> This concatenates the argument string and evaluates it as a standard bash command, printing `Hello World` to standard output.

```bash
var_name="my_variable"
eval "$var_name='Secret Value'"
echo "$my_variable"
```

> This performs indirect variable assignment. By evaluating the concatenated string, it creates and assigns a value to a variable whose name is stored inside another variable (`my_variable`), outputting `Secret Value`.

```bash
cmd="ls -la /tmp"
eval "$cmd"
```

> This executes a command stored dynamically inside a string variable, parsing and running it as if it were typed directly into the terminal.

```bash
eval "echo \$$var_name"
```

> This evaluates nested variable expansion, resolving the value of a variable whose name is dynamically referenced via another variable.

```bash
config_line="export DB_HOST='localhost'"
eval "$config_line"
```

> This reads a raw configuration assignment string (such as one loaded from an external file) and evaluates it in the current shell, making the exported variable immediately available.

## Real-World Scenarios

**Dynamic Variable Indirection in Legacy Scripts**

```bash
eval "value=\$$variable_prefix\_count"
```

> Older shell scripts that lack native indirect parameter expansion syntax (`${!var}`) use `eval` to construct dynamic variable names on the fly for looping and state aggregation.

**Parsing and Exporting Dynamic Configuration Files**

```bash
while IFS= read -r line; do eval "export $line"; done < app.env
```

> Automation scripts parsing custom environment configuration files use `eval` combined with `export` to safely evaluate assignment statements containing quotes or inline shell expressions.

**Command Wrapper Generation**

```bash
build_cmd="docker build -t myapp:latest ."
[ "$VERBOSE" = "true" ] && build_cmd="$build_cmd --verbose"
eval "$build_cmd"
```

> Complex deployment scripts construct command-line strings dynamically based on runtime conditional flags and evaluate the final string via `eval` before execution.

## When should it NOT be used?

- **Executing untrusted user input or external file contents:** **Reason:** `eval` executes _any_ valid shell syntax present in the evaluated string. If external input is injected, it leads directly to arbitrary remote code execution (RCE) vulnerabilities. **Use instead:** Standard parameter expansion, arrays, or explicit conditional blocks.
- **Simple command execution where direct invocation works:** **Reason:** Using `eval` when a standard command will suffice adds unnecessary parsing complexity and makes debugging script errors exceedingly difficult. **Use instead:** Direct command execution (`cmd arg1 arg2`).

## Alternatives

- **Indirect Parameter Expansion (`${!var}`):** Modern Bash syntax for accessing variables dynamically by name. **Tradeoff:** It is completely safe and avoids parsing risks, but is restricted strictly to variable indirection, whereas `eval` can execute arbitrary compound shell commands.
- **Bash Arrays (`array[@]`):** Storing command arguments in indexed arrays. **Tradeoff:** Arrays prevent word splitting and security injection bugs when building dynamic commands, but require Bash-specific syntax rather than raw strings.

## How it works internally

`eval` is a core shell built-in implemented directly within the Bash parser engine.

When the shell encounters `eval`, it initiates a multi-stage evaluation lifecycle. First, the shell performs standard parsing and expansion (such as variable expansion, quote removal, and command substitution) on the arguments passed _to_ `eval`.

Once those arguments are concatenated into a single raw command string, `eval` feeds that resulting string back into the shell's input parser for a **second complete parsing pass**. The shell re-evaluates the string for word splitting, filename expansion, alias replacement, and command execution. This double-evaluation mechanism is what grants `eval` its metaprogramming power, but it is also the root cause of its severe security vulnerabilities.

## Performance Notes

- Executing `eval` introduces minor CPU overhead compared to direct command invocation because the shell parser must process the command string twice through its expansion and evaluation pipeline.
- The performance impact is negligible for normal operations, but excessive use of `eval` in high-frequency loops can degrade script execution speed.

## Security Notes

- **Arbitrary Code Injection Vulnerabilities:** `eval` is notoriously hazardous. If any portion of the string passed to `eval` incorporates unescaped external data, filenames, or user input, an attacker can inject malicious shell commands (e.g., `; rm -rf /`), leading to complete system compromise.
- **Quote Hell and Escape Complexity:** Writing correct quoting and escaping for strings passed through double evaluation (`eval`) is exceptionally error-prone, frequently resulting in syntax bugs or unexpected word splitting.

## Common Mistakes

- **Unquoted variable expansion in `eval`:** Writing `eval echo $user_input`. **Why it's wrong:** If `user_input` contains spaces or semicolons, the shell splits the words and executes arbitrary commands during the second evaluation pass.
- **Using `eval` unnecessarily for simple variables:** Writing `eval "file=$1"` instead of `file=$1`. **Why it's wrong:** Using `eval` for simple assignments is redundant, insecure, and bad scripting practice.
- **Neglecting proper escaping in nested expansions:** Failing to escape dollar signs (`\$`) when constructing dynamic variable lookups, causing premature expansion during the first pass.

## Best Practices

- Never pass untrusted user input, network payloads, or unvalidated file contents into `eval`.
- Whenever possible, replace legacy `eval` variable indirection with modern Bash indirect expansion syntax (`${!var}`) or indexed arrays.
- If `eval` must be used to construct commands dynamically, meticulously quote and validate all component variables to prevent word splitting and command injection exploits.

## Interview Questions

- **Q:** What is the fundamental difference in parsing behavior between executing a standard shell command and running that same command through `eval`?
  - **A:** Standard shell execution parses and expands a command line once before executing it. `eval` forces the shell to perform a _second pass_ of parsing and expansion: it evaluates arguments passed to it, concatenates them into a string, and feeds that string back into the shell parser to be re-evaluated for word splitting, expansions, and command execution.
- **Q:** Why is `eval` considered a major security risk when handling external user input or configuration files?
  - **A:** Because `eval` executes any valid shell syntax present in its evaluated string, passing unvalidated external input into `eval` allows attackers to inject malicious shell commands (such as command separators `;` or subshells), resulting in arbitrary remote code execution (RCE).
- **Q:** How can modern Bash scripts achieve indirect variable referencing without resorting to dangerous `eval` statements?
  - **A:** Modern Bash supports native indirect parameter expansion using the syntax `${!variable_name}`, which safely resolves the value of a variable whose name is stored in another variable without triggering secondary parsing passes or security risks.

## Practice Problems

- _Problem:_ Use `eval` to perform indirect variable assignment where a variable named `target` holds the string `my_config`, and you want to assign the value `active` to `my_config`.
  - _Hint:_ Construct a concatenated assignment string where the variable name is dynamically expanded during evaluation.
  - _Solution:_ `target="my_config"; eval "$target='active'"; echo "$my_config"` (The `eval` command concatenates and evaluates the string as `my_config='active'`, dynamically creating and setting the variable).
- _Problem:_ Safely evaluate a string variable `command_str="uname -r"` using `eval` to print the system kernel release.
  - _Hint:_ Pass the command string variable as the argument to `eval`.
  - _Solution:_ `command_str="uname -r"; eval "$command_str"` (The `eval` built-in parses and executes the command string stored in the variable).

## References

- [GNU Bash Reference Manual - The Eval Builtin](https://www.gnu.org/software/bash/manual/bash.html#The-Eval-Builtin)
- [Bash FAQ - How can I use a variable as a variable name? (eval)](https://mywiki.wooledge.org/BashFAQ/006)
