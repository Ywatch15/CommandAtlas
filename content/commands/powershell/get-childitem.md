---
slug: get-childitem
name: Get-ChildItem
aliases:
  - gci
  - ls
  - dir
category: powershell
tags:
  - powershell
  - file-system
  - registry
  - search
  - traversal
  - directory
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - list directory contents powershell
  - find files recursively
  - search registry keys ps
  - list hidden files and folders
  - powershell ls equivalent
relatedCommands:
  - copy-item
  - remove-item
  - select-object
  - where-object
status: draft
alternatives: []
---

## What is it?

`Get-ChildItem` is a foundational PowerShell cmdlet used to retrieve the items and child items in one or more specified locations. While it is the direct equivalent to Linux `ls` or Windows `dir`, it is fundamentally provider-agnostic, meaning it can traverse not only the physical filesystem but also the Windows Registry (`HKLM:\`), Certificate Stores (`Cert:\`), and Environment Variables (`Env:\`), outputting rich .NET objects rather than flat text strings.

## Why does it exist?

Legacy command-line interfaces required entirely disparate tools to inspect different hierarchical storage systems (e.g., `dir` for files, `reg query` for the registry). Furthermore, text-based output required brittle regex parsing (like `awk` or `grep`) to extract file sizes or dates. `Get-ChildItem` exists to unify navigation across all system hierarchies via the PowerShell Provider model, returning highly structured objects (`FileInfo`, `RegistryKey`) that inherently expose their properties (LastWriteTime, Length, Extension) directly to the pipeline for robust, error-free programmatic manipulation.

## Syntax

```powershell
Get-ChildItem [[-Path] <string[]>] [[-Filter] <string>] [options]
Get-ChildItem -LiteralPath <string[]> [[-Filter] <string>] [options]
```

## Flags

| Flag           | Description                                                                                                   | Example                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `-Path`        | Specifies the path to one or more locations. Supports standard wildcard pattern matching (`*`, `?`).          | `Get-ChildItem -Path C:\Logs\*`             |
| `-LiteralPath` | Specifies an exact path, strictly bypassing wildcard evaluation (crucial for paths containing `[ ]`).         | `Get-ChildItem -LiteralPath '.\Data[1]'`    |
| `-Filter`      | Highly optimized, provider-specific filtering (e.g., `*.txt`). Executes significantly faster than `-Include`. | `Get-ChildItem -Path C:\ -Filter *.log`     |
| `-Include`     | Retrieves only items matching the specified string/wildcard array. Requires trailing `\*` on path.            | `Get-ChildItem C:\*\* -Include *.jpg,*.png` |
| `-Exclude`     | Omits specific items or file extensions matching the wildcard array from the final retrieval list.            | `Get-ChildItem -Path .\ -Exclude *.tmp`     |
| `-Recurse`     | Gets the items in the specified locations and in all child containers (deep traversal).                       | `Get-ChildItem -Path .\src -Recurse`        |
| `-Depth`       | Restricts the `-Recurse` operation to a specific hierarchical depth limit (e.g., `2` levels deep).            | `Get-ChildItem -Path .\ -Recurse -Depth 2`  |
| `-Force`       | Bypasses standard visibility filters, revealing Hidden files, System files, and inaccessible registry keys.   | `Get-ChildItem -Path C:\ -Force`            |
| `-Directory`   | Limits the output strictly to directory/container objects, filtering out all file items natively.             | `Get-ChildItem -Path .\ -Directory`         |
| `-File`        | Limits the output strictly to file objects, filtering out all directory/container objects natively.           | `Get-ChildItem -Path .\ -File`              |
| `-Hidden`      | Retrieves only items that explicitly possess the Hidden attribute.                                            | `Get-ChildItem -Path .\ -Hidden`            |

## Examples

```powershell
Get-ChildItem -Path C:\Temp -Filter *.csv
```

> This queries the filesystem for all files terminating with the `.csv` extension within the `C:\Temp` directory. By utilizing the `-Filter` parameter, the query is pushed down to the underlying NTFS driver, executing vastly faster than standard wildcard matching.

```powershell
Get-ChildItem -Path .\Project -Recurse -File -Exclude *.bak,*.tmp
```

> This executes a deep, recursive scan of a project folder, intentionally limiting the retrieval strictly to file objects (`-File`) while filtering out any useless backup or temporary files through the exclusion array.

```powershell
Get-ChildItem -Path HKLM:\Software\Microsoft\Windows\CurrentVersion\Run
```

> Demonstrating its provider-agnostic architecture, this command treats the Windows Registry exactly like a filesystem. It traverses into the `Run` hive and outputs a list of all `RegistryKey` objects nested inside it.

```powershell
Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.NotAfter -lt (Get-Date).AddDays(30) }
```

> This leverages the Certificate provider to retrieve all installed SSL/TLS certificates on the local machine system store. Because it outputs rich objects, the pipeline natively intercepts the `.NotAfter` expiration property to instantly identify certificates expiring within the next 30 days.

```powershell
Get-ChildItem -Path \\NAS01\Archive\* -Include *.pdf -Recurse -Depth 3 -Force
```

> This maps a complex network share. It forces the inclusion of hidden or protected system files (`-Force`), explicitly targets only `.pdf` documents (`-Include`), and restricts the aggressive recursive crawl to halt exactly three folder levels deep (`-Depth 3`).

## Real-World Scenarios

**Identifying Massive Storage Bloat**

```powershell
Get-ChildItem -Path C:\Data -Recurse -File | Sort-Object Length -Descending | Select-Object Name, @{Name="MB";Expression={[math]::Round($_.Length / 1MB, 2)}} -First 10
```

> Infrastructure engineers tracking down out-of-control disk space alerts use `Get-ChildItem` to generate thousands of file objects, streaming them to a sorting mechanism to instantly identify and extract the absolute top 10 largest files consuming storage capacity.

**Automated Codebase Refactoring Audits**

```powershell
Get-ChildItem -Path ./src -Recurse -Filter *.cs | Select-String -Pattern "TODO: Deprecated"
```

> Software developers pipeline `Get-ChildItem` directly into string manipulation tools. The cmdlet swiftly identifies every single C# source file in a nested repository, passing the absolute paths down the pipeline so `Select-String` can audit the text inside them for deprecated technical debt markers.

## When should it NOT be used?

- **Scanning multi-terabyte network shares containing millions of files:** **Reason:** `Get-ChildItem` instantiates a heavy, complex .NET `FileInfo` object for every single file it encounters. Running it recursively over millions of files will trigger catastrophic memory exhaustion and massive execution latency. **Use instead:** Low-level .NET calls like `[System.IO.Directory]::EnumerateFiles()` or highly optimized binaries like `robocopy /L`.
- **Searching file contents on Linux endpoints:** **Reason:** While `Get-ChildItem` piped to `Select-String` works, native Linux tools are vastly more optimized for plaintext C-routines. **Use instead:** `grep -r` or `rg` (Ripgrep).

## Alternatives

- **`[System.IO.Directory]::EnumerateFiles()`:** Underlying .NET API. **Tradeoff:** This raw .NET method returns purely string paths rather than rich `FileInfo` objects. Because it doesn't instantiate heavy objects, it executes orders of magnitude faster and uses a fraction of the memory, making it the definitive choice for massive filesystem crawls.
- **`find` (Linux/macOS native):** The POSIX standard. **Tradeoff:** `find` evaluates attributes and executes commands directly in highly optimized C-code rather than generating and piping objects, resulting in drastically faster execution speeds, but requiring brittle regex text-parsing to capture outputs.

## How it works internally

`Get-ChildItem` acts as a routing engine. When executed, it checks the path prefix (e.g., `C:\`, `HKLM:\`, `Env:\`) to identify which underlying **PowerShell Provider** manages that specific namespace.

It then issues a unified command down to the provider's specific API implementation. For the `FileSystem` provider, the cmdlet interfaces with the Win32 API (or POSIX equivalents on Linux) to execute directory enumerations.

Crucially, as the filesystem driver discovers files, PowerShell wraps the raw structural data inside highly extensible .NET Objects (such as `System.IO.FileInfo` for files, or `System.IO.DirectoryInfo` for folders). These objects carry extended types and dynamically computed properties (like the `Length` attribute translating to bytes). This instantiation process occurs iteratively. By pushing objects into the pipeline immediately as they are constructed, `Get-ChildItem` facilitates asynchronous downstream processing (like `ForEach-Object`) without waiting for the entire disk scan to conclude.

## Performance Notes

- **Filter vs. Include Penalty:** The `-Filter` parameter is pushed down to the underlying OS API (e.g., the NTFS driver). The `-Include` parameter is evaluated purely in PowerShell memory _after_ every file is retrieved. Consequently, `Get-ChildItem -Filter *.txt` is phenomenally faster than `Get-ChildItem -Include *.txt`.
- **The Object Overload:** Recursively scanning `C:\Windows` produces hundreds of thousands of complex objects. This consumes significant RAM. If only paths are required, use `(Get-ChildItem -Recurse).FullName` minimally, or default to the `[System.IO.Directory]` classes.

## Security Notes

- **Access Denied Exceptions:** `Get-ChildItem` respects strict Access Control Lists (ACLs). If the executing user lacks Read traversal permissions on a directory, the cmdlet will throw an `UnauthorizedAccessException` and halt recursion for that specific tree.
- **Visibility Bypasses:** Malicious actors frequently hide payloads by applying the Windows `Hidden` and `System` attributes to directories. `Get-ChildItem` strictly honors these attributes by default, blinding administrators to the files unless the explicit `-Force` parameter is provided.

## Common Mistakes

- **Trailing wildcards with `-Include`:** Running `Get-ChildItem -Path C:\Logs -Include *.txt`. **Why it's wrong:** The `-Include` flag only evaluates the final element of the path. If the path targets a directory `C:\Logs`, it checks if the directory name matches `*.txt`. It fails. You must append a wildcard to dive into the directory: `Get-ChildItem -Path C:\Logs\* -Include *.txt`.
- **Assuming it searches file text:** **Why it's wrong:** `Get-ChildItem` strictly interacts with namespace metadata (filenames, sizes, timestamps). It never touches the internal byte payloads of files. You must pipe its output to `Select-String` to evaluate file contents.
- **Using arrays for `-Filter`:** **Why it's wrong:** The `-Filter` parameter connects to legacy OS APIs, which only support a single string argument. Attempting to run `-Filter *.txt,*.log` will fail or throw errors. You must use `-Include` (with the performance penalty) to evaluate arrays of extensions.

## Best Practices

- When executing basic administrative hygiene scripts, aggressively utilize the dynamic switch parameters (`-File`, `-Directory`, `-Hidden`) introduced in modern PowerShell versions to offload filtering efficiency, bypassing bulky `Where-Object { $_.PSIsContainer }` legacy logic entirely.
- In scripts evaluating external inputs, universally favor `-LiteralPath` over `-Path`. Users frequently create files containing square brackets (e.g., `backup[1].zip`); `-Path` attempts to evaluate the brackets as a regex wildcard string, causing catastrophic "File Not Found" pipeline failures.

## Interview Questions

- _Query:_ What is the profound architectural difference in execution performance between using the `-Filter` parameter and the `-Include` parameter in `Get-ChildItem`?
  - _A:_ The `-Filter` parameter leverages the underlying provider's native API (e.g., the Windows NTFS driver). The OS filters the files instantly at the kernel level, returning only matching items to PowerShell. The `-Include` parameter forces the OS to return _every single file_ in the directory to PowerShell. PowerShell instantiates an object for every file, loads it into RAM, and then evaluates the regex string against it locally. Thus, `-Filter` is orders of magnitude faster.
- _Query:_ A developer attempts to run `Get-ChildItem` on the root of the `C:\` drive to find a specific configuration file, but the command outputs nothing and stops immediately. However, they know the file exists. What parameter is required to expose the missing file?
  - _A:_ The file or its parent directories are likely restricted by filesystem visibility bits (such as the `Hidden` or `System` attributes). `Get-ChildItem` safely respects these constraints by default to prevent clutter. The developer must append the `-Force` flag to instruct the cmdlet to bypass standard visibility masking and reveal all underlying inodes.
- _Query:_ How does `Get-ChildItem` technically manage to execute successfully when the `-Path` points to `HKLM:\Software` rather than a standard filesystem path like `C:\`?
  - _A:_ `Get-ChildItem` is not a traditional filesystem executable like Linux `ls`; it is a provider-agnostic router. PowerShell utilizes a "Provider" model that abstracts various data stores (Registry, Certificates, Environment Variables) into virtual, navigable drives. When the path `HKLM:\` is requested, the cmdlet routes the retrieval request explicitly to the PowerShell Registry Provider, which maps registry keys into custom .NET objects masquerading as standard directory structures.

## Practice Problems

- _Problem:_ Retrieve a list of exclusively file objects (no directories) in the current folder that possess the `.log` extension, executing the search as fast as mathematically possible at the OS level.
  - _Hint:_ Combine the dynamic file-only switch with the native OS parameter optimized for speed over the internal PowerShell array matchers.
  - _Solution:_ `Get-ChildItem -File -Filter *.log` (This offloads the pattern matching to the filesystem and strictly restricts object instantiation to raw files).
- _Problem:_ Perform a recursive search spanning the entire `C:\App\` directory tree to locate and output any files specifically possessing the `Hidden` attribute.
  - _Hint:_ Combine the recursive flag, the visibility override flag, and the specialized metadata filter flag.
  - _Solution:_ `Get-ChildItem -Path C:\App\ -Recurse -Force -Hidden` (The `-Force` allows access to the protected files, and `-Hidden` isolates the output strictly to those masked items).

## References

- [Microsoft Docs - Get-ChildItem](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem)
- [PowerShell Provider Architecture](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_providers)
  === END FILE ===
