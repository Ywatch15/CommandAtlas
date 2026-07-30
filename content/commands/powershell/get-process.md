---
slug: get-process
name: Get-Process
aliases: [ps, gps]
category: powershell
tags: [powershell, process, windows]
difficulty: beginner
supportedOS: [windows, linux, macos]
supportedShells: [powershell]
intentPhrases:
  - 'list processes in powershell'
  - 'get process info'
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-07-29
author: commandatlas
---

## What is it?

`Get-Process` is a PowerShell cmdlet that retrieves process objects for active processes running on local or remote systems.

## Why does it exist?

`Get-Process` exposes structured object representations of system processes, enabling filtering, property selection, and piping to other cmdlets.

## Syntax

```powershell
Get-Process [[-Name] <String[]>] [CommonParameters]
```

## Flags

| Flag               | Description                   | Example                                       |
| ------------------ | ----------------------------- | --------------------------------------------- |
| `-Name`            | Specifies process name        | `Get-Process -Name chrome`                    |
| `-Id`              | Specifies process ID          | `Get-Process -Id 1234`                        |
| `-FileVersionInfo` | Displays file version details | `Get-Process -Name explorer -FileVersionInfo` |

## Examples

```powershell
Get-Process -Name "powershell"
```

> Returns process object details for running PowerShell sessions.

## Real-World Scenarios

**Monitoring memory consumers**: Sorting processes by Working Set memory usage to diagnose performance issues.

## When should it NOT be used?

- **Real-time interactive GUI monitoring**: Windows Task Manager or Resource Monitor are better suited for visual tracking.

## Alternatives

- **`Get-CimInstance Win32_Process`**: Retrieves lower-level WMI/CIM process information.

## How it works internally

Calls the .NET `System.Diagnostics.Process` APIs to query operating system process handles and stats.

## Performance Notes

Fast object retrieval directly through native .NET bindings.

## Security Notes

Requires elevated administrator rights to inspect details of system processes owned by other security principals.

## Common Mistakes

- **Treating output as plain text**: PowerShell cmdlets output objects, not raw text strings.

## Best Practices

- Pipe `Get-Process` to `Where-Object` or `Select-Object` for object filtering rather than regex matching text lines.

## Interview Questions

**Q:** What is the difference between `ps` in Bash vs `Get-Process` in PowerShell?
**A:** `ps` outputs unformatted or columnated text strings, whereas `Get-Process` returns rich .NET objects with properties and methods.

## Practice Problems

**Problem:** Stop all processes named `notepad`.
**Solution:** `Get-Process -Name notepad | Stop-Process`

## References

- [Microsoft Get-Process documentation](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/get-process)
