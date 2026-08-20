---
slug: fuser
name: fuser
aliases: []
category: processes
tags:
  - linux
  - processes
  - files
  - sockets
  - diagnostics
  - networking
difficulty: intermediate
supportedOS:
  - linux
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - find process using a file
  - check what process is listening on port
  - kill process locking file
  - identify open sockets fuser
  - see who is using a directory
relatedCommands:
  - lsof
  - netstat
  - ss
  - kill
  - ps
  - pgrep
alternatives:
  - lsof
  - ss
status: draft
---

## What is it?

`fuser` (file user) is a powerful diagnostic command-line utility used to identify which processes are currently utilizing a specific file, directory, or network socket. It queries the kernel to return the Process IDs (PIDs) of the locking applications, and can optionally send termination signals directly to those processes to force-release the locked resources.

## Why does it exist?

Administrators frequently encounter "Device or resource busy" errors when attempting to unmount a filesystem, or "Address already in use" errors when starting a web server. Standard process monitors (`ps`) do not natively map processes to the specific files or ports they hold open. `fuser` exists to bridge this gap, quickly cross-referencing physical filesystem inodes and virtual network sockets against the kernel's process tables, providing an immediate resolution path for locked resources.

## Syntax

```bash
fuser [options] [name...]
```

## Flags

| Flag                  | Description                                                                                   | Example                    |
| --------------------- | --------------------------------------------------------------------------------------------- | -------------------------- |
| `-k`, `--kill`        | Kills processes accessing the file. (Defaults to SIGKILL on some systems, SIGTERM on others). | `fuser -k /var/log/syslog` |
| `-i`, `--interactive` | Asks the user for confirmation before killing a process (used with `-k`).                     | `fuser -ki 8080/tcp`       |
| `-m`, `--mount`       | Specifies that the name refers to a mounted filesystem or block device.                       | `fuser -m /mnt/nfs_share`  |
| `-u`, `--user`        | Appends the username of the process owner to each PID in the output.                          | `fuser -u /etc/passwd`     |
| `-v`, `--verbose`     | Provides `ps`-like detailed output, including PID, USER, ACCESS type, and COMMAND.            | `fuser -v /var/lib/mysql`  |
| `-n <space>`          | Specifies the namespace (`file`, `udp`, `tcp`) if it cannot be inferred.                      | `fuser -n tcp 443`         |
| `-4`, `--ipv4`        | Restricts network socket searches strictly to IPv4.                                           | `fuser -4 -n tcp 80`       |
| `-6`, `--ipv6`        | Restricts network socket searches strictly to IPv6.                                           | `fuser -6 -n tcp 80`       |
| `-s`, `--silent`      | Silent operation; suppresses standard output, relying purely on exit codes.                   | `fuser -s /tmp/lockfile`   |
| `-a`, `--all`         | Shows all specified files in the output, even if no processes are currently accessing them.   | `fuser -a /tmp/cache*`     |
| `-signal`             | Sends a specific POSIX signal (e.g., `-15` for SIGTERM) instead of the default SIGKILL.       | `fuser -k -15 80/tcp`      |

## Examples

```bash
fuser /var/log/auth.log
```

> This queries the kernel for the specified file and outputs a list of PIDs holding it open, followed by a single-letter access code (e.g., `f` for open file, `c` for current directory).

```bash
fuser -v -n tcp 8080
```

> This checks for processes bound to TCP port 8080. The verbose (`-v`) flag expands the output into a readable table, revealing exactly which application (e.g., `java` or `node`) and user is occupying the port.

```bash
fuser -k -15 -i /mnt/data_volume
```

> When attempting to unmount a busy volume, this commands `fuser` to send a graceful SIGTERM (`-15`) to all offending processes locking the mount point, prompting the administrator for a [y/n] confirmation (`-i`) for each PID before executing the kill.

```bash
fuser -u /usr/bin/bash
```

> This identifies every active process currently executing the `bash` binary, appending the username (`-u`) to each PID, allowing an administrator to see exactly who has active shell sessions on the host.

```bash
fuser -m /dev/sda1
```

> This inspects the entire block device or filesystem mount (`-m`). Rather than checking a single file, it returns every single process interacting with any file physically located on the `/dev/sda1` partition.

## Real-World Scenarios

**Freeing Locked Network Ports**

```bash
sudo fuser -k 443/tcp
```

> During a botched deployment where an Nginx container crashes but leaves an orphaned daemon binding port 443, CI/CD remediation scripts or operators execute `fuser -k` to aggressively locate and kill the zombie process, freeing the port for the new container instantly.

**Safely Forcing Filesystem Unmounts**

```bash
fuser -v -m /mnt/backup_share
# Review the output, then...
fuser -k -m /mnt/backup_share && umount /mnt/backup_share
```

> An administrator needs to detach a hung NFS or CIFS share, but `umount` returns "target is busy". They use `fuser` to map the users whose bash sessions or scripts are stuck inside the mount, aggressively terminating those specific sessions to release the kernel lock.

**Debugging "Text file busy" Errors**

```bash
fuser /usr/local/bin/custom_daemon
```

> A developer attempting to overwrite a running binary via `cp` receives a "Text file busy" error because the Linux kernel prevents modifying executable text segments currently loaded in memory. `fuser` instantly reveals the PID of the running instance preventing the overwrite.

## When should it NOT be used?

- **Deep forensic file/socket inspection:** **Reason:** `fuser` only provides basic mapping (PID to file). It does not display deep socket states (like `TIME_WAIT`), internal inodes, or exact command-line arguments. **Use instead:** `lsof` or `ss`.
- **Killing critical system processes blindly:** **Reason:** Executing `fuser -k /usr/lib/libc.so.6` will instantly slaughter almost every critical process on the system relying on the C standard library, causing an immediate kernel panic. Always use `-i` (interactive) or `-v` (verbose) to review targets first.

## Alternatives

- **`lsof` (List Open Files):** The comprehensive standard. **Tradeoff:** `lsof` provides drastically more metadata and profound kernel visibility, but lacks `fuser`'s convenient, built-in process termination (`-k`) flags.
- **`ss -p` (Socket Statistics):** Network-specific inspection. **Tradeoff:** `ss` is infinitely faster for evaluating network sockets over Netlink APIs, but it cannot inspect standard local files or block devices like `fuser` can.

## How it works internally

`fuser` operates entirely in user space by heavily traversing the `/proc` virtual filesystem.

When executed, `fuser` iterates sequentially through every numeric process directory (`/proc/[PID]/`). It parses subdirectories like `/proc/[PID]/fd/` (open file descriptors), `/proc/[PID]/cwd` (current working directory), `/proc/[PID]/exe` (the executing binary), and `/proc/[PID]/mmap` (memory-mapped files).

It compares the inode and device ID of the target file/port against the symbolic links exposed in these `/proc` directories. For network sockets (e.g., `80/tcp`), it first reads `/proc/net/tcp` to map the port to a specific internal socket inode, and then performs the identical traversal through `/proc/[PID]/fd/` looking for that specific inode match. If the `-k` flag is specified, `fuser` extracts the matching PID and invokes the `kill()` system call to dispatch the requested signal.

## Performance Notes

- Executing `fuser` on a system with tens of thousands of active processes incurs significant CPU latency. Because it relies on sequential text-parsing of thousands of directories inside `/proc`, it is inherently slower than binary API queries (like `ss`).
- Running `fuser` on a massive, highly utilized NFS mount (`fuser -m`) can cause the command to hang if the network storage is experiencing latency, as the kernel struggles to `stat()` the massive number of open file handles over RPC.

## Security Notes

- **Privilege Constraints:** The Linux kernel strictly isolates the `/proc/[PID]/fd/` directories. Standard users can only inspect file descriptors belonging to processes they explicitly own. To map ports owned by system daemons or other users, `fuser` must be executed with `root` privileges (`sudo`).
- **Signal Authority:** Users can only utilize the `-k` (kill) flag against processes they own, preventing unprivileged users from using `fuser` to assassinate root-level services locking shared files.

## Common Mistakes

- **Assuming `-k` is a safe default:** Running `fuser -k 80/tcp`. **Why it's wrong:** Depending on the OS distribution (e.g., older SysV systems vs modern Systemd), `-k` may default to sending `SIGKILL` (-9) instead of `SIGTERM` (-15). `SIGKILL` destroys the process instantly, preventing database syncs or cache flushes, causing data corruption. Always specify the signal: `fuser -k -15 80/tcp`.
- **Using port numbers without namespace definitions:** Running `fuser 80`. **Why it's wrong:** While modern `fuser` tries to guess, strictly specifying `80/tcp` or `fuser -n tcp 80` prevents the utility from mistakenly matching a local file on disk that happens to be named "80".

## Best Practices

- Always execute `fuser -v <target>` to visually confirm the blast radius before ever appending the `-k` flag to execute terminations.
- When writing idempotent cleanup scripts, use `fuser -s <target>` as a silent conditional check (`if fuser -s /tmp/lock; then...`) to branch logic gracefully without polluting standard output.
- Prioritize `SIGTERM (-15)` when scripting kills: `fuser -k -TERM 8080/tcp`. Only fall back to `SIGKILL (-9)` if a secondary `fuser` check proves the process is hung in a zombie state.

## Interview Questions

- _Query:_ An operations engineer runs `fuser -m /mnt/data` to find out who is locking a network share, but the command returns no output. However, `umount /mnt/data` still fails with "target is busy". What is the most likely reason `fuser` failed to see the locking process?
  - _A:_ The engineer likely ran `fuser` as a standard, unprivileged user. The `/proc/[PID]/fd/` directories are protected by strict kernel access controls. If the process locking the mount point is owned by `root` or another user, a standard user cannot see its file descriptors. The command must be run with `sudo fuser -m /mnt/data` to gain absolute visibility.
- _Query:_ What do the single-letter access codes (like `c`, `e`, `f`) mean when `fuser` returns a list of PIDs?
  - _A:_ The codes designate exactly _how_ the process is interacting with the file. `c` means the file is the process's current working directory. `e` means the file is the actual executable binary being run. `f` indicates standard open file descriptor (read/write access), and `m` indicates the file is a mapped library or shared object.
- _Query:_ How does `fuser` interact with the kernel to determine which process is listening on a specific TCP port?
  - _A:_ `fuser` reads the `/proc/net/tcp` (or `tcp6`) virtual file to find the hex-encoded local port and extracts its associated socket inode number. It then iterates through every running process directory in `/proc/[PID]/fd/`, examining the symbolic links of open file descriptors to find a direct match against that specific socket inode.

## Practice Problems

- _Problem:_ Find out exactly which process and user is currently bound to and listening on TCP port 3306, outputting the results in a detailed, readable table.
  - _Hint:_ Target the tcp namespace, specify the port, and use the verbose output flag.
  - _Solution:_ `sudo fuser -v -n tcp 3306` (This provides the comprehensive PID, USER, and COMMAND mapping).
- _Problem:_ Safely terminate all processes locking the `/opt/app/` directory by sending them a graceful `SIGTERM` signal, ensuring the system prompts you for confirmation before each kill.
  - _Hint:_ Combine the kill flag, the specific signal override, the interactive flag, and the mount/directory flag.
  - _Solution:_ `sudo fuser -k -15 -i -m /opt/app/` (This executes a controlled, operator-verified teardown of directory locks).

## References

- [Man Page for fuser (Linux)](https://man7.org/linux/man-pages/man1/fuser.1.html)
- [The /proc Filesystem Documentation](https://www.kernel.org/doc/Documentation/filesystems/proc.txt)
  === END FILE ===
