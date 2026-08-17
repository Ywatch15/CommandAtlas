---
slug: nmcli
name: nmcli
aliases: []
category: networking
tags: [linux, networking, networkmanager, configuration, interfaces]
difficulty: intermediate
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'configure network interface linux'
  - 'connect to wifi command line'
  - 'set static ip address nmcli'
  - 'manage networkmanager connections'
  - 'restart network interface'
relatedCommands: [ip, ping, netstat, systemctl, iw]
alternatives: [ip, iw, iwconfig]
status: draft
---

## What is it?

`nmcli` is a comprehensive command-line tool used to control NetworkManager and report network status. It allows users to create, display, edit, delete, activate, and deactivate network connections, as well as control and display network device statuses directly from the terminal without relying on graphical applets or curses interfaces.

## Why does it exist?

Historically, Linux networking was managed by manually editing distribution-specific text files (e.g., `/etc/network/interfaces` in RHEL or `/etc/network/interfaces` in Debian) and using `/etc/init.d/network` scripts. NetworkManager was introduced to handle dynamic networks (like roaming Wi-Fi and VPNs) but initially relied heavily on D-Bus graphical clients. `nmcli` exists to bridge this gap for headless servers and automation, providing a scriptable, robust CLI that instructs the NetworkManager daemon to manage complex routing, DNS, and interface states persistently.

## Syntax

```bash
nmcli [OPTIONS] OBJECT { COMMAND | help }
# Objects: general (g), networking (n), radio (r), connection (c), device (d), agent (a), monitor (m)
```

## Flags

| Flag              | Description                                                                                  | Example                          |
| ----------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| `-t`, `--terse`   | Formats output in a highly machine-readable, colon-separated format, ideal for `awk`/`grep`. | `nmcli -t -f NAME,DEVICE c show` |
| `-p`, `--pretty`  | Formats output with human-readable alignment, colors, and tabular layouts.                   | `nmcli -p d show`                |
| `-c`, `--colors`  | Controls terminal colorization (`yes`, `no`, `auto`).                                        | `nmcli -c yes d status`          |
| `-f`, `--fields`  | Specifies exactly which columns or fields to output (e.g., `UUID`, `TYPE`, `IP4`).           | `nmcli -f DEVICE,STATE d`        |
| `-w`, `--wait`    | Sets a timeout (in seconds) to wait for operations to finish before exiting.                 | `nmcli -w 10 c up eth0`          |
| `-a`, `--ask`     | Interactively prompts for missing credentials (like Wi-Fi passwords or VPN secrets).         | `nmcli -a d wifi connect MySSID` |
| `-m`, `--mode`    | Sets the output mode (`tabular` or `multiline`).                                             | `nmcli -m multiline c show eth0` |
| `-v`, `--version` | Displays the NetworkManager version.                                                         | `nmcli -v`                       |
| `c`, `connection` | (Object) Manages NetworkManager connection profiles.                                         | `nmcli c add type ethernet`      |
| `d`, `device`     | (Object) Manages physical and virtual network interfaces.                                    | `nmcli d disconnect eth0`        |

## Examples

```bash
nmcli d status
```

> This lists all physical and virtual network devices recognized by NetworkManager, displaying their type (ethernet, wifi, loopback), current state (connected, unmanaged), and the specific connection profile actively applied to them.

```bash
nmcli c up id "Wired connection 1"
```

> This commands NetworkManager to activate a specific connection profile (using its string ID), binding the configured IP addresses, DNS settings, and routing rules to the underlying hardware device.

```bash
nmcli c add type ethernet con-name static-eth0 ifname eth0 ip4 10.0.0.50/24 gw4 10.0.0.1
```

> This provisions a brand-new persistent connection profile named `static-eth0` tied to the hardware interface `eth0`, configuring it with a static IPv4 address and default gateway rather than relying on DHCP.

```bash
nmcli d wifi list
```

> This triggers the physical wireless radio to scan the environment and outputs a tabular matrix of available Access Points, detailing their SSIDs, BSSIDs, signal strength, channels, and security protocols.

```bash
nmcli c modify static-eth0 ipv4.dns "8.8.8.8 8.8.4.4" ipv4.ignore-auto-dns yes
```

> This updates an existing connection profile, injecting static custom DNS servers and instructing NetworkManager to ignore any DNS servers dynamically pushed via DHCP upon connection.

## Real-World Scenarios

**Automated Headless Wi-Fi Provisioning**

```bash
nmcli d wifi connect "CorporateNet" password "SuperSecret!123" hidden yes
```

> Systems administrators deploying headless IoT devices or Raspberry Pis use `nmcli` to instantly authenticate against WPA2 networks via scripts, bypassing the need for GUI desktop environments.

**Scripted Interface Bouncing**

```bash
nmcli c down eth0 && nmcli c up eth0
```

> After manually modifying NetworkManager configuration files in `/etc/NetworkManager/system-connections/`, operators rapidly bounce the connection profile via `nmcli` to force the daemon to reload the profile and apply the updated IP stack without rebooting the server.

**Provisioning Network Bridges for Virtualization**

```bash
nmcli c add type bridge ifname br0 con-name br0
nmcli c add type ethernet ifname eth0 master br0
```

> KVM/QEMU hypervisor engineers use `nmcli` to programmatically provision Layer 2 network bridges and enslave physical ethernet interfaces to them, allowing virtual machines to route directly onto the local LAN.

## When should it NOT be used?

- **Applying highly ephemeral, split-second routing changes:** **Reason:** `nmcli` modifies persistent profiles and triggers heavy daemon reconciliation logic. **Use instead:** The `ip` command (`ip route add`), which modifies kernel RAM state instantly.
- **Servers utilizing `systemd-networkd` or Netplan:** **Reason:** NetworkManager conflicts with other network configuration daemons. If Ubuntu is configured to use Netplan with the `networkd` renderer, `nmcli` will report devices as `unmanaged`. **Use instead:** `netplan apply` or `networkctl`.

## Alternatives

- **`nmtui`:** NetworkManager Text User Interface. **Tradeoff:** `nmtui` provides a highly intuitive, curses-based visual menu for configuring IPs and Wi-Fi interactively, but cannot be utilized inside automated bash pipelines.
- **`ip`:** The iproute2 suite. **Tradeoff:** `ip` interacts with the kernel natively and instantly, but changes vanish on reboot. `nmcli` configurations survive reboots.
- **`systemd-networkd`:** Systemd's native network manager. **Tradeoff:** Relies purely on declarative `.network` files rather than imperative command-line administration, often preferred in immutable server infrastructure.

## How it works internally

`nmcli` is fundamentally a client wrapper that communicates with the `NetworkManager` background daemon using **D-Bus** (Desktop Bus) IPC messaging.

When you issue `nmcli c add`, `nmcli` packages your parameters into a D-Bus message and sends it to the daemon. The daemon creates the logical configuration profile in memory and simultaneously writes it to disk (traditionally inside `/etc/NetworkManager/system-connections/` using INI-style keyfile formatting).

NetworkManager heavily abstracts the concept of networking into two distinct objects: **Devices** and **Connections**. A `Device` is the physical or virtual hardware (`eth0`, `wlan0`). A `Connection` is the configuration profile (IPs, DNS, MTU). When `nmcli c up` is executed, the daemon maps the `Connection` to the compatible `Device`, uses `dhclient` for dynamic leases, invokes the `iproute2` kernel API to assign IP addresses and routes, and dynamically rewrites `/etc/resolv.conf` to configure DNS resolvers.

## Performance Notes

- Because `nmcli` acts as an asynchronous D-Bus client talking to a monolithic daemon, issuing massive bursts of `nmcli` commands rapidly in a loop can bottleneck D-Bus or cause the NetworkManager daemon to momentarily hang during serialization.
- Relying on `nmcli -t` (terse output) completely bypasses complex terminal alignment calculations, making it the most performant method for extracting data in automation scripts.

## Security Notes

- **Plaintext Wi-Fi/VPN Passwords:** By default, connections created via `nmcli` that include secrets (like PSK passwords) are written to disk in `/etc/NetworkManager/system-connections/` in plaintext. Ensure these configuration files possess strict `600` permissions and are owned by root.
- **Polkit Authorization:** Execution of disruptive `nmcli` commands is governed by Polkit (PolicyKit). While standard users can view interfaces, attempting to alter connections typically requires local console authorization or explicit `root` privileges.

## Common Mistakes

- **Modifying IPs with `ip` and expecting them to persist:** Using `ip addr add` while NetworkManager is running. **Why it's wrong:** The `ip` command bypasses NetworkManager. On the next DHCP lease renewal or interface bounce, NetworkManager will forcefully overwrite the kernel state with its own profile configurations, deleting your manual IP. You must use `nmcli` to make persistent changes.
- **Confusing Device with Connection:** Trying to run `nmcli d up eth0` to change IP configurations. **Why it's wrong:** You cannot administratively "up" a physical device to change its settings; you must bring "up" the _Connection profile_ (`nmcli c up profile_name`) attached to the device.
- **Creating duplicate connections:** Running `nmcli c add` multiple times for the same interface. **Why it's wrong:** NetworkManager allows infinite profiles for one interface. You will create `profile-1`, `profile-2`, causing unpredictable behavior when the daemon attempts auto-connection. Use `nmcli c modify` for existing profiles.

## Best Practices

- Always use `nmcli con reload` after manually editing physical configuration files in `/etc/NetworkManager/` to force the daemon to ingest the disk changes before attempting to bring the interface up.
- In scripts, strictly use UUIDs (e.g., `nmcli c up 8e3a2b...`) rather than connection names to avoid errors caused by identically named or renamed profiles.
- Disable automatic DNS overwriting (`ipv4.ignore-auto-dns yes`) on production servers with static IP schemas to prevent DHCP servers from hijacking custom `/etc/resolv.conf` configurations.

## Interview Questions

- _Query:_ What is the fundamental architectural difference between a "Device" and a "Connection" within NetworkManager's object model?
  - _A:_ A "Device" represents the actual physical or virtual hardware interface provided by the kernel (e.g., `eth0`, `wlan0`). A "Connection" is the logical configuration profile (containing IP addresses, DNS settings, and security credentials). A Device can only have one active Connection at a time, but multiple Connections can be defined and swapped onto a Device depending on the environment (e.g., different Wi-Fi profiles).
- _Query:_ If a systems administrator manually executes `ip route add default via 192.168.1.1` on a server managed by NetworkManager, why might the route spontaneously disappear an hour later?
  - _A:_ The `ip` command alters the kernel's routing table dynamically but does not update NetworkManager's configuration profiles. When NetworkManager performs periodic maintenance—such as renewing a DHCP lease, handling a carrier flap, or syncing state—it forcefully reconciles the kernel routing table to match its internal persistent profiles, wiping out the manual, unmanaged route.
- _Query:_ How does `nmcli` communicate with the underlying NetworkManager daemon to apply configurations?
  - _A:_ `nmcli` is a client application that does not directly modify network configurations or files. Instead, it serializes user arguments into D-Bus (Desktop Bus) IPC messages and transmits them over the local system bus to the `NetworkManager` daemon, which then executes the kernel and filesystem modifications.

## Practice Problems

- _Problem:_ Output a perfectly clean, colon-separated list displaying only the UUID, Name, and Device mapping of all configured NetworkManager connections, suitable for piping into `awk`.
  - _Hint:_ Combine the terse formatting flag, explicit field selection, and the connection show object.
  - _Solution:_ `nmcli -t -f UUID,NAME,DEVICE c show` (This generates machine-readable output stripping headers and visual spacing).
- _Problem:_ Modify an existing connection profile named `prod-eth0`, configuring it to assign the static IP address `10.50.0.100/24` and setting the gateway to `10.50.0.1`.
  - _Hint:_ Use the connection modify subcommand along with IPv4 parameters.
  - _Solution:_ `nmcli c modify prod-eth0 ipv4.addresses 10.50.0.100/24 ipv4.gateway 10.50.0.1 ipv4.method manual` (This permanently updates the profile to use static, manual configurations).

## References

- [NetworkManager Reference Manual](https://networkmanager.dev/docs/api/latest/)
- [Man Page for nmcli (Linux)](https://man7.org/linux/man-pages/man1/nmcli.1.html)
