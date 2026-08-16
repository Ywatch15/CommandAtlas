---
slug: host
name: host
aliases: []
category: networking
tags: [dns, networking, troubleshooting, resolution, bind]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'perform simple dns lookup'
  - 'resolve hostname to ip'
  - 'find mx records for domain'
  - 'check reverse dns'
  - 'query a nameserver directly'
relatedCommands: [dig, nslookup, ping, whois]
alternatives: [dig, nslookup]
status: draft
---

## What is it?

`host` is a simple, streamlined command-line utility used to perform Domain Name System (DNS) lookups. Maintained as part of the BIND 9 suite, it resolves human-readable domain names into IP addresses and vice versa. It strips away the complex, verbose protocol headers provided by its sibling tool, `dig`, favoring clean, plain-English sentence outputs optimized for rapid human comprehension and basic scripting.

## Why does it exist?

While `dig` is the definitive tool for deep DNS protocol debugging, its massive, multi-line output is often overwhelming for users who simply need to answer the question, "What is the IP address of this website?" `host` exists to provide an elegant, user-friendly frontend to the BIND DNS resolver libraries. It handles the most common queries (like `A`, `AAAA`, and `MX` records) out-of-the-box without requiring complex flags, acting as the ideal lightweight utility for rapid network sanity checks.

## Syntax

```bash
host [options] name [server]
```

## Flags

| Flag          | Description                                                                                                                                             | Example                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `-t <type>`   | Explicitly queries for a specific DNS record type (e.g., `A`, `AAAA`, `MX`, `TXT`, `CNAME`, `ANY`).                                                     | `host -t MX example.com` |
| `-a`          | "All" flag. Equivalent to `-v -t ANY`. Attempts to retrieve all publicly accessible DNS records for the domain and outputs them in verbose BIND format. | `host -a google.com`     |
| `-v`          | Verbose mode. Discards the simple plain-English sentences and outputs the raw DNS packet data, looking functionally identical to `dig`.                 | `host -v github.com`     |
| `-4`          | Forces `host` to use only IPv4 transport when communicating with the upstream nameservers.                                                              | `host -4 example.com`    |
| `-6`          | Forces `host` to use only IPv6 transport when communicating with the upstream nameservers.                                                              | `host -6 example.com`    |
| `-W <wait>`   | Sets the timeout duration in seconds to wait for a reply from the nameserver before giving up.                                                          | `host -W 3 example.com`  |
| `-R <number>` | Defines the number of times `host` will retry a UDP query if the nameserver fails to respond.                                                           | `host -R 1 example.com`  |
| `-c <class>`  | Specifies the DNS query class (e.g., `IN` for Internet, `CH` for Chaos). Rarely changed from the default `IN`.                                          | `host -c IN example.com` |

## Examples

```bash
host google.com
```

> The standard invocation. By default, it aggressively queries for `A` (IPv4), `AAAA` (IPv6), and `MX` (Mail Exchange) records simultaneously, returning simple sentences like `google.com has address 142.250.190.46`.

```bash
host 8.8.8.8
```

> Automatically performs a reverse DNS (rDNS) lookup. Because the argument is detected as an IP address rather than a hostname, `host` implicitly converts it into the `in-addr.arpa` format and queries the `PTR` record, returning the domain name pointing to that IP.

```bash
host -t TXT _dmarc.paypal.com
```

> Queries specifically for Text (`TXT`) records. This is an extremely common workflow for system administrators verifying domain ownership tokens, SPF anti-spam policies, or DMARC configurations.

```bash
host example.com 1.1.1.1
```

> Bypasses the local system's default DNS resolvers defined in `/etc/resolv.conf`. It routes the query directly to the secondary argument (`1.1.1.1`), forcing Cloudflare's public DNS server to resolve the domain.

```bash
host -t CNAME [www.github.com](https://www.github.com)
```

> Explicitly verifies Canonical Name (alias) routing. Instead of implicitly following the alias chain to print the final IP address, it cleanly outputs exactly what domain the `www` subdomain is aliased to.

## Real-World Scenarios

**Basic Mail Routing Verification**

```bash
host -t MX example.com
```

> When users complain that email delivery is failing, IT support staff immediately execute this command. The clean output (`example.com mail is handled by 10 aspmx.l.google.com.`) allows them to instantly verify if the domain's DNS is routing mail to the correct corporate infrastructure, and visually inspect the routing priority integers.

**Quick Sanity Checks in Scripts**

```bash
if host example.com > /dev/null; then
    echo "Internet connectivity and DNS are working."
fi
```

> Bash scripts often need to verify external connectivity before attempting to download massive payloads via `curl`. By relying on `host` and suppressing the output to `/dev/null`, the script relies on the exit code (`0` for success, non-zero for failure) to validate that DNS resolution is fully functional.

## When should it NOT be used?

- **Deep DNS Debugging:** **Do not use `host` to debug DNSSEC or zone transfers.** `host` is intentionally simplistic. If you need to see authoritative flags, query timings, or TTL (Time To Live) countdowns to verify cache expiration, you must use `dig`.
- **Testing `/etc/hosts` overrides:** **`host` ignores local configurations.** Like `dig`, `host` executes raw DNS queries over port 53. It completely bypasses your `/etc/hosts` file and the OS-level NSS (Name Service Switch) stack. If you need to see how the _OS_ will route a connection (including local overrides), use `getent hosts domain.com` or `ping`.

## Alternatives

- **`dig`:** **Best for professionals and deep debugging.** The heavyweight sibling to `host`. Outputs complete protocol headers, making it mandatory for complex structural troubleshooting.
- **`nslookup`:** **Best for cross-platform legacy muscle memory.** Ubiquitous on Windows machines, but officially deprecated in the Linux ecosystem due to historical flaws in its internal resolution engine.
- **`resolvectl query`:** **Best for modern systemd environments.** Interacts directly with `systemd-resolved`, respecting local routing tables, split-DNS VPN configurations, and local mDNS caching.

## How it works internally

`host` is developed by the Internet Systems Consortium (ISC) and shares its underlying resolution engine (libdns) with `dig` and the BIND nameserver.

When executed, `host` reads the local `/etc/resolv.conf` file to determine which IP addresses to send queries to. It constructs a raw DNS query packet, opens a UDP socket, and transmits the packet to port 53 of the target nameserver.

If the user does not specify a `-t` flag, `host` executes a heavily opinionated workflow. It actually fires off three separate queries in rapid succession: an `A` record query, an `AAAA` record query, and an `MX` record query.

It receives the binary UDP responses, parses the RDATA sections, and translates the hex payloads into structured, plain-English sentences (e.g., formatting an IPv4 hex payload into dotted-decimal notation). If the UDP response packet triggers the truncation bit (`TC`), `host` automatically tears down the UDP socket and retries the query over a reliable TCP connection to ensure massive TXT payloads aren't fragmented and lost.

## Performance Notes

- **Timeout Stacking:** If your `/etc/resolv.conf` contains an unreachable primary nameserver, `host` will wait for a timeout (defaulting to several seconds) before trying the secondary nameserver. Because a naked `host` command sends three separate queries (`A`, `AAAA`, `MX`), this timeout penalty is multiplied, causing the command to hang for an exceptionally long time compared to a targeted `dig` command.

## Security Notes

- **Information Leakage (ANY Queries):** Historically, administrators used `host -a` or `-t ANY` to dump a domain's entire zone file. Modern DNS providers (like Cloudflare) strictly drop or synthesize `ANY` queries, as they are frequently exploited in UDP amplification DDoS attacks. Using `-t ANY` will rarely yield accurate results on the modern internet.

## Common Mistakes

- **Using `host` to check TTLs**
  - _Mistake:_ Changing a DNS record, running `host domain.com`, and wondering why the IP hasn't changed, but being unable to see the cache expiration timer.
  - _Why:_ `host` intentionally hides the TTL (Time To Live) metric to keep the output clean. To see exactly how many seconds are left before the intermediate DNS server purges its stale cache and fetches the new IP, you must use `dig`.
- **Testing split-horizon VPNs**
  - _Mistake:_ Connecting to a corporate VPN via NetworkManager, running `host internal.corp`, and getting `not found`.
  - _Why:_ Modern Linux network managers use `systemd-resolved` or `dnsmasq` as local stubs (`127.0.0.53`) to route DNS queries dynamically based on the interface (split-DNS). `host` sometimes bypasses these complex local routing rules, querying the raw global nameserver directly.

## Best Practices

- **Use Specific Queries in Scripts:** If you are scripting an IP extraction, never rely on the default multi-query behavior. Always specify `-t A` to guarantee a single query is sent, avoiding unnecessary network traffic and parsing logic.
- **Identify Nameservers Quickly:** If you need to figure out who hosts a client's DNS, rely on `host -t NS target.com`. This cleanly outputs the authoritative nameservers, immediately pointing you toward Route53, GoDaddy, or Cloudflare interfaces for further configuration.

## Interview Questions

**Q: You run `host 10.0.0.5` and the command returns `5.0.0.10.in-addr.arpa domain name pointer server.local.`. How did the `host` utility know what protocol query to construct without you passing the `-t` flag?**
**A:** `host` contains a built-in heuristic parser. When it analyzes the command line argument, it recognizes the strict numeric and dot structure of an IPv4 or IPv6 address. Recognizing it is an IP and not a hostname, it automatically reverses the IP octets, appends the `.in-addr.arpa` suffix, and constructs a specialized `PTR` (Pointer) record query to execute a reverse DNS lookup.

**Q: A script uses `host my-database.local` to resolve an IP address, but it fails. However, running `ping my-database.local` successfully contacts the server. Why does `ping` succeed while `host` fails?**
**A:** `host` relies strictly on the DNS protocol (Port 53 UDP/TCP) and bypasses the operating system's Name Service Switch (NSS) stack. `ping` relies on the OS's `gethostbyname()` standard C library function. The `.local` suffix implies the use of Multicast DNS (mDNS / Bonjour / Avahi). The OS NSS stack natively resolves mDNS locally, but because the strict DNS server queried by `host` has no knowledge of local ad-hoc networks, the `host` command fails.

## Practice Problems

**Problem:** A client claims they have updated their domain verification text string, but their email provider isn't validating it. You need to query the `TXT` records for `client.com`, but you must explicitly bypass your local ISP's cache and ask Google's public DNS server (`8.8.8.8`) for the answer. Write the command.
**Hint:** Provide the record type flag, the domain, and the target server as arguments.
**Solution:**

```bash
host -t TXT client.com 8.8.8.8
```

**Problem:** You only need the IP address of `api.service.com`. Write the command to query specifically for the IPv4 `A` record, ensuring the utility does not waste time looking up IPv6 or Mail Exchanger records.
**Hint:** Explicitly state the record type.
**Solution:**

```bash
host -t A api.service.com
```

## References

- [host(1) - BIND 9 manual page](https://linux.die.net/man/1/host)
- [DNS and BIND Documentation (ISC)](https://www.isc.org/dns/)
