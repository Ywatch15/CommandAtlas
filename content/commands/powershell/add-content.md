---
slug: add-content
name: Add-Content
aliases:
  - ac
category: powershell
tags:
  - powershell
  - file-io
  - text-processing
  - append
  - scripting
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - append text to a file in powershell
  - add lines to end of file
  - write to log file without overwriting
  - append content powershell
  - add string to text file
relatedCommands:
  - set-content
  - get-content
alternatives:
  - set-content
status: draft
---

## What is it?

`Add-Content` is a core PowerShell cmdlet used to append data—typically strings or string representations of objects—to a specified item or file. It seamlessly opens a file, appends the supplied value to the end of the existing content, and closes the file, automatically handling file locks and stream management.

## Why does it exist?

Traditional shell redirection (`>>`) is useful but lacks the robust parameterization required for complex automation scripts, such as explicit encoding controls, credential injection, and credential-safe file locking. `Add-Content` exists to provide a native, object-oriented, and provider-agnostic method to mutate data streams (not just on the FileSystem, but potentially the Registry or other PSProviders) without risking the destructive overwrites associated with `Set-Content` or raw stream writers.

## Syntax

```powershell
Add-Content [-Path] <string[]> [-Value] <Object[]> [options]
Add-Content -LiteralPath <string[]> [-Value] <Object[]> [options]
```

## Flags

| Flag           | Description                                                                                        | Example                                              |
| -------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `-Path`        | Specifies the path to the item(s) receiving the content. Supports wildcards.                       | `Add-Content -Path .\log.txt`                        |
| `-LiteralPath` | Specifies the exact path to the item. Does not interpret wildcards (crucial for paths with `[ ]`). | `Add-Content -LiteralPath '.\file[1].txt'`           |
| `-Value`       | The string(s) or object(s) to append. Can be passed via pipeline or explicitly.                    | `Add-Content -Path .\log.txt -Value "Error"`         |
| `-PassThru`    | Returns an object representing the appended content down the pipeline (default returns nothing).   | `Add-Content -Path .\log.txt -Value "OK" -PassThru`  |
| `-Force`       | Overrides restrictions, allowing content to be appended to read-only or hidden files.              | `Add-Content -Path .\system.ini -Force`              |
| `-NoNewline`   | Prevents the cmdlet from adding a trailing newline character after the appended string.            | `Add-Content -Path .\stream.dat -NoNewline`          |
| `-Encoding`    | Specifies the character encoding (e.g., `UTF8`, `ASCII`, `Unicode`, `BOM`).                        | `Add-Content -Path .\log.txt -Encoding UTF8`         |
| `-Filter`      | Filters the path using provider-specific syntax (faster than `Where-Object`).                      | `Add-Content -Path .\* -Filter *.log`                |
| `-Include`     | Appends only to items matching the specified wildcard patterns.                                    | `Add-Content -Path .\* -Include *.txt`               |
| `-Exclude`     | Skips items matching the specified wildcard patterns.                                              | `Add-Content -Path .\* -Exclude *.bak`               |
| `-Credential`  | Uses alternate credentials to access the destination path (provider dependent).                    | `Add-Content -Path \\server\share -Credential $cred` |

## Examples

```powershell
Add-Content -Path .\application.log -Value "[$(Get-Date)] Service started."
```

> This appends a simple, timestamped string to the end of `application.log`. If the file does not exist, `Add-Content` safely provisions a new file and writes the string to it.

```powershell
"Server01", "Server02", "Server03" | Add-Content -Path .\servers.txt
```

> This leverages the PowerShell pipeline to send an array of strings directly into `Add-Content`. The cmdlet efficiently processes the stream and appends each string on a new line within the target file.

```powershell
Add-Content -Path .\data.csv -Value "user1,active" -NoNewline
```

> This utilizes the `-NoNewline` flag. Instead of appending the string and returning the carriage to the next line, it leaves the cursor at the immediate end of the string, which is highly useful when constructing unbroken comma-separated data streams dynamically.

```powershell
Add-Content -Path .\configs\*.conf -Value "Timeout=300"
```

> This uses wildcard pathing to instantly append the configuration string `Timeout=300` to the end of every single `.conf` file residing in the `configs` directory simultaneously.

```powershell
Add-Content -LiteralPath 'C:\temp\archive[2026].txt' -Value "Data" -Force -Encoding UTF8
```

> This targets a file possessing square brackets in its name, necessitating the `-LiteralPath` flag to prevent PowerShell from interpreting `[2026]` as a wildcard regex array. It forces writing to a potentially read-only file (`-Force`) and strictly enforces UTF-8 encoding.

## Real-World Scenarios

**Building Continuous Automation Logs**

```powershell
$LogMsg = "{0} - {1} - {2}" -f (Get-Date -Format s), "ERROR", $ErrorMessage
Add-Content -Path $LogPath -Value $LogMsg -Encoding UTF8
```

> Systems administrators writing unattended backend scripts use `Add-Content` to build robust logging mechanisms, ensuring explicit UTF-8 encoding so multibyte character sets (like specialized error codes or paths) aren't corrupted during append operations.

**Bulk Updating Windows Hosts Files**

```powershell
$NewEntries = "10.0.0.51 internal.api", "10.0.0.52 secure.api"
Add-Content -Path "$env:windir\System32\drivers\etc\hosts" -Value $NewEntries -Force
```

> Infrastructure provisioning scripts modify the strictly protected Windows `hosts` file by piping an array of local DNS resolutions into it, utilizing `-Force` to bypass native read-only protections applied by the OS.

**Merging Multiple Files Sequentially**

```powershell
Get-Content .\parts\*.txt | Add-Content -Path .\merged_output.txt
```

> Data engineers quickly consolidate dozens of fragmented text files into a single master file by combining `Get-Content` to read the payload and `Add-Content` to sequentially stream the chunks into the aggregation destination.

## When should it NOT be used?

- **Massive, high-frequency looping writes:** **Reason:** `Add-Content` opens, writes, and closes the file stream on every single invocation. Putting it inside a `foreach` loop processing a million items creates devastating disk I/O bottlenecks. **Use instead:** Instantiate a `[System.IO.StreamWriter]` object for persistent file locking and buffering.
- **Writing complex nested objects to disk:** **Reason:** `Add-Content` invokes the `.ToString()` method on inputs. If you pass an array of Services, it will simply write the useless string `System.ServiceProcess.ServiceController` to the file. **Use instead:** `Export-Csv` or `ConvertTo-Json | Out-File`.

## Alternatives

- **`Out-File -Append`:** Shell output redirection. **Tradeoff:** `Out-File` captures console formatting (like widths and tables), which is excellent for human-readable reports but terrible for pure data appending. `Add-Content` strictly writes the raw string value.
- **`[System.IO.File]::AppendAllText()`:** The underlying .NET class. **Tradeoff:** Executes astronomically faster than `Add-Content` for raw file manipulation, but requires strict absolute paths and lacks native PowerShell pipeline integration.

## How it works internally

When `Add-Content` is invoked, it interfaces with the PowerShell Provider architecture (typically the `FileSystem` provider).

It resolves the path, evaluates wildcard matches, and opens a `FileStream` with a `FileMode.Append` flag. If the target does not exist, the provider triggers a `FileMode.Create` fallback. It then analyzes the incoming `-Value` object. If the object is not a string, PowerShell forcefully attempts to coerce it into a string using the object's native `.ToString()` method (or its default formatting view).

The provider locks the file exclusively for the duration of the write operation, dumps the string buffer onto the disk using the specified `-Encoding` (defaulting to UTF-8 without BOM in PowerShell 7+), appends a line terminator (`\r\n` on Windows, `\n` on Linux) unless `-NoNewline` is active, and then gracefully closes the file handle and flushes the I/O buffer to the hardware.

## Performance Notes

- **The Pipeline vs. Loop Penalty:** Piping an array into `Add-Content` (e.g., `$array | Add-Content`) opens the file once, writes all data, and closes it. Using a loop (e.g., `foreach ($i in $array) { Add-Content $i }`) opens and closes the file handle thousands of times, introducing a 100x to 1000x performance penalty.
- **Memory Footprint:** Because `Add-Content` writes sequentially to the end of the file, it does not need to load the existing file contents into RAM, making it highly efficient for appending to multi-gigabyte log files.

## Security Notes

- **File Locking Vulnerabilities:** Because `Add-Content` acquires a lock, two simultaneous PowerShell background jobs attempting to `Add-Content` to the exact same file will collide, resulting in an `IOException: The process cannot access the file because it is being used by another process`.
- **Execution Policies and ACLs:** `Add-Content` fully respects NTFS Access Control Lists (ACLs). If the executing user lacks Write or Modify permissions on the directory or file, the command throws an `UnauthorizedAccessException`, which cannot be bypassed by `-Force`.

## Common Mistakes

- **Assuming it formats objects:** Running `Get-Process | Add-Content out.txt`. **Why it's wrong:** `Add-Content` does not use the formatting engine. It calls `.ToString()` on the process objects, resulting in a file filled with identical strings of `System.Diagnostics.Process`. You must pipe to `Out-File` or `Out-String` first to capture visual tables.
- **Wildcard pathing errors:** Using `Add-Content -Path .\file[1].txt`. **Why it's wrong:** PowerShell's `-Path` parameter interprets `[1]` as a regex-style character class, searching for a file literally named `file1.txt`. If the file is physically named `file[1].txt`, you must use `-LiteralPath`.
- **Encoding mismatches:** Appending to a UTF-16LE file using default UTF-8 encoding. **Why it's wrong:** The file will become a corrupted mix of multi-byte and single-byte characters, breaking external parsers. Always match the file's original encoding explicitly.

## Best Practices

- When executing on PowerShell 5.1 (Windows PowerShell), explicitly define `-Encoding UTF8`. PS 5.1 defaults to `Default` (ANSI/Windows-1252) which unpredictably destroys unicode characters, whereas PowerShell 7+ defaults safely to `UTF8NoBOM`.
- To append massive arrays to a file efficiently without breaking the pipeline or exhausting memory, rely on array passing: `Add-Content -Path log.txt -Value $MassiveArray`.
- Wrap critical log appends in `try/catch` blocks. Network drives drop and file locks collide frequently in enterprise environments; failing to catch `Add-Content` errors will crash unmonitored scripts silently.

## Interview Questions

- **Q:** What is the technical difference between piping an object array to `Out-File -Append` versus `Add-Content`?
  - **A:** `Out-File` sends the objects through PowerShell's formatting subsystem, capturing the exact terminal representation (tables, lists, spacing, and truncation) and writing that visual layout to the file. `Add-Content` completely bypasses the formatting subsystem, invoking the raw `.ToString()` method on the objects, which writes flat underlying string data.
- **Q:** A developer complains that their script takes 45 minutes to write 100,000 lines to a log file using a `foreach` loop that calls `Add-Content` on every iteration. Why is this happening, and how do you fix it?
  - **A:** Every invocation of `Add-Content` executes a full disk I/O cycle: it asks the OS to open a file handle, seeks to the end of the file, writes the data, and securely closes the handle. Doing this 100,000 times destroys disk performance. To fix it, they should aggregate the lines into a single array and call `Add-Content -Value $array` once, or utilize `[System.IO.StreamWriter]` to keep the file handle open for the duration of the loop.
- **Q:** Why does `Add-Content` fail when targeting a filename containing square brackets, like `report[01].txt`, and how do you circumvent this behavior?
  - **A:** The `-Path` parameter natively processes wildcard expansion (globbing). It interprets `[01]` as a character range, seeking a file named `report0.txt` or `report1.txt`. To bypass the wildcard engine and treat the string explicitly, you must use the `-LiteralPath` parameter instead.

## Practice Problems

- _Problem:_ Append the exact string `CONFIG_VER=v2.5` to a file located at `C:\app\settings.conf` without appending a trailing newline character.
  - _Hint:_ Combine the path, the value, and the specific flag that suppresses carriage returns.
  - _Solution:_ `Add-Content -Path C:\app\settings.conf -Value "CONFIG_VER=v2.5" -NoNewline` (This modifies the file, leaving the cursor adjacent to the final character).
- _Problem:_ Append the contents of the variable `$LogData` to an existing file named `audit[archive].log`, forcing the action even if the file is marked read-only, while strictly enforcing UTF-8 encoding.
  - _Hint:_ You must bypass wildcard evaluation, force the write, and specify the encoding.
  - _Solution:_ `Add-Content -LiteralPath "audit[archive].log" -Value $LogData -Force -Encoding UTF8` (The literal path prevents bracket evaluation, while `-Force` overrides the read-only attribute).

## References

- [Microsoft Docs - Add-Content](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/add-content)
- [about_Providers (PowerShell)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_providers)
  === END FILE ===
