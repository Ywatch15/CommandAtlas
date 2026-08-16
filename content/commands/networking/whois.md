---
slug: whois
name: whois
aliases: []
category: networking
tags: [networking, osint, domains, dns, internet, troubleshooting]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'find domain owner'
  - 'check domain expiration date'
  - 'lookup ip address owner'
  - 'query registrar information'
  - 'find abuse contact for ip'
relatedCommands: [dig, host, nslookup]
alternatives: []
status: draft
---

## What is it?

`whois` is a widely used TCP-based client utility that queries distributed databases managed by Regional Internet Registries (RIRs) and domain name registrars. It retrieves the registered ownership metadata, contact information, abuse reporting addresses, and authoritative nameserver delegations associated with a specific Internet resource—such as a domain name (e.g., `google.com`) or a public IP address block (e.g., `8.8.8.8`).

## Why does it exist?

The internet is a decentralized network. When a system administrator detects a malicious IP address attacking their servers, or a business needs to know when a competitor's domain name expires, there must be a public ledger connecting raw infrastructure to legal entities. The WHOIS protocol (operating on TCP port 43) exists to provide this transparency. The `whois` CLI tool acts as the native interface for this protocol, automatically routing queries to the correct authoritative database (ARIN, RIPE, APNIC, or specific TLD registrars) to fetch the plaintext registration records.

## Syntax

```bash
whois [options] object
```

## Flags

| Flag                    | Description                                                                                                       | Example                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `-h <server>`, `--host` | Forces the query to be sent to a specific WHOIS server, bypassing the tool's internal routing logic.              | `whois -h whois.verisign-grs.com google.com` |
| `-p <port>`             | Specifies a custom port to connect to if the target WHOIS server is not running on the standard TCP port 43.      | `whois -h internal.corp -p 4343 data`        |
| `-H`                    | Strips out the legal disclaimers, copyright notices, and verbose boilerplate text appended by many WHOIS servers. | `whois -H example.com`                       |
| `-a`                    | (RIPE specific) Instructs the server to search all of its internal databases for exact or partial matches.        | `whois -a 193.0.0.1`                         |
| `-I`                    | (RIPE specific) Requests that the output exclude nested, hierarchically less-specific IP block allocations.       | `whois -I 193.0.0.1`                         |

## Examples

```bash
whois github.com
```

> The standard domain invocation. `whois` identifies the `.com` Top Level Domain (TLD), connects to the Verisign root server to find the specific registrar (e.g., MarkMonitor), and then queries that registrar to return the domain's creation date, expiration date, assigned nameservers, and redacted owner contact info.

```bash
whois 1.1.1.1
```

> The standard IP invocation. `whois` detects an IPv4 address and queries the Regional Internet Registries (like ARIN or APNIC). The output reveals the exact autonomous system (AS), the corporate entity that owns the IP block (Cloudflare), and the `Abuse` email address to contact regarding malicious activity.

```bash
whois -H example.com | grep -i "Expiration"
```

> A highly common administrative pipeline. It strips the massive legal boilerplate blocks (`-H`) from the response and uses `grep` to isolate exactly when the domain registration expires. This is often used in simple bash scripts to alert administrators before domains lapse.

```bash
whois -h whois.arin.net "n + 8.8.8.8"
```

> Advanced explicit querying. Instead of relying on the CLI's internal logic, this connects directly to the American Registry for Internet Numbers (ARIN) and utilizes specific ARIN database flags (like `n +`) to request highly specific network-level CIDR blocks and organizational handles.

## Real-World Scenarios

**Automated Abuse Reporting (Security Operations)**

```bash
ATTACKER_IP="203.0.113.42"
ABUSE_EMAIL=$(whois $ATTACKER_IP | grep -i "abuse-mailbox" | awk '{print $2}' | head -n 1)
mail -s "Malicious Traffic Report" $ABUSE_EMAIL < logs.txt
```

> When a Security Operations Center (SOC) detects an IP address brute-forcing their SSH servers, an automated script runs `whois` against the IP. It parses the plain-text output to extract the specific abuse contact email registered by the ISP holding that IP block, and automatically generates an incident report containing the firewall logs.

**Domain Acquisition Auditing**

```bash
whois target-startup.io
```

> During corporate acquisitions, IT architects use `whois` to audit a target company's domain portfolio. The output reveals who the domain registrar is (e.g., GoDaddy vs AWS Route53), which indicates where DNS migration tasks will need to occur, and checks the domain status codes (e.g., `clientTransferProhibited`) to gauge migration difficulty.

## When should it NOT be used?

- **Retrieving Personal Contact Info (Post-GDPR):** **Do not expect to find names and phone numbers.** Following the implementation of GDPR and similar privacy laws, almost all registrars redact the Registrant Name, Phone, and Email addresses for domains. `whois` is largely only useful for technical metadata (Nameservers, Expiration) and corporate IP block ownership.
- **Continuous Scripted Polling:** **Do not put `whois` in a tight loop.** WHOIS servers heavily rate-limit IP addresses. If you run a script that performs 100 `whois` queries a minute to check domain availability, the registry (like ARIN or Verisign) will temporarily blacklist your IP. For bulk availability checking, use dedicated API providers.
- **Checking DNS Resolution:** `whois` tells you who _owns_ a domain and where its authoritative nameservers are located. It does _not_ tell you what IP address the domain resolves to. Use `dig` or `host` for DNS routing resolution.

## Alternatives

- **RDAP (Registration Data Access Protocol):** **The modern standard.** WHOIS is a legacy, unauthenticated plaintext protocol. RDAP is the HTTP/REST-based successor mandated by ICANN, offering structured JSON responses. Many modern environments are transitioning to RDAP query tools.
- **ICANN / ARIN Web Portals:** **Best for human readability.** If the command line tool lacks the logic to find a specific new TLD's registry, the official web portals abstract the lookup perfectly and handle CAPTCHAs required by strict registrars.

## How it works internally

`whois` is an incredibly simplistic, plaintext protocol operating over TCP port 43.

When you run `whois example.com`, the utility evaluates the string. If it's a domain, it extracts the Top-Level Domain (TLD), such as `.com`. The `whois` binary contains an internal, hardcoded list mapping TLDs to their authoritative root WHOIS servers (e.g., `.com` maps to `whois.verisign-grs.com`).

The CLI opens a standard TCP connection to port 43 on that server, transmits the string `example.com\r\n`, and waits. The server responds with a block of text.

Often, the root TLD server operates on a "Thin" WHOIS model. It doesn't have the full details; it only knows which registrar (e.g., Namecheap) sold the domain. The server response will contain a referral string: `WHOIS Server: whois.namecheap.com`.

The `whois` CLI is intelligent enough to parse this referral. It automatically drops the TCP connection to Verisign, opens a new TCP connection to port 43 on `whois.namecheap.com`, and repeats the query. The registrar, operating a "Thick" WHOIS model, returns the full detailed plaintext payload, which the CLI dumps directly to `stdout`.

## Performance Notes

- **High Latency:** Because a single `whois` command may require opening and closing multiple TCP connections globally to chase referrals (from root server to registrar server), the command often takes 1 to 3 seconds to complete.

## Security Notes

- **Plaintext Protocol:** TCP Port 43 uses absolutely no encryption. Both your query and the returned data travel across the internet in plaintext. In environments with strict outbound firewall policies, port 43 is frequently blocked, causing the command to hang and timeout.
- **Malicious Output:** Because the WHOIS response is arbitrary text controlled by third parties, executing `whois` against a maliciously registered domain could theoretically result in terminal escape sequence injection if the terminal emulator is vulnerable. Never pipe untrusted `whois` output into `eval` or shell execution logic.

## Common Mistakes

- **Including `http://` or `www.` in queries**
  - _Mistake:_ Running `whois https://www.google.com`.
  - _Why:_ WHOIS databases track base domain registrations and IP blocks. They have no concept of HTTP protocols or subdomains. Providing these prefixes results in `No match for domain`. Always query the apex domain: `whois google.com`.
- **Grepping strict fields across TLDs**
  - _Mistake:_ Writing a script using `whois $DOMAIN | grep "Registry Expiry Date"`.
  - _Why:_ The WHOIS protocol enforces absolutely no standardization on text formatting. While a `.com` registrar might output "Registry Expiry Date:", a `.io` or `.co.uk` registrar might output "Expires on:" or "Expiry date:". Scripts parsing raw `whois` text are notoriously brittle and break frequently.

## Best Practices

- **Use `whois` for IP ASNs:** When debugging routing issues, `whois <IP>` is incredibly valuable for identifying the Autonomous System Number (ASN) and routing policies of the ISP dropping your packets, facilitating BGP troubleshooting.
- **Filter the Boilerplate:** Use the `-H` flag habitually. It hides the massive walls of legal terms of service that registrars prepend to their responses, making the actual technical data much easier to locate in the terminal.

## Interview Questions

**Q: You write a script to monitor when your company's domains expire. The script runs `whois mycompany.com | grep "Expiry Date"`. It works perfectly for 5 years, and then suddenly stops matching anything, despite the domain still being active. What architectural flaw in the WHOIS protocol causes this?**
**A:** The WHOIS protocol does not enforce a structured data format (like JSON or XML). It returns unstructured plaintext strings defined arbitrarily by individual registrars. If the registrar simply updates their backend software and changes the output string from "Expiry Date:" to "Expiration Date:", the rigid `grep` command will fail silently. (This is why the industry is migrating to the structured RDAP protocol).

**Q: Explain the difference between how `dig` and `whois` interrogate internet infrastructure.**
**A:** `dig` queries the Domain Name System (DNS) via UDP port 53. It asks authoritative nameservers for technical routing records (like IP addresses or MX records) required to make network connections. `whois` queries Regional Internet Registries via TCP port 43. It asks administrative databases for the legal ownership metadata (contacts, expiration dates, registrars) of a domain or IP block, completely independent of how that domain is routed.

## Practice Problems

**Problem:** You are investigating a suspicious IP address (`198.51.100.14`). You need to identify the owner of this IP address, but you want to suppress the massive legal copyright disclaimers that WHOIS servers usually print at the top and bottom of the response.
**Hint:** Use the flag specifically designed to hide legal disclaimers.
**Solution:**

```bash
whois -H 198.51.100.14
```

**Problem:** You suspect your local `whois` client is routing a query incorrectly for a specific `.tech` domain. Write the command to bypass the default routing logic and force the client to query `whois.nic.tech` directly for the domain `startup.tech`.
**Hint:** Use the flag that explicitly designates the target host server.
**Solution:**

```bash
whois -h whois.nic.tech startup.tech
```

## References

- [whois(1) - Linux man page](https://linux.die.net/man/1/whois)
- [ICANN WHOIS Portal](https://lookup.icann.org/)
