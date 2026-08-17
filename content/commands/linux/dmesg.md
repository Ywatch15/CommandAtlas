---
slug: dmesg
name: dmesg
aliases: []
category: linux
tags:
  - dmesg
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - check kernel logs
  - find out why process was killed by OOM killer
  - troubleshoot USB drive connection
  - view boot initialization messages
  - diagnose hardware errors and panics
relatedCommands: [kmod]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`dmesg` (diagnostic message) is a command-line utility used to print and control the kernel ring buffer. It provides immediate access to kernel-level events, including hardware detection during the boot process, device driver state changes, and critical system faults like Out-Of-Memory (OOM) kills or hardware I/O errors. System administrators, infrastructure engineers, and kernel developers rely on it as a primary diagnostic tool to investigate low-level system panics and hardware compatibility issues.

## Why does it exist?

During the early stages of the system boot process, user-space logging daemons (like `systemd-journald` or `rsyslog`) and standard filesystems are not yet loaded or mounted. The kernel requires a safe, guaranteed location to record hardware initialization logs, ACPI table parsing, and early driver loading. It achieves this by writing to a statically allocated, fixed-size ring buffer in memory. `dmesg` exists to bridge the gap between kernel space and user space, extracting and formatting this raw in-memory buffer so administrators can read the boot sequence and real-time kernel events after user-space is fully initialized.

## Syntax

```bash
dmesg [options]
```

## Flags

| Flag                 | Description                                                                                                                      | Example             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `-T`, `--ctime`      | Converts raw monotonic timestamps (seconds since boot) into human-readable date and time formats.                                | `dmesg -T`          |
| `-w`, `--follow`     | Wait for new messages to arrive in the ring buffer. Functions identically to `tail -f` but for kernel logs.                      | `dmesg -w`          |
| `-c`, `--read-clear` | Prints the current contents of the ring buffer, and then immediately clears it. Requires root privileges.                        | `dmesg -c`          |
| `-C`, `--clear`      | Clears the ring buffer without printing its contents. Useful before running a test that triggers kernel events.                  | `dmesg -C`          |
| `-l`, `--level`      | Restricts output to a comma-separated list of log levels (e.g., `emerg`, `alert`, `crit`, `err`, `warn`, `info`, `debug`).       | `dmesg -l err,crit` |
| `-f`, `--facility`   | Restricts output to a specific facility (e.g., `kern`, `user`, `daemon`).                                                        | `dmesg -f kern`     |
| `-H`, `--human`      | Enables human-readable output. It pipes the output into a pager (`less`), adds color highlighting, and uses relative timestamps. | `dmesg -H`          |
| `-k`, `--kernel`     | Filters the buffer to print only kernel messages, ignoring user-space messages injected into the buffer.                         | `dmesg -k`          |
| `-x`, `--decode`     | Decodes the raw facility and log level numbers (e.g., `<4>`) into human-readable prefixes (e.g., `kern  :warning: `).            | `dmesg -x`          |
| `-r`, `--raw`        | Prints the raw message buffer exactly as the kernel formatted it, including the numeric syslog prefix tags.                      | `dmesg -r`          |
| `-S`, `--syslog`     | Forces `dmesg` to use the legacy `syslog(2)` kernel interface instead of the modern `/dev/kmsg` character device.                | `dmesg -S`          |

## Examples

```bash
dmesg
```

> Outputs the entire current kernel ring buffer. The default output prepends a raw timestamp to each line, which represents the number of seconds (and microseconds) since the kernel booted.

```bash
dmesg -T | grep -i memory
```

> Translates the boot-relative timestamps to human-readable dates and filters the output for the word "memory". This is a standard workflow for reviewing how the kernel mapped memory during boot or locating memory-related errors.

```bash
dmesg -l err,crit,alert,emerg
```

> Filters out the noise of informational and debug messages, restricting the output exclusively to severe errors and critical hardware faults. Excellent for quick health checks on a misbehaving server.

```bash
dmesg -wH
```

> Starts an interactive, deeply readable live-monitoring session. The `-w` flag watches the buffer for new entries in real-time, while `-H` pipes the stream through a pager with syntax highlighting and relative timestamps (e.g., `[  +0.000123]`).

```bash
sudo dmesg -c > /tmp/boot_dmesg.log
```

> Dumps the current kernel logs to a file and immediately flushes the ring buffer. Kernel developers use this workflow to isolate logs: clear the buffer, load a custom module (`insmod`), and then read `dmesg` to see only the messages generated by that specific module.

## Real-World Scenarios

**Hunting the OOM (Out-Of-Memory) Killer**

```bash
dmesg -T | grep -i -B 2 -A 5 "killed process"
```

> When a database or application mysteriously vanishes without leaving an application-level error log, engineers check `dmesg`. If the system ran out of RAM, the kernel's OOM killer steps in to terminate memory-hungry processes to save the OS. This command locates the exact timestamp the kill occurred and the PID of the victim.

**Live Hardware Enumeration (USB/Disk)**

```bash
dmesg -w
```

> Before physically plugging in a new USB drive, external RAID array, or SFP module, an administrator runs `dmesg -w`. As the device is connected, the kernel immediately outputs the block device mapping (e.g., `sdb` or `nvme1n1`) and driver initialization status, bypassing the need to guess which device node was assigned.

**Debugging Network Link Flapping**

```bash
dmesg -T | grep -E "eth0|enp3s0"
```

> If a server is experiencing intermittent connectivity drops, `dmesg` reveals the physical layer events. It will display driver-level messages like `link down` or `NIC Link is Up 10 Gbps Full Duplex`. This distinguishes physical switch/cable problems from higher-level software routing issues.

**Verifying Netfilter/iptables Drops**

```bash
dmesg -T | grep "IN="
```

> When troubleshooting complex firewall rules, administrators often append a `LOG` target to their `iptables` or `nftables` DROP rules. These logs are written directly to the kernel ring buffer. Searching for "IN=" extracts these dropped packet headers for network debugging.

## When should it NOT be used?

- **Persistent Historical Auditing:** **Do not rely on `dmesg` for historical logs.** The kernel buffer is a fixed-size ring; once full, the oldest messages are overwritten. If a system has been up for a year and generates a lot of network logs, the boot messages are long gone. Use `journalctl -k` or `/var/log/kern.log` instead.
- **Investigating Past Reboots:** **Do not use `dmesg` to see why a server crashed _yesterday_.** `dmesg` only holds data for the current running session. The buffer is destroyed on power loss or panic. Systemd's `journalctl -k -b -1` must be used to view the previous boot's kernel logs.
- **User-Space Application Debugging:** **Do not use `dmesg` to troubleshoot Nginx, PostgreSQL, or custom code.** Unless the application is crashing the kernel, causing OOMs, or writing to `/dev/kmsg` directly, user-space application logs belong in `/var/log` or journald, not the kernel buffer.

## Alternatives

- **`journalctl -k` (or `journalctl --dmesg`):** **Best for persistence and historical analysis.** Systemd-journald constantly reads the kernel ring buffer and stores the logs permanently on disk. It allows filtering kernel logs by previous boots (`-b -1`), date ranges, and persists across reboots.
- **`/var/log/syslog` / `/var/log/messages`:** **Best for legacy systems.** On non-systemd init systems (or those using `rsyslog`), the `klogd` daemon reads the ring buffer and appends it to standard text files on disk, facilitating standard log rotation and archiving.

## How it works internally

The Linux kernel maintains a statically allocated circular character array called `log_buf`. The size of this buffer is determined at compile time (typically between 16KB and 1MB, controlled by `CONFIG_LOG_BUF_SHIFT`) but can be overridden at boot via the `log_buf_len` kernel parameter. Whenever kernel code calls the `printk()` function, the string is formatted and written into this memory structure.

Modern implementations of `dmesg` access this buffer by opening `/dev/kmsg`, a character device node that provides a structured, seekable interface to the ring buffer. Reading from `/dev/kmsg` yields individual records containing the log level, facility, monotonic timestamp, and the message text. This allows `dmesg` to easily filter by log level (`-l`) without relying on regex.

If `/dev/kmsg` is unavailable (on older kernels or highly stripped-down embedded systems), `dmesg` falls back to using the `syslog(2)` system call (specifically the `klogctl` wrapper in libc). This system call copies the raw `log_buf` from kernel memory into a user-space buffer provided by the `dmesg` binary, which then parses and prints it.

Because it is a ring buffer, it requires no memory allocation during critical paths (like a kernel panic). However, it means data is highly volatile; high volumes of `printk` activity will silently overwrite older messages.

## Performance Notes

- **Zero I/O Cost:** Because `dmesg` reads directly from RAM (`/dev/kmsg` or via `syslog(2)`), it does not touch the disk. It is exceptionally fast and safe to run on systems experiencing severe disk I/O bottlenecks or failing storage arrays.
- **Efficient Polling:** When using `dmesg -w`, the utility utilizes the `poll()` or `select()` system calls against `/dev/kmsg`. It blocks efficiently and consumes virtually zero CPU cycles while waiting for new kernel events to occur.

## Security Notes

- **Kernel Pointer Leaks:** Kernel logs frequently contain memory addresses, stack traces, and hardware configurations. If an attacker gains unprivileged execution on a host, reading `dmesg` can help them bypass Kernel Address Space Layout Randomization (KASLR) by locating kernel structures in memory.
- **`dmesg_restrict` Sysctl:** To prevent information disclosure, modern Linux distributions often ship with the sysctl `kernel.dmesg_restrict=1`. When enabled, only users with the `CAP_SYSLOG` capability (typically root) can execute `dmesg`. If disabled (`0`), any standard user can read the full kernel ring buffer.
- **Buffer Flooding:** An attacker or a misconfigured process with write access to `/dev/kmsg` can intentionally flood the ring buffer with garbage messages. This will overwrite legitimate critical system errors, effectively erasing forensic evidence of kernel-level exploitation from volatile memory.

## Common Mistakes

- **Relying on monotonic timestamps for correlation**
  - _Mistake:_ Seeing `[  1234.567890]` in the default output and struggling to correlate it with an application log event that happened at 14:32:00.
  - _Why:_ The default timestamp is simply seconds since the kernel booted. Always use `dmesg -T` to convert these into standard human-readable dates for cross-referencing with user-space logs.
- **Searching for "error" directly**
  - _Mistake:_ Running `dmesg | grep "error"` and assuming the hardware is fine if nothing returns.
  - _Why:_ Kernel developers use vastly different terminology. A failing disk might say `I/O fault`, an interface might say `link down`, or memory might log `Out of memory`. Use `dmesg -l err,crit` to filter by the _syslog level_ applied by the kernel, not the text payload.
- **Assuming `dmesg` survives a reboot**
  - _Mistake:_ The server panics and reboots. An engineer logs in and runs `dmesg` to see what caused the panic.
  - _Why:_ `dmesg` outputs the _current_ memory buffer, which is entirely fresh after a restart. You must use `journalctl -k -b -1` or check `/var/log/kern.log` to view the kernel logs that immediately preceded the crash.

## Best Practices

- **Combine Level Filtering and Timestamps:** The most effective initial triage command on any Linux system is `dmesg -T -l err,crit`. This instantly surfaces critical hardware or kernel faults with actionable, human-readable timestamps.
- **Clear the Buffer During Driver Development:** If you are repeatedly loading and unloading custom kernel modules or testing specific hardware triggers, use `sudo dmesg -c` between tests. This guarantees that the output of your next `dmesg` call contains _only_ the events triggered by your immediate action, eliminating log noise.
- **Monitor Live via `-w` for Hardware Audits:** Always have a separate terminal pane running `dmesg -wH` when physically swapping cables, plugging in USB devices, or dynamically attaching block storage volumes in cloud environments. It instantly verifies that the kernel detected the state change.

## Interview Questions

**Q: Why do default `dmesg` timestamps look like `[  3451.123456]` instead of a standard date?**
**A:** The default timestamp represents monotonic time—specifically, the number of seconds and microseconds since the kernel booted. The kernel uses this internal clock because it operates independently of user-space time daemons (NTP) and timezone configurations, ensuring logs are accurately ordered even if the system clock is abruptly changed or steps backward. Use `-T` to translate this based on current system time.

**Q: You need to find out why a server rebooted last night. Will `dmesg` help you? Why or why not?**
**A:** No, `dmesg` will not help. It reads the in-memory kernel ring buffer for the _current_ boot session. That buffer is destroyed during a reboot or power loss. To investigate a past crash, you must rely on persistent disk logs managed by user-space daemons, such as executing `journalctl -k -b -1` or inspecting `/var/log/syslog`.

**Q: Explain the architectural purpose of the kernel ring buffer (`log_buf`) compared to a standard log file.**
**A:** The kernel ring buffer exists in statically allocated RAM, meaning it requires zero disk I/O and zero dynamic memory allocation to function. This allows the kernel to safely log messages during extremely early boot stages (before disks are mounted) and during critical failures (like memory exhaustion panics) where attempting file I/O or allocating memory would instantly crash the system.

## Practice Problems

**Problem:** You suspect a hardware failure is occurring, but the kernel logs are extremely noisy with firewall and audit messages. Write a command to display only messages classified as "warn", "err", or "crit", complete with human-readable timestamps.
**Hint:** Use the flag that specifies syslog levels and the flag for ctime translation.
**Solution:**

```bash
dmesg -T -l warn,err,crit
```

**Problem:** You want to view the kernel log buffer, but you want to ensure it is completely empty _after_ you read it, so any subsequent kernel messages start from a blank slate.
**Hint:** There is a specific flag that reads and then flushes the buffer in a single atomic action.
**Solution:**

```bash
sudo dmesg -c
```

## References

- [dmesg(1) - Linux manual page (man7.org)](https://man7.org/linux/man-pages/man1/dmesg.1.html)
- [kmsg(2) - Linux Kernel Documentation](https://www.kernel.org/doc/Documentation/ABI/testing/dev-kmsg)
- [syslog(2) - System call interface (man7.org)](https://man7.org/linux/man-pages/man2/syslog.2.html)
