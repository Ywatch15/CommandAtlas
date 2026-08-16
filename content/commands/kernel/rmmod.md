---
slug: rmmod
name: rmmod
aliases:
  - remove module
category: kernel
tags:
  - linux
  - kernel
  - modules
  - drivers
  - sysadmin
difficulty: advanced
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - remove kernel module directly
  - unload linux driver
  - force remove kernel module
  - delete active kernel object
  - detach module from linux kernel
relatedCommands:
  - modprobe
  - insmod
  - lsmod
  - modinfo
alternatives:
  - kmod
  - modprobe
status: draft
---

## What is it?

`rmmod` (remove module) is a low-level command-line utility used to remove a single, specific Loadable Kernel Module (LKM) from the active Linux kernel. It serves as the direct uninstallation counterpart to `insmod`, communicating directly with the kernel to cleanly unmap drivers from memory without processing dependency chains.

## Why does it exist?

When a kernel developer tests new driver code or a systems engineer needs to hot-swap a misbehaving hardware module, the code must be purged from kernel memory. While `modprobe -r` is the standard operational tool, it heavily relies on `/lib/modules/` index files and attempts to recursively remove dependencies. `rmmod` exists to provide a surgical, surgical removal mechanism. It targets a single logical module name in memory and invokes the `delete_module()` system call directly, ignoring complex configuration graphs.

## Syntax

```bash
rmmod [OPTIONS] modulename
```

## Flags

| Flag              | Description                                                                                       | Example                        |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| `-f`, `--force`   | Forces module removal even if the kernel believes it is still in use (highly dangerous).          | `rmmod -f frozen_driver`       |
| `-w`, `--wait`    | Blocks and waits patiently for the module's reference count to drop to zero before removing it.   | `rmmod -w busy_network_driver` |
| `-s`, `--syslog`  | Redirects all error and status messages to the system syslog rather than standard error (stderr). | `rmmod -s bluetooth`           |
| `-v`, `--verbose` | Produces detailed output, printing exactly what `rmmod` is doing internally.                      | `rmmod -v floppy`              |
| `--help`          | Outputs brief usage documentation and supported command-line options.                             | `rmmod --help`                 |
| `--version`       | Displays version information for the `kmod` package suite.                                        | `rmmod --version`              |

## Examples

```bash
rmmod pcspkr
```

> This invokes the standard `rmmod` operation, targeting the logical name of the loaded module (`pcspkr`). The kernel verifies the module is not actively in use by any other process or driver, and safely unloads it from memory.

```bash
rmmod -w ixgbe
```

> This attempts to remove a network driver. If the interface is currently active and processing packets (reference count > 0), the command will block and wait (`-w`) indefinitely. As soon as an administrator brings the interface down (`ip link set eth0 down`), the reference count drops, and `rmmod` instantly removes the module.

```bash
rmmod -v -s usb_storage
```

> This aggressively removes the USB mass storage driver, outputting verbose steps to the terminal (`-v`) while simultaneously mirroring the execution logs to the system's `syslog` facility (`-s`) for remote auditing.

```bash
rmmod -f corrupted_driver
```

> This forces the unlinking of a module that refuses to unload normally. This requires the kernel to have been explicitly compiled with `CONFIG_MODULE_FORCE_UNLOAD=y` and carries a severe risk of inducing an immediate kernel panic.

## Real-World Scenarios

**Kernel Driver Development Feedback Loops**

```bash
rmmod custom_sensor && make && insmod ./custom_sensor.ko
```

> Developers writing C drivers for embedded hardware use `rmmod` in a continuous compilation loop to strip their buggy driver out of memory before forcefully injecting the newly compiled `.ko` file back in via `insmod`.

**Resetting Misbehaving Hardware Controllers**

```bash
rmmod ath9k && sleep 2 && modprobe ath9k
```

> Systems administrators combatting severe Wi-Fi or Bluetooth chipset freezes use `rmmod` to completely eradicate the driver state from the kernel, triggering a hardware reset before reloading the driver to restore functionality without a system reboot.

**Validating Hardened Attack Surfaces**

```bash
rmmod ipv6
```

> Security engineers auditing tightly constrained minimal servers strip away every non-essential module (like IPv6 stacks or floppy controllers) using `rmmod` to definitively minimize the kernel's active attack surface footprint.

## When should it NOT be used?

- **General administration of complex driver stacks:** **Reason:** `rmmod` is surgical and "dumb". If you remove a top-level module, it leaves all underlying orphaned dependencies consuming RAM. **Use instead:** `modprobe -r`, which traces the dependency graph and cleans up orphaned prerequisites automatically.
- **Unloading critical storage or input drivers remotely:** **Reason:** Running `rmmod ext4` or `rmmod e1000e` over an SSH connection will instantly sever your network access or crash the filesystem, resulting in an unrecoverable remote lockup.

## Alternatives

- **`modprobe -r`:** Intelligent module removal. **Tradeoff:** `modprobe -r` is universally safer and cleaner because it utilizes the `modules.dep` index to recursively unload unnecessary parent dependencies, whereas `rmmod` leaves them behind.

## How it works internally

When you execute `rmmod <module>`, the utility bypasses all `/lib/modules/` configuration files. It takes the logical string name of the module and invokes the `delete_module(name, flags)` Linux system call.

The kernel intercepts this call and checks the module's **Reference Count** (which is visible in the `Used by` column of `lsmod`). This count tracks how many active processes, hardware devices, or other modules currently rely on the driver.

If the reference count is `0`, the kernel invokes the module's registered `module_exit()` C function. This function is responsible for gracefully tearing down whatever the module set up: unregistering device nodes in `/dev`, freeing allocated RAM buffers, and unbinding from hardware interrupts. Once `module_exit()` completes successfully, the kernel unmaps the ELF object from protected memory and destroys the `struct module` entry. If the reference count is greater than `0`, the kernel immediately rejects the system call with an `EBUSY` error unless the `-w` (wait) or `-f` (force) flags alter the logic.

## Performance Notes

- Executing `rmmod` is instantaneous, but the time taken depends entirely on the developer's `module_exit()` implementation. If the driver must flush gigabytes of cached buffer data to a hardware RAID controller before unregistering, the `rmmod` command will block until the hardware acknowledges the flush.

## Security Notes

- **Kernel Panic Inducement:** Utilizing the `-f` (force) flag is incredibly dangerous. It instructs the kernel to ignore the reference count and forcefully unmap the module's memory. If an active process subsequently attempts to execute a function pointing to that now-unmapped memory address, the CPU throws a fatal page fault, resulting in a severe, instantaneous kernel panic.
- **Lockdown Mode Interference:** Systems with UEFI Secure Boot and strict Kernel Lockdown modes may entirely disable the ability to force-unload modules or severely restrict runtime kernel memory modifications, limiting the efficacy of deep `rmmod` interventions.

## Common Mistakes

- **Module is in use error:** Running `rmmod vfat` and getting `ERROR: Module vfat is in use`. **Why it's wrong:** The module's reference count is greater than zero. You likely have a USB drive actively mounted using the `vfat` filesystem. You must execute `umount` to release the filesystem lock before the kernel permits removal.
- **Appending the `.ko` extension:** Running `rmmod my_driver.ko`. **Why it's wrong:** While `insmod` takes a filesystem path with a `.ko` extension, `rmmod` requires the _logical kernel name_ of the module currently residing in memory (as seen in `lsmod`). You must run `rmmod my_driver`.
- **Leaving orphaned dependencies:** Using `rmmod` to remove a complex sound driver stack. **Why it's wrong:** `rmmod` removes only the specific module requested. The core sound modules it relied on remain loaded, needlessly consuming RAM. Use `modprobe -r` to clean the entire tree.

## Best Practices

- Universally prefer `modprobe -r` for daily administrative teardowns. Reserve `rmmod` strictly for isolated development workflows or when explicit, surgical removal of a single layer of a broken driver stack is required.
- If a module refuses to unload due to `EBUSY`, use the `-w` (wait) flag and sequentially bring down network interfaces or unmount drives in another terminal. The command will elegantly complete the moment the lock is cleared.

## Interview Questions

- _Query:_ What specific internal kernel metric dictates whether a standard `rmmod` command succeeds or fails with an `EBUSY` ("Module is in use") error?
  - _A:_ The kernel tracks a "Reference Count" for every loaded module. This integer increments when a hardware device binds to the driver, a process opens a file descriptor associated with it, or another module depends on it. `rmmod` will strictly fail with `EBUSY` if this reference count is anything greater than `0`.
- _Query:_ Why is the `--force` (`-f`) flag of `rmmod` widely considered a "last resort" that can easily trigger a kernel panic?
  - _A:_ The `-f` flag bypasses the reference count safety mechanism. If the kernel forcefully unmaps the module's executable code from RAM while another driver or application holds active memory pointers expecting that code to exist, the next execution attempt hits an invalid memory address, causing a fatal CPU page fault and an immediate kernel panic.
- _Query:_ If a developer loads a module into the kernel using `insmod /tmp/experimental.ko`, should they use `rmmod /tmp/experimental.ko` to remove it?
  - _A:_ No. `insmod` accepts an absolute filesystem path because it reads an ELF object off the disk. `rmmod` interacts with the kernel's active memory state and requires the _logical module name_ (e.g., `rmmod experimental`), completely discarding the `.ko` extension and path.

## Practice Problems

- _Problem:_ Remove the `pcspkr` (PC Speaker) module from the active kernel to disable annoying system beep noises.
  - _Hint:_ Target the logical name of the module with the low-level removal command.
  - _Solution:_ `rmmod pcspkr` (The kernel verifies the reference count is zero and executes the module's teardown function).
- _Problem:_ Attempt to remove the `kvm` module, but instruct the command to block and wait patiently for any running virtual machines to shut down and release their locks on the driver.
  - _Hint:_ Combine the module removal command with the wait flag.
  - _Solution:_ `rmmod -w kvm` (This defers execution safely in the background, pausing until the internal kernel reference count drops to zero).

## References

- [Man Page for rmmod (Linux)](https://man7.org/linux/man-pages/man8/rmmod.8.html)
- [The Linux Kernel Module Programming Guide - System Calls](https://tldp.org/LDP/lkmpg/2.6/html/x971.html)
