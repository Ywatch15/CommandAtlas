---
slug: dd
name: dd
aliases: [disk dump, data duplicator]
category: unix
tags: [linux, disk, disk-cloning, raw-data, iso, backup]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'create bootable usb drive linux dd'
  - 'backup hard drive raw image dd'
  - 'create zero filled file dd'
  - 'clone disk partition to another disk'
  - 'backup mbr boot sector'
relatedCommands: [cat, fdisk, lsblk, mkfs]
alternatives: [cat]
status: draft
---

## What is it?

`dd` is an ancient, low-level data duplication and conversion utility. Unlike standard file-copying tools like `cp`, `dd` bypasses filesystem abstractions (like files and directories), interacting directly with raw block devices and character streams. It meticulously reads and writes data chunk-by-chunk based on exact byte counts, making it the definitive tool for bit-for-bit disk cloning, creating bootable USB media, wiping partitions with cryptographic zeros, and backing up Master Boot Records (MBRs).

## Why does it exist?

Operating systems require specialized tools to handle raw hardware manipulation. If an administrator needs to clone a failing hard drive, `cp` will fail the moment it hits an unreadable sector, and it cannot copy partition tables or bootloaders. `dd` exists to provide absolute, uncompromising control over data streams. Developed in the 1970s (with a syntax famously modeled after IBM's JCL rather than standard Unix dashed-flags), it forces the kernel to copy exactly the bytes requested, padding errors with zeros if instructed, and performing low-level conversions (like ASCII to EBCDIC), cementing its role as the ultimate "hammer" in the Unix storage toolbox.

## Syntax

```bash
dd [operand=value]...
```

## Flags

_Note: `dd` uses a unique `key=value` syntax, completely eschewing traditional POSIX `-f` flags._

| Operand        | Description                                                                                                                                 | Example                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `if=FILE`      | Input File. The source to read from. Can be a standard file or a raw block device (e.g., `/dev/sda`).                                       | `dd if=/dev/urandom`   |
| `of=FILE`      | Output File. The destination to write to. **Warning: Will instantly overwrite data without prompting.**                                     | `dd of=/dev/sdb`       |
| `bs=BYTES`     | Block Size. Sets both the input and output buffer sizes simultaneously. Essential for performance.                                          | `dd bs=4M`             |
| `count=N`      | Copies exactly `N` blocks of `bs` size, then stops. If omitted, `dd` runs until the input stream is completely exhausted.                   | `dd count=1`           |
| `skip=N`       | Skips `N` blocks of `bs` size from the _Input File_ before beginning the read operation.                                                    | `dd skip=10`           |
| `seek=N`       | Skips `N` blocks of `bs` size on the _Output File_ before beginning the write operation. Crucial for appending.                             | `dd seek=2048`         |
| `status=LEVEL` | Controls verbosity. `status=progress` displays a live transfer rate and byte counter, solving the historical "silent hang" issue.           | `dd status=progress`   |
| `conv=CONVS`   | Applies conversions. Common values: `noerror` (continue past read errors), `sync` (pad bad blocks with nulls), `fdatasync` (flush to disk). | `dd conv=noerror,sync` |
| `iflag=FLAGS`  | Modifies input behavior. E.g., `direct` (bypasses OS RAM cache for direct hardware reads), `fullblock` (ensures exact block sizes).         | `dd iflag=direct`      |
| `oflag=FLAGS`  | Modifies output behavior. E.g., `direct` (bypasses RAM cache for benchmark accuracy), `append` (appends rather than overwrites).            | `dd oflag=direct`      |

## Examples

```bash
dd if=ubuntu-22.04.iso of=/dev/sdc bs=4M status=progress
```

> The canonical bootable USB creator. Reads the Ubuntu ISO file and blasts the raw bytes directly onto the raw block device `/dev/sdc` (the USB drive). The `bs=4M` optimizes the transfer speed, and `status=progress` provides a visual progress bar. _(Note: Writing to `/dev/sdc1` is a mistake; you must target the whole disk `sdc` to write the bootloader)._

```bash
dd if=/dev/sda of=/mnt/backup/sda_image.img bs=64K conv=noerror,sync
```

> Forensic disk imaging and recovery. Clones an entire failing hard drive (`sda`) to an image file. If the dying drive throws an I/O read error, `conv=noerror` prevents `dd` from aborting the clone, and `sync` pads the unreadable sector with zeros to maintain the mathematical structural alignment of the disk image.

```bash
dd if=/dev/urandom of=/dev/nvme0n1 bs=1M status=progress
```

> Cryptographic disk wiping. By reading from the kernel's infinite random noise generator (`/dev/urandom`) and writing directly to the NVMe drive, every single physical block on the SSD is aggressively overwritten with randomized data, rendering old filesystem data mathematically unrecoverable.

```bash
dd if=/dev/sda of=mbr_backup.bin bs=512 count=1
```

> Surgical bootloader extraction. Reads exactly one block of 512 bytes (`count=1`) from the absolute beginning of the hard drive (`sda`). This perfectly extracts the legacy Master Boot Record (MBR) and the primary partition table for safe keeping.

```bash
dd if=/dev/zero of=testfile bs=1G count=1 oflag=direct
```

> Synthetic I/O benchmarking. Generates a 1 Gigabyte file filled with null bytes. By using `oflag=direct`, it forces the Linux kernel to bypass the Page Cache in RAM and write directly to the physical storage hardware, providing a highly accurate measurement of the disk's true sustained write speed.

## Real-World Scenarios

**Creating a Swap File**

```bash
dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

> When a cloud VM runs out of memory and lacks a dedicated swap partition, administrators use `dd` to rapidly allocate a massive, contiguous block of null bytes (4GB) on the root filesystem. They then format this rigid block file as swap space, saving the server from Out-Of-Memory kernel panics.

**Expanding an ext4 Filesystem Image (Virtualization)**

```bash
dd if=/dev/zero bs=1M count=1024 >> vm_disk.img
# or more safely: dd if=/dev/zero of=vm_disk.img bs=1M count=1024 seek=5000 (if original is 5000MB)
e2fsck -f vm_disk.img
resize2fs vm_disk.img
```

> When a virtual machine runs out of space, the raw disk image (`.img`) must be expanded. `dd` is used to append exactly 1024 Megabytes of zeroes to the absolute end of the file, physically extending the block device boundary, allowing `resize2fs` to expand the filesystem into the newly synthesized space.

## When should it NOT be used?

- **Copying files and directories:** **Do not use `dd` to copy `/var/www` to a backup drive.** `dd` is entirely blind to filesystems. It cannot traverse directories. Use `cp -a` or `rsync`.
- **Cloning between different sized disks:** **Do not use `dd` to clone a 1TB drive to a 500GB SSD.** `dd` performs a rigid, sector-by-sector copy. It will blindly copy the empty space of the 1TB drive until it hits the physical end of the 500GB SSD, violently truncating the partition table and corrupting the filesystem. You must shrink the partitions using `gparted` before cloning, or use a file-level tool like `Clonezilla`.

## Alternatives

- **`pv` (Pipe Viewer):** **Best for data streaming.** `cat file.img | pv > /dev/sdb` performs the exact same bit-for-bit cloning as `dd`, but natively includes a beautiful, highly detailed progress bar, ETA, and throughput monitor.
- **`dcfldd` / `dc3dd`:** **Best for forensics.** Enhanced forks of `dd` originally developed by the Department of Defense. They natively calculate MD5/SHA256 hashes on-the-fly as the disk is imaged, maintaining a chain of custody for legal forensics.
- **`partclone`:** **Best for smart imaging.** Unlike `dd` which copies millions of gigabytes of empty zeros, `partclone` is filesystem-aware. It only copies blocks that actually contain data, making it vastly superior for backing up OS partitions.

## How it works internally

`dd` operates via a tight, heavily synchronized loop of `read()` and `write()` system calls.

When executed, `dd` allocates a user-space memory buffer. The size of this buffer is strictly defined by the `bs` (block size) argument.

In its core loop, `dd` issues a `read()` system call to pull exactly `bs` bytes from the `if` file descriptor into the buffer. Once the buffer is full, it issues a `write()` system call to push the buffer's contents into the `of` file descriptor. It updates its internal counters and repeats.

Because it operates at the VFS (Virtual File System) layer, the kernel treats `/dev/sda` (a physical hard drive) exactly like `backup.img` (a regular file). `dd` relies entirely on the kernel's block layer and device drivers to translate these raw `write()` calls into SCSI/NVMe hardware interrupts.

If `oflag=direct` is specified, `dd` utilizes `O_DIRECT`. This instructs the kernel to completely bypass the Page Cache (RAM). The user-space buffer is locked in memory, and the DMA (Direct Memory Access) controller on the storage hardware pulls the data straight from the `dd` buffer to the physical disk platter. This requires strict memory alignment (buffers must be multiples of 512 or 4096 bytes) but guarantees absolute data persistence and eliminates cache pollution during massive clones.

## Performance Notes

- **The Default Block Size Trap:** If you omit the `bs=` argument, `dd` defaults to `bs=512` bytes. Cloning a 1TB hard drive in 512-byte increments forces the kernel to execute _two billion_ distinct `read()` and `write()` system calls. The CPU context-switching overhead is catastrophic, and the clone will take days. Always use a large block size (e.g., `bs=4M` or `bs=16M`) to batch the syscalls and saturate the PCIe bandwidth.

## Security Notes

- **The "Disk Destroyer":** The UNIX community joke that `dd` stands for "Disk Destroyer" is accurate. `dd` performs no sanity checks, no partition evaluations, and asks for no confirmations. If you accidentally swap `if=` and `of=` (e.g., `dd if=/dev/zero of=/dev/sda`), `dd` will begin aggressively wiping your primary boot drive. Within milliseconds, the partition table and filesystem superblock are permanently obliterated, resulting in absolute, unrecoverable data loss. Measure twice, hit Enter once.

## Common Mistakes

- **Targeting partitions instead of whole disks for bootable USBs**
  - _Mistake:_ `dd if=installer.iso of=/dev/sdb1`.
  - _Why:_ `/dev/sdb1` is a partition. The bootable ISO contains its own partition table and MBR/EFI bootloader code, which must be placed at sector 0 of the drive. By writing to `sdb1`, you shifted the bootloader into a partition block, rendering the USB drive completely unbootable. You must write to the raw disk: `/dev/sdb`.
- **Unplugging immediately after completion**
  - _Mistake:_ `dd` finishes, returns to the prompt, and the user instantly yanks out the USB drive. The USB drive is corrupted.
  - _Why:_ `dd` finishing only means the data was written to the Linux kernel's RAM Page Cache. The kernel is still lazily flushing that gigabyte of data to the slow USB hardware in the background. Always run the `sync` command and wait for it to return before physically removing the drive. Alternatively, use `dd ... conv=fdatasync` to force `dd` to block until the hardware confirms the flush.

## Best Practices

- **Use `status=progress`:** Modern GNU `dd` (since Coreutils 8.24) natively supports progress tracking. In older systems without this flag, you had to open a second terminal and execute `kill -USR1 $(pidof dd)` to force the running process to print a status update to the terminal.
- **Combine with Compression:** Cloning empty space wastes massive disk capacity. When imaging a drive, pipeline it through a compressor: `dd if=/dev/sda bs=4M status=progress | zstd > backup.img.zst`.

## Interview Questions

**Q: You are using `dd` to clone a failing hard drive to an image file. The hard drive has a bad sector. When `dd` hits the bad sector, it terminates immediately with an I/O error, and the image file is incomplete. What exact `conv=` flags must you append to ensure `dd` successfully clones the entire drive, and why?**
**A:** You must append `conv=noerror,sync`. `noerror` instructs `dd` not to crash and exit when the kernel returns an `EIO` (Input/Output Error) on a bad read. However, if it just skips the block, the output file will be mathematically smaller, shifting the byte alignment of the entire partition table and corrupting the filesystem. The `sync` flag forces `dd` to pad the unreadable block with null bytes (zeros) in the output file, maintaining the exact byte-for-byte structural alignment of the disk image so the filesystem remains mountable.

**Q: Explain the architectural difference and performance impact between running `dd` with `oflag=direct` versus the default behavior.**
**A:** By default, `dd` writes data to the Linux Page Cache. The `write()` system call returns almost instantly because the data is just parked in RAM; the kernel flushes it to the physical disk later in the background. If you use `oflag=direct`, `dd` utilizes the `O_DIRECT` flag, bypassing the RAM cache completely. The DMA controller transfers data directly from the `dd` buffer to the storage hardware. This is essential for accurate benchmarking (as it prevents measuring RAM speed instead of disk speed) and prevents thrashing the system's memory cache when cloning massive files.

## Practice Problems

**Problem:** You are retiring an old server and must securely wipe the secondary hard drive `/dev/sdb`. Write the command to completely overwrite every single block on the drive with randomized data. Ensure the block size is set to 16 Megabytes for maximum speed, and enable the live progress meter.
**Hint:** The input file must be the kernel's pseudo-device for infinite random data.
**Solution:**

```bash
dd if=/dev/urandom of=/dev/sdb bs=16M status=progress
```

**Problem:** You need to extract exactly 100 Megabytes of data from the middle of a massive file named `database.bin`. You want to skip the first 500 Megabytes of the file, and then extract the next 100 Megabytes, saving it to `slice.bin`.
**Hint:** Use a block size of 1 Megabyte (`1M`), combined with the `skip` and `count` operands.
**Solution:**

```bash
dd if=database.bin of=slice.bin bs=1M skip=500 count=100
```

## References

- [dd(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/dd)
- [GNU Coreutils Manual: dd invocation](https://www.gnu.org/software/coreutils/manual/html_node/dd-invocation.html)
