---
slug: get-service
name: Get-Service
aliases:
  - gsv
category: powershell
tags:
  - powershell
  - sysadmin
  - services
  - windows
  - systemd
  - daemons
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - check windows service status
  - list running services powershell
  - find service by display name
  - check dependent services
  - monitor system daemons
alternatives:
  - systemctl
status: draft
---

## What is it?

`Get-Service` is a PowerShell cmdlet used to retrieve the execution status and configuration metadata of background services (daemons) on a local or remote computer. It interacts directly with the Service Control Manager (SCM) to output `.NET` `ServiceController` objects, providing administrators with programmatic visibility into whether critical infrastructure components—like SQL Server, IIS, or Docker—are `Running`, `Stopped`, or `Paused`, and what dependency relationships govern their lifecycle.

## Why does it exist?

Operating systems rely on background services to manage networking, hardware, and continuous applications independently of user logins. Historically, Windows administrators managed these via the graphical `services.msc` MMC snap-in or the archaic `sc.exe` command-line tool, which required complex string parsing. `Get-Service` exists to bring service management into the modern object pipeline. By returning structured objects, it allows engineers to seamlessly script bulk operations (like finding all `Stopped` services matching `*SQL*` and piping them into `Start-Service`), drastically accelerating automated server remediation and monitoring workflows.

## Syntax

```powershell
Get-Service [[-Name] <String[]>] [options]
Get-Service -DisplayName <String[]> [options]
```

## Flags

| Flag                 | Description                                                                                                                               | Example                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `-Name`              | (Positional) Searches for the service using its underlying system registry name. Supports wildcard matching.                              | `Get-Service -Name wuauserv`                             |
| `-DisplayName`       | Searches for the service using the human-readable string displayed in the GUI. Highly useful when the internal name is obscure.           | `Get-Service -DisplayName "Windows Update"`              |
| `-DependentServices` | Returns a list of services that fundamentally rely on the target service. If you stop the target, these services will also crash or stop. | `Get-Service -Name LanmanWorkstation -DependentServices` |
| `-RequiredServices`  | Returns a list of prerequisite services that the target service absolutely requires to be running before it can boot itself.              | `Get-Service -Name Docker -RequiredServices`             |
| `-Include`           | An array of string patterns that a service name must match to be included in the results.                                                 | `Get-Service -Name * -Include *net*`                     |
| `-Exclude`           | An array of string patterns that explicitly drops matching services from the returned results.                                            | `Get-Service -Name * -Exclude *svchost*`                 |
| `-ComputerName`      | Executes the query against a remote Windows machine. (Deprecated in PS7+ via DCOM; rely on `Invoke-Command` via WinRM).                   | `Get-Service -ComputerName db-prod-01`                   |

## Examples

```bash
Get-Service
```

> The universal service audit. Retrieves the entire dictionary of services registered with the OS. It outputs a three-column table displaying the current execution `Status` (Running/Stopped), the internal system `Name` (e.g., `BITS`), and the human-readable `DisplayName` (e.g., `Background Intelligent Transfer Service`).

```powershell
Get-Service -Name *SQL* | Where-Object Status -eq 'Stopped'
```

> Targeted health monitoring. Uses wildcards to fetch all services related to Microsoft SQL Server. The pipeline seamlessly filters the resulting objects, outputting only the database engines or agents that have crashed or been intentionally halted, instantly highlighting service outages.

```powershell
Get-Service -DisplayName "World Wide Web Publishing Service" | Restart-Service -Force
```

> Name resolution and orchestration. The administrator doesn't know that the internal name for IIS is `W3SVC`. By querying the Display Name, `Get-Service` resolves the correct `ServiceController` object and pipes it directly to the reboot command, orchestrating a complex recovery effortlessly.

```powershell
(Get-Service -Name LanmanServer).DependentServices | Stop-Service
```

> Dependency mapping teardown. The Server service handles SMB file sharing. An administrator needs to patch it, but stopping it will cause chained failures in dependent services (like the Computer Browser). This advanced pipeline fetches all dependent child services and systematically shuts them down first, preparing the parent service for safe maintenance.

## Real-World Scenarios

**Automated Remediation (Self-Healing Scripts)**

```powershell
$service = Get-Service -Name "Spooler"
if ($service.Status -ne 'Running') {
    Start-Service -InputObject $service
    Send-MailMessage -To "alerts@corp.com" -Subject "Spooler Auto-Recovered"
}
```

> Deployed as a scheduled task, this script polls a critical application service. By evaluating the `.Status` property of the returned object, the script implements deterministic self-healing logic. If the service is dead, it actively revives it via `Start-Service` and alerts the operations team, maintaining strict SLA compliance.

**Server State Baselining**

```powershell
Get-Service | Where-Object Status -eq 'Running' | Select-Object Name | Export-Csv running_services_baseline.csv
```

> Before applying massive Windows Updates or third-party application patches, system administrators execute this pipeline to capture a definitive list of every active daemon. If the server reboots and applications fail, they can programmatically compare the live services against this CSV baseline to instantly discover which specific daemon failed to auto-start.

## When should it NOT be used?

- **Altering Startup Types:** **Do not use `Get-Service` to configure a service to start on boot.** Prior to PowerShell 6, the objects returned by `Get-Service` lacked the methods to alter the `StartupType` (Automatic/Manual/Disabled). You must use `Set-Service -Name <name> -StartupType Automatic` or drop down to WMI (`Get-CimInstance Win32_Service`).
- **Cross-Platform Service Management (Linux):** While PowerShell 7 is cross-platform, `Get-Service` on Linux historically relies on polling generic process tables and lacks deep integration with `systemd`. For robust daemon management on Linux, strictly use native `systemctl` commands over PowerShell wrappers.

## Alternatives

- **`sc.exe` (Service Control):** **Best for low-level configuration.** The legacy Windows binary capable of deleting services entirely (`sc delete`), altering deep recovery behaviors (restarting after 1st failure), and modifying service account execution credentials, which standard PowerShell cmdlets struggle with natively.
- **`Get-CimInstance Win32_Service`:** **Best for deep auditing.** The WMI class `Win32_Service` provides significantly more metadata than `Get-Service`, including the exact absolute file path to the executable (`PathName`), the specific user account the service runs under (`StartName`), and the exact textual error code if the service failed to start.
- **`systemctl`:** **Best for Linux systems.** The definitive, undisputed standard for managing daemon lifecycles and viewing journaled daemon logs on modern Linux distributions.

## How it works internally

`Get-Service` acts as a direct interface to the Windows Service Control Manager (SCM).

When executed, the cmdlet relies on the `.NET` `System.ServiceProcess.ServiceController` class. It issues an API request via RPC (Remote Procedure Call) to the `services.exe` process running on the host OS.

The SCM maintains a registry-backed database (located at `HKLM\SYSTEM\CurrentControlSet\Services`) of all installed drivers and user-space daemons. It queries this database and returns an array of handles to the requested services. The .NET framework wraps these handles into `ServiceController` objects.

Because these objects are linked to the live SCM, querying the `.Status` property does not return a cached string; it triggers an instantaneous interrogation of the kernel's service state. If the service is currently transitioning (e.g., executing its shutdown hook), the status will reflect `StopPending` rather than `Stopped`. Pipelining these objects to `Start-Service` or `Stop-Service` simply passes the active handle back to the SCM, instructing it to emit the `SERVICE_CONTROL_CONTINUE` or `SERVICE_CONTROL_STOP` control codes to the target executable.

## Performance Notes

- **RPC Overhead:** Querying all services via `Get-Service` is relatively fast, but pipelining the results to a `Where-Object` block forces PowerShell to serialize and evaluate hundreds of heavy .NET objects. When scripting, `Get-Service -Name *SQL*` is mathematically faster than `Get-Service | Where-Object Name -match 'SQL'` because it pushes the string filtering down to the highly optimized C++ SCM layer rather than the PowerShell execution engine.

## Security Notes

- **Privilege Constraints:** Standard unprivileged users can execute `Get-Service` and view the status of almost all system services. However, they lack the DACL (Discretionary Access Control List) permissions to manipulate them. Piping the results to `Stop-Service` will throw widespread "Access Denied" exceptions unless the PowerShell terminal is launched via "Run as Administrator".
- **Invisible Services:** Some specialized security software (like EDRs or Rootkits) use kernel-level filtering to hide their service registrations from the standard Windows APIs. `Get-Service` will be blind to these deeply cloaked daemons.

## Common Mistakes

- **Using the wrong identifier**
  - _Mistake:_ Attempting to script `Get-Service -Name "Windows Update"`.
  - _Why:_ The command fails with an object not found error. `Windows Update` is the human-readable Display Name. The underlying system registry name is `wuauserv`. The default `-Name` parameter expects the strict internal name. You must explicitly use the `-DisplayName` flag if you want to use the readable text string.
- **Misinterpreting `Stopped` vs `Disabled`**
  - _Mistake:_ Checking if a service is `Stopped`, assuming it is broken, and issuing a `Start-Service` command which fails with an access error.
  - _Why:_ A service's `Status` only indicates current execution. If a service's `StartupType` is explicitly set to `Disabled`, the OS physically prohibits execution. You must ensure the service is `Manual` or `Automatic` before attempting to boot it.

## Best Practices

- **Audit Service Accounts via WMI:** If you need to verify that a service is running securely under a Group Managed Service Account (gMSA) rather than `LocalSystem`, abandon `Get-Service`. Switch to `Get-CimInstance Win32_Service | Select-Object Name, StartName` to extract the execution identity context.
- **Utilize Dependent Service Teardowns:** When patching a core infrastructure component, never force-kill it blindly. Always use `Get-Service <name> -DependentServices | Stop-Service` to allow the upstream dependencies to cleanly flush memory buffers to disk before tearing down the foundation they rely on.

## Interview Questions

**Q: You want to restart the `w3svc` (IIS Web Server) service, but the command fails because another service currently relies on it. What exact parameter can you pass to `Get-Service` to identify exactly which secondary service is holding the lock?**
**A:** You must use the `-DependentServices` parameter. Running `Get-Service -Name w3svc -DependentServices` will query the Service Control Manager and output an array of all secondary services that mathematically depend on IIS being active. You must stop those dependent services first before attempting to restart IIS.

**Q: In a PowerShell script, you run `Get-Service sshd` and it successfully returns an object showing the service is `Stopped`. You pipe it immediately to `Start-Service`, but it throws an error stating "Service cannot be started. A Start control has been sent to a service that is disabled." How would you fix the script?**
**A:** The `Get-Service` object reports execution state, but does not dictate startup policy. The service is administratively locked by the OS. The script must first reconfigure the service's startup type before booting it. The fix is to insert the `Set-Service` cmdlet into the pipeline: `Get-Service sshd | Set-Service -StartupType Manual | Start-Service`.

## Practice Problems

**Problem:** You are auditing a Windows server. You need to find the internal system name for the service that handles the "Windows Firewall". Write the command to query the system using the human-readable name, returning the object so you can extract its short name.
**Hint:** Use the parameter that bypasses the internal registry name and searches by the UI name.
**Solution:**

```powershell
Get-Service -DisplayName "Windows Defender Firewall"
```

**Problem:** Your automation script needs to ensure the Docker daemon is actively running. Write a single pipeline command that fetches the service with the internal name `docker`. If the status is equal to `Stopped`, start the service immediately.
**Hint:** Fetch the service, pass it to a `Where-Object` block filtering by the Status property, and pipe any matches into the start cmdlet.
**Solution:**

```powershell
Get-Service -Name docker | Where-Object Status -eq 'Stopped' | Start-Service
```

## References

- [Get-Service (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service)
- [System.ServiceProcess Namespace (.NET API)](https://learn.microsoft.com/en-us/dotnet/api/system.serviceprocess)
