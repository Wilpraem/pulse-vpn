package expo.modules.pulsevpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.InetSocketAddress
import java.net.Socket

class PulseVpnBridgeModule : Module() {
  private var vpnPermissionPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("PulseVpnBridge")

    AsyncFunction("isAvailable") {
      true
    }

    AsyncFunction("prepare") { promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val prepareIntent = VpnService.prepare(context)
      if (prepareIntent == null) {
        promise.resolve()
        return@AsyncFunction
      }

      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "VPN permission requires a visible Activity.", null)
        return@AsyncFunction
      }

      vpnPermissionPromise?.reject("ERR_CANCELLED", "Another VPN permission request replaced this one.", null)
      vpnPermissionPromise = promise
      activity.startActivityForResult(prepareIntent, VPN_PERMISSION_REQUEST_CODE)
    }

    AsyncFunction("start") { options: Map<String, Any?> ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val config = options["singBoxConfig"] as? String
      if (config.isNullOrBlank()) {
        throw IllegalArgumentException("Missing singBoxConfig")
      }
      if (VpnService.prepare(context) != null) {
        throw IllegalStateException("VPN permission has not been granted.")
      }
      val intent = Intent(context, PulseVpnService::class.java)
        .setAction(PulseVpnService.ACTION_START)
        .putExtra(PulseVpnService.EXTRA_CONFIG, config)
      context.startForegroundService(intent)
    }

    AsyncFunction("stop") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      context.startService(
        Intent(context, PulseVpnService::class.java).setAction(PulseVpnService.ACTION_STOP),
      )
    }

    AsyncFunction("getStatus") {
      mapOf("status" to PulseVpnService.currentStatus)
    }

    AsyncFunction("tcpConnect") { host: String, port: Int, timeoutMs: Int ->
      tcpConnect(host, port, timeoutMs)
    }

    OnActivityResult { _: Activity, payload ->
      if (payload.requestCode != VPN_PERMISSION_REQUEST_CODE) {
        return@OnActivityResult
      }
      val promise = vpnPermissionPromise ?: return@OnActivityResult
      vpnPermissionPromise = null
      if (payload.resultCode == Activity.RESULT_OK) {
        promise.resolve()
      } else {
        promise.reject("ERR_VPN_PERMISSION_DENIED", "User denied Android VPN permission.", null)
      }
    }
  }

  private fun tcpConnect(host: String, port: Int, timeoutMs: Int): Int {
    val startedAt = SystemClock.elapsedRealtime()
    Socket().use { socket ->
      socket.tcpNoDelay = true
      socket.connect(InetSocketAddress(host, port), timeoutMs.coerceAtLeast(1))
    }
    return (SystemClock.elapsedRealtime() - startedAt).coerceAtLeast(1).toInt()
  }

  companion object {
    private const val VPN_PERMISSION_REQUEST_CODE = 7281
  }
}
