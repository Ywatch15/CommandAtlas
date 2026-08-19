---
slug: getfacl
name: getfacl
aliases: [get file access control lists]
category: permissions
tags: [linux, permissions, security, acl, filesystem, audit]
difficulty: advanced
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'view advanced file permissions linux'
  - 'read access control list'
  - 'check specific user file access'
  - 'view default directory acl'
  - 'backup acl permissions'
relatedCommands: [setfacl, chmod, ls, lsattr]
alternatives: []
status: draft
---

## What is it?

`getfacl` (get file access control lists) is a Linux command-line utility used to retrieve and display the extended Access Control Lists (ACLs) applied to files and directories. It exposes complex, multi-user and multi-group permission structures that standard POSIX permissions (`chmod`) are structurally incapable of representing.

## Why does it exist?

The traditional UNIX permission model (`ls -l`) is rigidly confined to exactly three entities: one Owner, one Group, and Others. This paradigm fails in modern collaborative environments. If a file needs to be read by User A, written by User B, and executed by Group C, standard `chmod` cannot accommodate it. Filesystem ACLs were introduced to allow infinite, granular permission mappings. `getfacl` exists because `ls -l` only indicates the presence of an ACL (by appending a `+` to the permission string); administrators require a dedicated tool to actually read, audit, and extract these hidden granular access rules.

## Syntax

```bash
getfacl [options] file ...
```

## Flags

| Flag                     | Description                                                                                          | Example                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| `-a`, `--access`         | Displays only the file access control list (the explicit user/group permissions).                    | `getfacl -a secret.txt`     |
| `-d`, `--default`        | Displays only the default access control list assigned to a directory (inheritance rules).           | `getfacl -d /shared/`       |
| `-c`, `--omit-header`    | Suppresses the output header lines (file name, owner, and group), printing only rules.               | `getfacl -c document.pdf`   |
| `-e`, `--all-effective`  | Calculates and displays the _effective_ rights alongside all rules, factoring in the ACL mask.       | `getfacl -e data.csv`       |
| `-E`, `--no-effective`   | Hides the calculation of effective rights, displaying only the raw assigned ACL rules.               | `getfacl -E data.csv`       |
| `-R`, `--recursive`      | Recursively descends through directories, listing the ACLs for every nested file and folder.         | `getfacl -R /var/www/`      |
| `-L`, `--logical`        | (With `-R`) Follows symbolic links and retrieves the ACL of the target file/directory.               | `getfacl -R -L ./symlinks/` |
| `-P`, `--physical`       | (With `-R`) Skips symbolic links during recursion, retrieving the ACL of the link itself (default).  | `getfacl -R -P ./symlinks/` |
| `-n`, `--numeric`        | Displays raw numeric User IDs (UIDs) and Group IDs (GIDs) instead of resolving string names.         | `getfacl -n audit.log`      |
| `-p`, `--absolute-names` | Disables stripping of the leading slash `/` on absolute paths (critical for creating exact backups). | `getfacl -p /etc/passwd`    |

## Examples

```bash
getfacl /var/www/html/index.html
```

> This outputs a highly readable block detailing the file name, owner, and group, followed by the explicit POSIX permissions (user, group, other) and any extended ACL users or groups (e.g., `user:deployer:rw-`) attached to the file.

```bash
getfacl -d /shared_data/
```

> This explicitly queries the Default ACLs (`-d`) applied to a directory. Default ACLs act as inheritance templates; any new file created inside `/shared_data/` will automatically inherit these exact permission rules, eliminating the need to run `chmod` on new files.

```bash
getfacl -R /project_files/ > acl_backup.txt
```

> This recursively iterates through an entire project hierarchy, capturing every single file and directory's ACL configuration. By redirecting this to a text file, administrators create a perfect, restorable backup of complex permission boundaries.

```bash
getfacl -c -e finance_report.xlsx
```

> This suppresses the metadata header (`-c`) to focus purely on the rules, and explicitly displays the calculated effective rights (`-e`). If an ACL grants a user `rwx`, but the global ACL mask is restricted to `r--`, `getfacl` will visibly show the effective permission is clamped to read-only.

```bash
getfacl -n /etc/shadow
```

> This queries the permissions using raw numeric IDs (`-n`). This is vital when analyzing files generated inside Docker containers or transferred from external systems where the local `/etc/passwd` mapping does not contain the corresponding username strings.

## Real-World Scenarios

**Auditing "Permission Denied" Mysteries**

```bash
ls -l my_script.sh # Shows -rwxrwx---+
getfacl my_script.sh
```

> A developer sees `rwx` group permissions in `ls -l` but still receives a "Permission Denied" error. Running `getfacl` reveals the `+` symbol indicates an active ACL, and exposes that a restrictive ACL `mask::r--` is clamping all extended permissions down to read-only, overriding the POSIX display.

**Migrating Servers with Preserved Permissions**

```bash
getfacl -R -p /data/app > acl_state.txt
# ... rsync data to new server ...
setfacl --restore=acl_state.txt
```

> Systems administrators migrating massive, collaboratively secured datasets between servers capture the exact ACL state using `getfacl` with absolute paths (`-p`), transferring the text payload to the new machine, and injecting it via `setfacl` to perfectly reconstruct thousands of complex permission assignments.

**Verifying Directory Inheritance Constraints**

```bash
getfacl /var/log/audit/
```

> Security compliance engines query directory ACLs to verify that Default inheritance rules enforce strict read-only parameters for secondary audit groups, satisfying rigid compliance mandates without relying on unreliable cron jobs to fix permissions post-creation.

## When should it NOT be used?

- **Checking basic Read/Write/Execute bits on standard files:** **Reason:** `getfacl` is overkill and overly verbose for standard files lacking extended access control matrices. **Use instead:** `ls -l` or `stat`.
- **Modifying or adding new permission rules:** **Reason:** `getfacl` is strictly a read-only query and reporting tool. **Use instead:** `setfacl`.

## Alternatives

- **`ls -l`:** Standard POSIX permission listing. **Tradeoff:** Extremely fast and universally understood, but physically incapable of displaying anything beyond UGO (User/Group/Other) bits, masking the true security posture if an ACL is present (indicated only by a `+`).
- **`stat`:** Inode telemetry display. **Tradeoff:** `stat` shows deep filesystem metadata (timestamps, block sizes, SELinux contexts), but like `ls`, it cannot evaluate or display extended POSIX ACL payloads.

## How it works internally

Access Control Lists on modern Linux filesystems (ext4, XFS, Btrfs) are stored inside **Extended Attributes** (`xattr`), specifically under the `system.posix_acl_access` and `system.posix_acl_default` attribute namespaces.

When you execute `getfacl file.txt`, the utility invokes the `getxattr()` and `acl_get_file()` C library system calls. The kernel intercepts this call, queries the file's physical inode on the disk, and retrieves the binary payload stored in the extended attribute block.

The `getfacl` utility decodes this binary structure. It translates the internal numeric UIDs and GIDs by querying the local Name Service Switch (`nsswitch.conf`, `/etc/passwd`). Crucially, it mathematically evaluates the interaction between the extended users/groups and the **ACL Mask**. The Mask acts as an absolute ceiling constraint on all extended entries and the standard POSIX group. `getfacl` calculates the bitwise `AND` between the granted permission and the Mask, dynamically rendering the `#effective:` comment line to show the true resulting permission state.

## Performance Notes

- Retrieving extended attributes introduces a minor but measurable disk I/O penalty compared to a standard `stat()` call, as the kernel must read secondary metadata blocks on the filesystem.
- Recursive execution (`-R`) across NAS mounts (like NFS or CIFS) can be exceedingly slow due to the massive volume of RPC calls required to retrieve discrete `xattr` payloads over the network.

## Security Notes

- **Mask Shadowing:** A severe security trap occurs when administrators rely solely on `ls -l`. If an ACL is active, the middle "Group" permission triplet displayed in `ls -l` does _not_ represent the owning group's permissions; it dynamically displays the value of the ACL **Mask**. You must run `getfacl` to understand who actually possesses what rights.
- **Backdoor Identification:** Advanced attackers possessing root access often apply hidden ACLs (e.g., granting full `rwx` to a compromised low-privilege service account) on critical system files like `/etc/shadow`. Because standard `ls -l` doesn't explicitly name the user, this backdoor remains hidden from casual observation until `getfacl` exposes it.

## Common Mistakes

- **Assuming standard commands preserve ACLs:** Running `cp` or `tar` to backup files and losing all ACLs. **Why it's wrong:** Standard utilities strip extended attributes by default. You must use `cp -p`, `tar --acls`, or `rsync -A` to preserve the granular permissions `getfacl` displays.
- **Misinterpreting effective rights:** A rule shows `user:bob:rwx` but Bob gets "Permission Denied". **Why it's wrong:** The user failed to read the adjacent `mask::r--` line or the `#effective:r--` comment. The mask clamps Bob's execution rights. Modifying the mask via `setfacl` is required to fix the flow.
- **Using relative paths for backups:** Running `getfacl -R . > backup.txt`. **Why it's wrong:** When restoring the ACL backup on a different machine or from a different working directory, `setfacl` will fail to find the relative paths. Always append `-p` to preserve absolute slashes.

## Best Practices

- When executing broad permission audits for compliance documentation, use `getfacl -R -e /secure_dir` to explicitly capture the calculated effective rights, ensuring auditors see the clamped, actual enforcement boundaries rather than theoretical assignments.
- If `ls -l` ever displays a plus sign (`-rw-rwxr--+`), immediately form the muscle memory to execute `getfacl` on that file before attempting to alter its permissions with `chmod`.
- Suppress the multi-line headers (`-c`) when writing bash scripts that grep `getfacl` output, preventing false-positive matches on the `owner:` or `group:` metadata fields.

## Interview Questions

- _Query:_ An administrator runs `ls -l` on a file and sees `-rwxrwx---+`. They run `chmod g-w` to strip write permissions from the group, but users are still modifying the file. What architectural nuance of Linux permissions is causing this, and how does `getfacl` expose the solution?
  - _A:_ The `+` symbol at the end of the `ls -l` output indicates the presence of an Access Control List (ACL). When an ACL is active, the "group" portion of the `chmod` string no longer represents the literal POSIX group; it represents the ACL Mask (the maximum allowable limit). Changing the group via `chmod` merely alters the mask, while the explicit extended user/group rules hidden inside the ACL continue granting write access. Running `getfacl` exposes the full matrix, revealing exactly which extended user/group rule is still permitting the unauthorized writes.
- _Query:_ What is the functional difference between querying the standard access ACL versus querying the Default ACL (`getfacl -d`) on a directory?
  - _A:_ The standard access ACL defines who can read, write, or traverse that specific directory. The Default ACL is an inheritance template. It does not dictate access to the directory itself; instead, it enforces that any new file or subfolder created _inside_ that directory automatically receives a predefined set of ACL rules upon creation.
- _Query:_ Why is it critical to append the `-p` (absolute names) flag when generating a comprehensive ACL backup text file using `getfacl -R /var/data > backup.txt`?
  - _A:_ By default, for safety reasons, `getfacl` strips the leading forward slash (`/`) from file paths in its output. If an administrator attempts to use this backup text file to restore permissions later via `setfacl --restore`, the command will attempt to apply the rules using relative paths based on the administrator's current working directory, corrupting permissions globally. The `-p` flag preserves the absolute `/var/data` paths, guaranteeing perfectly targeted restoration.

## Practice Problems

- _Problem:_ Retrieve the full Access Control List for the file `database_credentials.yml`, omitting the human-readable header metadata (file, owner, group) to return purely the operational rules.
  - _Hint:_ Combine the base command with the flag that suppresses the three-line header.
  - _Solution:_ `getfacl -c database_credentials.yml` (This isolates the raw rules, making visual parsing and regex integration cleaner).
- _Problem:_ Generate a recursive backup of all ACLs within the absolute path `/opt/app/secure_storage/`, ensuring that absolute paths are preserved and symbolic links are NOT followed, saving the payload to `acl_backup.txt`.
  - _Hint:_ Chain the recursive flag, physical resolution flag, and the absolute names flag, redirecting to a file.
  - _Solution:_ `getfacl -R -P -p /opt/app/secure_storage/ > acl_backup.txt` (This constructs a mathematically perfect, restorable snapshot of the directory's granular security posture).

## References

- [Man Page for getfacl (Linux)](https://man7.org/linux/man-pages/man1/getfacl.1.html)
- [Arch Linux Wiki - Access Control Lists](https://wiki.archlinux.org/title/Access_Control_Lists)
