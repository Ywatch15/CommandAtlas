---
slug: copy-item
name: Copy-Item
aliases:
  - cp
  - copy
  - cpi
category: powershell
tags:
  - powershell
  - file-system
  - transfer
  - copy
  - registry
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - copy files in powershell
  - copy directory and contents
  - duplicate registry key powershell
  - transfer files to remote session
  - recursively copy folder
relatedCommands:
  - remove-item
  - get-childitem
  - new-item
status: draft
alternatives: []
---

## What is it?

`Copy-Item` is a versatile PowerShell cmdlet used to duplicate items from one location to another within a namespace. Unlike traditional shell copy commands (like UNIX `cp` or Windows `copy`), it is entirely provider-agnostic, meaning it can recursively duplicate files and folders on a disk, registry keys in the Windows Registry, or certificates in the cert store using the exact same syntax.

## Why does it exist?

Operating systems feature wildly diverse hierarchical data stores (filesystems, registries, certificate stores, variable environments). Interacting with each required disparate, highly specialized tools (e.g., `xcopy` for files, `reg.exe` for the registry). `Copy-Item` exists to unify these operations under a single, object-oriented interface via the PowerShell Provider model, allowing administrators to execute consistent copy operations across any supported namespace, including remote servers via WinRM.

## Syntax

```powershell
Copy-Item [-Path] <string[]> [[-Destination] <string>] [options]
Copy-Item -LiteralPath <string[]> [[-Destination] <string>] [options]
```

## Flags

| Flag           | Description                                                                                                       | Example                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `-Path`        | Specifies the path to the items to copy. Fully supports wildcard (`*`, `?`) pattern matching.                     | `Copy-Item -Path .\*.log -Destination C:\Archive\`                    |
| `-LiteralPath` | Specifies the exact path to the item. Suppresses all wildcard interpretation.                                     | `Copy-Item -LiteralPath '.\[TEST]data.txt' -Destination C:\`          |
| `-Destination` | The path to the new location. Can be a directory, a new filename, or a remote path.                               | `Copy-Item -Path .\app.exe -Destination .\backup.exe`                 |
| `-Recurse`     | Instructs the cmdlet to perform a deep copy of a container and all its nested child items.                        | `Copy-Item -Path .\src -Destination .\backup -Recurse`                |
| `-Force`       | Overrides restrictions, allowing the copying of hidden or read-only files, or overwriting read-only destinations. | `Copy-Item -Path .\system.db -Destination D:\ -Force`                 |
| `-PassThru`    | Returns an object representing the copied item(s) down the pipeline.                                              | `Copy-Item .\file.txt -Destination .\backup\ -PassThru`               |
| `-Filter`      | Filters the path using fast, provider-specific syntax (e.g., `*.txt`).                                            | `Copy-Item -Path C:\logs\* -Filter *.err -Destination D:\`            |
| `-Include`     | Copies only items matching the specified wildcard patterns.                                                       | `Copy-Item -Path C:\data\* -Include *.csv,*.xml -Dest D:\`            |
| `-Exclude`     | Omits items matching the specified wildcard patterns.                                                             | `Copy-Item -Path C:\src\* -Exclude *.tmp -Destination D:\`            |
| `-Container`   | Preserves directory structure during recursive copies. If `$false`, it flattens files into the root destination.  | `Copy-Item -Path .\* -Destination C:\Flat -Recurse -Container:$false` |
| `-ToSession`   | Copies files securely from the local machine to a remote PowerShell session over WinRM.                           | `Copy-Item -Path .\app -Destination C:\ -ToSession $session`          |
| `-FromSession` | Copies files securely from a remote PowerShell session back to the local machine.                                 | `Copy-Item -Path C:\log -Destination .\ -FromSession $session`        |

## Examples

```powershell
Copy-Item -Path .\report.pdf -Destination .\archive\report_2026.pdf
```

> This copies a single file from the current directory into the `archive` subdirectory, simultaneously renaming the file to `report_2026.pdf` during the transfer operation.

```powershell
Copy-Item -Path C:\app\data -Destination D:\backups\ -Recurse -Force
```

> This initiates a deep, recursive duplication of the entire `data` directory hierarchy, transferring all nested subdirectories and files over to the `D:` drive. The `-Force` flag ensures that hidden system files within the directory are also copied.

```powershell
Copy-Item -Path HKLM:\Software\MyCorp\AppV1 -Destination HKLM:\Software\MyCorp\AppV2 -Recurse
```

> This showcases the provider-agnostic nature of the cmdlet. It seamlessly clones an entire Windows Registry key hive, including all of its nested subkeys and property values, to a new registry path.

```powershell
Copy-Item -Path C:\logs\* -Filter *.log -Destination \\NAS-01\Archive\
```

> This filters the source path explicitly at the provider level (`-Filter`), grabbing only files terminating in `.log`, and streams them across the network to a remote SMB (CIFS) file share.

```powershell
$session = New-PSSession -ComputerName WebServer01
Copy-Item -Path .\deploy_payload.zip -Destination C:\temp\ -ToSession $session
```

> This executes a highly secure, frictionless file transfer. Utilizing an established WinRM session (`$session`), it tunnels the binary payload of `deploy_payload.zip` over the encrypted PowerShell remoting channel directly to the `C:\temp\` directory on the remote server, completely bypassing the need for SMB or FTP access.

## Real-World Scenarios

**Flattening Nested Directory Structures**

```powershell
Copy-Item -Path C:\Project\Source\* -Destination C:\Project\Compiled\ -Recurse -Container:$false
```

> Build engineers frequently need to extract compiled binaries buried deep within nested artifact directories. By explicitly setting `-Container:$false`, `Copy-Item` recursively scours the source tree but dumps every discovered file into the single flat destination root, stripping away all parent folder scaffolding.

**Agentless File Deployment to Server Fleets**

```powershell
Invoke-Command -ComputerName (Get-Content servers.txt) -ScriptBlock { New-Item -ItemType Directory -Path C:\App\ -Force }
$sessions = New-PSSession -ComputerName (Get-Content servers.txt)
Copy-Item -Path .\Release\* -Destination C:\App\ -ToSession $sessions -Recurse
```

> Cloud infrastructure teams deploy application updates to fleets of Windows servers simultaneously. They establish an array of PSSessions and utilize `-ToSession` to push the release directory out to dozens of remote nodes in parallel over WinRM, without exposing file shares.

## When should it NOT be used?

- **Massive, multi-gigabyte file server migrations:** **Reason:** `Copy-Item` operates by instantiating robust .NET objects for every single file it touches, introducing severe memory overhead and sluggishness when processing millions of files. It lacks multi-threaded block-level copying. **Use instead:** `robocopy` or `rsync`.
- **Preserving precise NTFS ACLs and Ownership metadata:** **Reason:** By default, `Copy-Item` creates _new_ files at the destination. The new files inherit the NTFS permissions of the destination parent folder and are owned by the user executing the command, stripping the original source permissions. **Use instead:** `robocopy /COPYALL`.

## Alternatives

- **`robocopy` (Robust File Copy):** The enterprise standard for Windows file transfers. **Tradeoff:** `robocopy` is orders of magnitude faster, multi-threaded (`/MT`), handles network interruptions gracefully, and clones exact security descriptors, but it is strictly a binary executable incapable of interacting natively with the PowerShell Registry or Certificate providers.
- **`rsync` (Linux/macOS):** The POSIX synchronization standard. **Tradeoff:** Perfect for delta-transfers over SSH, but unavailable natively in standard Windows PowerShell environments.

## How it works internally

When `Copy-Item` is executed, the PowerShell engine inspects the source path to determine which Provider currently claims ownership of the namespace (e.g., the `FileSystem` provider or the `Registry` provider).

The command delegates execution to that specific provider's `CopyItem()` internal method. For the filesystem, the provider instantiates a `[System.IO.FileInfo]` or `[System.IO.DirectoryInfo]` object for the source. It allocates a new file handle at the destination and initiates a binary stream read/write sequence to duplicate the file contents, utilizing the operating system's standard I/O buffers.

If `-ToSession` or `-FromSession` are invoked, PowerShell serializes the file data into massive base64-encoded payload chunks and transmits them within the standard WS-Management (WinRM) SOAP envelopes over HTTP/HTTPS, seamlessly reassembling the binary files on the remote host without requiring any dedicated file-transfer protocols.

## Performance Notes

- **The Wildcard Traversal Penalty:** Running `Copy-Item C:\src\* -Include *.txt -Recurse` forces PowerShell to evaluate every single object in the hierarchy, load it into memory, and manually check the `-Include` regex string. Using `-Filter *.txt` offloads the check to the low-level NTFS filesystem driver, executing drastically faster.
- **Object Instantiation Overhead:** Copying 100,000 1KB files using `Copy-Item` takes significantly longer than copying one 100MB file because the overhead of instantiating, tracking, and disposing of 100,000 .NET objects swamps the CPU and memory garbage collector.

## Security Notes

- **NTFS Inheritance Traps:** The copied files are brand new entities to the filesystem. They will inherently adopt the Access Control Lists (ACLs) of the destination directory. If you copy highly sensitive cryptographic keys into a globally readable directory, the keys instantly become globally readable.
- **Execution Policies and AppLocker:** Copying executables or scripts from network zones might attach a "Mark of the Web" (MotW) Alternate Data Stream to the file. When executed, Windows SmartScreen or Execution Policies may aggressively block the cloned files until they are explicitly unblocked via `Unblock-File`.

## Common Mistakes

- **Trailing slash ambiguity:** Running `Copy-Item C:\folder D:\backup`. **Why it's wrong:** If `D:\backup` exists, the folder is placed _inside_ it (`D:\backup\folder`). If it doesn't exist, the folder's _contents_ are copied and the new directory is named `backup`. Always enforce directory targeting cleanly (e.g., ensuring trailing slashes on destinations).
- **Forgetting `-Recurse`:** Running `Copy-Item C:\logs\ D:\archive\`. **Why it's wrong:** The command will create an empty directory named `logs` inside `archive` and immediately halt, failing to copy any of the nested files inside the source directory.
- **Using `Copy-Item` for backups:** Expecting it to behave like an incremental backup. **Why it's wrong:** `Copy-Item` blindly overwrites files or fails if conflicts occur. It possesses no delta-sync or "copy if newer" logic. Use `robocopy /MIR` for mirror syncing.

## Best Practices

- Universally adopt `-Filter` over `-Include` when traversing standard filesystems to leverage kernel-level search speeds, reserving `-Include` purely for complex array-based regex matching.
- In deployment automation scripts, utilize `-PassThru` and pipe the resulting objects to a logging array. This guarantees an exact, auditable ledger of every physical file successfully instantiated at the destination.
- When utilizing `-ToSession` for remote deployments, pre-compress large directories into a single `.zip` file, `Copy-Item` the zip over the session, and extract it remotely via `Expand-Archive`. This minimizes WinRM serialization overhead and massively accelerates transfer speeds.

## Interview Questions

- _Query:_ A junior admin executes `Copy-Item -Path C:\Project\* -Destination D:\Backup -Include *.js -Recurse`, but complains it takes 20 minutes to scan the drive. How do you optimize this exact command?
  - _A:_ The `-Include` parameter requires PowerShell to retrieve every single file in the directory tree into memory and evaluate it against the regex string internally. You should switch to the `-Filter *.js` parameter. The `-Filter` parameter pushes the query down to the underlying OS filesystem API (e.g., NTFS), which evaluates and returns only the matching files natively, resulting in near-instantaneous execution.
- _Query:_ What happens to the file permissions (Access Control Lists) when a file is duplicated using `Copy-Item`?
  - _A:_ `Copy-Item` creates a brand new file object at the destination. Therefore, it completely abandons the specific permissions assigned to the source file. The newly created file dynamically inherits the permissions defined by the destination parent folder. If absolute permission retention is required, external utilities like `robocopy /COPYALL` must be used.
- _Query:_ Explain the specific architectural advantage of utilizing the `-ToSession` parameter over simply mapping a network drive (SMB/CIFS) when copying files to a remote server.
  - _A:_ The `-ToSession` parameter tunnels the file payload entirely through the PowerShell Remoting (WinRM) protocol over port 5985/5986. This completely bypasses the need to open traditional file-sharing ports (SMB 445), manage complex network share permissions, or deal with firewall drops, providing a highly secure, encrypted file transfer mechanism natively baked into standard administrative access boundaries.

## Practice Problems

- _Problem:_ Copy a specific registry key hierarchy located at `HKCU:\Software\MyApp\Settings` and all of its nested keys to a new backup location at `HKCU:\Software\MyApp\Settings_Backup`.
  - _Hint:_ Target the registry provider path and utilize the deep copy flag.
  - _Solution:_ `Copy-Item -Path HKCU:\Software\MyApp\Settings -Destination HKCU:\Software\MyApp\Settings_Backup -Recurse` (This leverages the provider-agnostic nature of the cmdlet to clone registry hives instantly).
- _Problem:_ Recursively copy an entire web application folder `C:\App\Src\` to `D:\App\Flat\`, but purposefully destroy all internal directory structures so that every single file ends up directly in the root of the `Flat` directory.
  - _Hint:_ Chain the recursive flag with the boolean parameter that manages structural preservation.
  - _Solution:_ `Copy-Item -Path C:\App\Src\* -Destination D:\App\Flat\ -Recurse -Container:$false` (Setting `-Container:$false` explicitly commands the engine to drop directory items and only copy raw file items).

## References

- [Microsoft Docs - Copy-Item](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/copy-item)
- [PowerShell Remoting File Transfer](https://learn.microsoft.com/en-us/powershell/scripting/learn/remoting/running-remote-commands)
  === END FILE ===
