---
slug: strace
name: strace
aliases: []
category: system-calls
tags: [strace, syscalls, debug, trace]
difficulty: advanced
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'trace system calls'
  - 'debug process hanging'
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-07-29
author: commandatlas
---

## What is it?

`strace` is a diagnostic, debugging, and instructional utility for Linux that monitors system calls made by a process and signals received by it.

## Why does it exist?

`strace` allows engineers to inspect how binary applications interact with the kernel (file open errors, network socket failures, permission denied calls) without source code access.

## Syntax

```bash
strace [options] [command [args...]]
```

## Flags

| Flag | Description                                    | Example                            |
| ---- | ---------------------------------------------- | ---------------------------------- |
| `-p` | Attach to running process PID                  | `strace -p 1234`                   |
| `-e` | Filter specific syscall expressions            | `strace -e trace=open,read my_app` |
| `-c` | Count time, calls, and errors for each syscall | `strace -c ls`                     |

## Examples

```bash
strace -e trace=openat,access myapp
```

> Traces file access attempts and file descriptors opened by `myapp`.

## Real-World Scenarios

**Debugging missing config files**: Finding which directory path a binary failed to open when exiting prematurely with vague errors.

## When should it NOT be used?

- **Production latency-sensitive performance profiling**: `strace` adds significant slowdown overhead due to ptrace context switching; eBPF tools (`bpftrace`) are better.

## Alternatives

- **`bpftrace`**: Low-overhead eBPF dynamic tracing framework for production systems.

## How it works internally

`strace` uses the Linux `ptrace(2)` kernel API to intercept process execution before and after every system call.

## Performance Notes

Introduces massive execution slowdown (often 10x-50x) while active.

## Security Notes

Tracing processes owned by other users requires `CAP_SYS_PTRACE` capability or root permissions.

## Common Mistakes

- **Running strace without filtering on noisy processes**: Generates gigabytes of unreadable syscall output.

## Best Practices

- Use `-f` to follow child processes created by `fork(2)` or `clone(2)`.

## Interview Questions

**Q:** Why does `strace` degrade application performance?
**A:** Every syscall causes context switches between traced process, kernel, and strace debugger via `ptrace`.

## Practice Problems

**Problem:** Find summary statistics of system call counts and error rates for command `curl example.com`.
**Solution:** `strace -c curl example.com`

## References

- [strace man page](https://www.man7.org/linux/man-pages/man1/strace.1.html)
