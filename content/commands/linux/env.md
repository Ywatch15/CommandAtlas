---
slug: env
name: env
aliases: []
category: linux
tags:
  - environment
  - process
  - shell
  - execution
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
  - list environment variables
  - set env var temporarily
  - run command with env
  - shebang env python
  - clear environment variables
relatedCommands:
  - export
alternatives:
  - export
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`env` is a standard Unix utility used to either print a list of current environment variables or execute another utility within a modified environment. It allows you to inject, overwrite, or remove environment variables exclusively for the lifespan of a single child process without altering the current shell's persistent state.

## Why does it exist?

In POSIX systems, every new process inherits a complete copy of its parent's environment block. Modifying the parent's environment permanently pollutes the session state. `env` was created to safely isolate environment mutations for individual command invocations. Additionally, it has become the architectural standard for script shebangs (`#!/usr/bin/env interpreter`) to dynamically resolve binary paths via `$PATH`, bypassing hardcoded OS-specific paths that break cross-platform compatibility.

## Syntax

```bash
env [OPTION]... [-] [NAME=VALUE]... [COMMAND [ARG]...]
```

## Flags

| Flag                         | Description                                                                                | Example                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `-i`, `--ignore-environment` | Starts the command with a completely empty environment, ignoring inherited variables.      | `env -i ls`                               |
| `-u`, `--unset=NAME`         | Removes a specific variable from the environment before executing the command.             | `env -u PATH script.sh`                   |
| `-C`, `--chdir=DIR`          | Changes the working directory to the specified path before executing the command.          | `env -C /tmp pwd`                         |
| `-S`, `--split-string=S`     | Parses and splits a string into separate arguments, primarily used in shebang lines.       | `env -S "node --trace-warnings"`          |
| `-0`, `--null`               | Ends each output line with a NUL byte rather than a newline, useful for parsing.           | `env -0`                                  |
| `-v`, `--debug`              | Prints verbose debug information regarding exactly how `env` is processing the variables.  | `env -v FOO=bar ls`                       |
| `--block-signal[=SIG]`       | Blocks the delivery of specified POSIX signals to the executed command.                    | `env --block-signal=SIGINT top`           |
| `--default-signal[=SIG]`     | Resets the handling of specified signals to their default operating system behavior.       | `env --default-signal=SIGTERM script.sh`  |
| `--ignore-signal[=SIG]`      | Sets the specified signals to be completely ignored by the executed command.               | `env --ignore-signal=SIGHUP ping 8.8.8.8` |
| `-`                          | An obsolete, legacy synonym for `-i` (ignore environment) maintained for POSIX compliance. | `env - PATH=/bin ls`                      |

## Examples

```bash
env FOO=bar node server.js
```

> This injects the variable `FOO` with the value `bar` into the environment block of `node server.js`. Once the Node process terminates, `FOO` will not exist in the parent shell.

```bash
env -i PATH="/usr/bin:/bin" make build
```

> This executes the `make` utility with a strictly controlled, sanitized environment containing only the explicitly defined `PATH`. It guarantees that no local shell variables or aliases can interfere with the build process.

```bash
env -u AWS_PROFILE aws s3 ls
```

> This explicitly removes the `AWS_PROFILE` variable from the environment before running the AWS CLI, forcing the tool to fall back to its default profile without requiring you to unset the variable in your active terminal.

```bash
env -C /var/log tail -f syslog
```

> This changes the working directory to `/var/log` before executing `tail`. It behaves similarly to `cd /var/log && tail -f syslog` but does not alter the working directory of the current interactive shell.

```bash
#!/usr/bin/env -S python3 -u
```

> Used at the top of a script (the shebang), this dynamically locates `python3` in the system's `$PATH` and uses the `-S` flag to safely pass the `-u` (unbuffered) argument to the Python interpreter.

## Real-World Scenarios

**Cross-Platform Script Shebangs**

```bash
#!/usr/bin/env bash
```

> MacOS installs bash in `/bin/bash`, while FreeBSD or Homebrew environments might install it in `/usr/local/bin/bash`. Using `env` in the shebang forces the OS to search `$PATH` for the executable, ensuring the script runs flawlessly on any Unix system.

**Isolating Build Environments**

```bash
env -i HOME="$HOME" LC_ALL=C PATH="/usr/bin" ./configure
```

> When compiling C/C++ source code, inherited environment variables like `CFLAGS` or locale settings can silently break the build. Using `-i` strips the environment entirely, establishing a pristine, reproducible build context.

**Safely Parsing Environment Variables**

```bash
env -0 | sort -z | grep -z '^AWS_' | tr '\0' '\n'
```

> Environment variables can legally contain newline characters, which breaks standard line-by-line parsing. `env -0` outputs the variables delimited by NUL bytes, allowing tools like `sort` and `grep` to process multi-line variable payloads safely.

## When should it NOT be used?

- **Persistent variable assignment:** If you need a variable to remain active for subsequent commands in your current session, `env` is the wrong tool. **Use instead:** The `export` builtin (e.g., `export FOO=bar`).
- **Executing shell builtins:** `env` relies on the kernel's `execvp()` to run binaries. It cannot execute shell internal commands like `cd`, `alias`, or `history`. **Use instead:** Standard shell evaluation.
- **Complex shell evaluation:** Running `env VAR=1 echo $VAR` will not print `1` because the parent shell evaluates `$VAR` before passing the arguments to `env`. **Use instead:** `VAR=1 bash -c 'echo $VAR'`.

## Alternatives

- **`export`:** Modifies the environment of the _current_ shell session so all future child processes inherit it. **Tradeoff:** It pollutes the session state permanently, whereas `env` restricts the variable to a single command.
- **Inline Shell Assignment (`VAR=value command`):** Built directly into POSIX shells. **Tradeoff:** It avoids the minor performance overhead of spawning the `env` binary, but it lacks advanced control flags like `-i` to clear the environment or `-C` to change directories.
- **`printenv`:** Specifically designed only to print the environment. **Tradeoff:** It can print a single specific variable (`printenv USER`), which `env` cannot do natively without piping to `grep`, but `printenv` cannot execute commands.

## How it works internally

When executed, the `env` binary parses its arguments to construct a new array of string pointers representing the environment. If the `-i` flag is present, it allocates a fresh, empty array; otherwise, it copies the `environ` pointer array inherited from the parent shell. It then processes any `NAME=VALUE` arguments, appending or overwriting entries in this memory block.

Finally, `env` invokes the `execvp()` system call, asking the kernel to replace its own process image with the specified `COMMAND`. The `p` in `execvp` instructs the operating system to search the `$PATH` variable for the executable. Because the memory is overwritten by `execvp`, the new process boots up inheriting the carefully constructed environment array. Exit codes pass transparently from the executed command. If `env` itself encounters an error (like an invalid flag), it exits with `125`. If the target command is found but lacks executable permissions, it returns `126`. If the target command cannot be found in the `$PATH`, it returns `127`.

## Performance Notes

- Because `env` is an external binary (`/usr/bin/env`), invoking it requires an additional `fork()` and `exec()` from the parent shell. This introduces microsecond-level latency compared to native shell inline assignments (`VAR=1 command`).
- Parsing and copying the environment block has a negligible memory and CPU footprint since it manipulates string pointers in memory rather than performing deep copies, until the `execvp` syscall forces a memory space allocation.

## Security Notes

- **Process Visibility (`/proc`):** Variables passed via `env` (e.g., `env DB_PASS=secret script.sh`) do not appear in the shell's `.bash_history` file, but they are fully visible in plain text via `/proc/<pid>/environ` to the root user or the process owner during execution.
- **Shebang Spoofing:** Because `#!/usr/bin/env python` dynamically searches `$PATH`, a compromised `$PATH` (e.g., `PATH=.:$PATH`) can trick `env` into executing a malicious local binary named `python` instead of the secure system interpreter.
- **`LD_PRELOAD` Injection:** Attackers frequently use `env LD_PRELOAD=/path/to/malware.so command` to hook library calls in the target binary, allowing them to monitor keystrokes or bypass standard execution controls without modifying the binary itself.

## Common Mistakes

- **Spaces around the equals sign:** Running `env FOO = bar command`. **Why it's wrong:** `env` parses by spaces. It treats `FOO`, `=`, and `bar` as three completely separate arguments, ultimately attempting to execute a binary named `FOO`. It must be contiguous: `FOO=bar`.
- **Expecting pre-execution shell expansion:** Running `env FOO=bar echo $FOO`. **Why it's wrong:** The current shell evaluates `$FOO` _before_ the `env` command even runs. Since `$FOO` is empty in the parent shell, it passes an empty string to `echo`.
- **Using multiple arguments in older shebangs:** Writing `#!/usr/bin/env awk -f`. **Why it's wrong:** Older Linux kernels pass everything after the first space (`awk -f`) as a single unified string to `env`, resulting in an error like `awk -f: No such file or directory`. You must use the `-S` flag (`env -S awk -f`) to force string splitting.

## Best Practices

- Always use `#!/usr/bin/env <interpreter>` in shell and Python script shebangs instead of hardcoding `/usr/bin/python` or `/bin/bash`. This ensures scripts remain portable across varying OS file hierarchies.
- For strict security and reproducibility in CI/CD pipelines, explicitly wipe the inherited environment using `env -i` and manually inject only the required paths and tokens (e.g., `env -i PATH=/bin:/usr/bin /deploy.sh`).
- If injecting highly sensitive secrets, prefer reading from encrypted files or secrets managers at runtime within the application over passing them via `env`, to prevent exposure in process monitoring tools like `htop`.

## Interview Questions

**Q:** Why is `#!/usr/bin/env bash` preferred over `#!/bin/bash` in shell scripts?
**A:** Operating systems install interpreters in different locations (e.g., macOS uses `/bin/bash`, while FreeBSD or custom installs might use `/usr/local/bin/bash`). `env` dynamically resolves the binary path using the user's `$PATH`, making the script portable across all Unix-like environments.

**Q:** What is the functional difference between `env VAR=1 command` and just running `VAR=1 command` in the terminal?
**A:** The inline assignment `VAR=1 command` is processed internally by the shell without spawning an extra binary. `env` is an external binary that requires an additional `fork()` and `exec()`. However, `env` offers advanced flags like `-i` to completely wipe the inherited environment, which inline assignment cannot natively do.

**Q:** How do you completely clear the environment variables before running a sensitive script to ensure no parent configurations leak in?
**A:** You use the `-i` (or `--ignore-environment`) flag. For example, `env -i ./sensitive_script.sh` executes the script with a completely empty environment block.

## Practice Problems

**Problem:** Execute a Python script named `test.py` with a completely empty environment, except for a custom `PATH` explicitly set to `/usr/bin`.
**Hint:** Combine the flag that ignores the current environment with a standard variable assignment placed before the command.
**Solution:** `env -i PATH=/usr/bin python test.py` (The `-i` flag drops all inherited variables, then `PATH` is explicitly added back into the new memory block before `python` is executed via `execvp`).

**Problem:** Display all current environment variables, but ensure the output separates each variable with a NUL byte instead of a newline, so you can safely process values that might contain line breaks.
**Hint:** Look for the null-terminator flag.
**Solution:** `env -0` (This formats the output stream with `\0` delimiters, making it safe to pipe into parsing tools like `xargs -0`).

## References

- [env(1) - Linux manual page](https://man7.org/linux/man-pages/man1/env.1.html)
- [GNU Coreutils: env invocation](https://www.gnu.org/software/coreutils/manual/html_node/env-invocation.html)
  === END FILE ===
