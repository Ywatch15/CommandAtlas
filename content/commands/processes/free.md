---
slug: free
name: free
aliases: []
category: processes
tags:
  - linux
  - memory
  - ram
  - swap
  - metrics
  - performance
  - sysadmin
difficulty: beginner
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - check available ram linux
  - view memory usage
  - show swap space usage
  - find out how much memory is free
  - check linux memory cache
relatedCommands:
  - top
  - htop
  - vmstat
alternatives:
  - vmstat
  - top
status: draft
---

## What is it?

`free` is a standard Linux performance metric utility that displays the total amount of free and used physical memory (RAM) and swap space in the system. It also reports the memory consumed by the kernel's internal buffers and page caches, providing a critical, high-level snapshot of system memory health.

## Why does it exist?

Understanding memory utilization in Linux is notoriously counter-intuitive. The kernel aggressively consumes almost all "free" RAM to cache disk I/O, meaning raw "free" memory often sits near zero, causing panic for inexperienced administrators. `free` exists to parse the deeply complex data inside `/proc/meminfo` and present it via a standardized, mathematically corrected table. It distinctly separates hardware-locked memory from reclaimable cache memory, introducing the vital `available` metric to accurately reflect how much RAM can instantly be allocated to new applications without forcing the system into swap.

## Syntax

```bash
free [options]
```

## Flags

| Flag                    | Description                                                                                 | Example              |
| ----------------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| `-b`, `--bytes`         | Displays output strictly in raw bytes.                                                      | `free -b`            |
| `-k`, `--kilo`          | Displays output in kilobytes (the default behavior).                                        | `free -k`            |
| `-m`, `--mega`          | Displays output in megabytes (most common for readability).                                 | `free -m`            |
| `-g`, `--giga`          | Displays output in gigabytes.                                                               | `free -g`            |
| `-h`, `--human`         | Automatically scales values into human-readable formats (e.g., K, M, G, T).                 | `free -h`            |
| `--si`                  | Uses base-10 mathematics (1000) instead of base-2 (1024) for unit calculations.             | `free -h --si`       |
| `-t`, `--total`         | Appends a final row summarizing the sum total of physical RAM plus Swap space.              | `free -m -t`         |
| `-s <sec>`, `--seconds` | Continuously runs `free`, refreshing the output every specified number of seconds.          | `free -h -s 5`       |
| `-c <count>`, `--count` | Limits the continuous output (`-s`) to a specific number of iterations before exiting.      | `free -m -s 1 -c 10` |
| `-w`, `--wide`          | Splits the `buff/cache` column into two distinct, separate columns (`buffers` and `cache`). | `free -hw`           |
| `-V`, `--version`       | Displays version information for the `procps` suite.                                        | `free -V`            |

## Examples

```bash
free -h
```

> This is the most common usage. It prints the memory table using human-readable metrics (`Gi` for Gibibytes, `Mi` for Mebibytes), instantly showing the administrator the Total, Used, Free, and Available RAM capacities.

```bash
free -m -t
```

> This outputs everything in rigid Megabytes (`-m`), preventing unit-shifting in the columns. The `-t` flag adds a total line at the bottom combining RAM and Swap, useful for calculating total absolute virtual memory footprints.

```bash
free -h -s 2
```

> This transforms `free` into a continuous monitoring tool. It queries the kernel every 2 seconds (`-s 2`) and prints a new line, allowing an operator to visually track RAM consumption while simultaneously launching a heavy application.

```bash
free -hw
```

> This utilizes the wide format (`-w`). Instead of combining kernel buffers and filesystem page caches into a single `buff/cache` column, it splits them. This allows an engineer to distinguish raw disk I/O caching from kernel data structure buffering.

```bash
watch -n 1 free -m
```

> Rather than relying on `free -s` (which scrolls endlessly down the terminal), engineers wrap `free -m` inside the `watch` command. This creates a static, real-time dashboard that updates in-place every second.

## Real-World Scenarios

**Diagnosing Out-Of-Memory (OOM) Pressures**

```bash
free -m
```

> Upon receiving application latency alerts, an SRE runs `free -m`. If the `available` column is hovering near `0` and the `Swap used` column is rapidly increasing, the server is "thrashing" (violently writing RAM to disk). This mathematically proves the application is memory-starved.

**Auditing Database Cache Warmup**

```bash
free -m -s 10
```

> When a massive database (like PostgreSQL) restarts, administrators monitor `free` dynamically. They watch the `used` and `buff/cache` columns climb aggressively as the database pulls gigabytes of table indexes from the slow hard drive into the lightning-fast RAM page cache.

## When should it NOT be used?

- **Finding memory leaks in specific applications:** **Reason:** `free` only provides a global, macroscopic view of the entire server's RAM. It cannot tell you _which_ process is consuming the memory. **Use instead:** `top`, `htop`, or `ps aux --sort=-%mem`.
- **Deep kernel memory debugging:** **Reason:** `free` heavily abstracts the data. If you need to debug SLAB allocations, HugePages, or active/inactive anonymous memory boundaries, `free` hides this data. **Use instead:** `cat /proc/meminfo` or `vmstat`.

## Alternatives

- **`top` / `htop`:** Interactive process viewers. **Tradeoff:** They include the memory summary header but provide vast arrays of process-level data. `free` is superior for quick, pipeline-friendly snapshotting.
- **`vmstat` (Virtual Memory Statistics):** Deep memory telemetry. **Tradeoff:** `vmstat` provides profound insights into memory paging, swapping rates (`si/so`), and CPU context switches, but its raw block formatting is much harder to read at a glance than `free`.

## How it works internally

`free` operates entirely in user-space as a simple parser. It reads the raw telemetry generated by the Linux kernel exposed in the `/proc/meminfo` virtual file.

The crucial architectural design of Linux memory management is that **"Unused RAM is wasted RAM."** The kernel aggressively claims all unused memory to store filesystem cache (the `buff/cache` column) to radically accelerate disk read speeds. If an application suddenly requests memory, the kernel instantly drops portions of the cache to fulfill the application's request.

Historically, this confused users who saw `free` memory near `0` and assumed the server was crashing. To fix this, modern implementations of the `free` command calculate the `available` column.

The `available` column estimates how much memory can be given to a new application without forcing the kernel into swapping. It calculates this by taking `free` memory, plus reclaimable `page cache`, plus reclaimable `slab` memory, minus protection watermarks. Therefore, **the `available` column is the only metric that truly matters when assessing if a server has enough RAM.**

## Performance Notes

- Executing `free` consumes essentially zero CPU or disk I/O, as it merely reads a heavily optimized, dynamically generated RAM-based text file (`/proc/meminfo`). It is safe to poll thousands of times a minute in automation scripts.
- The `available` metric is an estimation algorithm maintained by the kernel (introduced in Linux 3.14). On extremely heavy database servers with complex shared memory configurations, this estimation can occasionally deviate slightly from absolute allocatable limits.

## Security Notes

- **Unprivileged Visibility:** Any user on the system can execute `free` to monitor global system memory. In highly secured multi-tenant environments, this technically leaks global host utilization metrics to unprivileged containers or users.

## Common Mistakes

- **The "Linux Ate My RAM" panic:** Looking at the `free` column and seeing 100MB remaining on a 64GB server. **Why it's wrong:** You are misinterpreting the architecture. Linux caches disk I/O heavily. You must look at the `available` column, which likely shows 60GB. The system is perfectly healthy.
- **Misunderstanding buffers vs. cache:** **Why it's wrong:** `buffers` are raw, block-device-level I/O caches (metadata, inode tables). `cache` is the Page Cache (the actual contents of files read from disk).
- **Parsing human-readable output in scripts:** Running `free -h | awk '{print $3}'`. **Why it's wrong:** `-h` outputs strings like `2.1G` or `800M`. Bash cannot natively perform math on strings with letters. Scripts must always use `-m` or `-b` for strict numerical extraction.

## Best Practices

- When configuring monitoring dashboards (like Zabbix or Datadog) for memory alerts, _never_ alert on "Free Memory < 10%". You must mathematically alert on "Available Memory < 10%", or your pagers will fire continuously.
- If your system is aggressively writing to the `Swap` layer while the `available` RAM is still high, the kernel's `vm.swappiness` sysctl value is likely tuned too aggressively for your workload.
- Use `watch -n 1 free -m` instead of `free -s 1`. `watch` clears the terminal screen and draws the table cleanly in place, making extended visual observation significantly less chaotic.

## Interview Questions

- _Query:_ A developer complains that their Linux server is critically low on memory because the `free` column in the `free -h` output only shows 200MB remaining out of 32GB. How do you explain the architecture to them, and what column should they be looking at?
  - _A:_ Linux follows the philosophy that "unused RAM is wasted RAM." It intentionally consumes all free memory to cache filesystem reads and writes (the `buff/cache` column) to maximize disk performance. If an application suddenly needs RAM, the kernel instantly discards the cache and hands the memory to the application. The developer must look at the `available` column, which represents the true amount of memory ready to be deployed without swapping.
- _Query:_ What is the functional difference between the `buffers` and `cache` memory classifications when utilizing the `free -hw` (wide) command?
  - _A:_ `buffers` represent memory allocated to cache kernel-level block device metadata, such as inode tables and raw disk block locations. `cache` (the Page Cache) represents memory containing the actual payload data of files recently read from or written to the storage drive.
- _Query:_ Why does utilizing Swap space heavily degrade application performance, and how does `free` indicate that a system is actively relying on it?
  - _A:_ Swap space uses physical storage drives (SSDs/HDDs) as virtual memory when physical RAM is exhausted. Because disk I/O is orders of magnitude slower than RAM, the CPU wastes massive cycles waiting for data to be paged in and out. In `free`, if the `Swap used` column is greater than 0 and growing, it indicates the kernel is out of physical RAM and is actively writing memory pages to the slow disk.

## Practice Problems

- _Problem:_ Generate a single memory report where all output is formatted rigidly in Megabytes to prevent unit-shifting, and ensure a final row calculates the absolute total of RAM and Swap combined.
  - _Hint:_ Combine the megabyte formatting flag with the total summation flag.
  - _Solution:_ `free -m -t` (This produces a clean, integer-only table with a unified bottom-line footprint).
- _Problem:_ Create a continuous monitoring feed that outputs human-readable memory statistics, refreshing automatically every 3 seconds, but halting execution completely after exactly 5 iterations.
  - _Hint:_ Combine the human-readable flag, the seconds interval flag, and the loop count limit flag.
  - _Solution:_ `free -h -s 3 -c 5` (This runs a controlled, self-terminating performance trace).

## References

- [Linux Documentation - /proc/meminfo](https://www.kernel.org/doc/Documentation/filesystems/proc.txt)
- [Linux Ate My RAM! (Educational Resource)](https://www.linuxatemyram.com/)
  === END FILE ===
