---
slug: get-command
name: Get-Command
aliases:
  - gcm
category: powershell
tags:
  - powershell
  - discovery
  - introspection
  - modules
  - cmdlets
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - find powershell command
  - list all available cmdlets
  - show syntax for powershell function
  - find which module a command belongs to
  - search for commands by verb or noun
relatedCommands:
  - get-help
alternatives:
  - get-help
status: draft
---

## What is it?

`Get-Command` is a core introspection utility that discovers and lists all commands installed on the computer. It queries the PowerShell session state and environment paths to retrieve cmdlets, aliases, functions, filters, scripts, and native executable applications (like `ping` or `git`), exposing their origins, module associations, and parameter schemas.

## Why does it exist?

PowerShell is an enormously extensible ecosystem. Between built-in cmdlets, auto-loading modules (like Azure, AWS, or Active Directory), custom profile functions, and native OS binaries, the terminal namespace contains tens of thousands of commands. `Get-Command` exists to provide a programmatic discovery mechanism. Rather than relying on external documentation or web searches, engineers use it to rapidly interrogate the local environment to figure out _what_ tools are available, _where_ they come from, and _how_ to invoke them.

## Syntax

```powershell
Get-Command [[-Name] <string[]>] [-Module <string[]>] [-CommandType <CommandTypes>] [options]
Get-Command -ParameterName <string[]> [-ParameterType <PSTypeName[]>] [options]
```

## Flags

| Flag               | Description                                                                                  | Example                                          |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `-Name`            | Specifies an array of names or patterns to search for. Accepts wildcards.                    | `Get-Command -Name *NetAdapter*`                 |
| `-Module`          | Restricts the search strictly to commands exported by a specific PowerShell module.          | `Get-Command -Module Az.Compute`                 |
| `-CommandType`     | Filters results by execution type (e.g., `Cmdlet`, `Alias`, `Function`, `Application`).      | `Get-Command -CommandType Cmdlet`                |
| `-Verb`            | Isolates the search to commands utilizing a specific standard verb (e.g., `Get`, `Invoke`).  | `Get-Command -Verb Remove`                       |
| `-Noun`            | Isolates the search to commands targeting a specific noun (e.g., `Process`, `AzVM`).         | `Get-Command -Noun Process`                      |
| `-ParameterName`   | Discovers commands that accept a specific explicitly named parameter.                        | `Get-Command -ParameterName ComputerName`        |
| `-ParameterType`   | Discovers commands that accept parameters binding to a specific .NET object type.            | `Get-Command -ParameterType System.TimeSpan`     |
| `-Syntax`          | Outputs only the formal syntax signature string of the discovered command.                   | `Get-Command Get-Process -Syntax`                |
| `-ShowCommandInfo` | Evaluates dynamic parameters and displays deep structural metadata about the command.        | `Get-Command Invoke-RestMethod -ShowCommandInfo` |
| `-All`             | Bypasses command shadowing, returning all versions/types of a command sharing the same name. | `Get-Command curl -All`                          |

## Examples

```powershell
Get-Command -Verb Get -Noun AzVM*
```

> This utilizes the strict Verb-Noun architectural convention of PowerShell. It explicitly queries the session state for any read-only (`Get`) retrieval commands that interact with Azure Virtual Machine objects (`AzVM*`), instantly surfacing the correct cloud API cmdlets.

```powershell
Get-Command -Module ActiveDirectory
```

> This lists every single cmdlet, alias, and function exported by the `ActiveDirectory` module. If the module is not currently loaded into memory, this command triggers the `PSModuleAutoLoading` mechanism to parse the module manifest on disk automatically.

```powershell
Get-Command -ParameterName Credential
```

> This conducts an advanced introspection query. It scans the parameter metadata of every installed command on the system and returns a list exclusively containing tools designed to securely accept and process explicit authentication (`Credential`) payloads.

```powershell
Get-Command docker -All
```

> This exposes command shadowing. If a system possesses an alias, a custom function, and a native executable all named `docker`, executing the command natively invokes the highest precedence type. The `-All` flag overrides this, dumping a complete hierarchy of every single object competing for that specific namespace string.

```powershell
(Get-Command Invoke-WebRequest).Parameters.Keys
```

> Because `Get-Command` returns rich .NET objects (like `CmdletInfo`), developers wrap the query in parentheses to instantly access its internal dictionary mapping, extracting a raw string array of every parameter the command accepts.

## Real-World Scenarios

**Reverse-Engineering Undocumented Pipelines**

```powershell
Get-Command -ParameterType System.Diagnostics.Process
```

> When scripting complex automation pipelines, engineers occasionally possess a raw object (like a `Process`) but don't know what commands natively accept it via the pipeline. Using `-ParameterType` instantly discovers tools (like `Stop-Process` or `Wait-Process`) inherently programmed to bind that specific .NET class structure.

**Verifying CI/CD Environment Capabilities**

```powershell
if (-not (Get-Command "terraform" -ErrorAction SilentlyContinue)) { throw "Missing dependency" }
```

> Ephemeral cloud runners executing critical deployment scripts utilize `Get-Command` in conditional validation blocks. It acts as an instant, cross-platform assertion test to guarantee that external binaries (like `terraform` or `kubectl`) exist in the `$env:PATH` before attempting catastrophic infrastructure modifications.

## When should it NOT be used?

- **Extracting detailed, human-readable explanations of a command:** **Reason:** `Get-Command` exposes structural metadata (parameters, types, DLL origins). It does not provide text descriptions or usage examples. **Use instead:** `Get-Help <CommandName> -Detailed`.
- **Executing network-based API discovery:** **Reason:** `Get-Command` only discovers code modules that are physically downloaded and installed on the local hard drive. It cannot search for commands residing uninstalled in the PowerShell Gallery. **Use instead:** `Find-Command`.

## Alternatives

- **`Get-Help`:** The documentation engine. **Tradeoff:** `Get-Help` searches conceptual documentation, examples, and descriptions, making it better for learning. `Get-Command` strictly queries programmatic metadata and syntax, making it better for strict introspection.
- **`Find-Command`:** Remote discovery. **Tradeoff:** Connects to remote package repositories (like the PSGallery) to discover modules that _could_ be installed, whereas `Get-Command` strictly audits the local workstation.

## How it works internally

When you execute `Get-Command`, the PowerShell execution engine (the Runspace) interacts with its internal `CommandDiscovery` subsystem.

PowerShell enforces a strict architectural hierarchy for command resolution. When searching, `Get-Command` natively evaluates sources in this order of precedence: **Aliases > Functions > Cmdlets > External Applications**.

The engine first scans the active session state memory to identify loaded aliases, functions, and standard cmdlets. However, modern PowerShell relies on **PSModuleAutoLoading**. If the requested command is not in memory, the engine rapidly parses the export manifests (`.psd1`) of every uninstalled module residing in the directories defined by the `$env:PSModulePath` variable. If a match is found, it implicitly triggers a background module load.

Finally, to locate `Application` types (native OS binaries), the engine maps and queries every single physical directory defined in the operating system's `$env:PATH` variable, generating `ApplicationInfo` objects for the executables it discovers.

## Performance Notes

- **Path Traversal Latency:** Running `Get-Command *` or searching for broad strings forces PowerShell to physically query the host's filesystem across the entire `$env:PATH` to resolve all possible `Application` executables. On heavily bloated workstations or networked drives, this introduces severe execution delays. Restricting the query with `-CommandType Cmdlet` bypasses the filesystem entirely, executing instantaneously.
- **Auto-loading Overhead:** Querying for an unloaded command forces PowerShell to read module manifests from disk. If you query massive cloud modules (like `Az`), you will experience a momentary freeze while the engine validates and caches the exported definitions.

## Security Notes

- **Execution Policy Evasion Awareness:** `Get-Command` reads command definitions; it does not execute them. Therefore, it is entirely immune to Execution Policy blocks and acts as a safe recon tool.
- **Module Auto-Loading Risks:** The automatic discovery mechanism will implicitly parse and occasionally trigger initialization code (`__init__` sequences or dynamic parameter generators) inside third-party modules. Running `Get-Command` on a highly compromised workstation with untrusted, malicious modules in the module path can theoretically trigger unexpected code execution if module manifests are poisoned.

## Common Mistakes

- **Confusing `Get-Command` with `Get-Help`:** Running `Get-Command Set-Content` expecting a paragraph explaining how it works. **Why it's wrong:** The command dumps a terse table containing the CommandType, Name, Version, and Source. It is a discovery tool, not a manual.
- **Assuming command shadowing implies the binary is broken:** Running `docker` and failing, but `Get-Command docker` returns an object. **Why it's wrong:** You might have a broken local function named `docker` shadowing the actual OS binary. You must run `Get-Command docker -All` to expose the conflict and delete the offending function to restore access to the true `Application` binary.

## Best Practices

- When integrating API integrations into scripts, use `(Get-Command Command-Name).Syntax` to instantly dump the perfectly formatted, parameter-complete execution signature to the terminal, eliminating the need to context-switch to browser documentation.
- When executing cross-platform `.ps1` scripts (Windows vs. Linux), wrap critical dependency checks in `Get-Command` to ensure binaries like `openssl` or `curl` are physically present in the target OS environment path before executing the core script logic.

## Interview Questions

- _Query:_ Describe the strict precedence hierarchy PowerShell utilizes when evaluating a command string, and explain how `Get-Command` can expose conflicts within this hierarchy.
  - _A:_ PowerShell evaluates commands in the following absolute order: **Aliases**, then **Functions**, then **Cmdlets**, and finally native **Applications** (OS executables in the PATH). If an administrator creates a function named `ping`, running the string `ping` executes the function, completely ignoring the native Windows `ping.exe`. This is called command shadowing. Executing `Get-Command ping -All` exposes this conflict by printing a hierarchical list of every entity competing for that namespace string.
- _Query:_ Why does running `Get-Command -Module AzureRM` sometimes cause a brief delay or freeze in the terminal, even if you haven't explicitly imported the module?
  - _A:_ This occurs due to the `PSModuleAutoLoading` mechanism. If the requested module resides in the directories specified by `$env:PSModulePath` but isn't actively loaded in RAM, `Get-Command` automatically performs a disk read. It parses the module's manifest (`.psd1`) to dynamically evaluate and compile the list of exported commands, caching the definitions so they are ready for immediate execution, resulting in an initialization delay.
- _Query:_ You have a complex array of objects containing a mix of strings, integers, and custom `ActiveDirectory` types. You want to pass this array through the pipeline, but you don't know what cmdlets are capable of accepting the custom type natively. How do you find out?
  - _A:_ You leverage the introspection engine by executing `Get-Command -ParameterType <Custom.Type.Name>`. `Get-Command` will iterate through the structural metadata of every installed cmdlet on the system and return a list restricted strictly to commands that expose a parameter explicitly typed to bind and process that specific object.

## Practice Problems

- _Problem:_ Interrogate the local PowerShell session to discover every available command that accepts a generic network URL (System.Uri) as an explicit parameter type.
  - _Hint:_ Utilize the deep structural introspection flag targeting the precise .NET object classification.
  - _Solution:_ `Get-Command -ParameterType System.Uri` (This bypasses text parsing and queries the raw execution schema of installed tools).
- _Problem:_ Retrieve the formal, syntactic execution signature of the `Invoke-RestMethod` cmdlet, displaying only the exact string layout of its parameters without any other tabular metadata.
  - _Hint:_ Query the specific command and extract the property designed for displaying operational schema.
  - _Solution:_ `Get-Command Invoke-RestMethod -Syntax` (This outputs the clean, functional representation of all accepted parameter sets directly to the terminal).

## References

- [Microsoft Docs - Get-Command](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-command)
- [about_Command_Precedence](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_command_precedence)
  === END FILE ===
