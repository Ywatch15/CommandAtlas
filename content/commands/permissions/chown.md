---
slug: chown
name: chown
aliases: [change owner]
category: permissions
tags: [linux, permissions, security, ownership, filesystem]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'change file owner linux'
  - 'update user and group of file'
  - 'recursively change directory ownership'
  - 'transfer file ownership'
  - 'fix docker volume permissions'
relatedCommands: [chgrp, chmod, ls, chattr, setfacl, umask, visudo]
alternatives: [chgrp]
status: draft
---

## What is it?

`chown` (change owner) is a foundational POSIX command-line utility used to change the user and/or group ownership of files, directories, and symbolic links. It is the primary administrative tool for reassigning data boundaries, allowing the kernel to evaluate access control rules correctly based on the newly assigned user identity.

## Why does it exist?

Files in UNIX are inherently bound to the user context that created them. When a root process unpacks a tarball, or a developer copies a file via SSH, the resulting files belong to the executor. For service daemons (like Nginx, PostgreSQL, or Docker containers) to read configurations or write logs securely without running as root, the files must be explicitly handed over to unprivileged service accounts. `chown` exists to perform this critical identity reassignment at the filesystem inode layer.

## Syntax

```bash
chown [OPTION]... [OWNER][:[GROUP]] FILE...
chown [OPTION]... --reference=RFILE FILE...
```

## Flags

| Flag                         | Description                                                                                           | Example                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `-R`, `--recursive`          | Operates on files and directories recursively, changing ownership across entire directory trees.      | `chown -R nginx:nginx /var/www/`       |
| `-c`, `--changes`            | Like verbose, but only reports output when a file's ownership actually required a change.             | `chown -c postgres:postgres data.db`   |
| `-v`, `--verbose`            | Outputs a diagnostic message for every file processed, detailing ownership transitions.               | `chown -v admin:staff *.log`           |
| `-f`, `--silent`, `--quiet`  | Suppresses error messages (e.g., "Operation not permitted" on specific files).                        | `chown -f -R bob:bob /home/bob/`       |
| `--reference=<RFILE>`        | Clones the user and group ownership from a reference file and applies it to the target files.         | `chown --reference=good.txt bad.txt`   |
| `--from=<C_OWNER>:<C_GROUP>` | Conditionally changes ownership _only_ if the file's current owner and group match this exact string. | `chown --from=root:root bob:bob *.txt` |
| `-h`, `--no-dereference`     | Changes the ownership of a symbolic link itself, rather than the file it points to.                   | `chown -h root:root symlink`           |
| `--dereference`              | Changes the ownership of the file a symbolic link points to (this is the default behavior).           | `chown --dereference bob:bob link`     |
| `-H`                         | (With `-R`) If a command line argument is a symlink to a directory, traverse it.                      | `chown -R -H www-data ./symlink_dir`   |
| `-L`                         | (With `-R`) Traverse every symbolic link to a directory encountered during recursion.                 | `chown -R -L dbadmin /var/data`        |
| `-P`                         | (With `-R`) Do not traverse any symbolic links during recursion (default safe behavior).              | `chown -R -P user /home/`              |

## Examples

```bash
sudo chown nginx /var/www/html/index.html
```

> This modifies the user ownership of a single file, assigning it to the `nginx` user. The group ownership remains completely unchanged.

```bash
sudo chown deployer:www-data release.tar.gz
```

> This utilizes the colon (`:`) separator to simultaneously change both the user ownership (to `deployer`) and the group ownership (to `www-data`) in a single atomic filesystem operation.

```bash
sudo chown -R mysql:mysql /var/lib/mysql/
```

> This is the definitive command for bootstrapping service directories. It recursively descends through the database directory, forcefully assigning every nested folder and file to the `mysql` user and `mysql` group.

```bash
sudo chown :developers shared_script.sh
```

> Omitting the username and leaving only the colon and group name (`:developers`) instructs `chown` to behave exactly like `chgrp`. It alters only the group ownership while preserving the original user owner.

```bash
sudo chown --from=root:root app_user:app_group /opt/app/*
```

> This executes a highly safe, conditional update. It scans all files in `/opt/app/`, but only applies the new `app_user:app_group` ownership if the file is currently owned explicitly by `root:root`, protecting files owned by other system processes.

## Real-World Scenarios

**Fixing Root-Mangled Docker Volumes**

```bash
sudo chown -R 1000:1000 ./local_database_mount/
```

> When developers map local host directories into Docker containers, containers running internally as `root` often generate files on the host filesystem locked by the root user. Developers execute `chown` targeting their host UID (usually 1000) to reclaim read/write access to their local source code.

**Securing SSH Key Deployments**

```bash
sudo chown -R myuser:myuser ~/.ssh/
```

> Configuration management systems (like Ansible or Chef) deploying authorized SSH keys via root processes use `chown` to hand the keys back to the specific local user. Without proper ownership, the SSH daemon's strict security checks will actively reject the keys.

**Sanitizing Web Server Document Roots**

```bash
sudo chown -R www-data:www-data /var/www/html && sudo chown -R root:root /var/www/html/secure_config
```

> Web administrators universally apply recursive `chown` commands to grant the web server daemon read access to the application tree, followed immediately by revoking ownership on critical configuration files to prevent the web server from modifying them if compromised.

## When should it NOT be used?

- **Modifying read/write/execute logic directly:** **Reason:** `chown` only establishes _who_ is evaluated by the permission matrix. It does not control what that user is allowed to do. **Use instead:** `chmod` to grant actual read/write/execute capabilities.
- **Applying ownership across untrusted symlink directories:** **Reason:** Running `chown -R` blindly in directories containing symlinks created by untrusted users can result in arbitrary file ownership overwrite attacks on the host OS. **Use instead:** Strict `-P` flags or controlled deployment paths.

## Alternatives

- **`chgrp`:** Change group only. **Tradeoff:** `chgrp` is limited to modifying groups, whereas `chown :group` achieves the exact same result while utilizing a more versatile binary structure.
- **`install -o user -g group`:** Instantiation with ownership. **Tradeoff:** `install` copies a file, sets permissions, and applies ownership in a single command, which is vastly superior for Makefile and build scripts, but it cannot modify existing files in-place like `chown`.

## How it works internally

When you execute `chown user:group file`, the utility translates the string names into numeric User IDs (UID) and Group IDs (GID) by performing lookups against `/etc/passwd` and `/etc/group` (via the `nsswitch.conf` API).

Once the numeric identifiers are resolved (e.g., UID 1000, GID 1000), `chown` invokes the `chown()`, `lchown()`, or `fchownat()` C system calls. The Linux kernel intercepts these calls and directly modifies the `st_uid` and `st_gid` 32-bit integer fields stored inside the file's physical hardware inode.

Crucially, as a hardcoded security precaution against privilege escalation, the moment the `chown()` system call successfully executes, the Linux kernel automatically strips the SetUID (4000) and SetGID (2000) permission bits from the file's `st_mode` integer. This guarantees that an attacker cannot create a malicious root-shell script, set the execution bits, and then `chown` it to `root` to execute it.

## Performance Notes

- **Massive Recursive Penalties:** Executing `chown -R` on dense directories (e.g., `node_modules` with 500,000 files) is heavily constrained by disk I/O. The utility must sequentially issue an `lstat()` and `fchownat()` system call for every single file in the hierarchy.
- **Numeric Parsing Speed:** Using numeric IDs (e.g., `chown 1000:1000 file`) bypasses the `glibc` user-lookup subroutines, resulting in slightly faster execution in extreme scale scripts and avoiding failures during LDAP/ActiveDirectory network outages.

## Security Notes

- **The "Chown Giveaway" Restriction:** On modern Linux kernels, unprivileged users are mathematically prohibited from "giving away" their files to other users. You cannot run `chown root my_file.txt`. Only processes possessing the `CAP_CHOWN` capability (i.e., `root`) can alter user ownership, preventing users from evading disk quotas or compromising system daemons.
- **Symlink Dereference Vulnerability:** By default, `chown` on a symlink follows the link and changes the target file's owner. If an attacker places a symlink named `innocent.txt` pointing to `/etc/shadow` in a directory, and a root script blindly runs `chown -R user dir/`, the attacker instantly gains ownership of `/etc/shadow`. Always use `--no-dereference` (`-h`) in automated scripts.

## Common Mistakes

- **Using a dot (`.`) instead of a colon (`:`):** Typing `chown user.group file`. **Why it's wrong:** While POSIX historically allowed the dot, modern Linux environments strongly deprecate it because usernames can legally contain dots (e.g., `john.doe`). The parser misinterprets the string, causing fatal deployment errors. Always use a colon.
- **Forgetting `-h` on symbolic links:** Running `chown root:root /etc/nginx/sites-enabled/site.conf`. **Why it's wrong:** The symlink pointer remains owned by the old user, but the actual target file in `sites-available/` changes ownership, which may break deployment permissions. Use `chown -h` to alter the link itself.
- **Running `chown -R` blindly on `/` or `/var`:** **Why it's wrong:** A minor typo (like `chown -R user:user / var/www` with an accidental space) initiates a recursive ownership overwrite on the root filesystem, instantly bricking the operating system by stripping root ownership from core `sudo` and kernel binaries.

## Best Practices

- When fixing ownership inside Docker containers, always use numeric UIDs (e.g., `chown -R 1001:1001 /app`) rather than string names, as the username strings on the host OS rarely map cleanly to the minimal `/etc/passwd` file inside an Alpine or Debian container.
- Leverage the `-c` (changes) flag in idempotent automation bash scripts. It minimizes cron-mail log spam by emitting terminal output strictly when a file's state was actually incorrect and corrected.
- When writing complex administrative bash scripts handling user-provided file paths, enforce the `--from` flag to guarantee `chown` only alters files you explicitly expected to be misconfigured.

## Interview Questions

- _Query:_ Why can the `root` user successfully execute `chown bob:bob secret.txt`, but user `bob` receives an "Operation not permitted" error if he attempts to execute `chown alice:alice secret.txt` to give his own file away?
  - _A:_ The Linux kernel enforces a strict security restriction on the `chown()` system call. Unprivileged users are explicitly blocked from "giving away" user ownership of their files to other users. This prevents malicious actors from bypassing user storage disk quotas, or planting malicious SetUID binaries and assigning them to high-privileged administrative users.
- _Query:_ A deployment script runs `chown -R appuser:appgroup /opt/app/`. The directory contains a symbolic link pointing to a critical system file in `/etc/`. What happens to the ownership of the file in `/etc/`?
  - _A:_ By default, `chown` recursively traversing a directory does _not_ follow symbolic links (due to the default `-P` behavior), meaning it will attempt to change the ownership of the symlink _file_ itself, leaving the critical target file in `/etc/` safely untouched. (However, if `chown` is run directly on the symlink without `-R`, it _will_ dereference it and alter the target file unless `-h` is passed).
- _Query:_ What automatic security action does the Linux kernel take the exact moment a file's ownership is altered via `chown`?
  - _A:_ As a hardcoded defense mechanism against privilege escalation, the kernel automatically strips and clears the SetUID (`4000`) and SetGID (`2000`) execution bits from the file's inode `st_mode` mask upon any successful ownership change.

## Practice Problems

- _Problem:_ Change the user ownership of all files and folders inside `/var/lib/postgresql/` to `postgres`, and set their group ownership to `db_admins`, recursively modifying the entire tree.
  - _Hint:_ Combine the recursive flag, the user and group identifiers separated by a colon, and the target path.
  - _Solution:_ `chown -R postgres:db_admins /var/lib/postgresql/` (This correctly reassigns the application state to the service daemon and administrative group).
- _Problem:_ Alter the group ownership of `script.sh` to `devops` without modifying the current user ownership, and print a diagnostic message only if a change successfully occurs.
  - _Hint:_ Leave the user field empty before the colon to behave like chgrp, and use the changes logging flag.
  - _Solution:_ `chown -c :devops script.sh` (This safely updates group boundaries and minimizes script output noise).

## References

- [GNU Coreutils - chown invocation](https://www.gnu.org/software/coreutils/manual/html_node/chown-invocation.html)
- [Man Page for chown (Linux)](https://man7.org/linux/man-pages/man1/chown.1.html)
