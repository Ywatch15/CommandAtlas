---
slug: syscall-device-control
name: Device Control (ioctl)
aliases: ['sys_ioctl', 'device communication']
category: system-calls
tags: [c, linux, kernel, hardware, drivers, sysadmin]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'configure device driver in c'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`ioctl()` (Input/Output Control) is the "catch-all" system call for device and filesystem manipulation in Linux and Unix. While standard system calls like `read()` and `write()` transport raw byte streams of data, `ioctl()` acts as the out-of-band control channel. It allows user-space applications to send proprietary, structured, hardware-specific commands directly to underlying kernel device drivers—enabling tasks like configuring serial port baud rates, querying terminal geometries, manipulating graphical DRM memory buffers, or ejecting a physical CD-ROM tray.

## Why does it exist?

The Unix philosophy dictates that "everything is a file." A keyboard, a hard drive, a sound card, and a printer are all exposed as file descriptors (e.g., `/dev/sda`). However, interacting with complex hardware requires operations that fall completely outside the paradigm of simple byte streaming. You cannot `write()` to a terminal file descriptor to alter its resolution; writing simply prints text to the screen. `ioctl()` exists to break the rigidity of the VFS (Virtual File System) interface. It provides an extensible, multiplexed back-door, allowing kernel driver developers to expose hundreds of specialized configuration endpoints through a single, unified system call using custom command codes.

## Syntax

```c
#include <sys/ioctl.h>

int ioctl(int fd, unsigned long request, ... /* void *arg */);
```

## Flags

_Note: There are thousands of `ioctl` request codes, as every device driver defines its own. The `request` integers are generated using complex C macros (`_IO`, `_IOR`, `_IOW`, `_IOWR`) that encode the payload size and read/write direction directly into the integer itself._

| Request Macro / Flag   | Description                                                                                                                        | Example                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `TIOCGWINSZ`           | Terminal I/O Control, Get Window Size. Populates a `winsize` struct with the current terminal rows and columns.                    | `ioctl(STDOUT_FILENO, TIOCGWINSZ, &w);`     |
| `FIOCLEX`              | File I/O Control, Close on Exec. Sets the close-on-exec flag for the file descriptor, securing it from leaking to child processes. | `ioctl(fd, FIOCLEX);`                       |
| `FIONBIO`              | File I/O Non-Blocking I/O. Accepts an integer pointer to toggle the blocking state of a socket or file descriptor.                 | `ioctl(sockfd, FIONBIO, &on);`              |
| `CDROMEJECT`           | Hardware-specific. Instructs the CD-ROM block device driver to physically open the disc tray.                                      | `ioctl(cd_fd, CDROMEJECT, 0);`              |
| `SIOCGIFHWADDR`        | Socket I/O Control. Queries the networking subsystem to retrieve the physical MAC address of a specified network interface.        | `ioctl(sock, SIOCGIFHWADDR, &ifr);`         |
| `_IO(type, nr)`        | Macro to create a request code for a command that takes no arguments (no data payload).                                            | `#define MY_DEV_RESET _IO('M', 1)`          |
| `_IOW(type, nr, data)` | Macro to create a request code indicating user-space will WRITE data _to_ the kernel driver.                                       | `#define MY_DEV_SET_RATE _IOW('M', 2, int)` |
| `_IOR(type, nr, data)` | Macro to create a request code indicating user-space will READ data _from_ the kernel driver.                                      | `#define MY_DEV_GET_TEMP _IOR('M', 3, int)` |

## Examples

```c
#include <sys/ioctl.h>
#include <unistd.h>
#include <stdio.h>

struct winsize w;
if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &w) != -1) {
    printf("Terminal geometry: %d rows by %d columns\n", w.ws_row, w.ws_col);
}
```

> Discovering terminal layouts. CLI applications like `vim` or `top` use the `TIOCGWINSZ` ioctl against the standard output file descriptor to determine the exact size of the user's terminal window, allowing them to render ncurses UIs cleanly without text wrapping.

```c
#include <sys/ioctl.h>
#include <linux/cdrom.h>
#include <fcntl.h>

int fd = open("/dev/cdrom", O_RDONLY | O_NONBLOCK);
if (fd != -1) {
    ioctl(fd, CDROMEJECT, 0); // Issues physical hardware command
    close(fd);
}
```

> Direct physical hardware manipulation. The `open()` call establishes a handle to the block device. The `ioctl()` call bypasses reading the ISO data on the disk entirely; instead, it sends a standardized control code that the kernel's CD-ROM driver translates into the SCSI/ATAPI command necessary to physically eject the hardware tray.

```c
int on = 1;
if (ioctl(sockfd, FIONBIO, (char *)&on) < 0) {
    perror("ioctl FIONBIO failed");
}
```

> Modifying socket state. Before the adoption of `fcntl()` for socket flags, `ioctl` using `FIONBIO` was the primary method to switch a TCP/IP socket into non-blocking mode, ensuring subsequent `recv()` calls would return `EAGAIN` rather than freezing the thread.

```c
// Extracting MAC address (eth0)
struct ifreq ifr;
strcpy(ifr.ifr_name, "eth0");
int s = socket(AF_INET, SOCK_DGRAM, 0);
if (ioctl(s, SIOCGIFHWADDR, &ifr) == 0) {
    unsigned char *mac = (unsigned char *)ifr.ifr_hwaddr.sa_data;
    printf("MAC: %02x:%02x:%02x:%02x:%02x:%02x\n", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}
```

> Interrogating network subsystems. Because network interfaces (like `eth0`) don't exist as standard files in `/dev`, user-space programs open a dummy UDP socket and issue the `SIOCGIFHWADDR` ioctl. The kernel routes this control message to the network driver, which responds by populating the `ifreq` struct with the physical hardware address.

## Real-World Scenarios

**ALSA Audio Engineering**

> Linux audio applications (like `pulseaudio` or DAW software) heavily utilize `ioctl` on `/dev/snd/pcmC0D0p`. To play audio, they don't just dump WAV bytes into the file descriptor. They use dozens of `ioctl` calls to instruct the sound card hardware regarding sample rates (e.g., 44.1kHz), channel mapping (Stereo/5.1), and buffer sizing prior to initiating the actual I/O stream.

**DRM/KMS Graphics Rendering**

> Modern display servers (Wayland, Xorg) and 3D games bypass outdated framebuffer drawing. They open `/dev/dri/card0` and use the Direct Rendering Manager (DRM) `ioctl` endpoints to allocate raw GPU memory buffers, map textures, and instruct the graphics card to flip the display buffer to the monitor precisely during the V-Blank hardware interrupt.

## When should it NOT be used?

- **For Standard File Descriptors:** **Do not use `ioctl()` for regular text files.** If a file descriptor points to an `ext4` or `xfs` text file, there is no hardware driver to control. Standard `ioctl` calls will likely fail with `ENOTTY` (Inappropriate ioctl for device). Use `fcntl()` for standard file manipulation (like file locking).
- **As a New Kernel API:** **Kernel developers actively discourage implementing new `ioctl` interfaces.** `ioctl` causes massive technical debt. Because its 3rd argument is a raw `void *` pointer, it circumvents C type-safety entirely, leading to massive memory corruption bugs and nightmare 32-bit to 64-bit translation issues.

## Alternatives

- **`sysfs` (`/sys/`):** **The modern standard.** Instead of sending a hidden hex code via `ioctl`, modern kernel drivers expose hardware states as virtual files. E.g., altering a fan speed is done elegantly by writing a string to `/sys/class/hwmon/hwmon0/pwm1` using standard `write()` calls, heavily improving scriptability and type safety.
- **Netlink Sockets:** **Best for Networking.** A modern, structured socket-based protocol used to configure network interfaces, QoS, and IP routing, completely replacing the legacy `SIOC*` networking `ioctl` families.
- **`fcntl()`:** **Best for descriptor control.** The strict POSIX standard for altering file descriptor behavior (like setting `O_NONBLOCK` or duplicating FDs), preferred heavily over legacy equivalent `ioctl` commands.

## How it works internally

`ioctl()` breaks the standard system call boundaries.

When user-space calls `ioctl(fd, request, arg)`, the Linux kernel's Virtual File System (VFS) receives the call. The VFS extracts the `struct file` object associated with the file descriptor. Inside this object is a pointer to the `file_operations` struct (`f_op`), which holds the function pointers defined by the specific kernel driver managing the device.

The VFS blindly hands the `request` integer and the `arg` memory pointer directly to the driver's custom `unlocked_ioctl` or `compat_ioctl` function.

The magic of `ioctl` relies on the `request` integer. This 32-bit integer is structurally encoded using bitwise shifts (via the `_IOR`, `_IOW` macros). It contains:

1.  **Direction:** (2 bits) Whether data is being read from the kernel, written to the kernel, or both.
2.  **Size:** (14 bits) The exact byte size of the struct pointed to by the `void *` argument.
3.  **Type/Magic:** (8 bits) A unique character (like 'M' or 'V') identifying the specific driver, preventing collisions if an ioctl is sent to the wrong device.
4.  **Number:** (8 bits) The sequential command ID.

The kernel driver parses this integer. If the direction is `WRITE` (`_IOW`), the driver uses `copy_from_user()` to safely fetch the C struct from the user's RAM into kernel space. It applies the hardware configuration (e.g., altering a PCIe register on a graphics card). If the direction is `READ` (`_IOR`), it fetches data from the hardware and uses `copy_to_user()` to push the payload back into the application's RAM pointer, before returning the status code.

## Performance Notes

- **Serialization Bottleneck:** While the system call itself is fast, many hardware `ioctl` endpoints must synchronize with slow physical hardware buses (like I2C or PCIe). Sending an `ioctl` to alter a device state can stall the execution thread for several milliseconds while the driver waits for a hardware ACK.

## Security Notes

- **Privilege Escalation Vector:** `ioctl()` is historically the most dangerous system call in the Linux kernel regarding security. Because the third argument is a completely untyped, unsanitized `void *` pointer, a single missing bounds check or validation in a third-party kernel driver's `ioctl` handler allows malicious user-space applications to execute Arbitrary Read/Write operations inside ring-0 kernel memory, leading to instant root compromises.
- **Device Node Permissions:** The primary security boundary for `ioctl` is the standard Linux filesystem permission of the `/dev/*` node. If `/dev/dri/card0` is only writable by the `video` group, unauthorized users are mathematically blocked from exploiting the graphical `ioctl` handlers.

## Common Mistakes

- **The 32-bit / 64-bit Compat Trap**
  - _Mistake:_ Using arbitrary pointers or structures containing `long` integers inside custom `ioctl` calls.
  - _Why:_ A 32-bit application running on a 64-bit kernel passes a 32-bit memory pointer. The 64-bit kernel driver attempts to read it expecting a 64-bit layout. The memory misaligns, corrupting the payload or crashing the driver. `ioctl` structures must use strictly sized types (e.g., `uint32_t`, `__u64`) to ensure perfect memory alignment across architectures.
- **Ignoring the ENOTTY Error**
  - _Mistake:_ Using an `ioctl` code meant for a terminal (`TIOCGWINSZ`) on a file descriptor that points to a regular text file, and confusing the error code.
  - _Why:_ If the underlying driver does not support the requested `ioctl` code, or there is no driver at all (like a standard file), the kernel returns the cryptic `ENOTTY` error. Historically, this meant "Not a typewriter" (as `ioctl` was heavily used for TTY terminals), but practically it just means "Inappropriate ioctl for device".

## Best Practices

- **Always use the designated macros:** When writing driver code or C applications, never hardcode integer values like `ioctl(fd, 0x5413, &w)`. Always use the system headers: `ioctl(fd, TIOCGWINSZ, &w)`. The macros ensure the correct bitwise sizes are transmitted, protecting against cross-compilation errors.
- **Verify the Driver Type:** Before blindly issuing `ioctl` commands, ensure you are talking to the correct device by utilizing the magic number checks defined by the driver, mitigating the risk of corrupting an unintended piece of hardware.

## Interview Questions

**Q: You see a piece of C code executing `ioctl(fd, FIONBIO, &on)`. You decide to replace it with `fcntl(fd, F_SETFL, O_NONBLOCK)`. Explain the architectural difference and why the latter is heavily preferred.**
**A:** `ioctl` using `FIONBIO` is the legacy, BSD-style method of setting a socket or file descriptor to non-blocking mode by communicating directly with the socket driver. `fcntl()` is the strictly defined POSIX standard for altering file descriptor status flags at the Virtual File System (VFS) layer. `fcntl` is heavily preferred because it is universally portable, explicitly supported by standard libraries across all Unix systems, and avoids the untyped, driver-specific nature of `ioctl`.

**Q: A vulnerability researcher discovers a buffer overflow in a kernel driver. They notice the driver implements a custom `ioctl` endpoint where the third argument accepts a pointer to a struct. Why are `ioctl` handlers such common targets for kernel exploitation?**
**A:** The signature for the third argument of `ioctl` is `void *`, meaning it completely bypasses the C compiler's type-safety checks. It is entirely up to the kernel driver developer to manually validate the size, bounds, and permissions of the memory residing at that user-space pointer before utilizing `copy_from_user()`. If the developer fails to strictly validate the payload size against internal kernel buffers, an attacker can pass a massive, maliciously crafted struct pointer via `ioctl`, overflowing the kernel heap or stack and achieving arbitrary code execution.

## Practice Problems

**Problem:** You are writing a CLI tool and need to know the width of the terminal to format a table. Write a C `if` statement calling `ioctl` against the standard output file descriptor to retrieve the terminal geometry into a pre-defined `struct winsize w`.
**Hint:** Use the predefined terminal geometry macro, and remember the file descriptor integer for `stdout`.
**Solution:**

```c
if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &w) != -1) {
    // w.ws_col contains the width
}
```

**Problem:** You have a file descriptor `cd_fd` pointing to the `/dev/cdrom` block device. Write a single C statement using `ioctl` to send the command to physically eject the hardware tray. Assume the command accepts an integer argument of `0`.
**Hint:** Use the specific hardware macro for CD-ROM ejection.
**Solution:**

```c
ioctl(cd_fd, CDROMEJECT, 0);
```

## References

- [ioctl(2) - Linux manual page](https://man7.org/linux/man-pages/man2/ioctl.2.html)
- [Linux Device Drivers: ioctl](https://lwn.net/Kernel/LDD3/ch06.html)
