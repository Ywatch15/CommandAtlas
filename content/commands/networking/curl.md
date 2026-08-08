---
slug: curl
name: curl
aliases: []
category: networking
tags:
  - curl
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - download URL content
  - make HTTP request
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`curl` is a command-line tool for transferring data to or from a server using protocols such as HTTP, HTTPS, FTP, and SFTP.

## Why does it exist?

`curl` provides a scriptable, reliable protocol client for inspecting APIs, downloading files, testing endpoints, and interacting with remote network services.

## Syntax

```bash
curl [options] [URL...]
```

## Flags

| Flag | Description                             | Example                              |
| ---- | --------------------------------------- | ------------------------------------ |
| `-i` | Include HTTP response headers in output | `curl -i https://example.com`        |
| `-X` | Specify custom HTTP request method      | `curl -X POST https://api.com`       |
| `-d` | Send HTTP POST data                     | `curl -d "name=val" https://api.com` |

## Examples

```bash
curl -i https://api.github.com
```

> Fetches GitHub API response with headers.

## Real-World Scenarios

**Testing REST APIs**: Verifying response status codes, headers, and payloads during API development.

## When should it NOT be used?

- **Recursive website mirroring**: `wget -r` is better designed for recursive web crawling and downloading full sites.

## Alternatives

- **`wget`**: Command-line file downloader designed for recursive retrievals.

## How it works internally

`curl` leverages `libcurl` to manage sockets, SSL/TLS handshakes via OpenSSL/BoringSSL, and protocol state machines.

## Performance Notes

Lightweight memory footprint with minimal startup delay.

## Security Notes

Use `-k` or `--insecure` only in isolated debugging contexts; never bypass SSL certificate validation in production scripts.

## Common Mistakes

- **Forgetting `-O` or `-o` when saving output**: Running `curl URL` dumps raw response data directly to the terminal stdout.

## Best Practices

- Use `-s` (silent) and `-S` (show errors) together in automated scripts to avoid cluttering output logs.

## Interview Questions

**Q:** How do you send a JSON body in a POST request with `curl`?
**A:** `curl -X POST -H "Content-Type: application/json" -d '{"key":"value"}' URL`

## Practice Problems

**Problem:** Download a file and save it with the remote filename.
**Solution:** `curl -O https://example.com/archive.tar.gz`

## References

- [curl man page](https://curl.se/docs/manpage.html)
