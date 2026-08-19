---
slug: chgrp
name: chgrp
aliases: [change group]
category: permissions
tags: [linux, permissions, security, ownership, filesystem]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'change group ownership of file'
  - 'change file group linux'
  - 'recursively update folder group'
  - 'transfer file to different group'
  - 'chgrp command usage'
relatedCommands: [chown, chmod, setfacl, setgid, umask]
alternatives: [chown, setfacl]
status: draft
---

## What is it?

`chgrp` (change group) is a POSIX command-line utility used exclusively to change the group ownership of files and directories. It allows users to reassign collaborative access boundaries for a filesystem object without altering the individual user ownership.

## Why does it exist?

While `chown` can modify both user and group ownership simultaneously, `chgrp` was historically provided as a dedicated, simpler utility for unprivileged users. In UNIX, a standard user cannot give away file ownership to someone else (using `chown`), but they _can_ change the group ownership of a file to any group they are a member of. `chgrp` exists to facilitate this exact collaborative workflow, providing a strict, distinct tool for managing shared group permissions without invoking the complexities of absolute ownership transfer.

## Syntax

```bash
chgrp [OPTION]... GROUP FILE...
chgrp [OPTION]... --reference=RFILE FILE...
```

## Flags

| Flag                        | Description                                                                                     | Example                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `-R`, `--recursive`         | Operates on files and directories recursively, descending through the entire tree.              | `chgrp -R developers /var/www/`          |
| `-c`, `--changes`           | Like verbose, but only reports output when a group change is actually made.                     | `chgrp -c docker /run/docker.sock`       |
| `-v`, `--verbose`           | Outputs a diagnostic message for every file processed, regardless of whether it changed.        | `chgrp -v admins *.log`                  |
| `-f`, `--silent`, `--quiet` | Suppresses most error messages (e.g., permission denied on specific files).                     | `chgrp -f -R staff /home/`               |
| `--reference=<RFILE>`       | Copies the group ownership from a reference file and applies it to the target files.            | `chgrp --reference=model.txt target.txt` |
| `-h`, `--no-dereference`    | Changes the group of a symbolic link itself, rather than the file the link points to.           | `chgrp -h webadmin link_to_file`         |
| `--dereference`             | Changes the group of the file a symbolic link points to, rather than the link itself (default). | `chgrp --dereference sysadmin symlink`   |
| `-H`                        | (With `-R`) If a command line argument is a symlink to a directory, traverse it.                | `chgrp -R -H staff ./symlink_dir`        |
| `-L`                        | (With `-R`) Traverse every symbolic link to a directory encountered during recursion.           | `chgrp -R -L staff /var/data`            |
| `-P`                        | (With `-R`) Do not traverse any symbolic links during recursion (default safe behavior).        | `chgrp -R -P users /home/`               |

## Examples

```bash
chgrp developers project_build.sh
```

> This modifies the metadata of `project_build.sh`, reassigning its group ownership to the `developers` group so that all members of that group can interact with it (subject to `chmod` group permissions).

```bash
chgrp -R www-data /var/www/html/
```

> This recursively iterates through the entire web root directory, changing the group ownership of every nested folder and file to `www-data`, ensuring the web server daemon has appropriate group-level access to serve the content.

```bash
chgrp -c docker /var/run/docker.sock
```

> This targets a critical UNIX socket. The `-c` flag ensures the command remains completely silent unless the socket's group was actually incorrect and had to be modified, making it ideal for idempotent boot scripts.

```bash
chgrp -h staff my_symlink
```

> This uses the `-h` (no-dereference) flag to target the symbolic link file itself. Without this flag, `chgrp` would follow the symlink and alter the group ownership of the underlying destination file instead.

```bash
chgrp --reference=/etc/passwd my_shadow_copy
```

> This queries the `/etc/passwd` file, extracts its group ownership identifier, and mathematically applies that exact same group to `my_shadow_copy`, ensuring perfect ownership replication without needing to type or know the target group name.

## Real-World Scenarios

**Enabling Collaborative Shared Directories**

```bash
mkdir /opt/shared_project
chgrp project_team /opt/shared_project
chmod 2775 /opt/shared_project
```

> Systems administrators create a shared directory, use `chgrp` to assign it to a specific collaborative team, and then apply the `setgid` bit (`chmod 2`). This ensures that any new files created inside the directory by any user automatically inherit the `project_team` group ownership.

**Fixing Code Deployment Ownership**

```bash
chgrp -R nginx /usr/share/nginx/html/app
```

> When a developer copies files to a server using `scp` or `git`, the files belong to their personal user group. Deployment pipelines run `chgrp -R` to instantly hand group ownership of the deployed assets over to the web server's service account group.

## When should it NOT be used?

- **When changing both User and Group simultaneously:** **Reason:** Running `chown user file` then `chgrp group file` requires two system calls and double typing. **Use instead:** `chown user:group file` to accomplish both in a single atomic operation.
- **Granting access to multiple distinct groups:** **Reason:** A file in UNIX can only possess exactly one group owner at a time. **Use instead:** Access Control Lists (`setfacl -m g:group1:rx,g:group2:rx file`).

## Alternatives

- **`chown`:** Change owner. **Tradeoff:** `chown` is the modern superset tool. Typing `chown :groupname file` performs the exact same operation as `chgrp groupname file`. `chgrp` is technically redundant on modern systems but persists for POSIX compliance and unprivileged user workflows.
- **`setfacl`:** Extended ACLs. **Tradeoff:** Allows assigning permissions to groups without actually changing the file's primary core group ownership.

## How it works internally

When you execute `chgrp`, the utility translates the human-readable group name (e.g., `developers`) into a numeric Group ID (GID) by parsing the `/etc/group` file (or querying LDAP/Active Directory via the Name Service Switch, `nsswitch.conf`).

Once it obtains the numeric GID, `chgrp` invokes the `chown()` or `fchownat()` C system call. Internally, the Linux kernel doesn't have a separate syscall just for groups; `chown(file, uid, gid)` handles both. `chgrp` simply passes `-1` as the `uid` parameter, instructing the kernel to leave the user ownership completely untouched, while passing the new `gid` to be updated in the file's physical inode.

If the file has the SetUID (`4000`) or SetGID (`2000`) execution bits applied, the kernel intercepts the `chown()` syscall and automatically strips those bits away for security, preventing an attacker from writing a malicious SetUID script and then changing its group to execute it with elevated privileges.

## Performance Notes

- Executing `chgrp -R` on network-attached storage (NFS/CIFS) containing millions of tiny files is exceptionally slow. The utility must retrieve the inode state, issue a network RPC call to modify the metadata, and wait for confirmation sequentially for every single file.
- The `--reference` flag requires a preliminary `stat()` system call to read the reference file before applying the changes, adding negligible but measurable microsecond overhead.

## Security Notes

- **Unprivileged Execution:** A standard non-root user can execute `chgrp` on a file only if two strict conditions are met: they must be the owner of the file, AND they must actively be a member of the target group they are changing it to.
- **SetUID/SetGID Stripping:** Changing the group ownership of a binary file will cause the kernel to clear the SetUID and SetGID permission bits to prevent privilege escalation. They must be manually reapplied via `chmod` after running `chgrp`.

## Common Mistakes

- **Forgetting `-R` on directories:** Running `chgrp www-data /var/www`. **Why it's wrong:** This changes the group of the top-level `/var/www` folder, but all the HTML files and scripts inside it retain their old group ownership. You must use `-R` to cascade the change down the tree.
- **Accidentally altering symlink targets:** Running `chgrp developers /path/to/symlink`. **Why it's wrong:** By default, `chgrp` dereferences the symlink, reaching through it to change the group of the physical destination file. If you meant to change the symlink file itself, you must use `-h`.
- **Attempting to change to an unauthorized group:** A standard user tries to `chgrp root file.txt`. **Why it's wrong:** The kernel strictly rejects this with "Operation not permitted" because the user does not belong to the `root` group.

## Best Practices

- Prefer the syntax `chown :groupname file` over `chgrp groupname file` in automated provisioning scripts to standardize your toolchain entirely around the more versatile `chown` binary.
- When executing massive recursive group changes, utilize the `-c` (changes) flag instead of `-v` (verbose). It keeps the terminal and logging pipelines clean, outputting data only if an anomaly required correction.
- Ensure users are added to the correct supplementary groups via `usermod -aG` before writing scripts that rely on them successfully executing `chgrp`.

## Interview Questions

- _Query:_ In a modern Linux environment, what is the functional difference between executing `chgrp staff file.txt` and `chown :staff file.txt`?
  - _A:_ There is no functional or programmatic difference. Both commands ultimately resolve the string "staff" to a numeric GID and invoke the exact same underlying `chown()` system call in the Linux kernel, leaving the UID as `-1` (unchanged). `chgrp` is a legacy POSIX utility maintained for backwards compatibility and specific unprivileged user workflows.
- _Query:_ A developer owns a shell script that has the SetGID bit applied (`chmod 2755`). The developer runs `chgrp admins script.sh` to share it. When the admins try to run it, the SetGID behavior fails. Why?
  - _A:_ As a hardcoded security protection mechanism, the Linux kernel automatically strips away SetUID and SetGID permission bits the instant a file's user or group ownership is modified. This prevents an attacker from creating a malicious SetGID binary and passing it to a high-privilege group. The developer must re-run `chmod g+s script.sh` after the `chgrp` command.
- _Query:_ You want to change the group ownership of a symbolic link named `latest_log.lnk` to `audit_team`. However, when you run the command, the original log file changes group instead, and the symlink remains unchanged. How do you fix this?
  - _A:_ By default, `chgrp` dereferences symbolic links, passing the metadata change through the link to the underlying target file. To alter the metadata of the symbolic link itself, you must append the `-h` (no-dereference) flag: `chgrp -h audit_team latest_log.lnk`.

## Practice Problems

- _Problem:_ Recursively change the group ownership of the `/opt/app_data/` directory and all its contents to the group `finance`, printing a message only for the files that actually required a modification.
  - _Hint:_ Combine the recursive flag, the changes-only logging flag, and the target group.
  - _Solution:_ `chgrp -R -c finance /opt/app_data/` (This updates the tree efficiently while minimizing terminal log spam).
- _Problem:_ Change the group ownership of `report.csv` so that it matches exactly whatever group currently owns the file `template.csv`, without explicitly typing the group name.
  - _Hint:_ Utilize the reference file flag to clone ownership state.
  - _Solution:_ `chgrp --reference=template.csv report.csv` (This queries the template's inode and perfectly replicates its group ID onto the report file).

## References

- [GNU Coreutils - chgrp invocation](https://www.gnu.org/software/coreutils/manual/html_node/chgrp-invocation.html)
- [Man Page for chgrp (Linux)](https://man7.org/linux/man-pages/man1/chgrp.1.html)
