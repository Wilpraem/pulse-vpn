import Foundation
import NetworkExtension

#if canImport(Libbox)
import Libbox
#endif

final class SingBoxEngine {
  private weak var provider: NEPacketTunnelProvider?

  #if canImport(Libbox)
  private var commandServer: AnyObject?
  #endif

  init(provider: NEPacketTunnelProvider) {
    self.provider = provider
  }

  func start(configContent: String, completion: @escaping (Result<Void, Error>) -> Void) {
    #if canImport(Libbox)
    completion(.failure(SingBoxEngineError.platformInterfaceRequired))
    #else
    completion(.failure(SingBoxEngineError.libboxNotLinked))
    #endif
  }

  func stop() {
    #if canImport(Libbox)
    commandServer = nil
    #endif
  }
}

enum SingBoxEngineError: Error, LocalizedError {
  case libboxNotLinked
  case platformInterfaceRequired

  var errorDescription: String? {
    switch self {
    case .libboxNotLinked:
      return "Libbox.xcframework is not linked. Build or add sing-box libbox before starting the Packet Tunnel."
    case .platformInterfaceRequired:
      return "Libbox is linked, but PacketTunnel platform interface must be wired before production VPN traffic can start."
    }
  }
}
