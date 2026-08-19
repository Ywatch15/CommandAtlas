---
slug: get-item
name: Get-Item
aliases:
  - gi
category: powershell
tags:
  - powershell
  - filesystem
  - registry
  - providers
  - objects
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - get file metadata powershell
  - read registry key object
  - get folder properties
  - check if file exists powershell
  - retrieve powershell provider item
relatedCommands:
  - get-childitem
  - get-content
alternatives:
  - get-childitem
status: draft
---

## What is it?

`Get-Item` is a core PowerShell cmdlet used to retrieve a specific item—such as a file, a folder, a registry key, or a certificate—at a specified location. Crucially, it retrieves the _container or metadata object itself_, not the contents within it. It exposes the underlying .NET object (like a `System.IO.FileInfo`), allowing administrators to inspect modification timestamps, security descriptors, and absolute paths uniformly across completely disparate data stores.

## Why does it exist?

Traditional shells utilize different tools to manipulate different data environments (e.g., `ls` for files, `reg.exe` for the Windows Registry, specialized tools for certificates). PowerShell fundamentally altered this by introducing `PSProviders`—an abstraction layer that makes the Registry or Certificate store look and act exactly like a filesystem. `Get-Item` exists as the universal "fetch" tool. Whether retrieving a text file, a Registry Hive, or an environmental variable, `Get-Item` leverages the active provider to return a structured .NET object, unifying system administration under a single syntax and methodology.

## Syntax

```powershell
Get-Item [-Path] <String[]> [options]
Get-Item -LiteralPath <String[]> [options]
```

## Flags

| Flag           | Description                                                                                                                | Example                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `-Path`        | Specifies the path to an item. Supports wildcards (`*`). If a wildcard resolves to multiple items, it returns all of them. | `Get-Item -Path C:\Logs\*.log`                    |
| `-LiteralPath` | Specifies a path exactly as it is typed, preventing wildcard expansion. Mandatory for paths containing brackets `[ ]`.     | `Get-Item -LiteralPath 'C:\temp\file[1].txt'`     |
| `-Force`       | Overrides security restrictions to fetch hidden, system, or read-only items that are normally invisible.                   | `Get-Item -Path C:\bootmgr -Force`                |
| `-Filter`      | Passes a string directly to the underlying provider to filter results faster than standard wildcard matching.              | `Get-Item -Path C:\* -Filter *.exe`               |
| `-Include`     | Specifies an array of string patterns that the item must match to be returned. Evaluated by PowerShell, not the provider.  | `Get-Item -Path C:\Logs\* -Include *err*, *warn*` |
| `-Exclude`     | Specifies an array of string patterns that force the cmdlet to drop items from the return results.                         | `Get-Item -Path C:\Logs\* -Exclude *.old`         |
| `-Stream`      | (NTFS specific) Gets alternative data streams attached to a file instead of the primary data stream.                       | `Get-Item -Path file.txt -Stream Zone.Identifier` |

## Examples

```powershell
Get-Item -Path C:\Windows\System32\cmd.exe
```

> The standard invocation. Queries the FileSystem provider and returns a `System.IO.FileInfo` object representing the `cmd.exe` binary. The default terminal output displays its Mode, LastWriteTime, Length (size in bytes), and Name.

```powershell
Get-Item -Path HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion
```

> Queries the Registry provider. Because of the `PSProvider` abstraction, navigating the Registry is identical to the filesystem. It returns a `Microsoft.Win32.RegistryKey` object representing that specific registry path.

```powershell
Get-Item -Path Cert:\LocalMachine\Root\*
```

> Queries the Certificate provider. Using the wildcard `*`, it fetches all SSL/TLS root certificates installed in the Local Machine store, returning them as `X509Certificate2` objects for immediate auditing.

```powershell
Get-Item -Path Env:\Path
```

> Queries the Environment provider. Fetches the object representing the system's `$PATH` environment variable.

```powershell
(Get-Item -Path C:\backup.zip).Length / 1MB
```

> Demonstrates object-oriented extraction. Wrapping the command in parentheses forces evaluation. `Get-Item` fetches the object, the `.Length` property extracts the exact byte size, and PowerShell natively divides it by the `1MB` constant to return a human-readable megabyte size.

## Real-World Scenarios

**Checking File Access Control Lists (ACLs)**

```powershell
Get-Item -Path C:\Finance\Q1_Report.xlsx | Get-Acl
```

> Security audits require precise permission tracking. An administrator fetches the specific file object and pipes it directly into `Get-Acl`. Because `Get-Acl` accepts `FileInfo` objects by value, it instantly outputs the discrete NTFS security descriptor, revealing exactly which Active Directory groups have read/write access.

**Sanitizing Web Downloads (Mark-of-the-Web)**

```powershell
Get-Item -Path .\downloaded_script.ps1 -Stream Zone.Identifier -ErrorAction SilentlyContinue | Remove-Item -Stream Zone.Identifier
```

> When files are downloaded from the internet, Windows NTFS attaches an Alternate Data Stream (ADS) called the "Zone.Identifier" (Mark-of-the-Web), which blocks execution. A deployment script uses `Get-Item` to specifically target the ADS stream object and pipes it to `Remove-Item` to unblock the file automatically.

## When should it NOT be used?

- **Listing Directory Contents:** **Do not use `Get-Item C:\Windows` expecting to see the files inside it.** `Get-Item` fetches the _container_ itself (the metadata of the `C:\Windows` folder). To see the _contents_ of a container, you must use `Get-ChildItem` (the equivalent of `ls` or `dir`).
- **Reading File Text:** **Do not use `Get-Item` to read data.** Fetching `config.txt` returns the file's metadata (size, permissions). It does not open the file buffer or parse the text. You must use `Get-Content` to read the string data inside the file.

## Alternatives

- **`Get-ChildItem`:** **Best for traversal.** While `Get-Item` grabs the target object, `Get-ChildItem` grabs the objects _inside_ the target object, handling recursive tree crawling natively.
- **`[System.IO.FileInfo]::new("path")`:** **Best for extreme performance.** Instantiating the .NET class directly circumvents the entire `PSProvider` pipeline overhead, making it drastically faster in heavily parallelized scripts.

## How it works internally

When you execute `Get-Item -Path <string>`, PowerShell parses the drive prefix (e.g., `C:\`, `HKLM:\`, `Env:\`). It cross-references this prefix against its internal dictionary of mounted `PSDrives`.

Each `PSDrive` is backed by a specific `PSProvider` (a .NET class inheriting from `CmdletProvider` or `ItemCmdletProvider`).

`Get-Item` acts as a generic router. It forwards the request to the specific provider's `GetItem()` method.

- If the prefix is `C:\`, the `FileSystemProvider` intercepts the call, executing the native Win32/POSIX system calls (like `stat()`) to fetch file metadata, and wraps the result in a `System.IO.FileInfo` or `System.IO.DirectoryInfo` object.
- If the prefix is `HKLM:\`, the `RegistryProvider` intercepts it, calling `RegOpenKeyExW` via P/Invoke to fetch the key, wrapping it in a `RegistryKey` object.

This is why `Get-Item` returns completely different .NET object types depending on the path prefix, yet maintains a unified syntax for the administrator.

## Performance Notes

- **Wildcard Evaluation Penalty:** If you run `Get-Item C:\logs\*.log`, the `FileSystemProvider` must effectively list the directory contents to evaluate the wildcard before returning the specific items. Using `-Filter *.log` instead of passing the wildcard to `-Path` pushes the filtering logic down to the underlying OS API layer (e.g., the Win32 `FindFirstFileW` API), which is vastly faster.

## Security Notes

- **Bypassing Hidden Attributes:** By default, the `FileSystemProvider` respects the DOS `Hidden` and `System` attributes, explicitly excluding them from wildcard matches (e.g., `Get-Item C:\*`). To audit a system for concealed rootkit files or system hives, you must append the `-Force` flag.

## Common Mistakes

- **Confusing `Get-Item` with `Get-ChildItem`**
  - _Mistake:_ Typing `Get-Item C:\Projects\` and wondering why only a single line showing the `Projects` folder is returned.
  - _Why:_ `Get-Item` does exactly what it says: it gets the item you pointed at. It does not look inside. To list contents, use `Get-ChildItem`.
- **Failing to handle pipeline arrays**
  - _Mistake:_ Expecting `(Get-Item *.txt).LastWriteTime` to work when there are multiple text files in the directory.
  - _Why:_ If the wildcard matches one file, it returns an object. If it matches multiple, it returns an `[Object[]]` array. Prior to PowerShell 3.0, arrays did not support property enumeration, throwing an error. Modern PowerShell unrolls the array via Member-Access Enumeration, but it's crucial to understand you are receiving an array of dates, not a single date.

## Best Practices

- **Leverage Extended Properties:** The `FileInfo` objects returned by `Get-Item` are decorated by PowerShell's Extended Type System (ETS). Always pipe results to `Get-Member` or `Select-Object *` to discover hidden metadata fields like `.Extension`, `.BaseName`, or `.VersionInfo` that drastically simplify string parsing.

## Interview Questions

**Q: Explain the fundamental difference between what `Get-Item` and `Get-ChildItem` return when pointed at a specific directory path, such as `C:\Windows`.**
**A:** `Get-Item C:\Windows` returns a single `DirectoryInfo` object representing the metadata (creation time, permissions, attributes) of the `C:\Windows` folder itself. `Get-ChildItem C:\Windows` returns a collection of `FileInfo` and `DirectoryInfo` objects representing all the files and folders _contained inside_ the `C:\Windows` directory.

**Q: You need to read the value of a specific Registry key using PowerShell. Why is running `Get-Item -Path HKLM:\Software\MyApp` insufficient for reading the actual data value?**
**A:** `Get-Item` returns the container object itself (the `RegistryKey` object). The actual data inside the registry (like strings or DWORDs) are properties of that container. To retrieve the specific data values stored inside the registry key, you must pipe the object to `Get-ItemProperty` or use `Get-ItemPropertyValue`.

## Practice Problems

**Problem:** You are auditing a script. You need to fetch the exact metadata for a file named `deployment[prod].yaml`. You do not want to read its contents, just its filesystem object. Write the command to fetch it, ensuring PowerShell doesn't misinterpret the brackets as regex-style character matching.
**Hint:** Use the parameter that bypasses all wildcard evaluation.
**Solution:**

```powershell
Get-Item -LiteralPath '.\deployment[prod].yaml'
```

**Problem:** You need to fetch the absolute physical path of the `notepad.exe` binary. You know it is in `C:\Windows\System32`. Write a command that fetches the item and uses dot notation to extract exclusively the string value of its `FullName` property.
**Hint:** Wrap the `Get-Item` command in parentheses to evaluate it as an object before calling the property.
**Solution:**

```powershell
(Get-Item -Path C:\Windows\System32\notepad.exe).FullName
```

## References

- [Get-Item (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-item)
- [about_Providers (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_providers)
