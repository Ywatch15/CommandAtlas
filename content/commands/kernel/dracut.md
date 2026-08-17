---
slug: dracut
name: dracut
aliases: []
category: kernel
tags:
  - linux
  - boot
  - initramfs
  - red-hat
  - fedora
  - kernel
difficulty: advanced
supportedOS:
  - linux
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - generate initramfs dracut
  - rebuild red hat boot image
  - add drivers to initrd
  - create rescue boot image
  - update initramfs centos
relatedCommands: [depmod, mkinitcpio]
alternatives: [mkinitcpio]
status: draft
---

## What is it?

`dracut` is an event-driven, low-level utility used to generate an `initramfs` (initial ram filesystem) image. Developed by Red Hat and widely adopted across Fedora, CentOS, SUSE, and even some Arch installations, it bundles the necessary kernel modules, systemd services, and user-space tools into a compressed archive. The bootloader loads this archive into memory to establish the preliminary environment required to discover hardware, unlock encrypted disks, and mount the physical root filesystem.

## Why does it exist?

Older initial ramdisk generators (like the legacy `mkinitrd`) were monolithic, static scripts. They hardcoded the exact sequence of commands required to mount a specific filesystem on specific hardware, which scaled poorly as enterprise architectures embraced complex iSCSI SAN boots, Multipath routing, and Network Bound Disk Encryption (NBDE). `dracut` was engineered to solve this via an event-driven architecture. Instead of hardcoding execution paths, a `dracut` initramfs relies entirely on `udev` to dynamically discover hardware and emit events. When `udev` detects a networking card or an encrypted block device, it triggers the appropriate `systemd` targets packaged inside the initramfs, making the boot process incredibly resilient to shifting hardware configurations.

## Syntax

```bash
dracut [options] [image] [kernel-version]
```

## Flags

| Flag                  | Description                                                                                                                                     | Example                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `-f`, `--force`       | Forcefully overwrites the existing initramfs image file if it already exists. Mandatory when manually iterating on a boot image.                | `dracut -f`                           |
| `--regenerate-all`    | Recompiles the initramfs image for every kernel version currently installed in the `/lib/modules/` directory.                                   | `dracut --regenerate-all -f`          |
| `-v`, `--verbose`     | Prints detailed output outlining exactly which modules, files, and libraries are being copied into the temporary build environment.             | `dracut -v -f`                        |
| `--kver <version>`    | Explicitly sets the kernel version to build the image for, bypassing the `$(uname -r)` default (the currently running kernel).                  | `dracut --kver 4.18.0-348.el8.x86_64` |
| `-m <modules>`        | Adds a space-separated list of dracut modules (e.g., `network`, `multipath`, `crypt`) to the image, overriding the host-only defaults.          | `dracut -m "network nfs" -f`          |
| `-o <modules>`        | Explicitly omits specific dracut modules from the resulting image to save space or disable unwanted boot behaviors.                             | `dracut -o "multipath" -f`            |
| `-H`, `--hostonly`    | Highly optimizes the image. Generates an initramfs tailored _strictly_ for the current host's specific hardware and filesystem layout.          | `dracut -H -f`                        |
| `-N`, `--no-hostonly` | Disables host-only mode. Generates a massive, generic image containing drivers for all conceivable hardware. Required for portable disk images. | `dracut -N -f`                        |
| `--printsize`         | Generates the image in memory and prints the final calculated byte size without actually writing it to the disk.                                | `dracut --printsize`                  |
| `--gzip`, `--zstd`    | Instructs the builder on which specific compression algorithm to apply to the final `cpio` archive.                                             | `dracut --zstd -f`                    |

## Examples

```bash
dracut -f
```

> The standard emergency recovery command. If the active initramfs is corrupted, running this without arguments forces `dracut` to overwrite the default image located at `/boot/initramfs-$(uname -r).img` using the currently active kernel version and default host-only configurations.

```bash
dracut -f /boot/initramfs-custom.img 5.14.0-362.el9.x86_64
```

> Compiles a specific target. It generates the image and saves it to a custom file path (`/boot/initramfs-custom.img`), explicitly pulling the `.ko` drivers from the `/lib/modules/5.14.0-362.el9.x86_64/` directory rather than the running kernel.

```bash
dracut --regenerate-all -f
```

> Executes a batch operation. Frequently used by configuration management tools (like Ansible) after applying a global change to `/etc/dracut.conf.d/`. It loops through every installed kernel and patches their respective initramfs files to ensure all boot entries receive the updated configuration.

```bash
dracut -N --add-drivers "ixgbe i40e e1000e" -f /boot/initramfs-rescue.img
```

> Generates an ultra-generic rescue image. By disabling host-only mode (`-N`) and explicitly injecting enterprise Intel networking drivers, this image is prepped to be copied to a PXE boot server to rescue diverse bare-metal hardware.

## Real-World Scenarios

**Enabling iSCSI Root Booting**

```bash
# Inside /etc/dracut.conf.d/iscsi.conf:
# add_dracutmodules+=" network iscsi "
dracut -f
```

> In an enterprise blade-server environment, the servers lack physical hard drives; they boot from an iSCSI SAN. An administrator configures `dracut` to explicitly include the `network` and `iscsi` dracut modules. During generation, `dracut` injects the DHCP clients and iSCSI initiator binaries into the image, allowing the bootloader to connect to the network and attach the remote SAN volume before mounting it as `/`.

**Shrinking Cloud Images**

```bash
# Inside /etc/dracut.conf.d/slim.conf:
# omit_dracutmodules+=" network nfs multipath fcoe iscsi "
dracut -f
```

> When building minimal golden AMIs for AWS EC2, massive monolithic generic initramfs images bloat boot times and consume valuable RAM. Platform engineers explicitly configure `dracut` to omit complex enterprise storage modules (like Fibre Channel and Multipath), stripping the initramfs down to bare essentials for rapid cloud scaling.

## When should it NOT be used?

- **Ubuntu / Debian Systems:** **Do not use `dracut` on APT-based systems natively.** While theoretically possible to install, the Debian ecosystem strictly relies on `initramfs-tools` (`update-initramfs`). Mixing paradigms will break `apt dist-upgrade` kernel hooks.
- **Inspecting Image Contents:** **`dracut` builds images; it does not read them.** If you need to verify whether the `virtio_blk` module was successfully injected into `/boot/initramfs-5.14.img`, you must use its companion introspection tool: `lsinitrd /boot/initramfs-5.14.img | grep virtio`.

## Alternatives

- **`mkinitcpio`:** **Best for Arch Linux.** Relies on static, sequential bash hooks rather than `dracut`'s complex systemd/udev event-driven architecture, making it simpler to debug but less flexible for dynamic enterprise storage routing.
- **`update-initramfs`:** **Best for Debian/Ubuntu.** The canonical tool for generating boot images in the `apt` ecosystem.
- **`dracut-ng`:** **The modern fork.** A recent fork of the codebase aimed at modernizing and optimizing `dracut` development.

## How it works internally

`dracut` operates heavily on modular Bash scripts located in `/usr/lib/dracut/modules.d/`. These modules contain `module-setup.sh` files that define dependencies (e.g., the `crypt` module declares it depends on the `systemd` module).

When `dracut -f` is executed, it establishes a temporary build directory. It resolves the dependency tree of requested dracut modules. For each module, it executes `install()` functions.

These functions leverage tools like `ldd` to resolve the shared library dependencies of required binaries (like `lvm` or `systemd-cryptsetup`). It copies the binary and its `.so` libraries into the temporary directory to perfectly replicate a chrootable filesystem hierarchy. It invokes `depmod` on a customized subset of kernel drivers in `/lib/modules` to generate a boot-specific `modules.dep`.

If running in `-H` (Host-Only) mode, `dracut` scans the current `/sys` and `/proc` filesystems to determine exactly which disk topology (LVM, LUKS, RAID) and physical hardware the machine is currently running on. It writes specific `.conf` files into the initramfs instructing `udev` to only look for those specific UUIDs during boot.

Finally, the temporary directory is packaged using `cpio` and compressed (usually via `gzip` or `zstd`) into the final binary image deployed to `/boot`.

## Performance Notes

- **The Cost of `No-Hostonly`:** Generating an image without host-only optimizations (`-N`) forces `dracut` to inject the `.ko` driver files for almost every supported piece of Linux hardware. This drastically inflates generation time (due to compression CPU overhead) and results in images exceeding 100MB, slowing down the bootloader (GRUB) transfer time into RAM.
- **Zstd Compression:** By default on RHEL 9 and Fedora, `dracut` uses `zstd` compression. If modifying configuration files to force `xz` for smaller file sizes, the administrator trades a slight disk space saving for a severe penalty in boot-time decompression CPU cycles.

## Security Notes

- **FIPS Mode and Module Signing:** In highly secure environments (like RHEL configured with FIPS 140-2 compliance), `dracut` must run specialized FIPS modules. It injects cryptography self-test binaries (like `fipscheck`) into the initramfs. If the initramfs is altered or tampered with by an attacker, the kernel will halt the boot sequence immediately upon validating the cryptographic hashes.
- **Network-Bound Disk Encryption:** `dracut` natively supports the `clevis` and `tang` framework. It can embed networking drivers and a cryptographic pin into the initramfs, allowing a server to automatically unlock its LUKS-encrypted root drive over the network at boot, provided it is physically connected to the secure corporate LAN, eliminating the need to type passwords manually in the datacenter.

## Common Mistakes

- **Forgetting the `-f` (Force) flag**
  - _Mistake:_ Modifying `/etc/dracut.conf` and running `dracut`. The command exits immediately and the boot behavior doesn't change.
  - _Why:_ `dracut` acts defensively. If an initramfs for the target kernel already exists in `/boot`, it refuses to overwrite it to prevent rendering a working system unbootable. You must explicitly pass `-f` to commit the changes.
- **Confusing Dracut Modules with Kernel Modules**
  - _Mistake:_ Using `--add-drivers "network"` expecting to get networking support.
  - _Why:_ "network" is a _dracut module_ (a collection of bash scripts and systemd targets), not a _kernel module_ (a `.ko` file like `e1000e`). To add a dracut module, use `-m "network"`. To add a specific kernel `.ko` driver, use `--add-drivers "e1000e"`.
- **Breaking the Rescue Kernel**
  - _Mistake:_ Running `dracut -f` and accidentally overwriting the `initramfs-0-rescue.img`.
  - _Why:_ The rescue image is deliberately generated without host-only optimizations so it can boot under duress. Overwriting it with a highly specialized, fragile host-only image defeats the purpose of the rescue entry in GRUB.

## Best Practices

- **Use Configuration Drop-ins:** Never edit `/etc/dracut.conf` directly. Create atomic, application-specific configuration files in `/etc/dracut.conf.d/` (e.g., `/etc/dracut.conf.d/10-multipath.conf`). This ensures package updates do not overwrite your customizations.
- **Always backup the known-good image:** Before forcing a regeneration on a remote server, run `cp /boot/initramfs-$(uname -r).img /boot/initramfs-$(uname -r).img.bak`. If the new `dracut` configuration causes a kernel panic, you can instruct GRUB to boot the `.bak` image to easily recover the system.

## Interview Questions

**Q: Explain how `dracut` fundamentally differs in its boot execution philosophy compared to older monolithic initial ramdisk scripts.**
**A:** Older scripts relied on hardcoded, sequential bash commands to load drivers and mount volumes. `dracut` is fundamentally event-driven. The `dracut` initramfs boots into an isolated `systemd` environment and relies on `udev`. As `udev` detects hardware dynamically on the motherboard, it emits events that trigger specific systemd targets (like `initrd-root-device.target`). This asynchronous, dynamic discovery makes `dracut` highly resilient to hardware changes, like swapping the physical SATA port a hard drive is plugged into.

**Q: A cloud engineer is creating a customized "Golden Image" (AMI) that will be cloned and booted across thousands of distinct AWS EC2 instances utilizing vastly different underlying virtualization hardware (Nitro vs Xen). When they run `dracut` to finalize the image, why must they explicitly pass the `-N` (or `--no-hostonly`) flag?**
**A:** By default, `dracut` attempts to generate a "Host-Only" image. It inspects the _current_ machine building the image and exclusively bundles the drivers required for that specific hardware. If deployed to a different EC2 instance type with a different NVMe controller or network adapter, the image will kernel panic because it lacks those drivers. Passing `-N` forces `dracut` to build a generic, monolithic image containing drivers for _all_ supported hardware architectures, ensuring the AMI is universally portable.

## Practice Problems

**Problem:** You have added a new custom rule to `/etc/dracut.conf.d/custom.conf` and need to apply it. Write the command to forcefully overwrite the current active kernel's initramfs image.
**Hint:** Use the flag that bypasses the file-existence safety check.
**Solution:**

```bash
dracut -f
```

**Problem:** You are compiling a custom, offline boot image. Write the command to generate an image saved exactly at `/tmp/custom-boot.img`, specifically tailored for the kernel version `5.15.0-generic`, explicitly adding the kernel module driver `ixgbe` to the image.
**Hint:** You need positional arguments for the output file and version, along with the flag to inject a specific kernel driver.
**Solution:**

```bash
dracut --add-drivers "ixgbe" -f /tmp/custom-boot.img 5.15.0-generic
```

## References

- [dracut(8) - Linux man page](https://linux.die.net/man/8/dracut)
- [dracut.conf(5) - Configuration file for dracut](https://linux.die.net/man/5/dracut.conf)
- [Fedora Documentation: Dracut](https://docs.fedoraproject.org/en-US/project/dracut/)
