---
slug: where-object
name: Where-Object
aliases:
  - where
category: powershell
tags:
  - powershell
  - filtering
  - objects
  - pipeline
  - data-processing
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - filter array powershell
  - find object matching condition
  - where clause powershell
  - filter processes by name
  - search pipeline objects
relatedCommands:
  - select-object
  - sort-object
  - foreach-object
  - get-childitem
alternatives: []
status: draft
---

## What is it?

`Where-Object` is the primary filtering engine within the PowerShell pipeline. It intercepts a stream of objects and evaluates each one against a user-defined conditional statement or ScriptBlock. Only objects that evaluate to a boolean `$true` are permitted to pass through the filter and continue down the pipeline, systematically isolating target data sets from massive collections based on deep object properties.

## Why does it exist?

In traditional POSIX text-streams, administrators rely on `grep` or `awk` to filter data based on brittle string and regex matching. Because PowerShell pipelines carry rich, multidimensional .NET objects rather than flat text, a string-matching tool is insufficient. `Where-Object` exists to provide an object-aware gating mechanism. It allows administrators to mathematically evaluate integers, parse dates, or query nested class arrays (e.g., "Find all services where the `Status` property equals `Running` and the `StartType` is `Automatic`"), achieving database-level query precision directly within the terminal shell.

## Syntax

```powershell
# Comparison Statement (Simplified Syntax)
Where-Object [-Property] <String> [[-Value] <Object>] [-EQ|-Match|-Like|-GT...]

# ScriptBlock (Advanced Syntax)
Where-Object [-FilterScript] <ScriptBlock>
```

## Flags

| Flag      | Description                                               | Example                                                  |
| --------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `-Filter` | Filter objects based on scriptblock condition expression. | `Where-Object -FilterScript { $_.Status -eq 'Running' }` |

### Flags / Operators

| Flag / Operator        | Description                                                                                                                    | Example                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `-FilterScript`        | (Positional) Accepts a `{ ... }` block to execute complex, multi-conditional logic against the current pipeline object (`$_`). | `Where-Object { $_.Size -gt 1GB -and$_.Name -like "*.bak" }` |
| `-Property`            | (Simplified) The name of the property to evaluate.                                                                             | `Where-Object -Property Status -eq 'Running'`                |
| `-Value`               | (Simplified) The target value to compare the property against.                                                                 | `Where-Object Name -match 'svc'`                             |
| `-eq` / `-ne`          | Strict equality / inequality. Exact string or numeric match.                                                                   | `Where-Object Extension -eq ".txt"`                          |
| `-gt` / `-lt`          | Greater Than / Less Than. Mathematical evaluation for numbers and dates.                                                       | `Where-Object Length -gt 500MB`                              |
| `-like` / `-notlike`   | Wildcard string comparison. Evaluates standard shell asterisks (`*`).                                                          | `Where-Object Name -like "*SQL*"`                            |
| `-match` / `-notmatch` | Advanced string comparison utilizing standard Regular Expressions (RegEx).                                                     | `Where-Object Name -match "^[A-Z]{3}-\d+$"`                  |
| `-in` / `-notin`       | Validates if the property value exists anywhere within a provided array.                                                       | `Where-Object Status -in @('Stopped', 'Paused')`             |
| `-is` / `-isnot`       | Evaluates the underlying .NET architectural type of the object.                                                                | `Where-Object { $_ -is [System.IO.FileInfo] }`               |
| `-Not`                 | Inverts the boolean logic of the specified simplified property evaluation.                                                     | `Where-Object -Not -Property IsReadOnly`                     |

## Examples

```powershell
Get-Service | Where-Object Status -eq 'Stopped'
```

> The simplified syntax pattern. It streams all service objects into the filter. `Where-Object` intercepts each one, checks its `Status` property, and only yields the object to the terminal if it is exactly equal to the string `'Stopped'`.

```powershell
Get-ChildItem C:\Logs | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
```

> The advanced ScriptBlock syntax. For complex logic requiring mathematical calculations, the `{ }` block evaluates the current pipeline object (represented by the `$_` or `$PSItem` automatic variable). This specific command isolates log files physically older than 30 days.

```powershell
Get-Process | Where-Object { $_.WorkingSet -gt 500MB -and $_.Name -notmatch "chrome" }
```

> Multi-conditional evaluation. Uses the `-and` logical operator within a ScriptBlock to find extremely heavy processes (consuming over 500MB of RAM) while explicitly filtering out expected heavy processes like Chrome using a regex match.

```powershell
$users | Where-Object Department -in 'Finance', 'HR', 'Legal'
```

> The array inclusion pattern. Rapidly filters a massive list of user objects, isolating only individuals whose `Department` property matches one of the exact strings declared in the `-in` array.

```powershell
Get-Process | ? Name -like '*code*'
```

> The rapid alias execution. `?` is the universally recognized, built-in alias for `Where-Object`. This drastically reduces typing during fast-paced interactive terminal debugging sessions.

## Real-World Scenarios

**Active Directory Stale Account Purging**

```powershell
Get-ADUser -Filter * -Properties LastLogonDate | Where-Object { $_.LastLogonDate -lt (Get-Date).AddDays(-90) -or $_.LastLogonDate -eq $null } | Disable-ADAccount
```

> Identity and Access Management (IAM) requires aggressive hygiene. An administrator pulls all users, and utilizes a complex ScriptBlock to filter for accounts that haven't logged in for 90 days, or crucially, accounts that were created but _never_ logged in (`-eq $null`). The isolated, highly vulnerable accounts are piped immediately to termination.

**Extracting Certificate Expirations**

```powershell
Get-ChildItem Cert:\LocalMachine\My | Where-Object NotAfter -lt (Get-Date).AddDays(15)
```

> Expiration of internal TLS/SSL certificates causes massive, unpredictable outages. An automation script queries the Windows Certificate Store provider. It filters the returned `X509Certificate2` objects mathematically, identifying any certificates scheduled to expire within the next 15 days, allowing the infrastructure team to renew them proactively.

## When should it NOT be used?

- **When native `-Filter` parameters exist:** **Do not use `Where-Object` if the source cmdlet can filter the data natively.** `Get-ChildItem C:\* | Where-Object Name -like "*.txt"` forces PowerShell to pull millions of objects into memory, then discard them. Use `Get-ChildItem C:\* -Filter "*.txt"`. The `-Filter` parameter executes deep in the underlying API layer (e.g., Win32 or LDAP), which is magnitudes faster.
- **Simple Extrication:** If you just want to grab the first 5 objects of an array, do not use `Where-Object` tracking indexes. Use `Select-Object -First 5`.

## Alternatives

- **`.Where()` Extension Method:** **Best for pure execution speed.** Introduced in PowerShell 4, invoking the collection directly (`$array.Where({$_.Status -eq 'Stopped' })`) completely bypasses pipeline overhead, making it drastically faster for massive arrays held in memory.
- **`grep` / `Select-String`:** **Best for flat text logs.** If you are parsing a plain-text log file, do not use `Get-Content | Where-Object { $_ -match "Error" }`. `Select-String` is optimized heavily for string extraction.

## How it works internally

`Where-Object` operates as a sequential, non-blocking pipeline filter.

When objects enter the pipeline (e.g., from `Get-Process`), `Where-Object` receives them one by one.

If the **Simplified Syntax** (`Where-Object Property -eq Value`) is used, PowerShell dynamically constructs an internal, highly optimized expression tree using .NET Reflection. It looks up the `.Property` on the incoming object, extracts the value, and invokes the comparative operator against the target `-Value`.

If the **ScriptBlock Syntax** (`Where-Object { $_.Property -eq Value }`) is used, PowerShell instantiates a dynamic execution environment. It binds the incoming object to the `$_` (`$PSItem`) automatic variable. The PowerShell engine then parses, compiles, and evaluates the Abstract Syntax Tree (AST) of the ScriptBlock code.

If the internal evaluation results in `$true`, `Where-Object` immediately yields the unmodified object downstream to the next cmdlet. If `$false` or `$null`, the object is discarded and memory is freed by the .NET Garbage Collector. Because it is non-blocking, a matched object reaches the end of the pipeline and prints to the screen before `Where-Object` even begins evaluating the next object in the sequence.

## Performance Notes

- **The `.Where()` Method Advantage:** Executing `$processes \vert{} Where-Object {$_.Name -match "sql" }` incurs heavy pipeline serialization overhead (wrapping objects, binding parameters, tearing down scope). For arrays exceeding 100,000 objects, using `$processes.Where({$_.Name -match "sql" })` is mathematically faster because it operates exclusively in-memory, avoiding the pipeline completely.
- **Regex Optimization:** The `-match` operator compiles the Regular Expression pattern upon every evaluation. If evaluating complex regex across millions of objects, performance will degrade.

## Security Notes

- **Safe Evaluation:** The `-FilterScript` block has full access to execute commands. However, because it evaluates in the current user's session context, it cannot be used to bypass Execution Policies or perform actions the invoking user is not already authorized to execute. Be incredibly wary of incorporating unsanitized user strings into dynamically generated ScriptBlocks via `Invoke-Expression`.

## Common Mistakes

- **Using Assignment (`=`) instead of Equality (`-eq`)**
  - _Mistake:_ `Where-Object { $_.Status = 'Stopped' }`
  - _Why:_ In PowerShell, `=` is the variable assignment operator. `-eq` is the equality comparison operator. Using `=` inside the block will actually overwrite the property of the object (if mutable) and always evaluate to true, destroying data and bypassing the filter entirely.
- **Misunderstanding Null Handling**
  - _Mistake:_ `Where-Object { $_.Notes -eq$null }` might occasionally yield unpredictable results if the `.Notes` property doesn't strictly exist on the object payload.
  - _Why:_ In PowerShell, always place `$null` on the left side of the equality operator: `Where-Object { $null -eq$_.Notes }`. If the right-hand side is a collection, placing `$null` on the right alters array filtering behavior, leading to insidious bugs.

## Best Practices

- **Prioritize Left-Filtering:** Shift filters as far left in your pipeline as architecturally possible. If you need to sort processes by CPU, but only care about `chrome` processes, always run `Where-Object -> Sort-Object`. Throwing away 90% of your data before hitting expensive, blocking cmdlets (like sorting or exporting) drastically speeds up scripts.
- **Embrace Simplified Syntax:** Unless you need multiple conditions (`-and` / `-or`), always use the simplified syntax (`Where-Object Status -eq 'Stopped'`) instead of ScriptBlocks (`Where-Object { $_.Status -eq 'Stopped' }`). It is cleaner to read, less prone to syntax errors, and performs slightly faster due to bypassing AST compilation overhead.

## Interview Questions

**Q: You want to find all Active Directory users in a specific Organizational Unit. You can use `Get-ADUser -Filter * -SearchBase "OU=Sales" | Where-Object Enabled -eq $true`. A senior engineer rejects your PR and tells you to rewrite it. Why is this pipeline an anti-pattern?**
**A:** This is an extreme performance anti-pattern. By using `-Filter *`, you are commanding the Domain Controller to serialize every single user object in the OU, transmit them massively over the network to your local workstation, and allocate them into PowerShell memory, only for `Where-Object` to throw half of them away. You should use native filtering (`Get-ADUser -Filter "Enabled -eq 'True'" -SearchBase "OU=Sales"`), which pushes the filtering logic directly down to the Active Directory LDAP engine, returning only the relevant records over the network.

**Q: Explain the structural difference between evaluating objects using `Where-Object` versus using the `.Where({})` extension method.**
**A:** `Where-Object` is a pipeline cmdlet. It processes objects sequentially as a stream, allowing you to handle infinitely massive data sets without loading everything into memory simultaneously. The `.Where({})` extension method is invoked directly on a collection array stored in memory. It bypasses pipeline serialization overhead, making it drastically faster, but it requires the entire data set to be fully loaded into RAM first, which can crash your session if the dataset is too large.

## Practice Problems

**Problem:** You are monitoring disk space. You executed `Get-ChildItem -Path C:\Data` and now have a pipeline of file objects. Write the exact command to append to this pipeline that isolates exclusively files whose byte size (`Length` property) is strictly greater than 50 Megabytes.
**Hint:** Use the simplified syntax, the Greater Than operator, and the native PowerShell megabyte constant.
**Solution:**

```powershell
Where-Object Length -gt 50MB
```

**Problem:** You queried a list of servers and stored them in the pipeline. You need to isolate servers where the `Environment` property equals "Prod" AND the `Region` property equals "EU". Write the command using a ScriptBlock to handle the multi-conditional logic.
**Hint:** Use the automatic object variable (`$_`) and the logical AND operator.
**Solution:**

```powershell
Where-Object { $_.Environment -eq "Prod" -and $_.Region -eq "EU" }
```

## References

- [Where-Object (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/where-object)
- [about_Comparison_Operators (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comparison_operators)
