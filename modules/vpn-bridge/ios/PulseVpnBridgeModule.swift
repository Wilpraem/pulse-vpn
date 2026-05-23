import ExpoModulesCore
import Foundation
import Network
import NetworkExtension

private let packetTunnelBundleIdentifier = "com.pulsevpn.app.PacketTunnel"

public class PulseVpnBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PulseVpnBridge")

    AsyncFunction("isAvailable") { () -> Bool in
      return true
    }

    AsyncFunction("prepare") { () async throws in
      let manager = try await TunnelManagerStore.loadOrCreateManager()
      manager.localizedDescription = "Pulse VPN"
      manager.isEnabled = true
      try await TunnelManagerStore.save(manager)
    }

    AsyncFunction("start") { (options: [String: Any]) async throws in
      guard let configContent = options["singBoxConfig"] as? String, !configContent.isEmpty else {
        throw PulseVpnError.invalidOptions("Missing singBoxConfig")
      }

      let server = options["server"] as? [String: Any]
      let serverAddress = server?["host"] as? String ?? "Pulse VPN"
      let appGroupIdentifier = options["appGroupIdentifier"] as? String ?? "group.com.pulsevpn.shared"

      let providerProtocol = NETunnelProviderProtocol()
      providerProtocol.providerBundleIdentifier = packetTunnelBundleIdentifier
      providerProtocol.serverAddress = serverAddress
      providerProtocol.providerConfiguration = [
        "configContent": configContent,
        "appGroupIdentifier": appGroupIdentifier,
        "server": server ?? [:],
      ]
      providerProtocol.disconnectOnSleep = false

      let manager = try await TunnelManagerStore.loadOrCreateManager()
      manager.localizedDescription = "Pulse VPN"
      manager.protocolConfiguration = providerProtocol
      manager.isEnabled = true
      try await TunnelManagerStore.save(manager)
      try await TunnelManagerStore.load(manager)

      do {
        try manager.connection.startVPNTunnel(options: ["configContent": configContent as NSString])
      } catch {
        throw PulseVpnError.startFailed(error.localizedDescription)
      }
    }

    AsyncFunction("stop") { () async throws in
      let manager = try await TunnelManagerStore.loadOrCreateManager()
      manager.connection.stopVPNTunnel()
    }

    AsyncFunction("getStatus") { () async throws -> [String: String] in
      let manager = try await TunnelManagerStore.loadOrCreateManager()
      return ["status": mapStatus(manager.connection.status)]
    }

    AsyncFunction("tcpConnect") { (host: String, port: Int, timeoutMs: Int) async throws -> Double in
      return try await TcpProbe.connect(host: host, port: port, timeoutMs: timeoutMs)
    }
  }
}

private enum PulseVpnError: Error, LocalizedError {
  case invalidOptions(String)
  case startFailed(String)

  var errorDescription: String? {
    switch self {
    case let .invalidOptions(message):
      return message
    case let .startFailed(message):
      return "Failed to start VPN tunnel: \(message)"
    }
  }
}

private enum TunnelManagerStore {
  static func loadOrCreateManager() async throws -> NETunnelProviderManager {
    let managers = try await loadAllManagers()
    if let existing = managers.first(where: { manager in
      (manager.protocolConfiguration as? NETunnelProviderProtocol)?.providerBundleIdentifier == packetTunnelBundleIdentifier
    }) {
      return existing
    }

    return NETunnelProviderManager()
  }

  static func loadAllManagers() async throws -> [NETunnelProviderManager] {
    try await withCheckedThrowingContinuation { continuation in
      NETunnelProviderManager.loadAllFromPreferences { managers, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: managers ?? [])
      }
    }
  }

  static func save(_ manager: NETunnelProviderManager) async throws {
    try await withCheckedThrowingContinuation { continuation in
      manager.saveToPreferences { error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: ())
      }
    }
  }

  static func load(_ manager: NETunnelProviderManager) async throws {
    try await withCheckedThrowingContinuation { continuation in
      manager.loadFromPreferences { error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: ())
      }
    }
  }
}

private func mapStatus(_ status: NEVPNStatus) -> String {
  switch status {
  case .invalid, .disconnected:
    return "disconnected"
  case .connecting, .reasserting:
    return "connecting"
  case .connected:
    return "connected"
  case .disconnecting:
    return "disconnecting"
  @unknown default:
    return "error"
  }
}

private enum TcpProbe {
  static func connect(host: String, port: Int, timeoutMs: Int) async throws -> Double {
    guard let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
      throw PulseVpnError.invalidOptions("Invalid TCP probe port")
    }

    return try await withCheckedThrowingContinuation { continuation in
      let connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: .tcp)
      let queue = DispatchQueue(label: "PulseVpnTcpProbe")
      let startedAt = DispatchTime.now()
      let lock = NSLock()
      var didResume = false

      func resumeOnce(_ result: Result<Double, Error>) {
        lock.lock()
        defer { lock.unlock() }
        guard !didResume else { return }
        didResume = true
        connection.cancel()
        switch result {
        case let .success(value):
          continuation.resume(returning: value)
        case let .failure(error):
          continuation.resume(throwing: error)
        }
      }

      queue.asyncAfter(deadline: .now() + .milliseconds(max(1, timeoutMs))) {
        resumeOnce(.failure(PulseVpnError.startFailed("TCP probe timeout")))
      }

      connection.stateUpdateHandler = { state in
        switch state {
        case .ready:
          let elapsed = DispatchTime.now().uptimeNanoseconds - startedAt.uptimeNanoseconds
          resumeOnce(.success(Double(elapsed) / 1_000_000.0))
        case let .failed(error):
          resumeOnce(.failure(error))
        case .cancelled:
          break
        default:
          break
        }
      }

      connection.start(queue: queue)
    }
  }
}
