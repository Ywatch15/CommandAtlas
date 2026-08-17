---
slug: mkdir
name: mkdir
aliases:
  - make directory
category: file-systems
tags:
  - linux
  - file-system
  - directory
  - coreutils
  - creation
difficulty: beginner
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - create new directory linux
  - make multiple nested folders
  - create directory with specific permissions
  - create folder structure silently
  - setup directory tree
relatedCommands: [rmdir, rm, cd, ls]
alternatives: []
status: draft
---

## What is it?

`mkdir` (make directory) is a fundamental POSIX command-line utility used to create new directory hierarchies within a filesystem. It interfaces directly with the kernel to allocate new directory inodes, establishing the necessary structural boundaries for organizing files and data.

## Why does it exist?

Operating systems require a mechanism to organize raw file data into hierarchical, navigable structures. Without a dedicated command to invoke the underlying `mkdir()` system call, users and automation scripts could not construct the folder trees necessary for application deployment, logging paths, or user data separation. `mkdir` exists to provide a simple, robust interface for generating this necessary filesystem scaffolding safely.

## Syntax

```bash
mkdir [OPTION]... DIRECTORY...
```

## Flags

| Flag                  | Description                                                                                               | Example                    |
| --------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------- |
| `-p`, `--parents`     | Idempotent creation: makes parent directories as needed and ignores errors if directories already exist.  | `mkdir -p /app/data/logs`  |
| `-m`, `--mode <MODE>` | Sets specific file permission modes (e.g., `755` or `a=rx`) for the created directories, bypassing umask. | `mkdir -m 700 ~/.ssh`      |
| `-v`, `--verbose`     | Prints a confirmation message for every directory successfully created.                                   | `mkdir -pv /var/www/html`  |
| `-Z`, `--context`     | Sets the default SELinux security context for the newly created directories.                              | `mkdir -Z /var/www/secure` |
| `--help`              | Outputs brief usage documentation and supported command-line options.                                     | `mkdir --help`             |
| `--version`           | Displays version information and copyright details for the coreutils package.                             | `mkdir --version`          |

_(Note: `mkdir` is a highly specialized utility with a deliberately constrained set of POSIX flags focused strictly on directory creation parameters.)_

## Examples

```bash
mkdir logs
```

> This creates a single directory named `logs` in the current working directory. If a file or directory named `logs` already exists, the command will fail and output an error.

```bash
mkdir -p /var/opt/myapp/data/backups
```

> This uses the `--parents` flag to create a deeply nested folder structure. It automatically creates `/var/opt/myapp` and `/var/opt/myapp/data` if they are missing, and succeeds silently if the entire path already exists.

```bash
mkdir -m 700 ~/.ssh
```

> This creates the `.ssh` hidden directory and explicitly restricts its permission mode (`-m 700`) so that only the owner can read, write, and execute within it, satisfying OpenSSH's strict security requirements.

```bash
mkdir -pv ./build/src ./build/lib ./build/bin
```

> This creates multiple directory trees simultaneously within the current folder, printing a verbose confirmation string (`-v`) to standard output for every individual folder instantiated.

```bash
mkdir {prod,staging,dev}-environment
```

> Leveraging bash brace expansion, this command dynamically creates three separate directories (`prod-environment`, `staging-environment`, `dev-environment`) in a single succinct command execution.

## Real-World Scenarios

**Idempotent CI/CD Pipeline Scaffolding**

```bash
mkdir -p ./artifacts/reports/coverage
```

> Automated build scripts execute `mkdir -p` before attempting to write test results to disk. The `-p` flag guarantees the script will not crash if a previous build step already created the directory, ensuring pipeline resiliency.

**Secure Directory Provisioning for Service Accounts**

```bash
mkdir -m 0750 /etc/myapp/ssl
```

> Configuration management scripts generate TLS certificate storage directories with strictly locked-down modes (`-m 0750`) upon creation, ensuring private keys are never inadvertently exposed to global read permissions due to loose system `umask` defaults.

**Complex Project Bootstrapping**

```bash
mkdir -p project/{src/{components,utils},tests,docs,public}
```

> Software developers use `mkdir -p` combined with advanced shell brace expansion to instantly generate complex, standardized repository structures for new React or Python projects with a single keystroke.

## When should it NOT be used?

- **Creating files:** **Reason:** `mkdir` strictly creates directories (containers for files). **Use instead:** `touch`, `echo`, or redirection (`>`) to create standard files.
- **Creating directories with simultaneous user/group ownership assignment:** **Reason:** `mkdir` assigns ownership strictly to the executing user; it cannot execute a `chown` operation during creation. **Use instead:** The `install -d -o user -g group` command.

## Alternatives

- **`install -d`:** Directory creation with advanced metadata control. **Tradeoff:** `install` can simultaneously create a directory, set its permissions, and assign an explicit owner and group, which requires multiple commands with `mkdir` + `chown` + `chmod`. However, `install` is slightly more complex syntactically.
- **`rm -r` then `mkdir`:** Destructive recreation. **Tradeoff:** Purging and recreating ensures a perfectly clean slate, whereas `mkdir -p` preserves existing legacy files within the target structure.

## How it works internally

When you execute `mkdir`, the utility parses the arguments and invokes the POSIX `mkdir()` C system call for each specified directory path.

The kernel intercepts this call and instructs the underlying filesystem (like ext4 or xfs) to allocate a new directory inode. A directory in Linux is fundamentally just a special type of file that contains a mapped list of filenames and their corresponding inode numbers.

The kernel automatically populates this new directory inode with two default entries: `.` (a hard link pointing to itself) and `..` (a hard link pointing to its parent directory). Finally, the kernel applies file permissions. By default, `mkdir` requests a permission mode of `0777` (read/write/execute for everyone), but the kernel immediately filters this through the shell's active `umask` (commonly `022`), resulting in a final directory permission of `0755` (rwxr-xr-x) unless the `-m` flag overrides the umask entirely.

## Performance Notes

- Creating a directory is an extremely lightweight metadata operation inside the kernel journal, executing in microseconds.
- Using `-p` on very long paths introduces minor overhead, as `mkdir` must invoke multiple `stat()` system calls iteratively across every segment of the path to determine which parent nodes already exist.

## Security Notes

- **The Umask Dependency:** Without the `-m` flag, directories inherit permissions based on the executing user's session `umask`. If a server has a misconfigured, overly permissive `umask` (e.g., `000`), executing `mkdir secrets` will inadvertently create a globally writable directory.
- **Sticky Bit Requirement for Shared Folders:** When creating a directory intended for multiple users (like `/tmp`), administrators must apply the sticky bit (`mkdir -m 1777 shared_dir`). This ensures that only the creator of a file within that directory can delete it, preventing users from sabotaging each other.

## Common Mistakes

- **Forgetting `-p` in automation scripts:** Writing `mkdir /app/config/settings` without `-p`. **Why it's wrong:** If `/app/config` does not exist, the command crashes with a "No such file or directory" error, instantly failing the entire automation pipeline.
- **Confusing mode `-m` with ownership:** Attempting to assign a user with `mkdir -m root:root`. **Why it's wrong:** The `-m` flag only accepts octal or symbolic permission modes (e.g., `755` or `u=rwx`), not ownership syntax. Ownership must be set afterward via `chown`.
- **Assuming `-p` overwrites files:** Using `mkdir -p /path/to/target`. **Why it's wrong:** If `/path/to/target` already exists as a _regular file_, `mkdir -p` will still fail with a "File exists" error because a directory cannot share a namespace with a file.

## Best Practices

- Universally use the `-p` (parents) flag in all Bash scripts, Dockerfiles, and CI/CD pipelines. It makes the command idempotent, eliminating "File exists" errors and safely handling missing parent trees.
- Always combine `-m 700` when creating directories intended to hold sensitive cryptographic keys, passwords, or authentication tokens (e.g., `.ssh` or `.gnupg`).
- Leverage brace expansion (`mkdir -p dir/{sub1,sub2}`) rather than typing out sequential `mkdir` commands to keep scripts clean and expressive.

## Interview Questions

- _Query:_ In automated deployment scripts, why is the `-p` flag considered mandatory when running `mkdir`?
  - _A:_ The `-p` (parents) flag provides idempotency. It suppresses the "File exists" error if the directory is already present, allowing the script to safely continue. Furthermore, it automatically traverses the path and creates any missing parent directories, preventing fatal "No such file or directory" crashes.
- _Query:_ If you execute `mkdir new_folder` without specifying a `-m` mode, what mechanism determines the final read/write permissions of that folder?
  - _A:_ The final permissions are determined by subtracting the executing user's active `umask` from the default directory creation mode (`0777`). For example, if the user's umask is `022`, the resulting directory will be assigned permissions of `0755` (read/write/execute for owner, read/execute for group and others).
- _Query:_ What are the first two entries the Linux kernel automatically writes into the directory structure the exact moment `mkdir` successfully executes?
  - _A:_ The kernel automatically creates the `.` (dot) and `..` (dot-dot) entries. The `.` entry is a hard link pointing to the new directory's own inode, and the `..` entry is a hard link pointing back to the parent directory's inode, maintaining the hierarchical filesystem tree integrity.

## Practice Problems

- _Problem:_ Create a deeply nested directory path `/opt/app/logs/2026/08/` silently, ensuring no errors are thrown if the folders already exist.
  - _Hint:_ Use the idempotent flag that handles parent directory creation.
  - _Solution:_ `mkdir -p /opt/app/logs/2026/08/` (The `-p` flag traverses and builds the entire tree safely).
- _Problem:_ Create a directory named `private_data` in the current location, but restrict its permissions immediately upon creation so that only the owner has read, write, and execute access.
  - _Hint:_ Combine the directory creation command with the specific mode override flag using octal permissions.
  - _Solution:_ `mkdir -m 700 private_data` (This bypasses the system umask and locks the directory permissions strictly to the owner).

## References

- [GNU Coreutils - mkdir invocation](https://www.gnu.org/software/coreutils/manual/html_node/mkdir-invocation.html)
- [Man Page for mkdir (Linux)](https://man7.org/linux/man-pages/man1/mkdir.1.html)
