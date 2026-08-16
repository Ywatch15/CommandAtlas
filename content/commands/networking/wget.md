---
slug: wget
name: wget
aliases: []
category: networking
tags: [download, networking, http, ftp, automation, mirroring]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'download a file from the internet'
  - 'resume a broken download'
  - 'mirror a website recursively'
  - 'download file in background'
  - 'fetch file from URL'
relatedCommands: [curl]
alternatives: [curl]
status: draft
---

## What is it?

`wget` (World Wide Web get) is a robust, non-interactive command-line utility used to download files from web servers using HTTP, HTTPS, and FTP protocols. Distinct from other network tools, it is specifically engineered for reliability in unstable network conditions, featuring built-in capabilities to automatically retry failed connections, resume partially downloaded files, and recursively crawl and mirror entire directory structures or websites for offline viewing.

## Why does it exist?

Downloading large artifacts (like 4GB Linux ISOs or massive database dumps) over flaky SSH connections or unstable public Wi-Fi is fragile; if the connection drops, browsers or simple scripts usually force the user to restart the download from 0%. `wget` exists to provide resilience. Because it runs non-interactively, it can be backgrounded (`nohup wget &`) to survive SSH disconnections. By utilizing standard HTTP Range requests, it seamlessly resumes broken downloads from the exact byte where they failed. Furthermore, its unique HTML parsing engine allows it to act as a web crawler, systematically downloading interconnected pages and converting links to construct functional offline archives.

## Syntax

```bash
wget [option]... [URL]...
```

## Flags

| Flag                             | Description                                                                                                                          | Example                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `-O <file>`, `--output-document` | Explicitly sets the filename and path where the downloaded file will be saved, overriding the server's default name.                 | `wget -O latest_node.tar.gz http://...`  |
| `-O-`                            | A specialized use of `-O`. Downloads the file and pipes the binary stream directly to standard output instead of saving it to disk.  | `wget -O- http://script.sh               | bash` |
| `-c`, `--continue`               | Resumes a partially downloaded file. Checks the size of the local file and requests the server to send only the remaining bytes.     | `wget -c http://domain.com/huge.iso`     |
| `-q`, `--quiet`                  | Turns off `wget` output entirely, suppressing the progress bar and error messages. Ideal for silent cron jobs.                       | `wget -q http://api.com/trigger`         |
| `-b`, `--background`             | Immediately sends `wget` to the background after starting, logging output to `wget-log`. Survives terminal closure.                  | `wget -b http://domain.com/backup.zip`   |
| `--limit-rate=<rate>`            | Throttles the download speed (e.g., `500k`, `2m`) to prevent `wget` from saturating the entire network link during massive pulls.    | `wget --limit-rate=1m http://site/file`  |
| `-r`, `--recursive`              | Instructs `wget` to act as a crawler, following links inside HTML pages to download entire directories or websites.                  | `wget -r http://example.com/docs/`       |
| `-np`, `--no-parent`             | When recursing, guarantees `wget` never ascends to the parent directory, strictly confining the download to the specified path.      | `wget -r -np http://site/pub/`           |
| `-m`, `--mirror`                 | Turns on options suitable for mirroring (`-N -r -l inf --no-remove-listing`), maintaining exact directory structures and timestamps. | `wget -m http://example.com`             |
| `--spider`                       | Behaves as a web spider. It does not download the actual files, but checks if the URLs are valid and reachable (checking for 404s).  | `wget --spider http://site.com/file.zip` |

## Examples

```bash
wget [https://releases.ubuntu.com/22.04/ubuntu-22.04-live-server-amd64.iso](https://releases.ubuntu.com/22.04/ubuntu-22.04-live-server-amd64.iso)
```

> The standard invocation. Initiates an HTTP GET request to the URL. It reads the filename from the URL (`ubuntu-22.04-live-server-amd64.iso`), creates that file in the current working directory, and displays a graphical ASCII progress bar, ETA, and download speed until complete.

```bash
wget -c [https://example.com/massive-database.sql.gz](https://example.com/massive-database.sql.gz)
```

> The resilience pattern. If a 50GB download failed at 45GB, running the exact same command but appending `-c` commands `wget` to inspect the local file, realize 45GB is already present, and use the HTTP `Range` header to request only the final 5GB, saving immense time and bandwidth.

```bash
wget -O /usr/local/bin/docker-compose [https://github.com/docker/compose/releases/download/v2.0.0/docker-compose-linux-x86_64](https://github.com/docker/compose/releases/download/v2.0.0/docker-compose-linux-x86_64)
```

> Overrides the output name. The raw URL filename is long and cumbersome. Using `-O` saves the binary directly into the system `bin` path with a clean, executable name, highly useful during server provisioning scripts.

```bash
wget -qO- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh) | bash
```

> Executes remote code seamlessly. It fetches the script silently (`-q`), pipes the text directly to standard output (`-O-`), and the bash shell executes the incoming stream immediately. (Note: Only do this with absolutely trusted sources).

```bash
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent [http://docs.example.com/](http://docs.example.com/)
```

> The ultimate website archiver. This creates a perfect local, offline copy of documentation. It recursively downloads the site (`--mirror`), fetches all CSS/images needed to display it (`--page-requisites`), converts absolute URLs to relative local file paths (`--convert-links`), and prevents the crawler from accidentally archiving the entire parent domain (`--no-parent`).

## Real-World Scenarios

**Throttled Background Database Transfers**

```bash
wget -b -c --limit-rate=5m [https://internal-backup.corp/db-latest.dump](https://internal-backup.corp/db-latest.dump)
```

> A system administrator needs to pull a 500GB backup file across a constrained WAN link without degrading VoIP traffic for the rest of the office. They initiate a background download (`-b`) throttled to 5 Megabytes per second (`--limit-rate=5m`). The admin can log out, go home, and safely `tail -f wget-log` the next morning to check completion.

**Automated Link Checking (CI/CD)**

```bash
wget --spider --recursive --level=2 [http://staging-environment.local](http://staging-environment.local)
```

> Before promoting a release to production, a deployment pipeline runs this command. `wget` acts as a spider, crawling the homepage and checking all links up to 2 clicks deep. If it encounters a 404 Not Found error (a broken link), `wget` exits with a non-zero status code, actively failing the deployment pipeline before the broken links reach customers.

## When should it NOT be used?

- **Interacting with REST APIs:** **Do not use `wget` for API payloads.** While `wget` can send POST data, it lacks the intuitive header injection, JSON formatting, and HTTP method manipulation of `curl` or `httpie`. `wget` is for files; `curl` is for APIs.
- **Multi-threaded downloading:** **`wget` is strictly single-threaded.** If you are downloading a file from a server with high latency but massive bandwidth, `wget` will underutilize your connection. Use `aria2c` (Aria2) or `axel`, which open multiple parallel HTTP connections to download file chunks simultaneously, vastly accelerating transfer speeds.

## Alternatives

- **`curl -O`:** **Best for generic HTTP tasks.** Pre-installed on almost all modern OSs (including macOS/Windows natively). Functionally equivalent for basic file downloads, though it lacks `wget`'s recursive mirroring capabilities.
- **`aria2`:** **Best for pure speed.** A lightweight multi-protocol & multi-source, cross-platform download utility that utilizes chunked, parallel downloading.
- **`rsync`:** **Best for directory synchronization.** If downloading files from a Linux server you have SSH access to, `rsync` is vastly superior to `wget` as it encrypts the transfer and uses advanced delta-compression.

## How it works internally

When executing a standard HTTP download, `wget` resolves the hostname via DNS and opens a TCP socket to the target server (port 80 or 443).

It constructs an HTTP `GET` request. Crucially, if the `-c` (continue) flag is used, `wget` performs an `lstat()` system call on the local target file to determine its size in bytes (e.g., 5000 bytes). It then injects the `Range: bytes=5000-` HTTP header into its request. The web server (if it supports ranges) responds with an `HTTP 206 Partial Content` status, streaming only the requested remaining bytes.

When executing a recursive download (`-r`), `wget` downloads the initial HTML file. It passes this file through its internal HTML parsing engine. It tokenizes tags like `<a href>`, `<img src>`, and `<link href>`. It adds all discovered URLs to an internal queue. It then systematically works through the queue, opening new HTTP connections to download the assets, recreating the remote directory structure locally using `mkdir()`, until it reaches the user-specified maximum recursion depth (`--level`).

## Performance Notes

- **Connection Reuse (Keep-Alive):** When recursively downloading hundreds of tiny files (like website CSS/JS), establishing a new TCP/TLS connection for every file adds massive latency. `wget` natively supports HTTP Keep-Alive, reusing the same socket to request sequential files, accelerating recursive mirrors.
- **Disk I/O:** `wget` writes to disk in sequential, manageable chunks. However, if downloading to a slow networked filesystem (like an NFS mount), the download speed will be artificially bottlenecked by the local disk write speed, regardless of internet bandwidth.

## Security Notes

- **Arbitrary File Overwrite:** If a malicious actor compromises the server you are running `wget` from, and you are using `wget -r` (recursive), the server can use maliciously crafted filenames containing directory traversal characters (e.g., `../../etc/cron.d/malware`) to attempt to overwrite critical system files. Modern `wget` sanitizes these paths, but running `wget -r` as `root` remains inherently risky.
- **`.wgetrc` Credential Leakage:** Users often store proxy passwords or FTP credentials in `~/.wgetrc`. If this file lacks strict `0600` permissions, other users on a shared system can read the plaintext credentials used for automated downloads.

## Common Mistakes

- **Forgetting `-O-` when piping to scripts**
  - _Mistake:_ Running `wget http://script.sh | bash`.
  - _Why:_ Without the capital `-O-` (Output to stdout) flag, `wget` saves the file to the hard drive as `script.sh`. It sends absolutely no data through the pipe `|` to `bash`, so the command appears to do nothing.
- **Not escaping URLs with ampersands**
  - _Mistake:_ Running `wget http://api.com/file?auth=123&session=456`.
  - _Why:_ The bash shell interprets `&` as "run the previous command in the background." It strips `&session=456`, backgrounds the `wget` process, and downloads the wrong file. Always wrap URLs in single quotes: `wget 'http://api.com/file?auth=123&session=456'`.
- **Accidental infinite recursion**
  - _Mistake:_ Running `wget -r http://wiki.example.com`.
  - _Why:_ If the wiki contains a calendar widget with dynamically generated "Next Month" links, `wget` will click them infinitely, generating gigabytes of useless pages until the server blocks your IP or your disk fills up. Always use `-np` (no-parent) and `-l` (depth limit) when crawling.

## Best Practices

- **Use `wget` for robustness in scripts:** In robust bash scripts, prefer `wget -qO-` over `curl -s`. `wget` has built-in, aggressive automatic retries for network connection resets and timeouts, making it slightly more resilient for unstable infrastructure bootstrapping scripts.
- **Always use `-np` when archiving:** If downloading an open Apache/Nginx directory listing (e.g., `http://server/pub/files/`), always use `wget -r -np`. Without `-np` (no parent), `wget` will follow the "Up to higher level directory" link, accidentally downloading the entire server instead of just the `/files/` folder.

## Interview Questions

**Q: You are downloading a 10GB ISO file using `wget`. At 5GB, your VPN drops, and the download fails. When the network returns, how do you prevent `wget` from starting over from 0%?**
**A:** You execute the exact same command but append the `-c` (or `--continue`) flag. `wget` will check the local filesystem, see the 5GB file, and send an HTTP `Range` request to the server, instructing it to resume the download from that exact byte offset.

**Q: Explain the primary architectural difference between `wget` and `curl`, and provide a scenario where `wget` is the definitively superior choice.**
**A:** `curl` is an HTTP interaction library focused on discrete protocol manipulation and streaming data to standard output (APIs). `wget` is a standalone download agent focused on robust file retrieval and writing to disk. `wget` is definitively superior when you need to recursively download and mirror an entire website or directory structure (e.g., pulling down a package repository offline), because `wget` has an internal HTML parser to crawl links, a feature `curl` entirely lacks.

## Practice Problems

**Problem:** You are provisioning a server. You need to download an executable binary from `https://app.com/binary_v1.0.tar.gz`. However, you want `wget` to automatically rename the file to `app.tar.gz` and save it directly in the `/tmp` directory.
**Hint:** Use the flag that explicitly overrides the output document path and filename.
**Solution:**

```bash
wget -O /tmp/app.tar.gz [https://app.com/binary_v1.0.tar.gz](https://app.com/binary_v1.0.tar.gz)
```

**Problem:** You are downloading a massive file in a shared office, and you don't want to monopolize the bandwidth. Write the command to download `http://huge.com/file.zip`, but strictly limit `wget`'s download speed to 2 Megabytes per second.
**Hint:** Use the specific long-form flag designed for throttling transfer speed.
**Solution:**

```bash
wget --limit-rate=2m [http://huge.com/file.zip](http://huge.com/file.zip)
```

## References

- [wget(1) - Linux man page (GNU Wget)](https://linux.die.net/man/1/wget)
- [GNU Wget Manual](https://www.gnu.org/software/wget/manual/wget.html)
