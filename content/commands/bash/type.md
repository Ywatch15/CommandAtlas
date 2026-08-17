---
slug: type
name: type
aliases: []
category: bash
tags:
  - shell
  - built-in
  - introspection
  - path
  - command-resolution
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - sh
intentPhrases:
  - find command location
  - check if command is alias
  - where is command executable
  - what kind of command is this
  - determine command type
relatedCommands: [which, alias]
alternatives: [which]
status: draft
---

## What is it?

`type` is a shell introspection built-in that indicates how a given command name would be interpreted if typed as a command. It resolves the execution hierarchy, informing the user whether a word represents a shell alias, a shell keyword (like `if` or `for`), a shell function, a built-in command (like `cd`), or an external executable binary found in the system's `$PATH`.

## Why does it exist?

Shells possess a complex order of precedence when interpreting commands (Aliases > Keywords > Functions > Built-ins > `$PATH` Executables). If a user types `ls` or `cd`, it is not immediately obvious what exact code the shell will execute. A user might have a rogue alias masking a system binary, or a developer might need to locate the exact physical path of an installed tool to update it. External utilities like `which` only search the `$PATH` and are completely blind to shell functions, aliases, and built-ins. `type` exists directly within the shell to provide absolute truth about how the parser will evaluate a string.

## Syntax

```bash
type [-afptP] name [name ...]
```

## Flags

_Note: `type` is a bash built-in (defined by POSIX). The exact flags below apply to the standard Bash implementation._

| Flag | Description                                                                                                                          | Example           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `-a` | (All) Prints _all_ matches for the command, revealing shadowed executables. (e.g., showing both the alias and the `$PATH` binary).   | `type -a ls`      |
| `-t` | (Type) Suppresses human-readable output and returns a single raw string: `alias`, `keyword`, `function`, `builtin`, or `file`.       | `type -t cd`      |
| `-p` | (Path) Returns the absolute file path if the target is a disk executable (`file`). If it's an alias or built-in, it returns nothing. | `type -p python3` |
| `-P` | Forces a `$PATH` search, returning the absolute file path of an executable on disk even if an alias or built-in shadows it.          | `type -P echo`    |
| `-f` | Suppresses shell function lookup. The command behaves as if shell functions do not exist in the execution hierarchy.                 | `type -f my_func` |

## Examples

```bash
type grep
```

> The standard invocation. If `grep` is aliased (commonly to `grep --color=auto`), it will output `grep is aliased to 'grep --color=auto'`. If not, it states `grep is /usr/bin/grep`.

```bash
type cd
```

> Informs the user about shell internals. Instead of returning a path, it explicitly outputs `cd is a shell builtin`, explaining why you cannot find a physical `/bin/cd` executable.

```bash
type -a python
```

> Extremely useful for debugging environment issues. Outputs every instance of `python` available. It might show `/usr/local/bin/python` followed by `/usr/bin/python`, helping a developer understand exactly which version takes priority based on their `$PATH` ordering.

```bash
if type -t docker > /dev/null; then
    echo "Docker is installed"
fi
```

> A highly robust scripting pattern. By using `-t` and sending output to `/dev/null`, the script silently relies on the exit code of `type`. If `docker` exists in any executable form, `type` exits with `0` (success). This is preferred over `which`.

```bash
type -P pwd
```

> Forces the shell to locate the external disk binary for a command. Even though `pwd` is a shell built-in that takes precedence, `-P` forces `type` to ignore the built-in and output `/bin/pwd`.

## Real-World Scenarios

**Debugging Alias Shadowing**

```bash
type -a rm
# rm is aliased to 'rm -i'
# rm is /bin/rm
```

> An administrator writes a script assuming `rm` will silently delete files, but when they test commands in their terminal, it constantly prompts for confirmation. Using `type -a` reveals that their `.bashrc` has an alias shadowing the raw binary, preventing expected execution.

**Verifying Script Dependencies**

```bash
#!/bin/bash
for cmd in curl jq jq; do
    if ! type -p "$cmd" > /dev/null; then
        echo "Error: Required command '$cmd' is not installed." >&2
        exit 1
    fi
done
```

> Automation scripts must validate dependencies before running complex logic. Using `type -p` inside a loop is the most portable and robust way to verify that required system binaries (like `curl` and `jq`) actually exist in the execution `$PATH` before the script attempts to use them.

## When should it NOT be used?

- **Inside Non-POSIX shells:** **Do not assume `type` behaves identically everywhere.** While POSIX mandates `type`, extensions like `-t`, `-p`, and `-a` are Bash-specific. If writing a script targeted for `#!/bin/sh` (which may link to Dash or Ash), stick to `command -v` for dependency checking.
- **Searching for non-executable files:** **Do not use `type` as a filesystem search tool.** It only resolves commands based on the shell's execution rules. If you are trying to find where a configuration file like `nginx.conf` is located, use `find` or `locate`.

## Alternatives

- **`command -v`:** **Best for POSIX-compliant scripting.** It does exactly what `type` does (returns the execution path or alias string) but is universally supported across all POSIX shells, making it the preferred choice for `#`!`/bin/sh` scripts.
- **`which`:** **Best for pure `$PATH` lookups.** `which` is a standalone binary, not a built-in. It ignores aliases, functions, and built-ins entirely, searching only the directories listed in `$PATH`.
- **`whereis`:** **Best for comprehensive system info.** Locates not just the binary, but also the source code and manual (`man`) pages for a given command.

## How it works internally

When you execute a string in Bash, the shell follows a strict order of precedence to evaluate what to execute. `type` simply runs a string through this exact evaluation pipeline without actually executing the final payload.

The resolution order is:

1.  **Aliases:** Checks the in-memory dictionary of defined aliases.
2.  **Keywords:** Checks if the string is a reserved shell word (e.g., `if`, `then`, `while`, `function`).
3.  **Functions:** Checks the in-memory dictionary of defined shell functions.
4.  **Built-ins:** Checks the hardcoded list of internal commands compiled into the shell executable (e.g., `cd`, `echo`, `source`).
5.  **Files (Executables):** Iterates over every directory defined in the `$PATH` environment variable, checking for an executable file matching the string. It stops at the first match. It caches these locations in a hash table to speed up future lookups.

If `type` finds a match at step 1, it prints the alias and stops (unless `-a` is used, which forces it to continue down the chain and print all matches). If it reaches step 5 and exhausts the `$PATH` without a match, it returns an exit code of `1` (Not Found).

## Performance Notes

- **Hash Caching:** The first time `type` looks up an external binary, it requires filesystem `stat()` calls across the `$PATH` directories. The shell caches this path. Subsequent `type` executions for the same binary hit the hash table in memory, rendering the lookup virtually instantaneous.

## Security Notes

- **Path Hijacking Awareness:** `type -a` is an invaluable security auditing tool. If a malicious actor modifies a user's `$PATH` to prepend `~/bin`, they can drop a fake executable (e.g., `~/bin/sudo`) that steals passwords. `type -a sudo` immediately reveals this hijacking, showing the malicious binary taking precedence over `/usr/bin/sudo`.

## Common Mistakes

- **Using `which` instead of `type` in bash scripts**
  - _Mistake:_ Using `if which docker > /dev/null; then...` to check if a command exists.
  - _Why:_ `which` is an external binary. Not all minimal Linux distributions (like Alpine) have `which` installed by default. Furthermore, it requires spawning a subshell process. `type` or `command -v` are shell built-ins, making them universally available, faster, and capable of identifying shell functions.
- **Confusing `-p` and `-P`**
  - _Mistake:_ Wanting to find the raw executable for `echo`, running `type -p echo`, and getting blank output.
  - _Why:_ `-p` (lowercase) only returns a path if the _primary_ resolution is a file. Because `echo` is a built-in, `-p` returns nothing. You must use `-P` (uppercase) to force the shell to bypass built-ins and search the `$PATH` for the physical executable (`/bin/echo`).

## Best Practices

- **Use `type -t` for logic branching:** In scripts, use the raw output of `-t` to conditionally execute code based on the environment. E.g., `if [ "$(type -t awk)" = "file" ]; then...` ensures you are running a real binary and not a hijacked alias.
- **Alias `type` to `type -a`:** Many power users configure `alias type="type -a"` in their `.bashrc`. It provides comprehensive visibility by default, immediately alerting you if an alias is shadowing a core system binary.

## Interview Questions

**Q: You write a script that defines a custom function named `ls() { echo "Intercepted!"; /bin/ls; }`. If you then run `type ls` inside that script, what will the output indicate?**
**A:** `type` will evaluate the precedence hierarchy. Because shell functions take precedence over external `$PATH` binaries, the output will indicate that `ls is a function` and will typically print the body of the function definition to standard output.

**Q: Explain why `type` is generally preferred over `which` when writing robust bash scripts to verify dependencies.**
**A:** `type` is a shell built-in, guaranteeing its presence across systems, whereas `which` is an external utility that may not be installed on minimal OS images. Additionally, `type` is aware of shell-specific constructs like aliases, keywords, and functions, whereas `which` blindly searches the `$PATH` and can return false negatives if a command is implemented natively in the shell.

## Practice Problems

**Problem:** You want to find out exactly where the `python3` executable is located on the filesystem. However, you want the command to output _only_ the raw absolute path (e.g., `/usr/bin/python3`), making it suitable for script assignment.
**Hint:** Use the flag that restricts output strictly to the file path.
**Solution:**

```bash
type -p python3
```

**Problem:** You suspect that the command `cat` is actually an alias masking the real binary, but you want to see both the alias definition and the location of the true underlying executable in one command.
**Hint:** Use the flag that instructs `type` to evaluate all matches in the hierarchy, not just the first one.
**Solution:**

```bash
type -a cat
```

## References

- [Bash Builtins: type (GNU Manual)](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-type)
- [POSIX Specification for type](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/type.html)
