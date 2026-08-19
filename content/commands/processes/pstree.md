---
slug: pstree
name: pstree
aliases: []
category: processes
tags:
  - linux
  - process-management
  - sysadmin
  - observation
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
  - show process tree linux
  - view process hierarchy
  - find parent process of pid
  - see threading model of process
  - trace process execution tree
relatedCommands:
  - ps
  - top
  - pgrep
  - pidof
alternatives:
  - htop
status: draft
---

## What is it?

`pstree` is a command-line visualization utility that displays the active processes on a Linux system structured as a hierarchical tree. Instead of presenting a flat, disconnected list of processes like `ps`, `pstree` parses the Parent Process ID (PPID) relationships, tracing the lineage of every running binary all the way back to the system initialization process (PID 1), visually mapping out exactly which application spawned which child processes or threads.

## Why does it exist?

Modern applications—such as web servers (NGINX/Apache), database engines (PostgreSQL), and container runtimes (Docker/containerd)—utilize complex multi-process or multi-threaded architectures. They spawn a "master" process that delegates work to dozens of identical "worker" processes. When examining a flat `ps aux` output, it is incredibly difficult to determine if 50 `php-fpm` processes belong to Website A or Website B. `pstree` exists to solve this by providing immediate, visual context. It collapses identical child processes into clean, bracketed representations (e.g., `5*[php-fpm]`), allowing administrators to instantly comprehend the architectural layout, thread count, and ownership lineage of complex software stacks.

## Syntax

```bash
pstree [options] [PID | USER]
```

## Flags

| Flag                       | Description                                                                                                                                                     | Example          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `-p`, `--show-pids`        | Crucial for administration. Appends the exact numeric Process ID (PID) in parentheses next to every process name in the tree.                                   | `pstree -p`      |
| `-u`, `--uid-changes`      | Highlights security boundaries. Shows user transitions in the tree when a process drops or escalates privileges (e.g., `root` spawning a worker as `www-data`). | `pstree -u`      |
| `-a`, `--arguments`        | Displays the full command-line arguments passed to the processes when they were spawned, rather than just the executable name.                                  | `pstree -a`      |
| `-h`, `--highlight-all`    | Highlights the current process (the `pstree` command itself) and its direct ancestors in the output to show your exact location in the system tree.             | `pstree -h`      |
| `-H <pid>`                 | Highlights a specific, user-defined PID and its ancestors instead of the current process.                                                                       | `pstree -H 1234` |
| `-c`, `--compact-not`      | Disables the default compaction of identical subtrees. Prints every single worker process on its own line instead of collapsing them (e.g., `5*[nginx]`).       | `pstree -c`      |
| `-T`, `--hide-threads`     | Hides individual threads, displaying only full processes. Useful for reducing noise from heavily multi-threaded apps like Java or Chrome.                       | `pstree -T`      |
| `-n`, `--numeric-sort`     | Sorts child processes mathematically by their PID instead of alphabetically by their process name.                                                              | `pstree -n`      |
| `-Z`, `--security-context` | (SELinux) Displays the security context of each process, vital for MAC (Mandatory Access Control) debugging.                                                    | `pstree -Z`      |
| `-A`, `-G`, `-U`           | Forces the output to use ASCII characters (`-A`), VT100 line-drawing characters (`-G`), or UTF-8 line-drawing characters (`-U`).                                | `pstree -U`      |

## Examples

```bash
pstree
```

> The standard invocation. Roots the tree at `systemd` (or `init`) and outputs a clean, collapsed visual representation of every process on the system using line-drawing characters.

```bash
pstree -p 1042
```

> Isolates a specific workload. If PID 1042 is the master process for a database, this command restricts the output exclusively to that process and its children, explicitly printing their PIDs (`-p`) so they can be easily targeted for `kill` or `strace` commands.

```bash
pstree -u -p nginx
```

> Security and architecture auditing. Searches for the process named `nginx`. It maps the master process (usually running as `root`) and explicitly displays the UID transition (`-u`) as it spawns child workers running securely as `www-data` or `nobody`.

```bash
pstree -a alice
```

> Isolates activity by user. Traces the entire process tree but isolates only the branches owned by the user `alice`. By adding `-a`, it reveals exactly what scripts or parameters Alice executed (e.g., `bash -c "./heavy_job.sh --threads=8"`).

```bash
pstree -T -p | grep "docker"
```

> A quick diagnostic filtering trick. By disabling threads (`-T`) and enabling PIDs (`-p`), piping the tree to `grep` isolates the specific sub-tree you care about, allowing you to see exactly which `containerd-shim` is managing which specific container process.

## Real-World Scenarios

**Debugging Fork Bombs or Process Leaks**

```bash
pstree -p
# Output shows: systemd───sshd───bash───malicious.sh─┬─malicious.sh
#                                                    ├─malicious.sh
#                                                    └─malicious.sh
```

> If a server is running out of PIDs or experiencing CPU starvation, `pstree` instantly identifies the culprit. Instead of a flat list, the administrator sees a specific shell script endlessly spawning child clones of itself. They can identify the parent PID of the script and run `kill -9 <parent_pid>` to instantly sever the entire tree.

**Auditing Docker Container Architecture**

```bash
pstree -c -p $(pidof containerd)
```

> Container runtimes obscure process execution. An engineer isolates the `containerd` daemon process. The tree vividly reveals how `containerd` spawns `containerd-shim` processes, which in turn spawn the actual isolated application processes (like `java` or `node`) inside the container namespaces.

## When should it NOT be used?

- **Parsing data in automated scripts:** **Do not use `pstree` in bash automation.** The output relies heavily on dynamic spacing, box-drawing characters, and visual indentation. Attempting to parse this output using `awk` or `sed` to extract a PID is incredibly brittle. Always use `pgrep -P <pid>` to programmatically find child processes.
- **Live process monitoring:** Like `ps`, `pstree` is a static snapshot. It does not update. If processes are spawning and dying rapidly, `pstree` will miss them. Use `htop` (in tree-view mode) for live hierarchical monitoring.

## Alternatives

- **`ps -ejH` or `ps f`:** **Best for POSIX environments.** If `pstree` (which is part of the `psmisc` package) is not installed on a minimal system, passing the hierarchy flags to standard `ps` generates a similar indented text list.
- **`htop`:** **Best for interactive troubleshooting.** Pressing `F5` in `htop` toggles tree view, providing the visual benefits of `pstree` combined with live CPU/Memory telemetry and the ability to interactively send kill signals.

## How it works internally

`pstree` relies entirely on the Linux `/proc` virtual filesystem.

When executed, it scans the numerical directories in `/proc`. For each active process, it opens `/proc/[pid]/stat` and extracts two critical integers: the PID (Process ID) and the PPID (Parent Process ID).

It loads this data into an internal tree data structure in user-space RAM. It links every process to its designated parent.

To determine thread relationships, it also scans the `/proc/[pid]/task/` directory. Linux implements threads as Lightweight Processes (LWPs), which technically have their own PIDs but share memory. `pstree` identifies these threads and groups them under the main process node (unless `-T` is passed).

Once the entire topological graph is constructed in memory, it traverses the tree starting from PID 1 (or the specified target). If it encounters multiple child processes with the exact same executable name, it aggregates them (e.g., `10*[httpd]`) unless `-c` is passed. Finally, it formats the nodes using standard library box-drawing characters and writes the diagram to `stdout`.

## Performance Notes

- **Minimal Overhead:** Constructing the tree requires reading `/proc/[pid]/stat` for every process, but because it doesn't need to read the massive memory maps or full command lines (unless `-a` is used), it executes marginally faster than a full `ps aux` dump and consumes minimal CPU.

## Security Notes

- **Process Visibility (`hidepid`):** Like `ps`, `pstree` is subject to kernel `hidepid` mount restrictions. If a standard user runs `pstree` on a hardened system, the tree will be truncated; they will only see branches originating from their own login shell or SSH session, masking system daemons and other users' activities entirely.
- **Tracking Privilege Escalation:** The `-u` flag is an invaluable security tool. If an attacker uses a vulnerability in a web application to execute a shell, `pstree -u` will distinctly show `www-data` dropping down into a `bash` shell, providing a clear visual indicator of unauthorized post-exploitation activity.

## Common Mistakes

- **Killing the wrong level of the tree**
  - _Mistake:_ Seeing `master ─── worker ─── worker` and trying to kill the lowest worker.
  - _Why:_ In daemonized applications (like NGINX or Apache), if you kill a child worker, the master process simply detects the termination and instantly respawns a new one. You must target the "root" of that specific subtree (the master process) if your goal is to shut down the application.
- **Ignoring Thread Obfuscation**
  - _Mistake:_ Looking for a specific Java thread but only seeing `{java}` in the output.
  - _Why:_ `pstree` displays threads using curly braces `{}`. To save space, it collapses them. If you need to see individual thread IDs to correlate with a Java Thread Dump, you must explicitly use the `-p` (show PIDs) flag, which expands the curly braces and assigns the LWP ID to each thread.

## Best Practices

- **Use `-p` by Default:** A visual tree is nice, but unactionable. Cultivate the habit of always using `pstree -p`. Seeing the hierarchy _and_ knowing the exact PID allows you to immediately pivot to `kill`, `strace`, or `lsof` without running a secondary `ps` command to find the ID.
- **Combine with `less`:** On production servers, `pstree` output will vertically overrun your terminal buffer instantly. Always use `pstree -p | less -S` (the `-S` flag disables line-wrapping) so you can smoothly scroll left and right through deep process hierarchies without the ASCII art becoming mangled.

## Interview Questions

**Q: You run `pstree` and notice several processes enclosed in curly braces, such as `15*[{java}]`. What does the curly brace syntax signify in the output of `pstree`?**
**A:** Curly braces `{}` indicate that the items are threads (Lightweight Processes in Linux) rather than completely separate standalone processes. The output `15*[{java}]` indicates that the parent Java process has spawned 15 distinct, concurrent execution threads sharing the same memory space.

**Q: You want to terminate a misbehaving application. You run `pstree -p` and see `bash(100)───script.sh(200)───sleep(201)`. You want to kill `script.sh` and ensure `sleep` also dies. If you run `kill -9 200`, what happens to the `sleep(201)` process?**
**A:** If you send `SIGKILL` (-9) to `script.sh` (PID 200), it dies instantly. However, `kill` does not inherently cascade. The `sleep(201)` process is left running. Because its parent died, it becomes an "orphan" process, and the kernel immediately re-parents it to PID 1 (`systemd` or `init`). To kill the entire tree, you must use negative PID notation to kill the process group (e.g., `kill -9 -200`), or manually kill both PIDs.

## Practice Problems

**Problem:** You are debugging a systemd service named `custom_app`. You want to view the process tree originating specifically from this application, and you need to see the exact command-line arguments that were passed to its child processes.
**Hint:** Target the process by name, and add the flag that reveals command-line arguments instead of just the binary name.
**Solution:**

```bash
pstree -a custom_app
```

**Problem:** You want to see the full process tree of the entire server, including all numeric Process IDs, but you want to suppress all threads so the output isn't cluttered by Java and Chrome thread pools.
**Hint:** Combine the flag that shows PIDs with the flag that explicitly hides threads.
**Solution:**

```bash
pstree -p -T
```

## References

- [pstree(1) - Linux man page](https://linux.die.net/man/1/pstree)
- [Linux Process Management](https://www.kernel.org/doc/html/latest/core-api/kernel-api.html#process-management)
