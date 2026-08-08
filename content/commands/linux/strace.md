---
slug: strace
name: strace
aliases: []
category: linux
tags:
  - strace
difficulty: advanced
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - trace system calls of a process
  - debug hanging process
  - see what files a process opens
  - find missing shared library
  - profile process system call time
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`strace` is a diagnostic, instructional, and debugging utility for Linux that monitors the interactions between a user-space process and the Linux kernel. It intercepts and records the system calls (syscalls) executed by a process, as well as the signals it receives, printing the name of each call, its arguments, and its return value. System administrators and developers use it to diagnose application crashes, hunt down missing dependencies, and understand the internal behavior of compiled binaries without needing access to their source code.

## Why does it exist?

When a program fails—especially a closed-source or stripped binary—standard application logs are often insufficient or nonexistent. Before advanced tracing frameworks like eBPF existed, engineers needed a reliable way to observe a program's interaction with the underlying OS (e.g., requesting memory, opening files, initiating network connections) to determine _why_ it was failing. `strace` was built around the Linux `ptrace` mechanism to fill this gap, providing absolute visibility into the boundary where user-mode execution must ask the kernel for resources.

## Syntax

```bash
strace [options] [command [arg ...]]
strace [options] -p pid
```

## Flags

| Flag                  | Description                                                                                                            | Example                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `-p`                  | Attaches `strace` to a currently running process by its Process ID (PID).                                              | `strace -p 1234`              |
| `-e`                  | Filters the trace output based on a specific expression (e.g., filtering by syscall name or signal).                   | `strace -e trace=openat,read` |
| `-f`                  | Follows child processes as they are created by the `fork()`, `vfork()`, or `clone()` system calls.                     | `strace -f ./script.sh`       |
| `-c`                  | Count time, calls, and errors for each system call and report a summary on program exit (profiling mode).              | `strace -c -p 1234`           |
| `-T`                  | Prints the time spent inside each system call (measured from entry to exit).                                           | `strace -T ls`                |
| `-t` / `-tt` / `-ttt` | Prefixes each line with a timestamp (time of day, with microseconds, or UNIX epoch with microseconds).                 | `strace -tt ls`               |
| `-s`                  | Sets the maximum string size to print (default is 32 bytes). Crucial for seeing full file paths or network payloads.   | `strace -s 4096 -p 1234`      |
| `-o`                  | Redirects the trace output to a specified file instead of printing it to standard error (`stderr`).                    | `strace -o trace.log ls`      |
| `-y`                  | Decodes file descriptors, printing the path associated with a descriptor (e.g., `read(3</etc/passwd>, ...)`).          | `strace -y -p 1234`           |
| `-yy`                 | Decodes file descriptors deeply, including protocol and port information for network sockets.                          | `strace -yy -p 1234`          |
| `-P`                  | Traces only system calls accessing a specific path. Under the hood, it watches all file descriptors tied to that path. | `strace -P /etc/passwd ls`    |
| `-k`                  | Prints the execution stack trace of the traced processes after each system call (requires `libunwind`).                | `strace -k -p 1234`           |

## Examples

```bash
strace ls
```

> Runs the `ls` command and prints every system call it makes to standard error. You will see the dynamic linker (`ld.so`) mapping shared libraries via `mmap`, reading directory contents via `getdents64`, and writing the output to the terminal via `write`.

```bash
strace -p 4589
```

> Attaches to the running process with PID 4589. This will instantly begin dumping the syscalls the process is currently executing. Press `Ctrl+C` to detach without killing the target process.

```bash
strace -e trace=open,openat,access -p 4589
```

> Filters the output to show only file-opening and file-access check operations. This is the fastest way to figure out what configuration files a daemon is reading or if it is failing to find a required shared object.

```bash
strace -f -o debug.log ./my_daemon start
```

> Starts the binary `./my_daemon`, follows any child processes it spawns (crucial for daemons that fork into the background), and redirects the dense, noisy output into `debug.log` for later analysis.

```bash
strace -c -p 4589
```

> Enters profiling mode for PID 4589. When you press `Ctrl+C` to stop the trace, `strace` outputs a cleanly formatted table showing the total time spent in each syscall, the number of calls, and the number of errors (e.g., `ENOENT`).

## Real-World Scenarios

**Diagnosing "File Not Found" or Missing Dependencies**

```bash
strace -e trace=open,openat,stat,access my_app 2>&1 | grep ENOENT
```

> When an application throws an obscure "cannot load configuration" error, engineers use `strace` to filter file-system access calls and pipe the output to `grep ENOENT` (Error NO ENTry). This immediately reveals the exact file paths the application expected to exist but could not find.

**Debugging a Hung or Frozen Process**

```bash
sudo strace -p $(pidof nginx)
```

> If a web server or database suddenly stops responding, attaching `strace` reveals what the process is blocked on. If you see it stuck on `futex(..., FUTEX_WAIT, ...)`, it is deadlocked waiting for a thread mutex. If it is stuck on `read(3, ...)`, it is waiting for a network socket or file descriptor to provide data.

**Analyzing Network Traffic and Socket Failures**

```bash
strace -e trace=network -s 10000 -yy -p 1234
```

> When troubleshooting a microservice failing to connect to a database, filtering by the `network` syscall class (`socket`, `connect`, `sendto`, `recvfrom`) alongside `-yy` (which decodes IP/port bindings) allows engineers to see exactly which IP the app is attempting to reach and what raw payload it is sending.

## When should it NOT be used?

- **Production Performance Profiling:** **Do not use `strace` to profile latency in highly loaded production environments.** `strace` introduces massive overhead (often slowing down execution by 10x to 50x) due to the heavy context-switching required by `ptrace`. Use `perf` or `bpftrace` for safe, low-overhead production profiling.
- **Tracking Userspace Function Calls:** **Do not use `strace` to track execution inside an application's internal functions.** `strace` only sees the boundary between userspace and the kernel. To trace internal C/C++ functions or dynamic library calls, use `gdb` or `ltrace`.
- **Memory Leak Detection:** **Do not use `strace` to find memory leaks.** While it shows the kernel allocating memory pages (`mmap`, `brk`), it has no concept of how the application's heap allocator (like `malloc`) uses or fails to free that memory. Use Valgrind or eBPF memory profiling tools instead.

## Alternatives

- **`bpftrace` / eBPF:** **Best for production environments.** Uses the modern eBPF kernel subsystem to trace syscalls and kernel events with negligible overhead. It is safe for production but requires writing small scripts or using predefined one-liners.
- **`perf`:** **Best for CPU and full-stack profiling.** `perf trace` is designed to mimic `strace` but uses ring-buffers and eBPF under the hood, significantly reducing overhead, though it lacks some of `strace`'s deep argument decoding capabilities.
- **`ltrace`:** **Best for shared library debugging.** Similar to `strace`, but intercepts calls to dynamic library functions (e.g., `strcmp`, `malloc` in `glibc`) rather than direct system calls to the kernel.
- **`sysdig`:** **Best for containerized environments.** Provides a higher-level, tcpdump-like syntax for system exploration, excelling at correlating system calls with specific Docker or Kubernetes containers.

## How it works internally

`strace` operates using the `ptrace` (process trace) system call. When `strace` attaches to a process (the "tracee"), it issues `ptrace(PTRACE_SYSCALL, pid, ...)`. This tells the Linux kernel to pause the tracee's execution every time it enters or exits a system call.

When the tracee invokes a syscall, the kernel traps it and sends a `SIGTRAP` signal to `strace` (the "tracer"). `strace` wakes up and uses `ptrace(PTRACE_GETREGS, ...)` to read the tracee's CPU registers. On x86_64, the `orig_rax` register holds the syscall number (e.g., 2 for `open`), while `rdi`, `rsi`, `rdx`, etc., hold the arguments. `strace` decodes these raw memory addresses and integers into human-readable strings.

`strace` then tells the kernel to resume the tracee until the syscall finishes. When the syscall exits, the tracee is paused _again_, another `SIGTRAP` is sent, and `strace` reads the `rax` register to capture the return value or error code (like `-ENOENT`). This architecture means every single system call forces two full context switches between the tracee, the kernel, and the tracer—which fundamentally explains `strace`'s catastrophic performance overhead.

In modern Linux kernels, `strace` mitigates some overhead when using filters (like `-e trace=open`) by injecting a seccomp-bpf (Secure Computing with filters) program into the tracee. This instructs the kernel to only trigger the `ptrace` stop for the specifically requested syscalls, letting the rest run at native speed.

## Performance Notes

- **I/O Bound Destruction:** Applications that execute millions of rapid, non-blocking I/O syscalls (like Redis or Node.js event loops utilizing `epoll`) will suffer extreme performance degradation under `strace`, often becoming completely unresponsive.
- **Seccomp-BPF Optimization:** Always use `-e` to filter your trace. If your kernel and `strace` version support seccomp-bpf (automatically enabled in recent versions), filtering by syscall dramatically reduces the context-switch penalty.

## Security Notes

- **Sensitive Data Disclosure:** `strace` intercepts `read()` and `write()` calls in plaintext before they are processed by userspace application logic. Tracing a process will expose unencrypted passwords, session tokens, and TLS private keys directly to the terminal.
- **YAMA ptrace_scope:** Modern Linux distributions utilize the YAMA security module to prevent processes from inspecting each other. If `/proc/sys/kernel/yama/ptrace_scope` is set to `1` (or higher), you cannot use `strace` to attach to a process you own unless you run `strace` with `sudo`, mitigating malware from scraping memory.
- **Anti-Debugging Techniques:** Malware often uses `ptrace(PTRACE_TRACEME)` on itself during initialization. Because Linux only allows one tracer per process, if an engineer attempts to `strace` the malware later, the kernel will reject the attachment, alerting the malware to analysis attempts.

## Common Mistakes

- **Forgetting to trace child processes (`-f`)**
  - _Mistake:_ Running `strace /etc/init.d/service restart` and seeing almost no output before the trace exits.
  - _Why:_ The init script immediately forks a child process to do the actual work and exits the parent. Without `-f`, `strace` only tracks the parent, completely missing the daemon's execution.
- **Misinterpreting "Errors"**
  - _Mistake:_ Panicking when seeing `openat("/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY) = -1 ENOENT (No such file or directory)`.
  - _Why:_ This is often normal. The dynamic linker (`ld.so`) iterates through multiple fallback directories defined in `$PATH` or `ld.so.conf` to find shared libraries. An `ENOENT` is only a problem if the final attempt fails.
- **Truncated Strings**
  - _Mistake:_ Seeing `write(1, "Configurati"..., 11)` and not understanding why the log message is cut off.
  - _Why:_ By default, `strace` truncates strings to 32 characters to keep terminal output manageable. You must pass `-s 256` or higher to read complete strings and file paths.

## Best Practices

- **Always Filter:** Never run `strace -p <pid>` on a busy database or web server without `-e`. Use `-e trace=file` or `-e trace=network` to capture only the relevant subsystem, minimizing performance impact.
- **Decode File Descriptors:** Always combine your traces with `-y` (or `-yy` for sockets). Seeing `read(5, ...)` is useless if you don't know that file descriptor 5 points to `/var/log/auth.log`.
- **Output to a File:** Standard terminal emulators cannot render text fast enough to keep up with an unfiltered `strace` of a busy process. The terminal rendering bottleneck will slow down the target process even further. Always use `-o filename.log`.

## Interview Questions

**Q: Why does running `strace` on a heavily loaded web server cause the server's latency to spike dramatically?**
**A:** `strace` relies on the `ptrace` system call mechanism. For every single syscall the target process makes, the kernel must pause the process, perform a context switch to `strace`, let `strace` read the registers, and switch back—and it must do this twice (once on syscall entry, once on exit). This double context-switch completely destroys performance on highly active processes.

**Q: You are tracing a web server using `strace -p <pid>` and all you see is `epoll_wait(..., -1)` looping or hanging. Is the process frozen?**
**A:** No, this is standard behavior for an event-driven application (like Nginx, Redis, or Node.js). `epoll_wait` is a blocking system call where the application tells the kernel, "put me to sleep until network traffic arrives on any of these file descriptors." It indicates the process is idle and healthy.

**Q: What is the difference between `strace` and `ltrace`?**
**A:** `strace` intercepts system calls—requests made by the userspace application across the boundary into the Linux kernel (e.g., `open`, `mmap`, `clone`). `ltrace` intercepts dynamic library calls—function calls made entirely within userspace to linked shared objects (e.g., calling `strlen` or `malloc` in `glibc`).

## Practice Problems

**Problem:** You are running a script called `./analyze_data` that reads from a large file, but you suspect it's reading the data in tiny, inefficient 1-byte chunks. Write an `strace` command to prove this by inspecting the system calls and their arguments.
**Hint:** You need to monitor the specific system call responsible for reading data from a file descriptor and view the arguments passed to it.
**Solution:**

```bash
strace -e trace=read ./analyze_data
```

_(You would then look at the return value of the `read` calls, e.g., `read(3, "a", 1) = 1`, proving it is reading 1 byte at a time)._

**Problem:** A running process with PID `9945` seems to be connecting to an external database, but you don't know which IP address it is hitting. Write a command to trace its network connections, ensuring you can see the fully decoded IP addresses and ports it is using.
**Hint:** Use the flag to attach to a PID, filter for network-related system calls, and use the flag that deeply decodes socket file descriptors.
**Solution:**

```bash
strace -p 9945 -e trace=network -yy
```

## References

- [strace(1) - Linux manual page (man7.org)](https://man7.org/linux/man-pages/man1/strace.1.html)
- [ptrace(2) - Linux manual page (man7.org)](https://man7.org/linux/man-pages/man2/ptrace.2.html)
- [Brendan Gregg - Linux Performance: strace](https://www.brendangregg.com/linuxperf.html)
