---
slug: pwd
name: pwd
aliases: [print working directory]
category: bash
tags: [shell, built-in, navigation, directory, filesystem]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'print working directory'
  - 'show current directory'
  - 'where am i in terminal'
  - 'get current path'
  - 'display absolute path'
relatedCommands: [cd]
alternatives: []
status: draft
---

## What is it?

`pwd` (print working directory) is a standard command-line utility and shell built-in that outputs the full absolute path of the current working directory. It provides the user or script with the exact location within the filesystem hierarchy where the active shell is currently operating, ensuring relative path references are evaluated correctly.

## Why does it exist?

While many modern terminal prompts (like `PS1` in bash) are configured to display the current directory, scripts executing in headless environments do not have graphical prompts. Furthermore, when traversing complex webs of symbolic links, the logical path might differ significantly from the physical disk location. `pwd` exists to provide a deterministic, scriptable mechanism to output the exact absolute path to standard output, allowing automation scripts to anchor themselves dynamically and users to verify their context before executing destructive commands.

## Syntax

```bash
pwd [-L | -P]
```

## Flags

_Note: `pwd` is both a POSIX shell built-in and a standalone binary (usually `/bin/pwd`). The built-in has a limited flag set by design._

| Flag               | Description                                                                                                                              | Example              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `-L`, `--logical`  | Prints the logical working directory, preserving any symbolic links used to navigate there. This is the default behavior in most shells. | `pwd -L`             |
| `-P`, `--physical` | Prints the physical working directory, fully resolving all symbolic links to their absolute underlying target paths.                     | `pwd -P`             |
| `--help`           | (GNU binary only) Displays a help message with usage instructions and exits.                                                             | `/bin/pwd --help`    |
| `--version`        | (GNU binary only) Outputs version information for the GNU coreutils `pwd` implementation and exits.                                      | `/bin/pwd --version` |

## Examples

```bash
pwd
```

> The standard invocation. It prints the absolute logical path of the current directory (e.g., `/home/developer/projects`) to standard output.

```bash
pwd -P
```

> If you navigated into a symlinked directory (e.g., `cd /var/www`, where `www` is a symlink to `/mnt/storage/web`), running `pwd -P` will bypass the logical path and print `/mnt/storage/web`, revealing the true physical disk location.

```bash
CURRENT_DIR=$(pwd)
```

> Command substitution. Executes `pwd` in a subshell and assigns the absolute path string to the bash variable `CURRENT_DIR`, anchoring subsequent script commands to this location.

```bash
/bin/pwd
```

> Bypasses the shell built-in entirely and forces the execution of the GNU Coreutils `pwd` binary located on the filesystem. This guarantees POSIX-compliant output regardless of shell-specific alias overrides.

```bash
pwd -L
```

> Explicitly requests the logical path. If the `PWD` environment variable contains symlinks, they are preserved in the output. This is usually redundant as it is the default behavior of the built-in.

## Real-World Scenarios

**Anchoring Shell Scripts**

```bash
#!/bin/bash
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
cat "$SCRIPT_DIR/config.json"
```

> This is a ubiquitous professional pattern. Scripts are often executed from random directories. By combining `dirname`, `cd`, and `pwd`, the script reliably determines the absolute path where the script _file_ resides, allowing it to reference relative assets (like `config.json`) safely, regardless of where the user invoked the script from.

**Troubleshooting Mount Points**

```bash
cd /opt/docker/data
pwd -P
df -h $(pwd -P)
```

> When analyzing disk space exhaustion, a system administrator needs to know which physical partition is actually backing a logical directory. They use `pwd -P` to resolve any nested symlinks, passing the true physical path to `df` to check the storage capacity of the correct mount.

## When should it NOT be used?

- **When checking script location directly:** **Do not use `pwd` alone to find where a script is saved.** `pwd` returns the directory from which the user _executed_ the command, not the directory where the script file lives. If a user runs `./scripts/deploy.sh` from `/home/user`, `pwd` will output `/home/user`.
- **High-frequency tight loops:** **Do not execute `pwd` thousands of times in a loop.** While the built-in is fast, spawning subshells (`$(pwd)`) in a tight `while` loop degrades performance. Use the `$PWD` environment variable directly instead.

## Alternatives

- **`echo $PWD`:** **Best for pure performance.** The shell automatically maintains the `$PWD` variable. Echoing it is marginally faster than invoking the `pwd` built-in and bypasses command substitution overhead.
- **`realpath .`:** **Best for aggressive normalization.** The `realpath` utility resolves all symlinks, removes `.` and `..` components, and validates path existence, offering more robust physical path resolution than standard `pwd -P`.

## How it works internally

Most modern shells (Bash, Zsh, Dash) implement `pwd` as a built-in command. When executed, the shell does not spawn a new process. Instead, it accesses its internal memory state to read the current value of the `PWD` environment variable.

If `pwd -P` (physical) is requested, or if the `PWD` variable is somehow corrupted, the built-in invokes the `getcwd()` (Get Current Working Directory) system call in the C standard library.

The `getcwd()` function operates by querying the operating system kernel. In Linux, it inspects the data structures of the current process, walking up the directory tree by reading the inode numbers of `..` (parent directory) until it reaches the root (`/`), constructing the absolute physical path dynamically. This is why `pwd -P` is slightly more computationally expensive than `pwd -L`, which simply reads an environment string.

If you execute the standalone binary (`/bin/pwd`), the shell forks a child process which immediately runs `getcwd()` and outputs the result.

## Performance Notes

- **Built-in vs Binary:** Executing the built-in `pwd` is instantaneously processed in user-space memory. Executing `/bin/pwd` requires a `fork()` and `exec()`, causing measurable overhead (milliseconds) which adds up if heavily utilized in automation.
- **Stale NFS Mounts:** If the current working directory resides on a Network File System (NFS) that has dropped its connection, forcing a physical resolution (`pwd -P` or `/bin/pwd`) can cause the `getcwd()` system call to block indefinitely, hanging the terminal.

## Security Notes

- **Information Disclosure:** In shared hosting or containerized environments, the output of `pwd` can reveal underlying host directory structures (e.g., `/var/lib/docker/overlay2/...`). Scripts generating public-facing error logs should sanitize `pwd` output to prevent leaking infrastructure topology.
- **Directory Unlinking:** If a separate process deletes the directory you are currently in, the shell is left in an orphaned state. `pwd -L` will still print the old logical string, but `pwd -P` or `/bin/pwd` will likely fail or append `(unreachable)` to the path because the underlying inodes no longer resolve to the filesystem root.

## Common Mistakes

- **Confusing `pwd` with script directory**
  - _Mistake:_ Using `cat $(pwd)/config.json` inside a bash script expecting it to read a file next to the script.
  - _Why:_ `pwd` evaluates to the caller's current working directory, not the script's location. If executed via a cron job (which defaults to the user's home directory), it will look for `~/config.json` and fail.
- **Ignoring symlink resolution**
  - _Mistake:_ Passing the output of `pwd` to an external tool that validates strict path matching, but failing because the path contained an un-resolved symlink.
  - _Why:_ By default, `pwd` prints the logical path (`pwd -L`). If strict physical paths are required for validation, always use `pwd -P`.

## Best Practices

- **Prefer `$PWD` for Variables:** In bash scripting, prefer using `"${PWD}"` over `"$(pwd)"` when you just need the string. It avoids subshell execution and is more idiomatic.
- **Use the Robust Anchoring Pattern:** Commit the standard anchoring snippet to memory: `DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"`. This safely calculates a script's physical location regardless of symlinks or invocation context.

## Interview Questions

**Q: What is the difference between `/bin/pwd` and just typing `pwd` in bash?**
**A:** Simply typing `pwd` invokes the shell's internal built-in command, which immediately returns the value of the `$PWD` environment variable without spawning a new process. `/bin/pwd` invokes the standalone executable binary on the disk, requiring a process fork and forcing the OS to calculate the physical path via the `getcwd()` system call.

**Q: You are in a directory `/app/data`. A background process completely deletes the `data` folder. What happens if you type `pwd`?**
**A:** The shell built-in (`pwd -L`) will likely still print `/app/data` because it just reads the cached environment variable. However, if you run `/bin/pwd` or `pwd -P`, it will query the OS. The OS will realize the current inode is unlinked and will either return an error or print a string indicating the directory is unreachable.

## Practice Problems

**Problem:** You suspect you are currently working inside a directory that is actually a symbolic link to a completely different hard drive. Write the command to output the true, physical path of your current directory.
**Hint:** Use the flag that requests Physical resolution.
**Solution:**

```bash
pwd -P
```

**Problem:** You are writing a shell script and want to assign the current working directory to a variable named `WORK_DIR`, but you want to do it securely without spawning a subshell.
**Hint:** Use the environment variable that the shell automatically maintains.
**Solution:**

```bash
WORK_DIR="$PWD"
```

## References

- [Bash Builtins: pwd (GNU Manual)](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-pwd)
- [POSIX Specification for pwd](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pwd.html)
