---
slug: start-process
name: Start-Process
aliases:
  - saps
  - start
category: powershell
tags:
  - powershell
  - execution
  - processes
  - windows
  - automation
difficulty: intermediate
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - run executable powershell
  - launch external program
  - run as administrator powershell
  - start background process
  - execute command silently
relatedCommands:
  - get-process
status: draft
---

## What is it?

`Start-Process` is a robust PowerShell cmdlet used to launch native applications, execute external scripts, or open documents via their default associated applications. Functionally replacing the legacy `cmd.exe /c start` command, it abstracts the complex underlying .NET `System.Diagnostics.Process` class, providing administrators with surgical control over how a child process is spawned—including injecting execution arguments, defining working directories, suppressing window UIs, and enforcing privilege escalation.

## Why does it exist?

Simply typing an executable name (like `ping.exe`) into a PowerShell terminal invokes it synchronously in the same window. However, automation scripts frequently demand complex execution contexts. If an administrator needs to launch an MSI installer completely silently in the background, redirect its output logs to a text file, and wait exactly 5 minutes for it to finish before proceeding, basic execution operators (like `&`) are insufficient. `Start-Process` exists to bridge this gap, offering a native, object-oriented API to construct highly customized, isolated, and elevated process execution environments directly from a script.

## Syntax

```powershell
Start-Process [-FilePath] <String> [[-ArgumentList] <String[]>] [options]
```

## Flags

| Flag                      | Description                                                                                                                     | Example                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `-FilePath`               | (Positional) The path to the executable, script, or document to be opened.                                                      | `Start-Process -FilePath "C:\app.exe"`                                   |
| `-ArgumentList`           | An array of strings or a single continuous string representing the command-line arguments passed to the executable.             | `Start-Process -FilePath "ping" -ArgumentList "-t 8.8.8.8"`              |
| `-Verb`                   | Specifies a shell verb to execute on the file. Common verbs include `RunAs` (forces UAC elevation) or `Print`.                  | `Start-Process -FilePath "cmd.exe" -Verb RunAs`                          |
| `-Wait`                   | Blocks the PowerShell script, halting execution entirely until the newly spawned process cleanly exits.                         | `Start-Process -FilePath "installer.msi" -Wait`                          |
| `-WindowStyle`            | Dictates the visual state of the application window. Accepts `Normal`, `Hidden`, `Minimized`, or `Maximized`.                   | `Start-Process -FilePath "script.bat" -WindowStyle Hidden`               |
| `-NoNewWindow`            | Forces console applications to execute directly within the current PowerShell terminal window instead of spawning a new pop-up. | `Start-Process -FilePath "ping" -NoNewWindow`                            |
| `-PassThru`               | Returns the `System.Diagnostics.Process` object representing the spawned task back to the pipeline for subsequent tracking.     | `$proc = Start-Process "notepad" -PassThru`                              |
| `-WorkingDirectory`       | Explicitly defines the initial filesystem directory the process uses as its starting context.                                   | `Start-Process "git" -ArgumentList "status" -WorkingDirectory "C:\Repo"` |
| `-RedirectStandardOutput` | Captures the `stdout` stream of the spawned process and silently writes it directly to a specified text file.                   | `Start-Process "ping" -RedirectStandardOutput "out.log"`                 |
| `-Credential`             | Executes the process utilizing the security context of a different user account. (Requires a `PSCredential` object).            | `Start-Process "cmd" -Credential $creds`                                 |

## Examples

```powershell
Start-Process -FilePath "notepad.exe"
```

> The standard invocation. It searches the `$env:PATH` for `notepad.exe`, forks a new background process to launch it, and instantly returns control of the PowerShell terminal to the user.

```powershell
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i installer.msi /qn /norestart" -Wait
```

> The quintessential automation pattern. It launches the Windows Installer engine, passes a complex string of silent execution flags, and uses `-Wait` to completely freeze the PowerShell script until the installation safely finishes, preventing subsequent dependent commands from failing.

```powershell
Start-Process -FilePath "powershell.exe" -Verb RunAs
```

> Privilege Escalation (UAC). The `RunAs` verb instructs the Windows shell to request Administrator elevation. It will trigger the graphical UAC prompt on the user's desktop, and if approved, spawn a brand new, highly privileged administrative terminal.

```powershell
$proc = Start-Process -FilePath "java.exe" -ArgumentList "-jar app.jar" -WindowStyle Hidden -PassThru
```

> Daemonizing a task. It launches a Java backend application completely invisibly (`Hidden`), ensuring no console window interrupts the user. By using `-PassThru`, it captures the live process object, allowing the script to later execute `$proc.Kill()` to tear the daemon down.

```powershell
Start-Process -FilePath "C:\finance\Q3_Report.xlsx"
```

> Document invocation. Because it utilizes the underlying shell execution API, pointing `Start-Process` directly at a non-executable document forces the OS to look up the default file association and automatically launch Excel to load the payload.

## Real-World Scenarios

**Isolated Sub-Script Execution**

```powershell
Start-Process -FilePath "pwsh.exe" -ArgumentList "-File .\worker.ps1" -WindowStyle Hidden
```

> Complex scripts often need to spawn parallel worker threads. Rather than using complex Runspaces, an administrator uses `Start-Process` to spawn isolated, entirely hidden background PowerShell processes that execute dedicated data-processing scripts, allowing the primary UI terminal script to remain perfectly responsive.

**Capturing Legacy Executable Output**

```powershell
Start-Process -FilePath "legacy_tool.exe" -ArgumentList "/export" -NoNewWindow -RedirectStandardOutput "success.log" -RedirectStandardError "fail.log" -Wait
```

> When integrating severely outdated, noisy DOS-era command-line binaries into a modern CI/CD pipeline, executing them natively often corrupts the terminal buffer. The engineer uses `Start-Process` to trap the erratic tool, lock its execution into the current window context, strictly separate its error and success outputs into distinct diagnostic files, and block the pipeline until it finishes safely.

## When should it NOT be used?

- **Simple Native Commands:** **Do not use `Start-Process` to run standard CLI tools like `ping`, `ipconfig`, or `git` if you need the output.** If you run `Start-Process ping 8.8.8.8`, it pops up a blue box, pings, and instantly closes, deleting the output. Simply type `ping 8.8.8.8` (or use the call operator `& "ping"`) to capture the text cleanly in your active pipeline.
- **PowerShell Multithreading:** **Avoid `Start-Process` for heavy parallel PowerShell tasks.** Spawning brand new `powershell.exe` instances consumes massive amounts of RAM and CPU to load the .NET CLR every time. Use `Start-Job` or `ThreadJob` modules for lightweight, runspace-based concurrency.

## Alternatives

- **The Call Operator (`&`):** **Best for inline execution.** E.g., `& "C:\Path with spaces\app.exe" arg1`. It invokes the binary directly inside the current terminal runspace, capturing all `stdout` into the native PowerShell pipeline perfectly.
- **`Invoke-Command`:** **Best for remote execution.** `Start-Process` is strictly localized. If you need to spawn a process on 50 different servers, you must wrap `Start-Process` inside an `Invoke-Command` block sent via WinRM.
- **`Start-Job`:** **Best for native backgrounding.** Launches a PowerShell block in a background runspace, allowing you to easily retrieve the resulting objects later via `Receive-Job`.

## How it works internally

`Start-Process` serves as a high-level wrapper around the .NET `System.Diagnostics.Process` class and the `System.Diagnostics.ProcessStartInfo` object.

When invoked, the cmdlet populates a `ProcessStartInfo` configuration struct.

- `-FilePath` maps to `.FileName`.
- `-ArgumentList` maps to `.Arguments`.
- `-WindowStyle` maps to `.WindowStyle`.
- If `-Verb RunAs` is utilized, it populates `.Verb = "runas"`, which explicitly triggers the `ShellExecute` operating system API, signaling the Windows kernel to invoke the User Account Control (UAC) elevation framework.

Once the configuration object is built, the cmdlet calls the static `[System.Diagnostics.Process]::Start()` method. The kernel handles the heavy lifting: allocating the memory segment, validating security descriptors, mapping the PE (Portable Executable) binary into memory, and scheduling the primary thread.

If `-Wait` is omitted, the cmdlet exits instantly, leaving the newly spawned process completely unmanaged and orphaned by the parent PowerShell session. If `-Wait` is provided, the cmdlet enters a blocking loop, invoking the `.WaitForExit()` method on the underlying process handle, freezing the terminal thread until the kernel signals that the child PID has terminated.

## Performance Notes

- **Argument List Parsing:** Historically, PowerShell struggles with parsing complex quote structures (nested quotes) in `-ArgumentList`. For complex executions, it is often significantly more reliable to pass arguments as a single unified string rather than an array of strings to bypass PowerShell's aggressive auto-quoting algorithms: `-ArgumentList '/c "C:\My Path\script.bat" /quiet'`.

## Security Notes

- **UAC Elevation Constraints:** You cannot bypass UAC. If you run `Start-Process -Verb RunAs` from an unprivileged script, the script execution will halt, and the physical user sitting at the keyboard must click "Yes" on the UAC pop-up. If this runs via a headless automation agent (like a CI runner), the UAC prompt will hang silently forever, causing the pipeline to timeout. Ensure the parent process (the CI runner) is already running as SYSTEM/Admin to prevent silent hangs.
- **Credential Handling:** The `-Credential` parameter relies on the legacy `CreateProcessWithLogonW` Windows API. This API is extremely strict; it requires the target executable to exist on local storage (network drives will fail) and the "Secondary Logon" (seclogon) Windows service must be actively running on the host machine.

## Common Mistakes

- **Losing string outputs**
  - _Mistake:_ `$result = Start-Process ping "8.8.8.8"` expecting `$result` to contain the ping response text.
  - _Why:_ `Start-Process` does not return strings. It spawns a completely isolated process. `$result` will be entirely null. If you need text output, you must use the call operator (`$result = & ping 8.8.8.8`) or the `-RedirectStandardOutput` flag.
- **Confusing `-PassThru` with application output**
  - _Mistake:_ Using `-PassThru` hoping to see what the application prints to the screen.
  - _Why:_ `-PassThru` only returns the .NET Process Object (the container holding the PID, CPU metrics, etc.). It has absolutely nothing to do with the application's `stdout` text stream.

## Best Practices

- **Always use `-Wait` for Installers:** The most frequent source of flakiness in server provisioning scripts is omitting `-Wait` during MSI or EXE installations. The script moves to step 2 before step 1 finishes deploying the files, crashing catastrophically.
- **Isolate Complex Commands:** If you are executing a command that uses dozens of special characters or piped sequences (`cmd.exe /c "echo yes | format.exe"`), abstract the logic into a separate `.bat` or `.ps1` file and use `Start-Process` to invoke the file cleanly, rather than fighting escaping hell in `-ArgumentList`.

## Interview Questions

**Q: You need to execute an older `.exe` utility. If you type the utility's name directly in PowerShell, it works, but it locks up your terminal for 10 minutes. How do you use `Start-Process` to run it invisibly in the background, ensuring your terminal remains usable immediately?**
**A:** You execute it using `Start-Process -FilePath "utility.exe" -WindowStyle Hidden`. This commands the OS to spawn the process completely decoupled from your current console, suppressing its graphical window. Because you omit the `-Wait` flag, control of your terminal is returned to you instantly.

**Q: A script runs `Start-Process -FilePath "setup.exe" -Wait`. The script works perfectly on your laptop, but when deployed via a headless Jenkins CI/CD runner, the script hangs forever and never completes. What is the most likely architectural cause?**
**A:** The `setup.exe` binary is likely triggering a GUI prompt—either a User Account Control (UAC) elevation request, or a standard graphical installation wizard clicking "Next". Because the Jenkins runner is a headless, non-interactive service, there is no desktop environment to display the prompt, and no human to click it. The process hangs indefinitely waiting for input. You must supply the application's specific silent execution arguments (e.g., `-ArgumentList "/S /Q"`) to prevent the GUI from loading.

## Practice Problems

**Problem:** You need to launch an administrative command prompt (`cmd.exe`). Because it requires elevated privileges, you must force the OS to trigger the UAC elevation sequence. Write the command to spawn this specific process.
**Hint:** Use the flag that triggers specific shell verbs.
**Solution:**

```powershell
Start-Process -FilePath "cmd.exe" -Verb RunAs
```

**Problem:** You are deploying software. You must execute `C:\temp\installer.msi` silently using the arguments `/quiet /norestart`. The script must absolutely block and wait for the installation to finish before continuing, and you want to capture the generated Process object into a variable named `$installerProcess` for later auditing.
**Hint:** Combine the wait flag, the pass-through flag, and the argument list.
**Solution:**

```powershell
$installerProcess = Start-Process -FilePath "C:\temp\installer.msi" -ArgumentList "/quiet /norestart" -Wait -PassThru
```

## References

- [Start-Process (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process)
- [System.Diagnostics.Process Class (.NET API)](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process)
