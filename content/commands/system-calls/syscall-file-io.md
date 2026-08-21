---
slug: syscall-file-io
name: Syscall File I/O
aliases:
  - file descriptors
  - open
  - read
  - write
  - close
category: system-calls
tags:
  - linux
  - syscall
  - c
  - file-system
  - kernel
  - posix
  - io
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - read from a file descriptor in C
relatedCommands:
  - syscall-process-management
  - syscall-memory-management
  - strace
  - lsof
  - syscall-sockets
alternatives: []
status: draft
---

## What is it?

The POSIX file I/O system calls (`open()`, `read()`, `write()`, `close()`) form the lowest-level programming interface for interacting with files, hardware devices, and data streams in Unix-like operating systems. They broker the transfer of raw byte arrays between user-space application memory and kernel-space filesystem drivers via an integer identifier known as a File Descriptor (FD).

## Why does it exist?

User-space applications cannot directly interact with physical storage hardware or device memory due to strict kernel security boundaries. If every application wrote custom drivers to interface with NVMe drives or network cards, the system would collapse. These syscalls exist to provide a universal, abstract mechanism: the kernel treats everything (disks, pipes, terminals, sockets) as a "file," allowing developers to read and write bytes using the exact same four core functions regardless of the underlying physical hardware.

## Syntax

```c
#include <fcntl.h>
#include <unistd.h>

int open(const char *pathname, int flags, mode_t mode);
ssize_t read(int fd, void *buf, size_t count);
ssize_t write(int fd, const void *buf, size_t count);
int close(int fd);
```

## Flags

| Constant / Flag | Description                                                                             | Example                                       |
| --------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| `O_RDONLY`      | Opens the file strictly for read-only access.                                           | `open("file.txt", O_RDONLY);`                 |
| `O_WRONLY`      | Opens the file strictly for write-only access.                                          | `open("log.txt", O_WRONLY);`                  |
| `O_RDWR`        | Opens the file for both reading and writing.                                            | `open("data.bin", O_RDWR);`                   |
| `O_CREAT`       | Creates the file if it does not already exist (requires the `mode` argument).           | `open("new.txt", O_WRONLY \| O_CREAT, 0644);` |
| `O_APPEND`      | Forces all `write()` operations to append data to the absolute end of the file.         | `open("app.log", O_WRONLY \| O_APPEND);`      |
| `O_TRUNC`       | Truncates the file to zero length upon opening (if it exists and allows writing).       | `open("out.txt", O_WRONLY \| O_TRUNC);`       |
| `O_CLOEXEC`     | Automatically closes the file descriptor if the process executes an `execve()` call.    | `open("secret", O_RDONLY \| O_CLOEXEC);`      |
| `O_DIRECT`      | Bypasses the kernel's page cache, performing Direct I/O straight to user memory.        | `open("db.dat", O_RDWR \| O_DIRECT);`         |
| `O_SYNC`        | Blocks `write()` calls until physical hardware acknowledges the data is stored on disk. | `open("wal.log", O_WRONLY \| O_SYNC);`        |
| `O_NONBLOCK`    | Opens the file in non-blocking mode; reads/writes return instantly if no data is ready. | `open("/dev/tty", O_RDONLY \| O_NONBLOCK);`   |

## Examples

```c
int fd = open("/etc/passwd", O_RDONLY | O_CLOEXEC);
if (fd == -1) {
    perror("Failed to open file");
    return -1;
}
```

> This initiates safe file access. It asks the kernel to open `/etc/passwd` in read-only mode, guaranteeing the file descriptor is not leaked to child processes via the `O_CLOEXEC` flag, and explicitly checks if the kernel rejected the request (returning `-1`).

```c
char buffer[1024];
ssize_t bytes_read = read(fd, buffer, sizeof(buffer));
if (bytes_read > 0) {
    // Process the buffer
}
```

> This pulls data across the boundary. It instructs the kernel to pull up to 1024 bytes from the open file descriptor into the user-space `buffer`. It captures the `ssize_t` return value to know exactly how many bytes were actually populated.

```c
const char *msg = "Application Started\n";
ssize_t bytes_written = write(fd, msg, strlen(msg));
```

> This pushes data into the kernel. It takes a constant string array and asks the kernel to write its exact byte length into the file descriptor. The kernel copies the data from user-space RAM into its internal disk cache buffers.

```c
if (close(fd) == -1) {
    perror("Error closing file descriptor");
}
```

> This gracefully releases the kernel resource. The kernel decrements the reference count for the file description; if it reaches zero, the internal memory structures are deallocated. Checking the return value is critical to catch delayed I/O errors on NFS filesystems.

```c
ssize_t total_written = 0;
while (total_written < length) {
    ssize_t res = write(fd, buffer + total_written, length - total_written);
    if (res == -1 && errno == EINTR) continue; // Interrupted, try again
    if (res == -1) return -1; // Fatal error
    total_written += res;
}
```

> This implements a mathematically safe write loop. Because the kernel does not guarantee a `write()` will flush the entire buffer in one pass (a "short write"), this loop shifts the memory pointer forward and resubmits the remaining byte count until the entire buffer is safely written.

## Real-World Scenarios

**Implementing Write-Ahead Logs (WAL) for Databases**

```c
int fd = open("transaction.wal", O_WRONLY | O_APPEND | O_CREAT | O_SYNC, 0600);
write(fd, transaction_data, data_len);
```

> Database engines (like PostgreSQL or SQLite) must guarantee ACID compliance. They use `O_APPEND` to ensure atomic logging and `O_SYNC` to force the kernel to block the CPU execution thread until the SSD hardware controller explicitly confirms the transaction is safely written to non-volatile flash memory.

**Streaming Huge Files over Networks**

```c
int source_fd = open("massive_video.mp4", O_RDONLY);
// Use sendfile(socket_fd, source_fd, ...) instead of read()/write() loops
```

> High-performance web servers (like Nginx) bypass traditional `read()` and `write()` loops for static file delivery. They use `open()` to get the file descriptor, and then utilize the `sendfile()` syscall to instruct the kernel to stream the disk blocks directly into the network socket, achieving zero-copy transmission.

**Atomic File Replacement via Rename**

```c
int temp_fd = open("config.tmp", O_WRONLY | O_CREAT | O_TRUNC, 0644);
write(temp_fd, new_config, len);
close(temp_fd);
rename("config.tmp", "config.json");
```

> Systems software needing to overwrite configuration files safely cannot use `O_TRUNC` on the live file (which corrupts the file if the server crashes mid-write). They `open()` and `write()` a temporary file, `close()` it, and use the atomic `rename()` syscall to hot-swap the file descriptor pointers safely.

## When should it NOT be used?

- **Reading highly structured text data (CSV/JSON) sequentially:** **Reason:** Raw `read()` returns arbitrary byte blocks without concept of newlines or text encoding, forcing you to implement complex user-space buffering to find `\n` boundaries. **Use instead:** Standard C library functions like `fopen()`, `fgets()`, or `getline()`.
- **Modifying a single byte in a 10GB file:** **Reason:** Using `lseek()`, `read()`, and `write()` for random-access mutation incurs heavy context-switch latency for every small jump. **Use instead:** `mmap()` to map the file into RAM and treat it as a standard C array.

## Alternatives

- **`fopen()` / `fread()` (C Standard Library):** Buffered I/O. **Tradeoff:** `fread()` wraps `read()` with user-space memory buffers, dramatically reducing the number of expensive kernel context switches required when reading files byte-by-byte.
- **`mmap()`:** Memory-Mapped I/O. **Tradeoff:** `mmap()` maps file blocks directly into the process's virtual memory space, bypassing `read()` and `write()` entirely for zero-copy memory manipulation, but is harder to synchronize safely.
- **`io_uring` / `AIO`:** Asynchronous I/O. **Tradeoff:** Allows a single thread to submit thousands of non-blocking disk read/write requests simultaneously, bypassing the blocking nature of standard `read()/write()`.

## How it works internally

When an application invokes `open()`, the CPU triggers a software interrupt (context switch), elevating privileges and shifting execution from User Space to Kernel Space.

The kernel traverses the Virtual File System (VFS), resolves the string `pathname` to an underlying `inode` (index node) representing the file on the physical disk, and allocates a `file description` object containing the file's current read/write offset and access permissions. The kernel then finds the lowest available integer in the process's **File Descriptor Table** (usually starting at 3, as 0,1,2 are `stdin`, `stdout`, `stderr`), maps this integer to the `file description`, and returns the integer back to the user application.

When `write()` is called with this integer, the kernel locates the `file description`. Instead of writing directly to the disk, the kernel copies the byte payload from user-space RAM into its internal **Page Cache** in kernel RAM. The `write()` syscall returns instantly. A background kernel thread (like `pdflush`) will later mathematically organize these "dirty pages" and physically flush them to the spinning disk or SSD during an optimized I/O cycle.

## Performance Notes

- **Context Switch Overhead:** Every single invocation of `read()` or `write()` requires a heavy context switch between User Mode and Kernel Mode. Calling `write()` 1,000 times for 1 byte each is catastrophically slower than calling `write()` once with a 1,000-byte buffer.
- **The Page Cache Illusion:** Standard `write()` operations execute in microseconds because they only write to RAM. However, if the Page Cache fills up, subsequent `write()` calls will block synchronously, stalling the application while the kernel forcibly flushes old data to the slow physical disk.

## Security Notes

- **Time-of-Check to Time-of-Use (TOCTOU):** Checking if a file exists using `access()` and then calling `open()` is a severe security vulnerability. An attacker can swap the file with a malicious symlink in the microsecond between the two syscalls. Always attempt the `open()` directly and handle the resulting error code securely.
- **Descriptor Leakage:** File descriptors are inherited by child processes during `fork()` and `execve()`. If you `open()` a sensitive database credential file and spawn a third-party script, that script gains unauthorized read/write access to the database file. Universally utilize the `O_CLOEXEC` flag to permanently seal this vulnerability.

## Common Mistakes

- **Ignoring "Short Reads" and "Short Writes":** Assuming `write(fd, buf, 1000)` actually wrote 1000 bytes. **Why it's wrong:** The kernel is allowed to write fewer bytes than requested (e.g., if a pipe buffer fills up or a signal interrupts the process). You must always check the return value and construct loops to push the remaining bytes.
- **Forgetting `O_CREAT` requires a mode:** Calling `open("file.txt", O_WRONLY | O_CREAT);`. **Why it's wrong:** The C compiler might not warn you, but `O_CREAT` requires a third argument specifying the file permissions (e.g., `0644`). Without it, the kernel reads raw garbage from the CPU register and creates a file with completely random, unpredictable permissions.
- **Not handling `EINTR`:** **Why it's wrong:** If a process is blocked in a `read()` call and receives a system signal (like SIGCHLD), the kernel aborts the read and returns `-1`, setting `errno` to `EINTR`. The application will incorrectly assume the file is broken and crash, rather than retrying the read.

## Best Practices

- Always wrap `read()` and `write()` in mathematical `while` loops that explicitly account for partial byte transfers and gracefully retry upon `EINTR` signal interruptions.
- When executing disk I/O, utilize power-of-two buffer sizes (e.g., 4096 or 8192 bytes) that mathematically align with the kernel's memory page size and the SSD's physical block size, maximizing throughput efficiency.
- Consistently execute `close()` on file descriptors in error-handling pathways. A process is strictly limited in how many FDs it can open (often 1024); leaking descriptors inside a server loop will eventually cause an `EMFILE` (Too many open files) application crash.

## Interview Questions

**Q:** What is the technical difference between a "short write" and a standard error when checking the return value of the `write()` system call?
**A:** If `write()` encounters a fatal error (like a closed network socket or a full hard drive), it returns exactly `-1` and sets the `errno` variable. A "short write" occurs when `write()` returns a positive integer that is simply _less_ than the number of bytes you requested it to write. This is not an error; it simply means the kernel's internal buffer filled up, and the developer must adjust their memory pointer and call `write()` again to push the remaining payload.
**Q:** Why do highly secure C applications mandate appending the `O_CLOEXEC` flag when invoking the `open()` system call?
**A:** By default, open file descriptors remain active and accessible across an `execve()` system call. If an application opens a sensitive configuration file and later spawns a child process (like shelling out to `bash` or a plugin), that child inherits the open file descriptor and can read or write to the sensitive file. `O_CLOEXEC` (Close-on-Exec) instructs the kernel to automatically and securely close the file descriptor the moment a new binary is executed, plugging the data leak.
**Q:** When using `open()` with the `O_CREAT` flag to generate a new file, the developer specifies the mode argument as `0666` (read/write for everyone). However, when checking the disk, the file is created with permissions `0644`. Why did the kernel alter the requested permissions?
**A:** The requested mode (`0666`) is not absolute; it is subjected to a bitwise mathematical subtraction against the executing process's `umask` (user file-creation mode mask). If the OS umask is set to `0022` (restricting group and other write permissions), the kernel calculates `0666 & ~0022`, resulting in the final file receiving the safer `0644` permission set.

## Practice Problems

**Problem:** Write a robust C loop to write exactly `total_length` bytes from a `buffer` into an open file descriptor `fd`, ensuring it perfectly handles both short writes and `EINTR` kernel interruptions.
**Hint:** You must track how many bytes have been successfully written so far, adjusting both the buffer pointer and the remaining size in the `write()` call.
**Solution:**
`c
    size_t written = 0;
    while (written < total_length) {
        ssize_t res = write(fd, buffer + written, total_length - written);
        if (res == -1) {
            if (errno == EINTR) continue;
            return -1; // Fatal error
        }
        written += res;
    }
    `
**Problem:** Open a file named `database.lock` safely. The command must create the file with read/write owner permissions (`0600`), but it must absolutely fail and return an error if the lock file already exists on the disk.
**Hint:** Combine the creation flag with the exclusive flag to prevent silent overwriting.
**Solution:** `int fd = open("database.lock", O_WRONLY | O_CREAT | O_EXCL, 0600);` (The `O_EXCL` flag makes the creation strictly atomic, ensuring exclusive access).

## References

- [Linux Programmer's Manual - open(2)](https://man7.org/linux/man-pages/man2/open.2.html)
- [Linux Programmer's Manual - write(2)](https://man7.org/linux/man-pages/man2/write.2.html)
