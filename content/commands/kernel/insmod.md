---
slug: insmod
name: insmod
aliases:
  - insert module
category: kernel
tags:
  - linux
  - kernel
  - modules
  - drivers
  - sysadmin
  - c
difficulty: advanced
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - insert kernel module directly
  - load .ko file linux
  - load driver without modprobe
  - insert module from path
  - test newly compiled kernel module
relatedCommands:
  - modprobe
  - rmmod
  - lsmod
  - modinfo
  - depmod
alternatives:
  - modprobe
  - kmod
status: draft
---

## What is it?

`insmod` (insert module) is a low-level command-line utility used to insert a single Loadable Kernel Module (LKM) directly into the Linux kernel using a specific filesystem path to a `.ko` (kernel object) file. Unlike intelligent package managers, it performs zero dependency resolution and ignores all system module configurations.

## Why does it exist?

Kernel developers compiling custom drivers or security engineers testing out-of-tree hardware modules require a mechanism to inject raw `.ko` files directly into RAM without registering them into the formal `/lib/modules/` system hierarchy or generating `depmod` indexes. `insmod` exists to provide this raw, unmediated gateway. It acts as a direct wrapper for the `finit_module` system call, enabling instant execution of newly compiled C code directly in Kernel space.

## Syntax

```bash
insmod [filename] [module options...]
```

## Flags

| Flag / Argument    | Description                                                                                   | Example                                   |
| ------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `--help`           | Outputs brief usage documentation and supported command-line options.                         | `insmod --help`                           |
| `--version`        | Displays version information for the `kmod` package suite.                                    | `insmod --version`                        |
| `[filename]`       | (Argument) The explicit absolute or relative filesystem path to the compiled `.ko` file.      | `insmod ./my_driver.ko`                   |
| `[module options]` | (Argument) Arbitrary key=value pairs passed directly to the module's initialization function. | `insmod ./my_driver.ko debug=1 port=8080` |

_(Note: `insmod` is intentionally stripped of complex flags. Its sole purpose is to map a file path to the kernel. Any extra arguments provided on the command line are passed directly as parameters to the module's internal code.)_

## Examples

```bash
insmod /home/user/build/custom_network_driver.ko
```

> This takes the compiled kernel object file located at the exact provided filesystem path, reads it into memory, and inserts it directly into the running kernel without consulting any dependency maps.

```bash
insmod ./usb_monitor.ko debug_level=3 strict_mode=1
```

> This inserts a locally compiled module while securely passing dynamic runtime parameters (`debug_level=3` and `strict_mode=1`). The kernel parses these arguments and injects them into the module's variables during the `module_init` boot sequence.

```bash
strace insmod ./rootkit_test.ko
```

> Security researchers frequently wrap `insmod` in `strace` to trace the low-level `finit_module` system calls and observe how the kernel handles mapping the ELF object into the restricted memory space.

## Real-World Scenarios

**Kernel Module Development and Prototyping**

```bash
make && sudo insmod ./hello_world.ko && dmesg | tail
```

> C developers writing new Linux drivers utilize a tight feedback loop: they compile the module using `make`, forcefully inject the raw output file using `insmod`, and immediately check the kernel ring buffer (`dmesg`) to verify the module's printk outputs.

**Loading Proprietary Out-of-Tree Drivers**

```bash
insmod /opt/vendor/drivers/raid_controller_v2.ko
```

> Field engineers deploying proprietary hardware that lacks upstream Linux kernel support use `insmod` to manually force closed-source vendor drivers into the kernel from an arbitrary installation directory.

**Exploit Research and Rootkit Injection**

```bash
insmod /tmp/stealth.ko
```

> Penetration testers analyzing kernel vulnerabilities bypass standard system logging directories and use `insmod` to inject custom rootkits directly from `/tmp/`, evaluating privilege escalation constraints.

## When should it NOT be used?

- **General system administration and standard driver management:** **Reason:** `insmod` does not resolve dependencies. If you use it to load a driver that relies on 5 other modules, it will crash with an "Unknown symbol" error. **Use instead:** `modprobe`.
- **Making configurations persistent across reboots:** **Reason:** `insmod` is a purely temporary, ephemeral RAM injection. **Use instead:** Copy the `.ko` to `/lib/modules/`, run `depmod`, and add it to `/etc/modules-load.d/`.

## Alternatives

- **`modprobe`:** The intelligent module loader. **Tradeoff:** `modprobe` is universally superior for general administration because it resolves dependencies, respects blacklists, and accepts simple logical names instead of rigid file paths, but it cannot load isolated out-of-tree binaries sitting in `/tmp/`.

## How it works internally

When you execute `insmod /path/to/module.ko`, the utility opens the target file on disk and verifies that it is a valid ELF (Executable and Linkable Format) object.

It then invokes the `finit_module(fd, param_values, flags)` Linux system call (or the legacy `init_module()` system call if `finit` is unsupported). The kernel intercepts this call and takes over. The kernel allocates a contiguous chunk of kernel-space RAM, maps the ELF object into this protected memory, and attempts to resolve all external symbols (functions the module calls that exist in other modules or the core kernel).

If a single symbol cannot be resolved (because a dependency is missing), the kernel aborts the injection and throws an "Unknown symbol" error. If resolution succeeds, the kernel executes the module's registered `module_init()` C function. If that function returns `0` (success), the module is officially marked as `LIVE` in the kernel state and becomes visible in `/proc/modules`.

## Performance Notes

- The actual insertion executes in microseconds. However, the `module_init()` function written by the developer dictates the overall pause time. If the driver code probes a slow hardware bus (like I2C or PCIe) during initialization, the `insmod` command will hang synchronously until the hardware acknowledges the probe.

## Security Notes

- **Total System Compromise Risk:** Executing `insmod` grants the compiled code absolute, unrestricted Ring 0 execution privileges. A buggy module will cause a catastrophic kernel panic instantly. A malicious module can hide processes, steal encryption keys from RAM, and bypass all user-space security controls.
- **Kernel Lockdown and Secure Boot:** Modern Linux distributions enforcing "Kernel Lockdown" mode or active UEFI Secure Boot will aggressively block `insmod`. The `finit_module` system call will intercept the attempt, verify the `.ko` file's cryptographic signature against the hardware MOK ring, and reject the injection if the signature is invalid or missing.

## Common Mistakes

- **"Unknown symbol in module" Error:** Running `insmod my_driver.ko` and getting a failure. **Why it's wrong:** The module relies on functions provided by another module that isn't loaded. Because `insmod` is "dumb," it doesn't load prerequisites. You must either `insmod` the prerequisites manually first or switch to `modprobe`.
- **"Invalid module format" Error:** Compiling a module on Ubuntu 20.04 and trying to `insmod` it on Ubuntu 22.04. **Why it's wrong:** Kernel modules are inextricably tied to the _exact_ kernel header version they were compiled against (Kernel Symbol Versioning). You must recompile the `.ko` file against the target system's active kernel headers.
- **Providing logical names instead of paths:** Running `insmod ext4`. **Why it's wrong:** `insmod` requires a file path (e.g., `insmod /lib/modules/.../ext4.ko`). To use logical names, you must use `modprobe ext4`.

## Best Practices

- Use `insmod` strictly within development, prototyping, and security research workflows. Universally rely on `modprobe` for production server driver management.
- Always execute `tail -f /var/log/syslog` or `dmesg -w` in a separate terminal pane when executing `insmod`. If the insertion fails, the CLI will output a generic "Operation not permitted," but the kernel ring buffer (`dmesg`) will log the exact underlying C function or symbol resolution that caused the failure.

## Interview Questions

- **Q:** You compile a custom kernel module and attempt to load it using `insmod my_driver.ko`, but it fails with the error "Unknown symbol in module". What is the architectural cause of this error?
  - **A:** The `insmod` command is a low-level injection tool that lacks dependency resolution. The error indicates your module contains code that calls functions or references variables (symbols) residing in a different kernel module that is currently not loaded into memory. To resolve this, you must either `insmod` the required dependencies first, or properly integrate the module into `/lib/modules/` and use `modprobe`.
- **Q:** Why is the `insmod` command frequently blocked on modern enterprise Linux servers, even when executed by the root user?
  - **A:** Modern enterprise servers frequently enforce UEFI Secure Boot and Kernel Lockdown constraints. Under these conditions, the kernel's `finit_module` system call refuses to load arbitrary code. It cryptographically verifies the signature of the `.ko` file against trusted keys. If the module is unsigned or self-signed with an untrusted key, `insmod` is blocked to prevent rootkit injections.
- **Q:** Can you pass dynamic runtime configurations to a module using `insmod`? If so, how?
  - **A:** Yes. Any arguments appended to the `insmod` command line following the file path are passed directly to the kernel module as parameter strings. For example, `insmod driver.ko mode=1` allows the module's C code to evaluate the `mode` variable dynamically during initialization.

## Practice Problems

- _Problem:_ Manually insert a compiled kernel module located at `/tmp/test_module.ko` directly into the running kernel.
  - _Hint:_ Invoke the low-level injection command supplying the absolute file path.
  - _Solution:_ `insmod /tmp/test_module.ko` (This bypasses configuration indexes and forces the ELF object into kernel memory).
- _Problem:_ Insert the kernel module `./sensor_driver.ko`, passing a parameter setting `polling_rate` to `500` explicitly to the driver initialization function.
  - _Hint:_ Append the key=value pair directly after the filename argument.
  - _Solution:_ `insmod ./sensor_driver.ko polling_rate=500` (The kernel intercepts the appended argument and injects it into the module's declared parameter variables).

## References

- [Man Page for insmod (Linux)](https://man7.org/linux/man-pages/man8/insmod.8.html)
- [The Linux Kernel Module Programming Guide - Passing Command Line Arguments](https://tldp.org/LDP/lkmpg/2.6/html/x323.html)
