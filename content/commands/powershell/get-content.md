---
slug: get-content
name: Get-Content
aliases:
  - cat
  - type
  - gc
category: powershell
tags:
  - powershell
  - file-io
  - text-processing
  - automation
  - streams
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - read file in powershell
  - tail file powershell
  - parse text file line by line
  - read raw string from file
  - read registry key content
relatedCommands:
  - set-content
  - add-content
alternatives:
  - cat
  - type
status: draft
---

## What is it?

`Get-Content` is a foundational PowerShell cmdlet used to read the content of items specified by a path—most commonly text files—and output that content as discrete .NET objects into the pipeline. By default, it reads a file line by line, returning an array of strings, but it can be configured to read raw blocks of text, stream real-time updates (tailing), or process data in configurable batches.

## Why does it exist?

In traditional POSIX shells, utilities like `cat` output raw byte streams of text. PowerShell, however, operates on an object-oriented pipeline. `Get-Content` exists to bridge flat files and the object pipeline, instantly converting lines of text into `[System.String]` objects. This enables administrators to pass file contents directly into robust object manipulation cmdlets (like `Where-Object` or `ForEach-Object`) without writing custom stream parsers or looping logic, while also hooking into the universal `PSProvider` system to read content from filesystems, registries, or certificate stores homogeneously.

## Syntax

```powershell
Get-Content [-Path] <String[]> [options]
Get-Content -LiteralPath <String[]> [options]
```

## Flags

| Flag           | Description                                                                                                                    | Example                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `-Path`        | Specifies the path to the item. Supports wildcard characters (globs).                                                          | `Get-Content -Path .\logs\*.txt`               |
| `-LiteralPath` | Specifies the path exactly as typed. Does not interpret wildcard characters, essential for files with `[ ]` in their names.    | `Get-Content -LiteralPath '.\file[1].txt'`     |
| `-TotalCount`  | (Alias: `-Head`) Specifies the number of lines to read from the beginning of a file, then stops processing.                    | `Get-Content -Path .\file.txt -TotalCount 5`   |
| `-Tail`        | Reads only the specified number of lines from the end of a file. Highly optimized for large files.                             | `Get-Content -Path .\app.log -Tail 10`         |
| `-Wait`        | Keeps the file open and streams newly appended lines to the pipeline in real-time, functioning exactly like `tail -f`.         | `Get-Content -Path .\app.log -Wait`            |
| `-Raw`         | Ignores newline characters and reads the entire file into memory as a single, contiguous multi-line `[System.String]`.         | `Get-Content -Path .\config.json -Raw`         |
| `-Encoding`    | Specifies the character encoding used to read the file (e.g., `UTF8`, `Unicode`, `ASCII`, `Byte`).                             | `Get-Content -Path .\data.csv -Encoding UTF8`  |
| `-ReadCount`   | Specifies how many lines of content are sent through the pipeline at a time. Defaults to 1.                                    | `Get-Content -Path .\huge.txt -ReadCount 1000` |
| `-Force`       | Overrides restrictions that prevent the command from successfully reading the file (e.g., reading hidden or system files).     | `Get-Content -Path .\hidden.txt -Force`        |
| `-Filter`      | Specifies a filter in the provider's format or language to refine the paths matched by `-Path`.                                | `Get-Content -Path .\* -Filter *.log`          |
| `-Delimiter`   | Specifies the string that `Get-Content` uses to separate the file into discrete objects instead of default newline characters. | `Get-Content -Path .\data.txt -Delimiter ","`  |

## Examples

```powershell
Get-Content -Path .\servers.txt
```

> The standard invocation. Opens the file, reads it line by line, and outputs an array of `[System.String]` objects to the pipeline. If piped to another command, the downstream command will execute once for every line in the file.

```powershell
Get-Content -Path .\config.json -Raw | ConvertFrom-Json
```

> The mandatory pattern for parsing JSON. Without `-Raw`, `Get-Content` breaks the JSON into individual lines, breaking the `ConvertFrom-Json` parser. `-Raw` pulls the entire file as a single string block, which parses perfectly.

```powershell
Get-Content -Path .\production.log -Tail 20 -Wait
```

> A live-monitoring workflow. Immediately fetches the last 20 lines of the log file to provide context, and then continuously holds the file handle open, streaming any new lines appended by the application directly to the terminal.

```powershell
(Get-Content -Path .\data.txt)[5..10]
```

> Array slicing. Because the default behavior wraps the output in an array, wrapping the command in parentheses forces it to evaluate completely. The array indexer `[5..10]` then slices the array to return only lines 6 through 11.

```powershell
Get-Content -Path .\massive.csv -ReadCount 5000 | ForEach-Object { $_ -match "ERROR" }
```

> A memory-optimized batching pipeline. By default, `Get-Content` sends lines one by one, causing pipeline overhead. `-ReadCount 5000` bundles 5000 strings into a single array block before passing it down the pipeline, heavily accelerating processing for massive files.

## Real-World Scenarios

**Bulk Active Directory Operations**

```powershell
Get-Content -Path C:\IT\terminated_users.txt | Disable-ADAccount -PassThru | Move-ADObject -TargetPath "OU=Disabled,DC=corp,DC=local"
```

> System administrators frequently receive flat text files containing User Principal Names (UPNs) from HR. By piping `Get-Content` directly into the Active Directory module, each line representing a user is seamlessly processed by `Disable-ADAccount`, automating offboarding in a single line of code.

**Asynchronous Log Auditing**

```powershell
Get-Content -Path C:\inetpub\logs\access.log -Wait | Select-String -Pattern " 500 " | Out-File C:\alerts\500_errors.log -Append
```

> An operations engineer needs to permanently filter an active IIS log file for HTTP 500 errors and dump them to a secondary alert file. They use the `-Wait` parameter to trail the file indefinitely, piping the live stream through a regex matcher, building a primitive but highly effective real-time log router.

## When should it NOT be used?

- **Reading Multi-Gigabyte Files:** **Do not use `Get-Content` without `-ReadCount` for 10GB+ log files.** The pipeline overhead of evaluating objects line-by-line will severely bottleneck CPU and memory. Use `[System.IO.File]::ReadLines()` or `[System.IO.StreamReader]` directly in .NET for massive I/O operations.
- **Binary File Copying:** **Do not use `Get-Content` to move `.exe` or `.zip` files.** Even with `-Encoding Byte`, pipeline serialization corrupts binary headers. Always use `Copy-Item` or `[System.IO.File]::Copy()`.

## Alternatives

- **`[System.IO.File]::ReadAllText()`:** **Best for pure performance.** Bypasses the PowerShell pipeline entirely, calling the underlying .NET Base Class Library to instantly load a file into a single string variable. It is significantly faster than `Get-Content -Raw`.
- **`Select-String`:** **Best for inline searching.** If your goal is simply to `grep` a file, do not run `Get-Content file.txt | Select-String "Error"`. Run `Select-String -Path file.txt -Pattern "Error"` directly; it utilizes optimized internal memory buffers.

## How it works internally

`Get-Content` relies on the PowerShell Provider (`PSProvider`) architecture. When called against the filesystem, it utilizes the `FileSystemProvider`.

Without the `-Raw` flag, `Get-Content` instantiates a `System.IO.StreamReader`. It reads characters into a buffer until it encounters a Carriage Return/Line Feed (`\r\n` or `\n`). It packages this sequence into a newly allocated `[System.String]` object, adds internal PowerShell Extended Type System (ETS) properties (like `ReadCount`, `Path`, and `PSChildName`), and yields it to the pipeline. This ETS overhead is what makes `Get-Content` slower than raw .NET methods.

When the `-Tail` parameter is specified, `Get-Content` does not read the file from the beginning. It calls `FileStream.Seek()` to jump directly to the end of the file descriptor, reads backward in blocks searching for newline characters until it hits the requested count, and then prints forward, making it instantly responsive even on 50GB log files.

## Performance Notes

- **The `-Raw` Advantage:** Using `Get-Content -Raw` forces the command to call `System.IO.File.ReadAllText()` under the hood, allocating one massive contiguous string in RAM rather than thousands of tiny objects. This is magnitudes faster when capturing configuration files.
- **Pipeline Throttling:** Pipelining inherently introduces serialization/deserialization latency between cmdlets. `Get-Content file.txt | ForEach-Object` is always slower than `foreach ($line in [System.IO.File]::ReadLines('file.txt'))`.

## Security Notes

- **Alternative Data Streams (ADS):** On NTFS filesystems, malicious actors hide malware payloads inside Alternative Data Streams behind legitimate files. `Get-Content` natively supports reading these streams via the `-Stream` parameter (e.g., `Get-Content file.txt -Stream Zone.Identifier`), making it an essential tool for forensic auditing.
- **Memory Exhaustion:** If an attacker uploads an infinitely long file (e.g., via `/dev/random` equivalents) and a privileged script runs `Get-Content -Raw`, the script will consume all available host RAM trying to instantiate the string object, causing the PowerShell host to crash via an `OutOfMemoryException`.

## Common Mistakes

- **Piping Raw arrays to JSON parsers**
  - _Mistake:_ `Get-Content config.json | ConvertFrom-Json` resulting in parsing failures.
  - _Why:_ JSON frequently spans multiple lines. Default `Get-Content` streams an array of strings. `ConvertFrom-Json` attempts to parse the very first string (e.g., `{`), fails immediately because it isn't valid JSON on its own, and crashes. Always use `-Raw`.
- **Bracket path interpretation**
  - _Mistake:_ Attempting to read a file named `backup[2023].log` using `-Path` and getting a "File not found" error.
  - _Why:_ The `-Path` parameter evaluates glob wildcards. It treats `[2023]` as a character set (like regex). To read files containing literal brackets, you must use `-LiteralPath`.

## Best Practices

- **Enforce Encodings:** PowerShell 5.1 and earlier default to varying encodings (often ASCII or local ANSI) depending on the environment. PowerShell 7 defaults to UTF-8 without BOM. To ensure scripts run identically across all versions, explicitly define `-Encoding UTF8` when reading files.
- **Stream with `-ReadCount`:** When interacting with REST APIs or heavy AD modules using large input files, never use `Get-Content file.txt | command`. Always chunk the data: `Get-Content file.txt -ReadCount 100 | ForEach-Object { Send-ApiBatch $_ }`.

## Interview Questions

**Q: Explain the technical difference in memory allocation and pipeline behavior between `Get-Content .\data.txt` and `Get-Content .\data.txt -Raw`.**
**A:** Without `-Raw`, `Get-Content` instantiates a `StreamReader`, reads the file line by line, allocates a discrete `[System.String]` object for each line, and streams them individually down the pipeline. With `-Raw`, it reads the entire file contents into RAM simultaneously, allocating a single, massive multi-line `[System.String]` object, completely bypassing line-by-line pipeline enumeration.

**Q: A script uses `Get-Content file.txt | Select-String "Error"`. A colleague suggests refactoring this to `Select-String -Path file.txt -Pattern "Error"`. Why is the colleague's suggestion architecturally superior?**
**A:** The first method forces `Get-Content` to read the file, wrap each line in ETS metadata, serialize it, and pass it across the pipeline boundary to `Select-String`, which then evaluates it. The second method skips the pipeline boundary entirely. `Select-String` directly manages its own optimized file stream, drastically reducing object allocation overhead and CPU time.

## Practice Problems

**Problem:** You are monitoring a web server. Write a command that continuously trails the end of `C:\logs\web.log` in real-time, but starts by displaying the last 50 lines to give you immediate context.
**Hint:** Combine the live streaming parameter with the optimized end-of-file parameter.
**Solution:**

```powershell
Get-Content -Path C:\logs\web.log -Tail 50 -Wait
```

**Problem:** You need to extract the raw string value of a script file containing square brackets in its name, `run_task[01].ps1`, without PowerShell attempting to evaluate the brackets as a wildcard search.
**Hint:** Use the parameter that enforces strict, literal path parsing.
**Solution:**

```powershell
Get-Content -LiteralPath .\run_task[01].ps1
```

## References

- [Get-Content (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content)
- [about_Providers (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_providers)
