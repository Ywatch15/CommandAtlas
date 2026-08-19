---
slug: get-process
name: Get-Process
aliases:
  - gps
  - ps
category: powershell
tags:
  - powershell
  - sysadmin
  - processes
  - monitoring
  - windows
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - list running processes
  - find process id powershell
  - check memory usage process
  - find application process windows
  - view background tasks powershell
relatedCommands:
  - start-process
  - get-service
alternatives:
  - ps
status: draft
---

## What is it?

`Get-Process` is a core PowerShell cmdlet used to query the operating system and return a list of actively running processes on a local or remote computer. Unlike legacy text-based tools like `tasklist` or Unix `ps`, it returns a rich collection of `.NET` `System.Diagnostics.Process` objects, exposing highly detailed metrics regarding memory consumption (Working Set, Paged Memory), CPU time, handle counts, and window titles, while allowing administrators to invoke destructive actions (like `.Kill()`) directly on the returned objects.

## Why does it exist?

Process management is the bedrock of system administration. Before PowerShell, Windows administrators relied on `tasklist` to view processes and `taskkill` to stop them, heavily relying on brittle string parsing to map a PID from one tool to another. `Get-Process` exists to unify this workflow within the object-oriented pipeline. By surfacing robust .NET objects, it eliminates string parsing entirely. Administrators can sort by memory, filter by process name, and pipe the offending object seamlessly to `Stop-Process` in a single, robust, strongly-typed pipeline, dramatically accelerating incident response and automated health monitoring.

## Syntax

```powershell
Get-Process [[-Name] <String[]>] [options]
Get-Process -Id <Int32[]> [options]
Get-Process -InputObject <Process[]> [options]
```

## Flags

| Flag               | Description                                                                                                                                 | Example                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `-Name`            | (Positional) Searches for processes matching specific name strings. Supports wildcard expansions.                                           | `Get-Process -Name chrome*`                                |
| `-Id`              | Retrieves specific processes by their exact numeric OS Process ID (PID).                                                                    | `Get-Process -Id 4592, 1120`                               |
| `-IncludeUserName` | Injects an additional `UserName` property detailing exactly which user account spawned the process. Requires administrative elevation.      | `Get-Process -IncludeUserName`                             |
| `-Module`          | Returns the file paths of all `.dll` and `.exe` modules loaded into the memory space of the specified processes.                            | `Get-Process -Name svchost -Module`                        |
| `-FileVersionInfo` | Extracts detailed metadata (Version, Product Name, Copyright, File Description) from the main executable file backing the process.          | `Get-Process -Name explorer -FileVersionInfo`              |
| `-ComputerName`    | Executes the query against a remote machine using DCOM. (Deprecated in PowerShell 7+; use `Invoke-Command` instead).                        | `Get-Process -ComputerName server01`                       |
| `-ErrorAction`     | Controls the behavior when a process isn't found. Setting to `SilentlyContinue` prevents red error text from cluttering automation scripts. | `Get-Process -Name notexist -ErrorAction SilentlyContinue` |

## Examples

```powershell
Get-Process
```

> The universal process audit. Queries the OS and outputs a formatted table of every running process. The columns include `Handles`, `NPM(K)` (Non-Paged Memory), `PM(K)` (Paged Memory), `WS(K)` (Working Set/RAM), `CPU(s)` (Total CPU time), `Id` (PID), and `ProcessName`.

```powershell
Get-Process -Name code, firefox
```

> Targeted querying. Retrieves the performance metrics specifically for Visual Studio Code and Firefox processes. If any process in the list is not currently running, the command will throw a non-terminating error.

```powershell
Get-Process | Sort-Object WS -Descending | Select-Object -First 5
```

> Identifying resource exhaustion. This pipeline grabs all active processes, sorts them mathematically in descending order based on their physical RAM consumption (`Working Set`), and slices the array to output only the top 5 memory-hogging applications on the system.

```powershell
Get-Process -Id $PID
```

> Self-introspection. `$PID` is an automatic PowerShell variable representing the Process ID of the currently executing PowerShell session. This queries the metrics for the active terminal window running the command.

```powershell
(Get-Process -Name notepad).Kill()
```

> Direct method invocation. Because `Get-Process` returns a living `.NET` object representing the OS process hook, administrators can bypass the pipeline entirely and immediately invoke the built-in `.Kill()` method to violently terminate the application.

## Real-World Scenarios

**Orphaned Process Cleanup**

```powershell
Get-Process -Name "chromedriver", "phantomjs" -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -lt (Get-Date).AddHours(-4) } | Stop-Process -Force
```

> In automated UI testing pipelines (like Selenium), driver processes frequently crash and detach, leaking memory indefinitely. A scheduled cleanup script uses `Get-Process` to find all driver binaries, filters them to isolate instances that have been running for more than 4 hours (orphans), and pipes them directly to termination, sanitizing the CI/CD runner.

**Auditing Suspicious Activity**

```powershell
Get-Process | Where-Object { $_.Path -notmatch "^C:\\Windows" -and $_.Path -notmatch "^C:\\Program Files" } | Select-Object ProcessName, Path, Id
```

> Security engineers hunting for malware or unauthorized cryptominers use this pipeline. It retrieves all running processes and evaluates their executable source path on disk. If a process was launched from a volatile, non-system directory (like `/AppData/Roaming` or `C:\Temp`), it flags it for immediate forensic review.

## When should it NOT be used?

- **Real-time profiling:** **Do not use `Get-Process` in tight `while($true)` loops for continuous monitoring.** Querying the OS process table is computationally heavy and causes WMI/CIM spiking. Use Performance Counters (`Get-Counter`) or dedicated tools like Process Explorer/Task Manager for real-time telemetry charting.
- **Managing Windows Services:** **Do not use `Get-Process` to manage background daemons like SQL Server or IIS.** While `Get-Process` shows the `sqlservr.exe` binary, killing it skips all graceful shutdown logic and risks database corruption. Always use `Get-Service` and `Stop-Service` to allow the Service Control Manager to orchestrate clean shutdowns.

## Alternatives

- **`tasklist`:** **Best for legacy batch scripts.** The older Windows CMD utility. Outputs pure text arrays, useful only if the machine lacks PowerShell completely.
- **`Get-CimInstance Win32_Process`:** **Best for advanced remote querying.** WMI/CIM queries can retrieve command-line execution arguments (e.g., seeing exactly what flags a java process was launched with), which the standard `Get-Process` cmdlet cannot do natively without elevation and complex .NET property expansion.
- **`top` / `htop`:** **Best for Linux interaction.** If running PowerShell 7 on Linux, `Get-Process` works (mapping to `/proc`), but native Linux tools provide far superior real-time interactive terminal graphics.

## How it works internally

`Get-Process` relies on the .NET `System.Diagnostics` namespace.

When executed, it calls the `Process.GetProcesses()` method. On Windows, this method interfaces deep into the kernel using the `EnumProcesses` NT API, requesting a snapshot of the kernel's active process tracking blocks (EPROCESS structures).

The kernel returns an array of handles. The .NET framework wraps each handle in a `System.Diagnostics.Process` object. These objects are extremely "heavy." They maintain an active pipeline to the OS kernel. When you execute a pipeline like `Get-Process | Select-Object CPU`, the object dynamically calculates the CPU timespan at the exact millisecond the property is accessed by querying the kernel's thread execution counters.

Because these objects represent active system handles, accessing deep properties (like `.Path` or `.Modules`) requires the PowerShell process to request memory-read permissions over the target process. If you run `Get-Process` as a standard user, querying an elevated system process (like `csrss.exe`) will successfully return the PID and memory stats, but accessing the `.Path` or `-IncludeUserName` will throw an "Access Denied" exception, enforcing the OS security boundary.

## Performance Notes

- **The Cost of Deep Retrieval:** The basic `Get-Process` invocation is fast because it pulls top-level metrics. However, appending `-Module` or `-FileVersionInfo` forces the OS to physically page in and read the headers of every single `.dll` file loaded into every process's memory space. This induces massive disk I/O and CPU overhead, locking the terminal for several seconds.

## Security Notes

- **Elevation Requirements:** To view processes owned by other users or the `SYSTEM` account completely, PowerShell must be launched as Administrator ("Run as Administrator").
- **Command Line Obfuscation:** Standard `Get-Process` deliberately hides the execution arguments used to launch the process. If a malicious script launches `powershell.exe -EncodedCommand XYZ...`, `Get-Process` only shows `powershell`. Security auditing requires `Get-CimInstance Win32_Process` to expose the malicious `CommandLine` property.

## Common Mistakes

- **Piping strings into `Stop-Process`**
  - _Mistake:_ `Get-Process chrome | Select-Object Name | Stop-Process`
  - _Why:_ `Select-Object Name` destroys the active `.NET` Process object and turns it into a generic `PSCustomObject` containing only a string property. `Stop-Process` requires the actual OS handle (the PID) to perform a kill. The pipeline breaks. Simply pipe directly: `Get-Process chrome | Stop-Process`.
- **Using exact paths instead of process names**
  - _Mistake:_ Running `Get-Process -Name C:\Windows\notepad.exe` and getting an error.
  - _Why:_ The `-Name` parameter strictly accepts the friendly process string (the binary name minus the `.exe` extension). It does not accept file paths. To search by path, you must query all processes and filter: `Get-Process | Where-Object Path -eq "C:\Windows\notepad.exe"`.

## Best Practices

- **Leverage Wildcards for Stability:** Process names vary slightly across versions. Always use wildcards if unsure: `Get-Process *sql*`.
- **Use `Wait-Process` for Orchestration:** If you launch an installer or backup binary from a script and need to halt script execution until the backup finishes, do not write a `while(Get-Process)` sleep loop. Simply use `Get-Process backup | Wait-Process`, which uses efficient kernel-level wait-state interrupts instead of burning CPU polling.

## Interview Questions

**Q: You want to terminate a frozen application named `data-parser.exe`. You type `Get-Process data-parser.exe | Stop-Process`, but the command fails, saying the process cannot be found. Why did it fail, and how do you fix it?**
**A:** It failed because the `-Name` parameter expects the friendly base name of the process, completely omitting the `.exe` extension. Searching for `data-parser.exe` explicitly fails because the OS registers the name as `data-parser`. The correct command is `Get-Process data-parser | Stop-Process`.

**Q: Explain the technical difference between running `Get-Process -ComputerName server01` (in PowerShell 5.1) and running `Invoke-Command -ComputerName server01 -ScriptBlock { Get-Process }`.**
**A:** `Get-Process -ComputerName` relies on legacy DCOM/RPC infrastructure (TCP port 135 and random high ports). This requires extensive firewall openings and is disabled by default on modern networks due to security risks. `Invoke-Command` relies on WinRM (Windows Remote Management via WS-Man, TCP port 5985/5986), which operates over HTTP/HTTPS, uses a single predictable port, and encrypts the payload natively, making it the secure, modern standard for remote execution.

## Practice Problems

**Problem:** You are monitoring server performance. Write a pipeline to extract a list of all currently running processes, filter out anything using less than 100 Megabytes of RAM (Working Set), and sort the remaining large processes so the biggest memory consumers are at the very top.
**Hint:** Compare the `WS` property against the `100MB` constant, and sort the output descending.
**Solution:**

```powershell
Get-Process | Where-Object WS -gt 100MB | Sort-Object WS -Descending
```

**Problem:** A specific application has frozen. You know its exact Process ID (PID) is `8492`. You need to definitively kill it. Write the command to fetch this exact process by its ID and pipe it immediately to the termination cmdlet.
**Hint:** Use the parameter that requests processes by their numeric identifier.
**Solution:**

```powershell
Get-Process -Id 8492 | Stop-Process -Force
```

## References

- [Get-Process (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process)
- [System.Diagnostics.Process Class (.NET API)](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process)
