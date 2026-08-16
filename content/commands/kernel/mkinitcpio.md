---
slug: mkinitcpio
name: mkinitcpio
aliases: []
category: kernel
tags: [linux, arch-linux, boot, initramfs, kernel, systemd]
difficulty: advanced
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'create initial ramdisk'
  - 'generate initramfs arch linux'
  - 'rebuild arch boot image'
  - 'add module to initramfs'
  - 'update mkinitcpio hooks'
relatedCommands: [depmod, dracut]
alternatives: [dracut]
status: draft
---

## What is it?

`mkinitcpio` is a highly modular Bash script and framework primarily utilized by Arch Linux (and its derivatives) to generate an initial ramdisk environment (initramfs). It reads configuration directives from `/etc/mkinitcpio.conf` to gather essential kernel modules, dynamic libraries, execution hooks, and user-space binaries (like `busybox` or `systemd`), bundling them into a compressed `cpio` archive. This image is loaded into RAM by the bootloader, providing the Linux kernel with the necessary tools to mount the physical root filesystem during the early boot phase.

## Why does it exist?

The Linux kernel is designed to be minimal. To boot a system, the kernel must mount the root (`/`) filesystem. However, the root filesystem might reside on a complex storage array—such as an encrypted LUKS partition, an LVM volume, an mdadm RAID array, or an iSCSI network target. The drivers and decryption binaries required to read these filesystems are stored _inside_ the filesystem itself, creating a chicken-and-egg problem. `mkinitcpio` solves this by packaging the decryption keys, LVM binaries, and ext4/btrfs kernel modules into a standalone image. The bootloader injects this image directly into RAM, bridging the gap between hardware initialization and the handoff to the real root operating system.

## Syntax

```bash
mkinitcpio [options]
```

## Flags

| Flag                        | Description                                                                                                                           | Example                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `-p <preset>`, `--preset`   | Builds the initramfs image based on a specific preset defined in `/etc/mkinitcpio.d/` (e.g., `linux`, `linux-lts`).                   | `mkinitcpio -p linux`                          |
| `-P`, `--allpresets`        | Iterates through every preset file found in `/etc/mkinitcpio.d/` and generates all configured images. The most common update command. | `mkinitcpio -P`                                |
| `-k <version>`, `--kernel`  | Explicitly specifies the kernel version to generate the image for, overriding the active kernel detection.                            | `mkinitcpio -k 6.1.10-arch1-1`                 |
| `-g <path>`, `--generate`   | Generates a single initramfs image and saves it to the specified absolute path, ignoring presets.                                     | `mkinitcpio -g /boot/initramfs-custom.img`     |
| `-c <file>`, `--config`     | Uses an alternative configuration file instead of the default `/etc/mkinitcpio.conf`.                                                 | `mkinitcpio -c /etc/mkinitcpio-rescue.conf -P` |
| `-H <hook>`, `--hookhelp`   | Outputs the internal bash script logic and detailed help text for a specific build hook (e.g., `encrypt`, `lvm2`).                    | `mkinitcpio -H encrypt`                        |
| `-S <hooks>`, `--skiphooks` | A comma-separated list of hooks to skip during image generation, overriding the config file. Useful for debugging boot failures.      | `mkinitcpio -P -S fsck,autodetect`             |
| `-A <hooks>`, `--addhooks`  | A comma-separated list of additional hooks to execute during generation, appending them to the config file's array.                   | `mkinitcpio -p linux -A consolefont`           |
| `-v`, `--verbose`           | Outputs a detailed, verbose list of exactly which binaries, libraries, and kernel modules are being copied into the archive.          | `mkinitcpio -P -v`                             |
| `-L`, `--listhooks`         | Lists all available hooks currently installed on the system (located in `/usr/lib/initcpio/hooks/` and `/etc/initcpio/hooks/`).       | `mkinitcpio -L`                                |

## Examples

```bash
mkinitcpio -P
```

> The universal regeneration command on Arch Linux. Executed automatically via a pacman hook whenever a kernel package is updated. It reads all presets in `/etc/mkinitcpio.d/` and compiles both the standard (`initramfs-linux.img`) and fallback (`initramfs-linux-fallback.img`) archives.

```bash
mkinitcpio -p linux-lts
```

> Selectively regenerates the boot image specifically for the Long Term Support (LTS) kernel, ignoring the mainline kernel presets. This is useful when tweaking hardware drivers specifically targeting older, stable kernel paths.

```bash
mkinitcpio -k 6.5.0-arch1-1 -g /boot/initramfs-test.img
```

> A surgical compilation. It instructs the script to pull kernel modules specifically from `/lib/modules/6.5.0-arch1-1/` and outputs the resulting archive to a custom, non-standard path (`/boot/initramfs-test.img`) for testing alternative bootloader entries.

```bash
mkinitcpio -H lvm2
```

> Introspects the `lvm2` hook. It prints the exact `build()` and `run()` bash functions associated with the hook, allowing system administrators to see exactly which binaries (like `lvm`) and libraries are being injected into the ramdisk.

## Real-World Scenarios

**Enabling Full Disk Encryption (LUKS)**

```bash
# Edit /etc/mkinitcpio.conf
# Modify HOOKS=(base udev autodetect modconf block encrypt filesystems keyboard fsck)
mkinitcpio -P
```

> To enable root partition decryption at boot, an administrator edits the `mkinitcpio.conf` file, injecting the `keyboard` and `encrypt` hooks _before_ the `filesystems` hook. They then execute `mkinitcpio -P`. The script dynamically injects the `cryptsetup` binary and crypto-modules into the boot image, ensuring the kernel pauses and prompts the user for a passphrase to unlock the disk before attempting to mount it.

**Switching to a Systemd-based Initramfs**

```bash
# Edit /etc/mkinitcpio.conf
# Modify HOOKS=(systemd autodetect modconf block sd-encrypt filesystems)
mkinitcpio -P
```

> Modern Arch Linux environments increasingly replace the legacy `busybox` and `udev` hooks with a pure `systemd` early-boot environment. This dramatically accelerates boot times and unifies system logs from the initial boot sequence down to user-space using `journalctl`.

## When should it NOT be used?

- **On Non-Arch Linux Systems:** **`mkinitcpio` is heavily coupled with Arch Linux architecture.** While technically portable, Fedora/RHEL strictly use `dracut`, and Debian/Ubuntu use `update-initramfs`. Attempting to use `mkinitcpio` on Ubuntu will fail due to differing package layouts and hook dependency structures.
- **Direct Modification of Images:** **Do not use this to edit an existing image.** `mkinitcpio` builds images deterministically from scratch. If you need to view the contents of an existing `.img` file, you must use the companion tool `lsinitcpio` or standard `bsdtar`.

## Alternatives

- **`dracut`:** **Best for event-driven environments.** Developed by Red Hat, dracut is highly modular and relies dynamically on `udev` events rather than static sequential hooks. (Arch Linux supports migrating to dracut).
- **`booster`:** **Best for absolute performance.** A modern, statically compiled initramfs generator written in Go. It is significantly faster at generation and boots the kernel faster than the Bash-based `mkinitcpio`, though it lacks the extensive hook ecosystem.
- **`update-initramfs`:** **The Debian/Ubuntu standard.** Functionally serves the exact same purpose within the `apt` ecosystem.

## How it works internally

`mkinitcpio` is fundamentally a master Bash script that orchestrates a series of smaller Bash scripts (hooks).

When you execute `mkinitcpio -P`, it reads the `HOOKS=()` array defined in `/etc/mkinitcpio.conf`.

1.  **Preparation:** It creates a temporary directory in `/tmp`.
2.  **Build Phase:** For each defined hook (e.g., `base`, `udev`, `ext4`), it locates the corresponding build script in `/usr/lib/initcpio/install/`. It executes the `build()` function within these scripts. These functions use tools like `cp` and `ldd` to copy specific executables (like `fsck` or `cryptsetup`), resolve their shared library dependencies (`.so` files), and copy required kernel modules from `/lib/modules/` into the temporary `/tmp` directory.
3.  **Run Phase Scripts:** It copies the runtime scripts (the `run()` functions) into the temporary directory. These are the actual bash scripts executed inside the ramdisk during boot to assemble the environment.
4.  **Archiving:** Once the `/tmp` directory structure mimics a miniature root filesystem, `mkinitcpio` leverages `bsdtar` to pack the directory into a `cpio` archive.
5.  **Compression:** It pipes the `cpio` archive through a compressor (commonly `zstd`, `gzip`, or `lz4` as defined in the config file) and writes the final binary blob to `/boot/initramfs-linux.img`.

## Performance Notes

- **Autodetect Optimization:** The `autodetect` hook is critical for performance. Without it, `mkinitcpio` creates a "fallback" image containing drivers for _every possible piece of hardware_ (SATA, SCSI, virtio, multiple file systems), resulting in a massive, slow-booting 100MB+ image. When `autodetect` is present, the script parses `/sys` to discover the exact hardware running on the host machine and creates a highly optimized, stripped-down 15MB image containing exclusively the drivers required to boot that specific machine.
- **Compression Algorithms:** Changing the `COMPRESSION` variable in the config file alters generation time and boot time. `zstd` is heavily preferred on modern systems as it decompresses inside the kernel almost instantaneously, whereas `xz` provides smaller files but consumes massive CPU cycles during early boot.

## Security Notes

- **Cleartext Secrets:** Some configurations (like mounting root via a static keyfile stored on a USB drive, or remote SSH unlocking via `dropbear` inside the initramfs) require embedding sensitive key material or private keys directly into the `cpio` archive. By default, `/boot` is unencrypted and world-readable. Any secrets baked into the initramfs image are entirely compromised if an attacker gains physical access to the boot partition.

## Common Mistakes

- **Missing `MODULES` for specialized storage**
  - _Mistake:_ Formatting the root partition as `btrfs`, running `mkinitcpio`, and encountering a "Root device mounted successfully, but /sbin/init does not exist" kernel panic.
  - _Why:_ The `autodetect` hook sometimes fails to grab specific filesystem modules or hardware drivers (like `vmd` for specific NVMe controllers). The administrator must explicitly add the missing module to the `MODULES=(btrfs)` array in `/etc/mkinitcpio.conf` and regenerate the image.
- **Incorrect Hook Order**
  - _Mistake:_ Placing the `encrypt` hook _after_ the `filesystems` hook in the configuration.
  - _Why:_ Hook execution order is strict. The kernel cannot mount the filesystem until the encrypted block device is unlocked. The `encrypt` hook must mathematically precede `filesystems` and `fsck`.

## Best Practices

- **Maintain the Fallback Image:** When compiling custom kernels, always configure a fallback preset (which removes the `autodetect` hook). If you swap out a motherboard or migrate a VM to a different hypervisor type, the heavily optimized primary image will fail to boot due to missing drivers, but the bloated fallback image will save the system.
- **Leverage Systemd hooks:** Transitioning from the `base` and `udev` hooks to the unified `systemd` hook drastically improves debugging. If an early boot process fails, the `systemd` initramfs allows you to boot into an emergency shell and use familiar tools like `journalctl` to diagnose exactly why the root partition failed to mount.

## Interview Questions

**Q: You just installed Arch Linux on a laptop with an NVMe drive encrypted via LUKS. You reboot, but the system drops into a kernel panic stating "cannot find root device". What file did you forget to configure, and what command did you forget to run?**
**A:** You forgot to edit `/etc/mkinitcpio.conf` to add the `encrypt` (or `sd-encrypt`) hook to the `HOOKS` array, and subsequently forgot to execute `mkinitcpio -P`. Without this step, the `cryptsetup` binary and decryption logic were never embedded into the initial ramdisk, rendering the kernel completely incapable of prompting for the password and unlocking the root filesystem.

**Q: Explain the role of the `autodetect` hook in `mkinitcpio` and why it is intentionally omitted from the "fallback" image preset.**
**A:** The `autodetect` hook scans the currently running system's hardware and loaded kernel modules. It acts as a strict filter, instructing `mkinitcpio` to only bundle the exact drivers necessary for the current machine, creating a highly optimized, fast-booting image. It is omitted from the fallback image so that `mkinitcpio` packages _all_ available storage and block drivers. This ensures the fallback image can boot the OS even if the physical hard drive is moved to a completely different computer with entirely different hardware.

## Practice Problems

**Problem:** You have manually tweaked `/etc/mkinitcpio.conf` and want to rebuild the initial ramdisk specifically for the `linux-lts` preset. Write the command to do this without rebuilding the images for other installed kernels.
**Hint:** Use the flag that targets a specific preset file.
**Solution:**

```bash
mkinitcpio -p linux-lts
```

**Problem:** You are debugging a boot issue. You want to execute a dry-run style command to list all the internal scripts and binaries that the `fsck` hook pulls into the image, without actually generating a new image.
**Hint:** Use the hook help/introspection flag.
**Solution:**

```bash
mkinitcpio -H fsck
```

## References

- [mkinitcpio(8) - Arch manual pages](https://man.archlinux.org/man/mkinitcpio.8)
- [Arch Wiki: mkinitcpio](https://wiki.archlinux.org/title/mkinitcpio)
