---
slug: time
name: time
aliases: [execution timer]
category: unix
tags: [linux, performance, profiling, timer, benchmark]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'measure execution time of command bash'
  - 'get CPU and memory time for process'
  - 'benchmark script execution time'
  - 'time GNU time detailed output'
  - 'profile linux process time'
relatedCommands: [top, htop, ps, strace]
alternatives: [strace]
status: draft
---

## What is it?

`time` is a diagnostic utility used to measure the execution duration and resource utilization of a specified command. It records the absolute elapsed wall-clock time, alongside the granular CPU time consumed within user-space and kernel-space, providing developers with immediate, high-level profiling telemetry to identify performance bottlenecks.

## Why does it exist?

When a script or binary executes slowly, identifying the bottleneck requires understanding where the CPU cycles are being spent. If an application takes 10 seconds to run, but only utilizes 0.1 seconds of CPU time, the application is not computationally heavy; it is blocked waiting for external I/O (like disk reads or network latency). `time` exists to expose this exact breakdown natively, tapping directly into the kernel's resource tracking structures (`rusage`) to deliver precise accounting of execution physics without requiring complex trace compilations.

## Syntax

```bash
time [options] command [arguments...]
/usr/bin/time [options] command [arguments...]
```

## Flags

_(Note: There is a critical distinction between the `time` bash keyword and the `/usr/bin/time` GNU binary. The bash keyword lacks most flags. The flags below strictly apply to the GNU binary `/usr/bin/time`)_

| Flag                               | Description                                                                                                                 | Example                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `-v`, `--verbose`                  | Dumps extremely detailed, multiline telemetry including maximum Resident Set Size (RAM), page faults, and context switches. | `/usr/bin/time -v ./script.sh`          |
| `-p`, `--portability`              | Forces output into the strict, standardized POSIX format (`real`, `user`, `sys` on separate lines).                         | `/usr/bin/time -p sleep 2`              |
| `-o <file>`, `--output=<file>`     | Writes the resource usage statistics directly to a specified file instead of standard error.                                | `/usr/bin/time -o perf.log make`        |
| `-a`, `--append`                   | Used with `-o`. Appends the metrics to the output file rather than overwriting it.                                          | `/usr/bin/time -a -o perf.log ls`       |
| `-f <format>`, `--format=<format>` | Allows the creation of custom, programmatic output strings utilizing specific metric format specifiers.                     | `/usr/bin/time -f "RAM: %M KB" ./app`   |
| `--quiet`                          | Suppresses non-zero exit status warnings (e.g., "Command exited with non-zero status 1").                                   | `/usr/bin/time --quiet ./fail.sh`       |
| `%e`                               | (Format Specifier) Prints elapsed real (wall-clock) time in seconds.                                                        | `/usr/bin/time -f "%e" sleep 1`         |
| `%S`                               | (Format Specifier) Prints total number of CPU-seconds consumed in kernel mode (System time).                                | `/usr/bin/time -f "%S" dd if=/dev/zero` |
| `%U`                               | (Format Specifier) Prints total number of CPU-seconds consumed in user mode (User time).                                    | `/usr/bin/time -f "%U" md5sum`          |
| `%M`                               | (Format Specifier) Prints the Maximum Resident Set Size (peak physical RAM consumed) in Kilobytes.                          | `/usr/bin/time -f "Peak: %M" ./app`     |

## Examples

```bash
time sleep 2
```

> This invokes the standard bash built-in keyword. It executes the `sleep 2` command and prints three metrics: `real` (total elapsed wall-clock time: ~2.000s), `user` (CPU time in user space: ~0.000s), and `sys` (CPU time in kernel space: ~0.000s).

```bash
/usr/bin/time -v tar -czf backup.tar.gz /var/log
```

> This explicitly calls the GNU binary executable to access advanced metrics. The verbose (`-v`) flag outputs a profound diagnostic block detailing the command's peak physical RAM consumption (Maximum resident set size), major/minor page faults, and involuntary context switches, making it an instant memory-leak profiler.

```bash
/usr/bin/time -o build_metrics.log -a make -j4
```

> This is an automated benchmarking pattern. It executes a heavy C-compilation (`make`), capturing the performance metrics and appending them (`-a`) directly into a dedicated tracking file (`-o build_metrics.log`), preventing the metrics from visually polluting the standard terminal output.

```bash
/usr/bin/time -f '{"app": "nginx", "ram_kb": %M, "cpu_user": %U}' systemctl restart nginx
```

> This demonstrates advanced programmatic telemetry extraction. By utilizing the format (`-f`) flag, the administrator crafts a perfectly structured JSON payload injecting the specific metrics (Peak RAM and User CPU), which can be piped directly into external monitoring or timeseries databases.

## Real-World Scenarios

**Identifying I/O Bound vs. CPU Bound Bottlenecks**

```bash
time find / -name "*.conf"
```

> A system administrator executes a massive filesystem search. The output reveals `real 1m30s`, `user 0m1.5s`, and `sys 0m4.2s`. Because the user and sys CPU times combined (~6 seconds) are massively dwarfed by the real time (90 seconds), the administrator mathematically proves the system is critically bottlenecked by slow mechanical hard drive read speeds, not CPU processing limits.

**Auditing Ephemeral Script Memory Footprints**

```bash
/usr/bin/time -f "Peak RAM: %M KB" ./data_parser.py
```

> Data scientists executing complex Python algorithms need to ensure their scripts won't trigger the kernel OOM-killer when deployed to a 2GB cloud instance. They prefix their execution with the GNU time binary to extract the absolute peak Resident Set Size (`%M`), validating the mathematical bounds of their RAM arrays.

## When should it NOT be used?

- **Micro-benchmarking single-millisecond operations:** **Reason:** The overhead of OS process creation (`fork`/`exec`) fundamentally skews results on commands that execute in less than 10 milliseconds. Running `time echo "hi"` measures the shell execution, not the `echo` itself. **Use instead:** Modern benchmarking tools like `hyperfine` which handle statistical warmup and cache-clearing iterations natively.
- **Deep C/C++ function profiling:** **Reason:** `time` only records macroscopic telemetry for the entire binary runtime. It cannot tell you _which_ internal function caused the CPU spike. **Use instead:** `perf record` or `valgrind`.

## Alternatives

- **`hyperfine`:** Statistical benchmarking. **Tradeoff:** A massively superior, modern rust-based utility that executes commands multiple times, tracks standard deviation, handles statistical outliers, and generates markdown comparison tables natively.
- **`perf stat`:** The kernel profiler. **Tradeoff:** Digs exponentially deeper than `time`, utilizing CPU hardware performance counters to report instruction cycles, L1/L2 cache misses, and branch mispredictions, but requires deeper architectural knowledge to parse.
- **`strace -c`:** Syscall profiling. **Tradeoff:** Records exactly how much time an application spent executing specific kernel system calls (e.g., `read()` vs `mmap()`), identifying precise OS interaction bottlenecks.

## How it works internally

Understanding `time` requires navigating the strict divergence between the **Shell Built-in** and the **GNU Binary**.

If you type `time cmd`, the Bash shell intercepts the keyword. It executes the command internally, measuring elapsed time using the `gettimeofday()` system call before and after execution. It tracks CPU ticks utilizing the kernel's process accounting structures. Crucially, because it is a shell keyword, it natively times the _entire pipeline_: `time ls | grep | wc` measures the execution of all three commands combined.

If you type `/usr/bin/time cmd`, you invoke an independent C binary. This binary utilizes the `fork()` and `execve()` system calls to spawn your target command as a child process. The binary then blocks, issuing the `wait4()` or `wait3()` system call.

When the child process terminates, the kernel wakes up the `time` binary and hands it a `struct rusage` (Resource Usage) payload. The Linux kernel maintains this struct automatically for every process. It tracks exact CPU scheduling ticks, memory high-water marks (peak RAM), and page faults physically executed by the Memory Management Unit (MMU). The `/usr/bin/time` binary simply parses this C struct and formats the integers to standard error.

## Performance Notes

- Executing the `time` command introduces effectively zero performance penalty or instrumentation overhead to the target application. It purely retrieves the accounting metrics the kernel was already mathematically obligated to track.
- The `sys` time output does not account for time the kernel spent processing asynchronous hardware interrupts on behalf of the process (like incoming network packet processing), occasionally resulting in slightly skewed telemetry for heavy network servers.

## Security Notes

- **No inherent security risks:** `time` acts purely as an execution wrapper. However, when using `/usr/bin/time -o file.log`, ensure the execution context has appropriate write permissions to the target log file, or the command will fail silently.

## Common Mistakes

- **Trying to pass flags to the shell built-in:** Running `time -v ls`. **Why it's wrong:** The Bash keyword `time` does not accept flags; it interprets `-v` as the command you are trying to execute, throwing `command not found: -v`. You must explicitly call the absolute path `/usr/bin/time -v ls` to access the GNU binary features.
- **Failing to capture the output:** Running `time ./script.sh > out.log`. **Why it's wrong:** `time` writes its telemetry explicitly to standard error (`stderr`), not standard output. The command above saves the script's output to `out.log`, but prints the time metrics directly to your terminal. To capture the time metrics, you must merge the streams (`time ./script.sh > out.log 2>&1`) or use the GNU `-o` flag.
- **Misinterpreting "Real" time on multiprocessors:** Running `time make -j8` and seeing `real 10s`, `user 60s`. **Why it's wrong:** Developers often panic when `user` time exceeds `real` time. This is mathematically correct on multi-core systems. If an application uses 8 CPU cores perfectly for 10 seconds of wall-clock (`real`) time, it has successfully consumed 80 seconds of aggregate `user` CPU time.

## Best Practices

- When executing heavy analytical operations within bash scripts, consistently wrap the execution in the `time` keyword and redirect standard error to an audit log. This provides continuous, zero-cost regression testing data over the lifecycle of the script.
- Universally deploy `/usr/bin/time -v` when writing Dockerfiles or CI/CD pipelines to validate memory boundaries. Extracting the "Maximum resident set size" ensures containerized microservices aren't creeping toward their strict Kubernetes RAM limits.
- To accurately benchmark a script that utilizes disk I/O, execute the command once to warm up the Linux Page Cache, discard the result, and execute it a second time. This provides the true speed of the algorithm without the interference of cold physical disk reads.

## Interview Questions

**Q:** You execute `time my_database_query.sh`. The terminal outputs `real 2m0.00s`, `user 0m0.05s`, `sys 0m0.01s`. Explain what these three metrics mean individually, and identify the primary architectural bottleneck of this script.
**A:** `real` is the total wall-clock time elapsed from start to finish (120 seconds). `user` is the actual CPU time spent executing the application's internal logic (0.05 seconds). `sys` is the CPU time spent in kernel-space executing system calls (0.01 seconds). Because the script consumed effectively zero CPU time but took 2 minutes to finish, the bottleneck is entirely I/O bound. The script is mathematically frozen waiting on network latency from the database or slow disk read speeds.
**Q:** Why does executing `time -v ls` fail with a "command not found" error, but executing `/usr/bin/time -v ls` successfully prints verbose memory statistics?
**A:** The string `time` is a reserved Bash shell keyword. When typed natively, the shell intercepts it and runs its own highly stripped-down internal timing function, which possesses no command-line flags. Bash attempts to execute `-v` as the literal binary target and crashes. To access advanced features like verbose RAM telemetry, the administrator must explicitly invoke the absolute path to the external GNU `time` binary installed on the filesystem, bypassing the shell keyword intercept.
**Q:** You are writing a deployment script and want to capture the execution metrics generated by the `time` keyword into a dedicated text file named `metrics.log`, without capturing the actual output of the script itself. How do you route the streams?
**A:** The `time` utility explicitly outputs its telemetry to standard error (File Descriptor 2), whereas the script outputs to standard output (File Descriptor 1). The correct routing syntax is: `{ time ./script.sh > /dev/null; } 2> metrics.log`. This executes the command block, throws the script's functional output into the void, and cleanly routes the timing metrics from standard error into the log file.

## Practice Problems

**Problem:** Benchmark the command `grep -R "error" /var/log/`. You must extract the absolute peak physical RAM consumed by the command (Maximum Resident Set Size) without relying on the shell keyword.
**Hint:** Force execution of the external GNU binary and append the verbose telemetry flag.
**Solution:** `/usr/bin/time -v grep -R "error" /var/log/` (The output block will display `Maximum resident set size (kbytes)` natively).
**Problem:** Execute a script `./processor.sh`. Force the `time` utility to log its diagnostic metrics directly to a file named `benchmark.log`, specifically instructing it to append the data rather than overwrite the file, without affecting the script's standard output.
**Hint:** Utilize the external GNU binary and its specific formatting flags for output diversion and appending.
**Solution:** `/usr/bin/time -o benchmark.log -a ./processor.sh` (This safely isolates the metrics ledger entirely outside the bash stream architecture).

## References

- [GNU Time Manual](https://www.gnu.org/software/time/)
- [Linux Programmer's Manual - wait4 (kernel rusage internals)](https://man7.org/linux/man-pages/man2/wait4.2.html)
  === END FILE ===
