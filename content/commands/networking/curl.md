---
slug: curl
name: curl
aliases:
  - cURL
category: networking
tags:
  - http
  - api
  - networking
  - data-transfer
  - rest
  - debugging
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
  - cmd
  - sh
intentPhrases:
  - make an http request
  - download a file from url
  - test rest api endpoint
  - send post request with json
  - view http response headers
relatedCommands:
  - wget
  - ping
  - dig
  - brew
  - jq
  - kubectl-api-resources
alternatives:
  - wget
  - kubectl-api-resources
  - invoke-restmethod
  - invoke-webrequest
status: draft
---

## What is it?

`curl` (Client URL) is a ubiquitous command-line tool and library (`libcurl`) for transferring data using network protocols. While it supports dozens of protocols (including FTP, IMAP, POP3, and SCP), it is most heavily utilized as the definitive tool for interacting with HTTP and HTTPS endpoints. It allows developers and administrators to craft precise HTTP requests, manipulate headers, inject payloads, and inspect complex SSL/TLS negotiation details natively from the terminal.

## Why does it exist?

Before the standardization of REST APIs, interacting with web servers from the command line required complex Telnet sessions or basic tools like `wget` (which were strictly designed for file mirroring). `curl` exists to provide an execution engine for the modern web. It acts as a scriptable, headless web browser that doesn't render HTML, but instead gives engineers total control over the HTTP request lifecycle—enabling the testing of authentication flows, the upload of binary payloads, the debugging of broken redirect chains, and the automation of CI/CD API webhooks without requiring heavy graphical tools like Postman.

## Syntax

```bash
curl [options...] <url>
```

## Flags

| Flag               | Description                                                                                                               | Example                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `-X`, `--request`  | Specifies a custom HTTP request method to use (e.g., `GET`, `POST`, `PUT`, `DELETE`).                                     | `curl -X DELETE https://api.com/user/1`      |
| `-d`, `--data`     | Sends the specified data in a `POST` request. Defaults the `Content-Type` to `application/x-www-form-urlencoded`.         | `curl -d "name=admin" https://api.com/login` |
| `-H`, `--header`   | Injects an extra custom header into the HTTP request. Can be used multiple times.                                         | `curl -H "Authorization: Bearer $TOKEN"`     |
| `-i`, `--include`  | Includes the HTTP response headers in the output before printing the response body.                                       | `curl -i https://example.com`                |
| `-I`, `--head`     | Fetches the HTTP headers only by sending an HTTP `HEAD` request instead of a `GET` request.                               | `curl -I https://example.com`                |
| `-v`, `--verbose`  | Makes the operation highly conversational. Shows the exact TLS handshake, sent headers, and received headers.             | `curl -v https://api.com`                    |
| `-L`, `--location` | Instructs `curl` to automatically follow HTTP 3xx Redirect headers (e.g., following `http://` to `https://`).             | `curl -L http://github.com`                  |
| `-k`, `--insecure` | Disables strict SSL/TLS certificate verification. Necessary when querying internal servers with self-signed certificates. | `curl -k https://10.0.1.5`                   |
| `-s`, `--silent`   | Suppresses the progress meter and error messages. Essential when piping output to tools like `jq`.                        | `curl -s https://api.com/data                | jq .` |
| `-o`, `--output`   | Writes the output to the specified local file instead of printing it to standard output.                                  | `curl -o data.zip https://server.com/file`   |

## Examples

```bash
curl [https://api.github.com/zen](https://api.github.com/zen)
```

> The standard invocation. Sends an HTTP `GET` request to the specified URL and outputs the raw response body directly to the terminal.

```bash
curl -X POST [https://api.stripe.com/v1/charges](https://api.stripe.com/v1/charges) \
  -H "Authorization: Bearer sk_test_123" \
  -d "amount=2000" \
  -d "currency=usd"
```

> Constructs a complex REST API payload. It overrides the default `GET` method with `POST`, injects a secret authentication header, and attaches two `x-www-form-urlencoded` data attributes to the request body.

```bash
curl -s -w "\nHTTP Code: %{http_code}\nTime: %{time_total}s\n" -o /dev/null [https://example.com](https://example.com)
```

> A powerful latency and availability monitor. It silences the progress bar (`-s`), discards the actual HTML body (`-o /dev/null`), and uses the write-out (`-w`) flag to print only the underlying HTTP status code and the exact total request time measured by `libcurl`.

```bash
curl -X POST [https://api.com/data](https://api.com/data) \
  -H "Content-Type: application/json" \
  -d '{"key1":"value1", "key2":"value2"}'
```

> Bypasses the default form-encoding to send a strict JSON payload. The `-H` flag explicitly overwrites the Content-Type, ensuring the backend API parses the raw `-d` string as valid JSON.

```bash
curl -I -L [https://google.com](https://google.com)
```

> Evaluates redirection architecture. It fetches headers only (`-I`) and follows redirects (`-L`). This reveals the chain of HTTP 301/302 responses as the connection jumps from `http` to `https`, or `google.com` to `www.google.com`.

## Real-World Scenarios

**Bypassing DNS for Virtual Host Testing**

```bash
curl -H "Host: my-new-site.com" [http://192.168.1.50](http://192.168.1.50)
```

> When migrating a website to a new server, the DNS record has not yet propagated. Instead of editing the local `/etc/hosts` file, a developer uses `curl` to point directly to the new server's IP address while explicitly injecting the `Host` header, forcing the NGINX backend to serve the specific virtual host configuration.

**Uploading Files via Multipart Form Data**

```bash
curl -X POST [https://file.io/upload](https://file.io/upload) \
  -F "userid=123" \
  -F "file=@/path/to/backup.tar.gz"
```

> To interact with file-upload APIs, `curl` utilizes the `-F` flag to construct an RFC 2388 `multipart/form-data` request. Prepending the `@` symbol instructs `curl` to read the binary contents of the local file and stream them securely to the server as a discrete form part.

## When should it NOT be used?

- **Recursive File Mirroring:** **Do not use `curl` to download entire directory trees.** `curl` does not understand HTML link parsing or recursive directory crawling. Use `wget -r` or `rsync` to mirror folders.
- **Handling complex OAuth/OIDC flows:** **Do not use `curl` for multi-step browser authentication.** Handshaking tokens that require JavaScript execution, captcha solving, or cookie-based redirects are impossible in `curl`. Use Postman, Insomnia, or a headless browser automation tool like Puppeteer.

## Alternatives

- **`wget`:** **Best for file downloads.** While `curl` streams to `stdout` by default, `wget` defaults to saving files to disk. It also inherently supports recursive website mirroring and resilient resume capabilities.
- **`httpie`:** **Best for human ergonomics.** A modern, colorized command-line HTTP client that formats JSON beautifully by default and uses a much simpler, intuitive syntax for injecting headers and data.
- **Postman / Insomnia:** **Best for persistent API management.** Graphical interfaces that allow developers to save collections, build environments, and script tests visually.

## How it works internally

`curl` is a command-line wrapper around `libcurl`, a battle-tested, highly portable C library.

When you execute a command, `curl` performs a sequence of underlying operations:

1.  **Resolution:** It uses the host OS resolver (or c-ares if compiled) to translate the URL's hostname into an IP address.
2.  **Connection:** It establishes a standard TCP socket connection. If the URL is `https://`, `libcurl` utilizes the underlying TLS backend (like OpenSSL, GnuTLS, or Secure Transport) to negotiate the TLS handshake, verifying the server's certificate against the local CA bundle.
3.  **Construction:** It constructs the raw text of the HTTP request. This includes the Request Line (e.g., `GET / HTTP/1.1`) followed by the injected `-H` headers and a blank line marking the end of the headers.
4.  **Transmission & Reception:** It streams this raw text over the socket. It then reads the incoming stream, separating the HTTP response headers from the body payload based on the protocol specification, pushing the body bytes to standard output or a file.

## Performance Notes

- **Connection Reuse:** In automation scripts, running `curl` 100 times in a bash loop forces 100 separate TCP and TLS handshakes, which is highly inefficient. If querying the same API, use a single `curl` execution and pass multiple URLs, allowing `libcurl` to utilize HTTP Keep-Alive and reuse the established socket.
- **Streaming Large Files:** `curl` uses minimal memory because it streams data. It reads incoming network buffers and writes them directly to `stdout` or a file, making it perfectly safe to download a 50GB file on a server with only 512MB of RAM.

## Security Notes

- **The `-k` (--insecure) Danger:** Using `-k` ignores certificate validation errors (expired, self-signed, wrong host). In production scripts, this opens the pipeline to trivial Man-In-The-Middle (MitM) attacks. Only use `-k` against strictly isolated localhost endpoints.
- **Credential Leakage:** Passing `-u user:password` places credentials in plaintext in the shell's `.bash_history` and makes them visible to the `ps` command. Use `-u user` to prompt for the password interactively, or use `-K` (`--config`) to read secrets safely from a locked configuration file.

## Common Mistakes

- **Forgetting to quote the URL**
  - _Mistake:_ Running `curl https://api.com?param1=foo&param2=bar`.
  - _Why:_ The bash shell interprets the `&` as a background execution operator. The shell instantly backgrounds `curl https://api.com?param1=foo` and tries to execute `param2=bar` as a new command. Always wrap URLs containing ampersands in single quotes: `curl 'https://api.com?param1=foo&param2=bar'`.
- **Piping verbose output to a file**
  - _Mistake:_ Running `curl -v https://api.com > output.txt` and discovering the verbose headers aren't in the file.
  - _Why:_ `curl` writes the actual payload to `stdout`, but it writes verbose debugging information and the progress meter to `stderr`. To capture the verbose headers in a file alongside the payload, you must merge the streams or use trace files.
- **JSON Data Formatting**
  - _Mistake:_ Using `-d "{'key':'value'}"`.
  - _Why:_ JSON strictly requires double quotes for keys and string values. Single quotes invalidate the JSON payload, causing backend parsers to throw HTTP 400 Bad Request errors. Use `-d '{"key":"value"}'`.

## Best Practices

- **Use `-sSfL` for robust scripting:** When downloading a binary in a Dockerfile or bash script, use `curl -sSfL url > file`. This silences the progress bar (`-s`), forces `curl` to fail with a non-zero exit code on HTTP errors like 404 (`-f`), and follows redirects (`-L`), guaranteeing the script halts if the download breaks.
- **Load data from files:** Instead of writing massive inline strings for POST payloads, save the payload to `payload.json` and use `-d @payload.json`. This keeps terminal commands readable and protects against shell quoting hell.

## Interview Questions

**Q: You run a `curl` command against a REST API, and it returns no output and an exit code of `0`. You suspect the server is returning an HTTP 401 Unauthorized or 500 Internal Server Error with a blank body. What flag do you add to `curl` to see the exact HTTP response code and headers?**
**A:** You should add the `-i` (or `--include`) flag. This instructs `curl` to prepend the HTTP response headers (which contain the `HTTP/1.1 500 Internal Server Error` status line) to the output before printing the body, providing absolute clarity on the server's response.

**Q: A bash script contains `curl -X POST -d "param=value" https://api.com`. A junior developer reviews it and says the `-X POST` part is redundant. Are they correct, and why?**
**A:** Yes, they are correct. When you supply the `-d` (or `--data`) flag, `libcurl` automatically infers that a payload is being sent and implicitly switches the HTTP request method from the default `GET` to `POST`. Explicitly declaring `-X POST` alongside `-d` is unnecessary boilerplate.

## Practice Problems

**Problem:** You are integrating with a new API. You need to send a `PUT` request to `https://api.example.com/config`. You must send a JSON payload located in a local file named `config.json`, and explicitly set the content-type header to application/json.
**Hint:** Specify the custom request method, inject the header, and use the `@` symbol to load the data file.
**Solution:**

```bash
curl -X PUT -H "Content-Type: application/json" -d @config.json [https://api.example.com/config](https://api.example.com/config)
```

**Problem:** You want to download a bash script from `http://setup.sh` and execute it immediately, but the URL performs a 301 Redirect to an HTTPS location. Write the command to fetch the script and follow the redirect, silencing the progress meter so it pipes cleanly into bash.
**Hint:** Combine the flags for silent execution and location following, then pipe to the shell.
**Solution:**

```bash
curl -sL [http://setup.sh](http://setup.sh) | bash
```

## References

- [curl(1) - Linux man page](https://linux.die.net/man/1/curl)
- [Everything curl - The exhaustive guide](https://everything.curl.dev/)
