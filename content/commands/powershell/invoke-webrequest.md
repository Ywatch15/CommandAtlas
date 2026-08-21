---
slug: invoke-webrequest
name: Invoke-WebRequest
aliases:
  - iwr
  - curl
  - wget
category: powershell
tags:
  - powershell
  - http
  - web
  - download
  - headers
  - debugging
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - download file from url powershell
  - check http status code
  - fetch web page content
  - view http response headers
  - powershell curl equivalent
relatedCommands:
  - invoke-restmethod
alternatives:
  - invoke-restmethod
  - curl
status: draft
---

## What is it?

`Invoke-WebRequest` is the foundational HTTP/HTTPS client cmdlet in PowerShell. It sends requests to web pages or web services and returns a comprehensive `HtmlWebResponseObject` that encapsulates the entire transaction—including the raw content, HTTP status codes, raw response headers, and cookies—making it essential for web scraping, file downloading, and protocol-level network debugging.

## Why does it exist?

While UNIX environments rely on external binaries like `curl` or `wget` to interact with web endpoints, native PowerShell required a built-in object-oriented equivalent. `Invoke-WebRequest` exists to fulfill this role. Unlike `Invoke-RestMethod` (which abstracts the protocol to deliver parsed data payloads), `Invoke-WebRequest` exposes the raw transport layer variables, allowing engineers to audit HTTP redirects, intercept session cookies, and download massive binary artifacts directly to disk.

## Syntax

```powershell
Invoke-WebRequest [-Uri] <uri> [-Method <WebRequestMethod>] [-OutFile <string>] [options]
```

## Flags

| Flag                    | Description                                                                                      | Example                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `-Uri`                  | Specifies the Uniform Resource Identifier (URL) of the target web resource.                      | `Invoke-WebRequest -Uri "http://example.com"`        |
| `-Method`               | Specifies the HTTP method used (e.g., `Get`, `Post`, `Head`, `Options`).                         | `Invoke-WebRequest -Method Head`                     |
| `-OutFile`              | Streams the HTTP response payload directly into a specified file on disk, rather than memory.    | `Invoke-WebRequest -Uri $Url -OutFile installer.exe` |
| `-Headers`              | A hash table of explicit HTTP headers to include in the request.                                 | `Invoke-WebRequest -Headers @{"Accept"="text/html"}` |
| `-Body`                 | The data payload to send with the request (used with POST/PUT).                                  | `Invoke-WebRequest -Method Post -Body $Data`         |
| `-UseBasicParsing`      | (PS 5.1 only) Disables reliance on the Internet Explorer DOM parsing engine (always on in PS6+). | `Invoke-WebRequest -Uri $Url -UseBasicParsing`       |
| `-SkipCertificateCheck` | (PS 6+) Bypasses TLS/SSL certificate validation errors, accepting self-signed certs.             | `Invoke-WebRequest -Uri $Url -SkipCertificateCheck`  |
| `-MaximumRedirection`   | Limits the number of HTTP 301/302 redirects the cmdlet will automatically follow.                | `Invoke-WebRequest -Uri $Url -MaximumRedirection 0`  |
| `-TimeoutSec`           | Specifies how long the request can pend before throwing a timeout exception.                     | `Invoke-WebRequest -TimeoutSec 10`                   |
| `-SessionVariable`      | Captures the HTTP cookies returned by the server into a reusable session variable.               | `Invoke-WebRequest -SessionVariable "Session"`       |
| `-WebSession`           | Injects cookies captured from a previous request back into the current request.                  | `Invoke-WebRequest -WebSession $Session`             |

## Examples

```powershell
Invoke-WebRequest -Uri "[https://example.com](https://example.com)" -UseBasicParsing
```

> This sends a standard HTTP GET request. It returns a rich object to the terminal displaying the HTTP status code (e.g., 200), the raw HTML content string, and a parsed collection of links and headers. (The `-UseBasicParsing` flag prevents legacy IE dependencies on older Windows systems).

```powershell
Invoke-WebRequest -Uri "[https://releases.ubuntu.com/jammy/ubuntu-22.04-live-server-amd64.iso](https://releases.ubuntu.com/jammy/ubuntu-22.04-live-server-amd64.iso)" -OutFile .\ubuntu.iso
```

> This acts identically to `wget`. It establishes a connection to the URL and streams the massive binary payload directly to the local disk at `.\ubuntu.iso`. Utilizing `-OutFile` prevents the cmdlet from attempting to load gigabytes of data into RAM.

```powershell
(Invoke-WebRequest -Uri "[https://google.com](https://google.com)" -Method Head).Headers
```

> This uses the HTTP `HEAD` method. It instructs the server to return strictly the HTTP response headers without transmitting the actual HTML body payload, making it an incredibly fast way to audit caching rules, server software versions, and content lengths.

```powershell
$Response = Invoke-WebRequest -Uri "[http://my-app.local](http://my-app.local)" -MaximumRedirection 0 -ErrorAction SilentlyContinue
$Response.StatusCode
```

> This disables automatic redirect following (`-MaximumRedirection 0`). Network engineers use this to test load balancers: capturing the raw response object to explicitly verify that the server is returning an HTTP `301 Moved Permanently` code rather than blindly following the hop.

```powershell
Invoke-WebRequest -Uri "[http://api.local/upload](http://api.local/upload)" -Method Post -InFile .\data.zip -ContentType "application/zip"
```

> This uploads a raw binary file to a web server. It maps the local file `data.zip` via `-InFile`, sets the appropriate MIME type via `-ContentType`, and executes the `POST` operation, streaming the bytes from disk.

## Real-World Scenarios

**Health-Checking Web Endpoints**

```powershell
try {
    $Res = Invoke-WebRequest -Uri "[https://my-site.com](https://my-site.com)" -UseBasicParsing -Method Head
    if ($Res.StatusCode -eq 200) { Write-Output "Healthy" }
} catch {
    Write-Output "Down: $($_.Exception.Response.StatusCode.value__)"
}
```

> Infrastructure monitoring scripts utilize `Invoke-WebRequest` inside `try/catch` blocks. Because IWR throws terminating exceptions on 4xx/5xx HTTP codes, the catch block intercepts the error, extracts the specific failure code, and triggers pager alerts.

**Maintaining Stateful Authentication Sessions**

```powershell
Invoke-WebRequest -Uri "[https://admin.portal/login](https://admin.portal/login)" -Method Post -Body @{user="admin";pass="123"} -SessionVariable session
Invoke-WebRequest -Uri "[https://admin.portal/dashboard/export](https://admin.portal/dashboard/export)" -WebSession $session -OutFile report.csv
```

> Automation scripts navigating legacy web applications use stateful sessions. The first command posts login credentials and captures the returned `Set-Cookie` authorization headers into a session variable. The second command natively injects those cookies back into the request, proving authentication and downloading the protected file.

## When should it NOT be used?

- **Querying REST APIs returning JSON/XML:** **Reason:** `Invoke-WebRequest` leaves the JSON payload as a massive raw string inside the `.Content` property, forcing you to manually pipe it to `ConvertFrom-Json`. **Use instead:** `Invoke-RestMethod`, which auto-deserializes the payload.
- **Downloading massive files (10GB+) on old PowerShell versions:** **Reason:** In PowerShell 5.1, `Invoke-WebRequest` displays a graphical progress bar that forces the engine to calculate transfer percentages, crippling download speeds to fractions of the available bandwidth. **Use instead:** `$ProgressPreference = 'SilentlyContinue'` or `Start-BitsTransfer`.

## Alternatives

- **`Invoke-RestMethod`:** API-centric requests. **Tradeoff:** Abstracts away the HTTP envelope (Headers, Status Codes) to provide native .NET object deserialization. Choose it for APIs; choose IWR for files and HTTP debugging.
- **`curl` / `wget` (Native Linux binaries):** **Tradeoff:** Cross-platform shell utilities. While PowerShell conveniently aliases `curl` and `wget` to `Invoke-WebRequest` on Windows, running actual `curl` natively executes faster and handles complex multipart forms better, but outputs raw text instead of PowerShell objects.
- **`Start-BitsTransfer`:** Windows asynchronous downloader. **Tradeoff:** Designed purely for file transfers. Operates asynchronously in the background, resumes broken transfers, and respects network bandwidth constraints.

## How it works internally

In **Windows PowerShell 5.1**, `Invoke-WebRequest` wraps the `System.Net.HttpWebRequest` class. If the `-UseBasicParsing` flag is omitted, PowerShell secretly spawns an invisible Internet Explorer COM object in the background, parses the retrieved HTML using the IE DOM engine, and populates the `.ParsedHtml` property. This makes scraping easy but causes immense memory overhead and crashes on systems without Internet Explorer installed (like Server Core).

In **PowerShell Core (6+)**, the cmdlet was rewritten entirely using the modern `System.Net.Http.HttpClient` class. The Internet Explorer DOM parsing engine was permanently removed (making `-UseBasicParsing` the default and only behavior). The new implementation supports HTTP/2, connection pooling, and cross-platform native cryptographic stacks (OpenSSL on Linux, SecureTransport on macOS), resulting in vastly superior performance.

When `-OutFile` is specified, the cmdlet bypasses the in-memory string buffer completely, mapping the incoming HTTP network stream directly to a `FileStream`, allowing it to download gigabyte-sized files without exhausting system RAM.

## Performance Notes

- **The Progress Bar Penalty (PS 5.1):** Downloading files via `-OutFile` in PowerShell 5.1 can be 10x slower than using a browser due to the rendering overhead of the `Write-Progress` bar. Execute `$ProgressPreference = 'SilentlyContinue'` before running the command to disable the UI and restore line-rate download speeds.
- **DOM Parsing Penalty (PS 5.1):** Always include `-UseBasicParsing` in Windows PowerShell. Without it, the cmdlet attempts to invoke the Internet Explorer engine to parse every HTML node on the page, introducing massive CPU latency and potential memory leaks in automation loops.

## Security Notes

- **Following Malicious Redirects:** By default, IWR follows up to 5 HTTP 301/302 redirects. If downloading a script from a URL, a compromised server could redirect the client to a malicious payload. Use `-MaximumRedirection 0` when absolute destination certainty is required.
- **Bypassing Certificate Validation:** The `-SkipCertificateCheck` flag disables all cryptographic identity verification. Utilizing this flag against external internet domains leaves the script entirely exposed to Man-in-the-Middle (MitM) attacks.

## Common Mistakes

- **Forgetting `OutFile` for binaries:** Running `$Data = Invoke-WebRequest http://server/app.zip`. **Why it's wrong:** The cmdlet attempts to read the raw binary zip data into a RAM string variable, permanently corrupting the file payload and crashing the terminal. You must use `-OutFile app.zip`.
- **Handling HTTP 404/500 errors improperly:** Expecting `$Res.StatusCode` to equal 404 when a page is missing. **Why it's wrong:** An HTTP error code >= 400 is not treated as a successful object return; PowerShell throws a _terminating exception_. The code never reaches your `if` statement. You must wrap the command in a `try/catch` block.
- **Confusing aliases:** Typing `curl http://api.com` in Windows PowerShell and wondering why standard Linux `curl` flags (like `-X POST`) throw syntax errors. **Why it's wrong:** On Windows, `curl` is a built-in alias for `Invoke-WebRequest`. The syntax does not match GNU curl. You must type `curl.exe` to invoke the native binary.

## Best Practices

- When executing basic connectivity checks, universally utilize `-Method Head`. It returns the HTTP status code and headers instantly without forcing the remote server to generate or transmit the actual HTML/JSON payload body, saving time and bandwidth.
- In scripts handling HTTP errors, capture the specific error details inside the `catch` block by evaluating `$_.Exception.Response.StatusCode`.
- Use `-UseBasicParsing` unconditionally in all PS 5.1 scripts to guarantee compatibility across Windows Server Core editions and prevent memory leaks.

## Interview Questions

**Q:** A script runs `Invoke-WebRequest -Uri "https://missing.com"`. You want to check if the status code is 404, but the script immediately terminates with a red error message. How must you restructure the code to capture and read the 404 status code?
**A:** `Invoke-WebRequest` translates any HTTP response code of 400 or greater into a terminating .NET exception, preventing the standard output object from being generated. To capture the status code, you must wrap the command in a `try/catch` block, and within the `catch` block, inspect the exception properties: `$_.Exception.Response.StatusCode`.
**Q:** What is the severe performance issue associated with downloading large files using `Invoke-WebRequest` in Windows PowerShell 5.1, and what single line of code resolves it?
**A:** Windows PowerShell 5.1 renders a graphical progress bar (`Write-Progress`) to track download percentages. The overhead of updating this UI bar on every network packet violently bottlenecks the transfer speed. The issue is resolved by suppressing the UI before executing the download: `$ProgressPreference = 'SilentlyContinue'`.
**Q:** Explain the functional difference between storing cookies manually via the `-Headers` parameter versus using the `-SessionVariable` and `-WebSession` parameters.
**A:** While you can manually parse `Set-Cookie` strings and inject them into subsequent `-Headers` hashtables, it is complex and error-prone. `-SessionVariable` automatically parses all cookies received from a server into a cohesive `WebRequestSession` object. Supplying that object to `-WebSession` in subsequent requests automatically manages cookie injection, domain scoping, and expiration identically to how a standard web browser maintains state.

## Practice Problems

**Problem:** Download the file located at `https://example.com/installer.msi` directly to the `C:\Downloads\` folder, ensuring the command does not load the file into memory or attempt to parse the HTML DOM.
**Hint:** Combine the URL, the direct-to-disk flag, and the legacy parsing bypass flag.
**Solution:** `Invoke-WebRequest -Uri "https://example.com/installer.msi" -OutFile "C:\Downloads\installer.msi" -UseBasicParsing` (This executes a clean, memory-efficient binary stream download).
**Problem:** Interrogate `https://google.com` to view exactly what HTTP headers the server responds with, fetching the absolute minimum amount of data required to see those headers.
**Hint:** Use the HTTP method that requests headers without the payload body, and extract the headers property.
**Solution:** `(Invoke-WebRequest -Uri "https://google.com" -Method Head).Headers` (The `HEAD` method blocks the body download, making the header inspection instantaneous).

## References

- [Microsoft Docs - Invoke-WebRequest](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest)
- [Handling HTTP Errors in PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-exceptions)
  === END FILE ===
