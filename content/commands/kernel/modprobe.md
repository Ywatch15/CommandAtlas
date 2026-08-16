---
slug: modprobe
name: modprobe
aliases: []
category: kernel
tags:
  - linux
  - kernel
  - modules
  - drivers
  - sysadmin
  - hardware
difficulty: intermediate
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - load kernel module safely
  - remove linux driver and dependencies
  - add module to linux kernel
  - force load kernel module
  - check module dependencies
relatedCommands:
  - lsmod
  - insmod
  - rmmod
  - modinfo
  - depmod
  - kmod
  - sysctl
alternatives:
  - insmod
  - rmmod
status: draft
---

## What is it?

`modprobe` is an intelligent command-line utility used to add Loadable Kernel Modules (LKMs) to the Linux kernel or remove them. Unlike lower-level tools, `modprobe` automatically analyzes module dependencies (using the `modules.dep` file) and sequentially loads any prerequisite modules required by the target driver before loading the driver itself.

## Why does it exist?

Hardware drivers and kernel extensions often rely on a deep tree of shared libraries and core modules (for instance, a specific USB network card driver relies on the core `usbcore` and `net` modules). Manually identifying and loading these prerequisites sequentially using `insmod` is tedious and error-prone. `modprobe` exists to act as an intelligent package manager for the kernel, parsing dependency trees and executing safe, sequential loading and unloading operations automatically.

## Syntax

```bash
modprobe [OPTIONS] [-i] [-b] modulename [module parameters...]
modprobe [OPTIONS] -r modulename
```

## Flags

| Flag                      | Description                                                                                | Example                           |
| ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| `-r`, `--remove`          | Removes the specified module, and automatically removes any unused dependent modules.      | `modprobe -r e1000e`              |
| `-a`, `--all`             | Inserts all module names specified on the command line simultaneously.                     | `modprobe -a nfs cifs`            |
| `-v`, `--verbose`         | Prints exactly what internal `insmod` and `rmmod` commands `modprobe` is executing.        | `modprobe -v bluetooth`           |
| `-n`, `--dry-run`         | Performs a simulation, doing everything except actually inserting or removing the modules. | `modprobe -n -v kvm`              |
| `-c`, `--showconfig`      | Dumps the complete evaluated configuration (aliases, blacklists, options) and exits.       | `modprobe -c`                     |
| `-f`, `--force`           | Forces module loading by stripping strict kernel version and symbol checksum verification. | `modprobe -f custom_driver`       |
| `-i`, `--ignore-install`  | Bypasses `install` and `remove` hooks defined in configuration files.                      | `modprobe -i btrfs`               |
| `-b`, `--use-blacklist`   | Applies blacklist restrictions explicitly (usually combined with `-a` or probing aliases). | `modprobe -b nouveau`             |
| `-d`, `--dirname <dir>`   | Specifies a custom root directory for modules instead of `/lib/modules/`.                  | `modprobe -d /mnt/rescue e1000`   |
| `-S`, `--set-version <v>` | Overrides the current kernel version, searching for modules for a specific kernel release. | `modprobe -S 5.15.0-generic ext4` |
| `--first-time`            | Forces the command to exit with a non-zero error if the module is already loaded.          | `modprobe --first-time vfat`      |

## Examples

```bash
modprobe kvm_intel
```

> This intelligently loads the Intel KVM virtualization module. If `kvm_intel` requires the core `kvm` module, `modprobe` automatically locates and loads the core `kvm` module first before loading `kvm_intel`.

```bash
modprobe -r e1000e
```

> This removes the `e1000e` network driver from the kernel. Because `-r` is used, `modprobe` will also attempt to cleanly unload any prerequisite modules that were loaded alongside it, provided no other active drivers still depend on them.

```bash
modprobe -n -v br_netfilter
```

> This performs a verbose dry run (`-n -v`), outputting the exact filesystem paths and system calls `modprobe` _would_ use to load the `br_netfilter` module and its dependencies, without actually modifying the active kernel.

```bash
modprobe dummy numdummies=4
```

> This loads the `dummy` network interface module and explicitly passes a kernel module parameter (`numdummies=4`) directly via the command line, overriding the module's default configuration.

```bash
modprobe -c | grep blacklist
```

> This dumps the entire parsed `modprobe` configuration spanning all files in `/etc/modprobe.d/` and filters for `blacklist` entries, allowing administrators to verify which drivers are explicitly banned from loading.

## Real-World Scenarios

**Injecting Custom Network Driver Parameters**

```bash
modprobe ixgbe allow_unsupported_sfp=1
```

> Systems engineers operating enterprise 10GbE network cards use `modprobe` to inject specific runtime parameters (like allowing third-party fiber transceivers) instantly without requiring a full system reboot to pass kernel boot flags.

**Safe Hardware Driver Upgrades**

```bash
modprobe -r nvidia && modprobe nvidia
```

> Linux workstation users updating proprietary GPU drivers use `modprobe -r` to cleanly flush the old driver and its memory allocations out of the kernel, followed by a standard `modprobe` to insert the newly compiled module into the active kernel.

**Emergency Blacklist Verification**

```bash
modprobe -n -v usb-storage
```

> Security auditors enforcing DLP (Data Loss Prevention) policies run dry-runs on restricted modules (like USB mass storage) to guarantee that the system configuration successfully blacklists the module and prevents execution.

## When should it NOT be used?

- **Loading out-of-tree, unindexed `.ko` files directly:** **Reason:** `modprobe` searches exclusively within the `/lib/modules/$(uname -r)/` directory structure using the `modules.dep` index. It cannot load an arbitrary `/tmp/my_driver.ko` file directly. **Use instead:** `insmod /tmp/my_driver.ko`.
- **When module databases are corrupted or missing:** **Reason:** If the `modules.dep.bin` index file is deleted, `modprobe` completely fails to locate any modules, regardless of whether they exist on disk. **Use instead:** Run `depmod` to rebuild the index first.

## Alternatives

- **`insmod`:** Direct module insertion. **Tradeoff:** `insmod` forces a specific binary into the kernel directly via file path, bypassing all configuration files, blacklists, and dependencies. It is riskier but necessary for raw kernel development.
- **`/etc/modules-load.d/`:** Persistent module configuration. **Tradeoff:** `modprobe` loads modules dynamically for the current session. To ensure a module loads automatically on every boot, it must be added to these Systemd configuration directories.

## How it works internally

When you execute `modprobe <module>`, the utility (part of the `kmod` suite) references the kernel index files generated by the `depmod` utility—specifically `modules.dep.bin` and `modules.alias.bin` located in `/lib/modules/$(uname -r)/`.

First, it checks `/etc/modprobe.d/` for any configurations, aliases, options, or blacklists targeting the module. If a module is blacklisted, `modprobe` aborts unless explicitly overridden.

Next, it queries `modules.dep.bin` to resolve the full absolute filesystem path of the requested `.ko` file and maps out its entire dependency tree. `modprobe` then iteratively loads the dependencies from the bottom up, invoking the `finit_module()` or `init_module()` system calls. Once all dependencies report successful initialization, `modprobe` maps the primary module into memory and executes the system call to bind it into the running kernel. For removal (`-r`), the process reverses, checking `/proc/modules` reference counts and invoking `delete_module()` from the top down.

## Performance Notes

- Loading a module is virtually instantaneous as it involves a rapid memory mapping and kernel initialization callback. However, the hardware the module binds to may take several seconds to negotiate (e.g., PCIe bus resetting or NIC link negotiation).
- Because `modprobe` reads binary cache files (`modules.dep.bin`) rather than plaintext, dependency resolution and execution overhead are drastically minimized compared to legacy implementations.

## Security Notes

- **Kernel Ring 0 Access:** Successfully executing `modprobe` injects compiled C code directly into Kernel Ring 0. This code has unrestricted, total control over physical hardware and system memory. Only strictly verified, signed modules should be loaded in production.
- **UEFI Secure Boot Restrictions:** On modern systems with UEFI Secure Boot enabled, the kernel enforces strict cryptographic module signature verification. `modprobe` will fail with an "Operation not permitted" or "Key was rejected" error if you attempt to load a custom module lacking an authorized MOK (Machine Owner Key) signature.

## Common Mistakes

- **Assuming `modprobe` makes changes permanent:** Running `modprobe my_driver` to fix a hardware issue and expecting it to survive a reboot. **Why it's wrong:** `modprobe` alters the live kernel RAM state. Upon reboot, the kernel resets. You must append the module name to a `.conf` file in `/etc/modules-load.d/` to persist it.
- **Using file paths instead of module names:** Running `modprobe /lib/modules/.../my_driver.ko`. **Why it's wrong:** `modprobe` takes _logical module names_ (e.g., `my_driver`), not absolute filesystem paths. The command will fail. Use `insmod` for raw file paths.
- **Ignoring the `.ko` extension rules:** Module names do not include the `.ko` extension when invoked via `modprobe`.

## Best Practices

- Always execute `modprobe -n -v <module>` when attempting to remove or load critical storage or network drivers to visually audit the dependency blast radius before committing the change.
- Use `/etc/modprobe.d/*.conf` files to persistently assign static module parameters (e.g., `options e1000e debug=1`) rather than passing them manually via the CLI every time.
- If a `modprobe` command instantly returns "Module not found", immediately execute `sudo depmod -a` to rebuild the kernel's dependency index, which often goes out of sync after manual driver installations.

## Interview Questions

- _Query:_ What is the functional difference between `insmod` and `modprobe` when injecting a driver into the Linux kernel?
  - _A:_ `insmod` is a low-level tool that takes an exact filesystem path to a `.ko` file and forcefully injects it into the kernel without resolving or loading any dependencies. `modprobe` is an intelligent wrapper; it takes a logical module name, consults the `modules.dep` index, and automatically loads all prerequisite modules sequentially before loading the target module.
- _Query:_ A systems administrator wants to completely ban a vulnerable kernel module (e.g., `usb-storage`) from ever loading into the system. How does `modprobe` facilitate this?
  - _A:_ The administrator creates a `.conf` file in `/etc/modprobe.d/` containing the directive `blacklist usb-storage`. When `modprobe` attempts to load a module (either manually or via hardware auto-discovery), it parses these configuration files first and strictly aborts the operation if the module is listed on a blacklist.
- _Query:_ You compile a custom kernel module and place it in the correct `/lib/modules/$(uname -r)/` directory, but running `modprobe custom_mod` returns a "not found" error. What did you forget to do?
  - _A:_ You forgot to update the kernel's module index map. `modprobe` relies entirely on binary map files (like `modules.dep.bin`). You must execute `depmod -a` to scan the directory and rebuild those index files so `modprobe` knows the module exists.

## Practice Problems

- _Problem:_ Safely remove the active `floppy` kernel module from the running system, ensuring that any unused dependencies strictly associated with it are also cleanly removed.
  - _Hint:_ Use the removal flag provided by the intelligent module manager.
  - _Solution:_ `modprobe -r floppy` (The `-r` flag safely unloads the target and gracefully unloads trailing dependencies if their reference counts drop to zero).
- _Problem:_ Perform a dry-run test to see the exact sequence of kernel modules that would be loaded if you requested the `nfs` module, without actually altering the active kernel state.
  - _Hint:_ Combine the dry-run simulation flag with the verbose output flag.
  - _Solution:_ `modprobe -n -v nfs` (This parses the dependency tree and simulates the loading sequence securely).

## References

- [Man Page for modprobe (Linux)](https://man7.org/linux/man-pages/man8/modprobe.8.html)
- [Arch Linux Wiki - Kernel module](https://wiki.archlinux.org/title/Kernel_module)
