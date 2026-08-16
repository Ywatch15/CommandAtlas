---
slug: dig
name: dig
aliases: [domain information groper]
category: networking
tags: [dns, networking, troubleshooting, nslookup, bind]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'query dns records'
  - 'check mx records'
  - 'troubleshoot dns resolution'
  - 'trace dns propagation'
  - 'query specific nameserver'
relatedCommands: [host, nslookup, ping, whois]
alternatives: [host, nslookup]
status: draft
---

## What is it?

`dig` (Domain Information Groper) is a highly flexible command-line tool used for interrogating DNS name servers. Provided by the BIND utility suite, it performs precise DNS lookups and displays the raw, unformatted responses received from the queried servers. It is the definitive industry-standard tool for diagnosing DNS propagation issues, validating record syntax, and tracing the hierarchical resolution path across the global Domain Name System.

## Why does it exist?

While legacy tools like `nslookup` provide basic DNS resolution, they obscure the underlying protocol complexities, often utilizing non-standard, internal OS resolver libraries that mask true DNS failures. `dig` exists to provide absolute transparency. It bypasses the OS's high-level caching abstractions (like `systemd-resolved` or `nscd`) and constructs raw UDP/TCP DNS packets. It returns the exact header flags (e.g., `AUTHORITY`, `NOERROR`, `NXDOMAIN`), the full response sections (Question, Answer, Authority, Additional), and execution times, allowing network engineers to debug highly complex DNSSEC, EDNS, and zone delegation failures deterministically.

## Syntax

```bash
dig [@server] [name] [type] [options]
```

## Flags

| Flag             | Description                                                                                                            | Example                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `@server`        | Specifies a specific DNS server to query, bypassing the system's default `/etc/resolv.conf` resolvers.                 | `dig @8.8.8.8 google.com`           |
| `type`           | Specifies the exact DNS record type to query (e.g., `A`, `AAAA`, `MX`, `TXT`, `CNAME`, `ANY`). Defaults to `A`.        | `dig github.com MX`                 |
| `+short`         | Drastically simplifies the output, returning only the raw value of the resolved record without headers or query times. | `dig +short google.com`             |
| `+trace`         | Performs an iterative lookup from the root DNS servers downwards, tracing the entire delegation path.                  | `dig +trace example.com`            |
| `+noall +answer` | Suppresses all output sections (header, question) except the actual Answer section. Best for readable terminal output. | `dig +noall +answer fb.com`         |
| `-x <ip>`        | Performs a reverse DNS lookup (translating an IP address back to its registered hostname via in-addr.arpa).            | `dig -x 1.1.1.1`                    |
| `+tcp`           | Forces `dig` to send the query over TCP on port 53 rather than the default UDP. Useful for massive TXT records.        | `dig +tcp txt example.com`          |
| `-p <port>`      | Queries a non-standard port instead of the default port 53. Essential for testing localized stub resolvers or CoreDNS. | `dig @127.0.0.1 -p 8600 app.consul` |

## Examples

```bash
dig example.com
```

> The standard invocation. It queries the local system's default DNS server for the `A` (IPv4) record of `example.com`. The output provides a header containing status codes (`NOERROR`), flags, the question asked, the answer received (IP address), and the exact query time in milliseconds.

```bash
dig @1.1.1.1 microsoft.com AAAA
```

> Bypasses the corporate or ISP DNS resolver to interrogate a specific, external public nameserver (Cloudflare's 1.1.1.1). This explicitly requests the `AAAA` record, retrieving the IPv6 address for the domain.

```bash
dig +short _dmarc.example.com TXT
```

> Strips away all verbose headers and outputs only the raw text of the requested TXT record. This is a crucial scripting pattern for automatically extracting DMARC, SPF, or domain verification tokens.

```bash
dig +noall +answer +multiline example.com ANY
```

> Retrieves all publicly available records for the domain (though modern DNS providers often restrict the `ANY` query type). It cleans up the output block and formats multi-line records (like complex SOA or DNSSEC keys) across multiple terminal lines for easier human reading.

```bash
dig -x 8.8.4.4 +short
```

> Executes a reverse lookup, converting the IP address into the specialized `arpa` zone format and querying the PTR (Pointer) record. In this case, it instantly returns `dns.google.`.

## Real-World Scenarios

**Tracing DNS Propagation and Delegation**

```bash
dig +trace [www.example.com](https://www.example.com)
```

> When a domain's A-record is updated, engineers often suffer from DNS caching masking the change. Using `+trace`, an SRE bypasses all caching. `dig` queries the root servers (`.`), which delegate to the TLD servers (`.com.`), which delegate to the domain's authoritative nameservers (e.g., AWS Route53). This proves exactly where the zone delegation is broken or if the authoritative servers have absorbed the update.

**Validating Mail Exchanger (MX) Priorities**

```bash
dig @8.8.8.8 domain.com MX +noall +answer
```

> When troubleshooting inbound email delivery failures, an IT administrator uses this command to retrieve the list of MX records. The output clearly displays the priority integers alongside the mail server endpoints (e.g., `10 aspmx.l.google.com.`), instantly verifying if the domain's DNS is routing mail to the correct infrastructure provider.

## When should it NOT be used?

- **mDNS or Local Hostname Resolution:** **Do not use `dig` to find `localhost` or local `.local` machines.** `dig` exclusively speaks the raw DNS protocol (UDP/TCP 53). It bypasses `/etc/nsswitch.conf` and does not consult your `/etc/hosts` file or mDNS (Avahi/Bonjour). Use `ping` or `getent hosts` for OS-level resolution.
- **Simple Pinging:** If you just want to know if a server is online or what its IP is, `dig` is overly verbose. `host` or `ping` provide quicker, simpler responses for basic checks.

## Alternatives

- **`host`:** **Best for quick, simple lookups.** Provides brief, single-line outputs resolving an IP or hostname without exposing packet headers or query metadata.
- **`nslookup`:** **Best for legacy Windows administrators.** A historically ubiquitous tool, but officially deprecated by BIND/ISC in the early 2000s in favor of `dig` due to its flawed internal resolution logic, though it remains available on most systems.
- **`dog` / `doggo`:** **Best for modern formatting.** A Rust/Go-based command-line DNS client that outputs beautifully colored tables and supports modern protocols like DNS-over-HTTPS (DoH) and DNS-over-TLS (DoT) natively.

## How it works internally

Unlike standard networking commands that rely on the C standard library's `getaddrinfo()` function (which cascades through the OS's complex NSS stack), `dig` contains its own completely independent DNS resolver engine implementation (the BIND 9 libdns library).

When you run `dig example.com`, it reads `/etc/resolv.conf` simply to identify the target `nameserver` IP. It then manually constructs a raw DNS query packet, inserting the Question section (e.g., `example.com. IN A`).

It opens a UDP socket, binds it, and transmits the packet to port 53 of the nameserver. It waits for the UDP response packet. If the packet exceeds 512 bytes (and EDNS0 is not configured/supported) or if the `TC` (Truncation) bit is set in the header, `dig` tears down the UDP socket, establishes a reliable TCP connection to port 53, and requests the payload again over TCP to prevent packet fragmentation loss.

Finally, `dig` parses the binary response packet, translating the hexadecimal opcodes and RDATA sections into the familiar, human-readable ASCII layout.

## Performance Notes

- **Timeouts and Retries:** By default, if a queried nameserver drops the packet, `dig` waits for 5 seconds and retries. When diagnosing a completely unresponsive nameserver, the command can hang for up to 15 seconds. Use `+time=1` and `+tries=1` to force `dig` to fail fast during automated scripting.
- **TCP Overhead:** DNS relies heavily on the speed of connectionless UDP. Forcing TCP (`+tcp`) requires a 3-way handshake before the query can be sent, increasing latency by several milliseconds.

## Security Notes

- **DNSSEC Validation:** `dig` supports validating DNS Security Extensions (DNSSEC). Adding the `+dnssec` flag requests the nameserver to send the cryptographic signatures (RRSIG records) alongside the answer. The `AD` (Authenticated Data) bit in the `dig` header confirms if the upstream resolver successfully validated the cryptographic chain of trust.
- **Zone Transfers (AXFR):** Administrators can use `dig @ns1.domain.com domain.com AXFR` to request a complete copy of a domain's entire DNS zone file. Secure nameservers strictly block AXFR requests from unauthorized IP addresses, but discovering an open AXFR allows attackers to map an organization's entire internal/external infrastructure instantly.

## Common Mistakes

- **Forgetting to specify the record type**
  - _Mistake:_ Running `dig google.com` and wondering why the TXT verification records aren't showing up.
  - _Why:_ `dig` assumes you want the `A` (IPv4 address) record by default if you do not specify a type. You must append the type: `dig google.com TXT`.
- **Confusing `NXDOMAIN` with Network Failure**
  - _Mistake:_ Seeing an `NXDOMAIN` status and assuming the DNS server is offline or blocking traffic.
  - _Why:_ The nameserver successfully received your packet, processed it, and correctly answered your question. `NXDOMAIN` simply means the authoritative server confirms the domain name definitively _does not exist_. If the server was offline, the command would time out completely.
- **Piping verbose output into scripts**
  - _Mistake:_ `IP=$(dig example.com)` resulting in bash variables filled with comments and metadata headers.
  - _Why:_ Default `dig` output includes semicolons, headers, and question sections. Always use `+short` when assigning the output of `dig` to automation variables.

## Best Practices

- **Alias the formatting:** For daily troubleshooting, the default `dig` output is heavily cluttered. Create a bash alias: `alias digg="dig +noall +answer"`. This filters out the noise, providing only the critical resolution data.
- **Explicitly target public resolvers:** When a user complains a site is down, do not trust `dig domain.com` directly. It queries your local corporate DNS, which may have poisoned or cached stale records. Always verify against an independent global authority: `dig @8.8.8.8 domain.com` to confirm if the issue is global or localized to your network.

## Interview Questions

**Q: You execute `dig example.com` and look at the headers. What does the `AUTHORITY: 0` versus `AUTHORITY: 4` or the lack of an `aa` (Authoritative Answer) flag indicate about the server that responded to you?**
**A:** It indicates whether the DNS server you queried actually owns the domain's zone file, or if it simply had the answer cached from an earlier lookup. If the `aa` flag is missing, the server is a recursive resolver (like Google 8.8.8.8) that fetched the answer from someone else's cache. If the `aa` flag is present, you queried the actual, primary source-of-truth nameserver for that specific domain.

**Q: Explain how the `+trace` option in `dig` fundamentally changes the network path of your DNS query compared to a standard `dig` command.**
**A:** A standard `dig` command sends a recursive query to your local DNS server (e.g., your ISP's router), asking _it_ to go do the work of finding the IP address and returning the final answer. When you use `+trace`, `dig` acts as a recursive resolver itself. It bypasses your local DNS server entirely. It queries the global root (`.`) servers directly, receives a referral, directly queries the TLD (`.com`) servers, receives another referral, and finally directly queries the domain's authoritative nameservers, mapping the exact structural chain.

## Practice Problems

**Problem:** You are verifying ownership of a domain for a third-party email provider. You need to query the `TXT` records of `marketing.example.com`, but you want the output to be absolutely minimal, showing only the raw string values without any headers or query times.
**Hint:** Specify the record type and use the flag that strips all formatting.
**Solution:**

```bash
dig marketing.example.com TXT +short
```

**Problem:** You suspect your local ISP's DNS cache is poisoned. Write the command to query Cloudflare's public DNS server (`1.1.1.1`) directly for the `MX` records of `company.com`, returning only the answer section.
**Hint:** Use the `@` symbol to specify the server, and combine the `+noall` and `+answer` flags.
**Solution:**

```bash
dig @1.1.1.1 company.com MX +noall +answer
```

## References

- [dig(1) - BIND 9 manual page](https://linux.die.net/man/1/dig)
- [DNS and BIND Documentation (ISC)](https://www.isc.org/dns/)
