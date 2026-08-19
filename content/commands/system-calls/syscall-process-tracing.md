---
slug: syscall-process-tracing
name: Process Tracing (ptrace)
aliases: ['sys_ptrace', 'tracing', 'debugger-api']
category: system-calls
tags: [c, linux, kernel, debugging, security, reversing]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'debug running process linux'
relatedCommands: ['strace']
alternatives: []
status: draft
---

## What is it?

`ptrace()` (Process Trace) is the foundational Linux and Unix system call providing complete observational and manipulative control over the execution of another process. It allows a "tracer" process to pause, inspect, and modify the core memory, CPU registers, and signal handling of a "tracee" (child or attached) process, serving as the sole architectural engine behind userspace debuggers (like GDB), system call interceptors (like `strace`), and dynamic code injection frameworks.

## Why does it exist?

Operating systems enforce strict virtual memory boundaries and namespace isolation; Process A physically cannot read the memory of Process B. However, developers require mechanisms to halt execution during crashes, inspect variables, and step through assembly instructions line-by-line to diagnose logic faults. `ptrace()` exists to safely pierce this isolation boundary at the kernel level. By providing a highly privileged API, it allows specialized diagnostic tools to intercept the kernel's execution context—stopping a process immediately before it executes a system call or modifying its Instruction Pointer (`$rip`)—enabling deep forensics without requiring developers to write custom, dangerous kernel modules.

## Syntax

```c
#include <sys/ptrace.h>

long ptrace(enum __ptrace_request request, pid_t pid, void *addr, void *data);
```

## Flags

_Note: `ptrace` relies exclusively on the `request` enumeration argument to radically alter its behavior._

| Request Enum        | Description                                                                                                                                              | Example Context                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `PTRACE_TRACEME`    | Called by the _tracee_ (the child). Declares to the kernel that it expects its parent process to trace it. Automatically pauses the child on `execve()`. | `ptrace(PTRACE_TRACEME, 0, NULL, NULL);`               |
| `PTRACE_ATTACH`     | Called by the _tracer_. Attaches to an already-running process by PID, sending it a `SIGSTOP` signal to pause execution for inspection.                  | `ptrace(PTRACE_ATTACH, target_pid, NULL, NULL);`       |
| `PTRACE_PEEKTEXT`   | Reads a single machine word (usually 8 bytes on 64-bit systems) from the specified memory address within the tracee's address space.                     | `long val = ptrace(PTRACE_PEEKTEXT, pid, addr, NULL);` |
| `PTRACE_POKETEXT`   | Writes a single machine word into the specified memory address of the tracee. The core mechanism for injecting software breakpoints (`INT 3`).           | `ptrace(PTRACE_POKETEXT, pid, addr, new_data);`        |
| `PTRACE_GETREGS`    | Extracts the current state of all CPU registers (like `$rax`, `$rip`, `$rsp`) into a user-space `user_regs_struct` structure.                            | `ptrace(PTRACE_GETREGS, pid, NULL, &regs);`            |
| `PTRACE_SETREGS`    | Modifies the tracee's CPU registers. Highly useful for manipulating function return values or redirecting execution flow.                                | `ptrace(PTRACE_SETREGS, pid, NULL, &regs);`            |
| `PTRACE_SYSCALL`    | Resumes the paused tracee, but instructs the kernel to forcefully pause it again at the exact entrance or exit of its very next system call.             | `ptrace(PTRACE_SYSCALL, pid, NULL, NULL);`             |
| `PTRACE_SINGLESTEP` | Resumes the tracee, but forces it to execute exactly _one_ machine instruction before pausing it again. (Hardware stepping).                             | `ptrace(PTRACE_SINGLESTEP, pid, NULL, NULL);`          |
| `PTRACE_CONT`       | Resumes normal, uninterrupted execution of the paused tracee.                                                                                            | `ptrace(PTRACE_CONT, pid, NULL, NULL);`                |
| `PTRACE_DETACH`     | Detaches the tracer from the tracee, allowing the target process to continue running normally, completely severing the debug connection.                 | `ptrace(PTRACE_DETACH, pid, NULL, NULL);`              |

## Examples

```c
pid_t child = fork();
if (child == 0) {
    // Child Process (Tracee)
    ptrace(PTRACE_TRACEME, 0, NULL, NULL);
    execl("/bin/ls", "ls", NULL);
} else {
    // Parent Process (Tracer)
    wait(NULL); // Wait for child to pause on exec()
    // Child is now frozen. Tracer can inspect it.
    ptrace(PTRACE_CONT, child, NULL, NULL);
}
```

> The native GDB launch pattern. To debug a program from the start, the debugger `fork()`s. The child explicitly opts-in to tracing via `PTRACE_TRACEME` and calls `exec()`. The kernel intercepts the `exec()` and immediately suspends the child, sending a `SIGCHLD` to the parent. The parent can now set breakpoints before releasing the child using `PTRACE_CONT`.

```c
struct user_regs_struct regs;
ptrace(PTRACE_ATTACH, target_pid, NULL, NULL);
waitpid(target_pid, NULL, 0); // Wait for SIGSTOP

ptrace(PTRACE_GETREGS, target_pid, NULL, &regs);
printf("Instruction Pointer (RIP): %llx\n", regs.rip);
ptrace(PTRACE_DETACH, target_pid, NULL, NULL);
```

> Live memory inspection. The tracer attacks an actively running process (`PTRACE_ATTACH`). The kernel freezes the target and alerts the tracer. The tracer extracts the exact CPU registry state, prints the memory address the application is currently executing, and cleanly detaches, allowing the application to resume.

```c
// Inside a loop monitoring a tracee:
ptrace(PTRACE_SYSCALL, child_pid, NULL, NULL);
waitpid(child_pid, &status, 0);

ptrace(PTRACE_GETREGS, child_pid, NULL, &regs);
printf("Intercepted Syscall ID: %lld\n", regs.orig_rax);
```

> The `strace` engine. By issuing `PTRACE_SYSCALL` in a `while` loop, the tracer commands the kernel to halt the child precisely before it enters, and immediately after it exits, every single system call. The tracer reads the `orig_rax` register (on x86_64) to identify exactly which syscall (e.g., `sys_read`, `sys_open`) the child is attempting to execute.

## Real-World Scenarios

**Software Breakpoints (GDB)**

> When a developer sets a breakpoint in GDB at a specific memory address, GDB uses `PTRACE_PEEKTEXT` to backup the original 8 bytes of assembly at that address. It then uses `PTRACE_POKETEXT` to overwrite the first byte with the `0xCC` instruction (the x86 `INT 3` trap). When the CPU hits that byte, it triggers an interrupt, the kernel freezes the app, and alerts GDB. GDB restores the original byte, allowing the user to step through the code.

**Dynamic Code Injection / Hooking**

> Malware and advanced performance profilers use `ptrace` to inject arbitrary code into a running application (like injecting a `.so` library into an active NGINX process). They use `PTRACE_GETREGS` to backup the CPU state, use `PTRACE_POKETEXT` to write shellcode (like `dlopen`) into a highly executable segment of the target's memory, use `PTRACE_SETREGS` to point the Instruction Pointer (`$rip`) to the shellcode, and issue `PTRACE_CONT`.

## When should it NOT be used?

- **System-Wide Profiling:** **Do not use `ptrace` to monitor global system performance.** `ptrace` forces massive context switches. Tracing a high-throughput network daemon via `PTRACE_SYSCALL` (like `strace` does) forces the application to context-switch back to the tracer twice per system call, often degrading application performance by 50x to 100x.
- **Production Telemetry:** **Do not leave `ptrace` attached in production.** If the tracer process (e.g., your custom C script) crashes or is killed `SIGKILL` without calling `PTRACE_DETACH`, the tracee process is left in an orphaned, permanently suspended (`T`) state, causing a complete application outage.

## Alternatives

- **eBPF (Extended Berkeley Packet Filter):** **Best for modern production tracing.** The definitive successor to `ptrace` for monitoring. eBPF runs sandboxed C code directly inside the kernel in response to tracepoints or kprobes, incurring near-zero performance overhead and eliminating context switches.
- **SystemTap / DTrace:** **Best for legacy dynamic tracing.** Utilizes kernel modules to instrument running code rather than heavily context-switching user-space debuggers.
- **`LD_PRELOAD`:** **Best for simple function hooking.** Allows intercepting standard C library calls (like `malloc` or `open`) simply by pre-loading a custom library before execution, bypassing the complexity and privilege requirements of `ptrace`.

## How it works internally

The `ptrace` subsystem relies on the Linux kernel's signal routing and task state management.

When `PTRACE_ATTACH` is called, the kernel verifies capabilities. It then modifies the `task_struct` of the tracee, setting the `ptrace` bitmask (e.g., `PT_PTRACED`) and appending the tracer process to a linked list of parents. The kernel then sends a `SIGSTOP` signal to the tracee.

When the tracee attempts to process the `SIGSTOP`, the kernel's signal delivery code notices the `PT_PTRACED` flag. Instead of handling the signal normally, the kernel halts the tracee (state `TASK_TRACED`) and explicitly wakes up the tracer process (which is typically blocked waiting on a `waitpid()` system call), delivering a `SIGCHLD` signal to indicate the child is ready for inspection.

Data extraction (`PEEKTEXT`/`POKETEXT`) occurs via the kernel. The tracer asks the kernel to read memory at address `0xABC`. The kernel accesses the tracee's `mm_struct` (memory descriptor), walks its page tables, reads the raw physical RAM bytes backing that virtual address, and copies them into the tracer's memory, securely bypassing the hardware MMU isolation boundaries.

## Performance Notes

- **The Context Switch Penalty:** `ptrace` is incredibly slow. Extracting an entire string from a tracee's memory (e.g., reading a filepath in an `open()` syscall intercept) requires looping `PTRACE_PEEKTEXT`, as it only reads 8 bytes per syscall. Reading a 256-byte string requires 32 distinct system calls and 64 heavy context switches between the tracer, the kernel, and the tracee. (Modern Linux introduced `process_vm_readv()` to bulk-read memory, vastly outperforming `PEEKTEXT`).

## Security Notes

- **God Mode Access:** If a process can attach via `ptrace`, it completely owns the target process. It can dump memory, extract encryption keys, or alter the execution flow to pop a reverse shell.
- **Yama ptrace_scope:** Historically, any user could `ptrace` any process running under their own UID. This allowed attackers who compromised a standard user account to `ptrace` an SSH agent and steal keys. Modern Linux kernels use the Yama security module (`/proc/sys/kernel/yama/ptrace_scope`). If set to `1` (default on Ubuntu), a process can only trace its _direct descendants_. To attach to an unrelated running process, the tracer must possess the absolute `CAP_SYS_PTRACE` capability (root).
- **Anti-Debugging Techniques:** Malware explicitly calls `ptrace(PTRACE_TRACEME, 0, 0, 0)`. Because Linux strictly prohibits a process from having more than one tracer attached simultaneously, the malware effectively locks itself. If a security researcher tries to attach GDB to analyze it, the kernel rejects the connection with `EPERM` (Operation not permitted).

## Common Mistakes

- **Ignoring waitpid() state**
  - _Mistake:_ Calling `PTRACE_ATTACH`, and immediately calling `PTRACE_GETREGS`.
  - _Why:_ `PTRACE_ATTACH` is asynchronous. It sends `SIGSTOP`, but the target process takes milliseconds to actually halt. If you request the registers before it halts, `ptrace` fails with an ESRCH error. You must explicitly block using `waitpid(pid, &status, 0)` to guarantee the process is frozen before interrogating it.
- **Forgetting to pass signals through**
  - _Mistake:_ Intercepting a syscall using a `waitpid` loop, and blindly calling `ptrace(PTRACE_CONT, pid, NULL, NULL);`.
  - _Why:_ When a traced process receives a legitimate signal (like `SIGTERM` or `SIGWINCH` for terminal resizing), the kernel intercepts it and hands it to the tracer. If the tracer resumes the process using `NULL` as the data argument, it silently discards the signal. The tracee never receives it, breaking graceful shutdowns and terminal rendering. The tracer must pass the intercepted signal back: `ptrace(PTRACE_CONT, pid, NULL, WSTOPSIG(status));`.

## Best Practices

- **Use `process_vm_readv` for data extraction:** If building a profiling tool that needs to extract large blocks of memory (like HTTP payloads) from a tracee, do not use `PTRACE_PEEKTEXT`. Use the `process_vm_readv()` system call, which transfers massive memory blocks securely across namespaces in a single, hyper-optimized kernel transaction.
- **Catch Exit States Carefully:** A tracee might die (`SIGKILL`) while you are tracing it. Always use the `WIFEXITED(status)` and `WIFSIGNALED(status)` macros against the integer returned by `waitpid()` to ensure your tracer script gracefully exits when the target application crashes, rather than looping infinitely on a dead PID.

## Interview Questions

**Q: You are tracing a program. You use `PTRACE_PEEKTEXT` to read memory at a specific address, but the system call fails and sets `errno` to `EFAULT` (Bad address). The process is definitely frozen and running. What is the most likely architectural reason you cannot read that memory?**
**A:** The target address is likely invalid or unmapped within the tracee's Virtual Memory space. The tracee might not have allocated that memory yet, or it resides in a protective guard page. `PTRACE_PEEKTEXT` relies on the target's internal page tables; if the virtual address cannot be resolved to physical RAM by the kernel's MMU for that specific process, the read mathematically fails.

**Q: Explain how the `strace` command uses `ptrace` to intercept system calls, specifically detailing how it intercepts the execution twice.**
**A:** `strace` uses the `PTRACE_SYSCALL` request in a continuous loop. The kernel is instructed to pause the tracee at the exact moment it invokes an interrupt (e.g., `syscall` instruction). `strace` wakes up, reads the CPU registers to determine which syscall is being called (e.g., `open()`), and examines the arguments. It then issues `PTRACE_SYSCALL` again. The kernel executes the actual system call logic, and pauses the tracee again immediately _upon exit_ of the system call. `strace` wakes up, reads the `rax` register to capture the return value (e.g., the new File Descriptor), logs it to the terminal, and resumes the tracee until the next syscall.

## Practice Problems

**Problem:** You have attached to a running process and it is frozen. Write the exact C snippet to resume the execution of the tracee (`target_pid`), but instruct the kernel to immediately pause it again as soon as it executes exactly one machine instruction (assembly instruction).
**Hint:** Use the request enum designed for hardware stepping.
**Solution:**

```c
ptrace(PTRACE_SINGLESTEP, target_pid, NULL, NULL);
```

**Problem:** You are writing an exploit or debugger and want to extract the current CPU registry state of a paused tracee (`target_pid`) into a `struct user_regs_struct` named `regs`. Write the `ptrace` system call to retrieve this data.
**Hint:** The request enum targets registers, and you must pass the memory address of the struct.
**Solution:**

```c
ptrace(PTRACE_GETREGS, target_pid, NULL, &regs);
```

## References

- [ptrace(2) - Linux manual page](https://man7.org/linux/man-pages/man2/ptrace.2.html)
- [Playing with ptrace (Writing a debugger)](https://www.linuxjournal.com/article/6100)
