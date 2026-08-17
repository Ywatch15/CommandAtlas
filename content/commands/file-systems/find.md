---
slug: find
name: find
aliases: []
category: file-systems
tags:
  - linux
  - file-management
  - search
  - filesystem
  - coreutils
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - search for files in directory
  - find files modified recently
  - locate large files
  - execute command on found files
  - search files by extension
relatedCommands: [locate, grep, du, ls, mv, rm, rmdir, tree]
alternatives: [locate, tree, ls]
status: draft
---

## What is it?

`find` is a powerful, POSIX-compliant command-line utility used to traverse directory hierarchies in real-time. It searches the filesystem for files and directories that match a complex set of user-defined boolean expressions—such as specific names, sizes, permissions, or modification timestamps. Crucially, it integrates an execution engine (`-exec`), allowing administrators to perform bulk, automated actions (like deletion or permission changes) directly against the matched files.

## Why does it exist?

Traditional filesystem commands like `ls` are incapable of deep, recursive attribute querying. If an administrator needed to delete all log files older than 30 days across a deeply nested web server directory, doing so manually or via complex bash loops is error-prone. `find` exists to solve this by providing a domain-specific language for filesystem querying. It evaluates inode metadata directly, acting as the ultimate programmatic filter to isolate specific data needles within massive storage haystacks, bridging the gap between discovery and automated action.

## Syntax

```bash
find [-H | -L | -P] [-EXdsx] [path...] [expression]
```

## Flags

| Flag / Expression  | Description                                                                                                                                             | Example                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `-name <pattern>`  | Searches for files where the basename matches a case-sensitive shell pattern (glob).                                                                    | `find . -name "*.log"`                |
| `-iname <pattern>` | Identical to `-name`, but case-insensitive.                                                                                                             | `find . -iname "*.JPG"`               |
| `-type <c>`        | Restricts the search to a specific file type. `f` for regular files, `d` for directories, `l` for symbolic links.                                       | `find /var/www -type d`               |
| `-mtime <n>`       | Matches files whose data was last modified _n_ days ago. Supports `+` (greater than) and `-` (less than).                                               | `find /backups -mtime +30`            |
| `-size <n>`        | Matches files using exactly, greater than (+), or less than (-) a specific size (e.g., `k`, `M`, `G`).                                                  | `find / -size +500M`                  |
| `-perm <mode>`     | Matches files possessing exact, inclusive, or any specified octal or symbolic permission modes.                                                         | `find . -perm 0777`                   |
| `-user <name>`     | Matches files owned by the specified user name or numeric UID.                                                                                          | `find /home -user www-data`           |
| `-maxdepth <n>`    | Prevents `find` from traversing directories deeper than _n_ levels below the starting points.                                                           | `find /var/log -maxdepth 1`           |
| `-exec <cmd> \;`   | Executes a shell command against every matched file. The `{}` string is substituted with the matched file's path.                                       | `find . -name "*.tmp" -exec rm {} \;` |
| `-print0`          | Prints the matched file paths followed by a null character (`\0`) instead of a newline. Essential for safely piping paths containing spaces to `xargs`. | `find . -name "*.txt" -print0`        |

## Examples

```bash
find /etc -name "nginx.conf"
```

> The most basic discovery pattern. Starts at the `/etc` directory and recursively searches every subdirectory for a file exactly named `nginx.conf`, printing the absolute path to standard output.

```bash
find /var/log -type f -mtime +7 -name "*.log"
```

> An essential cleanup query. Finds all regular files (`-type f`) in `/var/log` ending in `.log` that have not been modified in over 7 days (`-mtime +7`).

```bash
find / -size +1G -type f 2>/dev/null
```

> Hunts down massive files exhausting disk space. It searches the entire root filesystem (`/`) for files larger than 1 Gigabyte. The `2>/dev/null` redirection is critical here; it silences the hundreds of "Permission denied" errors generated when a standard user attempts to crawl protected system directories.

```bash
find . -type d -empty -exec rmdir {} +
```

> Performs structural cleanup. Locates all directories (`-type d`) in the current path that contain no files (`-empty`). The `-exec rmdir {} +` syntax aggregates all found directories and passes them simultaneously to a single `rmdir` command, destroying the empty folders efficiently.

```bash
find /opt/app -type f -name "*.sh" -exec chmod +x {} \;
```

> Automates bulk permission fixes. Finds every `.sh` file nested anywhere inside `/opt/app` and executes `chmod +x` on them one by one. The `\;` terminates the execution string for each distinct file.

## Real-World Scenarios

**Auditing System Security**

```bash
find / -perm /4000 -type f -exec ls -ld {} \; 2>/dev/null
```

> Security engineers proactively hunt for privilege escalation vectors. This command crawls the entire hard drive seeking files with the `SUID` bit set (`-perm /4000`). If an attacker dropped a malicious binary with root SUID execution rights, this command isolates it and uses `-exec` to print its detailed ownership metrics.

**Safe Multi-Threading with Xargs**

```bash
find /data/images -type f -name "*.png" -mtime -1 -print0 | xargs -0 -P 8 optipng -o7
```

> Combining `find` with `xargs` unlocks immense parallel processing power. Here, `find` locates all `.png` files modified in the last 24 hours (`-mtime -1`). The `-print0` flag safely formats paths containing spaces. `xargs -0` receives this stream and spins up 8 parallel worker threads (`-P 8`) to aggressively optimize the images utilizing multi-core CPUs.

## When should it NOT be used?

- **Searching inside file contents:** **Do not use `find` to look for text inside files.** `find` evaluates metadata (inodes, names, sizes). If you need to search for the string "ERROR" inside a thousand log files, use `grep -r` or `rg` (ripgrep).
- **Global filesystem sweeping for known files:** **Avoid running `find / -name "python"` constantly.** `find` performs a live, synchronous crawl of the hard drive, opening every directory tree, which causes heavy disk I/O. For rapid, system-wide lookups of known binaries or assets, use `locate` or `whereis`, which query a pre-indexed database in milliseconds.

## Alternatives

- **`fd` (fd-find):** **Best for modern developer ergonomics.** A rust-based alternative to `find`. It uses colorized output, understands `.gitignore` rules automatically, defaults to regex searching, and is significantly faster via multi-threading.
- **`locate`:** **Best for instant global searches.** Queries an indexed database rather than crawling the live filesystem.
- **`tree`:** **Best for visual hierarchy.** While `find` outputs a flat list of paths, `tree` renders a beautiful, indented ASCII graphic of the folder structure.

## How it works internally

`find` operates by recursively querying the OS kernel for directory and inode metadata.

When `find /path` executes, it uses the `opendir()` and `readdir()` (or modern `getdents()`) system calls to read the contents of the starting directory. For every item discovered, it maintains a memory stack of paths.

To evaluate expressions like `-size`, `-mtime`, or `-type`, `find` cannot rely on the directory entry alone. It must issue a `fstatat()` system call for _every single file_ it encounters. This retrieves the complete inode structure from the kernel, yielding the exact byte size, modification timestamp, and permission mode. `find` evaluates these attributes against the user's boolean logic (e.g., `-size +1G -a -name "*.log"`).

If the logic returns true, the default implicit action is `-print`, which writes the path string to `stdout`.

If `-exec <cmd> \;` is used, `find` executes a `fork()` and `execve()` system call for every matched file, spawning a completely new process. If `-exec <cmd> +` is used, `find` buffers the matched paths into an array and spawns the target command only once, appending all paths as arguments, dramatically reducing CPU process-creation overhead.

## Performance Notes

- **The Cost of Stat:** Because `find` issues a `stat()` call for nearly every file, traversing a directory with millions of tiny files (like a mail queue or massive `node_modules` structure) causes extreme metadata I/O thrashing, heavily impacting spinning-disk (HDD) performance.
- **Order of Expressions Matters:** `find` evaluates expressions sequentially from left to right using short-circuit boolean logic. Always place the most restrictive filters first. `find . -name "*.mp4" -type f` is slower than `find . -type f -name "*.mp4"` because checking the type (via `readdir` structs) is computationally cheaper than executing string-matching algorithms on filenames.

## Security Notes

- **Symlink Traversal Attacks:** By default, `find` refuses to follow symbolic links to directories, preventing infinite recursion loops if a symlink points back to a parent directory. Using the `-L` flag forces `find` to traverse symlinks, which can cause the command to escape its intended sandbox and leak data from sensitive system partitions.
- **Arbitrary Code Execution via Filenames:** If a script uses `find . -name "*.txt" | xargs rm`, an attacker can create a file named `"; rm -rf /; .txt`. The unquoted pipeline will execute the malicious injection. _Always_ use `find ... -print0 | xargs -0` in automation scripts to ensure paths containing spaces, newlines, or special characters are safely escaped by null terminators.

## Common Mistakes

- **Missing quotes around globs**
  - _Mistake:_ Running `find . -name *.log`.
  - _Why:_ The bash shell intercepts `*.log` before `find` even executes. If there is a file named `error.log` in your current directory, bash expands the command to `find . -name error.log`. The command silently ignores all other `.log` files in subdirectories. Always quote globs: `find . -name "*.log"`.
- **Confusing `-mtime 1` with "in the last day"**
  - _Mistake:_ Using `-mtime 1` expecting files modified today.
  - _Why:_ `find` time logic is highly specific and rounds strictly. `-mtime 1` means exactly 24 to 48 hours ago. To find files modified in the last 24 hours (less than 1 day), you must use `-mtime -1`.
- **Terminating `-exec` incorrectly**
  - _Mistake:_ `find . -name "*.tmp" -exec rm {}` (missing the semicolon).
  - _Why:_ The `-exec` flag consumes all subsequent arguments as the command to run until it hits a literal semicolon. Because the semicolon is a special character to the bash shell (used for chaining commands), you must escape it with a backslash (`\;`) or wrap it in quotes (`';'`) so `find` receives it properly.

## Best Practices

- **Optimize Executions with `+`:** When using `-exec` for actions like `rm`, `chown`, or `chmod`, terminate the command with `+` instead of `\;` (e.g., `-exec rm {} +`). This acts exactly like `xargs`, passing multiple files to a single `rm` command, preventing the CPU overhead of spawning thousands of individual `rm` processes.
- **Use `maxdepth` Early:** If you only care about files in the immediate directory, place `-maxdepth 1` as the very first argument after the path. This halts the recursive engine immediately, transforming a potentially 10-minute crawl into a 1-second query.

## Interview Questions

**Q: A developer runs `find /var/www -name *.html`. Sometimes it returns hundreds of files from all subdirectories, but other times it only returns one specific file from the root directory. Why is the behavior inconsistent?**
**A:** The developer forgot to quote the wildcard argument. The bash shell attempts to expand `*.html` before executing `find`. If the current directory happens to contain a file named `index.html`, the shell expands the command to `find /var/www -name index.html`. The `find` command will then strictly search the entire `/var/www` tree only for files exactly named `index.html`, missing everything else. If no `.html` files exist in the current directory, the shell leaves the wildcard intact, passing it to `find`, which then evaluates it correctly across all subdirectories. The argument must be explicitly quoted: `find /var/www -name "*.html"`.

**Q: Explain the structural and performance difference between `find . -name "*.tmp" -exec rm {} \;` and `find . -name "*.tmp" -exec rm {} +`.**
**A:** The `\;` terminator forces `find` to execute the `rm` command individually for every single file matched. If there are 1,000 `.tmp` files, the kernel must `fork()` and `exec()` the `rm` binary 1,000 times, which creates massive CPU overhead. The `+` terminator instructs `find` to append all matched files into an array, and invoke the `rm` command only once (e.g., `rm file1.tmp file2.tmp file3.tmp...`), achieving identical results with just a single process execution.

## Practice Problems

**Problem:** You need to find all directories (not files) located inside `/data/backups` that are older than 30 days. You want to execute the `rm -rf` command to delete them automatically.
**Hint:** Combine the type, time, and exec flags. Ensure the exec is terminated correctly.
**Solution:**

```bash
find /data/backups -type d -mtime +30 -exec rm -rf {} +
```

**Problem:** You are building a deployment pipeline and need to identify all files inside `./src` ending in `.js` or `.css`. To process them safely with a subsequent tool, you must instruct `find` to print the paths separated by a null byte character rather than standard newlines.
**Hint:** You need the flag that overrides the default newline printing behavior.
**Solution:**

```bash
find ./src -name "*.js" -o -name "*.css" -print0
```

## References

- [find(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/find)
- [GNU Findutils Manual](https://www.gnu.org/software/findutils/manual/html_node/find_html/)
