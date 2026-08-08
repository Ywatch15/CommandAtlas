---
slug: export
name: export
aliases: []
category: linux
tags:
  - environment
  - variables
  - shell
  - subshell
  - configuration
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
  - set environment variable
  - make variable global in bash
  - add to PATH
  - pass variable to child process
  - export bash function
relatedCommands:
  - env
alternatives:
  - env
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`export` is a shell builtin command used to mark shell variables or functions so they are automatically passed into the environment of subsequently executed child processes. It transitions a variable from being strictly local to the current shell session into a global environment variable inherited by downstream commands.

## Why does it exist?

By default, variables declared in a POSIX shell (`MY_VAR="data"`) exist in an isolated, private memory space accessible only to that specific shell process. When the shell spawns a child process (like running a Python script, an AWS CLI command, or another bash script), the child process boots with a clean slate and cannot see the parent's local variables. `export` exists to bridge this process isolation, allowing developers to selectively explicitly expose configuration data, credentials, and paths to the broader operating system environment.

## Syntax

```bash
export [-f] [-n] [name[=value]]...
export -p
```

## Flags

| Flag         | Description                                                                                                                                      | Example                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `-p`         | Prints a list of all currently exported variables in a reusable format. Useful for generating environment backups or cross-loading environments. | `export -p > env_backup.sh`  |
| `-f`         | Instructs the shell to export a defined function rather than a standard variable. (Bash-specific, not POSIX standard).                           | `export -f my_custom_logger` |
| `-n`         | Removes the export property from a variable, reverting it to a local shell variable without deleting its actual value.                           | `export -n AWS_REGION`       |
| `name=value` | The standard assignment format. While not a flag, assigning and exporting simultaneously is the standard POSIX pattern.                          | `export DB_PORT=5432`        |
| `name`       | Exports a pre-existing local variable. If the variable does not exist, it creates it with no value.                                              | `export EXISTING_VAR`        |

_(Note: Because `export` is a core POSIX shell builtin rather than an external binary, its flag footprint is intentionally minimal, restricted strictly to the above attributes.)_

## Examples

```bash
export DATABASE_URL="postgres://user:pass@localhost:5432/db"
```

> This creates a variable named `DATABASE_URL` and simultaneously sets the export attribute on it. Any Node.js, Python, or bash script executed in this terminal session afterward will be able to read this connection string from its environment.

```bash
export PATH="/usr/local/go/bin:$PATH"
```

> This takes the existing `$PATH` environment variable, prepends a new Go binary directory to it, and re-exports the updated string. The shell and all subsequent child processes will now search this new directory for executables.

```bash
export -f format_json
```

> After defining a bash function named `format_json` in the current shell, this command exports it. If you subsequently spawn a subshell or run a bash script, that script can call `format_json` natively as if it had defined it locally.

```bash
export -n KUBECONFIG
```

> This strips the export attribute from `KUBECONFIG`. The variable and its value still exist in your current shell session, but any `kubectl` commands you run afterward will no longer inherit it, falling back to their default paths.

```bash
export -p | grep "AWS_"
```

> This prints all currently exported variables formatted as valid shell assignments (e.g., `declare -x AWS_REGION="us-east-1"`), which is then piped to `grep` to isolate only your active AWS credentials.

## Real-World Scenarios

**Configuring Cloud Provider SDKs**

```bash
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
aws s3 ls
```

> When automating infrastructure, you use `export` to load ephemeral STS credentials into the shell. The `aws` CLI binary natively looks for these specific environment variables in its process space, authenticating without requiring a hardcoded config file on disk.

**Managing Development Environments**

```bash
export NODE_ENV="production"
npm run build
```

> Node.js applications frequently branch logic based on the `NODE_ENV` variable. Exporting it before invoking the build tool ensures the Webpack or Vite child processes bundle the application using production optimizations rather than development source maps.

**Passing Variables via SSH**

```bash
export LC_ALL="en_US.UTF-8"
ssh user@remote-server
```

> Certain environment variables (specifically locale configurations like `LC_*` and `LANG`) are explicitly permitted to be forwarded over SSH connections by default SSH daemon configurations. Exporting them locally ensures your terminal formatting remains consistent on the remote host.

## When should it NOT be used?

- **Single-command variable overrides:** If a variable is only needed for one specific command, do not use `export`. **Reason:** `export` permanently pollutes the session environment for all subsequent commands. **Use instead:** Inline environment assignment (e.g., `NODE_ENV=production npm run build` or `env NODE_ENV=production cmd`).
- **Internal script counters and logic:** Do not export variables like loop iterators (`$i`) or temporary file paths used strictly for internal script logic. **Reason:** It needlessly expands the size of the environment block passed to every child process, which has finite memory limits (`ARG_MAX`).
- **Exporting arrays:** Standard POSIX shells and even Bash cannot export arrays via the `export` command (they lose their array structure and become standard strings). **Reason:** The Unix environment block strictly expects flat `KEY=VALUE` strings. **Use instead:** Serialize the array into a delimited string, export it, and deserialize it in the child script.

## Alternatives

- **`env`:** An external binary used to run a program in a modified environment. **Tradeoff:** `env` applies variables exclusively to the command it wraps, keeping the parent shell clean, whereas `export` mutates the parent shell's ongoing state.
- **Inline Assignment (`VAR=value cmd`):** A shell feature that temporarily passes a variable to a single command. **Tradeoff:** It is syntactically lighter than `env` and `export` but lacks advanced features like wiping the environment entirely.
- **`declare -x`:** A Bash-specific builtin that acts identically to `export`. **Tradeoff:** `declare` supports typing (like integers or readonly variables), but using it harms portability if you ever port your scripts to `sh`, `dash`, or `zsh`.
- **`setenv`:** The equivalent command used in C shell (`csh`) and TENEX C shell (`tcsh`). **Tradeoff:** It uses different syntax (`setenv KEY value` without an equals sign) and is entirely incompatible with Bourne-compatible shells (Bash, Zsh).

## How it works internally

In Linux and macOS, every process contains an array of string pointers named `environ` (defined as `extern char **environ;` in C). This array holds standard `KEY=VALUE` strings.

Because a child process cannot modify the memory of its parent process, `export` cannot be an external binary like `/bin/ls`; it must be built directly into the shell's source code. The shell maintains its own complex internal hash table of variables. When you run `export FOO=bar`, the shell adds `FOO` to this internal hash table and toggles a specific internal bit flag (in Bash, this is the `att_exported` attribute).

When the shell executes an external command, it calls the `fork()` system call to clone itself, followed by `execve()` to replace the clone with the new program. During the `execve()` phase, the shell iterates through its internal hash table. It collects only the variables that have the `att_exported` flag toggled, formats them into a flat array of `KEY=VALUE` strings, and passes that exact array as the `envp` argument to the kernel. The kernel then maps this array into the high memory address space of the newly booted child process.

## Performance Notes

- `export` executes in less than a millisecond because it merely flips a bit in the shell's internal memory structures. It incurs zero system calls and spawns no subshells.
- Exporting excessively large variables (e.g., placing a 5MB base64-encoded string in an environment variable) can cause subsequent commands to fail entirely with an `Argument list too long` (E2BIG) error, as the kernel enforces a strict size limit (`ARG_MAX`) on the environment block passed during `execve()`.

## Security Notes

- **`/proc` Visibility:** Variables marked for export are passed to child processes and become fully visible in plain text to anyone with read access to the `/proc/<pid>/environ` file. Never export long-lived database credentials on a shared multi-user server.
- **Shellshock (CVE-2014-6271):** Historically, Bash's implementation of exporting functions (`export -f`) was severely flawed. Bash passed functions to child shells by encoding them as environment variables with a specific syntax (`() { ... }`). A bug in the parser allowed attackers to append malicious arbitrary commands after the function definition, leading to remote code execution. Always ensure your Bash version is patched.
- **`LD_PRELOAD` Hijacking:** Exporting `LD_PRELOAD` forces the dynamic linker to load custom shared objects before standard C libraries for all subsequent commands. While useful for debugging, malicious actors use this to silently hook system calls (like `open()` or `read()`) to hide malware or capture keystrokes.

## Common Mistakes

- **Adding spaces around the equals sign:** Writing `export FOO = "bar"`. **Why it's wrong:** The shell splits arguments by spaces. It interprets this as an attempt to export three separate, existing variables named `FOO`, `=`, and `"bar"`. It will fail with a syntax error. Use `export FOO="bar"`.
- **Exporting in a subshell:** Running `(export MY_VAR="test")` and expecting `echo $MY_VAR` to work afterward. **Why it's wrong:** The parentheses spawn a subshell. The variable is exported to the subshell's environment, but when the subshell terminates, the parent shell remains completely unchanged. Environment variables only flow downward to children, never upward to parents.
- **Forgetting to quote variables with spaces:** Running `export MESSAGE=Hello World`. **Why it's wrong:** The shell treats `World` as a second command or variable name. It sets `MESSAGE` to "Hello" and tries to export an empty variable named `World`. Always quote values: `export MESSAGE="Hello World"`.

## Best Practices

- When appending to paths, always enclose the assignment in double quotes and include the existing variable to prevent accidentally wiping out critical system binaries: `export PATH="/new/bin:$PATH"`.
- To make environment variables permanent across reboots and new terminal sessions, append the `export` command to your user's shell profile file (e.g., `~/.bashrc`, `~/.zshrc`, or `~/.bash_profile`).
- Use uppercase naming conventions (`UPPER_SNAKE_CASE`) for exported environment variables to visually distinguish them from local, lowercase shell script variables.

## Interview Questions

**Q:** What is the fundamental difference between `MY_VAR=1` and `export MY_VAR=1`?
**A:** `MY_VAR=1` creates a local shell variable. The current shell can read it, but if you execute a script or launch a program, that child process will not see `MY_VAR`. `export MY_VAR=1` explicitly marks the variable to be copied into the environment memory space of any child processes spawned by the shell.

**Q:** If you run `export API_KEY="123"` in a script and execute it via `./script.sh`, why is `API_KEY` empty when you return to your terminal prompt?
**A:** Executing a script with `./` spawns a child process. The child process exports the variable into its own environment, but when the script finishes, the child process dies, taking its environment with it. To modify the parent terminal's environment, the script must be executed in the current context using `source script.sh` or `. script.sh`.

**Q:** How do you execute a command with a modified environment variable without using the `export` command and permanently altering your current shell?
**A:** You can use an inline environment assignment by prepending it directly to the command: `API_KEY="123" python script.py`. This passes the variable only to that specific Python execution and leaves the parent shell's state untouched.

## Practice Problems

**Problem:** You have compiled a custom binary located in `/opt/custom/bin`. Write the exact command to add this directory to the front of your system's executable search path, ensuring child processes recognize it.
**Hint:** You need to redefine the variable that controls executable paths by placing your new path before the existing one.
**Solution:** `export PATH="/opt/custom/bin:$PATH"`

**Problem:** You have a local shell variable named `DB_PASS` that is already set. Write the command to pass this existing variable to child processes without redefining its value.
**Hint:** The command can be used on variable names alone without the equals sign.
**Solution:** `export DB_PASS` (This toggles the export attribute on the existing variable).

## References

- [GNU Bash Reference Manual - Bourne Shell Builtins](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html)
- [POSIX specification for export](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#export)
  === END FILE ===
