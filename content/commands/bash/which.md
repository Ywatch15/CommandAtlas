---
slug: which
name: which
aliases: []
category: bash
tags: [bash, shell, executable, path, utility, search]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'find path to executable'
  - 'locate command binary path'
  - 'check where command is installed'
  - 'locate executable in path'
  - 'find binary file location'
relatedCommands: [type]
alternatives: [type]
status: draft
---

## What is it?

`which` is a standard command-line utility used to locate the executable file associated with a given command by searching the directories listed in the user's `PATH` environment variable. It prints the absolute pathname of the command that would be executed if the specified program name were entered directly into the shell.

## Why does it exist?

In Unix-like operating systems, executable binaries are scattered across various directories (`/bin`, `/usr/bin`, `/usr/local/bin`, etc.) dictated by the system `PATH`. When multiple versions or similarly named binaries exist across different directories, developers and administrators need a deterministic way to verify which exact binary file the shell will invoke. `which` exists to bridge this gap, scanning the colon-delimited `PATH` string sequentially to report the exact filesystem path of the matched executable.

## Syntax

```bash
which [-a] [-s] [--] <filename>...
```

## Flags

| Flag             | Description                                                                                              | Example                            |
| ---------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `-a`, `--all`    | Prints all matching executable files found in the `PATH` rather than stopping at the first match.        | `which -a python3`                 |
| `-s`, `--silent` | Runs in silent mode, returning an exit status of 0 if found and 1 if not found, without printing output. | `which -s gcc && echo "Installed"` |
| `--`             | Treats all subsequent arguments as command names, preventing option parsing on leading hyphens.          | `which -- -my-command`             |
| `--version`      | Displays version information and copyright details for the which utility.                                | `which --version`                  |
| `--help`         | Outputs brief usage documentation and supported command-line options.                                    | `which --help`                     |
| `-p`             | POSIX compatibility flag equivalent to default behavior (included on some platform variants).            | `which -p git`                     |
| `-i`             | Prompts before execution or displays aliases (supported on select BSD/macOS variants).                   | `which -i ls`                      |
| `-d`             | Debug mode, printing internal path evaluation steps (supported in specific GNU implementations).         | `which -d node`                    |
| `-v`             | Verbose mode, outputting additional status reporting during execution.                                   | `which -v docker`                  |
| `--tty-only`     | Stops execution if not running inside a valid terminal session (script protection).                      | `which --tty-only vim`             |

## Examples

```bash
which git
```

> This searches the directories in your `PATH` variable from left to right and prints the absolute path of the first `git` binary encountered (e.g., `/usr/bin/git`).

```bash
which -a node
```

> This uses the `-a` flag to list every single instance of the `node` executable found across all directories in your `PATH`, revealing if multiple versions or conflicting installations exist.

```bash
which -s gcc && echo "Compiler is available"
```

> This suppresses standard output using `-s` and evaluates the exit code. If `gcc` exists in the `PATH` (exit code `0`), it executes the conditional echo statement.

```bash
which -- -foo
```

> This uses the double-hyphen (`--`) option delimiter to ensure that a command name starting with a hyphen (`-foo`) is treated correctly as a search target rather than an invalid flag.

```bash
for cmd in git docker kubectl; do which "$cmd" || echo "Missing: $cmd"; done
```

> This loops through a list of critical DevOps tools, using `which` to verify their installation paths and alerting the user if any required utility is absent from the `PATH`.

## Real-World Scenarios

**Validating Toolchain Availability in Automation Scripts**

```bash
which terraform >/dev/null 2>&1 || { echo "Terraform required"; exit 1; }
```

> Build engineers and CI/CD pipeline scripts run `which` as an early smoke test to verify that required infrastructure tools like Terraform or Docker are present in the runner environment before initiating execution.

**Resolving Conflicting Binary Installations**

```bash
which -a python3
```

> When developers experience unexpected behavior due to conflicting Python environments (such as system python versus Homebrew or pyenv shims), they run `which -a python3` to inspect the precedence order in their `PATH`.

**Debugging Shebang Paths in Shell Scripts**

```bash
which node
```

> Script authors use `which` to acquire the exact absolute path of an interpreter binary so they can correctly write robust shebang lines (e.g., `#!/usr/bin/env node` or direct paths) at the top of executable scripts.

## When should it NOT be used?

- **Checking for shell built-in commands or aliases:** Running `which cd` or `which ll`. **Reason:** `which` strictly searches filesystem directories defined in the `PATH` variable; it cannot see shell built-ins (like `cd`, `echo`, `export`) or shell aliases and functions. **Use instead:** `type` or `command -v`.
- **Programmatic script logic relying on portability across Unix variants:** **Reason:** `which` is frequently implemented as an external shell script or binary whose flags and behavior (such as exit codes on failure) vary significantly between GNU Linux, macOS BSD, and strict POSIX environments. **Use instead:** Shell built-in `type -p` or `command -v`.
- **Verifying file permissions or executable accessibility:** **Reason:** `which` only checks if a file exists with an execution bit set within `PATH` directories; it does not guarantee that the current user context has runtime execution privileges or that dependencies load correctly. **Use instead:** Direct execution test or `test -x`.

## Alternatives

- **`type` (Shell Built-in):** Identifies whether a name represents an alias, function, built-in, or disk file. **Tradeoff:** `type` is a native shell built-in that understands all shell evaluation contexts (aliases, functions, built-ins) and is completely portable, whereas `which` is an external binary restricted strictly to `PATH` disk files.
- **`command -v` (POSIX Built-in):** Returns the pathname or command type matching the argument. **Tradeoff:** `command -v` is standardized across all POSIX shells, making it the safest, most robust tool for writing portable shell scripts without external dependencies.

## How it works internally

`which` operates by reading the current shell process's environment variables, specifically parsing the colon-separated string assigned to `PATH` (e.g., `/usr/local/bin:/usr/bin:/bin`).

When executed with a target command name (e.g., `git`), `which` iterates through each directory path segment in left-to-right order. Within each directory, it performs a filesystem stat query to check if a file exists matching the target name and verifies that the file possesses execute permissions for the current user.

Upon finding the first valid match, it prints the absolute path string to standard output and terminates with an exit status of `0`. If it exhaustively checks every directory in the `PATH` without a match, it prints an error message to standard error and exits with a non-zero status (typically `1` or `2`). If the command name contains an explicit slash (`/`), `which` bypasses `PATH` searching entirely and checks that specific filesystem path directly.

## Performance Notes

- Execution is exceptionally fast because it merely scans string arrays and performs lightweight filesystem stat checks across standard system directories.
- In environments with bloated `PATH` variables containing dozens of network-mounted or slow disk directories, `which` can experience noticeable execution latency.

## Security Notes

- **Path Spoofing Vulnerabilities:** If a user's `PATH` variable includes insecure directories (such as the current working directory `.` listed before `/usr/bin`), `which` will report the malicious binary located in the local directory, which can trick scripts into executing arbitrary payloads.
- **External Binary Hijacking:** Relying on external `which` binaries in security-sensitive privilege-escalation scripts can be dangerous if the search path has been tampered with; POSIX `command -v` is safer.

## Common Mistakes

- **Expecting `which` to find shell built-ins:** Running `which export` or `which history` and getting "no export in..." errors. **Why it's wrong:** `export` and `history` are internal shell built-ins, not external disk files in the `PATH`. Use `type export` instead.
- **Ignoring non-zero exit codes in scripts:** Writing `which my-tool` in a script without checking its return value. **Why it's wrong:** If the tool is missing, `which` exits with a non-zero code, which can cause unshielded scripts to crash or misbehave if `set -e` is active.
- **Relying on inconsistent flag behavior across operating systems:** Using GNU-specific flags like `which -a` in scripts running on strict macOS or BSD environments where `-a` behaves differently. **Why it's wrong:** It leads to cross-platform script breakage. Use `type -a` or `command -v`.

## Best Practices

- When writing portable shell scripts, replace `which` entirely with the POSIX-compliant shell built-in `command -v <cmd>` for robust, error-free binary detection.
- Never list the current working directory (`.`) in your system `PATH` variable, as this compromises security and distorts `which` lookup results.
- When auditing system binaries or debugging environment pollution, utilize `which -a` to verify that unexpected duplicate binaries do not shadow your intended toolchain.

## Interview Questions

**Q:** Why is the shell built-in `command -v` generally preferred over the external utility `which` in modern shell scripting?
**A:** `command -v` is a standardized POSIX shell built-in that evaluates aliases, shell functions, built-ins, and external binaries consistently across all shell implementations (Bash, Zsh, Dash) without spawning an external process or relying on OS-specific binary flags. `which`, by contrast, is an external program whose implementation, output messages, and exit codes vary unpredictably between Linux, macOS, and BSD systems.

**Q:** How does `which` process the `PATH` environment variable when searching for a target command?
**A:** `which` reads the colon-separated string stored in the `PATH` environment variable and iterates through each directory path segment from left to right. It checks if a file matching the target name exists within each directory and verifies that it possesses execute permissions, halting and printing the path upon the first match unless `-a` is specified.

**Q:** What happens if you pass a command name containing an explicit directory path (such as `/usr/bin/python`) to `which`?
**A:** When an argument contains a slash (`/`), `which` bypasses the `PATH` environment variable search entirely. It directly inspects the specified filesystem path to verify if the file exists and is executable, printing the path if valid or returning an error if absent.

## Practice Problems

**Problem:** Write a conditional shell statement that checks if the `jq` JSON processor binary is installed in your `PATH`, printing "Found" if it exists or "Missing" if it does not, using silent execution mode.
**Hint:** Utilize the silent flag of `which` combined with standard shell conditional operators.
**Solution:** `which -s jq && echo "Found" || echo "Missing"` (The `-s` flag suppresses output and returns exit status 0 on success, driving the conditional AND/OR logic).

**Problem:** Find and display every single instance of the `ruby` interpreter binary installed across all directories in your current `PATH`.
**Hint:** Use the flag that forces `which` to print all matches rather than stopping at the first one.
**Solution:** `which -a ruby` (The `-a` flag instructs the utility to scan the entire `PATH` exhaustively and print every matching executable found).

## References

- [GNU Which Manual](https://www.gnu.org/software/which/)
- [Man Page for which (Linux)](https://man7.org/linux/man-pages/man1/which.1.html)
