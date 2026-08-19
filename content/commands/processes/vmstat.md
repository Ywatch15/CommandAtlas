---
slug: vmstat
name: vmstat
aliases:
  - virtual memory statistics
category: processes
tags:
  - linux
  - memory
  - monitoring
  - performance
  - sysadmin
  - io
difficulty: intermediate
supportedOS:
  - linux
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - check virtual memory usage
  - monitor system swap activity
  - find cpu wait times
  - check memory bottlenecks linux
  - report io performance
relatedCommands:
  - top
  - free
  - sar
  - iostat
alternatives:
  - sar
  - free
status: draft
---

## What is it?

`vmstat` (Virtual Memory Statistics) is a foundational performance monitoring tool that reports high-level, aggregate statistics about system memory, swap space, block I/O, system interrupts, context switches, and CPU scheduling. Unlike process-specific tools like `top`, `vmstat` provides an unadulterated, whole-system perspective, arranging critical kernel-level bottleneck indicators into a dense, highly efficient terminal matrix.

## Why does it exist?

Diagnosing complex system degradation requires correlating multiple subsystems simultaneously. If a server slows down, looking only at RAM (`free`) or only at CPU (`top`) might mask the true issue—such as RAM exhaustion forcing aggressive hard-disk swapping, which in turn causes CPU I/O wait spikes. `vmstat` exists to compress the most vital performance metrics of the Linux kernel into a single line of text. By polling these metrics on a continuous interval, it allows system administrators to easily detect patterns, latency spikes, and thrashing states over time without relying on heavy graphical interfaces or complex monitoring stacks.

## Syntax

```bash
vmstat [options] [delay [count]]
```

## Flags

| Flag                | Description                                                                                                                     | Example                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `delay`             | (Positional) The polling interval in seconds. If omitted, `vmstat` prints a single line of averages since the last boot.        | `vmstat 2`              |
| `count`             | (Positional) The number of polls to execute before exiting. Requires a delay to be specified.                                   | `vmstat 1 5`            |
| `-a`, `--active`    | Alters the memory output columns to display `active` and `inactive` memory instead of raw buffers and cache.                    | `vmstat -a 2`           |
| `-s`, `--stats`     | Outputs a static, detailed table of various event counters and memory statistics instead of the dynamic polling matrix.         | `vmstat -s`             |
| `-d`, `--disk`      | Switches the output focus. Reports read/write statistics specifically for physical disk devices instead of memory/CPU.          | `vmstat -d 2`           |
| `-p <partition>`    | Provides highly detailed read/write metrics for a specific, individual disk partition.                                          | `vmstat -p /dev/sda1`   |
| `-w`, `--wide`      | Forces wide output formatting. Prevents columns from misaligning or bleeding into each other on systems with massive RAM sizes. | `vmstat -w 2`           |
| `-S <unit>`         | Formats numerical sizes. Defaults to kilobytes (`k`). Accepts `k`, `K` (1000), `m`, `M` (megabytes).                            | `vmstat -S M 1`         |
| `-t`, `--timestamp` | Appends a timestamp column to the end of each line, crucial when redirecting the output to a log file for offline analysis.     | `vmstat -t 2 > log.txt` |
| `-f`, `--forks`     | Outputs a single line indicating the total number of process forks (creations) since the system booted.                         | `vmstat -f`             |

## Examples

```bash
vmstat 1
```

> The essential diagnostic workflow. The command prints column headers and begins outputting system metrics every `1` second infinitely. Note: The very first line of output represents the _average values since the server booted_. All subsequent lines represent the actual polling data from the last 1 second.

```bash
vmstat -w -S M 2 5
```

> The readable, scriptable burst. It outputs 5 lines of metrics, polled every 2 seconds. The `-S M` flag converts the confusing kilobyte defaults into Megabytes, and the `-w` (wide) flag ensures that 64GB memory numbers don't push the columns out of alignment.

```bash
vmstat -s
```

> The forensic memory breakdown. Abandons the scrolling matrix layout and dumps a static list of kernel counters. It explicitly breaks down memory states, displaying the exact number of pages swapped in/out, total CPU context switches, and boot time.

```bash
vmstat -t 5 >> /var/log/vmstat_monitor.log &
```

> The ad-hoc telemetry recorder. Runs the tool in the background, polling every 5 seconds. Crucially, the `-t` flag appends a timestamp (`2023-10-25 14:02:05`) to every single row, allowing administrators to correlate system degradation spikes in the log file with application error events later on.

## Real-World Scenarios

**Detecting "Thrashing" (Death by Swap)**

```bash
vmstat 1
# Focus on the 'si' (swap in) and 'so' (swap out) columns.
```

> A database server becomes completely unresponsive. The administrator runs `vmstat 1`. The `free` memory column is near zero. Crucially, the `si` and `so` columns are showing massive, continuous numbers (e.g., 50,000+). This proves "thrashing": the system is violently shuffling memory pages back and forth from the hard drive because it physically lacks enough RAM to execute the active processes, stalling the CPU.

**Identifying CPU Bottleneck Types**

```bash
vmstat 2
# Focus on the 'r' (runnable), 'us' (user), 'sy' (system), and 'wa' (iowait) columns.
```

> If a system is slow, `vmstat` identifies the exact pressure point.
>
> - If `r` (processes waiting for CPU time) is consistently higher than the number of physical cores, the system is CPU-starved.
> - If `sy` is unusually high (>30%), a kernel module, heavy I/O interrupts, or aggressive context switching is consuming resources.
> - If `wa` is high, the CPU is idling, waiting for slow hard drives to return data.

## When should it NOT be used?

- **Per-Process Troubleshooting:** **Do not use `vmstat` to find a memory leak.** `vmstat` aggregates the entire system. It will tell you the RAM is exhausted, but it is mathematically impossible to deduce _which_ application is eating the RAM from `vmstat` output. You must pivot to `top` or `ps`.
- **Network Diagnostics:** `vmstat` has no concept of network interfaces, dropped packets, or TCP connections. If the issue is network-bound, `vmstat` will simply show an idle, healthy server. Use `sar` or `ip -s link`.

## Alternatives

- **`dstat`:** **The modern replacement.** Written in Python, it perfectly aggregates `vmstat`, `iostat`, and `ifstat` into a beautiful, colorized, dynamically scaling single-line matrix.
- **`sar`:** **Best for historical reporting.** `vmstat` only shows live data or boot averages. `sar` can pull historical memory metrics from yesterday.
- **`free -m`:** **Best for quick RAM checks.** If you only care about RAM and don't need CPU or Swap correlation, `free` is simpler to read.

## How it works internally

`vmstat` operates entirely in user-space by rapidly polling specific synthetic files generated by the Linux kernel inside the `/proc` filesystem.

Specifically, it opens and parses:

1.  `/proc/meminfo` to acquire free, buffered, and cached memory values.
2.  `/proc/stat` to calculate CPU utilization ticks (user, system, idle, iowait) and system-wide interrupts/context switches.
3.  `/proc/vmstat` to extract the `pswpin` and `pswpout` counters, tracking explicit swap-to-disk events.

When running in polling mode (e.g., `vmstat 1`), the utility fetches these files, stores their values in a struct, waits exactly 1 second, fetches the files again, and calculates the delta (difference) between the counters. It performs basic division against the time interval to produce per-second rates (e.g., swapping 50 blocks/sec), aligns the math into character-spaced columns, and flushes it to the terminal.

## Performance Notes

- **Zero Impact:** Opening three text files in `/proc` once a second is computationally invisible. `vmstat` can be left running indefinitely in a `tmux` session on the most heavily loaded production servers without impacting application performance.

## Security Notes

- **No Root Required:** Reading basic system telemetry from `/proc/stat` and `/proc/meminfo` does not require root privileges. Any standard user logged into the system can execute `vmstat` to gauge the overall health and load of the host server.

## Common Mistakes

- **Trusting the first line of output**
  - _Mistake:_ Running `vmstat` (with no interval), seeing 50% CPU usage, and assuming the server is under load.
  - _Why:_ The first line generated by `vmstat` ALWAYS represents the **average since the system was last booted**. If a server booted up, compiled code at 100% CPU for a week, and has been idle for a week, the first line will still show 50% CPU. You must run `vmstat 1` and look at the _second_ line to see the actual, live current metrics.
- **Ignoring the `b` column**
  - _Mistake:_ Over-focusing on CPU usage while ignoring the `b` column.
  - _Why:_ The `b` column represents processes in "uninterruptible sleep." These processes are frozen, waiting for hardware (usually a dead hard drive or broken NFS mount). If `b` is consistently higher than `0`, your system is severely bottlenecked on storage, even if CPU and RAM look perfectly healthy.

## Best Practices

- **Use Wide and Megabyte Flags:** The default output of `vmstat` is optimized for 1990s hardware. On servers with 256GB of RAM, the `free` column (defaulting to kilobytes) will overflow into the `buff` column, rendering the matrix unreadable. Always use `vmstat -w -S M 1` for modern diagnostic sanity.
- **Correlate SI/SO with Free RAM:** High `so` (Swap Out) numbers aren't always a crisis—Linux will occasionally swap out stale processes to make room for filesystem cache. However, if `si` (Swap In) is high _and_ `free` memory is near 0, the system is actively thrashing.

## Interview Questions

**Q: You run `vmstat 1`. The `us` (User CPU) is 10%, the `sy` (System CPU) is 5%, but the `wa` (I/O Wait) is 80%. The application team complains the server is slow. What does this output indicate is the root cause?**
**A:** The output indicates a severe storage bottleneck. An `iowait` of 80% means the CPU is spending 80% of its time completely idle, doing no computational work, purely because it is waiting for the slow underlying hard drives (or network storage) to return requested data. The application is slow because the disks cannot keep up with read/write requests.

**Q: Explain the difference between the `r` column and the `b` column in `vmstat` output.**
**A:** The `r` column represents the number of runnable processes—processes that are actively executing on a CPU core or sitting in the queue waiting for a CPU time slice. A high `r` indicates a CPU bottleneck. The `b` column represents processes in uninterruptible sleep—processes blocked from execution because they are waiting on a hardware I/O operation (like a disk read) to complete. A high `b` indicates a storage or I/O bottleneck.

## Practice Problems

**Problem:** You are writing an alert script that monitors memory exhaustion. You only want the script to fetch a single, static list of absolute memory counters (like total pages swapped out) and then exit immediately. Write the command.
**Hint:** Use the flag that outputs static summary statistics instead of the polling matrix.
**Solution:**

```bash
vmstat -s
```

**Problem:** You need to monitor a server's performance matrix, outputting a new line every 2 seconds, but you want it to automatically stop and return to the bash prompt after taking exactly 10 measurements. Write the command.
**Hint:** Provide the polling delay and the total execution count as positional arguments.
**Solution:**

```bash
vmstat 2 10
```

## References

- [vmstat(8) - Linux man page](https://linux.die.net/man/8/vmstat)
- [proc(5) - The /proc filesystem](https://linux.die.net/man/5/proc)
