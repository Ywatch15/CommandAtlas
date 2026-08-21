---
slug: modinfo
name: modinfo
aliases: []
category: kernel
tags:
  - linux
  - kernel
  - modules
  - drivers
  - sysadmin
  - metadata
difficulty: intermediate
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - show kernel module information
  - find module parameters linux
  - check driver version
  - inspect .ko file metadata
  - get author and license of module
relatedCommands: [lsmod, modprobe, insmod, rmmod]
alternatives: []
status: draft
---

## What is it?

`modinfo` is a command-line diagnostic utility used to extract and display raw metadata from Linux kernel modules (`.ko` files). It parses the ELF sections of a module to reveal critical internal information, such as the module's author, licensing, hardware aliases, firmware requirements, and customizable runtime parameters.

## Why does it exist?

Hardware drivers and kernel modules frequently accept dynamic initialization parameters (e.g., configuring network card polling rates or setting debug levels), but this documentation is rarely printed in standard manuals. `modinfo` exists to provide system administrators with a direct introspection tool. It allows operators to query the binary itself to discover exactly what parameters it accepts, what hardware PCI/USB IDs it binds to, and whether its license complies with strict open-source distribution policies.

## Syntax

```bash
modinfo [OPTIONS] modulename|filename
```

## Flags

| Flag                      | Description                                                                                     | Example                          |
| ------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| `-F`, `--field <string>`  | Restricts output strictly to the value of a specific field (e.g., `author`, `depends`, `parm`). | `modinfo -F parm kvm`            |
| `-p`, `--parameters`      | A functional alias for `-F parm`, outputting only the parameters accepted by the module.        | `modinfo -p e1000e`              |
| `-a`, `--author`          | A functional alias for `-F author`, outputting only the module's author string.                 | `modinfo -a btrfs`               |
| `-d`, `--description`     | A functional alias for `-F description`, printing the brief description of the module.          | `modinfo -d overlay`             |
| `-l`, `--license`         | A functional alias for `-F license`, printing the legal license of the module (e.g., `GPL`).    | `modinfo -l nvidia`              |
| `-n`, `--filename`        | Outputs the absolute filesystem path where the `.ko` module resides.                            | `modinfo -n ixgbe`               |
| `-0`, `--null`            | Delimits output fields with a null character (`\0`) instead of a newline, ideal for `xargs`.    | `modinfo -0 -p kvm`              |
| `-b`, `--basedir <dir>`   | Specifies a custom root directory to search for modules instead of `/`.                         | `modinfo -b /mnt/rescue vfat`    |
| `-k`, `--set-version <v>` | Overrides the kernel version, querying metadata for a specific release (e.g., `5.15.0`).        | `modinfo -k 5.15.0-generic ext4` |
| `--help`                  | Outputs brief usage documentation and supported command-line options.                           | `modinfo --help`                 |

## Examples

```bash
modinfo kvm
```

> This executes the default command, dumping all available metadata embedded in the `kvm` module, including the file path, license, dependency list, retpoline status, and all customizable initialization parameters.

```bash
modinfo -p e1000e
```

> This scopes the output strictly to the customizable parameters (`-p`) accepted by the `e1000e` Intel network driver. It provides a list of parameter names alongside brief explanations of their data types (e.g., `int`, `array`).

```bash
modinfo -n ext4
```

> This queries the module indexing system and returns strictly the absolute filesystem path pointing to the `ext4.ko` file that the kernel would load if `modprobe ext4` was executed.

```bash
modinfo ./custom_sensor.ko
```

> Instead of using a logical module name, this queries a raw, locally compiled `.ko` ELF object file by providing an explicit filesystem path, making it vital for inspecting drivers before installing them.

```bash
modinfo -F alias bluetooth
```

> This isolates a specific metadata field (`-F alias`). The output dumps all internal hardware aliases (usually PCI, USB, or ACPI IDs) that the `bluetooth` driver is programmed to automatically bind to upon device discovery.

## Real-World Scenarios

**Discovering Driver Tuning Parameters**

```bash
modinfo -p ixgbe
```

> Systems engineers optimizing high-frequency trading servers use `modinfo` to discover hidden hardware polling parameters and interrupt throttling configurations embedded inside the `ixgbe` 10GbE network driver. They then inject these discovered parameters into `/etc/modprobe.d/` for persistence.

**Auditing Proprietary System Contamination**

```bash
modinfo -l nvidia
```

> Open-source compliance auditors and kernel debuggers inspect the `license` field of modules. The kernel strictly tracks licenses; loading a module marked as `Proprietary` (like Nvidia drivers) officially "taints" the kernel state, which voids certain upstream support contracts.

**Verifying Out-of-Tree Driver Compatibility**

```bash
modinfo -F vermagic /tmp/downloaded_driver.ko
```

> Security researchers dealing with pre-compiled binary drivers extract the `vermagic` string to verify exactly which kernel version, SMP architecture, and compiler the binary was built against before attempting a risky `insmod` injection.

## When should it NOT be used?

- **Checking runtime values of actively loaded modules:** **Reason:** `modinfo` reads the static blueprint from the `.ko` file on disk. It does not tell you what parameter values the module is _currently_ running with in memory. **Use instead:** Inspect `/sys/module/<module_name>/parameters/`.
- **Resolving complex module dependency load orders:** **Reason:** While `modinfo` lists basic `depends` strings, it does not evaluate or display the full recursive dependency tree required for execution. **Use instead:** `modprobe --show-depends`.

## Alternatives

- **`strings <file.ko>`:** The raw binary string extractor. **Tradeoff:** `strings` dumps all human-readable text from the binary blindly, creating massive noise. `modinfo` specifically targets the `.modinfo` ELF section and formats it cleanly.
- **`/sys/module/` inspection:** Runtime variable inspection. **Tradeoff:** `modinfo` inspects the static capabilities of the file on disk. The `sysfs` filesystem reveals the dynamic, active state of the driver running in RAM.

## How it works internally

Kernel modules (`.ko` files) are compiled as standard ELF (Executable and Linkable Format) binary objects.

During the compilation process, the C macro `MODULE_INFO()` (and derivatives like `MODULE_AUTHOR()`, `MODULE_LICENSE()`, `module_param()`) instructs the compiler to embed null-terminated string key-value pairs into a highly specific, dedicated ELF section named `.modinfo`.

When you execute `modinfo <module>`, the utility leverages the `libkmod` library. It locates the `.ko` file on disk (using the `modules.dep` index if a logical name is provided). It maps the ELF binary into memory, seeks directly to the `.modinfo` section header, and extracts the null-terminated strings. It parses these key-value pairs, formatting them sequentially into standard output, bypassing any need to execute or load the actual driver code into the kernel.

## Performance Notes

- `modinfo` executes in low milliseconds because it acts as a simple binary parser reading local files from disk. It never interacts with live kernel memory or active hardware.
- Formatting the output using `-0` (null delimiters) is exceptionally fast and safe for parsing massive driver metadata dumps via `xargs`, as it mitigates bash word-splitting vulnerabilities on complex description strings.

## Security Notes

- **Malware Reconnaissance:** Unprivileged users can execute `modinfo` on core system drivers. While it doesn't modify the system, attackers mapping an environment use `modinfo` to gather precise kernel version requirements (`vermagic`) to craft perfectly targeted rootkits.
- **Kernel Tainting:** Understanding the `license` tag extracted by `modinfo` is critical. The Linux kernel dynamically alters its behavior and disables access to certain exported kernel symbols (GPL-only symbols) if an administrator forces the loading of a `Proprietary` or ambiguously licensed module.

## Common Mistakes

- **Assuming parameters listed are currently active:** Executing `modinfo -p` and believing those are the values running on the server. **Why it's wrong:** `modinfo` only outputs the _descriptions_ and _data types_ of parameters written in the C code, not their live initialized values. Check `/sys/module/<name>/parameters/` for live values.
- **Searching for built-in modules:** Running `modinfo` on a module permanently built into the kernel core (e.g., `modinfo unix`). **Why it's wrong:** `modinfo` expects discrete `.ko` files. Built-in modules don't have standalone `.ko` files on disk, causing the command to fail. You must inspect `modules.builtin` instead.
- **Misunderstanding `vermagic` mismatch:** Ignoring the `vermagic` output when forcing an `insmod`. **Why it's wrong:** If the `vermagic` string extracted via `modinfo` differs from your active `uname -r`, forcing the module to load will likely cause immediate memory corruption and a kernel panic.

## Best Practices

- Always execute `modinfo -p <module>` before attempting to inject custom arguments via `modprobe`. Blindly guessing parameter names will result in the kernel silently ignoring the argument or throwing initialization errors.
- When troubleshooting an "Unknown symbol" error during module loading, use `modinfo -F depends <module>` to manually verify the direct prerequisite modules that the developer explicitly declared.
- In highly compliant open-source infrastructure environments, use `modinfo -l` to programmatically audit all `.ko` files in `/lib/modules/` to ensure no `Proprietary` binary blobs violate enterprise licensing policies.

## Interview Questions

**Q:** What specific ELF section of a `.ko` file does `modinfo` parse to extract its information, and how is this data populated during development?
**A:** `modinfo` parses the `.modinfo` ELF section. This section is populated at compile-time when the kernel driver developer utilizes specific C macros—such as `MODULE_AUTHOR()`, `MODULE_LICENSE()`, and `module_param()`—in their source code, which the compiler translates into null-terminated strings packed into the binary.
**Q:** If you want to view the customizable runtime parameters a kernel module accepts _before_ you load it, which command do you use? If you want to see the _actual values_ a module is currently running with, where do you look?
**A:** To view the accepted parameters and their descriptions before loading, use `modinfo -p <module_name>`. To see the active, live values the module is currently operating with, you must read the virtual files located in `/sys/module/<module_name>/parameters/`.
**Q:** What is the functional purpose of the `alias` strings revealed when executing `modinfo -F alias <module>`?
**A:** `alias` strings are internal mapping identifiers containing PCI, USB, or ACPI vendor and product IDs. When the Linux kernel detects new physical hardware plugged into the motherboard, the `udev` system reads these aliases to automatically determine exactly which driver (`.ko` file) it needs to `modprobe` to operate the device.

## Practice Problems

**Problem:** Query the exact absolute filesystem path of the `btrfs` kernel module without loading it, ensuring that only the path string is returned.
**Hint:** Combine the metadata query tool with the specific filename formatting flag.
**Solution:** `modinfo -n btrfs` (This parses the module index and returns strictly the `/lib/modules/.../btrfs.ko` path).
**Problem:** Inspect the customizable parameters accepted by a locally compiled driver located at `./test_driver.ko`, stripping away all other author and license metadata.
**Hint:** Run the command against the raw file path, paired with the parameter-only isolation flag.
**Solution:** `modinfo -p ./test_driver.ko` (This reads the raw ELF object locally and outputs only the parameter strings and descriptions).

## References

- [Man Page for modinfo (Linux)](https://man7.org/linux/man-pages/man8/modinfo.8.html)
- [The Linux Kernel Module Programming Guide - Modules vs Programs](https://tldp.org/LDP/lkmpg/2.6/html/x181.html)
