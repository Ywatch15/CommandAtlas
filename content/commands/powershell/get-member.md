---
slug: get-member
name: Get-Member
aliases:
  - gm
category: powershell
tags:
  - powershell
  - reflection
  - objects
  - dotnet
  - debugging
  - introspection
difficulty: intermediate
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - find powershell object properties
  - list methods of powershell object
  - inspect powershell pipeline object
  - what type is this powershell variable
  - view dotnet methods in powershell
relatedCommands:
  - select-object
  - get-command
  - get-help
status: draft
---

## What is it?

`Get-Member` is the ultimate introspection utility in PowerShell. It acts as a diagnostic bridge into the underlying .NET framework, analyzing any object passed to it through the pipeline and generating a comprehensive, tabular list of its members. This list exposes the object's absolute type name, all readable/writable properties, and all executable methods, effectively documenting how to interact with the object programmatically.

## Why does it exist?

Traditional UNIX tools pipe raw text strings, which require complex `awk` or `sed` regex to manipulate. PowerShell pipes complex .NET objects. When an administrator runs a command like `Get-Process`, they aren't looking at text; they are looking at a `System.Diagnostics.Process` object. To write automation scripts, the administrator must know what data fields (Properties) exist on that object, and what actions (Methods) they can trigger (like `.Kill()`). `Get-Member` exists to reveal this hidden architecture instantly, eliminating the need to browse Microsoft's web-based .NET documentation and empowering administrators to discover object capabilities through live, terminal-based reflection.

## Syntax

```powershell
<Object> | Get-Member [options]
Get-Member -InputObject <Object> [options]
```

## Flags

| Flag           | Description                                                                                                                      | Example                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `-MemberType`  | Filters the output to display only specific member types (e.g., `Property`, `Method`, `Event`, `AliasProperty`).                 | `Get-Process                       | Get-Member -MemberType Method` |
| `-Name`        | Searches for members matching a specific name or wildcard string. Highly useful for finding specific actions.                    | `Get-Date                          | Get-Member -Name _day_`        |
| `-Static`      | Displays static members (methods/properties defined on the Class itself) rather than instance members.                           | `[System.Math]                     | Get-Member -Static`            |
| `-Force`       | Overrides the default formatting. Displays intrinsic members (like `psbase`, `psadapted`) and hidden compiler-generated members. | `Get-Process                       | Get-Member -Force`             |
| `-View`        | Filters the view based on extended types. `Base` shows raw .NET members. `Extended` shows PowerShell custom members.             | `Get-Process                       | Get-Member -View Base`         |
| `-InputObject` | Specifies the object to evaluate. While usually piped in, supplying it directly prevents the pipeline from unrolling arrays.     | `Get-Member -InputObject $myArray` |

## Examples

```powershell
Get-Service | Get-Member
```

> The standard invocation. Fetches the collection of active system services, pipes them to `Get-Member`, and outputs the object type (`System.ServiceProcess.ServiceController`). It lists all callable methods (like `Start`, `Stop`, `Pause`) and readable properties (like `Status`, `DisplayName`).

```powershell
Get-Process | Get-Member -MemberType Property
```

> Cleans up the output. If an object has hundreds of complex methods and events, filtering explicitly for `Property` reveals only the static data points (like `CPU`, `Id`, `WorkingSet`) that are useful for `Select-Object` formatting.

```powershell
[System.IO.File] | Get-Member -Static -MemberType Method
```

> Static class introspection. Instead of examining an instantiated file object, this pipes the literal .NET Class type definition. `Get-Member` reveals all the static utility methods attached to the class (e.g., `ReadAllText`, `Exists`, `Delete`) that can be called globally using `::` syntax.

```powershell
Get-Date | Get-Member -Name To*
```

> Wildcard targeting. Pipes a `DateTime` object and searches specifically for any member whose name begins with `To`. This instantly uncovers formatting methods like `ToShortDateString`, `ToUniversalTime`, and `ToString`.

## Real-World Scenarios

**Reverse-Engineering Cloud API Responses**

```powershell
$vm = Get-AzVM -ResourceGroupName "prod" -Name "web01"
$vm | Get-Member -MemberType Property
$vm.HardwareProfile | Get-Member
```

> When working with massive cloud SDKs like Azure or AWS, the returned objects are incredibly deeply nested. A cloud engineer uses `Get-Member` iteratively to "crawl" the object structure, discovering that the VM size is not on the root object, but nested under the `.HardwareProfile` property.

**Discovering Executable Actions**

```powershell
$appPool = Get-IISAppPool -Name "DefaultAppPool"
$appPool | Get-Member -MemberType Method
$appPool.Recycle()
```

> Instead of searching Google for "How to restart IIS App Pool powershell", an administrator simply grabs the object and pipes it to `Get-Member`. The introspection reveals a native `.Recycle()` method, allowing them to invoke the action directly on the object without needing a separate standalone cmdlet.

## When should it NOT be used?

- **Viewing the actual data:** **Do not use `Get-Member` to see what is inside a variable.** `Get-Member` only shows the _blueprint_ (the class schema) of the object. It does not show the actual values. If you want to see the values of all properties, use `$variable | Select-Object -Property *` or `Format-List *`.
- **Checking string emptiness:** `Get-Member` is an architectural tool. Do not use it in conditional logic to check if a variable is valid or empty.

## Alternatives

- **`Select-Object *`:** **Best for viewing data payloads.** While `Get-Member` lists the property names and types (e.g., `Name : System.String`), `Select` dumps the actual instantiated values (e.g., `Name : my_server`).
- **Visual Studio Code (IntelliSense):** In modern authoring environments, pressing `.` after an object variable automatically invokes background introspection and provides a GUI dropdown of the members, largely negating the need for terminal-based `Get-Member` during script writing.

## How it works internally

`Get-Member` relies entirely on Microsoft .NET Reflection.

When an object is piped into `Get-Member`, PowerShell calls `Object.GetType()` on the payload. It then leverages the `System.Reflection` namespace APIs to interrogate the compiled CLR (Common Language Runtime) assembly associated with that type. It queries the metadata tables inside the assembly to extract the public Fields, Properties, Methods, and Events defined by the C# class architecture.

PowerShell then goes a step further by evaluating the Extended Type System (ETS). PowerShell allows types to be dynamically decorated at runtime using `types.ps1xml` files or `Add-Member`. ETS can inject `ScriptProperties` (properties calculated dynamically by executing a bash block) or `AliasProperties` (creating friendly names for obscure .NET fields). `Get-Member` merges the raw .NET reflection data with the ETS metadata, presenting a unified, coherent view of the object exactly as the PowerShell pipeline interprets it.

If an array (e.g., a list of 10 services) is piped to `Get-Member`, the pipeline "unrolls" the array, passing each service object to `Get-Member` individually. `Get-Member` intelligently caches the Type. It inspects the first object, prints the manual, and then silently ignores the remaining 9 objects because they are of the exact same Type, preventing the terminal from being flooded with 10 identical manual pages.

## Performance Notes

- **Reflection Overhead:** .NET Reflection is computationally expensive. Using `Get-Member` interactively is perfectly fast, but executing `Get-Member` inside a loop of a million objects just to verify a type will severely degrade script performance. Use the `-is` operator (e.g., `if ($obj -is [System.String])`) for high-speed programmatic type checking.

## Security Notes

- **Safe Introspection:** `Get-Member` is completely non-destructive. It strictly performs read-only metadata querying. It does not execute the methods or access the underlying data properties, ensuring that piping a state-altering object into it will not accidentally trigger an execution.

## Common Mistakes

- **Piping arrays to `Get-Member` vs `-InputObject`**
  - _Mistake:_ You have an array `$arr = @(1, 2, 3)`. You run `$arr | Get-Member` to find the methods of an Array. The output says `System.Int32`.
  - _Why:_ The PowerShell pipeline automatically unrolls (enumerates) arrays. It passed the integer `1` into `Get-Member`, not the array itself. To inspect the Array object itself, you must bypass the pipeline unrolling: `Get-Member -InputObject $arr`. This correctly returns the methods for `System.Object[]` (like `.Count` and `.Add`).
- **Confusing `Get-Member` with data inspection**
  - _Mistake:_ Running `Get-Process | Get-Member | Select-Object CPU` and getting empty output.
  - _Why:_ `Get-Member` outputs objects of type `MemberDefinition`. It does not pass the original Process object down the pipeline. To select data, remove `Get-Member` from the chain completely.

## Best Practices

- **Uncover hidden `.NET` capabilities:** The commands provided by PowerShell are just wrappers around .NET. If a cmdlet doesn't support a feature, pipe the object to `Get-Member`. You will often find low-level methods (like `Kill()` on processes, or `Delete()` on files) that allow you to accomplish tasks natively without writing complex workarounds.
- **Identify Custom Type Extensions:** Look for `NoteProperty` or `ScriptProperty` in the output. These are synthetic properties generated by PowerShell formatting files. Recognizing them is critical, as these properties will instantly vanish if the object is serialized to JSON or exported outside the PowerShell environment.

## Interview Questions

**Q: You want to know the properties of an Array object itself. You type `$myArray | Get-Member`, but the output shows the properties of a `System.String`. Why did this happen, and how do you fix it?**
**A:** This happens because the PowerShell pipeline automatically enumerates (unrolls) collections. It pulled the first string out of the array and passed it to `Get-Member`, which correctly evaluated it as a `String`. To evaluate the collection object itself without unrolling it, you must bypass the pipeline using the InputObject parameter: `Get-Member -InputObject $myArray`.

**Q: Explain the difference between running `[System.DateTime] | Get-Member` and `[System.DateTime] | Get-Member -Static`.**
**A:** The first command evaluates an instantiated object; it will show instance methods like `.AddDays()` or `.ToString()`, which require you to already possess a specific date variable to execute. The second command, using `-Static`, evaluates the class blueprint itself. It shows methods that are called directly on the class without instantiation, such as `[System.DateTime]::Now` or `[System.DateTime]::Parse()`.

## Practice Problems

**Problem:** You executed a command and assigned the result to `$networkData`. You want to know the exact .NET Type name of this variable (e.g., `System.String`, `System.Net.IPAddress`). Write the simplest pipeline command to reveal this blueprint.
**Hint:** Use the command designed for object introspection.
**Solution:**

```powershell
$networkData | Get-Member
```

**Problem:** You have a `System.IO.FileInfo` object representing a text file. You know the object has built-in methods (actions) you can trigger, but you don't care about the properties. Write a pipeline command to list exclusively the `Method` members available on this file object.
**Hint:** Use the flag that filters the introspection results by category.
**Solution:**

```powershell
Get-Item file.txt | Get-Member -MemberType Method
```

## References

- [Get-Member (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-member)
- [about_Objects (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_objects)
