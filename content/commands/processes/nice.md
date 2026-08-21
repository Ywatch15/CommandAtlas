---
slug: nice
name: nice
aliases: []
category: processes
tags:
  - linux
  - processes
  - scheduling
  - cpu
  - priority
  - performance
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
  - run command with low priority
  - change cpu scheduling priority
  - prevent script from using 100% cpu
  - start background job with high nice value
  - set process priority linux
relatedCommands:
  - renice
  - top
  - htop
  - ps
alternatives:
  - renice
status: draft
---

## What is it?

`nice` is a core POSIX command-line utility used to launch a new program with a modified CPU scheduling priority. In Linux, process priority is governed by a "niceness" value; by adjusting this value, `nice` instructs the kernel's process scheduler to either favor the program with more CPU time or penalize it, ensuring heavy background tasks do not starve critical foreground applications.

## Why does it exist?

Modern operating systems are preemptive multitaskers; the kernel slices CPU time into microscopic chunks and distributes them among thousands of active processes. By default, all standard processes receive an equal share. However, executing a massive video render or database backup at equal priority will cause interactive applications (like web servers or SSH sessions) to freeze and lag. `nice` exists to solve this by providing users a mechanism to voluntarily yield CPU cycles—instructing the kernel that a specific task is "nice" and should only consume CPU time when no other critical processes require it.

## Syntax

```bash
nice [OPTION] [COMMAND [ARG]...]
```

## Flags

| Flag               | Description                                                                   | Example                                   |
| ------------------ | ----------------------------------------------------------------------------- | ----------------------------------------- |
| `-n <adjustment>`  | Adds the specified integer value to the default niceness. (Range: -20 to 19). | `nice -n 15 tar -czf backup.tar.gz /data` |
| `--adjustment=<n>` | The explicit long-form version of `-n`, setting the exact niceness integer.   | `nice --adjustment=10 ./heavy_script.sh`  |
| `--help`           | Outputs brief usage documentation and exits.                                  | `nice --help`                             |
| `--version`        | Displays version information and copyright details for the coreutils package. | `nice --version`                          |

_(Note: The GNU implementation of `nice` strictly contains only the flags listed above. It acts purely as an execution wrapper. To alter a process that is *already running*, you must use its sister command, `renice`)._

## Examples

```bash
nice -n 10 ./background_worker.py
```

> This launches a custom Python script with a niceness value increased by 10. The kernel's Completely Fair Scheduler (CFS) will yield CPU time from this script to standard processes, ensuring the script runs smoothly in the background without causing the server to stutter.

```bash
nice -n 19 xz -9 massive_archive.tar
```

> This runs an extremely heavy, single-threaded file compression operation at the absolute maximum niceness limit (`19`). The compression will utilize 100% of the CPU _only_ if the CPU is entirely idle; the moment a standard web request arrives, the kernel immediately pauses the compression to serve the web request.

```bash
sudo nice -n -10 systemctl restart nginx
```

> This executes a command with _negative_ niceness (`-10`), which elevates its priority above standard user processes. This requires `root` privileges. The kernel will grant this specific Nginx restart operation preferential CPU scheduling, ensuring it executes rapidly even if the server is under heavy load.

```bash
nice make -j 8
```

> Running `nice` without any numeric flags automatically defaults to adding an adjustment of `10` to the current niceness value. This is the standard shorthand developers use to compile massive C/C++ codebases without locking up their desktop environments.

## Real-World Scenarios

**Executing Nightly Unobtrusive Backups**

```bash
0 2 * * * root nice -n 19 rsync -a /data /backup_mount/
```

> Systems administrators writing `cron` jobs for massive disk and CPU-intensive `rsync` synchronizations wrap the command in `nice -n 19`. If the backup runs long and overlaps with early morning business hours, the backup gracefully yields CPU cycles to the active database queries, preventing application latency.

**High-Priority Audio/Video Transcoding**

```bash
sudo nice -n -15 ffmpeg -i input.mp4 output.mkv
```

> Media servers processing real-time video streams use negative niceness to guarantee the `ffmpeg` transcode buffer is never starved of CPU cycles by background OS processes, preventing dropped frames or stuttering streams on the client side.

## When should it NOT be used?

- **Altering the priority of processes that are _already running_:** **Reason:** `nice` is an execution wrapper; it can only set priority at the exact moment a program is launched. **Use instead:** `renice -n 10 -p <PID>` to hot-swap priorities on active PIDs.
- **Restricting a process to specific CPU cores:** **Reason:** `nice` adjusts relative time-slicing across the entire processor pool. It cannot pin a process to "Core 1" to leave "Core 2" free. **Use instead:** `taskset -c 0,1 <command>`.
- **Throttling disk I/O bandwidth:** **Reason:** The standard `nice` command strictly alters CPU scheduling weights. A highly "nice" process can still completely saturate the hard drive, freezing the server via I/O Wait. **Use instead:** `ionice -c 3 <command>` (often used in conjunction with `nice`).

## Alternatives

- **`renice`:** Modifies active processes. **Tradeoff:** Designed specifically for targeting active PIDs rather than wrapping new commands, making it ideal for incident response rather than scheduled scripts.
- **`cpulimit`:** Absolute CPU throttling. **Tradeoff:** While `nice` tells the kernel to yield under pressure (allowing 100% usage if idle), `cpulimit` mathematically halts a process (e.g., locking it to a maximum of 20% CPU usage) even if the rest of the server is completely empty.
- **`systemd` (CPUShares):** Cgroup isolation. **Tradeoff:** Systemd enforces strict CPU limits using Linux `cgroups`, allowing administrators to guarantee specific CPU percentages to services persistently, fundamentally replacing `nice` for modern daemons.

## How it works internally

In Linux, the term "niceness" is a user-space abstraction. The kernel mathematically tracks scheduling priority via the **PR (Priority)** value, typically ranging from 0 to 139. User-space processes operate between 100 and 139.

The "niceness" value ranges from **-20 (Highest Priority, least nice)** to **19 (Lowest Priority, most nice)**. The default niceness of a standard bash shell is `0`.

When you run `nice -n 10 command`, the `nice` utility invokes the `setpriority()` C system call, setting the new nice value for its own process. It then calls `execve()` to replace itself with the target `command`. Because child processes inherit scheduling states from their parents, the target command boots up with the modified priority.

The Linux kernel's **Completely Fair Scheduler (CFS)** maps these niceness values to "weights." A default process (nice 0) has a weight of 1024. A nice 10 process has a weight of ~110. The CFS algorithm calculates the proportion of CPU time based on the ratio of a process's weight against the total weight of all running processes. Thus, a heavily niced process receives exponentially fewer CPU time-slices during scheduling calculations.

## Performance Notes

- `nice` executes in microseconds and consumes zero ongoing resources, as it simply alters an integer inside the kernel's `task_struct` block during initialization.
- Applying `nice -n 19` does _not_ slow a program down if the server is idle. If no other processes require the CPU, the CFS scheduler will grant the niced process 100% of the CPU cycles. The penalty only physically manifests when multiple processes contend for the exact same core simultaneously.

## Security Notes

- **The Privilege Boundary:** As a strict Linux security mechanism, standard unprivileged users can only _increase_ niceness (making their programs slower and yielding resources, values 0 to 19). Attempting to use a negative niceness (e.g., `-n -5`) to steal CPU cycles from other users is forcefully blocked by the kernel unless the user executing the command possesses absolute `root` privileges (`CAP_SYS_NICE`).

## Common Mistakes

- **Confusing Priority (PR) with Niceness (NI):** Looking at `top` and wondering why the `PR` column says `30` when you set `nice` to `10`. **Why it's wrong:** The `PR` column is the kernel's internal calculation (usually `PR = 20 + NI`). If you set a niceness of 10, the kernel maps it to a Priority of 30. They are related but mathematically offset.
- **Syntax confusion with negative numbers:** Running `nice -10 command`. **Why it's wrong:** This is highly ambiguous. In older GNU versions, `-10` meant positive 10. To actually get a negative (high priority) value, you had to type `nice --10 command`. Always explicitly use `-n` (e.g., `nice -n -10 command`) to guarantee mathematical intent.
- **Assuming `nice` fixes network or disk lag:** **Why it's wrong:** `nice` solely dictates CPU scheduling. If your script is consuming 100% of your disk's read/write bandwidth or saturating your gigabit NIC, `nice` will do absolutely nothing to alleviate the server slowdown. You must use `ionice` or `tc` (traffic control).

## Best Practices

- Universally pair `nice -n 19` with `ionice -c 3` when running massive archive extractions (`tar`), database dumps (`mysqldump`), or synchronization jobs (`rsync`) to ensure the background task yields both CPU and physical disk hardware access to interactive foreground processes.
- Avoid using negative niceness (e.g., `-n -20`) unless completely unavoidable. Elevating a user-space application to maximum priority can starve critical kernel watchdog threads and networking interrupt handlers, resulting in system lockups or dropped packets.

## Interview Questions

**Q:** What is the mathematical scale of "niceness" in Linux, and explain the conceptual difference between a niceness of `-20` and a niceness of `19`.
**A:** The scale ranges from -20 to 19. A value of `-20` is the "least nice" and commands the absolute highest CPU scheduling priority, demanding processor time aggressively. A value of `19` is the "most nice" and commands the lowest CPU scheduling priority, politely yielding CPU cycles to any other process on the system that requires them.
**Q:** A junior developer running a massive compile job without `sudo` attempts to speed it up by running `nice -n -10 make`. The command fails. What kernel security mechanism caused this failure?
**A:** The Linux kernel strictly prohibits unprivileged users from elevating their CPU priority (applying negative nice values) because doing so allows them to steal compute resources from other tenants or critical system daemons, causing a Denial of Service. Unprivileged users can only _increase_ their niceness (values 0 to 19) to yield resources.
**Q:** If a process launched with `nice -n 19` is the only active process running on a 16-core server, what percentage of the CPU capacity will it be granted by the kernel's scheduler?
**A:** It will be granted 100% of the requested capacity. `nice` does not enforce an absolute throttle or throttle limit. The Completely Fair Scheduler (CFS) only invokes the niceness penalty during resource contention. If the CPU is completely idle, the "nice" process is permitted to consume all available cycles until a competing process awakens and requests time.

## Practice Problems

**Problem:** Execute a massive background compression task using `gzip archive.tar` at the absolute lowest CPU priority possible, ensuring it yields perfectly to all other applications on the server.
**Hint:** Invoke the execution wrapper and supply the maximum positive integer allowed on the niceness scale.
**Solution:** `nice -n 19 gzip archive.tar` (This executes the compression gently, preventing CPU lockups during the heavy math calculations).
**Problem:** Launch an emergency diagnostic script `./recover.sh` with significantly elevated CPU priority (`-15`) to ensure it executes rapidly even though the server is currently bogged down at 100% CPU load.
**Hint:** Combine superuser privileges to bypass the security block, invoke the wrapper, and supply the negative integer.
**Solution:** `sudo nice -n -15 ./recover.sh` (This violently seizes CPU time-slices from standard applications, guaranteeing execution bandwidth for the recovery logic).

## References

- [GNU Coreutils - nice invocation](https://www.gnu.org/software/coreutils/manual/html_node/nice-invocation.html)
- [Man Page for nice (Linux)](https://man7.org/linux/man-pages/man1/nice.1.html)
  === END FILE ===
