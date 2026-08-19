---
slug: syscall-file-metadata
name: File Metadata (stat, fstat, chmod, chown)
aliases: ['sys_stat', 'sys_chmod', 'sys_chown', 'inode metadata']
category: system-calls
tags: [c, linux, filesystem, kernel, security, permissions]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'read file size c program'
relatedCommands: ['ls', 'chmod', 'chown']
alternatives: []
status: draft
---

## What is it?

The file metadata system calls—comprising `stat()`, `fstat()`, `chmod()`, and `chown()`—are the low-level C POSIX interfaces utilized to interrogate and modify the structural attributes of files. Rather than accessing the raw bytes of a file's contents, these calls interact directly with the filesystem's `inode` structures maintained by the kernel, enabling developers to dynamically calculate file sizes, verify POSIX permission masks, audit creation timestamps, and alter access controls programmatically.

## Why does it exist?

Every filesystem abstraction (like `ext4` or `xfs`) relies on index nodes (inodes) to map logical filenames to physical disk blocks and enforce security boundaries. High-level utilities like `ls -l` or `chmod +x` are simply syntax wrappers around these core system calls. Without native access to `stat()` and `chmod()`, compiled C programs, daemons, and package managers would be fundamentally incapable of verifying if a target path is a directory before opening it, identifying if a file has been modified since it was last read, or securely dropping root privileges on generated output logs.

## Syntax

```c
#include <sys/stat.h>
#include <unistd.h>

// Interrogation
int stat(const char *pathname, struct stat *statbuf);
int fstat(int fd, struct stat *statbuf);
int lstat(const char *pathname, struct stat *statbuf);

// Manipulation
int chmod(const char *pathname, mode_t mode);
int fchmod(int fd, mode_t mode);
int chown(const char *pathname, uid_t owner, gid_t group);
int fchown(int fd, uid_t owner, gid_t group);
```

## Flags

_Note: These system calls rely on bitwise evaluation of the `st_mode` field inside the `struct stat` to interpret file types and permissions._

| Macro / Mask          | Description                                                                                                                     | Example                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `S_ISDIR(m)`          | A C macro that evaluates to true (non-zero) if the `st_mode` indicates the file is a directory.                                 | `if (S_ISDIR(st.st_mode))`                                 |
| `S_ISREG(m)`          | Evaluates to true if the file is a regular file (not a symlink, device, or socket).                                             | `if (S_ISREG(st.st_mode))`                                 |
| `S_ISLNK(m)`          | Evaluates to true if the file is a symbolic link. (Requires using `lstat` instead of `stat`).                                   | `if (S_ISLNK(st.st_mode))`                                 |
| `S_IRUSR`, `S_IWUSR`  | Bitmasks representing User (Owner) Read (`0400`) and Write (`0200`) permissions.                                                | `chmod("file", S_IRUSR                                     | S_IWUSR);`  |
| `S_IXGRP`, `S_IROTH`  | Bitmasks representing Group Execute (`0010`) and Others Read (`0004`) permissions.                                              | `mode                                                      | = S_IXGRP;` |
| `S_ISUID`             | The Set-User-ID bitmask (`04000`). Triggers privilege escalation during execution.                                              | `chmod("bin", st.st_mode                                   | S_ISUID);`  |
| `AT_SYMLINK_NOFOLLOW` | A flag used in modern `fstatat()` and `fchownat()` calls to ensure operations target the symlink itself, not the resolved file. | `fchownat(AT_FDCWD, path, uid, gid, AT_SYMLINK_NOFOLLOW);` |

## Examples

```c
struct stat st;
if (stat("/etc/passwd", &st) == 0) {
    printf("File Size: %lld bytes\n", (long long)st.st_size);
    printf("Inode Number: %ld\n", (long)st.st_ino);
}
```

> The standard metadata query. `stat()` receives a path and populates the pre-allocated `struct stat` in memory. It accesses the `st_size` (total byte length) and `st_ino` (physical inode number) properties securely without ever opening the file stream for reading.

```c
struct stat st;
int fd = open("log.txt", O_RDONLY);
if (fstat(fd, &st) == 0 && S_ISDIR(st.st_mode)) {
    fprintf(stderr, "Error: Expected a file, got a directory.\n");
    close(fd);
}
```

> Security verification via `fstat`. By opening a file descriptor first and passing the integer (`fd`) to `fstat()`, the program securely queries the exact object it is about to read. Using the `S_ISDIR` macro protects the application from crashing if a user maliciously symlinks the target path to a directory.

```c
// chmod 644
if (chmod("output.dat", S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH) != 0) {
    perror("chmod failed");
}
```

> Hardcoding permission changes. Instead of relying on `umask` or the `system()` function to call the `/bin/chmod` binary, the C program alters the file's mode directly by evaluating a bitwise OR combination of standard POSIX octal masks.

```c
// Change owner to uid 1000, keep existing group (-1)
if (chown("/var/app/data", 1000, -1) != 0) {
    perror("chown failed");
}
```

> Modifying ownership dynamically. `chown()` accepts the absolute numeric UID and GID integers, not string names. By passing `-1` as the GID parameter, the kernel knows to leave the group ownership completely unchanged, isolating the modification strictly to the user ownership.

## Real-World Scenarios

**`ls -l` Implementation**

> The quintessential `ls` utility relies entirely on these system calls. It calls `opendir()`, reads each filename via `readdir()`, and executes `lstat()` on every single file in the directory. It parses the `st_mode` integer bitwise to generate the `-rw-r--r--` string, and queries the `st_uid` and `st_gid` against the `/etc/passwd` parsing library to print human-readable ownership columns.

**Makefiles and Build Systems**

> Compilation tools like `make` or `ninja` determine whether a massive C++ project needs to be recompiled by heavily utilizing `stat()`. They extract the `st_mtime` (Last Modification Time) of the `.cpp` source file and compare it mathematically to the `st_mtime` of the compiled `.o` object file. If the source file timestamp is newer, the compiler rebuilds the target.

## When should it NOT be used?

- **Checking existence before opening (TOCTOU):** **Do not use `stat()` to check if a file exists right before calling `open()`.** This creates a Time-of-Check to Time-of-Use race condition. An attacker can replace the file with a malicious symlink in the microsecond between the `stat()` call and the `open()` call. Always `open()` the file directly and handle the `ENOENT` failure, or use `fstat()` on the file descriptor _after_ opening it safely.
- **Parsing massive directories:** Executing `stat()` sequentially on 100,000 files in a directory will crush a mechanical hard drive via heavy metadata I/O seeks. If you only need file types (Directory vs File), use the `d_type` field directly embedded in the `dirent` struct returned by `readdir()` to completely avoid issuing 100,000 `stat()` system calls.

## Alternatives

- **`fstatat()`, `fchmodat()`, `fchownat()`:** **The modern, secure `*at` family.** Resolves paths relative to an explicit directory file descriptor rather than the process's working directory. This fundamentally eradicates directory-traversal race conditions during recursive operations.
- **`statx()`:** **Best for modern performance.** Introduced in Linux 4.11, `statx()` allows the programmer to specify _exactly_ which metadata fields they want (e.g., just the size, skipping timestamps). This prevents the kernel from triggering unnecessary internal locking or fetching metadata over slow network mounts (like NFS) when the data isn't needed.

## How it works internally

When a C program calls `stat("/tmp/data", &st)`, it transitions into kernel space via a software interrupt (syscall).

The Linux kernel's Virtual File System (VFS) intercepts the call. It initiates a path lookup, traversing the directory tree (`/`, then `tmp`, then `data`) to locate the target `dentry` (directory entry) and its underlying `inode` in the system cache.

If the inode is not in the RAM cache, the specific filesystem driver (e.g., `ext4`) reads the inode directly from the physical disk platter.
The kernel extracts the raw attributes from the `inode` structure:

- `i_size` maps to `st_size`.
- `i_uid` and `i_gid` map to `st_uid` and `st_gid`.
- `i_mtime`, `i_atime`, and `i_ctime` map to the respective timestamp fields.
- `i_mode` maps to `st_mode`, containing both the 12-bit permission mask and the file type bits.

The kernel securely copies this populated `struct stat` from kernel-space memory back into the user-space pointer `&st` provided by the application, and returns `0`.

For manipulation calls like `chmod()` or `chown()`, the kernel fetches the inode, verifies that the calling process's Effective UID matches the file's owner (or possesses `CAP_FOWNER` / `CAP_CHOWN` capabilities), modifies the internal `i_mode` or `i_uid` fields, and marks the inode as "dirty." The filesystem driver will asynchronously flush this dirty inode back to the physical disk later.

## Performance Notes

- **`stat()` vs `lstat()` vs `fstat()`:** `fstat()` is mathematically the fastest operation. `stat()` and `lstat()` require the kernel to parse the string path, traverse the directory tree, and evaluate permissions at every node. `fstat()` uses an already-open file descriptor, meaning the kernel immediately looks up the file descriptor table array in `O(1)` time and accesses the cached inode directly.

## Security Notes

- **The Symlink Trap:** Using `chmod()` or `chown()` on a string path that happens to be a symbolic link will _follow the link_ and silently alter the permissions of the underlying target file, not the link itself. If an application blindly runs `chmod()` on files in `/tmp`, an attacker can plant a symlink to `/etc/shadow`, tricking the application into making the password file world-writable. You must use `lchown()` or `fchmodat(..., AT_SYMLINK_NOFOLLOW)` to safely alter symlinks.
- **SUID Stripping:** As a hardcoded kernel security feature, if an application calls `chown()` or `chmod()` on an executable file, the Linux kernel will aggressively, silently strip the `setuid` and `setgid` bits (`S_ISUID` and `S_ISGID`) from the file to prevent unauthorized users from hijacking newly transferred privilege execution vectors.

## Common Mistakes

- **Modifying modes via decimals instead of octals**
  - _Mistake:_ Calling `chmod("file.txt", 644);`
  - _Why:_ In C, the literal `644` is a base-10 decimal integer (which translates to `1204` in octal, a completely invalid permission mask). File modes mathematically require base-8 (octal) representation. You must prefix the number with a zero: `chmod("file.txt", 0644);`, or vastly preferably, use the `S_IRUSR | S_IWUSR` bitwise macros for code safety.
- **Assuming `st_size` reflects disk usage**
  - _Mistake:_ Using `st_size` to determine how many bytes a file consumes on the hard drive.
  - _Why:_ `st_size` reports the logical, apparent size of the file payload. If a file is sparse (contains huge empty null blocks), `st_size` might report 10 Gigabytes, while the file only physically consumes 4 Kilobytes of disk space. To calculate actual disk usage, you must use the `st_blocks` field (multiplying it by 512, the standard block sector size).

## Best Practices

- **Embrace `fstat` validation:** When opening a file to read it, the most ironclad security pattern is: `fd = open(path); fstat(fd, &st); if (!S_ISREG(st.st_mode)) close(fd);`. This absolutely guarantees you are reading standard text and not accidentally streaming a blocking FIFO socket or tape drive device node into memory.
- **Preserve bits when applying `chmod`:** Do not blindly overwrite permissions. Use `stat()` to get the current `st_mode`, modify the bits, and apply it back: `chmod(path, st.st_mode | S_IWUSR)`. This ensures you don't accidentally wipe out the file's executable bits while trying to grant write access.

## Interview Questions

**Q: Explain the exact architectural vulnerability introduced by a Time-of-Check to Time-of-Use (TOCTOU) race condition when using `stat()` followed by `open()`, and how `fstat()` mitigates it.**
**A:** If a program runs `stat("/tmp/file")` to verify it is a safe text file, and then immediately calls `open("/tmp/file")`, a malicious user can exploit the microsecond delay between the two syscalls. They can delete `/tmp/file` and replace it with a symlink pointing to `/etc/shadow`. The `open()` call blindly follows the new symlink, granting the application unintended access to sensitive data. `fstat()` mitigates this because the application calls `open()` _first_, acquiring an immutable file descriptor handle. It then calls `fstat(fd)` on that handle. The kernel returns the metadata for the exact, physically locked file object the descriptor is attached to, rendering symlink hijacking mathematically impossible.

**Q: You want to query the metadata of a symbolic link itself, rather than the file it points to. Which system call must you use, and why does standard `stat()` fail to do this?**
**A:** You must use `lstat()` (link-stat). The standard `stat()` system call is designed by the kernel to automatically follow and resolve symbolic links to their final target destinations. If you `stat()` a symlink, you receive the `st_mode` and `st_size` of the target file. `lstat()` intentionally halts the path traversal engine when it hits a symlink, returning the metadata of the symlink's inode itself.

## Practice Problems

**Problem:** You have a populated `struct stat st`. Write a standard C `if` statement to check if the file object is a directory AND that the file is writable by the Owner.
**Hint:** Use the specific macro for directories, and a bitwise AND operator against the `st_mode` field using the Owner Write macro.
**Solution:**

```c
if (S_ISDIR(st.st_mode) && (st.st_mode & S_IWUSR)) {
    // Directory is owner-writable
}
```

**Problem:** You are writing a daemon in C. You need to change the permissions of a log file string path to `0600` (Read/Write for Owner only). Write the complete, single-line system call invocation to do this using octal notation, ignoring error handling for this snippet.
**Hint:** The system call accepts a string path and a base-8 mode integer.
**Solution:**

```c
chmod("/var/log/daemon.log", 0600);
```

## References

- [stat(2) - Linux manual page](https://man7.org/linux/man-pages/man2/lstat.2.html)
- [chmod(2) - Linux manual page](https://man7.org/linux/man-pages/man2/chmod.2.html)
