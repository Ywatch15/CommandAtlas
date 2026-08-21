---
slug: syscall-sockets
name: Syscall Sockets
aliases: ['berkeley sockets', 'networking', 'tcp', 'udp', 'bind', 'listen', 'accept']
category: system-calls
tags: [linux, syscall, c, networking, tcp-ip, sockets]
difficulty: advanced
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'create a tcp server in C'
relatedCommands: ['syscall-file-io', 'netstat', 'ss', 'nc']
alternatives: []
status: draft
---

## What is it?

The Berkeley Sockets API (`socket()`, `bind()`, `listen()`, `accept()`, `connect()`, `send()`, `recv()`) provides the foundational system calls for network communication in POSIX operating systems. It interfaces directly with the kernel's TCP/IP stack, allowing user-space applications to establish endpoints, route packets across local IPC namespaces or global internet hardware, and transmit raw byte streams using standard file descriptor paradigms.

## Why does it exist?

Hardware network interfaces (NICs) process chaotic streams of raw electrical frames. Operating systems require a mechanism to translate these physical interrupts into structured, isolated data streams bound to specific applications. The socket API exists to provide this immense abstraction layer. It implements the complex state machines of the TCP protocol (retransmission, congestion control, windowing) entirely within the kernel, exposing a simple set of integer-based functions to developers, effectively treating planetary internet routing exactly like writing to a local text file.

## Syntax

```c
#include <sys/socket.h>
#include <netinet/in.h>

int socket(int domain, int type, int protocol);
int bind(int sockfd, const struct sockaddr *addr, socklen_t addrlen);
int listen(int sockfd, int backlog);
int accept(int sockfd, struct sockaddr *addr, socklen_t *addrlen);
int connect(int sockfd, const struct sockaddr *addr, socklen_t addrlen);
ssize_t send(int sockfd, const void *buf, size_t len, int flags);
ssize_t recv(int sockfd, void *buf, size_t len, int flags);
```

## Flags

| Constant / Flag        | Description                                                                                            | Example                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `AF_INET` / `AF_INET6` | Socket Domain: Configures the socket for IPv4 (`INET`) or IPv6 (`INET6`) addressing.                   | `socket(AF_INET, ...)`                          |
| `AF_UNIX`              | Socket Domain: Configures a Local UNIX Domain Socket for high-speed IPC without network overhead.      | `socket(AF_UNIX, ...)`                          |
| `SOCK_STREAM`          | Socket Type: Requests a reliable, connection-oriented byte stream (instantiates TCP).                  | `socket(..., SOCK_STREAM, 0)`                   |
| `SOCK_DGRAM`           | Socket Type: Requests an unreliable, connectionless datagram stream (instantiates UDP).                | `socket(..., SOCK_DGRAM, 0)`                    |
| `SOCK_NONBLOCK`        | Socket Type modifier: Forces the socket functions to return instantly rather than blocking the thread. | `socket(..., SOCK_STREAM \| SOCK_NONBLOCK, 0)`  |
| `SO_REUSEADDR`         | Socket Option: Allows the kernel to immediately reuse local ports trapped in the `TIME_WAIT` state.    | `setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, ...)` |
| `MSG_DONTWAIT`         | Send/Recv Flag: Executes a specific I/O operation in non-blocking mode on a blocking socket.           | `recv(fd, buf, len, MSG_DONTWAIT)`              |
| `MSG_PEEK`             | Recv Flag: Reads data from the kernel receive buffer without physically removing it from the queue.    | `recv(fd, buf, len, MSG_PEEK)`                  |

## Examples

```c
int server_fd = socket(AF_INET, SOCK_STREAM, 0);
int opt = 1;
setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
```

> This instantiates the raw endpoint. It asks the kernel for an IPv4 (`AF_INET`) TCP (`SOCK_STREAM`) socket. Crucially, it immediately modifies the socket parameters (`SO_REUSEADDR`) to ensure that if the server crashes, it can instantly restart and re-bind to the same port without waiting for the kernel to time out lingering TCP sessions.

```c
struct sockaddr_in address;
address.sin_family = AF_INET;
address.sin_addr.s_addr = INADDR_ANY;
address.sin_port = htons(8080);
bind(server_fd, (struct sockaddr *)&address, sizeof(address));
listen(server_fd, 128);
```

> This configures the server listener. It constructs an address struct commanding the kernel to bind to port `8080` across all available network interfaces (`INADDR_ANY`). Note the use of `htons()` (Host TO Network Short) to correctly flip the endianness of the integer. `listen` transitions the socket into a passive state, instructing the kernel to queue up to 128 incoming connection handshakes.

```c
int client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &addrlen);
```

> This creates a blocking barrier. The execution thread halts entirely on the `accept()` call until a remote client successfully completes a TCP 3-way handshake. Once connected, the kernel returns a brand-new file descriptor (`client_fd`), leaving the original `server_fd` free to continue listening for other clients.

```c
struct sockaddr_in serv_addr;
serv_addr.sin_family = AF_INET;
serv_addr.sin_port = htons(443);
inet_pton(AF_INET, "10.0.0.5", &serv_addr.sin_addr);
connect(client_fd, (struct sockaddr *)&serv_addr, sizeof(serv_addr));
```

> This executes the client-side TCP handshake. It converts a human-readable IP string into a binary network structure (`inet_pton`), and invokes `connect()`. The kernel automatically selects a random ephemeral source port and initiates the `SYN -> SYN/ACK -> ACK` sequence across the network interface.

```c
ssize_t received = recv(client_fd, buffer, 1024, 0);
if (received == 0) {
    // The remote client performed an orderly shutdown (FIN)
}
```

> This pulls data off the wire. The kernel copies up to 1024 bytes from the NIC's receive buffer into user RAM. Catching the `0` return value is the mathematically definitive method to detect that the remote client intentionally closed their side of the TCP connection.

## Real-World Scenarios

**Building High-Concurrency Web Servers (Nginx/Redis)**

```c
// Abstracted representation of epoll architecture
int epoll_fd = epoll_create1(0);
epoll_ctl(epoll_fd, EPOLL_CTL_ADD, server_socket, &event);
while(1) {
    int events_ready = epoll_wait(epoll_fd, events, MAX_EVENTS, -1);
    // Iterate through ready sockets and call accept() or recv()
}
```

> Massive enterprise servers handling 100,000 concurrent TCP connections cannot spawn a new thread for every client. They utilize `socket()` configured with `SOCK_NONBLOCK`, and register every single file descriptor with the `epoll` system call. The kernel acts as an event loop, waking the application thread only when specific sockets possess bytes actively ready for `recv()`, enabling extreme scalability.

**Inter-Process Communication without Network Overhead**

```c
int ipc_fd = socket(AF_UNIX, SOCK_STREAM, 0);
struct sockaddr_un name;
strcpy(name.sun_path, "/var/run/docker.sock");
connect(ipc_fd, (struct sockaddr *) &name, sizeof(name));
```

> Utilities like the Docker CLI do not use standard TCP networking to talk to the Docker daemon. They instantiate a Local UNIX Domain Socket (`AF_UNIX`). This maps the socket directly to a physical file on the disk (`docker.sock`). Traffic traversing this socket completely bypasses the kernel's heavy TCP/IP routing and checksum stacks, enabling blazing-fast local memory transfers.

## When should it NOT be used?

- **Building modern microservices or HTTP APIs:** **Reason:** Raw C sockets require you to manually parse complex HTTP string headers, manage chunked encoding, and negotiate complex TLS/SSL cryptographic handshakes. **Use instead:** High-level abstractions like gRPC, Go's `net/http` package, or Python's `Requests` library.
- **Encrypting data in transit:** **Reason:** The standard socket API transmits bytes in absolute plaintext. **Use instead:** Pass the connected raw socket file descriptor to a cryptographic overlay library like OpenSSL (`SSL_set_fd()`) to handle the packet encryption wrapping.

## Alternatives

- **`libuv` / `libevent`:** Asynchronous I/O libraries. **Tradeoff:** These libraries abstract away the immense complexity of writing cross-platform, non-blocking `epoll/kqueue` event loops, managing the raw socket state machines entirely in the background (used by Node.js).
- **ZeroMQ (0MQ):** Advanced messaging sockets. **Tradeoff:** ZeroMQ provides a C API that looks like traditional sockets, but natively handles automatic reconnections, message framing (preventing partial reads), and publish-subscribe patterns out of the box.

## How it works internally

When you invoke `socket(AF_INET, SOCK_STREAM, 0)`, the kernel allocates a `struct socket` representing the endpoint, paired with a specialized `struct sock` containing the incredibly complex TCP state machine arrays (retransmission queues, congestion windows, sequence numbers). It returns a standard integer file descriptor mapped to these structures.

When you call `bind()` and `listen()`, the kernel registers the port in its internal hash tables. When an incoming network packet arrives at the physical NIC, a hardware interrupt fires. The kernel parses the IP headers, identifies the destination port, hashes it, and locates your listening socket.

For TCP, the kernel automatically handles the 3-way handshake entirely in the background. Once the handshake is complete, the kernel places the fully connected session into an "accept queue." When the user application finally calls `accept()`, it simply pops the first session off this queue and receives a brand new file descriptor for that specific client stream.

When `send()` is invoked, the application copies bytes into the kernel's transmit buffer (`sk_sndbuf`). The kernel's TCP stack takes over, fragmenting the data into MTU-sized segments, calculating checksums, attaching IP headers, and passing them to the hardware NIC driver for electrical transmission.

## Performance Notes

- **The Nagle Algorithm Delay:** By default, TCP sockets implement Nagle's Algorithm, which artificially delays sending small packets to bundle them together for network efficiency. For latency-critical applications (like multiplayer games or SSH), this introduces a ~40ms stutter. Developers must explicitly disable it via `setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, 1)`.
- **Socket Buffer Limits:** A `recv()` call bottleneck is often the kernel's receive buffer size. Tuning `SO_RCVBUF` and `SO_SNDBUF` allows the kernel to accept massive bursts of gigabit network traffic without dropping packets while the user-space application struggles to read them fast enough.

## Security Notes

- **Privileged Ports:** The Linux kernel explicitly prevents unprivileged users from invoking `bind()` on ports mathematically lower than `1024` (e.g., Port 80 for HTTP or 443 for HTTPS). This prevents malicious users from spinning up fake web servers. The binary must be executed as `root`, or granted the `CAP_NET_BIND_SERVICE` capability.
- **SYN Flood Vulnerabilities:** If an attacker sends millions of SYN packets but never completes the handshake, the kernel's "accept queue" overflows, preventing legitimate clients from connecting. Modern kernels mitigate this automatically by utilizing SYN Cookies, discarding state until the final ACK arrives.

## Common Mistakes

- **Ignoring Endianness:** Writing `address.sin_port = 8080;`. **Why it's wrong:** x86 processors store integers in Little-Endian format. Network protocols demand Big-Endian format. If you fail to wrap the integer in `htons()` (Host TO Network Short), port 8080 (`0x1F90`) will be flipped over the network, causing the application to bizarrely bind to port 36895 (`0x901F`) instead.
- **Failing to handle partial `send()` / `recv()`:** Assuming `send(fd, buffer, 5000, 0)` wrote all 5000 bytes. **Why it's wrong:** Sockets are streams, not messages. If the kernel's internal TCP buffer only has 1000 bytes of free space left, `send()` will return `1000` and stop. You must wrap network calls in `while` loops that advance the memory pointer until the entire payload is dispatched.
- **The "Address Already in Use" Trap:** Restarting a crashed server script and `bind()` fails instantly. **Why it's wrong:** When a socket closes, the kernel places the port into a `TIME_WAIT` state for ~60 seconds to catch delayed, out-of-order packets. You must configure the `SO_REUSEADDR` option immediately after creating the socket to instruct the kernel to bypass this block during restarts.

## Best Practices

- Never use standard blocking sockets in production enterprise servers. Always transition sockets to `SOCK_NONBLOCK` and utilize `epoll` or `select` to handle connections asynchronously, preventing a single slow client on a bad 3G connection from freezing the entire application thread.
- When receiving data over TCP, you have no guarantee that a complete message arrived in a single `recv()` call. You must design an application-layer protocol (e.g., prefixing every message with a 4-byte length integer) so your code knows exactly how many bytes to buffer before attempting to parse the JSON or XML payload.

## Interview Questions

**Q:** What is the mathematical and architectural difference between the execution of a TCP socket (`SOCK_STREAM`) and a UDP socket (`SOCK_DGRAM`) when transmitting a 5000-byte payload?
**A:** TCP (`SOCK_STREAM`) provides a reliable, ordered byte stream. The kernel will transparently chop the 5000 bytes into multiple segments (respecting the MTU), transmit them, track sequence numbers, and automatically retransmit any lost segments. The receiving application reads a continuous stream without boundary markers. UDP (`SOCK_DGRAM`) provides unreliable, connectionless messaging. The kernel treats the 5000 bytes as a single, discrete message boundary. If the payload is larger than the network path permits, it fragments blindly. If a fragment drops, the entire 5000-byte message is silently discarded, and the receiving application receives absolutely nothing; there is no retransmission.
**Q:** Why does a TCP server implementation structurally require the execution of two separate file descriptors (one from `socket()` and one from `accept()`), whereas a UDP server only requires one?
**A:** TCP is connection-oriented. The first file descriptor (from `socket()`) acts as a passive, immutable listener bound to a specific port, waiting for connection requests. When a request arrives, `accept()` spawns a brand new, distinct file descriptor explicitly tied to that specific client's TCP session. This allows the server to maintain the original listening socket independently. UDP is connectionless; it maintains no session state. A single UDP socket blindly receives datagrams from thousands of different IP addresses simultaneously on the same exact file descriptor.
**Q:** A developer attempts to bind a custom web server application to port 80. The `bind()` system call fails with `EACCES` (Permission denied). The server is running as a standard user account. What kernel security mechanism caused this, and how can it be bypassed safely without running the application as root?
**A:** The Linux kernel explicitly protects "Privileged Ports" (ports numbered 0 through 1023) from being bound by unprivileged users, preventing malicious actors from hijacking critical system services like HTTP or SSH. To bypass this safely, the administrator can apply the `CAP_NET_BIND_SERVICE` Linux capability directly to the application binary using `setcap`, allowing the unprivileged process to bind the port without granting it total root system control.

## Practice Problems

**Problem:** Write the C code required to properly configure an IPv4 `sockaddr_in` struct to bind to the IP address `127.0.0.1` on port `9090`, ensuring all endianness conversion functions are applied correctly to prevent hardware architecture mismatches.
**Hint:** Define the family, use `htons` for the port, and `inet_pton` for the string-to-binary IP conversion.
**Solution:**
`c
    struct sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_port = htons(9090);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    `
**Problem:** Assume a non-blocking TCP socket file descriptor `client_fd`. Write a single line of C code to attempt to receive up to 1024 bytes into `buffer`, but explicitly instruct the kernel via a specific flag that it should simply copy the data into the buffer _without_ physically removing it from the kernel's receive queue.
**Hint:** Utilize the specific message flag designed for inspecting incoming streams without consuming them.
**Solution:** `ssize_t bytes = recv(client_fd, buffer, 1024, MSG_PEEK);` (The `MSG_PEEK` flag leaves the data in the TCP window, meaning the next standard `recv()` call will read the exact same data again).

## References

- [Linux Programmer's Manual - socket(2)](https://man7.org/linux/man-pages/man2/socket.2.html)
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/)
