---
slug: invoke-restmethod
name: Invoke-RestMethod
aliases:
  - irm
category: powershell
tags:
  - powershell
  - api
  - rest
  - http
  - web-services
  - json
difficulty: intermediate
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - send http request powershell
  - call REST API from powershell
  - download json payload ps
  - post data to webhook
  - authenticate with bearer token powershell
relatedCommands:
  - invoke-webrequest
alternatives:
  - curl
  - invoke-webrequest
status: draft
---

## What is it?

`Invoke-RestMethod` is a specialized PowerShell cmdlet used to interact with RESTful web services over HTTP and HTTPS. It automatically sends requests (GET, POST, PUT, DELETE) and, crucially, intercepts the response payload, natively deserializing JSON or XML response bodies directly into rich PowerShell custom objects without requiring manual string parsing.

## Why does it exist?

Modern infrastructure relies on REST APIs that output deeply nested JSON or XML. Previously, administrators used `Invoke-WebRequest` to pull the raw string payload, then piped it manually to `ConvertFrom-Json`. `Invoke-RestMethod` exists to eliminate this boilerplate. By abstracting the HTTP response layer and performing auto-deserialization, it seamlessly integrates remote web services into the native PowerShell object pipeline, turning complex API endpoints into standard queryable commandlets.

## Syntax

```powershell
Invoke-RestMethod [-Uri] <uri> [-Method <WebRequestMethod>] [-Body <Object>] [-Headers <IDictionary>] [options]
```

## Flags

| Flag                       | Description                                                                                                | Example                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `-Uri`                     | Specifies the Uniform Resource Identifier (URL) of the internet resource or API endpoint.                  | `Invoke-RestMethod -Uri "https://api.github.com"`     |
| `-Method`                  | Specifies the HTTP method used for the request (e.g., `Get`, `Post`, `Put`, `Delete`, `Patch`).            | `Invoke-RestMethod -Method Post`                      |
| `-Headers`                 | A hash table of explicit HTTP headers to include in the request (e.g., Authorization).                     | `Invoke-RestMethod -Headers @{ "X-Api-Key" = "123" }` |
| `-Body`                    | The data payload to send with the request (must be converted to JSON/XML if the API expects it).           | `Invoke-RestMethod -Body $JsonPayload`                |
| `-ContentType`             | Explicitly sets the `Content-Type` header (e.g., `application/json`).                                      | `Invoke-RestMethod -ContentType "application/json"`   |
| `-Token`                   | (PS 7+) Accepts a SecureString to automatically generate an OAuth2 `Authorization: Bearer` header.         | `Invoke-RestMethod -Token $SecureToken`               |
| `-Credential`              | Specifies a `PSCredential` object to handle Basic or NTLM authentication natively.                         | `Invoke-RestMethod -Credential $cred`                 |
| `-SkipCertificateCheck`    | (PS 6+) Bypasses TLS/SSL certificate validation errors, allowing requests to self-signed endpoints.        | `Invoke-RestMethod -SkipCertificateCheck`             |
| `-TimeoutSec`              | Specifies how long the request can pend before timing out (defaults to 0, which is infinite/timeout-less). | `Invoke-RestMethod -TimeoutSec 30`                    |
| `-MaximumRetryCount`       | (PS 7+) Specifies the number of times to automatically retry the request on 429/5xx status codes.          | `Invoke-RestMethod -MaximumRetryCount 3`              |
| `-ResponseHeadersVariable` | Captures the raw HTTP response headers into a specified variable name (bypassing auto-deserialization).    | `Invoke-RestMethod -ResponseHeadersVariable "res"`    |

## Examples

```powershell
Invoke-RestMethod -Uri "[https://api.github.com/users/octocat](https://api.github.com/users/octocat)"
```

> This sends a default HTTP GET request to the GitHub API. The API returns a JSON payload. The cmdlet intercepts this, calls the internal JSON deserializer, and outputs a `PSCustomObject`. You can instantly access properties like `(Invoke-RestMethod -Uri ...).name`.

```powershell
$Body = @{ name = "srv-01"; status = "active" } | ConvertTo-Json
Invoke-RestMethod -Uri "[https://api.internal/servers](https://api.internal/servers)" -Method Post -Body $Body -ContentType "application/json"
```

> This constructs a custom hashtable, serializes it to JSON, and executes an HTTP POST request. Specifying `-ContentType` is critical here; without it, the remote web server may reject the payload as `application/x-www-form-urlencoded`.

```powershell
$Headers = @{ Authorization = "Bearer $ApiKey" }
Invoke-RestMethod -Uri "[https://api.cloud.com/v1/billing](https://api.cloud.com/v1/billing)" -Headers $Headers
```

> This handles secure API authentication. It constructs a hashtable containing the standard `Authorization` header, injecting a bearer token, and passes it via the `-Headers` flag to authorize the query.

```powershell
Invoke-RestMethod -Uri "[https://self-signed.local/api](https://self-signed.local/api)" -SkipCertificateCheck
```

> In modern PowerShell environments (6+), this flag safely ignores invalid, expired, or self-signed TLS certificates on internal management interfaces, preventing the command from throwing a fatal SSL/TLS trust error.

```powershell
Invoke-RestMethod -Uri "[https://api.flaky.com/data](https://api.flaky.com/data)" -MaximumRetryCount 5 -RetryIntervalSec 2
```

> Utilizing native PS7+ resiliency features, this command will automatically back off and retry the API call up to 5 times if the server returns HTTP 429 (Too Many Requests) or HTTP 503 (Service Unavailable) status codes.

## Real-World Scenarios

**Executing Slack/Teams Webhooks**

```powershell
$Payload = @{ text = "Deployment successful on Production." } | ConvertTo-Json
Invoke-RestMethod -Uri $SlackWebhookUrl -Method Post -Body $Payload -ContentType 'application/json'
```

> Deployment pipelines utilize `Invoke-RestMethod` to blast success or failure notifications directly into corporate chat channels by wrapping simple strings into JSON arrays and HTTP POSTing them to unauthenticated webhook endpoints.

**Interrogating Cloud Metadata Endpoints**

```powershell
$Headers = @{"Metadata"="true"}
$InstanceId = (Invoke-RestMethod -Uri "[http://169.254.169.254/metadata/instance?api-version=2021-02-01](http://169.254.169.254/metadata/instance?api-version=2021-02-01)" -Headers $Headers).compute.vmId
```

> Bootstrapping scripts running inside AWS EC2 or Azure VMs execute `Invoke-RestMethod` against the non-routable link-local hypervisor API (`169.254.169.254`). Because the cmdlet auto-deserializes the JSON, the script instantly extracts deep nested properties like `.compute.vmId` in a single line.

## When should it NOT be used?

- **Downloading large binary files (.iso, .zip):** **Reason:** `Invoke-RestMethod` attempts to parse the payload in memory. It will corrupt binaries or crash the terminal with memory exhaustion. **Use instead:** `Invoke-WebRequest -OutFile`.
- **Reading HTTP Response Headers or Status Codes:** **Reason:** `Invoke-RestMethod` hides the HTTP response wrapper and only outputs the deserialized payload body. If the API uses headers for pagination links or rate-limit tracking, you cannot see them natively. **Use instead:** `Invoke-WebRequest`.

## Alternatives

- **`Invoke-WebRequest`:** The raw HTTP client. **Tradeoff:** It returns the entire `HtmlWebResponseObject` (Headers, Status Code, Content). It is better for deep HTTP debugging, but requires you to manually extract and convert the `.Content` string if it is JSON.
- **`curl` / `wget` (Native binaries):** **Tradeoff:** These are ubiquitous Linux tools. PowerShell on Linux has them, but `Invoke-RestMethod` is preferred in PS scripts because `curl` outputs raw strings, losing PowerShell's native object-pipeline advantages.

## How it works internally

The architecture of `Invoke-RestMethod` depends heavily on the PowerShell version.

In **Windows PowerShell 5.1**, it acts as a wrapper around the legacy .NET `System.Net.HttpWebRequest` class. It opens a synchronous connection, transmits headers, and reads the response stream.

In **PowerShell 6+ (Core)**, it was completely rewritten to utilize the modern .NET `System.Net.Http.HttpClient` class. This provides immense performance gains, native HTTP/2 support, and connection pooling.

Once the payload is received, the cmdlet intercepts the HTTP `Content-Type` header from the response. If the type is `application/json`, it silently passes the raw string body to the `ConvertFrom-Json` subroutine. If the type is `text/xml` or `application/xml`, it casts the string to an `[xml]` document object. If it is plain text, it returns a string array. The resulting .NET object is then pushed directly into the active pipeline. If the server returns a 4xx or 5xx status code, the cmdlet throws an `HttpResponseException` terminating error.

## Performance Notes

- **Connection Pooling (PS7+):** Because PS7 uses `HttpClient` under the hood, executing `Invoke-RestMethod` inside a massive loop against the same host reuses the underlying TCP socket automatically, drastically reducing TCP handshake and TLS negotiation overhead.
- **Memory Overhead:** When pulling 500MB JSON payloads, the automatic deserialization process consumes vast amounts of RAM to build the thousands of nested `PSCustomObject` instances. Pagination endpoints must be utilized for massive datasets.

## Security Notes

- **TLS/SSL Versions:** PowerShell 5.1 often defaults to the deprecated TLS 1.0. If an API rejects the connection, you must manually force the session to use TLS 1.2 by executing `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12` at the top of your script. PowerShell 7 handles TLS 1.2/1.3 natively.
- **Bypassing Certificate Checks:** The `-SkipCertificateCheck` flag disables all cryptographic identity verification. Using this against an external internet endpoint renders the request entirely vulnerable to Man-in-the-Middle (MitM) attacks. Reserve it strictly for internal, trusted lab IP addresses.

## Common Mistakes

- **Forgetting to convert the body to JSON:** Running `Invoke-RestMethod -Body @{name="test"} -ContentType "application/json"`. **Why it's wrong:** The API expects a JSON string, but you passed a PowerShell Hashtable. The cmdlet calls `.ToString()` on it, sending `System.Collections.Hashtable` as the payload. The API throws a 400 Bad Request. You must use `... -Body ($HashTable | ConvertTo-Json)`.
- **Ignoring pagination:** Querying a REST API for users and assuming you got all 5,000 users. **Why it's wrong:** Most APIs cap responses at 100 items and supply a `next_page` URL. Because `Invoke-RestMethod` hides HTTP response headers, you might miss the pagination token entirely if it's sent via headers.
- **Catching HTTP Errors:** Expecting to parse error messages from a 404 response. **Why it's wrong:** A 4xx or 5xx response throws a terminating exception, destroying the pipeline. To read the JSON error message returned by the server, you must use a `try/catch` block and inspect `$_.ErrorDetails.Message`.

## Best Practices

- Universally explicitly declare the `-ContentType "application/json"` parameter when executing POST/PUT requests, as APIs are increasingly strict about rejecting payloads with missing or default `application/x-www-form-urlencoded` headers.
- When executing against robust enterprise APIs, always implement `try/catch` blocks and leverage the PS7+ `-MaximumRetryCount` parameter to gracefully handle transient 503 backend failures and 429 API rate limits.
- Use `Invoke-RestMethod` for API data ingestion, but switch to `Invoke-WebRequest` when you explicitly need to read HTTP status codes (e.g., verifying a server returns 200 OK vs 301 Redirect).

## Interview Questions

- _Query:_ A script sends a POST request to an API using `Invoke-RestMethod`. The `-Body` parameter is assigned a custom PowerShell object. The remote API returns a "400 Bad Request: Invalid JSON" error. What is the fundamental issue and how is it corrected?
  - _A:_ `Invoke-RestMethod` automatically deserializes _incoming_ JSON responses, but it does _not_ automatically serialize _outgoing_ objects in the `-Body` parameter into JSON strings. It attempts to stringify the object natively, passing useless type names. You must explicitly pipe the object to `ConvertTo-Json` before passing it to the `-Body` parameter.
- _Query:_ What is the primary architectural difference between `Invoke-RestMethod` and `Invoke-WebRequest`, and when must you choose the latter?
  - _A:_ `Invoke-WebRequest` captures and returns the complete HTTP response envelope, including the raw content string, status codes, and HTTP headers. `Invoke-RestMethod` intercepts the payload, hides the headers/status codes, automatically parses JSON or XML into native PowerShell objects, and returns only those objects. You must choose `Invoke-WebRequest` if you need to read specific response headers (like pagination links) or download raw binary files.
- _Query:_ In older versions of PowerShell (5.1), you attempt to query a modern API but receive a "The request was aborted: Could not create SSL/TLS secure channel" error. What is causing this, and what command resolves it?
  - _A:_ Older .NET Framework versions default to negotiating legacy, insecure SSL/TLS protocols (like TLS 1.0), which modern APIs actively reject. You must force the session to negotiate modern cryptography by executing `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12` before calling the cmdlet.

## Practice Problems

- _Problem:_ Retrieve a JSON payload from `https://jsonplaceholder.typicode.com/posts/1` and extract just the text value of the `title` property.
  - _Hint:_ The cmdlet automatically converts JSON to a PSCustomObject, so you can access properties using dot notation or `Select-Object`.
  - _Solution:_ `(Invoke-RestMethod -Uri "https://jsonplaceholder.typicode.com/posts/1").title` (This instantly deserializes the payload and pulls the specific nested string).
- _Problem:_ Send an HTTP POST request to `https://api.internal/create`, passing the JSON payload `{"status":"active"}`. Ensure the request bypasses SSL certificate validation errors.
  - _Hint:_ You must supply the explicit method, convert the hashtable to JSON, set the content type, and apply the certificate bypass flag.
  - _Solution:_ `Invoke-RestMethod -Uri "https://api.internal/create" -Method Post -Body (@{status="active"} | ConvertTo-Json) -ContentType "application/json" -SkipCertificateCheck` (This executes an insecure backend request passing the correctly serialized payload).

## References

- [Microsoft Docs - Invoke-RestMethod](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-restmethod)
- [PowerShell 7 Web Cmdlets Improvements](https://devblogs.microsoft.com/powershell/powershell-7-1-enhancements-to-web-cmdlets/)
  === END FILE ===
