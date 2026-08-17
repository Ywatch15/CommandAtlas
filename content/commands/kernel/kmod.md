---
slug: kmod
name: kmod
aliases:
  - modprobe
  - lsmod
  - rmmod
  - insmod
  - modinfo
category: kernel
tags:
  - linux
  - kernel
  - modules
  - drivers
  - hardware
difficulty: intermediate
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - manage linux kernel modules
  - list loaded kernel modules
  - interact with libkmod
  - check module static nodes
  - load driver into kernel
relatedCommands: [depmod, sysctl, dmesg, modprobe]
alternatives: [insmod, rmmod]
status: draft
---

## What is it?

`kmod` is a multi-call binary that serves as the centralized Swiss Army knife for managing Linux kernel modules. It provides the underlying implementation for the `libkmod` library. Rather than maintaining separate codebases for tools like `lsmod`, `rmmod`, `insmod`, `modinfo`, and `modprobe`, modern Linux distributions symlink these legacy commands directly to the single `kmod` binary, which determines its execution behavior based on how it was invoked.

## Why does it exist?

In older Linux systems, the `module-init-tools` package provided discrete, disparate binaries to handle kernel module loading and unloading. This approach suffered from code duplication and inefficiency. `kmod` was engineered to replace this suite by consolidating all module management logic into a highly optimized, single C library (`libkmod`) and a frontend multi-call binary. This transition unified the handling of module dependencies, compressed kernel modules (like `.ko.xz`), and blacklists, significantly speeding up the boot process and simplifying the user-space interface to the kernel's loadable modules.

## Syntax

```bash
kmod [options] command [command_options]
```

_(Note: While `kmod` can be invoked directly, it is almost exclusively utilized in the real world via its symlinked aliases like `modprobe` or `lsmod`.)_

## Flags

| Command / Flag    | Description                                                                                                                | Example                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `list`            | Lists currently loaded kernel modules. (Functionally identical to running the `lsmod` symlink).                            | `kmod list`                           |
| `static-nodes`    | Outputs the static device nodes specified by the loaded modules. Used heavily by `systemd-udevd` during early boot.        | `kmod static-nodes`                   |
| `insert`          | Inserts a module into the kernel given its absolute file path. (Functionally identical to `insmod`).                       | `kmod insert /lib/modules/.../brd.ko` |
| `remove`          | Removes a specific loaded module from the kernel. (Functionally identical to `rmmod`).                                     | `kmod remove brd`                     |
| `-V`, `--version` | Prints the version of the `kmod` executable and the underlying `libkmod` library, including supported compression formats. | `kmod -V`                             |
| `-h`, `--help`    | Prints a brief help message displaying the usage syntax and available subcommands.                                         | `kmod -h`                             |

## Examples

```bash
kmod list
```

> Outputs a formatted list of all currently loaded kernel modules. It displays the module name, its size in bytes, a reference count indicating how many instances are actively using it, and a list of other modules that depend on it.

```bash
kmod static-nodes -f tmpfiles
```

> Extracts the devname strings and permissions defined within the compiled kernel modules and outputs them in the `tmpfiles.d` format. This command is executed by `kmod-static-nodes.service` during early boot to pre-populate `/dev/` before the `udev` daemon fully initializes.

```bash
ls -l /usr/sbin/modprobe
```

> While not a `kmod` command itself, running this in the terminal demonstrates the multi-call nature of the binary. The output will show that `/usr/sbin/modprobe` is simply a symbolic link pointing directly to `/usr/bin/kmod`.

```bash
kmod -V
```

> Outputs version data, crucially detailing which compression algorithms the tool supports (e.g., `+ZSTD +XZ +ZLIB +LIBCRYPTO`). This is essential to know when building custom kernels with compressed `.ko` files.

## Real-World Scenarios

**Verifying Kmod Library Support**

```bash
kmod -V
```

> A system administrator compiles a custom kernel and decides to use Zstandard (zstd) to compress the kernel modules to save space on the `initramfs`. Before deploying, they run `kmod -V` to ensure the host OS's `kmod` binary was actually compiled with `+ZSTD` support; otherwise, the system will completely fail to boot.

**Early Boot Device Node Generation**

```bash
kmod static-nodes --format=tmpfiles --output=/run/tmpfiles.d/kmod.conf
```

> This exact command is embedded inside the systemd initialization sequence (`kmod-static-nodes.service`). It extracts hardcoded device node requests directly from the module binaries (like `/dev/fuse` or `/dev/loop-control`) and writes them into a configuration file so systemd can create the `/dev` entries instantly, bypassing complex dynamic hardware detection.

## When should it NOT be used?

- **Everyday Module Management:** **Do not use `kmod insert` or `kmod remove` for daily tasks.** These subcommands act like `insmod`/`rmmod`; they are primitive and blindly execute without resolving dependencies. Always use the `modprobe` alias, which intelligently parses `modules.dep` to load all prerequisite modules automatically.
- **Building Dependency Trees:** **`kmod` does not map dependencies.** If you add a new `.ko` file to `/lib/modules/`, running `kmod list` won't find it, and `modprobe` will fail. You must use `depmod` to update the mapping files first.

## Alternatives

- **`modprobe` / `lsmod`:** **Best for semantic workflows.** These are just aliases to `kmod`, but using them makes shell scripts universally understood by other Linux administrators who are accustomed to the legacy command names.
- **`sysfs` manipulation:** For advanced low-level interactions, administrators can interact directly with `/sys/module/` to examine module parameters and states, completely bypassing `kmod`.

## How it works internally

`kmod` acts as a frontend to `libkmod`. When you execute a command (or invoke it via an alias like `modprobe bridge`), the binary inspects `argv[0]` to determine its operating mode.

If tasked with inserting a module, `libkmod` searches the directory `/lib/modules/$(uname -r)/` using the index files generated by `depmod`. It resolves the dependency tree (e.g., discovering that module A requires module B and C).

It then reads the physical `.ko` (Kernel Object) files from the disk, decompressing them on the fly in user-space if they are compressed (e.g., `.ko.xz`). Finally, it utilizes the `finit_module()` or `init_module()` system calls, passing the raw binary payload and any specified command-line parameters directly to the Linux kernel. The kernel's module loader verifies the binary's ELF signature, allocates kernel memory, resolves memory addresses for the exported symbols, and executes the module's initialization function.

## Performance Notes

- **Multi-Call Efficiency:** By wrapping `lsmod`, `modinfo`, and `modprobe` into a single `kmod` binary, distribution maintainers significantly reduce the disk footprint and memory overhead on minimal embedded systems and early-boot `initramfs` environments.

## Security Notes

- **Kernel Code Execution:** Loading a kernel module grants that code unrestricted `Ring 0` execution privileges. Because `kmod` communicates directly with the kernel's module loader, its operations are strictly restricted to the `root` user (or users with `CAP_SYS_MODULE` capabilities).
- **Module Signing:** On systems with UEFI Secure Boot enforced, the kernel will refuse to load any module passed to it by `kmod` unless the `.ko` file is cryptographically signed by a key enrolled in the Machine Owner Key (MOK) database. `kmod` will simply report a "Key was rejected by service" error.

## Common Mistakes

- **Invoking `kmod insert` directly**
  - _Mistake:_ Running `kmod insert /lib/modules/.../my_driver.ko` and getting an "Unknown symbol" error from the kernel.
  - _Why:_ `kmod insert` (like `insmod`) is a dumb loader. It pushes the exact file you gave it into the kernel. If `my_driver.ko` relies on functions provided by another module, it crashes. Always use `modprobe my_driver`, which uses `kmod`'s intelligent dependency resolution to load the prerequisites first.

## Best Practices

- **Use the Standard Aliases:** In system administration scripts, always use `lsmod`, `modprobe`, and `modinfo`. While typing `kmod list` works, using the standard aliases preserves historical continuity and readability.
- **Rely on Blacklists for Security:** If a specific kernel module represents an attack vector (e.g., obsolete protocols like `dccp` or `sctp`), do not attempt to delete the `.ko` files. Instead, create a configuration file in `/etc/modprobe.d/` containing `install dccp /bin/true`. When `kmod`/`modprobe` attempts to load it, it intercepts the call and runs `/bin/true` instead, safely neutralizing the driver.

## Interview Questions

**Q: You type `lsmod` into the terminal. Explain what binary actually executes on a modern Linux system, and where it fetches the information from.**
**A:** `lsmod` is typically a symbolic link pointing to the `/bin/kmod` multi-call binary. When executed, `kmod` detects it was invoked as `lsmod` and triggers its list function. It fetches the data by parsing the `/proc/modules` virtual file generated by the kernel, formatting the raw output into a clean, human-readable table.

**Q: During early boot, a systemd service called `kmod-static-nodes.service` runs. What is the purpose of this service?**
**A:** This service executes `kmod static-nodes`. Some kernel modules require specific device nodes (like `/dev/fuse` or `/dev/loop-control`) to exist before they are fully initialized or before the dynamic `udev` daemon is fully operational. `kmod` extracts these hardcoded device node requirements directly from the module binaries and writes them in `tmpfiles.d` format so systemd can create the `/dev` nodes immediately, preventing boot deadlocks.

## Practice Problems

**Problem:** You are compiling a minimal Linux distribution and want to verify if the `kmod` binary installed on the system has been compiled with support for `zstd` compressed kernel modules. Write the command to check this.
**Hint:** Use the version flag to output the compilation signatures.
**Solution:**

```bash
kmod -V
```

**Problem:** Using the base `kmod` command (without using the `lsmod` alias), write the command to output the currently loaded kernel modules.
**Hint:** Use the specific subcommand for listing.
**Solution:**

```bash
kmod list
```

## References

- [kmod(8) - Linux man page](https://linux.die.net/man/8/kmod)
- [Linux Kernel Module Management](https://wiki.archlinux.org/title/Kernel_module)
