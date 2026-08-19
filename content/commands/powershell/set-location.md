---
slug: set-location
name: Set-Location
aliases:
  - cd
  - sl
  - chdir
category: powershell
tags:
  - powershell
  - navigation
  - filesystem
  - providers
  - paths
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - change directory powershell
  - navigate filesystem
  - cd equivalent in powershell
  - go to registry path
  - switch working directory
relatedCommands:
  - get-childitem
status: draft
---

## What is it?

`Set-Location` is the PowerShell native cmdlet used to change the current working directory of the active shell session. Functioning as the exact equivalent to the POSIX `cd` command, it updates the environmental context for all subsequent relative path operations. Because it integrates with PowerShell's `PSProvider` architecture, it enables users to seamlessly navigate not only physical hard drives, but also Windows Registries, Certificate Stores, and active environment variables.

## Why does it exist?

Navigating hierarchal data structures is the core requirement of any terminal interface. While legacy systems required different utilities to interact with different data stores (e.g., `cd` for files, `regedit` for the registry, `certmgr` for certificates), PowerShell was designed to unify administrative experiences. `Set-Location` exists to provide a singular, universally applicable command. By establishing a standard interface over the `CmdletProvider` base classes, an administrator can use the exact same syntax and muscle memory to traverse an SQL database, an IIS configuration tree, or a standard disk drive.

## Syntax

```powershell
Set-Location [[-Path] <String>] [options]
Set-Location -LiteralPath <String> [options]
```

## Flags

| Flag           | Description                                                                                                                     | Example                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `-Path`        | (Positional) The destination path. Supports wildcard expansions. Defaults to the user's home directory if omitted.              | `Set-Location -Path C:\Windows\Sys*`     |
| `-LiteralPath` | The exact destination path. Prevents wildcard resolution, mandatory if navigating into a folder named with brackets `[ ]`.      | `Set-Location -LiteralPath 'C:\data[1]'` |
| `-PassThru`    | Passes an object representing the new location back to the pipeline instead of executing silently.                              | `Set-Location C:\Scripts -PassThru`      |
| `-StackName`   | Sets the location from a specific named location stack (managed by `Push-Location`), rather than a physical path.               | `Set-Location -StackName 'ProjectA'`     |
| `-Force`       | Bypasses permission warnings and allows navigation into hidden or system-protected namespaces.                                  | `Set-Location HKLM:\SAM -Force`          |
| `-WhatIf`      | Displays what would happen if the cmdlet executes, without actually changing the current directory.                             | `Set-Location D:\Backup -WhatIf`         |
| `-Confirm`     | Prompts for confirmation before executing the directory change.                                                                 | `Set-Location C:\Critical -Confirm`      |
| `-ErrorAction` | Dictates behavior upon failure (e.g., if a directory doesn't exist). Using `Stop` is critical for robust script error handling. | `Set-Location Z:\ -ErrorAction Stop`     |

## Examples

```powershell
Set-Location C:\inetpub\wwwroot
```

> The standard absolute path navigation. Changes the active runspace's working directory to the specified absolute path. In interactive use, users typically use the alias `cd`.

```powershell
Set-Location ..\logs
```

> Relative path traversal. The `..` component references the parent directory of the current working location. The cmdlet traverses exactly one level up, and then down into the `logs` directory.

```powershell
Set-Location HKLM:\SOFTWARE\Microsoft
```

> Cross-provider navigation. Bypasses the filesystem entirely and changes the active working directory into the `HKEY_LOCAL_MACHINE` hive of the Windows Registry. Once inside, running `Get-ChildItem` (or `ls`) will output registry keys instead of files.

```powershell
Set-Location Cert:\LocalMachine\My
```

> Certificate store navigation. Jumps into the Local Machine's personal certificate store. This is the fastest way for administrators to visually inspect installed TLS/SSL certificates dynamically using standard filesystem commands.

```powershell
Set-Location ~
```

> Navigates instantly to the current user's home directory. The tilde (`~`) is dynamically resolved by the PowerShell provider to the value of `$HOME` (e.g., `C:\Users\Admin`).

## Real-World Scenarios

**Anchoring Script Execution Paths**

```powershell
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location -LiteralPath $PSScriptRoot -ErrorAction Stop
```

> A crucial pattern for reliable automation. When a script is executed via a Scheduled Task or an external pipeline, the initial working directory is often unpredictable (e.g., `C:\Windows\System32`). The script programmatically determines its own physical location and uses `Set-Location` to explicitly anchor itself there, ensuring all relative paths (`.\config.json`) resolve flawlessly.

**Dynamic Module Loading Contexts**

```powershell
Set-Location Env:\
Get-ChildItem | Where-Object Name -match "PATH"
```

> An administrator needs to troubleshoot why an executable is failing to launch. Instead of parsing long strings, they simply "cd" into the environment variables provider (`Env:\`) and list the active variables directly, exploring system state as if it were a physical folder.

## When should it NOT be used?

- **Deep Directory Stacks:** **Do not use `Set-Location` if you need to remember where you came from.** If your script needs to navigate into 5 different subdirectories and return to the root after each, use `Push-Location` (pushd) and `Pop-Location` (popd). These cmdlets maintain an execution stack, automatically remembering your historical locations.
- **Subshell Execution:** Inside a `.ps1` script, `Set-Location` mutates the active runspace of the calling terminal. If you run a script that calls `Set-Location C:\Temp`, when the script finishes, your interactive terminal will remain stuck in `C:\Temp`. Use `Push-Location` at the top of scripts and `Pop-Location` at the bottom to clean up your contextual footprint.

## Alternatives

- **`Push-Location` / `Pop-Location`:** **Best for complex scripting.** Temporarily changes the location while saving the previous location to an array stack, allowing instant, foolproof retrieval.
- **Absolute Paths:** **Best for strict automation.** Instead of changing directories at all, highly robust scripts prefer to never use `Set-Location`, exclusively passing absolute, fully qualified paths (e.g., `C:\App\Logs\err.txt`) to all cmdlets to mathematically eliminate relative-path resolution errors.

## How it works internally

`Set-Location` interfaces directly with the `SessionState` object of the active PowerShell Runspace.

When invoked, the cmdlet parses the requested path string to identify the drive prefix (e.g., `C:`, `HKLM:`). It maps this prefix to the corresponding instantiated `PSDrive` object, which is backed by a specific `CmdletProvider` (like the `FileSystemProvider` or `RegistryProvider`).

PowerShell delegates the path resolution to that specific provider, invoking the `ItemExists()` method. If the item exists and is a valid container, the `SessionState` updates its internal `Path` property.

Unlike POSIX `cd` (which executes a low-level `chdir()` C system call affecting the operating system process environment), `Set-Location` primarily modifies PowerShell's _internal_ runspace state. This is why legacy `.exe` binaries launched from PowerShell occasionally struggle with relative paths—the underlying `[System.Environment]::CurrentDirectory` must be forcefully synchronized by PowerShell to match the `PSProvider` state.

## Performance Notes

- **Wildcard Evaluation Penalty:** Running `Set-Location C:\Win*` forces the `FileSystemProvider` to query the OS, perform a directory listing, and evaluate the regex pattern. While negligible for interactive use, this incurs a measurable CPU penalty in tight loops. Always use `-LiteralPath` in automation.

## Security Notes

- **Provider Execution:** Navigating into a custom provider (like a third-party SQL or Active Directory module provider) via `Set-Location` initiates provider-specific initialization code. If the provider connects to a remote server, typing `cd SQL:\Prod` might trigger active network authentication flows or Kerberos ticket exchanges.

## Common Mistakes

- **Unescaped Bracket Paths**
  - _Mistake:_ Using `Set-Location C:\Releases\App[v1]` and receiving a "Path not found" error, even though the folder clearly exists.
  - _Why:_ The default `-Path` parameter evaluates wildcards. It thinks `[v1]` is a character set (looking for a folder named `Appv` or `App1`). You must use `Set-Location -LiteralPath 'C:\Releases\App[v1]'` to navigate into directories with special characters.
- **Script State Bleeding**
  - _Mistake:_ Calling a utility script that contains `cd C:\Temp\Build`, and suddenly your primary development terminal is ripped out of your source code directory.
  - _Why:_ `Set-Location` modifies the global session state. Scripts should generally avoid changing the location unless strictly necessary, and if they do, they should cache the original location and restore it upon termination (via a `try/finally` block).

## Best Practices

- **Use `ErrorAction Stop`:** In automation, always append `-ErrorAction Stop`. If a script attempts `Set-Location \\server\backup`, and the network drops, the command silently fails. The subsequent command `Remove-Item * -Recurse` will execute in whatever directory you were _previously_ in, causing catastrophic data loss.
- **Prefer the `cd` Alias:** For interactive terminal use, always use `cd`. It is natively aliased to `Set-Location` out of the box on all platforms (Windows, Linux, macOS), preserving developer muscle memory.

## Interview Questions

**Q: You write a script that runs `Set-Location HKLM:\Software`. On the next line, you run a legacy command-line executable: `git status`. `git` throws an error. Why does running native `.exe` binaries from within a non-filesystem provider fail?**
**A:** Native operating system binaries (like `git.exe` or `ping.exe`) do not understand PowerShell `PSProviders`. They only understand the physical host filesystem via standard OS APIs. Because `HKLM:\` is an abstract PowerShell construct, there is no physical working directory for the `.exe` process to bind to. PowerShell cannot map the registry into a POSIX/Win32 working directory, so the executable's launch environment is corrupted or defaults unexpectedly.

**Q: Explain the difference between `-Path` and `-LiteralPath` in `Set-Location`. When is it mandatory to use `-LiteralPath`?**
**A:** The `-Path` parameter attempts to evaluate wildcard characters (`*`, `?`, `[ ]`). The `-LiteralPath` parameter takes the string exactly as provided, performing zero expansion or evaluation. It is strictly mandatory to use `-LiteralPath` when navigating into a directory whose literal name contains square brackets (e.g., `Archive[2023]`), as `-Path` will misinterpret the brackets as a regex-style character class array and fail to find the folder.

## Practice Problems

**Problem:** You are writing an idempotent installation script. You need to change the directory to `C:\Deploy`. However, if the folder was accidentally deleted and does not exist, the script MUST violently halt and throw a terminating exception immediately. Write the command.
**Hint:** Use the flag that alters default error handling behavior.
**Solution:**

```powershell
Set-Location -Path C:\Deploy -ErrorAction Stop
```

**Problem:** You need to interactively navigate to the root of the Windows Registry for the Current User hive. Write the command using the standard alias and the correct PowerShell provider prefix.
**Hint:** The drive prefix maps to `HKEY_CURRENT_USER`.
**Solution:**

```powershell
cd HKCU:\
```

## References

- [Set-Location (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-location)
- [about_Providers (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_providers)
