---
slug: ethtool
name: ethtool
aliases: []
category: networking
tags: [linux, networking, hardware, nic, troubleshooting, offload]
difficulty: advanced
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'check network interface speed'
  - 'view nic hardware settings'
  - 'change ethernet autonegotiation'
  - 'disable tso offloading'
  - 'blink network card led'
relatedCommands: [ip, ifconfig, tcpdump]
alternatives: [ip]
status: draft
---

## What is it?

`ethtool` is a low-level Linux diagnostic and configuration utility used to query and control network interface controller (NIC) hardware and device drivers. It allows system administrators to interrogate the physical layer of the network stack, exposing deep hardware metrics like negotiated link speed, duplex mode, supported connection mediums (Fiber vs Copper), ring buffer sizes, and hardware checksum offload capabilities.

## Why does it exist?

While commands like `ip addr` manage logical Layer 3 addressing, they provide zero visibility into the physical Layer 1/2 hardware state. If a server is experiencing massive packet loss or terrible throughput, the issue often resides in the physical switch mis-negotiating the link speed (e.g., dropping a 10Gbps link to 100Mbps half-duplex), or the NIC dropping packets because its hardware ring buffers are too small. `ethtool` exists to bridge the gap between the Linux kernel and the physical silicon, providing a standard `ioctl` interface to query EEPROM data, manipulate driver offloading features to optimize CPU usage, and troubleshoot physical connectivity issues natively from the terminal.

## Syntax

```bash
ethtool [options] devname
```

## Flags

| Flag                         | Description                                                                                                            | Example                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `-s`, `--change`             | Modifies the settings of the specified network interface (requires appending key-value pairs like `speed 1000`).       | `ethtool -s eth0 speed 1000 duplex full autoneg off` |
| `-i`, `--driver`             | Queries the interface for its underlying kernel driver information, driver version, and firmware version.              | `ethtool -i eno1`                                    |
| `-S`, `--statistics`         | Queries the hardware for highly detailed, NIC-specific statistics (e.g., exact counts of rx_crc_errors or tx_dropped). | `ethtool -S eth1`                                    |
| `-k`, `--show-features`      | Displays the state of protocol offload features (like TCP Segmentation Offload [TSO] or Checksumming).                 | `ethtool -k eth0`                                    |
| `-K`, `--features`           | Modifies the state of protocol offload features on or off.                                                             | `ethtool -K eth0 tso off`                            |
| `-p`, `--identify`           | Physically blinks the LED light on the target network card. Invaluable for identifying ports in messy datacenters.     | `ethtool -p eth2 10`                                 |
| `-g`, `--show-ring`          | Displays the current and maximum supported sizes of the NIC's RX and TX ring buffers.                                  | `ethtool -g enp3s0`                                  |
| `-G`, `--set-ring`           | Alters the sizes of the RX and TX ring buffers to absorb traffic bursts or reduce latency.                             | `ethtool -G eth0 rx 4096`                            |
| `-m`, `--dump-module-eeprom` | Extracts telemetry data from inserted optical transceivers (SFP/QSFP), showing light levels and temperatures.          | `ethtool -m eth0`                                    |

## Examples

```bash
ethtool eth0
```

> The standard hardware query. Outputs the supported link modes, the actively negotiated link speed (e.g., `Speed: 10000Mb/s`), the duplex state (`Duplex: Full`), the physical port type (`Port: Twisted Pair`), and critically, whether the physical link is actively detecting a carrier signal (`Link detected: yes`).

```bash
ethtool -i enp0s3
```

> Extracts driver telemetry. It displays the kernel driver managing the hardware (e.g., `igb` or `ixgbe`), the specific driver version, and the firmware version flashed onto the NIC's ROM. This is essential when correlating hardware bugs with specific vendor firmware releases.

```bash
ethtool -S eth0 | grep -i drop
```

> Executes a deep dive into hardware-level packet drops. Unlike `ip -s link`, which shows kernel-level drops, `ethtool -S` exposes the raw ASIC registers on the network card itself, revealing if the silicon is actively dropping packets due to exhausted PCIe bus bandwidth or physical CRC errors.

```bash
ethtool -s eth1 speed 100 duplex full autoneg off
```

> The heavy-handed physical override. If a datacenter switch is failing to auto-negotiate properly, this command forces the Linux driver to configure the NIC strictly to 100Mbps Full Duplex and disables the auto-negotiation protocol entirely.

```bash
ethtool -K eth0 gro off gso off tso off
```

> Disables TCP/Generic Segmentation Offloading. This forces the Linux kernel CPU, rather than the NIC hardware, to handle the segmentation of large TCP payloads into MTU-sized packets. This is frequently used as a temporary workaround when buggy NIC firmware corrupts packets during hardware offloading, especially in complex virtualization/VxLAN environments.

## Real-World Scenarios

**Locating Cables in the Datacenter**

```bash
ethtool -p eno2 30
```

> A remote system administrator asks a datacenter technician ("remote hands") to swap the cable on the second management interface. The server has 8 identical unmarked ports. The admin executes this command, causing the physical LED light on port `eno2` to blink rapidly for 30 seconds, providing immediate visual confirmation to the technician on the floor.

**Tuning for High-Frequency Trading (HFT)**

```bash
ethtool -G eth0 rx 4096 tx 4096
```

> In environments processing millions of micro-packets per second, standard NIC buffer sizes are too small. During microbursts, the kernel cannot process the hardware interrupts fast enough, and the NIC silently drops packets. The engineer maximizes the RX and TX hardware ring buffers to 4096 descriptors, allowing the silicon to absorb the traffic spike until the CPU can catch up.

## When should it NOT be used?

- **Virtual Machines / Cloud Instances:** **`ethtool` is largely useless inside AWS, GCP, or VMware VMs.** Virtualized network adapters (like `virtio_net` or ENA) abstract the physical hardware. Querying `ethtool` inside a VM will output fake, hardcoded speeds (like 10Gbps) regardless of the actual physical host's capability. Features like auto-negotiation cannot be altered inside a VM namespace.
- **Logical Network Configuration:** **Do not use `ethtool` to assign IP addresses or bring interfaces up/down.** `ethtool` manipulates the hardware layer. To assign an IP or change the MTU, you must use `ip addr add` or `ip link set dev eth0 up`.

## Alternatives

- **`ip link`:** **Best for logical interface management.** It can show basic interface statistics and state (UP/DOWN), but it cannot alter hardware buffer sizes or offload features.
- **`lspci -vvv`:** **Best for identifying the exact physical hardware model.** While `ethtool` shows the driver, `lspci` queries the motherboard's PCIe bus to reveal the exact vendor and silicon model of the network card.

## How it works internally

`ethtool` is essentially a user-space wrapper around specific kernel `ioctl()` system calls, specifically utilizing the `SIOCETHTOOL` command code.

When you run `ethtool eth0`, the utility opens a raw socket. It populates an `ethtool_cmd` C structure with the target interface name (`eth0`) and issues the `ioctl` system call to the Linux networking stack.

The kernel intercepts this call and routes it directly to the specific hardware driver managing that interface (e.g., the Intel `ixgbe` driver). The driver translates the generic kernel request into proprietary, vendor-specific memory-mapped I/O (MMIO) reads or PCIe register queries against the actual physical network card silicon.

The hardware returns the negotiated link speed and electrical state from its internal PHY (Physical Layer Transceiver) chip. The driver packages this raw hexadecimal data back into the `ethtool_cmd` struct and returns it up the stack to `ethtool`, which parses the bitmasks and prints the human-readable text to the terminal.

## Performance Notes

- **Offload Impact:** Using `ethtool -K` to disable hardware offloading (TSO, GSO, Checksumming) drastically degrades system performance. It forces the server's CPU to mathematically calculate checksums and segment packets for every single byte of network traffic, causing severe CPU spikes and limiting maximum throughput to a fraction of the card's capability. Only disable offloads for explicit debugging purposes.

## Security Notes

- **Root Privileges:** Executing any `ethtool` command (even just reading the link state) requires `CAP_NET_ADMIN` capabilities, effectively limiting it to the `root` user. Unprivileged users cannot query hardware state.
- **Denial of Service:** Executing `ethtool -s eth0 speed 10 duplex half` on a production interface will instantly degrade connection throughput to a crawl and cause massive packet collisions, effectively orchestrating a self-inflicted Denial of Service attack on the server.

## Common Mistakes

- **Assuming configured speed overrides physical switch limits**
  - _Mistake:_ Using `ethtool -s eth0 speed 1000` on an interface plugged into an old 100Mbps physical switch port.
  - _Why:_ You cannot force a NIC to push 1000Mbps if the physical switch ASIC on the other end of the cable doesn't support it. The link will simply drop, and the interface will lose carrier signal completely until you revert the setting or re-enable auto-negotiation.
- **Failing to persist changes**
  - _Mistake:_ Running `ethtool -G eth0 rx 4096` to fix a production issue, and realizing the problem returned after a reboot.
  - _Why:_ `ethtool` changes are purely ephemeral memory modifications made to the running kernel driver. To persist them, you must add the commands to network initialization scripts (like `/etc/network/interfaces` `post-up` hooks, NetworkManager dispatcher scripts, or `systemd-networkd` `.link` files).

## Best Practices

- **Verify the Carrier Signal First:** Before tearing apart routing tables or checking firewall rules, run `ethtool eth0 | grep "Link detected"`. If it says `no`, the physical cable is unplugged, cut, or the switch port is administratively down. Software troubleshooting is useless until Layer 1 is restored.
- **Monitor SFP Light Levels:** In fiber-optic environments, use `ethtool -m eth0` to dump the EEPROM of the inserted optic. Check the "RX optical power" metric. If the dbm reading drops below the receiver's threshold, the fiber cable is dirty or bent, causing silent bit errors.

## Interview Questions

**Q: You notice the CPU usage on your web server is spiking heavily in "softirq" (software interrupt) processes, and network throughput is bottlenecking. Someone recently ran some `ethtool` commands. What hardware acceleration feature was likely turned off, and how do you verify it?**
**A:** The administrator likely disabled TCP Segmentation Offload (TSO) or Generic Segmentation Offload (GSO). These features allow the OS to hand massive 64KB data chunks to the network card, letting the NIC hardware slice them into 1500-byte MTU packets. With them disabled, the host CPU must slice the packets itself, causing the "softirq" spike. You verify this by running `ethtool -k <interface> | grep offload` and checking if TSO/GSO are marked as `off`.

**Q: Why does running `ethtool eth0` on an AWS EC2 instance often return a speed of `10000Mb/s` or `Unknown!` regardless of the instance size you purchased?**
**A:** AWS EC2 instances utilize hypervisor virtualization. The `eth0` interface seen by the guest OS is not a physical piece of hardware; it is a virtualized driver (like Elastic Network Adapter - ENA) communicating directly with the Nitro hypervisor over the system bus. Because there is no physical Ethernet cable or PHY chip to negotiate speed with, the virtual driver hardcodes dummy values to satisfy kernel APIs. The actual network bandwidth is enforced by AWS software traffic shaping outside the VM.

## Practice Problems

**Problem:** You are diagnosing a network driver bug and need to know exactly which kernel driver module and firmware version are currently loaded and managing the interface `eno1`.
**Hint:** Use the flag that specifically queries the driver information.
**Solution:**

```bash
ethtool -i eno1
```

**Problem:** Your monitoring system shows that `eth0` is dropping packets during sudden traffic bursts. You want to increase the hardware Receive (RX) ring buffer size to 2048 to allow the card to absorb the bursts. Write the command to alter this setting.
**Hint:** Use the "set ring" flag, specify the interface, the direction, and the new size.
**Solution:**

```bash
ethtool -G eth0 rx 2048
```

## References

- [ethtool(8) - Linux man page](https://linux.die.net/man/8/ethtool)
- [Linux kernel network offloading](https://www.kernel.org/doc/html/latest/networking/netdev-features.html)
