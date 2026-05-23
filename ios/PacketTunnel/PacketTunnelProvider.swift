import Foundation
import NetworkExtension

final class PacketTunnelProvider: NEPacketTunnelProvider {
  private var engine: SingBoxEngine?

  override func startTunnel(
    options: [String: NSObject]?,
    completionHandler: @escaping (Error?) -> Void
  ) {
    let providerProtocol = protocolConfiguration as? NETunnelProviderProtocol
    let providerConfig = providerProtocol?.providerConfiguration
    let configContent = options?["configContent"] as? String
      ?? providerConfig?["configContent"] as? String

    guard let configContent, !configContent.isEmpty else {
      completionHandler(PacketTunnelError.missingConfig)
      return
    }

    let engine = SingBoxEngine(provider: self)
    self.engine = engine
    engine.start(configContent: configContent) { result in
      switch result {
      case .success:
        completionHandler(nil)
      case let .failure(error):
        completionHandler(error)
      }
    }
  }

  override func stopTunnel(
    with reason: NEProviderStopReason,
    completionHandler: @escaping () -> Void
  ) {
    engine?.stop()
    engine = nil
    completionHandler()
  }

  override func handleAppMessage(
    _ messageData: Data,
    completionHandler: ((Data?) -> Void)?
  ) {
    completionHandler?("ok".data(using: .utf8))
  }
}

enum PacketTunnelError: Error, LocalizedError {
  case missingConfig

  var errorDescription: String? {
    switch self {
    case .missingConfig:
      return "Missing sing-box configContent for Packet Tunnel."
    }
  }
}
