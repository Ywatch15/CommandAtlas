---
slug: syscall-io-multiplexing
name: I/O Multiplexing (poll, select, epoll)
aliases: ['epoll', 'select', 'poll', 'event-loop']
category: system-calls
tags: [c, linux, networking, kernel, concurrency, sockets]
difficulty: advanced
supportedOS: [linux, unix, macos]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'handle multiple sockets concurrently'
relatedCommands: ['read']
alternatives: []
status: draft
---

## What is it?

I/O multiplexing refers to the family of system calls—historically `select()` and `poll()`, and modernly `epoll` (on Linux) or `kqueue` (on BSD/macOS)—that allow a single thread to monitor multiple file descriptors (FDs) simultaneously. The kernel blocks the calling process until one or more of the monitored FDs transition into a "ready" state (e.g., data is available to read, or a socket buffer has space to write), allowing the application to process I/O asynchronously without blocking on individual sockets.

## Why does it exist?

Traditional network programming assigns a dedicated thread or process to handle each incoming client connection. This architecture collapses under heavy load (the "C10K problem") due to the immense RAM overhead of thread stacks and the CPU cost of context switching. I/O multiplexing exists to invert this paradigm. By offloading the state-tracking of thousands of sockets directly to the kernel, it enables event-driven, single-threaded architectures (like Node.js, Nginx, and Redis) to efficiently juggle tens of thousands of concurrent connections using almost zero CPU idle-wait time.

## Syntax

```c
// select: Legacy, 1024 FD limit
int select(int nfds, fd_set *readfds, fd_set *writefds, fd_set *exceptfds, struct timeval *timeout);

// poll: Overcomes 1024 limit, still O(N) evaluation
int poll(struct pollfd *fds, nfds_t nfds, int timeout);

// epoll: Modern Linux standard, O(1) active event scaling
int epoll_create1(int flags);
int epoll_ctl(int epfd, int op, int fd, struct epoll_event *event);
int epoll_wait(int epfd, struct epoll_event *events, int maxevents, int timeout);
```

## Flags

| Flag / Macro    | Description                                                                                                                                                           | Example                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `EPOLLIN`       | Indicates the associated file descriptor is ready for `read()` operations without blocking.                                                                           | `ev.events = EPOLLIN;`                      |
| `EPOLLOUT`      | Indicates the associated file descriptor is ready for `write()` operations without blocking.                                                                          | `ev.events = EPOLLIN                        | EPOLLOUT;`     |
| `EPOLLET`       | Configures Edge-Triggered behavior. The kernel alerts the application only when the FD state changes, rather than continuously alerting it while data remains unread. | `ev.events = EPOLLIN                        | EPOLLET;`      |
| `EPOLLONESHOT`  | Guarantees that an event fires exactly once. The user must rearm the file descriptor via `EPOLL_CTL_MOD` to receive further notifications.                            | `ev.events = EPOLLIN                        | EPOLLONESHOT;` |
| `EPOLLRDHUP`    | Detects if a stream socket peer closed the connection or shut down the writing half of the connection.                                                                | `ev.events = EPOLLIN                        | EPOLLRDHUP;`   |
| `EPOLL_CTL_ADD` | Control operation for `epoll_ctl` to register a new file descriptor onto the epoll instance.                                                                          | `epoll_ctl(epfd, EPOLL_CTL_ADD, fd, &ev);`  |
| `EPOLL_CTL_MOD` | Control operation to modify the event mask of an already registered file descriptor.                                                                                  | `epoll_ctl(epfd, EPOLL_CTL_MOD, fd, &ev);`  |
| `EPOLL_CTL_DEL` | Control operation to remove a file descriptor from the epoll instance, ceasing monitoring.                                                                            | `epoll_ctl(epfd, EPOLL_CTL_DEL, fd, NULL);` |
| `POLLIN`        | (poll specific) There is data to read on the file descriptor.                                                                                                         | `fds[0].events = POLLIN;`                   |
| `FD_SET()`      | (select specific) A C macro used to add a file descriptor to an `fd_set` bitmask before calling `select()`.                                                           | `FD_SET(sockfd, &readfds);`                 |

## Examples

```c
fd_set readfds;
FD_ZERO(&readfds);
FD_SET(socket_fd, &readfds);
int ready = select(socket_fd + 1, &readfds, NULL, NULL, NULL);
if (FD_ISSET(socket_fd, &readfds)) {
    // Read data...
}
```

> The legacy `select()` pattern. You must zero out the set, add the FD, calculate the highest FD number plus one (`nfds`), and block. `select` destructively modifies the `readfds` bitmask in-place, meaning you must rebuild the entire set from scratch before every single call in a loop.

```c
struct pollfd pfds[1];
pfds[0].fd = socket_fd;
pfds[0].events = POLLIN;
int ready = poll(pfds, 1, 5000); // 5 second timeout
if (pfds[0].revents & POLLIN) {
    // Read data...
}
```

> The `poll()` pattern. It improves upon `select` by separating the requested events (`events`) from the returned events (`revents`), meaning the array does not need to be rebuilt every iteration. It also inherently bypasses the 1024 file descriptor limit enforced by `fd_set`.

```c
int epfd = epoll_create1(0);
struct epoll_event ev, events[10];
ev.events = EPOLLIN;
ev.data.fd = listen_sock;
epoll_ctl(epfd, EPOLL_CTL_ADD, listen_sock, &ev);

int nfds = epoll_wait(epfd, events, 10, -1);
for (int i = 0; i < nfds; i++) {
    if (events[i].data.fd == listen_sock) {
        // Accept new connection...
    }
}
```

> The modern `epoll` architecture. An epoll instance (`epfd`) is created in the kernel. FDs are explicitly registered via `epoll_ctl`. The application then blocks on `epoll_wait()`. When connections send data, `epoll_wait` instantly returns only an array of actively triggered FDs, executing in $O(1)$ time regardless of whether 10 or 10,000 idle sockets are currently registered.

```c
// Using EPOLLET (Edge-Triggered)
ev.events = EPOLLIN | EPOLLET;
epoll_ctl(epfd, EPOLL_CTL_ADD, client_sock, &ev);

// Must read in a loop until EAGAIN / EWOULDBLOCK
while(1) {
    ssize_t count = read(client_sock, buf, sizeof(buf));
    if (count == -1) {
        if (errno == EAGAIN) break; // Buffer drained
    }
}
```

> Edge-Triggered `epoll` pattern. The kernel alerts the application _only once_ when data arrives. If the application only reads 50 bytes but 100 bytes are in the buffer, the kernel will _never_ alert the application about the remaining 50 bytes. The application must aggressively loop `read()` on the socket until the kernel explicitly returns the `EAGAIN` error, confirming the hardware buffer is completely empty.

```c
// Timer multiplexing with epoll
int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_NONBLOCK);
// ... set timer interval ...
ev.events = EPOLLIN;
ev.data.fd = tfd;
epoll_ctl(epfd, EPOLL_CTL_ADD, tfd, &ev);
```

> Unifying asynchronous events. `epoll` isn't just for network sockets. By utilizing `timerfd`, `signalfd`, or `eventfd`, a C program can route precise timing interrupts, POSIX OS signals, and inter-thread IPC messaging all through the exact same `epoll_wait` loop, creating a master, un-fragmented event router.

## Real-World Scenarios

**Nginx / Node.js Event Loops**

> Web servers like Nginx and runtimes like Node.js (via `libuv`) rely entirely on `epoll` (or `kqueue` on BSD). A single worker thread registers 10,000 client sockets. It sleeps on `epoll_wait`. When 50 packets arrive, `epoll_wait` wakes up, returns the 50 ready FDs, the worker reads the HTTP requests, queues the responses, and immediately loops back to `epoll_wait`, achieving massive concurrency without thread context switching.

**Redis Single-Threaded Architecture**

> Redis achieves millions of operations per second on a single thread because it implements its own minimal I/O multiplexer wrapper (`ae.c`). By leaning heavily on `epoll`, Redis reads from thousands of connected clients, processes commands sequentially in memory, and multiplexes the writes back out, ensuring absolute data consistency without complex locking mutexes.

## When should it NOT be used?

- **Heavy Disk I/O:** **Standard file descriptors (ext4/XFS files) always report as "ready" to `epoll`.** You cannot effectively multiplex local file reads using `epoll`; the `read()` call will still block the thread while the disk seeks. For true non-blocking disk I/O, you must use Linux `io_uring` or POSIX AIO.
- **Simple Client Scripts:** **Do not use `epoll` if you just need to download a file or make a single API call.** The boilerplate C code is vast. A simple blocking `recv()` call is mathematically superior and requires fewer system calls for single-stream execution.

## Alternatives

- **`io_uring`:** **The modern replacement.** Instead of waiting for readiness and then making a blocking `read()` system call, `io_uring` uses shared ring buffers mapped into user-space to submit asynchronous read/write requests directly to the kernel, achieving zero-syscall I/O.
- **`kqueue`:** **Best for macOS/FreeBSD.** The BSD equivalent of `epoll`. It is generally considered architecturally superior because its `kevent` structure natively handles file modifications, process tracking, and signals without needing separate `timerfd`/`signalfd` wrappers.
- **Multi-threading (pthreads):** Creating a thread per connection is an alternative that simplifies application logic (using standard blocking I/O) at the cost of massive memory overhead and scheduler exhaustion at scale.

## How it works internally

`select` and `poll` iterate over arrays. When you call `poll()`, the kernel iterates over every single FD in your array, checking its corresponding driver's wait queue. If no FDs are ready, it puts the calling thread to sleep. When a network interrupt arrives, the driver wakes the thread, and the kernel iterates over the _entire array again_ to set the status flags before returning to user-space. This $O(N)$ scanning kills CPU performance at 10,000+ connections.

`epoll` uses a fundamentally different kernel architecture.
When you call `epoll_create()`, the kernel creates an eventpoll object containing a Red-Black Tree and a Ready List (a linked list).
When you call `epoll_ctl(ADD)`, the kernel inserts an `epitem` into the Red-Black tree (allowing fast $O(\log N)$ lookups to prevent duplicates). It then registers a callback directly with the underlying socket's wait queue.

When a network packet arrives, the NIC fires an interrupt, the TCP/IP stack processes the packet, and triggers the callback. This callback takes the specific `epitem` and directly appends it to the `epoll` instance's Ready List.
When the application calls `epoll_wait()`, the kernel does no scanning. It simply plucks the items off the Ready List and copies them to the user-space events array. This executes in $O(1)$ time, relative only to the number of _active_ events, not the total number of monitored connections.

## Performance Notes

- **Level-Triggered vs Edge-Triggered:** Level-Triggered (LT) is the default for `epoll`. It is easier to program but causes the kernel to continually evaluate and return the FD in `epoll_wait` if you don't drain the buffer completely. Edge-Triggered (ET) guarantees `epoll_wait` only alerts you once per interrupt. ET is significantly faster for massive throughput but requires aggressive non-blocking `read()` while loops that are prone to application-layer deadlocks if programmed incorrectly.

## Security Notes

- **File Descriptor Exhaustion (Slowloris):** Because multiplexing allows a single thread to hold open tens of thousands of connections, attackers can open connections, send 1 byte a minute, and consume all available file descriptors on the OS limit (`ulimit -n`). Servers utilizing `epoll` must implement strict application-level timeout tracking to aggressively close idle or slow connections to prevent Denial of Service.

## Common Mistakes

- **Forgetting to set `O_NONBLOCK`**
  - _Mistake:_ Using `epoll` but leaving the socket in default blocking mode.
  - _Why:_ If `epoll_wait` says a socket is ready, and you call `read()`, a network anomaly might cause the data to disappear (e.g., checksum failure). The `read()` call will block instantly, freezing your entire single-threaded event loop and paralyzing all 10,000 connected clients. You must strictly use `fcntl(fd, F_SETFL, O_NONBLOCK)` on every multiplexed socket.
- **Not checking `nfds` in `select`**
  - _Mistake:_ Calling `select(socket_fd, ...)` instead of `select(socket_fd + 1, ...)`.
  - _Why:_ The first argument to `select` is not the number of descriptors; it is the highest numbered file descriptor in any of the sets, _plus one_. Getting this math wrong causes `select` to silently ignore your highest sockets.

## Best Practices

- **Abstract the Boilerplate:** Never write raw `epoll` code in production applications unless absolutely necessary. Rely on battle-tested C event libraries like `libuv`, `libevent`, or `libev`. They abstract the OS differences, seamlessly falling back to `kqueue` on Mac or `IOCP` on Windows, while handling edge-case signal interruptions (`EINTR`).
- **Batch processing in `epoll_wait`:** Do not call `epoll_wait` with `maxevents=1`. Allocate an array of 64 or 128 `struct epoll_event` instances. Receiving events in batches drastically reduces the number of expensive user-to-kernel context switches under heavy load.

## Interview Questions

**Q: A legacy C server uses `select()`. When the concurrent connection count reaches 1024, the server crashes with memory corruption. What architectural limit of `select()` causes this, and how do you resolve it?**
**A:** `select()` uses fixed-size bitmasks (`fd_set`) defined by the `FD_SETSIZE` macro, which is historically hardcoded to 1024 in the C standard library. Attempting to set an FD higher than 1023 writes out of bounds of the bitmask, corrupting stack memory. To fix it without recompiling the kernel/glibc, the code must be migrated to `poll()` or `epoll()`, which use dynamically allocated arrays of structs instead of fixed bitmasks.

**Q: Explain the exact difference in kernel execution between Level-Triggered (LT) and Edge-Triggered (ET) `epoll` modes.**
**A:** In Level-Triggered mode, if the socket's hardware receive buffer contains unread bytes, `epoll_wait()` will repeatedly return that file descriptor as "ready" every single time it is called until the buffer is entirely drained by the application. In Edge-Triggered mode, the kernel returns the file descriptor exactly _once_ when the state transitions from empty to having data (the edge). If the application reads half the buffer and calls `epoll_wait()` again, it will block and hang, never receiving a second notification for the remaining bytes.

## Practice Problems

**Problem:** You are initializing a non-blocking TCP socket to be monitored. Write the exact C code using `fcntl` to retrieve the current flags of the socket `sockfd` and append the `O_NONBLOCK` flag to it without destroying any existing flags.
**Hint:** You need to `F_GETFL` first, perform a bitwise OR, and then `F_SETFL`.
**Solution:**

```c
int flags = fcntl(sockfd, F_GETFL, 0);
fcntl(sockfd, F_SETFL, flags | O_NONBLOCK);
```

**Problem:** You have an epoll file descriptor (`epfd`). Write the C code required to register an existing socket (`client_fd`) into the epoll instance. You want to monitor it for incoming data, and you explicitly want to use Edge-Triggered mode.
**Hint:** Populate a `struct epoll_event`, setting the data and events fields, then call `epoll_ctl` using the add macro.
**Solution:**

```c
struct epoll_event ev;
ev.events = EPOLLIN | EPOLLET;
ev.data.fd = client_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, client_fd, &ev);
```

## References

- [epoll(7) - Linux manual page](https://man7.org/linux/man-pages/man7/epoll.7.html)
- [The C10K problem](http://www.kegel.com/c10k.html)
