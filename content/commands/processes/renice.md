---
slug: renice
name: renice
aliases: []
category: processes
tags:
  - linux
  - process-management
  - performance
  - scheduling
  - cpu
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
  - change process priority
  - increase cpu priority linux
  - lower process priority
  - adjust nice value of running process
  - throttle high cpu process
relatedCommands:
  - nice
  - top
  - ps
  - kill
alternatives:
  - top
  - htop
status: draft
---

## What is it?

`renice` is a system administration utility used to alter the scheduling priority (the "nice" value) of one or more _already running_ processes. It communicates with the Linux kernel's Completely Fair Scheduler (CFS) to instruct it to either favor a process (granting it more CPU time slices) or deprioritize it (forcing it to yield the CPU to other tasks), dynamically shifting computational resources without requiring the application to be restarted.

## Why does it exist?

When a user launches a massive data compilation script or a video encode, it can aggressively monopolize the CPU, causing critical daemons (like SSH or database engines) to become sluggish and unresponsive. While the `nice` command can launch a _new_ process with a modified priority, it is useless if the heavy task is already halfway finished. `renice` exists to provide retroactive intervention. It allows administrators to dynamically throttle runaway processes or boost the responsiveness of starving critical services on the fly, maintaining overall system stability and interactive responsiveness during heavy load.

## Syntax

```bash
renice [-n] priority [-p|--pid] pid [...] [-g|--pgrp] pgrp [...] [-u|--user] user [...]
```

## Flags

| Flag               | Description                                                                                                                        | Example                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `-n`, `--priority` | Specifies the new nice value to apply. Values range from `-20` (highest priority) to `19` (lowest priority).                       | `renice -n 10 -p 1234`     |
| `-p`, `--pid`      | Explicitly interprets the following arguments as specific Process IDs (PIDs). This is the default if no type flag is provided.     | `renice -n 5 -p 456 789`   |
| `-g`, `--pgrp`     | Interprets the arguments as Process Group IDs. Alters the priority of every single process belonging to that group simultaneously. | `renice -n 19 -g 1024`     |
| `-u`, `--user`     | Interprets the arguments as usernames or UIDs. Alters the priority of _all_ processes currently owned by that specific user.       | `renice -n 15 -u dev_user` |
| `-h`, `--help`     | Prints the syntax and usage instructions.                                                                                          | `renice -h`                |
| `-V`, `--version`  | Outputs version information for the `renice` utility.                                                                              | `renice -V`                |

## Examples

```bash
renice -n 10 -p 1042
```

> The standard throttling invocation. It locates process ID 1042 and sets its nice value to `10`. By raising the number (making the process "nicer" to others), the kernel deprioritizes it, preventing it from starving other applications of CPU time.

```bash
sudo renice -n -5 -p 884
```

> The performance boosting pattern. It requires root privileges. By setting a negative nice value (`-5`), the administrator aggressively commands the kernel to prioritize PID 884 (e.g., an overloaded NGINX master process) ahead of normal user tasks.

```bash
renice -n 19 -u backup_svc
```

> Batch user throttling. A nightly backup service triggers and crushes server performance. The administrator targets the `backup_svc` user, pushing every single `tar` or `rsync` process owned by that user to the absolute lowest possible priority (`19`), ensuring the main database continues to serve traffic smoothly.

```bash
renice -n 5 -g $(ps -o pgrp= -p 5532)
```

> Process group manipulation. A complex bash script (PID 5532) spawns dozens of concurrent worker threads. By extracting its Process Group ID and passing it to `-g`, `renice` blankets the entire execution tree with the new priority, rather than requiring the admin to find and list all 50 individual worker PIDs.

## Real-World Scenarios

**Taming Runaway Analytics Queries**

```bash
# Developer accidentally runs a heavy query locking up the server
PID=$(pgrep -u dev_analyst "python")
renice -n 15 -p $PID
```

> A data analyst executes an unoptimized Python script directly on a shared staging server, consuming 100% of CPU cores. Instead of killing the job (`kill -9`) and destroying hours of their work, the DevOps engineer uses `renice` to heavily deprioritize the script. The script takes longer to finish, but the server instantly becomes responsive again for other users.

**Prioritizing SSH Access During Outages**

```bash
sudo renice -n -20 -p $(pidof sshd)
```

> A system is experiencing a catastrophic load spike (Load Average > 100). The administrator's SSH terminal is lagging so severely they cannot type commands to fix the issue. They execute this command to grant the `sshd` daemon absolute maximum CPU priority (`-20`). The kernel guarantees the SSH process gets CPU time slices immediately, restoring terminal responsiveness so the admin can debug the outage.

## When should it NOT be used?

- **For Absolute CPU Limits:** **`renice` does not cap CPU percentage.** If you set a process to `19` (lowest priority), but the server is otherwise idle, that process will still consume 100% of the CPU. Nice values only dictate _relative_ sharing when processes are actively fighting for the same core. If you need a hard cap (e.g., "never exceed 50% CPU"), you must use Linux `cgroups` (via systemd `CPUQuota=`).
- **For I/O or Memory Bottlenecks:** `renice` strictly influences the CPU scheduler. If a process is thrashing the hard drive or consuming all RAM, changing its nice value will not fix the server. You must use `ionice` for disk scheduling, or `cgroups` for memory limits.

## Alternatives

- **`top` / `htop`:** **Best for interactive use.** Pressing `r` inside the `top` or `htop` interface allows you to type a PID and a new nice value on the fly, eliminating the need to drop to a bash prompt.
- **`cgroups` (systemd):** **Best for permanent orchestration.** Modern Linux relies on `systemd` slices. Setting `CPUShares=` or `Nice=` in a `.service` file permanently guarantees the prioritization rules upon every boot.
- **`chrt`:** **Best for real-time scheduling.** Alters the scheduling _policy_ (e.g., `SCHED_FIFO` or `SCHED_RR`), enabling true real-time execution that completely bypasses the standard Completely Fair Scheduler (CFS) fairness rules.

## How it works internally

In Linux, every standard process operates under the `SCHED_OTHER` (Completely Fair Scheduler) policy. The CFS aims to give every process a fair slice of CPU time.

The "nice" value acts as a weighting factor in the CFS algorithm. It maps directly to a kernel concept called "weight." A neutral process (nice `0`) has a default weight.
If you use `renice` to increase the nice value to `10`, you decrease its weight by roughly 10% per step. The CFS allocates CPU time proportionally based on this weight.

When you run `renice -n 5 -p 1234`, the utility translates the request and issues a `setpriority(PRIO_PROCESS, 1234, 5)` system call.

The kernel intercepts this call, validates the user's permissions, and modifies the `static_prio` field in the `task_struct` of the target process. During the next CPU scheduling tick (which happens hundreds of times a second), the CFS re-evaluates the run queue. It sees the modified weight, instantly adjusts the process's "virtual runtime" calculation, and shifts it further back in the CPU execution queue compared to standard tasks.

## Performance Notes

- **Relative Scaling:** The completely fair scheduler (CFS) uses an exponential multiplier. A difference of 1 in the nice value results in roughly a 10% difference in CPU time allocated between two processes fighting for the same core. A process at `-20` will almost completely starve a process at `19` if both are locked in `while(1)` loops.

## Security Notes

- **Privilege Constraints:** A standard user can _increase_ the nice value (make it slower, 0 to 19) of their _own_ processes. However, only the `root` user (or a user with the `CAP_SYS_NICE` capability) can decrease a nice value (make it faster, -1 to -20) or alter the priority of a process owned by another user.
- **Denial of Service:** Granting unprivileged users the `CAP_SYS_NICE` capability is extremely dangerous. A malicious user could spawn a cryptominer, set its nice value to `-20`, and completely starve the kernel's worker threads and system daemons, effectively taking down the server.

## Common Mistakes

- **Confusing priority numbers**
  - _Mistake:_ Thinking "I want this to be priority number 1!" and running `renice -n 19`.
  - _Why:_ The scale is counter-intuitive. It measures "niceness." A value of `19` means the process is extremely nice to other processes, yielding the CPU constantly. Negative values (`-20`) mean the process is selfish and aggressive. Lower is faster.
- **Assuming nice values persist**
  - _Mistake:_ Fixing a database performance issue with `renice` and closing the ticket.
  - _Why:_ The `setpriority()` system call only modifies the _currently running_ instance in RAM. If the database service restarts, or the server reboots, the process spawns with the default nice value of `0`. You must update the daemon's init script or `systemd` unit to make it permanent.

## Best Practices

- **Combine with `ionice`:** Heavy background jobs (like `rsync` backups or `find` crawls) usually crush performance via Disk I/O, not CPU. Always pair `renice` with `ionice`: `renice -n 19 -p $PID && ionice -c 3 -p$PID`. This deprioritizes both CPU slices and disk read/writes simultaneously.
- **Avoid Extreme Values:** Setting a process to `-20` is an anti-pattern. If that process hits an infinite loop, it will lock up the machine. If you need priority, use `-5` or `-10`. Reserve `-20` exclusively for critical kernel threads.

## Interview Questions

**Q: A developer runs a script and notices it is running slowly. They attempt to speed it up by typing `renice -n -10 -p 1234`. The command fails with "Permission denied". They are the owner of the process. Why did it fail?**
**A:** In Linux, unprivileged users can only make their processes "nicer" (values 1 through 19), yielding CPU time. Decreasing a nice value (making it negative, which aggressively steals CPU time from other users) is considered a privileged operation that could lead to resource starvation. Only the root user (or a process with `CAP_SYS_NICE`) can assign negative nice values.

**Q: You use `renice` to set a heavy data-processing script to a nice value of 19. You run `top` and observe the script is still utilizing 99% of a CPU core. Has the `renice` command failed? Explain why or why not.**
**A:** No, the command has not failed. Nice values only dictate prioritization when multiple processes are actively contending for the _same_ CPU resources. If the server is otherwise idle and no other processes require the CPU core, the Completely Fair Scheduler (CFS) will allow the nice 19 process to consume 100% of the available cycles. It will only throttle the process when a higher-priority task wakes up and demands execution time.

## Practice Problems

**Problem:** A backup daemon running under the user `backup_agent` kicked off during business hours and is slowing down the web server. Write a single command to throttle every process owned by this user to the absolute lowest CPU priority.
**Hint:** Use the flag that applies priority changes to an entire user, and the maximum positive nice value.
**Solution:**

```bash
renice -n 19 -u backup_agent
```

**Problem:** You are an administrator troubleshooting a heavily loaded server. The primary database process is PID 4055. Write the command to aggressively prioritize this process over standard user tasks by giving it a nice value of negative ten.
**Hint:** The command requires root privileges and a negative integer.
**Solution:**

```bash
sudo renice -n -10 -p 4055
```

## References

- [renice(1) - Linux man page](https://linux.die.net/man/1/renice)
- [setpriority(2) - System call manual](https://linux.die.net/man/2/setpriority)
