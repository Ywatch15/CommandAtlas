---
slug: get-help
name: Get-Help
aliases:
  - help
  - man
category: powershell
tags:
  - powershell
  - documentation
  - syntax
  - introspection
  - learning
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - read powershell command documentation
  - find powershell syntax
  - powershell examples
  - how to use powershell cmdlet
  - list command parameters
relatedCommands:
  - get-command
  - get-member
status: draft
alternatives: []
---

## What is it?

`Get-Help` is the intrinsic documentation engine for PowerShell. It dynamically retrieves and formats help topics for cmdlets, functions, scripts, CIM commands, and conceptual "About" articles. It acts as an offline, deeply integrated reference manual that automatically parses Abstract Syntax Tree (AST) parameter definitions and XML-based help files to assist users in discovering command usage and correct syntax.

## Why does it exist?

Unlike standard Linux `man` pages, which are entirely detached flat text files, PowerShell commands are complex .NET objects with dynamically typed parameters. `Get-Help` exists to provide an intelligent, context-aware documentation system. It guarantees that the documentation reflects the _actual_ compiled state of the module. If a developer authors a PowerShell script with `[CmdletBinding()]` and standard comment-based help blocks, `Get-Help` instantly parses those comments and dynamically generates a standardized, professional manual page without any extra compilation steps required by the developer.

## Syntax

```powershell
Get-Help [[-Name] <String>] [options]
```

## Flags

| Flag          | Description                                                                                                                                        | Example                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `-Name`       | (Positional) The name of the cmdlet, concept (e.g., `about_Variables`), or function you want to research.                                          | `Get-Help Get-Process`                      |
| `-Detailed`   | Adds parameter descriptions and execution examples to the basic help view.                                                                         | `Get-Help Invoke-WebRequest -Detailed`      |
| `-Full`       | Outputs the absolute maximum amount of documentation, including deep technical parameter typing, pipeline input capabilities, and technical notes. | `Get-Help Restart-Service -Full`            |
| `-Examples`   | Bypasses the descriptive text and outputs only the code examples provided by the module author.                                                    | `Get-Help Test-NetConnection -Examples`     |
| `-Parameter`  | Drills down to return detailed documentation specifically for one named parameter of a command.                                                    | `Get-Help Copy-Item -Parameter Destination` |
| `-Online`     | Bypasses local files and opens the user's default web browser directly to the official Microsoft (or module author's) web documentation.           | `Get-Help Get-AzVM -Online`                 |
| `-ShowWindow` | Compiles the help output into a separate, searchable graphical WPF pop-up window (Windows only).                                                   | `Get-Help Get-EventLog -ShowWindow`         |
| `-Category`   | Filters the help search to a specific category (e.g., `Alias`, `Cmdlet`, `Provider`, `HelpFile`).                                                  | `Get-Help *net* -Category Cmdlet`           |

## Examples

```powershell
Get-Help Get-Date
```

> The standard invocation. It prints a brief summary containing the cmdlet's Name, Synopsis, Syntax variations (Parameter Sets), Description, and Related Links.

```powershell
Get-Help about_Execution_Policies
```

> Explores conceptual topics. The `about_*` prefix denotes help files that aren't tied to a specific command, but rather explain fundamental PowerShell engine concepts like scope, arrays, operators, or security architectures.

```powershell
Get-Help Install-Module -Examples
```

> The most frequently used flag by experienced administrators. It strips away the verbose explanations of parameters and jumps straight to the practical execution snippets provided by the author, ensuring rapid deployment.

```powershell
Get-Help Get-ADUser -Parameter Filter
```

> Targeted introspection. Instead of scrolling through 10 pages of Active Directory documentation, this command instantly isolates and prints the specific syntax, wildcards, and required .NET data types expected by the `-Filter` parameter.

```powershell
help Get-Service
```

> Uses the built-in `help` function. While `Get-Help` prints all text simultaneously, the `help` wrapper internally pipes the output through `more` (or `less`), paginating the text so it doesn't instantly scroll off the screen.

## Real-World Scenarios

**Discovering Pipeline Compatibility**

```powershell
Get-Help Stop-Process -Full
# Scroll to Parameters section to find:
# Accept pipeline input?   True (ByValue, ByPropertyName)
```

> When building complex automation scripts, developers must know how data bridges between commands. By using `-Full`, they inspect the `Accept pipeline input` metadata. This tells them whether `Stop-Process` accepts objects bound by their raw object type (`ByValue`) or if they must explicitly map the object's properties (`ByPropertyName`).

**Self-Documenting Custom Scripts**

```powershell
<#
.SYNOPSIS
Disables an Active Directory User.
.PARAMETER Identity
The SamAccountName of the user.
#>
param([string]$Identity)
# ... script body ...
```

> Platform engineers write internal tools for their Helpdesk. By embedding standard PowerShell Comment-Based Help syntax at the top of their `.ps1` files, any Helpdesk technician running `Get-Help .\Disable-User.ps1` instantly receives a fully formatted, native manual page, ensuring internal code remains documented natively.

## When should it NOT be used?

- **Finding Commands:** **Do not use `Get-Help` to randomly search for commands.** While `Get-Help *network*` works, it parses heavy text files and is slow. Use `Get-Command *network*` to quickly query the compiled binary module paths and available verb-noun combinations.
- **Without Updating:** If the output of `Get-Help` only shows a basic syntax block and a warning that "Get-Help cannot find the Help files", the local cache is empty. You must execute `Update-Help` (as Administrator) to download the XML documentation payloads from Microsoft.

## Alternatives

- **Microsoft Learn (Web):** **Best for reading.** The official web documentation provides hyperlinked parameters, rich formatting, and clearer contextual examples than the terminal output. (Accessible quickly via `Get-Help -Online`).
- **`Get-Command -Syntax`:** **Best for ultra-fast syntax checking.** If you only need to see the parameter blocks without any descriptive text, `Get-Command Get-Process -Syntax` executes instantaneously.

## How it works internally

The `Get-Help` cmdlet relies on a multi-tiered resolution engine.

First, it queries the PowerShell AST (Abstract Syntax Tree) and Reflection APIs. Even if zero documentation exists, `Get-Help` will automatically generate a rudimentary manual page by analyzing the compiled C# codebase or the `param()` block of a script. It dynamically extracts the parameter names, mandatory flags, positional indices, and .NET Types.

Second, it searches for XML-based `MAML` (Microsoft Assistance Markup Language) files associated with the module. These files are typically downloaded into the `$PSHOME` directory or the specific Module's directory when `Update-Help` is executed. The engine parses these complex XML nodes, marrying the descriptive text (`<maml:description>`) with the auto-generated parameter metadata.

Third, if Comment-Based Help is utilized in a `.ps1` or `.psm1` file, the PowerShell parser specifically tokenizes the `<# ... #>` block during script compilation, extracting tags like `.EXAMPLE` or `.NOTES` and mapping them directly to the `HelpInfo` object returned by `Get-Help`.

## Performance Notes

- **First Run Latency:** The first time `Get-Help` is executed for a complex module (like `Az.Compute`), PowerShell must load the module into the active runspace, parse the reflection data, and map the XML files. This can cause a noticeable delay.

## Security Notes

- **Update-Help Risks:** Running `Update-Help` requires making outbound HTTP requests to download CAB/XML files. If a third-party, untrusted module is installed, `Update-Help` will query the URI specified in the module's manifest (`HelpInfoURI`). Administrators in air-gapped or high-security environments must use `Save-Help` to audit and package documentation offline rather than allowing production servers to blindly query arbitrary URIs.

## Common Mistakes

- **Assuming aliases are commands**
  - _Mistake:_ Running `Get-Help dir` and wondering why the documentation talks about `Get-ChildItem`.
  - _Why:_ `dir` is a system alias. `Get-Help` resolves the alias to its underlying compiled cmdlet. It explicitly documents the true target (`Get-ChildItem`), forcing users to learn the native PowerShell ecosystem rather than clinging to legacy DOS/Bash abstractions.
- **Forgetting `Update-Help`**
  - _Mistake:_ Using a fresh Windows Server installation and complaining that the help files are useless and blank.
  - _Why:_ Starting with PowerShell 3.0, Microsoft stopped shipping documentation payloads directly on the installation media to save OS footprint and ensure up-to-date content. You must manually run `Update-Help` once to download the manuals.

## Best Practices

- **Use `help` instead of `Get-Help`:** The `help` function is a native wrapper that pipes `Get-Help` through the `more` pager. It ensures that massive manual pages don't instantly scroll off the top of your terminal buffer.
- **Leverage `-Online`:** When tackling complex modules (like Azure or AWS), terminal output is dense. `Get-Help Get-AzVM -Online` instantly bridges you to the browser for much better readability.

## Interview Questions

**Q: You write a custom PowerShell script named `Backup-Server.ps1`. Without adding any comments or XML files, you run `Get-Help .\Backup-Server.ps1`. Does it return an error, or does it return data? Explain why.**
**A:** It returns data. PowerShell possesses a deeply introspective engine. It parses the script's Abstract Syntax Tree (AST) and the `param()` block dynamically. Even without explicit documentation, `Get-Help` will auto-generate a syntax map revealing all declared parameters and their required .NET data types based solely on the compiled code structure.

**Q: A colleague wants to know if they can pipe a string directly into a specific parameter of `Stop-Service`. What exact `Get-Help` command would you run to definitively prove whether or not that parameter accepts pipeline input?**
**A:** You would run `Get-Help Stop-Service -Full` (or `-Parameter <name>`). You must look at the parameter metadata block for `Accept pipeline input?`. It will explicitly state `True` or `False`, and indicate whether it binds by `Value` or `PropertyName`.

## Practice Problems

**Problem:** You are trying to use the `Test-Connection` cmdlet but cannot remember the exact syntax used for a continuous ping. Write the command to bypass the descriptions and exclusively output the code snippets provided by the author.
**Hint:** Use the flag that explicitly limits output to use-case scenarios.
**Solution:**

```powershell
Get-Help Test-Connection -Examples
```

**Problem:** You are writing an automation script and need to know the specific .NET type and whether wildcard characters are supported for the `-Path` parameter of the `Remove-Item` cmdlet. Write the command to query this specific parameter directly.
**Hint:** Use the flag that drills down into a single parameter's metadata.
**Solution:**

```powershell
Get-Help Remove-Item -Parameter Path
```

## References

- [Get-Help (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-help)
- [about_Comment_Based_Help (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comment_based_help)
