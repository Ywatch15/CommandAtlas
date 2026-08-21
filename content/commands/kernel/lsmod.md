---
slug: lsmod
name: lsmod
aliases: []
category: kernel
tags:
  - linux
  - kernel
  - modules
  - drivers
  - sysadmin
difficulty: beginner
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - list loaded kernel modules
  - show active linux drivers
  - check if kernel module is loaded
  - view loaded drivers
  - audit active linux modules
relatedCommands: [modprobe, insmod, rmmod, modinfo, depmod]
alternatives: []
status: draft
---

## What is it?

`lsmod` is a Linux command-line utility that formats and displays the contents of the `/proc/modules` virtual file. It provides a human-readable, tabular summary of all currently loaded Loadable Kernel Modules (LKMs), showing their names, memory footprint sizes, and dependency mappings (which other modules rely on them).

## Why does it exist?

The Linux kernel uses a modular architecture, allowing hardware drivers and core features (like filesystems or network protocols) to be dynamically loaded into RAM without rebooting. While the kernel exposes this state natively via `/proc/modules`, that raw file is space-delimited and difficult to read. `lsmod` exists to parse this virtual file and render a clean, structured visual table, allowing systems administrators to instantly audit active hardware drivers and kernel extensions.

## Syntax

```bash
lsmod
```

## Flags

| Flag / Column | Description                                                                                   | Example           |
| ------------- | --------------------------------------------------------------------------------------------- | ----------------- |
| `--help`      | Outputs brief usage documentation and supported command-line options.                         | `lsmod --help`    |
| `--version`   | Displays version information for the `kmod` package suite.                                    | `lsmod --version` |
| `Module`      | (Output Column) Displays the explicit name of the loaded kernel module.                       | _N/A_             |
| `Size`        | (Output Column) Displays the amount of RAM (in bytes) the module actively consumes.           | _N/A_             |
| `Used by`     | (Output Column) Displays the reference count and a comma-separated list of dependent modules. | _N/A_             |

_(Note: `lsmod` is a specialized, single-purpose formatting wrapper and deliberately accepts no functional operational flags. To filter or sort its output, you must pipe it into standard text-processing utilities like `grep` or `sort`.)_

## Examples

```bash
lsmod
```

> This executes the default command, querying the kernel and outputting a complete, three-column table (`Module`, `Size`, `Used by`) of every active kernel module currently loaded in memory.

```bash
lsmod | grep kvm
```

> This pipes the full module list into `grep` to filter the output, which is the standard methodology for checking if specific virtualization extensions (like Kernel-based Virtual Machine drivers) are actively loaded on a hypervisor.

```bash
lsmod | awk '{print $1}' | tail -n +2
```

> This uses `awk` to extract strictly the first column (the module names) and strips the header row using `tail`, making the output ideal for programmatic `for` loops or batch processing.

```bash
lsmod | sort -k 2 -n -r | head -n 10
```

> This sorts the active kernel modules numerically (`-n`) by their memory footprint size (column 2) in reverse order (`-r`), displaying the top 10 largest kernel drivers consuming RAM.

```bash
watch -n 1 lsmod
```

> This uses the `watch` utility to continuously refresh the `lsmod` output every second, allowing administrators to visually monitor modules dynamically attaching and detaching when plugging in hot-swappable USB hardware.

## Real-World Scenarios

**Verifying Cloud Instance Network Drivers**

```bash
lsmod | grep -E "ena|ixgbevf"
```

> Cloud engineers migrating instances between AWS hardware generations run this command to verify that the high-performance Elastic Network Adapter (`ena`) or legacy Intel virtual function (`ixgbevf`) drivers have successfully initialized within the kernel.

**Troubleshooting GPU Passthrough on Bare Metal**

```bash
lsmod | grep nouveau && echo "Nouveau still loaded!"
```

> Systems administrators configuring proprietary NVIDIA GPU drivers use `lsmod` to verify that the open-source `nouveau` driver has been successfully blacklisted. If it appears in the output, the proprietary driver will fail to bind.

**Auditing Active Filesystem Support**

```bash
lsmod | grep -E "btrfs|zfs|xfs"
```

> Storage engineers audit the kernel state before attempting to mount exotic or specialized filesystems, ensuring the required filesystem modules are loaded before executing `mount` commands.

## When should it NOT be used?

- **Querying detailed module metadata:** **Reason:** `lsmod` only shows name, size, and dependency count. It does not show author, license, or accepted parameters. **Use instead:** `modinfo <module_name>`.
- **Loading or unloading modules:** **Reason:** `lsmod` is strictly a read-only reporting utility. It cannot alter the kernel state. **Use instead:** `modprobe` or `rmmod`.

## Alternatives

- **`cat /proc/modules`:** Direct virtual file inspection. **Tradeoff:** It provides identical data without spawning a new binary execution, but lacks the clean alignment and header formatting of `lsmod`.
- **`/sys/module/`:** The sysfs filesystem. **Tradeoff:** Exploring the `/sys/module/` directory exposes vastly more operational data (like active parameters and exact memory layouts) but requires manual directory traversal rather than a single terminal command.

## How it works internally

When you execute `lsmod`, the utility (which is typically a symlink to the `kmod` binary suite) opens the `/proc/modules` virtual file generated dynamically by the Linux kernel.

The kernel populates `/proc/modules` by iterating over a linked list of `struct module` objects currently residing in kernel space memory. For each module, the kernel exposes its name, size in bytes, reference count (how many things are currently using it), and a list of parent modules that depend on it.

`lsmod` simply reads this space-delimited text stream, calculates the maximum string lengths required for each column to ensure perfect vertical alignment, attaches a human-readable header row (`Module  Size  Used by`), and flushes the formatted string table to standard output. It executes entirely in user-space and executes in microseconds.

## Performance Notes

- Execution is virtually instantaneous, as it only performs a sequential read on a small, dynamically generated RAM-based pseudo-file (`/proc/modules`).
- Because the data originates from the kernel's internal linked list, the output is guaranteed to be 100% accurate at the exact millisecond the system call executes.

## Security Notes

- **Privilege Execution:** Unprivileged standard users can run `lsmod` and view loaded modules. While harmless on personal machines, in hardened multi-tenant environments, exposing loaded modules can leak architecture details to attackers, aiding them in selecting specific kernel exploits.
- **Kernel Pointer Hiding:** In modern kernels with `kptr_restrict` enabled, viewing the raw `/proc/modules` file might hide actual kernel memory address pointers from standard users, though `lsmod` abstracts these pointers away entirely.

## Common Mistakes

- **Expecting `lsmod` to show built-in modules:** Running `lsmod` and wondering why core drivers are missing. **Why it's wrong:** `lsmod` _only_ shows Loadable Kernel Modules (LKMs). Drivers compiled statically directly into the monolithic kernel image (built-ins) do not appear here. You must check `/lib/modules/$(uname -r)/modules.builtin`.
- **Assuming size represents total hardware RAM usage:** **Why it's wrong:** The `Size` column only reflects the memory consumed by the module's executable code and static data structures in kernel space, not the dynamic memory (like video RAM or network buffers) the hardware itself allocates during operation.

## Best Practices

- When writing bash automation scripts, parse `/proc/modules` directly with `awk` rather than calling `lsmod`. It eliminates the need to skip the `lsmod` header row and avoids spawning an unnecessary external binary.
- Use `lsmod` immediately before and after plugging in external hardware to quickly isolate the exact driver name the kernel selected for the device.

## Interview Questions

**Q:** Does `lsmod` display every driver currently operating your Linux system? Why or why not?
**A:** No. `lsmod` only displays Loadable Kernel Modules (LKMs) that are dynamically inserted into the kernel at runtime. Drivers that are compiled statically into the monolithic kernel core (such as primary SATA controllers or core networking stacks) do not appear in `lsmod` output.
**Q:** What is the technical mechanism `lsmod` uses to retrieve its information?
**A:** `lsmod` is essentially a formatting wrapper. It reads the raw, space-delimited data directly from the kernel's `/proc/modules` virtual file, aligns the columns for readability, and prints the result to standard output.
**Q:** What does the `Used by` column signify in the output of `lsmod`, and why is it important for system stability?
**A:** The `Used by` column shows the reference count and lists other loaded modules that depend on that specific module. If a module's reference count is greater than 0, the kernel will physically block you from removing it (via `rmmod`) to prevent crashing the dependent drivers and causing kernel panics.

## Practice Problems

**Problem:** Check if the `overlay` filesystem module is actively loaded into the kernel.
**Hint:** Pipe the output of the module listing command into a text filter.
**Solution:** `lsmod | grep overlay` (This filters the active kernel module list to isolate the target string).
**Problem:** Display the top 5 largest loadable kernel modules currently consuming memory, sorted by size.
**Hint:** Pipe the output into `sort`, targeting the second column numerically in reverse, then use `head`.
**Solution:** `lsmod | sort -k 2 -n -r | head -n 6` (This sorts the output by the Size column and truncates the list, retaining the header row).

## References

- [Man Page for lsmod (Linux)](https://man7.org/linux/man-pages/man8/lsmod.8.html)
- [The Linux Kernel Module Programming Guide](https://tldp.org/LDP/lkmpg/2.6/html/)
