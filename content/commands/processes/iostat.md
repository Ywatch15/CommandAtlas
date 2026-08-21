---
slug: iostat
name: iostat
aliases:
  - input/output statistics
category: processes
tags:
  - linux
  - performance
  - disk
  - cpu
  - io
  - sysstat
  - metrics
difficulty: intermediate
supportedOS:
  - linux
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - check disk io performance linux
  - monitor cpu and disk usage
  - find disk bottleneck
  - check storage read write speeds
  - view disk latency iostat
relatedCommands:
  - vmstat
  - sar
  - top
  - fdisk
alternatives:
  - sar
status: draft
---

## What is it?

`iostat` is an advanced performance monitoring command-line utility, part of the `sysstat` package. It generates detailed reports detailing Central Processing Unit (CPU) utilization alongside Input/Output (I/O) statistics for block devices and physical partitions, crucial for identifying disk bottlenecks and throughput saturation.

## Why does it exist?

While utilities like `top` or `free` excel at isolating CPU and RAM hogs, identifying exactly _why_ a database query is slow often points to storage bottlenecks. Operating systems cache complex disk writes, masking the physical hardware limits. `iostat` exists to pierce this abstraction. It translates deep kernel block-layer telemetry into actionable metrics—exposing raw read/write megabytes per second, queue depths, and precise millisecond wait latencies—allowing administrators to mathematically prove if a specific hard drive or SAN array is the root cause of application latency.

## Syntax

```bash
iostat [options] [interval [count]]
```

## Flags

| Flag          | Description                                                                                       | Example            |
| ------------- | ------------------------------------------------------------------------------------------------- | ------------------ |
| `-c`          | Displays only the CPU utilization report, omitting all disk device statistics.                    | `iostat -c 2`      |
| `-d`          | Displays only the device (disk) utilization report, omitting the CPU statistics.                  | `iostat -d 2 5`    |
| `-x`          | Displays extended statistical metrics (e.g., await, %util, aqu-sz), essential for deep debugging. | `iostat -dx 1`     |
| `-t`          | Prints a timestamp for each generated report cycle.                                               | `iostat -t 5`      |
| `-m`          | Displays statistics in Megabytes per second (MB/s) rather than Blocks/s or KB/s.                  | `iostat -dm 2`     |
| `-k`          | Displays statistics in Kilobytes per second (KB/s) (often default depending on OS version).       | `iostat -dk 2`     |
| `-p <device>` | Displays statistics for the specified block device and all of its underlying partitions.          | `iostat -p sda 2`  |
| `-y`          | Omits the very first report generated since system boot, displaying only live interval data.      | `iostat -y -d 1 3` |
| `-z`          | Omits devices from the output that had exactly zero I/O activity during the sample period.        | `iostat -dxz 2`    |
| `-V`          | Displays the version number of the `sysstat` package.                                             | `iostat -V`        |

## Examples

```bash
iostat
```

> Without arguments, this outputs a single, static report. It displays average CPU utilization and basic device read/write metrics aggregated _since the system last booted_. This first output is generally useless for real-time debugging.

```bash
iostat -dxm 2 5
```

> This is the definitive diagnostic invocation. It isolates disk metrics (`-d`), utilizes extended telemetry columns (`-x`), and formats throughput in Megabytes (`-m`). It queries the kernel every `2` seconds, running exactly `5` times before exiting, providing a highly accurate window of live disk latency.

```bash
iostat -c 1
```

> This isolates the CPU report (`-c`) and streams it continuously every 1 second. It displays `%user`, `%system`, `%iowait`, and `%idle` across all cores, immediately revealing if the CPU is locked up waiting for slow disks (`%iowait`).

```bash
iostat -p nvme0n1 -dx 1
```

> This restricts the massive output matrix to a single physical NVMe device (`-p`), but simultaneously expands the report to include metrics for every individual partition residing on that specific drive, isolating logical bottlenecks.

```bash
iostat -dxz 5
```

> On a large enterprise server with dozens of mapped SAN volumes or LVMs, this streams extended metrics every 5 seconds but uses the `-z` flag to completely hide any drives experiencing zero traffic, keeping the terminal output clean and focused.

## Real-World Scenarios

**Diagnosing Database "IOWait" Deadlocks**

```bash
iostat -c -d -x 2
```

> A PostgreSQL database becomes unresponsive. The DBA executes `iostat`. The CPU report shows `%iowait` hovering at 80%. The extended disk report (`-x`) shows the `%util` (utilization) of `/dev/sdb` at 100%, with an `await` (latency) of 450ms. This mathematically proves the physical disk is completely saturated and cannot handle the required IOPS.

**Validating Cloud Storage Provisioning Limits**

```bash
iostat -dm 1
```

> Cloud engineers attaching new AWS EBS or GCP Persistent Disks run an `fio` benchmark while monitoring `iostat -dm 1`. They watch the `MB_read/s` and `MB_wrtn/s` columns to verify that the cloud provider is actually delivering the provisioned throughput tier (e.g., 250 MB/s) to the kernel.

## When should it NOT be used?

- **Identifying _which_ specific process is thrashing the disk:** **Reason:** `iostat` only monitors physical hardware devices (`/dev/sda`). It cannot link disk utilization to specific PIDs or user applications. **Use instead:** `iotop` or `pidstat -d`.
- **Analyzing network bottleneck latency:** **Reason:** `iostat` is strictly bound to CPU interrupts and block device hardware queues. It is entirely blind to network socket traffic or NFS latency. **Use instead:** `iperf` or `ss`.

## Alternatives

- **`iotop`:** Process-level I/O. **Tradeoff:** `iotop` functions like `top` for disks, revealing exactly which process (e.g., `mysql` vs `tar`) is consuming bandwidth, whereas `iostat` proves the hardware's aggregate limits.
- **`sar -d`:** Historical metrics. **Tradeoff:** `sar` (also part of sysstat) records `iostat` data historically via background cron jobs, allowing you to view yesterday's I/O peaks, whereas `iostat` excels at live, real-time polling.
- **`dstat`:** Unified resource statistics. **Tradeoff:** `dstat` combines CPU, Network, and Disk into a single, beautifully colorized scrolling pipeline, but lacks the profound depth of `iostat -x` extended queue and wait metrics.

## How it works internally

`iostat` executes completely in user-space by acting as a highly optimized mathematical parser. It reads massive blocks of kernel counters exposed via two primary virtual files: `/proc/stat` (for CPU timings) and `/proc/diskstats` (for block device telemetry).

The Linux kernel block layer tracks every single read/write request crossing the hardware boundary. It increments counters for bytes read, bytes written, time spent in queues, and time the device was active.

When you run `iostat 2`, the utility takes an initial snapshot of these kernel counters. It pauses for exactly 2 seconds, takes a second snapshot, and calculates the delta between the two states. It applies the CPU tick rate (`USER_HZ`) to transform raw sector counts and tick integers into human-readable throughput rates (MB/s) and latency averages (`await`, `r_await`, `w_await`). Because it calculates deltas over time, the very first output of `iostat` is always an average since system boot, which must be ignored via the `-y` flag when diagnosing real-time incidents.

## Performance Notes

- Executing `iostat` consumes virtually zero system resources. It performs a lightweight string parse of in-memory `/proc` arrays. It is mathematically safe to run `iostat 1` continuously for hours during performance benchmarks.
- On massive Kubernetes nodes utilizing technologies like Longhorn or hundreds of Docker containers mapping overlay virtual devices, the output of `iostat` can become an unreadable wall of thousands of loopback devices. Aggressive use of `-p` or `grep` is required.

## Security Notes

- **No PII or Secret Exposure:** `iostat` tracks aggregate hardware physics. It does not track filenames, namespaces, or file contents. Running it poses zero data-leakage risk.
- **Unprivileged Execution:** Standard users can typically execute `iostat` because `/proc/diskstats` is globally readable. While safe, this theoretically allows multi-tenant users to infer the workload patterns of other tenants sharing the bare-metal hardware.

## Common Mistakes

- **Trusting the very first output block:** **Why it's wrong:** The first report generated by `iostat` (without `-y`) is the historical average calculated since the exact moment the Linux server was booted. If the server has been running for 3 years, the first block is mathematically meaningless for live debugging. Always look at the _second_ block generated by interval execution.
- **Misinterpreting `%util` as absolute capacity:** Seeing `%util` hit 100% and assuming the drive is maxed out. **Why it's wrong:** `%util` measures the percentage of time the device had _at least one_ I/O request in flight. On modern NVMe SSDs or RAID arrays capable of parallel queues, 100% `%util` just means it's busy, not saturated. You must evaluate the `await` (latency) and `aqu-sz` (queue size) to prove true saturation.
- **Ignoring `%iowait` in CPU metrics:** Looking at `%user` at 5% and assuming the application is broken. **Why it's wrong:** If `%iowait` is 80%, the CPU is intentionally halting and wasting clock cycles waiting for the slow hard drive to return data. The application isn't broken; the storage is.

## Best Practices

- Always memorize and utilize `iostat -dxym 1` as your default diagnostic incantation. It skips the useless boot history (`-y`), provides extended deep metrics (`-x`), forces Megabyte readability (`-m`), and pulses every second for real-time fidelity.
- When evaluating cloud storage performance, pay strict attention to `r_await` (read latency) vs `w_await` (write latency). High write latency often indicates cloud provider IOPS throttling, while high read latency often indicates poor application caching mechanics.

## Interview Questions

**Q:** An alert fires indicating a production database server is sluggish. You log in and run `iostat -c 1`. The `%user` and `%sys` CPU metrics are extremely low, but the `%iowait` column is hovering at 65%. Explain the architectural cause of this state.
**A:** The `%iowait` metric represents the percentage of time that the CPU was completely idle, but had outstanding, unfulfilled disk I/O requests. The database is requesting data, but the physical storage (SAN or local disk) is too slow to deliver it. The CPU is actively blocked, waiting for hardware interrupts from the storage controller. The bottleneck is the disk, not the CPU capacity.
**Q:** When looking at the extended output of `iostat -x`, why is it a critical mistake to assume that a `%util` of 100% means an NVMe Solid State Drive is completely saturated and cannot accept more traffic?
**A:** `%util` represents the percentage of time the block device was actively processing at least one I/O request. Legacy spinning hard drives (HDDs) process operations serially; 100% utilization meant saturation. Modern NVMe SSDs possess deep parallel hardware queues. They can process thousands of concurrent operations. An NVMe drive at 100% `%util` simply means it is never idle, but it could still have massive amounts of parallel bandwidth available. Saturation on modern drives is determined by skyrocketing `await` (latency) times, not `%util`.
**Q:** Why does a seasoned systems engineer intentionally ignore the very first block of text output when executing `iostat 2`?
**A:** Because `iostat` calculates throughput by measuring the delta between kernel counters over time. The very first output lacks a preceding snapshot, so it calculates the delta between the _current_ moment and the _exact moment the system booted_. It represents the historical average since boot time, which is entirely useless for diagnosing a live, real-time latency incident.

## Practice Problems

**Problem:** Generate a continuous, real-time disk performance report every 2 seconds. Ensure the output utilizes Megabytes per second, displays extended wait/latency metrics, and completely discards the initial historical boot-time summary.
**Hint:** Combine the interval argument with the disk-only, extended, megabyte, and historical-discard flags.
**Solution:** `iostat -dxym 2` (This is the ultimate live disk troubleshooting execution).
**Problem:** Output an extended statistics report isolated strictly to the physical `sda` drive, running 3 times at 1-second intervals, but suppress any partitions on the drive that experienced absolutely zero disk activity during that window.
**Hint:** Chain the physical target device flag, zero-suppression flag, and the interval/count integers.
**Solution:** `iostat -p sda -xz 1 3` (This provides a clean, surgically targeted snapshot of active disk segments).

## References

- [Sysstat Utilities Documentation](https://github.com/sysstat/sysstat)
- [Man Page for iostat (Linux)](https://man7.org/linux/man-pages/man1/iostat.1.html)
  === END FILE ===
