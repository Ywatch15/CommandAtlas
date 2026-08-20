---
slug: top
name: top
aliases: []
category: processes
tags:
  - linux
  - monitoring
  - process-management
  - performance
  - real-time
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
  - view live processes linux
  - check real time cpu usage
  - find what is using memory
  - monitor server load
  - kill processes interactively
relatedCommands:
  - ps
  - htop
  - kill
  - renice
  - uptime
alternatives:
  - htop
status: draft
---

## What is it?

`top` is a classic, interactive command-line utility that provides a dynamic, real-time summary of a running Linux system. It functions as a text-based task manager, displaying high-level system metrics (uptime, load average, total RAM/Swap usage) in its header, followed by a continuously refreshing, sorted table of individual processes and their respective CPU and memory consumption.

## Why does it exist?

Static snapshot tools like `ps` require repeated execution and complex `awk` sorting to track fluctuating system performance. `top` exists to provide a persistent, single-pane-of-glass dashboard. By leveraging the `ncurses` terminal library, it dynamically clears and redraws the screen, automatically ranking processes by resource contention. This gives system administrators immediate, visual intuition regarding which specific application is actively spiking the CPU, leaking memory, or entering a zombie state, acting as the fundamental triage tool for incident response.

## Syntax

```bash
top [options]
```

## Flags

| Flag         | Description                                                                                                                    | Example                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `-d <sec>`   | Specifies the delay between screen updates (in seconds). Can handle decimal values for sub-second polling.                     | `top -d 1.5`            |
| `-u <user>`  | Filters the process list, displaying only tasks owned by the specified effective username or UID.                              | `top -u nginx`          |
| `-p <pid>`   | Restricts the output to explicitly monitor one or more specified Process IDs. Supports up to 20 PIDs.                          | `top -p 1234,5678`      |
| `-n <count>` | Instructs `top` to update the display `<count>` times and then exit automatically. Useful for batch scripting.                 | `top -n 5`              |
| `-b`         | Operates in "Batch mode". Instead of redrawing an interactive screen, it streams plain text to standard output.                | `top -b -n 1 > log.txt` |
| `-c`         | Toggles the command column to display the entire absolute path and command-line arguments instead of just the executable name. | `top -c`                |
| `-H`         | Instructs `top` to display individual threads (Lightweight Processes) rather than aggregating them under the main process.     | `top -H`                |
| `-i`         | Ignores idle or zombie processes, hiding them from the display to reduce noise, showing only actively working processes.       | `top -i`                |
| `-O`         | Prints all available columns that `top` can sort by, acting as a quick reference for interactive field management.             | `top -O`                |

### Interactive Commands

_(Keys to press while `top` is running)_

| Key | Action                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------- |
| `P` | Sorts the process list by `%CPU` usage (the default behavior).                                                          |
| `M` | Sorts the process list by `%MEM` (Resident Memory) usage.                                                               |
| `k` | Kills a process. Prompts for the PID, then the signal to send (defaults to 15 / SIGTERM).                               |
| `r` | Renices a process. Prompts for the PID, then the new nice value, instantly adjusting its CPU scheduling priority.       |
| `c` | Toggles the display of the full command-line arguments.                                                                 |
| `V` | Displays a visual tree of the processes (parent-child relationships).                                                   |
| `1` | Toggles the header CPU summary between a single aggregate line and a per-core breakdown.                                |
| `W` | Writes the current interactive configuration (sort column, delay, colors) to `~/.toprc` so it persists across sessions. |

## Examples

```bash
top
```

> The universal invocation. Takes over the terminal, updates every 3 seconds, and displays the most CPU-intensive processes at the top of the list.

```bash
top -u postgres
```

> Targeted monitoring. Filters out the hundreds of root and system daemons, isolating the view exclusively to database worker processes spawned by the `postgres` user.

```bash
top -b -n 1 | head -n 20
```

> The scriptable snapshot. Uses `-b` (batch mode) to suppress the interactive UI rendering and `-n 1` to execute exactly one poll. `head` extracts the system summary and top 10 processes, perfect for appending to an automated cron email alert.

```bash
top -H -p $(pidof java)
```

> Deep thread introspection. Java is notorious for burying hundreds of threads under a single process ID. This command extracts the Java PID, passes it to `top`, and forces the display of individual threads (`-H`). The admin can now see which exact JVM thread is spinning at 100% CPU.

## Real-World Scenarios

**Triaging a Locked-Up Server**

```bash
# Type `top`, press `M`, press `c`
```

> A server is severely unresponsive and throwing OOM (Out of Memory) errors in the logs. The administrator runs `top`. The CPU is idle, meaning it's a memory issue. They press `M` to sort by RAM usage, and press `c` to see the full command paths. They instantly identify a rogue Python script (`python /opt/scripts/data_loader.py`) consuming 85% of the physical RAM (`RES` column), and press `k` to kill its PID immediately.

**Analyzing Multi-Core Saturation**

```bash
# Type `top`, press `1`
```

> A Node.js application is reporting sluggish response times. The overall CPU usage in the `top` header shows 25% on a 4-core machine, which seems fine. The admin presses `1` to expand the CPU metrics per core. They instantly see Core 0 is pinned at 100%, while Cores 1, 2, and 3 are at 0.0%. This reveals that the Node.js app is single-threaded and bottlenecked on a single core, proving the need to implement Node clusters.

## When should it NOT be used?

- **Long-term data collection:** **Do not use `top` to gather metrics over hours or days.** While batch mode (`-b`) exists, parsing `top` output is notoriously brittle and expensive. Use `sar`, Prometheus, or Telegraf for reliable, structured time-series data collection.
- **Deep I/O Monitoring:** `top` focuses on CPU and RAM. While it shows the `%wa` (I/O wait) state of the CPU, it cannot tell you _which_ process is reading/writing to the disk. You must use `iotop` or `pidstat -d` for process-level disk metrics.

## Alternatives

- **`htop`:** **The modern standard.** Provides a vastly superior, colorized, ncurses GUI. Supports vertical/horizontal scrolling, mouse clicks, and visual bar graphs for CPU/RAM, completely obsoleting standard `top` for human interaction.
- **`btop` / `bpytop`:** **Best for modern aesthetics.** Extremely feature-rich, graphically intense terminal monitors with built-in network and disk graphing.
- **`glances`:** **Best for comprehensive correlation.** Combines CPU, Memory, Disk I/O, and Network bandwidth into a single, compact table.

## How it works internally

`top` operates as a continuous polling engine inside a terminal drawing loop.

When launched, it establishes the dimensions of your terminal using the `ncurses` library (or `terminfo`). It opens and parses core files in the `/proc` virtual filesystem:

1. `/proc/stat`: To calculate total system CPU ticks since the last poll, generating the header percentages (`us`, `sy`, `id`, `wa`).
2. `/proc/meminfo`: To calculate total RAM, Free, Buffers, and Cached metrics.
3. `/proc/loadavg`: To grab the 1, 5, and 15-minute load averages.

It then iterates over every numeric directory in `/proc` (the PIDs). For each PID, it reads `/proc/[pid]/stat` and `/proc/[pid]/statm` to gather the process's CPU ticks, Resident Set Size (physical memory), Virtual memory, and state.

It calculates the delta (difference) between the CPU ticks recorded in the current poll and the previous poll to calculate the real-time `%CPU` column for each process. It loads these process objects into an array, applies a sorting algorithm based on the active sort column (e.g., Quicksort by CPU usage), and finally writes the formatted ASCII strings to the terminal buffer, clearing the screen before printing the new frame.

## Performance Notes

- **Self-Induced Load:** Running `top` with a very short delay (`top -d 0.1`) on a machine with 50,000 processes forces the utility to read 100,000+ files from `/proc` ten times a second. In extreme cases, `top` itself will become the highest CPU-consuming process on the system. Keep delays at a sane default (1.5 - 3.0 seconds).
- **CPU Percentage over 100%:** By default, `top` operates in "Irix mode". If a multi-threaded application utilizes two cores fully, `top` displays it as `200% CPU`. Pressing `Shift+I` toggles "Solaris mode", which divides the usage by the number of cores (so maxing two cores out of four would show as `50% CPU`).

## Security Notes

- **Namespace Visibility:** When running inside a Docker container, standard `top` reads the container's isolated `/proc`. It correctly shows only the container's processes. However, because Docker (historically) mounts the _host's_ memory and cpu telemetry files directly into the container without isolation, the header values (Total RAM, Total CPU usage) will reflect the massive host machine, not the container's resource limits, leading to severe diagnostic confusion. (Tools like `ctop` fix this).
- **Command Line Leaks:** Like `ps`, toggling the `-c` flag exposes plaintext credentials passed as arguments to binaries to anyone viewing `top` over your shoulder.

## Common Mistakes

- **Confusing VIRT and RES memory**
  - _Mistake:_ Seeing a Java process consuming 15GB in the `VIRT` (Virtual) column, panicking, and killing it, even though the server only has 8GB of physical RAM.
  - _Why:_ `VIRT` represents address space mapped by the process, including massive shared libraries and memory-mapped files on disk that aren't actually loaded into RAM. `RES` (Resident Set Size) is the only column that matters for OOM analysis—it represents the true physical RAM blocks currently bolted to the process.
- **Misinterpreting Free Memory**
  - _Mistake:_ Looking at the header, seeing `free` is 150MB on a 32GB server, and assuming the server is out of memory.
  - _Why:_ "Linux ate my RAM." The kernel aggressively uses unused memory to cache hard drive reads (`buff/cache` column). This memory is technically "used", but it is instantly discarded and yielded to applications if they request it. The true metric of available memory is `free` + `buff/cache` (which modern versions of `top` explicitly aggregate as `avail Mem`).

## Best Practices

- **Save Your Preferences:** `top`'s default view hides useful data. Run `top`, press `c` (full commands), press `1` (show all cores), press `z` (enable color to highlight running tasks), and then press `W`. This writes the configuration to `~/.toprc`, so `top` always launches optimized for your workflow.
- **Use Batch Mode for Crude Baselining:** If you are debugging a crash that happens overnight, run `top -b -n 2880 -d 30 > /tmp/top.log &`. This writes a snapshot every 30 seconds for 24 hours, giving you a crude, dependency-free text log to grep through the next morning without setting up Prometheus.

## Interview Questions

**Q: You are looking at the header in `top`. The CPU line shows several metrics, including `%id` and `%wa`. Explain the difference between these two states, and what a high `%wa` implies about your system.**
**A:** `%id` (Idle) represents the percentage of time the CPU is completely doing nothing, actively waiting for work. `%wa` (I/O Wait) represents the percentage of time the CPU is sitting idle _specifically because it is waiting for a disk or network I/O operation to complete_. A high `%wa` (e.g., >30%) implies your hard drives (or SAN) are bottlenecking the system; the CPU is starving for data and cannot process tasks efficiently.

**Q: While running `top`, you notice the `load average` reads `12.05, 10.15, 8.50`. The system has exactly 4 CPU cores. Is this system overloaded? Provide a brief explanation of how you determined the answer.**
**A:** Yes, the system is severely overloaded. The load average represents the number of processes actively using the CPU or waiting in the queue to use the CPU over 1, 5, and 15 minutes. A perfectly saturated 4-core system has a load average of exactly `4.0`. Because the 1-minute load average is `12.05`, there are roughly 8 processes constantly trapped in a backlog waiting for execution time, leading to significant sluggishness.

## Practice Problems

**Problem:** You are connected to a server. You want to execute `top` so that it isolates and displays only the processes owned by the web service user, `www-data`.
**Hint:** Use the flag specifically designed for user filtering.
**Solution:**

```bash
top -u www-data
```

**Problem:** You need to extract the absolute full command-line strings of processes for an automated report. You want to run `top` in a non-interactive text-stream mode, instruct it to expand the command paths, print exactly one snapshot, and then immediately exit so it can be piped to a file.
**Hint:** Combine the batch, iterations, and command-line expansion flags.
**Solution:**

```bash
top -b -n 1 -c
```

## References

- [top(1) - Linux man page](https://linux.die.net/man/1/top)
- [Linux Memory Management (understanding VIRT vs RES)](https://www.kernel.org/doc/html/latest/admin-guide/mm/index.html)
