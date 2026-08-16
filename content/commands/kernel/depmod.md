---
slug: depmod
name: depmod
aliases: []
category: kernel
tags: [linux, kernel, modules, dependencies, boot]
difficulty: advanced
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'generate modules.dep'
  - 'update kernel module dependencies'
  - 'fix broken modprobe'
  - 'rebuild module map files'
  - 'map kernel symbols'
relatedCommands: [modprobe, kmod, mkinitcpio, dracut, insmod, lsmod]
alternatives: []
status: draft
---

## What is it?

`depmod` (Dependency Module) is a core Linux utility that analyzes all loadable kernel modules (`.ko` files) residing in the `/lib/modules/$(uname -r)` directory and generates a strict dependency tree mapping. It produces the `modules.dep` file and various binary map files (like `modules.alias` and `modules.symbols`). This map acts as the definitive index that frontend tools like `modprobe` rely upon to automatically load prerequisite drivers when a specific hardware device is detected.

## Why does it exist?

Linux kernel modules are not standalone monolithic binaries; they frequently rely on shared functions (symbols) exported by other modules. For instance, a USB Wi-Fi driver relies on the core USB subsystem module. If an administrator attempts to load the Wi-Fi driver, the kernel will reject it unless the core USB module is loaded first. Manually calculating and loading these prerequisite chains is impossible for humans. `depmod` exists to statically analyze the compiled ELF binaries, matching the "undefined symbols" in one module to the `EXPORT_SYMBOL` definitions in another, mapping the entire spiderweb of dependencies into a fast, lookup-ready cache file.

## Syntax

```bash
depmod [options] [kernel-version]
```

## Flags

| Flag                            | Description                                                                                                                                      | Example                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `-a`, `--all`                   | Probes all modules in the kernel directory and completely regenerates the `modules.dep` file. This is the default action.                        | `depmod -a`                                 |
| `-A`, `--quick`                 | Checks the modification timestamps of the module files against the existing `modules.dep`. Only regenerates if new files were added or modified. | `depmod -A`                                 |
| `-e`, `--errsyms`               | Prints a list of all unresolved symbols found in the modules. Highly useful for kernel developers debugging broken module compilations.          | `depmod -e -a`                              |
| `-n`, `--show`                  | Dry-run mode. Generates the `modules.dep` output and prints it to standard output without actually writing it to the disk.                       | `depmod -n`                                 |
| `-v`, `--verbose`               | Prints the name of each module as it is processed. Useful for tracking down a specific corrupt `.ko` file hanging the parser.                    | `depmod -v`                                 |
| `-w`, `--warn`                  | Warns if multiple modules export the exact same symbol, or if there are cyclic dependencies detected in the module tree.                         | `depmod -w`                                 |
| `-b <dir>`, `--basedir <dir>`   | Uses an alternative base directory instead of `/`. Essential when building a boot image or initramfs for a totally different system (chrooting). | `depmod -b /mnt/sysimage -a 5.15.0-generic` |
| `-E <file>`, `--symvers <file>` | Explicitly specifies the `Module.symvers` file generated during kernel compilation to ensure exact symbol version matching.                      | `depmod -E /usr/src/linux/Module.symvers`   |

## Examples

```bash
depmod -a
```

> The standard operational invocation. Forces `depmod` to aggressively scan all modules inside `/lib/modules/$(uname -r)/` and rebuild `modules.dep`, `modules.alias`, and `modules.symbols` from scratch.

```bash
depmod -a 5.15.0-101-generic
```

> Generates the dependency mapping for a _specific_ kernel version, rather than the currently running kernel. This is an absolutely critical command executed by package managers (APT/YUM) when installing a new kernel update, preparing the module tree before the system reboots into the new kernel.

```bash
depmod -b /tmp/initramfs-build -a 6.1.0
```

> Used during `initramfs` generation scripts. Instructs `depmod` to analyze the modules staged inside a temporary build directory (`/tmp/initramfs-build/lib/modules/6.1.0/`) instead of the host operating system's live directories.

```bash
depmod -w -e
```

> A developer debugging command. It scans the currently running kernel's modules and prints out any missing symbols (`-e`) or dependency loops (`-w`), helping engineers identify exactly why a custom-compiled DKMS module refuses to load via `modprobe`.

## Real-World Scenarios

**Fixing a Broken DKMS Build**

```bash
# After manually copying a custom proprietary driver into the kernel tree:
cp my_custom_driver.ko /lib/modules/$(uname -r)/kernel/drivers/misc/
depmod -a
modprobe my_custom_driver
```

> An administrator manually downloads and compiles an out-of-tree proprietary driver (e.g., an older NVIDIA GPU driver or a specialized RAID controller). Simply copying the `.ko` file into the `/lib/modules` tree is insufficient; `modprobe` remains blind to it. Executing `depmod -a` rebuilds the system's index, injecting the new driver's symbols into `modules.dep`, allowing `modprobe` to successfully load it.

**Kernel Post-Installation Hooks**

```bash
# Executed automatically by system package managers
depmod -a $KERNEL_VERSION
mkinitcpio -k $KERNEL_VERSION
```

> When `apt upgrade` or `dnf update` installs a new Linux kernel, the post-installation hooks must immediately execute `depmod` to map the dependencies for the newly unpacked `/lib/modules/` directory. If `depmod` fails, the subsequent `mkinitrd`/`mkinitcpio` scripts will fail to bundle the necessary storage drivers into the boot image, rendering the server completely unbootable.

## When should it NOT be used?

- **Everyday Driver Management:** **Do not use `depmod` to load or unload drivers.** `depmod` strictly generates index text files. It does not communicate with the running kernel or load any code. Use `modprobe` to actually manipulate active drivers.
- **Unmodified Systems:** If you have not compiled a custom kernel, installed an out-of-tree DKMS module, or manually manipulated files in `/lib/modules`, running `depmod` is completely unnecessary. The package manager handles this state automatically.

## Alternatives

- **None.** `depmod` is a hard requirement in the Linux kernel ecosystem. Without it, the `modules.dep` file does not exist, and intelligent loading tools like `modprobe` completely break.

## How it works internally

When you run `depmod -a`, the utility crawls every single `.ko` (Kernel Object) file located inside `/lib/modules/<kernel-version>/`.

It parses the raw ELF (Executable and Linkable Format) binary structure of each module. Specifically, it extracts two critical sections:

1.  **Exported Symbols:** The specific functions and variables that this module deliberately exposes to the rest of the kernel (defined in C via the `EXPORT_SYMBOL()` macro).
2.  **Undefined Symbols:** The functions that this module attempts to call, but does not define internally (meaning it expects another loaded module to provide them).

`depmod` builds a massive dependency graph in memory. It matches every "Undefined Symbol" in Module A to the "Exported Symbol" in Module B. It determines that Module A strictly depends on Module B.

It then writes this resolved graph to `/lib/modules/<version>/modules.dep`. The file is formatted simply: `module_A.ko: module_B.ko module_C.ko`.

Additionally, it extracts hardware identifiers (PCI vendor IDs, USB device IDs) embedded inside the modules and writes them to `modules.alias`. When `udev` detects new hardware, it queries this alias file to know exactly which kernel module translates to that specific hardware ID, allowing plug-and-play functionality.

## Performance Notes

- **Binary Hashing:** To prevent `modprobe` from executing slow text-parsing of `modules.dep` on every hardware event, modern versions of `depmod` generate binary index files (`modules.dep.bin`, `modules.alias.bin`). `modprobe` maps these `.bin` files directly into memory using `mmap()`, enabling sub-millisecond dependency resolution during the chaotic early boot phase.

## Security Notes

- **Root Permissions:** `depmod` requires root privileges to write to the `/lib/modules` hierarchy.
- **Symbol Hijacking:** If an attacker can drop a malicious `.ko` file into the module tree and run `depmod`, the malicious module can export identical symbols to a legitimate module. Depending on the loading order or directory structure, `modprobe` might unknowingly load the malicious dependency. Secure Boot and strict module signing mitigate this risk.

## Common Mistakes

- **Forgetting to specify the kernel version**
  - _Mistake:_ Compiling a 6.5.0 kernel while currently running a 5.15.0 kernel, and running `depmod -a`.
  - _Why:_ Without specifying the version, `depmod` defaults to checking `$(uname -r)`—the _currently running_ kernel. It will analyze your 5.15.0 modules instead of your newly built 6.5.0 modules. Always explicitly pass the version (e.g., `depmod -a 6.5.0`) when preparing files for a reboot.
- **Manually editing `modules.dep`**
  - _Mistake:_ Opening `/lib/modules/$(uname -r)/modules.dep` in `vim` to forcefully add a dependency.
  - _Why:_ The file is heavily volatile and completely overwritten the next time a package manager installs a driver or runs `depmod`. Furthermore, manually editing the text file ignores the `.bin` binary cache files, meaning `modprobe` will completely ignore your manual edits.

## Best Practices

- **Leverage DKMS:** Instead of manually copying `.ko` files and running `depmod`, rely on DKMS (Dynamic Kernel Module Support). DKMS automatically orchestrates the recompilation and `depmod` execution for third-party drivers (like ZFS or NVIDIA) every time the system kernel is updated.
- **Use `depmod -A` in Scripts:** If writing custom module-management scripts that execute frequently, use `-A` (quick mode) instead of `-a`. `depmod` will stat the timestamps of the `.ko` files against `modules.dep` and exit instantly if nothing has changed, saving significant CPU cycles.

## Interview Questions

**Q: You plug in a new USB Wi-Fi adapter. The `udev` daemon detects the hardware and automatically loads the `rt2800usb` kernel module to make it work. How did `udev` know that this specific hardware required that specific module?**
**A:** When `depmod` analyzes kernel modules, it extracts the internal hardware routing tables (PCI/USB Vendor and Device IDs) compiled into the drivers and writes them into `/lib/modules/$(uname -r)/modules.alias`. When the USB device is plugged in, `udev` reads the hardware IDs, queries this `modules.alias` index, matches the ID to the `rt2800usb` alias, and fires `modprobe` to load it.

**Q: A colleague manually compiles an open-source driver to a `.ko` file, places it in `/lib/modules/$(uname -r)/`, and attempts to run `modprobe <driver>`. The command fails with "Module not found". What step did they miss?**
**A:** They failed to execute `depmod -a`. The `modprobe` command does not blindly search the filesystem for files; it explicitly reads the `modules.dep` mapping file. Because `depmod` hasn't rebuilt the map to include the newly copied file, `modprobe` remains completely unaware of its existence.

## Practice Problems

**Problem:** You are currently booted into kernel `5.10.0`, but you just installed files for kernel `5.15.0`. Write the command to generate the complete dependency map specifically for the `5.15.0` kernel modules without affecting your currently running environment.
**Hint:** Pass the specific version string as the positional argument.
**Solution:**

```bash
depmod -a 5.15.0
```

**Problem:** You are debugging a failed module compilation. Write the command to scan the currently running kernel's modules and print out a list of any functions (symbols) that a module is requesting but are missing from the system.
**Hint:** Combine the "all" flag with the flag that prints unresolved symbols.
**Solution:**

```bash
depmod -a -e
```

## References

- [depmod(8) - Linux man page](https://linux.die.net/man/8/depmod)
- [Linux Kernel Module Management](https://wiki.archlinux.org/title/Kernel_module)
