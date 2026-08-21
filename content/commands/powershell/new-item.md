---
slug: new-item
name: New-Item
aliases:
  - ni
  - md
category: powershell
tags:
  - powershell
  - file-system
  - registry
  - creation
  - providers
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - create new file powershell
  - make directory powershell
  - create registry key ps
  - touch file equivalent powershell
  - create empty file
relatedCommands:
  - remove-item
  - get-childitem
  - copy-item
alternatives:
  - mkdir
status: draft
---

## What is it?

`New-Item` is a versatile PowerShell cmdlet used to create a new item and assign its initial value. Due to PowerShell's provider-agnostic architecture, this single cmdlet replaces dozens of disparate legacy tools, allowing operators to create files, nested directories, Windows Registry keys, certificates, or environment variables using identical syntax.

## Why does it exist?

Traditional shell environments require unique commands to instantiate different system objects (e.g., `mkdir` for folders, `touch` for empty files, `reg add` for registry keys). `New-Item` exists to eliminate this fragmentation. By communicating through PowerShell Providers, it provides a unified, predictable, object-oriented interface for scaffolding completely different hierarchical data stores, returning a concrete .NET object representing the newly created item for immediate pipeline manipulation.

## Syntax

```powershell
New-Item [-Path] <string[]> [-Name <string>] [-ItemType <string>] [-Value <Object>] [options]
```

## Flags

| Flag          | Description                                                                                        | Example                                           |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `-Path`       | The location where the new item will be created. Can be a directory path or registry hive.         | `New-Item -Path C:\Temp\`                         |
| `-Name`       | The name of the new item. If omitted, the name must be included at the end of the `-Path`.         | `New-Item -Path C:\ -Name app.log`                |
| `-ItemType`   | The provider-specific type of object to create (e.g., `File`, `Directory`, `String`, `DWord`).     | `New-Item -Path .\ -ItemType Directory`           |
| `-Value`      | The initial data or payload to write into the item upon creation.                                  | `New-Item -Path .\log.txt -Value "Init"`          |
| `-Force`      | Overrides restrictions, overwriting existing files or bypassing read-only protections.             | `New-Item -Path .\config.ini -Force`              |
| `-Credential` | Specifies alternate credentials used to access the destination path (e.g., for UNC network paths). | `New-Item -Path \\server\share -Credential $cred` |
| `-WhatIf`     | Simulates the creation operation, detailing what would happen without altering the system.         | `New-Item -Path .\test -WhatIf`                   |
| `-Confirm`    | Prompts the user interactively for a `Y/N` confirmation before executing the creation.             | `New-Item -Path .\prod.db -Confirm`               |

## Examples

```powershell
New-Item -Path .\deploy.log -ItemType File
```

> This replicates the Linux `touch` command. It instructs the FileSystem provider to instantiate an empty file named `deploy.log` in the current working directory. If the file already exists, it throws an error.

```powershell
New-Item -Path C:\Project\Source\App -ItemType Directory -Force
```

> This behaves exactly like `mkdir -p`. It creates the `App` directory, but the `-Force` flag ensures that if the parent directories (`Project\Source`) do not exist, they are automatically scaffolded alongside it without throwing errors.

```powershell
New-Item -Path .\config.json -ItemType File -Value '{"status":"active"}' -Force
```

> This creates a new file and immediately populates it with the string payload defined in `-Value`. The `-Force` flag instructs the provider to violently overwrite the file if a `config.json` file already exists at that path.

```powershell
New-Item -Path HKLM:\Software\MyOrg\Settings
```

> This invokes the Registry provider. It creates a brand-new registry key (a container, equivalent to a folder) at the specified hive path. (Note: To create a registry _value_ inside the key, you use `New-ItemProperty`).

```powershell
New-Item -Path Env:\CustomVar -Value "Production"
```

> This interacts with the Environment Variable provider, creating a new environment variable named `CustomVar` and assigning it the value `"Production"`. (Note: Environment variables created this way are ephemeral and vanish when the PowerShell session closes).

## Real-World Scenarios

**Scaffolding Project Workspaces**

```powershell
$Folders = @("src", "tests", "docs", "build\release")
$Folders | ForEach-Object { New-Item -Path "C:\Workspace\$_" -ItemType Directory -Force }
```

> Developers bootstrapping new application repositories pipe arrays of strings into `New-Item` to instantly instantiate standardized, complex directory structures, utilizing `-Force` to ignore errors if some folders already exist.

**Initializing Secure Log Files**

```powershell
$LogFile = New-Item -Path "C:\Logs\$(Get-Date -f 'yyyyMMdd').log" -ItemType File -Value "--- Log Started ---`r`n"
Set-Acl -Path $LogFile.FullName -AclObject $StrictAcl
```

> Automation scripts use `New-Item` to provision dated log files. Because `New-Item` passes the newly created `System.IO.FileInfo` object down the pipeline (captured in `$LogFile`), the script can immediately reference the exact `.FullName` path to apply strict Access Control Lists (ACLs) to the file.

## When should it NOT be used?

- **Appending data to existing files:** **Reason:** `New-Item -Force` destroys and truncates the existing file completely before writing the new value. It does not append. **Use instead:** `Add-Content` or `Out-File -Append`.
- **Downloading files from the internet:** **Reason:** While you can technically use `New-Item` and assign a downloaded string to `-Value`, it processes entirely in memory and corrupts binaries. **Use instead:** `Invoke-WebRequest -OutFile`.

## Alternatives

- **`mkdir` / `md` (Aliases):** Directory creation shorthand. **Tradeoff:** In PowerShell, `mkdir` is literally just an internal function wrapped around `New-Item -ItemType Directory`. It provides faster typing but no functional differences.
- **`New-ItemProperty`:** Registry value creation. **Tradeoff:** `New-Item` creates Registry _Keys_ (folders). It cannot create the actual DWORD or String values inside the keys. You must use `New-ItemProperty` to create the data entries.

## How it works internally

When you execute `New-Item`, the PowerShell engine evaluates the path prefix (e.g., `C:\`, `HKCU:\`) to determine which loaded PowerShell Provider owns the target namespace.

The cmdlet routes the request to that provider by invoking its internal `NewItem()` interface method. For the FileSystem provider, the `-ItemType` parameter dictates whether the provider instantiates a `[System.IO.FileStream]` or invokes `[System.IO.Directory]::CreateDirectory()`.

If the `-Force` flag is present, the provider's logic alters significantly. For files, `-Force` instructs the OS to overwrite existing files, truncate their lengths to 0 bytes, and write the new `-Value`. For directories, `-Force` suppresses the "Item Already Exists" error and silently creates any missing parent nodes in the path hierarchy (simulating `mkdir -p`). Finally, the provider returns the corresponding .NET object representing the newly created item.

## Performance Notes

- **Value Writing Constraints:** Supplying large multi-megabyte strings to the `-Value` parameter is highly inefficient. The parameter handles initialization strings well, but streaming massive data arrays should be handled explicitly by `Out-File` or `Set-Content` after the file is created.
- **Object Allocation:** Passing thousands of items through a pipeline to `New-Item` incurs heavy garbage collection overhead because the cmdlet instantiates and returns a complex .NET `FileInfo` or `DirectoryInfo` object for every creation event.

## Security Notes

- **NTFS Ownership:** Items created via `New-Item` are strictly owned by the User ID executing the PowerShell process, and they natively inherit the Access Control List (ACL) boundaries of their parent container.
- **Overwriting Protected Items:** The `-Force` parameter possesses the authority to overwrite files carrying the `Hidden` or `Read-Only` attributes. However, it cannot bypass core NTFS filesystem permissions; if the executing user lacks Write access to the destination, the command will still throw an `UnauthorizedAccessException`.

## Common Mistakes

- **Confusing registry keys and values:** Running `New-Item -Path HKLM:\Software\MyKey -Value "Data"`. **Why it's wrong:** In the Windows Registry, `New-Item` strictly creates Keys (folders). You cannot assign a string value to a Key itself. You must create the Key, then use `New-ItemProperty` to create the data entries inside it.
- **Forgetting `-ItemType` when creating files:** Running `New-Item -Path C:\data`. **Why it's wrong:** Without specifying the type or a file extension, PowerShell defaults to its provider configurations. Depending on the path string, it may create an extensionless file instead of a directory, causing subsequent script failures. Always explicitly declare `-ItemType Directory` or `-ItemType File`.
- **Unintended Overwrites:** Running `New-Item -Path config.txt -Force`. **Why it's wrong:** A junior admin might expect `-Force` to append or ensure creation. Instead, `-Force` violently zeroes out the file, instantly deleting the existing `config.txt` contents.

## Best Practices

- When scaffolding dynamic directory structures in automation pipelines, unconditionally leverage `New-Item -ItemType Directory -Force`. This makes the script perfectly idempotent, guaranteeing the folder exists without failing if a previous pipeline run already created it.
- Capture the output of the cmdlet into a variable (e.g., `$File = New-Item...`) so you can programmatically pass the `$File.FullName` property down the script, rather than manually constructing hardcoded string paths that are vulnerable to typo errors.
- Always test destructive or overwriting commands using the `-WhatIf` flag to visually verify the exact paths the cmdlet intends to target.

## Interview Questions

**Q:** A developer runs `New-Item -Path C:\Logs\App.log -ItemType File`. The `Logs` directory does not currently exist, so the command throws a "DirectoryNotFoundException". How do you alter the command to fix this?
**A:** You must append the `-Force` flag. In the FileSystem provider, supplying `-Force` fundamentally alters the behavior of directory resolution, causing the provider to automatically traverse the path and scaffold any missing parent directories (`C:\Logs`) before finally instantiating the requested file.
**Q:** What is the functional and destructive difference between executing `New-Item -Path config.ini` versus `New-Item -Path config.ini -Force` on a file that already exists and contains data?
**A:** Without `-Force`, the cmdlet detects that the file already exists and immediately throws a terminating "Item Already Exists" `IOException`, leaving the file contents entirely safe and unmodified. When `-Force` is applied, the cmdlet bypasses the collision check, violently overwrites the file, truncates its existing data to 0 bytes, and creates a blank file, destroying the original contents.
**Q:** Explain why `New-Item` is capable of creating a Windows Registry key just as easily as it creates a text file.
**A:** `New-Item` relies on PowerShell's Provider architecture. It acts as an abstraction layer (a router) that evaluates the requested path. When it detects `HKLM:\`, it routes the `NewItem()` execution instructions directly to the PowerShell Registry Provider API rather than the FileSystem API, mapping a unified syntax across disparate data stores.

## Practice Problems

**Problem:** Safely create an empty file named `audit.log` located inside `C:\Temp\Reports\`, instructing PowerShell to automatically generate any missing parent folders without prompting for confirmation.
**Hint:** Combine the path, the specific item type, and the execution override flag.
**Solution:** `New-Item -Path C:\Temp\Reports\audit.log -ItemType File -Force` (This creates the nested directories and drops the empty file seamlessly).
**Problem:** Create a new directory named `ProjectX` in the current working directory, but run it in a simulation mode that only outputs text describing what would happen, without actually altering the filesystem.
**Hint:** Declare the item type and append the simulation flag.
**Solution:** `New-Item -Path .\ProjectX -ItemType Directory -WhatIf` (This intercepts the system call and prints a "What if: Performing the operation..." safety message).

## References

- [Microsoft Docs - New-Item](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-item)
- [PowerShell Provider Architecture](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_providers)
  === END FILE ===
