---
slug: htop
name: htop
aliases: []
category: processes
tags:
  - linux
  - processes
  - monitoring
  - top
  - interactive
  - performance
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
  - view processes interactively
  - monitor cpu and ram linux
  - kill process from ui
  - better top command linux
  - sort processes by memory
relatedCommands:
  - top
  - ps
  - kill
  - free
  - pgrep
  - nice
  - time
alternatives:
  - top
  - pstree
  - renice
status: draft
---

## What is it?

`htop` is an advanced, interactive, ncurses-based process viewer and system monitor for UNIX-like environments. Engineered as an incredibly robust drop-in replacement for the legacy `top` command, it provides real-time, color-coded visual telemetry of CPU, memory, and swap utilization, alongside a deeply scrollable and sortable list of active system processes.

## Why does it exist?

The original `top` command is universally installed but possesses severe UX limitations: it cannot be easily scrolled vertically to view processes falling off the screen, horizontal scrolling to read massive Java/Node arguments is absent, and killing or renicing processes requires typing explicit PIDs blindly. `htop` exists to eliminate this friction. It introduces mouse support, full vertical/horizontal scrolling, a dynamic process hierarchy (tree view), and interactive function keys (F7, F8, F9) allowing administrators to alter priorities and dispatch POSIX signals visually without touching the command line.

## Syntax

```bash
htop [options]
```

## Flags

| Flag                     | Description                                                                               | Example               |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------- |
| `-d`, `--delay <tenths>` | Sets the refresh delay interval in tenths of a second.                                    | `htop -d 5`           |
| `-u`, `--user <name>`    | Filters the process list, displaying only processes owned by the specified user.          | `htop -u nginx`       |
| `-p`, `--pid <pids>`     | Restricts the interface to display only the specific, comma-separated PIDs.               | `htop -p 1234,5678`   |
| `-t`, `--tree`           | Launches `htop` immediately utilizing the hierarchical process Tree view.                 | `htop -t`             |
| `-C`, `--no-color`       | Starts `htop` in monochrome mode, disabling all ANSI color rendering.                     | `htop -C`             |
| `-M`, `--no-mouse`       | Disables interactive mouse support, forcing pure keyboard navigation.                     | `htop -M`             |
| `-H`                     | Highlights new processes entering the list for a brief moment.                            | `htop -H`             |
| `--readonly`             | Launches `htop` in a secure, view-only mode, disabling the ability to `kill` or `renice`. | `htop --readonly`     |
| `-s`, `--sort-key <col>` | Launches the UI pre-sorted by a specific column (e.g., `PERCENT_MEM`, `PERCENT_CPU`).     | `htop -s PERCENT_MEM` |
| `-V`, `--version`        | Displays version information for the `htop` utility.                                      | `htop -V`             |

## Examples

```bash
htop
```

> This invokes the default interactive interface. The top header displays color-coded bars for CPU threads, RAM, and Swap. The bottom section lists all active processes, allowing you to use arrow keys to navigate and `F10` to gracefully quit.

```bash
htop -u postgres
```

> This launches the interface pre-filtered to strictly monitor database processes. It hides all background system daemons, ensuring the operator focuses entirely on the compute footprint of the `postgres` user.

```bash
htop -d 10
```

> This modifies the polling frequency. It sets the interface to refresh every 10 tenths of a second (1 second). This is useful on exceptionally busy servers where rapid 0.1-second refreshing makes tracking jumping processes visually impossible.

```bash
htop -t -s PERCENT_MEM
```

> This launches the interface using the hierarchical Tree view (`-t`), which draws lines connecting parent processes to their spawned children. Concurrently, it sorts the entire matrix based on absolute Memory utilization (`-s PERCENT_MEM`).

```bash
htop --readonly
```

> This launches `htop` in a secured state. Security administrators utilize this flag when configuring jump-hosts or restricted shells, allowing junior operators to view system health but mathematically preventing them from using `F9` to execute `SIGKILL` on critical processes.

## Real-World Scenarios

**Diagnosing Multithreaded Application Hangs**

```bash
# Inside htop UI: Press 'H' to show user threads, 't' for tree view
```

> Applications like Java or Elasticsearch spawn hundreds of internal threads. In standard `top`, these are merged or hidden. In `htop`, engineers press `H` to explode the process into its constituent threads, instantly visually isolating exactly which sub-thread is deadlocking a CPU core at 100%.

**Surgical Process Assassination**

```bash
htop -u www-data
```

> A rogue PHP worker script enters an infinite loop, consuming massive RAM. The administrator launches `htop`, presses `/` to search for "php", uses the arrow keys to highlight the offending PID, and presses `F9` to send a `SIGKILL` (9), eliminating the threat without ever needing to copy/paste numeric PIDs.

**Live Priority Throttling (Renice)**

```bash
# Inside htop UI: Highlight process, press 'F8'
```

> A massive `gzip` backup cron job kicks off during peak business hours, causing frontend web requests to lag. The operator highlights the `gzip` process in `htop` and presses `F8` iteratively to increase its "niceness" (lowering its CPU priority). The kernel instantly yields CPU time back to the web server, saving the user experience.

## When should it NOT be used?

- **Automated metric collection:** **Reason:** `htop` is fundamentally an interactive, curses-based visual application. It is structurally impossible to pipe its UI output into automated scripts, `grep`, or time-series databases. **Use instead:** `top -b` (batch mode) or `pidstat`.
- **Highly restricted, minimal containers:** **Reason:** `htop` is not POSIX standard and must be explicitly installed via package managers. Embedding it in every 10MB Alpine Docker container wastes space. **Use instead:** Standard `top`, which is bundled natively in almost every UNIX distribution.

## Alternatives

- **`top`:** The universal standard. **Tradeoff:** Pre-installed globally and supports non-interactive batch processing, but features a dated, clunky UX that makes rapid visual triage difficult.
- **`btop` / `bashtop`:** Next-generation monitors. **Tradeoff:** Exceedingly beautiful, featuring massive graphical histograms and deep disk/network I/O telemetry, but consumes slightly more overhead and is less ubiquitous than `htop`.
- **`glances`:** Python-based overall system monitor. **Tradeoff:** Integrates disk, network, and temperature sensors alongside processes, and supports exposing a web UI, but its Python interpreter architecture incurs massive CPU overhead compared to C-compiled `htop`.

## How it works internally

`htop` is a C application built utilizing the `ncurses` terminal UI library.

Like all Linux process monitors, it has no special access to the kernel. It operates entirely in user-space by rapidly crawling and parsing the `/proc` virtual filesystem. The global CPU and Memory meters at the top of the UI are generated by parsing `/proc/stat` and `/proc/meminfo`.

To populate the process list, `htop` iterates sequentially through every numeric directory in `/proc/` (e.g., `/proc/1234/`). It reads the `stat`, `statm`, and `cmdline` files within each directory to calculate CPU ticks, memory pages mapped, and the raw execution arguments.

For the graphical CPU meters, the color-coding is highly technical: **Green** represents user-space compute time, **Red** represents kernel-space (sys) time, and **Blue** represents low-priority (niced) thread execution.

When you execute an action in the UI, such as killing a process (`F9`), `htop` captures the PID of the highlighted row and invokes the standard POSIX `kill()` system call. When altering priority (`F7/F8`), it invokes the `setpriority()` system call.

## Performance Notes

- Polling `/proc` for tens of thousands of processes generates significant CPU overhead. Setting the refresh rate extremely low (`htop -d 1`) on massive enterprise nodes will cause `htop` itself to consume an entire CPU core just to render the UI.
- The Tree View (`t`) algorithm requires `htop` to parse Parent PIDs (PPIDs) across the entire process list and sort them topologically into a linked list in RAM before rendering, which can introduce minor UI stuttering on overloaded systems.

## Security Notes

- **Unprivileged Visibility:** Any user can run `htop`, but the kernel strictly masks the memory mappings (`/proc/pid/maps`) and execution arguments of processes they do not own. Running `sudo htop` is mandatory to gain absolute visibility into the execution context of root-owned daemons and system services.
- **Root Escapes via `lsof` Integration:** In the `htop` UI, pressing `l` executes `lsof` to show open files for a process. If executed as root, and if the environment is misconfigured, interactive terminal spawning might introduce minor escape vectors. `--readonly` mitigates administrative execution risks.

## Common Mistakes

- **Misinterpreting CPU percentages:** Seeing a process utilizing `300%` CPU and panicking. **Why it's wrong:** In Linux process monitoring, `100%` represents a single CPU core. A process utilizing `300%` simply means its execution threads are completely saturating exactly 3 physical or logical cores. On a 64-core machine, `300%` is barely a dent.
- **Confusing Virtual Memory (VIRT) with Resident Memory (RES):** Trying to kill a Java app because `htop` shows it using 15GB of VIRT memory. **Why it's wrong:** VIRT includes everything the process has _mapped_, including shared libraries, swapped pages, and reserved-but-empty JVM heap allocations. The `RES` (Resident Set Size) column indicates the actual physical RAM currently hijacked by the application.
- **Failing to exit cleanly:** Suspending `htop` with `Ctrl+Z` instead of pressing `F10` or `q`. **Why it's wrong:** `Ctrl+Z` background-suspends the application. Users often do this multiple times, leaving half a dozen zombie `htop` processes paused in memory, leaking terminal resources.

## Best Practices

- Leverage the interactive search and filter functionality heavily. Pressing `/` searches globally, but pressing `\` (filter) restricts the visual list to _only_ processes matching the string, which is infinitely superior for tracking ephemeral workers.
- In the setup menu (`F2`), navigate to Display Options and enable "Highlight program 'basename'". This visually dims long, complex directory paths in the `Command` column and highlights the actual binary executing, making rapid triage significantly easier.
- Understand the color coding of the RAM meter: Green is actual consumed memory, Blue is buffer cache (dynamically freeable by the kernel), and Yellow/Orange is memory actively written to the slow disk Swap space.

## Interview Questions

**Q:** In the graphical CPU bars at the top of the `htop` interface, you notice a massive spike in the **Red** color band on all cores, while the **Green** band is nearly empty. What does this signify about the system's current bottleneck?
**A:** Green represents user-space execution (the actual application code). Red represents kernel-space execution (sys time). A massive red spike indicates the CPU is spending all its time processing kernel-level system calls or hardware interrupts. This is typically a severe bottleneck, often caused by massive disk I/O thrashing, network stack saturation, or a driver malfunctioning, rather than application logic.
**Q:** Why would a Systems Administrator choose to launch `htop` using the `--readonly` flag on a shared bastion host?
**A:** The standard `htop` interface allows users to highlight processes and use the `F7/F8` keys to change execution priority (`renice`) or the `F9` key to send fatal POSIX signals (`kill`). Providing `--readonly` locks the interface into a pure observation mode. It allows unprivileged users or junior admins to visually inspect system health, but completely disables the internal system calls that alter kernel state, preventing accidental or malicious service termination.
**Q:** A developer complains that their multi-threaded application is running slowly, but in `htop`, the application only appears as a single row. How do you alter the `htop` interface to diagnose the individual threads?
**A:** By default, `htop` aggregates all sub-threads into the primary parent process row to keep the interface clean. By pressing `Shift+H` (or checking the setting in `F2`), `htop` disables this aggregation and explodes the view, displaying every single user-space thread as an independent row with its own distinct CPU utilization percentage.

## Practice Problems

**Problem:** Launch `htop` specifically filtered to observe only the processes owned by the `nginx` user, and ensure the interface starts with the hierarchical Tree view already enabled.
**Hint:** Combine the user-filtering flag with the tree-view initialization flag.
**Solution:** `htop -u nginx -t` (This isolates the view to the web server daemons, linking the master and worker processes visually).
**Problem:** Start the `htop` monitor with a heavily reduced polling frequency, refreshing only once every 5 seconds, and ensure the interface disables all color rendering.
**Hint:** Utilize the delay flag (remembering it relies on tenths of a second) and the monochrome flag.
**Solution:** `htop -d 50 -C` (This reduces CPU polling overhead drastically and formats the output safely for highly constrained or broken terminal emulators).

## References

- [htop Official Homepage](https://htop.dev/)
- [Man Page for htop (Linux)](https://man7.org/linux/man-pages/man1/htop.1.html)
  === END FILE ===
