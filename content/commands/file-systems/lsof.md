---
slug: lsof
name: lsof
aliases: [list open files]
category: file-systems
tags: [linux, processes, files, networking, debugging, system-administration]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'list open files linux'
  - 'find process using port'
  - 'find deleted files taking up space'
  - 'check what process has file locked'
  - 'list network connections lsof'
relatedCommands: [ps, umount]
alternatives: []
status: draft
---

## What is it?

`lsof` (List Open Files) is a comprehensive diagnostic utility used to report a list of all open files and the processes that opened them. Because Unix and Linux operating systems treat almost everything as a file—including regular files, directories, block devices, character devices, network sockets, and pipes—`lsof` provides profound visibility into the operating state of the system kernel and active applications.

## Why does it exist?

When a file is locked, a network port is mysteriously occupied, or a deleted file continues to consume disk space because an active process is still writing to it, administrators need to map the blocked resource back to the offending application. Standard tools like `ps` only show running processes, and `ls` only shows disk structure. `lsof` exists to bridge this gap, querying the kernel's file descriptor tables to link physical resources, network sockets, and system pipes directly to the process ID (PID) utilizing them.

## Syntax

```bash
lsof [options] [file...]
```

## Flags

| Flag          | Description                                                                              | Example                          |
| ------------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| `-i`          | Lists files matching network Internet addresses (IPv4, IPv6, ports, protocols).          | `lsof -i :8080`                  |
| `-p <PID>`    | Restricts the output to files opened by a specific Process ID.                           | `lsof -p 1234`                   |
| `-u <user>`   | Restricts the output to files opened by a specific system username or UID.               | `lsof -u nginx`                  |
| `-c <string>` | Restricts output to processes whose command name begins with the provided string.        | `lsof -c sshd`                   |
| `+D <dir>`    | Recursively searches the specified directory for any open files.                         | `lsof +D /var/log/`              |
| `-n`          | Inhibits the conversion of IP network numbers to host names (disables DNS lookups).      | `lsof -n -i`                     |
| `-P`          | Inhibits the conversion of network port numbers to port names (disables port lookups).   | `lsof -P -i :443`                |
| `-t`          | Terse mode; outputs only the raw PIDs of matching processes, ideal for scripting.        | `lsof -t -i :80`                 |
| `-iTCP`       | Limits network listing specifically to TCP sockets.                                      | `lsof -iTCP -sTCP:LISTEN`        |
| `-a`          | ANDs the selections together; requires multiple conditions to be met simultaneously.     | `lsof -a -u dbadmin -c postgres` |
| `+L1`         | Displays open files that have a link count of less than 1 (i.e., deleted but held open). | `lsof +L1`                       |

## Examples

```bash
lsof /var/log/syslog
```

> This queries the specific file path and outputs the process name, PID, and user of whatever application is currently holding the syslog file open for reading or writing.

```bash
lsof -i :8080 -n -P
```

> This identifies the exact process bound to TCP/UDP port 8080. The `-n` and `-P` flags disable DNS and port name resolution, ensuring the command executes instantly without hanging on network lookups.

```bash
lsof -u deployer -a -c node
```

> This uses the logical AND flag (`-a`) to find all open files and sockets strictly owned by the `deployer` user _and_ executing a command starting with `node`.

```bash
lsof +L1
```

> This lists all "deleted" files that are still held open in memory by an active process, solving the classic mystery of why disk space does not increase immediately after deleting a massive log file.

```bash
lsof -t -i :3000 | xargs kill -9
```

> This pipes the terse output (`-t`) of PIDs bound to port 3000 directly into the `kill` command, forcefully freeing up the network port blocked by a zombie process.

## Real-World Scenarios

**Freeing Locked Network Ports During Deployments**

```bash
lsof -i :443 -t | xargs kill -15
```

> CI/CD deployment pipelines that fail because "Address already in use" utilize `lsof` to quickly identify the zombie service holding port 443 open and terminate it, allowing the new container to bind successfully.

**Safely Unmounting Busy Filesystems**

```bash
lsof +D /mnt/nfs-share
```

> Systems administrators attempting to `umount /mnt/nfs-share` and receiving a "target is busy" error run this command to recursively identify exactly which user's bash session or background script is keeping the directory locked.

**Recovering Deleted Files from Memory**

```bash
lsof -p 4421 | grep deleted
```

> If an engineer accidentally deletes a critical production log file while a process (PID 4421) is still actively writing to it, they can use `lsof` to find the file descriptor mapping (e.g., `4w`) and copy the raw data out of the kernel via `cat /proc/4421/fd/4 > recovered.log`.

## When should it NOT be used?

- **High-frequency, real-time network connection monitoring:** **Reason:** `lsof` scans massive kernel state tables (like `/proc/`) sequentially, making it incredibly CPU-intensive and slow for polling thousands of ephemeral TCP connections. **Use instead:** `ss` or `netstat`.
- **Checking basic process CPU/Memory usage:** **Reason:** `lsof` tracks file descriptors, not compute resource consumption. **Use instead:** `top`, `htop`, or `ps`.

## Alternatives

- **`ss` (Socket Statistics):** Network socket inspection. **Tradeoff:** `ss` leverages kernel netlink sockets, making it orders of magnitude faster than `lsof` for querying active network connections, but it cannot inspect standard filesystem files or directories.
- **`fuser`:** Identifies processes using files or sockets. **Tradeoff:** `fuser` is simpler and includes built-in kill flags (`fuser -k`), but provides significantly less diagnostic metadata regarding file modes and sizes compared to `lsof`.

## How it works internally

`lsof` operates by performing an exhaustive traversal of the `/proc` virtual filesystem and reading kernel memory structures.

For every running process on the system, `lsof` reads `/proc/<PID>/fd/` to map the file descriptor integers to their symbolic links (which point to physical inodes, pipes, or sockets). It maps these inodes back to the filesystem mounts via `/proc/mounts`.

For network connections, it cross-references the file descriptors with networking tables like `/proc/net/tcp` and `/proc/net/udp` to map sockets to specific IP addresses and ports. Because iterating over thousands of PIDs and resolving millions of file descriptors is computationally heavy, `lsof` takes a snapshot of the state; it is not a real-time monitor. The output reflects the state at the exact millisecond the `/proc` tree was traversed.

## Performance Notes

- Executing `lsof` without the `-n` (no DNS resolution) and `-P` (no port resolution) flags causes the command to hang for several minutes on busy servers as it attempts reverse-DNS lookups on hundreds of remote IP addresses via network requests.
- Running a global `lsof` on a massive database server with millions of open file descriptors will cause a brief but severe spike in CPU usage as it iterates through `/proc`.

## Security Notes

- **Root Privilege Requirement:** While unprivileged users can execute `lsof`, the kernel strictly isolates `/proc/<PID>/fd` directories. Standard users will _only_ see files opened by their own processes. Running `sudo lsof` is mandatory to gain a complete, system-wide view of network ports and files.
- **Information Disclosure:** `lsof` reveals exact file paths, remote IP connections, and command-line arguments of running processes. Outputting global `lsof` logs to public monitoring dashboards exposes severe architectural and security topology details.

## Common Mistakes

- **Forgetting `-n -P`:** Running `lsof -i` and assuming the server froze. **Why it's wrong:** The server didn't freeze; `lsof` is executing synchronous reverse-DNS lookups for every active socket. Always use `-nP` for immediate output.
- **Misunderstanding logical OR vs AND:** Running `lsof -u nginx -c sshd` expecting processes matching both. **Why it's wrong:** By default, `lsof` logically ORs filters. This lists _all_ files opened by nginx PLUS _all_ files opened by sshd. You must pass `-a` to AND them together.
- **Ignoring the `deleted` flag:** Deleting a 50GB file and wondering why `df -h` still shows the disk as 100% full. **Why it's wrong:** Deleting unlinks the name, but the kernel preserves the inode data on disk as long as any process holds the file descriptor open. Use `lsof +L1` to find the zombie process holding the data.

## Best Practices

- Always alias or muscle-memory the flags `-nP` when invoking network commands to prevent severe hangs caused by DNS resolution delays.
- When automating server maintenance scripts, utilize the terse `-t` flag to output raw PIDs directly into pipelines (e.g., `kill`).
- To safely debug "Device or resource busy" unmount errors, strictly use `lsof +D /path/to/mount` to recursively identify blocking processes.

## Interview Questions

- **Q:** A junior engineer deletes a massive log file to free up space, but the disk is still 100% full. How do you use `lsof` to identify the problem?
  - **A:** In Linux, deleting a file removes the hard link, but the OS does not free the disk blocks if an active process still holds an open file descriptor pointing to that inode. I would run `sudo lsof +L1` to list all deleted files still held open in memory, identify the PID (e.g., a logging daemon), and restart that process to release the file descriptor and free the disk space.
- **Q:** Why is the combination of `-n` and `-P` flags critical when running `lsof -i` on a production server?
  - **A:** `-n` disables reverse DNS lookups for IP addresses, and `-P` disables translating port numbers into service names. Without these flags, `lsof` issues synchronous network requests to resolve every single active socket connection. On a busy server, this can cause the command to hang for minutes and heavily impact network resolvers.
- **Q:** By default, does `lsof -u root -i :80` show files that are either owned by root OR using port 80, or both simultaneously? How do you change this behavior?
  - **A:** By default, `lsof` applies a logical OR to selection criteria, meaning it will list all files owned by root PLUS all processes using port 80. To find processes that meet _both_ conditions simultaneously, you must pass the `-a` (AND) flag: `lsof -a -u root -i :80`.

## Practice Problems

- **Problem:** Find the exact Process ID (PID) of the application currently bound to local TCP port 5432, without hanging on DNS lookups, and output only the PID.
  - _Hint:_ Combine the network interface flag, disable DNS/ports, and use the terse output flag.
  - _Solution:_ `lsof -t -nP -i :5432` (This outputs the raw PID immediately, disabling all resolution protocols).
- **Problem:** Recursively list all open files inside the `/var/www/html` directory to find out what process is actively locking web assets.
  - _Hint:_ Use the specific directory recursion flag.
  - _Solution:_ `lsof +D /var/www/html` (The `+D` flag descends into the specified directory tree, matching any open files within it against active processes).

## References

- [Man Page for lsof (Linux)](https://man7.org/linux/man-pages/man8/lsof.8.html)
- [Linux System Administrator's Guide - Diagnosing with lsof](https://tldp.org/LDP/sag/html/)
