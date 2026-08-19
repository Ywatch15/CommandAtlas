---
slug: syscall-memory-management
name: Syscall Memory Management
aliases: ['memory allocation', 'mmap', 'munmap', 'brk', 'sbrk']
category: system-calls
tags: [linux, syscall, c, memory, kernel, virtual-memory, ram]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'map file to memory in C'
relatedCommands: ['syscall-file-io', 'syscall-process-management', 'strace', 'free']
alternatives: []
status: draft
---

## What is it?

The Linux memory management system calls (`mmap()`, `munmap()`, `brk()`) form the lowest-level interface for allocating and manipulating virtual memory pages within a process. `brk()` mathematically adjusts the absolute boundary of the program's data segment (the traditional heap), while `mmap()` creates highly granular virtual memory mappings backed by either physical files (File-Backed) or initialized RAM zeroes (Anonymous memory).

## Why does it exist?

High-level C functions like `malloc()` and `free()` are merely user-space abstractions; they do not possess the authority to conjure physical RAM out of thin air. They require a mechanism to politely ask the operating system kernel for bulk chunks of virtual memory. `brk()` and `mmap()` exist to provide this kernel gateway. Furthermore, `mmap()` solves critical I/O bottlenecks by allowing processes to map massive multi-gigabyte files directly into RAM address spaces, enabling zero-copy manipulation without the profound context-switching overhead of `read()` and `write()` loops.

## Syntax

```c
#include <sys/mman.h>
#include <unistd.h>

void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset);
int munmap(void *addr, size_t length);
int brk(void *addr);
void *sbrk(intptr_t increment);
```

## Flags

| Constant / Flag | Description                                                                                            | Example                                           |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `PROT_READ`     | Memory protection: The mapped memory pages can be read by the process.                                 | `mmap(..., PROT_READ, ...);`                      |
| `PROT_WRITE`    | Memory protection: The mapped memory pages can be written to by the process.                           | `mmap(..., PROT_WRITE, ...);`                     |
| `PROT_EXEC`     | Memory protection: The mapped memory pages can contain executable machine code.                        | `mmap(..., PROT_EXEC, ...);`                      |
| `MAP_SHARED`    | Flag: Modifications to the mapped memory are visible to other processes and flushed to disk.           | `mmap(..., MAP_SHARED, ...);`                     |
| `MAP_PRIVATE`   | Flag: Creates a Copy-on-Write mapping. Modifications are invisible to others and discarded on exit.    | `mmap(..., MAP_PRIVATE, ...);`                    |
| `MAP_ANONYMOUS` | Flag: The mapping is not backed by any file (RAM only). Requires `fd` to be `-1`.                      | `mmap(..., MAP_ANONYMOUS \| MAP_PRIVATE, -1, 0);` |
| `MAP_FIXED`     | Flag: Forces the kernel to place the mapping at the exact `addr` requested, overwriting existing maps. | `mmap(exact_ptr, ..., MAP_FIXED, ...);`           |
| `MAP_HUGETLB`   | Flag: Instructs the kernel to allocate Huge Pages (e.g., 2MB or 1GB) rather than standard 4KB pages.   | `mmap(..., MAP_HUGETLB \| MAP_ANONYMOUS, ...);`   |
| `MAP_POPULATE`  | Flag: Forces the kernel to aggressively pre-fault all pages into RAM, avoiding future page faults.     | `mmap(..., MAP_POPULATE, ...);`                   |

## Examples

```c
void *mem = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_ANONYMOUS | MAP_PRIVATE, -1, 0);
if (mem == MAP_FAILED) {
    perror("mmap failed");
}
```

> This asks the kernel for a chunk of raw RAM. By combining `MAP_ANONYMOUS` (no file backing) and `MAP_PRIVATE`, the kernel allocates 4096 bytes (one standard page) of pure zeroes and returns the virtual memory pointer. This is the exact mechanism `malloc()` uses under the hood to satisfy large memory requests.

```c
int fd = open("database.dat", O_RDWR);
void *db_mem = mmap(NULL, filesize, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
// Edit db_mem as an array: ((char*)db_mem)[0] = 'X';
msync(db_mem, filesize, MS_SYNC);
```

> This implements zero-copy file manipulation. The kernel maps the physical disk blocks of `database.dat` directly into the process's virtual memory array. Any byte changed in the `db_mem` array is automatically synchronized to the hard drive, explicitly guaranteed by the `msync()` barrier.

```c
void *current_brk = sbrk(0);       // Get current heap boundary
void *new_brk = sbrk(4096);        // Expand the heap by 4096 bytes
```

> This demonstrates legacy heap manipulation. `sbrk(0)` returns the absolute top of the current data segment. `sbrk(4096)` mathematically pushes the boundary up by 4096 bytes, expanding the process's available heap memory pool, which a custom allocator can then slice into smaller pieces.

```c
if (munmap(mem, 4096) == -1) {
    perror("munmap failed");
}
```

> This executes surgical memory reclamation. The kernel invalidates the page table entries for the specified 4096-byte virtual address range, unmapping the pages. Any subsequent attempt to read or write to the `mem` pointer will trigger a fatal `SIGSEGV` (Segmentation Fault).

## Real-World Scenarios

**Implementing Inter-Process Communication (IPC)**

```c
void *shared_ram = mmap(NULL, 8192, PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);
if (fork() == 0) {
    strcpy((char *)shared_ram, "Message from child");
    exit(0);
}
```

> Complex multi-process applications (like PostgreSQL) require isolated processes to share state. By establishing a `MAP_SHARED` mapping _before_ calling `fork()`, the kernel ensures both the parent and the child possess virtual memory pointers resolving to the exact same physical RAM pages, enabling instantaneous IPC without network sockets.

**Optimizing High-Performance JIT Compilers**

```c
void *exec_mem = mmap(NULL, code_size, PROT_READ | PROT_WRITE | PROT_EXEC, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
memcpy(exec_mem, compiled_machine_code, code_size);
```

> Just-In-Time (JIT) compilers (like the V8 JavaScript Engine) generate raw machine code on the fly. They use `mmap()` to request executable memory (`PROT_EXEC`), write the compiled hexadecimal opcodes directly into the buffer, and jump the CPU instruction pointer to that memory address to execute the generated code at native speeds.

## When should it NOT be used?

- **Routine, small memory allocations (e.g., creating a 16-byte struct):** **Reason:** `mmap()` deals exclusively in page-aligned boundaries (multiples of 4096 bytes). Asking `mmap()` for 16 bytes forces the kernel to allocate an entire 4KB page, wasting 4080 bytes. **Use instead:** Standard `malloc()`, which intelligently groups thousands of tiny requests into a single mapped chunk.
- **Executing files over unpredictable, high-latency networks (NFS):** **Reason:** If an NFS server disconnects while a process is reading an `mmap`'d file, the kernel throws a fatal `SIGBUS` (Bus Error) signal, crashing the application ungracefully. Standard `read()` handles network interrupts vastly better via `EINTR`.

## Alternatives

- **`malloc()` / `free()`:** The standard user-space allocator. **Tradeoff:** Extremely efficient for small, dynamic memory pooling and preventing page-level fragmentation, but mathematically powerless to share memory across process boundaries or map files to disk.
- **System V IPC (`shmget`, `shmat`):** Legacy shared memory. **Tradeoff:** System V IPC manages shared RAM using explicit numerical keys and complex kernel tracking structures, making it much harder to clean up if a process crashes compared to the elegant, file-descriptor-based `mmap()` paradigm.

## How it works internally

Memory in Linux is heavily abstracted. Applications never see physical RAM (e.g., DIMM slots); they possess a continuous illusion called Virtual Memory.

When you call `mmap()`, the kernel allocates a `vm_area_struct` (VMA) inside the process's memory tracking tree. This VMA simply notes that a specific virtual address range (e.g., `0x7fff0000` to `0x7fff1000`) is legally reserved, and defines its permissions (`PROT_READ`).

Crucially, **no physical RAM is actually allocated at the moment `mmap()` executes** (unless `MAP_POPULATE` is used). This is called _Demand Paging_.

When the application eventually attempts to write a byte to that virtual address, the CPU's Memory Management Unit (MMU) realizes no physical RAM is mapped there. It triggers a hardware interrupt called a **Page Fault**. The Linux kernel intercepts this fault, pauses the application, fetches a real 4KB page of physical RAM, maps it into the CPU's Page Tables, and resumes the application invisibly. This lazy-loading architecture allows processes to `mmap()` 500GB files instantly, because the kernel only pages in the 4KB chunks the application actually touches.

## Performance Notes

- **Translation Lookaside Buffer (TLB) Misses:** Massive databases parsing terabytes of `mmap`'d RAM suffer from heavy TLB cache misses as the CPU struggles to translate millions of 4KB virtual pages into physical addresses. Utilizing `MAP_HUGETLB` forces the kernel to allocate 2MB or 1GB pages, drastically accelerating physical RAM lookups.
- **System Call Reduction:** Replacing thousands of heavy `read()` / `write()` loops with a single `mmap()` operation eliminates thousands of CPU context switches, allowing applications to read files at the absolute maximum throughput limit of the underlying NVMe or SSD controller.

## Security Notes

- **W^X (Write XOR Execute) Mitigation:** Modern secure kernels actively restrict memory regions from being both Writable and Executable (`PROT_WRITE | PROT_EXEC`) simultaneously. This prevents attackers from executing buffer overflows, injecting malicious shellcode into an array, and executing it. Strict SELinux policies will immediately kill applications attempting `W^X` mappings.
- **Denial of Service via Overcommit:** Because `mmap` lazy-loads RAM via Demand Paging, a malicious process can successfully `mmap()` 50 Terabytes of memory on a server with only 16GB of RAM. The kernel allows the "overcommit." However, the moment the process attempts to actually write data into all 50TB, the server instantly exhausts physical memory, triggering the brutal Out-Of-Memory (OOM) Killer to randomly assassinate critical system daemons.

## Common Mistakes

- **Forgetting memory is strictly Page-Aligned:** Calling `munmap(ptr + 10, 500)`. **Why it's wrong:** The kernel manages memory strictly in discrete pages (usually 4096 bytes). You cannot unmap an arbitrary subset of a page. The `addr` parameter _must_ be perfectly aligned to a page boundary, or the `munmap()` system call will fail with `EINVAL`.
- **Mapping beyond the physical file size:** Creating an empty file, `mmap`ing 10MB of it, and trying to write to the end. **Why it's wrong:** The kernel evaluates the physical file size during a page fault. If you attempt to write to mapped memory that exceeds the actual size of the underlying file on disk, the kernel brutally terminates your process with a `SIGBUS` (Bus Error). You must use `ftruncate()` to stretch the physical file size _before_ mapping it.
- **Leaking Maps in Long-Running Daemons:** **Why it's wrong:** While terminating a program automatically destroys all mappings, forgetting to call `munmap()` inside a continuous event loop causes virtual memory fragmentation and exhaustion. The process will eventually exceed the `vm.max_map_count` sysctl limit and crash.

## Best Practices

- When executing zero-copy file modification via `mmap(MAP_SHARED)`, always unconditionally invoke `msync(ptr, length, MS_SYNC)` before exiting. The kernel's background page flushing is unpredictable; `msync` mathematically guarantees your modifications are committed to the hard drive, ensuring data durability during power loss.
- Utilize `madvise(ptr, length, MADV_SEQUENTIAL)` on massively mapped files if your application intends to read the data straight through from start to finish. This injects telemetry into the kernel, allowing it to aggressively pre-fetch disk blocks into RAM before your application asks for them, maximizing throughput.

## Interview Questions

- _Query:_ What is the fundamental architectural difference between allocating memory using `mmap()` with the `MAP_SHARED` flag versus the `MAP_PRIVATE` flag when mapping a file?
  - _A:_ When using `MAP_SHARED`, any modifications made to the memory array by the application are physically synchronized back to the underlying file on the hard drive, and other processes mapping that same file see the changes instantly. When using `MAP_PRIVATE`, the kernel implements a Copy-on-Write boundary. Any modifications made to the memory array are kept strictly isolated in RAM, remain invisible to other processes, and are never written back to the disk file.
- _Query:_ An application successfully executes `mmap()` to request 10GB of anonymous memory on a server that only possesses 2GB of physical RAM. Why does the `mmap()` call return successfully instead of failing with an Out-of-Memory error?
  - _A:_ Linux utilizes a Virtual Memory architecture driven by "Demand Paging." When `mmap()` executes, the kernel simply reserves the _virtual_ address space inside its internal tracking tree (VMA). It allocates exactly zero physical RAM at that moment. The physical RAM is only allocated page-by-page when the application later attempts to read or write to those specific memory addresses, triggering CPU Page Faults.
- _Query:_ In modern glibc implementations, the `malloc()` function occasionally abandons the `brk()` system call entirely and fulfills developer requests using `mmap(MAP_ANONYMOUS)` instead. Under what specific threshold or condition does this architectural shift occur?
  - _A:_ `malloc()` utilizes `brk()` for small, frequent memory allocations because advancing the heap pointer prevents fragmentation and groups tiny allocations together. However, when a developer requests a massive contiguous allocation (typically exceeding 128KB, defined by `MMAP_THRESHOLD`), `malloc()` dynamically switches to using `mmap()`. This allows the allocator to explicitly return massive chunks directly to the OS via `munmap()` the moment they are freed, preventing the heap from becoming permanently bloated.

## Practice Problems

- _Problem:_ Write a C block that securely allocates a 4096-byte page of anonymous memory, guaranteeing that the memory is strictly readable and writable, but enforcing a security boundary that mathematically prevents the execution of malicious shellcode within the buffer.
  - _Hint:_ Combine the anonymous and private flags, and explicitly restrict the protection bitmasks.
  - _Solution:_
    ```c
    void *buffer = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_ANONYMOUS | MAP_PRIVATE, -1, 0);
    if (buffer == MAP_FAILED) { return -1; }
    ```
- _Problem:_ Assume a pointer `shared_db` points to a 10MB memory mapping of a physical database file configured with `MAP_SHARED`. Write the explicit system call required to forcefully block the CPU and guarantee that all modified bytes in the RAM mapping are successfully synchronized to the SSD hardware before continuing.
  - _Hint:_ Utilize the specific memory synchronization boundary function and the absolute synchronization flag.
  - _Solution:_ `msync(shared_db, 10 * 1024 * 1024, MS_SYNC);` (This ensures strict ACID compliance by halting execution until the storage controller acknowledges the write).

## References

- [Linux Programmer's Manual - mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html)
- [Linux Programmer's Manual - brk(2)](https://man7.org/linux/man-pages/man2/brk.2.html)
