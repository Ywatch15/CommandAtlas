---
slug: remove-item
name: Remove-Item
aliases:
  - rm
  - del
  - erase
  - rmdir
  - rd
category: powershell
tags:
  - powershell
  - file-system
  - delete
  - registry
  - removal
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - delete file powershell
  - remove directory and contents ps
  - force delete locked file
  - delete registry key powershell
  - remove files by extension
relatedCommands:
  - new-item
  - copy-item
status: draft
---

## What is it?

`Remove-Item` is a foundational PowerShell cmdlet used to permanently delete one or more items from a namespace. Like its creation counterpart, it is provider-agnostic, meaning it acts as the universal engine for eradicating physical files, deeply nested directories, Windows Registry keys, certificates, or environment variables using identical syntax.

## Why does it exist?

Traditional operating systems fragmented deletion tools based on the object type (`rm` for files, `rmdir` for folders, `reg delete` for registry keys). `Remove-Item` exists to unify these destructive operations. By delegating execution logic to the underlying PowerShell Providers, it allows administrators to write consistent, object-oriented cleanup scripts that traverse and purge arbitrary system stores seamlessly, backed by standardized safety features like `-WhatIf` and `-Confirm`.

## Syntax

```powershell
Remove-Item [-Path] <string[]> [options]
Remove-Item -LiteralPath <string[]> [options]
```

## Flags

| Flag           | Description                                                                                       | Example                                                     |
| -------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `-Path`        | Specifies the path(s) to the items slated for deletion. Supports wildcards (`*`, `?`).            | `Remove-Item -Path C:\Logs\*.log`                           |
| `-LiteralPath` | Specifies the exact path to the item. Strictly bypasses wildcard interpretation.                  | `Remove-Item -LiteralPath '.\test[1].txt'`                  |
| `-Recurse`     | Aggressively deletes the specified container (folder/key) and all of its nested child items.      | `Remove-Item -Path .\build\ -Recurse`                       |
| `-Force`       | Overrides visibility and access restrictions, allowing the deletion of Hidden or Read-Only files. | `Remove-Item -Path .\sys.tmp -Force`                        |
| `-Filter`      | Filters the path using high-speed, provider-specific native query syntax.                         | `Remove-Item -Path C:\* -Filter *.tmp`                      |
| `-Include`     | Deletes only the items matching the specified string/wildcard array within the path.              | `Remove-Item -Path .\* -Include *.log,*.tmp`                |
| `-Exclude`     | Omits items matching the specified wildcard array, protecting them from deletion.                 | `Remove-Item -Path .\* -Exclude *.bak`                      |
| `-WhatIf`      | Simulates the deletion operation, printing exactly what would be destroyed without acting.        | `Remove-Item -Path .\data\* -WhatIf`                        |
| `-Confirm`     | Prompts the user interactively with a `Y/N` query before deleting every matched item.             | `Remove-Item -Path *.log -Confirm`                          |
| `-ErrorAction` | Dictates how the cmdlet responds to non-terminating errors (e.g., `SilentlyContinue`, `Stop`).    | `Remove-Item -Path ghost.txt -ErrorAction SilentlyContinue` |

## Examples

```powershell
Remove-Item -Path .\old_script.ps1
```

> This executes a standard file deletion, utilizing the FileSystem provider to unlink the specific file from the current directory. If the file is marked read-only, this command will throw a permission error.

```powershell
Remove-Item -Path C:\App\Temp\ -Recurse -Force
```

> This behaves exactly like `rm -rf` in Linux. It forces the deletion of a deeply nested folder hierarchy, completely suppressing safety prompts and violently purging hidden or read-only items encountered in the tree.

```powershell
Remove-Item -Path HKLM:\Software\MyCorp\LegacyApp -Recurse
```

> Demonstrating provider-agnosticism, this targets the Windows Registry. It completely obliterates a registry hive key and every single data value or subkey nested within it, instantly cleaning up legacy installation artifacts.

```powershell
Remove-Item -Path C:\Logs\* -Include *.log -Exclude *system* -WhatIf
```

> This executes a highly precise, simulated cleanup string. It scans the logs folder, targets strictly `.log` files, mathematically excludes any file containing the string `system`, and performs a dry-run (`-WhatIf`), outputting the names of the files destined for deletion to the terminal for safe review.

```powershell
Get-ChildItem -Path C:\Downloads -File -Filter *.iso | Remove-Item
```

> This leverages the pipeline. `Get-ChildItem` rapidly isolates massive `.iso` binary files and streams their `.NET` objects directly into `Remove-Item`, which intercepts the object paths and deletes them one by one.

## Real-World Scenarios

**Daily Active Log Rotation & Retention**

```powershell
Get-ChildItem -Path "C:\IIS_Logs" -Filter *.log |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force
```

> Systems administrators execute automated cron/scheduled tasks that scan specific logging directories, evaluating the `LastWriteTime` property of every file. Any object older than 30 days is pipelined into `Remove-Item` and permanently purged to prevent disk saturation.

**Idempotent CI/CD Pipeline Teardowns**

```powershell
Remove-Item -Path ".\dist\", ".\build\" -Recurse -Force -ErrorAction SilentlyContinue
```

> Automation runners cleaning up after a build process explicitly target compilation folders for recursive deletion. By applying `-ErrorAction SilentlyContinue`, the script becomes perfectly idempotent—if the folders don't exist because the build failed early, the script ignores the "Path not found" error and succeeds cleanly.

## When should it NOT be used?

- **Secure, irrecoverable data wiping:** **Reason:** `Remove-Item` only unlinks the file pointer from the filesystem directory tree; the actual magnetic/flash data remains intact and recoverable via forensic tools until overwritten. **Use instead:** Third-party secure wiping utilities (like `sdelete` or `shred`).
- **Uninstalling Windows Applications:** **Reason:** Deleting a program's `C:\Program Files\` folder leaves orphaned registry keys, broken COM objects, and dangling start menu shortcuts. **Use instead:** WMI/CIM methods or `msiexec /x` to invoke official uninstallation routines.

## Alternatives

- **`cmd.exe /c del` or `rmdir`:** Legacy DOS commands. **Tradeoff:** Invoking native DOS commands skips the heavy `.NET` object instantiation overhead of PowerShell. For deleting a folder containing millions of microscopic files, `cmd /c rmdir /s /q folder` is significantly faster than `Remove-Item`.
- **`Clear-Item` / `Clear-Content`:** Data purging. **Tradeoff:** These alternatives wipe the internal contents/values of a file or registry key, resetting its size to zero, but they leave the actual file or key object structurally intact on the system.

## How it works internally

When `Remove-Item` executes, the PowerShell engine evaluates the requested path to identify the authoritative Provider (e.g., FileSystem, Registry, Certificate).

The cmdlet translates the request into an invocation of the provider's `RemoveItem()` method. If `-Recurse` is specified on a container (a folder or registry key), the provider initiates a depth-first traversal tree walk. It descends to the absolute bottom of the nested hierarchy, unlinking files via OS-level APIs (like `DeleteFile` in Win32), and systematically executing `RemoveDirectory` as it walks back up the tree.

If `-Force` is applied, the provider executes secondary logic before deletion. For the FileSystem provider, if it encounters an `UnauthorizedAccessException` due to a "Read-Only" attribute, `-Force` instructs the provider to explicitly alter the file's metadata—stripping the Read-Only, Hidden, or System attributes—before re-attempting the physical deletion system call.

## Performance Notes

- **The Wildcard/Recurse Penalty:** In older PowerShell versions (5.1), running `Remove-Item C:\Temp\* -Recurse` can perform wildly unpredictably, sometimes deleting the contents but missing subdirectories. The mathematically safe and far more performant method for massive trees is piping from the scanner: `Get-ChildItem C:\Temp -Recurse | Remove-Item -Force`.
- **Garbage Collection Overhead:** Deleting directories containing hundreds of thousands of files via the pipeline forces PowerShell to allocate and destroy a `.NET` object in RAM for every single file. This is exponentially slower than native API deletions.

## Security Notes

- **Bypassing Attributes vs ACLs:** The `-Force` parameter is a convenience tool that strips basic file attributes (Read-Only/Hidden). It is completely powerless against NTFS Access Control Lists (ACLs). If the executing user lacks strict `Modify` or `Full Control` security permissions on the target object, the OS kernel rejects the `Remove-Item` attempt permanently.
- **Symlink Traversal Danger:** When `Remove-Item -Recurse` encounters a symbolic link or junction pointing to another disk location, it deletes the link itself, _not_ the target files. However, older shell bugs or careless pipeline logic can inadvertently traverse symlinks, resulting in catastrophic deletion of unintended data external to the target directory.

## Common Mistakes

- **Wildcard Evaluation with Brackets:** Running `Remove-Item C:\Data\Report[1].txt`. **Why it's wrong:** The `-Path` parameter attempts to evaluate `[1]` as a regex match. It will fail to find the file. You must use `-LiteralPath 'C:\Data\Report[1].txt'` to force exact string matching.
- **Forgetting `-Recurse` on populated folders:** Running `Remove-Item C:\Logs`. **Why it's wrong:** By default, PowerShell protects containers. If `C:\Logs` has files inside it, the cmdlet suspends automation and throws an interactive terminal prompt: `The item at C:\Logs has children... [Y] Yes [A] Yes to All...`. This completely breaks unattended scripts. Always use `-Recurse`.
- **Missing `-Force` on system files:** Trying to delete `.git` directories and failing. **Why it's wrong:** Source control and system processes inject hidden or read-only files. `Remove-Item` honors these protections and throws an error. You must explicitly override them with `-Force`.

## Best Practices

- In destructive automation scripts, rigorously enforce the use of `-WhatIf` during the testing phase. Redirecting its output to a log verifies mathematically exactly what paths the wildcard strings resolved to before triggering irreversible data loss.
- Always chain `ErrorAction SilentlyContinue` when writing idempotent cleanup blocks. If a previous step crashed or already deleted the file, the script shouldn't throw a red terminal error for a cleanup action that technically succeeded in spirit.
- When sweeping directories using the pipeline, segregate files from directories to prevent target locking errors: `Get-ChildItem -Path $Dir -File | Remove-Item -Force`.

## Interview Questions

- _Query:_ An automation script executes `Remove-Item -Path C:\Project\ -Recurse` in a CI/CD pipeline, but the pipeline hangs indefinitely waiting for input. What caused the hang, and how do you resolve it?
  - _A:_ The target directory contains files marked with the `Hidden` or `Read-Only` file attributes. When `Remove-Item` encounters these protected files, it halts the automated deletion and generates an interactive prompt in the terminal requiring a human to type "Yes" to confirm the overwrite. Because CI/CD is headless, the prompt hangs forever. To fix it, append the `-Force` flag to bypass the attribute protections silently.
- _Query:_ Explain the functional difference between executing `Remove-Item -Path C:\Logs\*.log` and `Remove-Item -Path C:\Logs -Filter *.log`.
  - _A:_ The wildcard `-Path` matches the string entirely within the PowerShell memory space. It is slow and broad. The `-Filter` parameter pushes the evaluation string down to the underlying OS API (the NTFS filesystem driver). The filesystem driver performs the filtering natively and returns only the matching items to PowerShell, resulting in drastically faster execution speeds on massive directories.
- _Query:_ Why does running `Remove-Item -Path C:\data.txt -Force` fail with an `UnauthorizedAccessException` when the executing administrator clearly has the Force flag enabled?
  - _A:_ The `-Force` flag is a convenience utility; it only overrides basic file attributes (like Read-Only or System metadata). It has absolutely no power over the operating system's core security model. If the NTFS Access Control List (ACL) explicitly denies the administrator `Modify/Write` permissions, or if another active process is holding an exclusive file lock on `data.txt`, the OS kernel rejects the deletion attempt.

## Practice Problems

- _Problem:_ Delete the directory `C:\App\Temp` and absolutely all of its nested contents. Ensure the command suppresses any non-terminating errors (like "path not found") and forcefully bypasses read-only file protections.
  - _Hint:_ Combine the recursive flag, force override, and error action specification.
  - _Solution:_ `Remove-Item -Path C:\App\Temp -Recurse -Force -ErrorAction SilentlyContinue` (This executes a violent, idempotent wipe suitable for unmonitored scripts).
- _Problem:_ Perform a simulated dry-run to identify every `.tmp` file located anywhere within the `C:\Workspace` directory tree that _would_ be deleted, without actually deleting anything.
  - _Hint:_ Traverse the tree, filter for the specific extension, pipe to the deletion command, and utilize the simulation flag.
  - _Solution:_ `Get-ChildItem -Path C:\Workspace -Filter *.tmp -Recurse | Remove-Item -WhatIf` (The pipeline feeds the objects securely into the destruction engine, which intercepts and prints the targets).

## References

- [Microsoft Docs - Remove-Item](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item)
- [about_Providers (PowerShell)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_providers)
  === END FILE ===
