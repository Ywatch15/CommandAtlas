---
slug: shopt
name: shopt
aliases: []
category: bash
tags:
  - bash
  - shell
  - builtin
  - options
  - behavior
  - globbing
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
intentPhrases:
  - toggle bash optional behavior
  - enable globstar recursive matching
  - configure bash shell options
  - check bash shopt settings
  - enable extglob bash patterns
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`shopt` is a built-in bash shell command used to set and unset optional shell behavior settings that are unique to Bash and not governed by standard POSIX `set` flags. It provides granular control over advanced shell features such as recursive globbing, spelling correction, history expansion, and interactive prompt behaviors.

## Why does it exist?

While standard POSIX shell options (controlled via `set`) maintain baseline compatibility across diverse Unix shells, modern Bash introduces numerous powerful extended features that alter shell parsing and expansion mechanics. Because enabling these features globally might break strict POSIX scripts, `shopt` exists to provide an isolated toggle mechanism. It allows developers and interactive users to explicitly opt-in to advanced Bash capabilities like recursive wildcard matching (`globstar`) and extended pattern matching (`extglob`).

## Syntax

```bash
shopt [-pqsu] [-o] [optname ...]
```

## Flags

| Flag       | Description                                                                             | Example                              |
| ---------- | --------------------------------------------------------------------------------------- | ------------------------------------ |
| `-s`       | Enables (sets) each specified `optname`.                                                | `shopt -s globstar`                  |
| `-u`       | Disables (unsets) each specified `optname`.                                             | `shopt -u nocaseglob`                |
| `-p`       | Prints output in a reusable format showing current `shopt` settings.                    | `shopt -p globstar`                  |
| `-q`       | Quiet mode; returns an exit status of 0 if the option is set, 1 if unset.               | `shopt -q extglob && echo "Enabled"` |
| `-o`       | Operates on values corresponding to `set -o` option names (bridges `set` and `shopt`).  | `shopt -so errexit`                  |
| `--`       | Signals the end of command options, allowing option names starting with hyphens.        | `shopt -s -- option-name`            |
| (no flags) | Prints a list of all supported shell options and their current enabled/disabled status. | `shopt`                              |

## Examples

```bash
shopt -s globstar
```

> This enables recursive globbing (`**`), allowing wildcards like `**/*.js` to match files across infinite directory sub-depths.

```bash
shopt -s extglob
```

> This enables extended pattern matching features (such as `@(pattern-list)` or `!(exclude)`), providing advanced regex-like matching directly within shell glob expressions.

```bash
shopt -q autocd && echo "Auto-CD is active"
```

> This queries the status of the `autocd` option quietly (`-q`), executing the echo statement if typing a directory name alone automatically changes the working directory.

```bash
shopt -u cdspell
```

> This disables minor typo auto-correction on directory names when executing the `cd` command, forcing strict path matching.

```bash
shopt -p
```

> This prints the status of all available `shopt` options in reusable command format (`shopt -s ...` or `shopt -u ...`), useful for exporting configurations.

## Real-World Scenarios

**Recursive File Traversals Without `find`**

```bash
shopt -s globstar && ls -l **/*.py
```

> Developers writing automation scripts use `shopt -s globstar` to traverse complex directory trees recursively using simple wildcard syntax (`**/*.py`) without needing external utilities like `find`.

**Advanced Pattern Matching in Build Cleanups**

```bash
shopt -s extglob && rm -rf !(src|include|Makefile)
```

> Build engineers leverage extended globbing (`extglob`) to clean project directories by deleting everything _except_ specified protected folders (`src`, `include`, `Makefile`) in a single concise command.

**Developer Ergonomics via Auto-CD**

```bash
shopt -s autocd
```

> Interactive terminal users enable `autocd` in their `.bashrc` profile, allowing them to navigate directly into directories by typing just the folder name (e.g., typing `documents` instead of `cd documents`).

## When should it NOT be used?

- **Writing strictly portable POSIX shell scripts (`#!/bin/sh`):** **Reason:** `shopt` is a Bash-specific built-in command; POSIX shells like Dash or standard KornShell do not recognize `shopt`, causing scripts to crash immediately with command-not-found errors. **Use instead:** Standard POSIX loops or `find`.
- **Production scripts relying on default user terminal configurations:** **Reason:** Global interactive options like `autocd` or `cdspell` alter basic shell parsing behavior; enabling them indiscriminately inside automated pipelines can lead to unexpected wildcard expansion errors. **Use instead:** Explicit absolute paths and standard syntax.

## Alternatives

- **`find` (External Utility):** Searches for files in a directory hierarchy. **Tradeoff:** `find` is a robust, external system utility capable of complex permission, size, and time filtering across any shell, whereas `shopt -s globstar` provides native shell globbing without spawning external processes.
- **`set` (Shell Built-in):** Configures core POSIX shell attributes. **Tradeoff:** `set` controls standard POSIX error and debugging flags, whereas `shopt` manages extended, non-POSIX Bash-specific runtime behaviors.

## How it works internally

`shopt` is a built-in shell option manager native to GNU Bash.

When invoked, `shopt` accesses internal C-structure arrays within the Bash interpreter that hold boolean flags for dozens of extended features (such as `xpg_echo`, `lithist`, `checkwinsize`). When given `-s` (set) or `-u` (unset), it flips the corresponding boolean flag in memory.

For instance, when `globstar` is set, the shell's filename expansion (globbing) parser alters its recursive directory scanning algorithm to evaluate the `**` token across subdirectories. When invoked with zero arguments, `shopt` iterates through the entire internal option table, formatting and printing each option name alongside its `on` or `off` status.

## Performance Notes

- Toggling options via `shopt` executes instantly with zero disk I/O or process spawning overhead, as it merely updates internal boolean flags in shell memory.
- Enabling intensive features like `globstar` can increase evaluation time during wildcard expansion in massive directory trees because the shell performs deep recursive filesystem scans.

## Security Notes

- **Unexpected Glob Expansion Risks:** Enabling extended globbing (`extglob`) or globstar can occasionally cause complex wildcard expansions to match unintended system files if regex-like patterns are poorly written during file deletion commands (`rm`).
- **Interactive Hijacking:** Altering global interactive shell options in shared multi-user environments can disrupt expected terminal behavior for other users if profile scripts bleed configurations.

## Common Mistakes

- **Using `shopt` in `/bin/sh` scripts:** Writing `shopt -s globstar` in a script beginning with `#!/bin/sh`. **Why it's wrong:** On modern Linux systems, `/bin/sh` is often symbolically linked to `dash` or a strict POSIX shell where `shopt` is unrecognized, throwing a fatal syntax error.
- **Assuming `shopt` options persist across new shell processes:** Enabling `globstar` in a script and expecting child subshells or background scripts to inherit it. **Why it's wrong:** Shell options modified via `shopt` are scoped strictly to the current shell execution context; child processes do not inherit them unless explicitly re-declared.
- **Confusing `shopt` with `set`:** Trying to enable `errexit` using `shopt -s errexit`. **Why it's wrong:** While `shopt -o` can bridge options, standard POSIX flags like `errexit` and `nounset` belong strictly to the `set` builtin.

## Best Practices

- Always guard Bash-specific `shopt` commands inside interactive configuration files (`.bashrc`) or ensure scripts explicitly declare `#!/bin/bash` headers.
- When utilizing advanced globbing features like `globstar` or `extglob` in scripts, enable them locally and disable them afterward (`shopt -u globstar`) if strict baseline behavior is required elsewhere.
- Use `shopt -q` inside conditional script logic to safely test whether extended features are available before executing dependent expansions.

## Interview Questions

**Q:** Why does Bash maintain two separate built-in commands (`set` and `shopt`) for configuring shell options?
**A:** `set` is designed to manage standard POSIX-compliant shell attributes and positional parameters, ensuring high portability across diverse Unix shells. `shopt` was introduced specifically to manage extended, non-POSIX, Bash-exclusive runtime behaviors (like recursive globbing and spelling correction) without violating strict POSIX parsing standards.
**Q:** What is the specific function of `shopt -s globstar`, and how does it change wildcard expansion in Bash?
**A:** `shopt -s globstar` enables recursive wildcard matching in Bash. When enabled, the double-asterisk (`**`) token matches files and zero or more directories and subdirectories recursively across all depth levels, whereas standard globbing requires external tools like `find`.
**Q:** How does `shopt -q` differ in its output behavior compared to running `shopt` with zero arguments?
**A:** Running `shopt` with zero arguments prints a comprehensive list of all supported shell options and their current status to standard output. `shopt -q` (quiet mode) suppresses all text output entirely, returning an exit status of `0` if the queried option is enabled or `1` if it is disabled, making it ideal for script conditionals.

## Practice Problems

**Problem:** Enable recursive globbing (`globstar`) in your shell environment, and then use it in a command to list all `.log` files recursively across all subdirectories.
**Hint:** Set the shopt option first, then execute an `ls` command using the double-asterisk wildcard pattern.
**Solution:** `shopt -s globstar && ls -l **/*.log` (Enabling globstar allows the `**/*.log` pattern to match log files at any arbitrary subdirectory depth).
**Problem:** Write a silent conditional check using `shopt` that prints "Extglob Active" if extended globbing is enabled, and "Extglob Inactive" otherwise.
**Hint:** Use the quiet mode flag of `shopt` combined with standard shell conditional operators.
**Solution:** `shopt -q extglob && echo "Extglob Active" || echo "Extglob Inactive"` (The `-q` flag checks the option status silently and drives the conditional execution flow).

## References

- [GNU Bash Reference Manual - Bash Builtins (shopt)](https://www.gnu.org/software/bash/manual/bash.html#The-Shopt-Builtin)
- [Bash Hackers Wiki - Shopt builtin options](https://wiki.bash-hackers.org/commands/builtin/shopt)
