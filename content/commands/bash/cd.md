---
slug: cd
name: cd
aliases:
  - chdir
category: bash
tags:
  - shell
  - built-in
  - navigation
  - directory
  - filesystem
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - change directory
  - go to folder
  - navigate filesystem
  - move to path
  - switch working directory
relatedCommands:
  - pwd
  - ls
  - mkdir
alternatives: []
status: draft
---

## What is it?

`cd` (change directory) is a shell built-in command used to change the current working directory of the active shell execution environment. It updates the shell's internal state, specifically the `$PWD` (Print Working Directory) and `$OLDPWD` environment variables, dictating the relative starting point for all subsequent path-based commands executed within that session.

## Why does it exist?

Operating systems use hierarchical file systems. If users had to type absolute paths (e.g., `/var/www/html/app/src/main.c`) for every file operation, terminal interaction would be prohibitively slow and error-prone. `cd` exists to establish a localized context (the working directory) within the shell process. Because a child process cannot alter the working directory of its parent process, `cd` must be implemented directly as a shell built-in rather than an external binary, ensuring the state change applies to the user's active interactive shell.

## Syntax

```bash
cd [-L|[-P [-e]] [-@]] [dir]
```

## Flags

_Note: As a POSIX shell built-in, `cd` has a minimal flag surface area by design. The following represent all standard Bash implementation flags._

| Flag      | Description                                                                                                                                                                 | Example                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `-L`      | Forces symbolic links to be followed. This is the default behavior. It updates `$PWD` using the logical path containing the symlink.                                        | `cd -L /var/www`            |
| `-P`      | Instructs `cd` to resolve physical paths. If the target is a symlink, it resolves to the underlying absolute directory, bypassing the logical path.                         | `cd -P /var/www`            |
| `-e`      | Used only with `-P`. If the current working directory cannot be successfully determined after the physical directory change, it forces `cd` to exit with a non-zero status. | `cd -P -e /corrupt/symlink` |
| `-@`      | (OSX/macOS specific) Presents a file with extended attributes as a directory containing the file attributes, allowing navigation into the metadata.                         | `cd -@ file.txt`            |
| `-`       | (Argument, not a strict flag) A shortcut that instructs `cd` to change to the previous working directory, swapping `$PWD` and `$OLDPWD`.                                    | `cd -`                      |
| `~`       | (Tilde expansion) Resolves to the current user's home directory (value of `$HOME`).                                                                                         | `cd ~`                      |
| `~<user>` | Resolves to the home directory of the specified user account.                                                                                                               | `cd ~root`                  |

## Examples

```bash
cd /etc/nginx/conf.d
```

> Navigates directly to the specified absolute path. Regardless of where you currently are in the filesystem, the shell's working directory is explicitly set to this location.

```bash
cd ../../var/log
```

> Uses relative path traversal. The `..` component references the parent directory of the current working directory. This traverses up two levels and then down into `var/log`.

```bash
cd -
```

> Instantly returns to the previous working directory (the value stored in `$OLDPWD`). It also prints the new directory path to standard output. This is the fastest way to toggle back and forth between two directories.

```bash
cd
```

> Executing `cd` with absolutely no arguments defaults to navigating to the current user's home directory, functionally identical to `cd ~` or `cd $HOME`.

```bash
cd -P /var/www/html
```

> If `/var/www/html` is a symbolic link pointing to `/mnt/storage/web`, the shell will physically resolve the link. Your prompt and `$PWD` will reflect `/mnt/storage/web` rather than the logical `/var/www/html` path.

## Real-World Scenarios

**Rapid Context Switching in Deployments**

```bash
cd /opt/app/releases/v2.1.0
# ... perform tasks ...
cd -
# ... back to /etc/nginx to restart service ...
cd -
```

> System administrators frequently need to toggle between an application directory and a configuration directory. Using `cd -` allows them to instantly bounce between the two contexts without re-typing long absolute paths.

**Resolving Symlinked Log Directories**

```bash
cd -P /var/log/app_logs
pwd
```

> When troubleshooting disk space issues, engineers need to know the physical mount point of log directories. By using `cd -P`, they force the shell to resolve the symlink to its physical disk location (e.g., `/data/disk2/logs`), allowing them to run `df -h .` on the correct partition.

**CDPATH-Driven Development Workflows**

```bash
export CDPATH=".:~/projects:~/go/src"
cd my-app
```

> Developers set the `CDPATH` environment variable in their `.bashrc`. When they type `cd my-app`, the shell searches the directories defined in `CDPATH` (like `~/projects`). This allows the developer to jump straight to their project directory from anywhere in the filesystem without typing the full path.

## When should it NOT be used?

- **Deep Directory Stacks:** **Do not use `cd` if you need to remember multiple previous locations.** `cd -` only remembers exactly one previous directory. If you are drilling deep into multiple configuration folders and need to unwind your path, use `pushd` and `popd` to maintain a stack of directories.
- **Shell Script Execution:** **Do not use `cd` in scripts without error checking.** If a script runs `cd /var/backup` and the directory doesn't exist, the script will continue executing subsequent commands (like `rm -rf *`) in the _current_ directory, causing catastrophic data loss. Always use `cd /path || exit 1`.
- **Subshell Operations:** **Do not expect `cd` inside a script to affect the parent terminal.** If you write a script `goto.sh` containing `cd /var/log`, executing `./goto.sh` will not change your terminal's directory. The `cd` only affects the child process running the script. You must `source goto.sh` instead.

## Alternatives

- **`pushd` / `popd`:** **Best for recursive directory traversal.** Pushes the current directory onto an internal stack before navigating, allowing you to pop back up the chain sequentially.
- **`z` / `autojump`:** **Best for terminal ergonomics.** External tools that track your most frequently visited directories ("frecency"), allowing you to type `z proj` to instantly navigate to `~/development/projects/golang/proj` using fuzzy matching.

## How it works internally

`cd` cannot be an external binary executable (like `ls` or `grep`). In Unix-like operating systems, every executed binary spawns a new child process. A child process has its own isolated memory space and working directory. If `cd` were a binary, it would change its own working directory and then immediately terminate, leaving the parent shell completely unaffected.

Therefore, `cd` is a shell built-in. When you invoke it, the shell process itself interprets the command. It resolves the path string, handling tilde expansion (`~`) and variable expansion. It then makes a system call, typically `chdir(2)` in C.

If the `chdir()` system call returns `0` (success), the shell updates its internal environment variables. It sets `OLDPWD` to the value previously held by `PWD`, and updates `PWD` to the new absolute path. If the `chdir()` call fails (e.g., permission denied, directory doesn't exist), the shell catches the non-zero exit code, prints an error to `stderr`, and leaves `PWD` and `OLDPWD` untouched.

When `CDPATH` is defined, the shell loops through the colon-separated paths, appending the requested directory to each, and attempts the `chdir()` system call on each until one succeeds.

## Performance Notes

- **In-Memory Execution:** Because it is a built-in, `cd` executes entirely within the shell's existing process space. There is no `fork()` or `exec()` overhead, making it essentially instantaneous.
- **Network File System (NFS) Latency:** While the command itself is fast, the underlying `chdir()` system call must verify directory existence and permissions. If the target directory resides on a slow, disconnected, or unresponsive NFS mount, `cd` will block and hang the entire terminal session until the RPC call times out.

## Security Notes

- **Directory Traversal Restrictions:** `cd` respects standard POSIX file permissions. You must have execute (`x`) permission on a directory to `cd` into it, and execute permission on all parent directories in the path leading up to it.
- **Symlink Attacks:** In shared hosting environments, a malicious user can symlink a benign-looking directory to a sensitive location (e.g., `ln -s /etc/shadow ./innocent_folder`). Navigating with `cd` will follow the symlink, potentially executing local context scripts or triggering automounts unexpectedly.

## Common Mistakes

- **Spaces in directory names**
  - _Mistake:_ Typing `cd /var/log/my app logs` and getting `bash: cd: too many arguments`.
  - _Why:_ The shell splits arguments by spaces. It thinks you are trying to `cd` into `/var/log/my`. You must quote the path (`cd "/var/log/my app logs"`) or escape the spaces (`cd /var/log/my\ app\ logs`).
- **Assuming scripts change the active shell**
  - _Mistake:_ Writing an alias like `alias logs="./go-to-logs.sh"` where the script contains `cd /var/log`.
  - _Why:_ The script executes in a subshell. To change the active terminal's directory, the alias must use `source` (e.g., `alias logs="source ./go-to-logs.sh"`) or be rewritten as a shell function.
- **Forgetting `|| exit` in scripts**
  - _Mistake:_ `cd /backup_dir; rm -rf *`
  - _Why:_ If `/backup_dir` is accidentally unmounted, `cd` fails, but the script continues to the next command, running `rm -rf *` in whatever directory the script was launched from, deleting unintended files.

## Best Practices

- **Use Defensive Scripting:** Always string `cd` commands with logical AND operators or explicit error handling in bash scripts: `cd /target/path || exit 1`.
- **Leverage `CDPATH`:** Configure `export CDPATH=".:$HOME/projects"` in your `.bash_profile`. It drastically reduces typing by allowing you to jump to deeply nested project directories from anywhere.
- **Prefer Absolute Paths in Automation:** In cron jobs or systemd services, never rely on relative `cd` paths or assume the starting working directory. Always `cd` to explicit, absolute paths to ensure deterministic execution.

## Interview Questions

**Q: Why must `cd` be implemented as a shell built-in rather than a standalone executable binary located in `/bin/cd`?**
**A:** If `cd` were a standalone binary, the shell would fork a child process to execute it. The child process would change its own working directory using the `chdir()` system call and then exit. Because child processes cannot alter the environment or working directory of their parent process, the original shell would remain completely unaffected. It must be a built-in so the shell process itself calls `chdir()`.

**Q: Explain the difference between `cd -L` and `cd -P`. Which is the default?**
**A:** `-L` (Logical) is the default. It follows symbolic links, updating the `$PWD` variable to reflect the logical path containing the symlink. `-P` (Physical) resolves the symlink to its actual physical location on the disk, updating `$PWD` to the underlying absolute path.

**Q: Write a bash command that attempts to navigate to `/var/app/data`, and if it fails, immediately prints an error and terminates the script with a status code of 1.**
**A:** `cd /var/app/data || { echo "Failed to navigate to data dir"; exit 1; }`

## Practice Problems

**Problem:** You are currently in `/etc/nginx/conf.d`. You need to navigate to `/etc/nginx/ssl` without typing the absolute path. Write the command.
**Hint:** Use the relative traversal operator to go up one directory level.
**Solution:**

```bash
cd ../ssl
```

**Problem:** You just navigated from `/var/log/syslog` to `/home/user/documents`. You want to immediately toggle back to the log directory. Write the fastest command to do so.
**Hint:** Use the shortcut argument that utilizes the `$OLDPWD` variable.
**Solution:**

```bash
cd -
```

## References

- [Bash Builtins: cd (GNU Manual)](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-cd)
- [POSIX Specification for cd](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/cd.html)
