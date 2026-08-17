---
slug: nslookup
name: nslookup
aliases: [name server lookup]
category: networking
tags: [networking, dns, troubleshooting, bind, lookup]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'find ip address of domain'
  - 'query dns records'
  - 'check mx records nslookup'
  - 'test specific dns server'
  - 'resolve hostname to ip'
relatedCommands: [dig, host, ping, mtr, nc, whois]
alternatives: [dig, host]
status: draft
---

## What is it?

`nslookup` (Name Server Lookup) is a venerable cross-platform network administration command-line tool used to query the Domain Name System (DNS) to obtain domain name or IP address mappings, as well as specific DNS records (like MX or TXT). It can be used in an interactive shell mode or via single-line execution.

## Why does it exist?

Before modern diagnostic tools like `dig` became standard, early network administrators needed a reliable, standardized method to interrogate hierarchical DNS servers directly to verify zone transfers, identify broken name resolution, and query specific record types. Originally distributed as part of the BIND software suite, `nslookup` exists universally on almost every operating system (including Windows), making it the most ubiquitous "first response" tool for diagnosing why a domain fails to resolve to an IP address.

## Syntax

```bash
nslookup [-option] [name | -] [server]
```

## Flags

| Flag             | Description                                                                                 | Example                           |
| ---------------- | ------------------------------------------------------------------------------------------- | --------------------------------- |
| `-type=<record>` | Specifies the DNS record type to query (e.g., `A`, `AAAA`, `MX`, `TXT`, `CNAME`, `ANY`).    | `nslookup -type=mx google.com`    |
| `-debug`         | Enables deep verbose debugging output, showing exactly what queries and responses are sent. | `nslookup -debug example.com`     |
| `-timeout=<sec>` | Sets the wait time in seconds before giving up on a query response.                         | `nslookup -timeout=5 target.net`  |
| `-retry=<count>` | Sets the number of times to resend the query before failing.                                | `nslookup -retry=2 example.com`   |
| `-port=<num>`    | Directs the query to a custom port instead of the default UDP/TCP port 53.                  | `nslookup -port=5353 local.net`   |
| `-class=<class>` | Specifies the DNS class (e.g., `IN` for Internet, `CH` for Chaos). Defaults to `IN`.        | `nslookup -class=IN target.com`   |
| `-vc`            | Forces `nslookup` to use a TCP connection (Virtual Circuit) instead of UDP for the query.   | `nslookup -vc domain.com`         |
| `-ignoretc`      | Ignores truncated UDP packet flags, preventing standard fallback to TCP queries.            | `nslookup -ignoretc domain.com`   |
| `-domain=<name>` | Sets the default search domain to append to unqualified queries.                            | `nslookup -domain=corp.net host1` |
| `server`         | (Argument) Explicitly targets a specific recursive DNS server instead of system defaults.   | `nslookup example.com 8.8.8.8`    |

## Examples

```bash
nslookup example.com
```

> This performs a basic `A` (and `AAAA`) record lookup against the domain name `example.com`, utilizing the default DNS resolvers configured in the local operating system's `/etc/resolv.conf` file.

```bash
nslookup example.com 1.1.1.1
```

> This explicitly bypasses the local system's default DNS configuration and directly interrogates Cloudflare's public resolver (`1.1.1.1`) to check if the domain resolution differs externally.

```bash
nslookup -type=txt google.com
```

> This queries the nameservers specifically for `TXT` (Text) records. Security engineers heavily utilize this command to audit SPF, DKIM, and DMARC anti-spoofing records attached to enterprise email domains.

```bash
nslookup 8.8.8.8
```

> By providing an IP address instead of a hostname, `nslookup` automatically detects the IP and performs a reverse DNS lookup (translating the IP into the `in-addr.arpa` format) to retrieve the associated PTR record hostname (`dns.google`).

```bash
nslookup -type=any example.com
```

> This attempts to pull every cached DNS record (A, MX, NS, SOA) associated with the domain in a single query. Note that modern DNS servers increasingly drop `ANY` queries to mitigate reflection attacks.

## Real-World Scenarios

**Validating Global DNS Propagation**

```bash
nslookup new-app.production.net 8.8.8.8 && nslookup new-app.production.net 9.9.9.9
```

> Immediately after altering DNS A-records in a cloud provider console, network administrators use `nslookup` targeted at various global public resolvers (Google, Quad9) to track TTL expiration and verify if the new IP address has propagated across the global internet cache.

**Auditing Mail Exchanger Routing**

```bash
nslookup -type=mx corporate-domain.com
```

> IT professionals diagnosing inbound email delivery failures query the MX records of a domain to verify that the nameservers are correctly prioritizing the routing toward the intended Google Workspace or Microsoft 365 inbound mail gateways.

**Testing Internal Kubernetes DNS**

```bash
nslookup database-service.default.svc.cluster.local 10.96.0.10
```

> Platform engineers debugging internal cluster communication run an interactive pod and query the explicit CoreDNS Service IP (`10.96.0.10`) to verify that the internal Kubernetes DNS zones are routing perfectly.

## When should it NOT be used?

- **Deep packet inspection and advanced tracing:** **Reason:** `nslookup` formats output awkwardly and lacks modern tracing mechanisms. **Use instead:** `dig +trace domain.com` to observe exact hierarchical root-server delegation paths.
- **Shell script automation:** **Reason:** The multiline, conversational output format of `nslookup` is notoriously difficult to parse consistently with `awk` or `grep`. **Use instead:** `dig +short domain.com` or `host`.

## Alternatives

- **`dig` (Domain Information Groper):** The modern standard. **Tradeoff:** `dig` provides significantly more technical data (TTL values, exact flags, raw response payloads) and programmable single-line outputs (`+short`), but has a slightly steeper learning curve than `nslookup`.
- **`host`:** Minimalist resolver. **Tradeoff:** `host` returns clean, natural language sentences (e.g., "example.com has address 1.2.3.4"), making it incredibly easy for humans to read, but it lacks the interactive prompt mode of `nslookup`.
- **`resolvectl query`:** Systemd resolver integration. **Tradeoff:** Interacts natively with `systemd-resolved`, validating LLMNR, mDNS, and local caching properly, which direct raw tools like `nslookup` deliberately bypass.

## How it works internally

`nslookup` operates independently of the host OS's advanced resolver caching mechanisms (like `/etc/nsswitch.conf` or `systemd-resolved` stubs). It acts as its own direct DNS client.

When you execute `nslookup domain.com`, it reads `/etc/resolv.conf` purely to extract the target `nameserver` IP addresses. It then constructs a raw DNS query packet (containing the domain string encoded in QNAME format, setting the record class to `IN` and type to `A`).

It transmits this binary payload via UDP over port 53 to the target resolver. If the UDP response packet arrives truncated (due to large response payloads exceeding 512 bytes), `nslookup` automatically tears down the UDP connection, establishes a TCP handshake on port 53, and requests the payload again via Virtual Circuit (`-vc`) to ensure completeness. It then parses the binary response into the conversational text output.

## Performance Notes

- Because `nslookup` connects directly to nameservers and ignores `/etc/hosts` and nsswitch caching, queries are bound strictly by network latency to the target resolver.
- Default timeout settings are relatively generous; if a primary DNS server in `/etc/resolv.conf` is unreachable, `nslookup` will pause significantly before falling back to secondary servers.

## Security Notes

- **Unencrypted Transport:** Standard `nslookup` queries transmit entirely in plaintext over UDP port 53. ISPs and attackers on the local network can perfectly sniff, log, or spoof the responses using man-in-the-middle attacks (DNS Hijacking).
- **No DoH/DoT Support:** The utility does not natively support DNS over HTTPS (DoH) or DNS over TLS (DoT). For secure querying, you must use modern tunneling tools like `kdig` or proxy through secure stub resolvers.

## Common Mistakes

- **Assuming it checks `/etc/hosts`:** You edit `/etc/hosts` to point `dev.local` to `127.0.0.1`, but `nslookup dev.local` fails. **Why it's wrong:** Tools like `ping` use the OS resolver (`nsswitch.conf`) which checks `/etc/hosts` first. `nslookup` ignores local OS files and talks _only_ to the nameservers specified in `/etc/resolv.conf`.
- **Confusing Non-Authoritative answers:** Seeing "Non-authoritative answer" and assuming the record is fake. **Why it's wrong:** This simply means the DNS server you queried (e.g., Google's 8.8.8.8) pulled the answer from its cache rather than being the ultimate owner (Authority) of the domain zone file. This is standard behavior for recursive resolvers.
- **Using `nslookup` for script parsing:** Writing complex `grep` strings to pull the IP address out of the `nslookup` block. **Why it's wrong:** The output format shifts across OS variants. Use `dig +short <domain>` which outputs purely the IP address.

## Best Practices

- When a domain resolves unexpectedly, immediately isolate variables by appending an external public resolver (e.g., `nslookup target.com 1.1.1.1`) to determine if the issue is a local cache poison or a global zone misconfiguration.
- For thorough email troubleshooting, always verify both the `MX` record pointing to the mail server, and the `TXT` records defining SPF policies to ensure outbound emails won't be flagged as spam.

## Interview Questions

- _Query:_ A developer states they can successfully `ping mydatabase.internal`, but when they execute `nslookup mydatabase.internal`, the command fails to find the domain. What structural difference between these two tools explains this anomaly?
  - _A:_ `ping` utilizes the operating system's standard name resolution library (governed by `/etc/nsswitch.conf`), which generally checks the local `/etc/hosts` file or local mDNS broadcasts before querying external DNS. `nslookup` deliberately bypasses the OS resolution library and local host files entirely; it constructs raw packets and queries only the explicit nameservers listed in `/etc/resolv.conf`. The developer likely has the database hardcoded in their `/etc/hosts` file.
- _Query:_ What does the phrase "Non-authoritative answer" specifically mean in the output of an `nslookup` command?
  - _A:_ It means the recursive DNS server that responded to your query (such as your ISP's resolver or 8.8.8.8) provided the answer from its local memory cache. It is not the authoritative nameserver that physically hosts the master zone file for that specific domain.
- _Query:_ You execute `nslookup` and receive the error `Truncated, retrying in TCP mode`. What network constraint caused this behavior?
  - _A:_ Traditional DNS operates over UDP, which has a strict historical packet size limit of 512 bytes. If the domain has massive TXT records or hundreds of A records, the response exceeds this limit. The DNS server sets the TC (Truncation) flag in the UDP response. `nslookup` detects this flag and automatically establishes a TCP handshake on port 53 to retrieve the full, un-truncated payload securely.

## Practice Problems

- _Problem:_ Query the exact text (TXT) records associated with `github.com` using Cloudflare's public DNS resolver (`1.1.1.1`).
  - _Hint:_ Combine the record type flag with the domain name and target resolver argument.
  - _Solution:_ `nslookup -type=txt github.com 1.1.1.1` (This bypasses local cache and checks anti-spam/verification tokens on the domain).
- _Problem:_ Execute a reverse DNS lookup to find the domain name associated with the IP address `8.8.4.4`.
  - _Hint:_ The utility natively recognizes IP addresses and automatically converts them to reverse queries.
  - _Solution:_ `nslookup 8.8.4.4` (The tool automatically constructs the `in-addr.arpa` query to retrieve the PTR record).

## References

- [Man Page for nslookup (Linux)](https://man7.org/linux/man-pages/man1/nslookup.1.html)
- [ISC BIND 9 Documentation](https://www.isc.org/bind/)
