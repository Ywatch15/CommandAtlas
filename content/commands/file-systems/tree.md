---
slug: tree
name: tree
aliases: []
category: file-systems
tags:
  - linux
  - file-system
  - directory
  - visualizer
  - structure
  - hierarchy
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
  - list directory structure visually
  - show nested folders tree
  - view folder hierarchy
  - print directory tree format
  - list all files recursively visual
relatedCommands:
  - ls
  - find
  - pwd
  - rmdir
alternatives:
  - find
  - du
  - ls
status: draft
---

## What is it?

`tree` is a recursive directory listing program that produces a deeply indented, visually structured ASCII or Unicode text representation of a filesystem hierarchy. It traces nested files and subdirectories, printing them in a format that makes complex project structures instantly comprehensible to human operators.

## Why does it exist?

Standard directory listing tools like `ls -R` output flat, disjointed lists of paths that become unreadable when inspecting deeply nested hierarchies (like Java source code or Node.js modules). `tree` exists to solve this visualization problem. By drawing physical lines connecting parent directories to child nodes, it provides an immediate, topographical map of the filesystem, making it an indispensable tool for generating project documentation, debugging structural layouts, and auditing massive directories.

## Syntax

```bash
tree [OPTIONS] [DIRECTORY...]
```

## Flags

| Flag           | Description                                                                                   | Example                         |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------------------- |
| `-a`           | Prints all files, bypassing the default behavior which hides files starting with a dot (`.`). | `tree -a ~/project`             |
| `-d`           | Lists directories only, completely ignoring and hiding standard files.                        | `tree -d /var/log`              |
| `-L <level>`   | Restricts the maximum display depth of the directory tree to the specified level (e.g., 2).   | `tree -L 2 /etc`                |
| `-I <pattern>` | Ignores files and directories matching the provided wildcard string pattern.                  | `tree -I "node_modules\|\.git"` |
| `-f`           | Prints the full absolute or relative path prefix for every single file in the tree.           | `tree -f ./src`                 |
| `-p`           | Prints the exact file permissions (in `-rwxr-xr-x` format) for each printed node.             | `tree -p /etc/ssh`              |
| `-u`, `-g`     | Prints the username (`-u`) and/or group name (`-g`) assigned to the file ownership.           | `tree -u -g /var/www`           |
| `-s`, `-h`     | Prints the file size in bytes (`-s`) or human-readable formats like KB/MB (`-h`).             | `tree -h /tmp/downloads`        |
| `-D`           | Prints the date of the last modification time for the file.                                   | `tree -D ./assets`              |
| `-J`           | Formats the entire tree structure as a programmable JSON payload instead of ASCII lines.      | `tree -J ./data`                |
| `-X`           | Formats the tree structure into an XML document.                                              | `tree -X ./data`                |
| `--prune`      | Removes empty directories from the output tree to reduce clutter.                             | `tree --prune ./workspace`      |
| `-C`           | Forces terminal colorization, visually distinguishing files, directories, and links.          | `tree -C ./bin`                 |

## Examples

```bash
tree
```

> This runs the utility with no arguments, mapping the current working directory recursively and drawing an ASCII tree of all visible files and folders, summarizing the total directory and file count at the bottom.

```bash
tree -d -L 2 /etc
```

> This audits system configuration structures by restricting the output strictly to directories (`-d`) and preventing the map from expanding deeper than two hierarchical levels (`-L 2`), creating a clean, high-level overview.

```bash
tree -a -I ".git|.idea"
```

> This generates a comprehensive project map including hidden configuration dotfiles (`-a`), but explicitly leverages the ignore pattern (`-I`) to filter out massive, noisy version control and IDE folders using pipe-separated regex.

```bash
tree -hup
```

> This enriches the visual tree with explicit file metadata, attaching human-readable file sizes (`-h`), owner usernames (`-u`), and strict permission strings (`-p`) to every branch on the tree.

```bash
tree -J ./api_service > structure.json
```

> This serializes the entire nested filesystem structure into a strict JSON payload, allowing web dashboards, CI/CD scripts, or compliance auditors to parse the filesystem topology programmatically.

## Real-World Scenarios

**Generating Project Documentation (`README.md`)**

```bash
tree -L 3 -I "node_modules|dist" > DIRECTORY_STRUCTURE.txt
```

> Software engineers generating technical documentation use `tree` to capture a clean, visual representation of their repository's architectural layout, ignoring compiled build folders to keep the overview strictly focused on source code.

**Auditing Permission Structures**

```bash
tree -p -u -g /opt/secure_app/
```

> Security administrators mapping application deployments visualize permission inheritance by printing the tree with attached UID/GID and RWX permission blocks, easily spotting nested files with inappropriately broad read permissions.

**Analyzing Bloated Directory Sizes**

```bash
tree --du -h -L 2 /var/lib/docker/
```

> Operations teams hunting for storage bloat use the `--du` (disk usage) flag, which forces `tree` to calculate the cumulative size of directories recursively, drawing a visual map of which exact subset of a folder is eating disk space.

## When should it NOT be used?

- **Operating on directories containing millions of files (e.g., `/` or `/proc`):** **Reason:** `tree` attempts to hold the directory structure in memory to sort and map it. Running it blindly on the root directory will freeze the terminal for minutes and produce an unscrollable wall of text. **Use instead:** `find` or strict `-L 1` depth limits.
- **Piping file lists directly to automation commands:** **Reason:** The ASCII line-drawing characters (like `├──` and `└──`) pollute the text output, making it impossible to pass raw file paths cleanly to `xargs` or loops. **Use instead:** `find` or `tree -f -i` (though `find` is safer).

## Alternatives

- **`find .`:** The native filesystem walker. **Tradeoff:** `find` outputs a flat, unformatted list of relative paths. It is highly programmable but completely lacks the human-readable topographical visualization of `tree`.
- **`exa --tree` / `eza --tree`:** Modern Rust replacements. **Tradeoff:** These modern utilities provide infinitely superior color-coding, Git status integration, and icon support for drawing trees, but require custom installation whereas `tree` is widely available in core package managers.

## How it works internally

When executed, `tree` utilizes standard C library system calls (`opendir()`, `readdir()`, and `stat()`).

It reads the current directory entries, allocates memory for internal linked list structures representing the child nodes, and immediately recurses down into any discovered subdirectories. By default, it sorts these structures alphabetically in memory.

Once the recursive depth limit (`-L`) is reached or the bottom of the filesystem leaf is hit, the program begins rendering the tree to standard output. It calculates indentation using recursive counters, outputting standard ASCII (`|`, `-`) or Unicode characters (`├──`, `└──`) to draw visual connecting lines representing the structural lineage back to the root node. If metadata flags (like `-h` or `-p`) are active, it injects the `stat()` struct data inline before printing the filename. Finally, it tallies total node counts for the footer summary.

## Performance Notes

- Because `tree` sorts entries by default, massive directories require reading all entries into memory before printing. Passing the `-U` (unsorted) flag drastically reduces RAM usage and printing latency on heavy directories.
- The `--du` flag forces `tree` to stat and sum every single file in the hierarchy. This turns a fast visual listing into a heavy, disk-bound calculation equivalent to running `du -sh`.

## Security Notes

- **Traversing Sensitive Paths:** `tree` operates entirely in user-space. If it encounters a directory where the user lacks Read (`r`) or Execute (`x`) permissions, it safely prints `[error opening dir]` inline and continues rendering the rest of the tree without failing.
- **Symbolic Link Loops:** Historically, naive recursive programs could become trapped in infinite loops if symlinks pointed to parent directories. Modern `tree` implementations detect inode/device ID repetitions and halt recursion when encountering a circular link, printing `[recursive, not followed]`.

## Common Mistakes

- **Omitting the Ignore flag on NPM/Git projects:** Running `tree` in a JavaScript project root. **Why it's wrong:** The command will descend into `node_modules`, printing 50,000 files and utterly destroying the terminal buffer. Always append `-I "node_modules"`.
- **Using default `tree` to find absolute paths:** Running `tree` and copying paths from the screen to use in another command. **Why it's wrong:** The ASCII characters pollute the copy-paste, and the paths are relative without the prefix. You must use `tree -f` to generate copyable full paths.
- **Assuming `tree` is installed natively everywhere:** **Why it's wrong:** Unlike `ls` or `rm`, `tree` is not part of the standard GNU Coreutils bundle. On fresh minimal Ubuntu/Alpine containers, it requires `apt-get install tree` or `apk add tree`.

## Best Practices

- When generating structural artifacts for markdown documentation, restrict the depth using `-L 2` or `-L 3` to keep the topology concise and digestible for readers.
- Combine `tree -J` with automated CI/CD security scanners to generate highly structured JSON manifests of filesystem state post-compilation, allowing programmatic audits of build artifacts.
- In environments where terminal encoding is broken and drawing strange graphical artifacts (like `â”œâ”€â”€`), append the `--charset=ascii` flag to force the use of safe `+---` and `\---` symbols.

## Interview Questions

- _Query:_ A developer runs `tree` on a massively bloated application directory, but the command takes 5 minutes to complete and fills the screen with 100,000 irrelevant library files. How do you instruct `tree` to display a clean overview of just the top-level architecture?
  - _A:_ You should use the depth limitation flag combined with directory isolation. Running `tree -d -L 2` instructs the utility to ignore all files, trace only directories, and halt recursion exactly two levels deep, returning an instant, highly readable structural overview.
- _Query:_ What is the structural problem with piping the output of the standard `tree` command into another utility like `grep` or `xargs` to manipulate files?
  - _A:_ The standard output of `tree` embeds line-drawing characters (like `├──`) and hierarchical indentation spacing into the text stream. Piping this directly to `xargs` or file processors breaks syntax parsing because the paths are malformed and polluted with ASCII art. For pure path parsing, `find` is the correct tool.
- _Query:_ If you require a programmatic snapshot of a filesystem's structure to feed into a Python automation script, what flag makes `tree` uniquely suited for this task?
  - _A:_ The `-J` flag. It instructs `tree` to serialize the entire hierarchical structure—including directories, file names, and requested metadata—into a strict, deeply nested JSON array document that Python can parse instantaneously without utilizing complex regex logic.

## Practice Problems

- _Problem:_ Generate a visual directory tree of the `/var/log` folder, mapping only the directories themselves, and restrict the expansion to a maximum depth of 1 level.
  - _Hint:_ Combine the target path with the directory-only flag and the depth limit flag.
  - _Solution:_ `tree -d -L 1 /var/log` (This cleanly maps the top-level log folders without descending into nested subfolders or printing individual log files).
- _Problem:_ Map the current project directory including all hidden files, but explicitly ignore the massive `.git` and `build` folders, displaying human-readable file sizes alongside the files.
  - _Hint:_ Use the all-files flag, the human-readable size flag, and the ignore pattern flag using a pipe separator.
  - _Solution:_ `tree -a -h -I ".git|build"` (This renders a detailed map while safely pruning the noisiest architectural segments).

## References

- [Tree Command Official Site (Mama.indstate.edu)](http://mama.indstate.edu/users/ice/tree/)
- [Man Page for tree (Linux)](https://man7.org/linux/man-pages/man1/tree.1.html)
