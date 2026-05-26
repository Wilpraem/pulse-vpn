package expo.modules.pulsevpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.ProxyInfo
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.File
import java.lang.reflect.InvocationHandler
import java.lang.reflect.Method
import java.lang.reflect.Proxy

class PulseVpnService : VpnService() {
  private var tunDescriptor: ParcelFileDescriptor? = null
  private var commandServer: Any? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        val config = intent.getStringExtra(EXTRA_CONFIG).orEmpty()
        startForeground(NOTIFICATION_ID, buildNotification("Connecting"))
        startCore(config)
      }
      ACTION_STOP -> stopCore()
    }
    return Service.START_STICKY
  }

  override fun onDestroy() {
    stopCore()
    super.onDestroy()
  }

  override fun onRevoke() {
    stopCore()
    super.onRevoke()
  }

  private fun startCore(config: String) {
    try {
      if (config.isBlank()) error("Missing sing-box config.")
      if (prepare(this) != null) error("Android VPN permission is missing.")
      val bridge = LibboxReflectionBridge(this)
      bridge.setup()
      commandServer = bridge.start(config)
      currentStatus = "connected"
      startForeground(NOTIFICATION_ID, buildNotification("Connected"))
    } catch (error: Throwable) {
      currentStatus = "error"
      Log.e(TAG, "Failed to start VPN", error)
      stopSelf()
    }
  }

  private fun stopCore() {
    currentStatus = "disconnecting"
    runCatching {
      commandServer?.call("close")
    }
    commandServer = null
    runCatching {
      tunDescriptor?.close()
    }
    tunDescriptor = null
    currentStatus = "disconnected"
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  internal fun openTun(options: Any): Int {
    if (prepare(this) != null) error("android: missing vpn permission")

    val builder = Builder()
      .setSession("Pulse VPN")
      .setMtu(options.intValue("getMTU", "getMtu", "mtu") ?: 9000)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      builder.setMetered(false)
    }

    options.iterator("getInet4Address", "inet4Address")?.forEachRemaining { prefix ->
      builder.addAddress(prefix.stringValue("address")!!, prefix.intValue("prefix")!!)
    }
    options.iterator("getInet6Address", "inet6Address")?.forEachRemaining { prefix ->
      builder.addAddress(prefix.stringValue("address")!!, prefix.intValue("prefix")!!)
    }

    val dnsMode = options.call("getDNSMode") ?: options.call("dnsMode")
    if (dnsMode?.longValue("getValue", "value") != DNS_MODE_DISABLED) {
      options.iterator("getDNSServerAddress", "dnsServerAddress")?.forEachRemaining { dns ->
        builder.addDnsServer(dns.toString())
      }
    }

    addRoutes(builder, options)

    if (options.booleanValue("isHTTPProxyEnabled", "isHttpProxyEnabled") == true && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val host = options.stringValue("getHTTPProxyServer", "httpProxyServer")
      val port = options.intValue("getHTTPProxyServerPort", "httpProxyServerPort")
      if (!host.isNullOrBlank() && port != null) {
        builder.setHttpProxy(ProxyInfo.buildDirectProxy(host, port))
      }
    }

    val descriptor = builder.establish() ?: error("android: VPN builder returned null descriptor")
    tunDescriptor = descriptor
    return descriptor.fd
  }

  private fun addRoutes(builder: Builder, options: Any) {
    var hasRoute = false
    options.iterator("getInet4RouteAddress", "inet4RouteAddress", "inet4RouteRange")?.forEachRemaining { prefix ->
      hasRoute = true
      builder.addRoute(prefix.stringValue("address")!!, prefix.intValue("prefix")!!)
    }
    options.iterator("getInet6RouteAddress", "inet6RouteAddress", "inet6RouteRange")?.forEachRemaining { prefix ->
      hasRoute = true
      builder.addRoute(prefix.stringValue("address")!!, prefix.intValue("prefix")!!)
    }
    if (!hasRoute) {
      builder.addRoute("0.0.0.0", 0)
      builder.addRoute("::", 0)
    }
  }

  private fun buildNotification(status: String): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Pulse VPN", NotificationManager.IMPORTANCE_LOW),
      )
    }
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    return builder
      .setContentTitle("Pulse VPN")
      .setContentText(status)
      .setSmallIcon(applicationInfo.icon)
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .build()
  }

  companion object {
    const val ACTION_START = "com.pulsevpn.START"
    const val ACTION_STOP = "com.pulsevpn.STOP"
    const val EXTRA_CONFIG = "config"
    private const val TAG = "PulseVpnService"
    private const val CHANNEL_ID = "pulsevpn.vpn"
    private const val NOTIFICATION_ID = 42
    private const val DNS_MODE_DISABLED = 0L

    @Volatile
    var currentStatus: String = "disconnected"
  }
}

private class LibboxReflectionBridge(private val service: PulseVpnService) {
  private val libbox = Class.forName("io.nekohasekai.libbox.Libbox")
  private val commandServerClass = Class.forName("io.nekohasekai.libbox.CommandServer")
  private val commandServerHandlerClass = Class.forName("io.nekohasekai.libbox.CommandServerHandler")
  private val platformInterfaceClass = Class.forName("io.nekohasekai.libbox.PlatformInterface")
  private val setupOptionsClass = Class.forName("io.nekohasekai.libbox.SetupOptions")
  private val overrideOptionsClass = Class.forName("io.nekohasekai.libbox.OverrideOptions")

  fun setup() {
    val baseDir = service.filesDir.apply { mkdirs() }
    val workingDir = service.getExternalFilesDir(null) ?: baseDir
    val tempDir = service.cacheDir.apply { mkdirs() }
    val options = setupOptionsClass.getDeclaredConstructor().newInstance()
    options.set("basePath", baseDir.path)
    options.set("workingPath", workingDir.path)
    options.set("tempPath", tempDir.path)
    options.set("logMaxLines", 3000)
    libbox.methods.first { it.name == "setup" && it.parameterTypes.size == 1 }.invoke(null, options)
  }

  fun start(config: String): Any {
    val platform = Proxy.newProxyInstance(
      platformInterfaceClass.classLoader,
      arrayOf(platformInterfaceClass),
      PlatformInvocationHandler(service),
    )
    val handler = Proxy.newProxyInstance(
      commandServerHandlerClass.classLoader,
      arrayOf(commandServerHandlerClass),
      CommandServerHandler(),
    )
    val commandServer = commandServerClass
      .constructors
      .first { it.parameterTypes.size == 2 }
      .newInstance(handler, platform)
    commandServer.call("start")
    val overrideOptions = overrideOptionsClass.getDeclaredConstructor().newInstance()
    commandServer.call("startOrReloadService", config, overrideOptions)
    return commandServer
  }
}

private class PlatformInvocationHandler(private val service: PulseVpnService) : InvocationHandler {
  override fun invoke(proxy: Any, method: Method, args: Array<out Any?>?): Any? {
    return when (method.name) {
      "openTun" -> service.openTun(args?.firstOrNull() ?: error("Missing TunOptions"))
      "autoDetectInterfaceControl", "autoDetectControl" -> service.protect((args?.firstOrNull() as Number).toInt())
      "usePlatformAutoDetectControl", "useProcFS" -> false
      "writeLog" -> {
        Log.d("PulseVpnLibbox", args?.firstOrNull()?.toString().orEmpty())
        null
      }
      "sendNotification", "startDefaultInterfaceMonitor", "closeDefaultInterfaceMonitor",
      "startNeighborMonitor", "closeNeighborMonitor" -> null
      "getInterfaces", "systemCertificates" -> EmptyIteratorProxy.create(method.returnType)
      "findConnectionOwner" -> method.returnType.getDeclaredConstructor().newInstance()
      "readWIFIState", "localDNSTransport", "getSystemProxyStatus" -> null
      "equals" -> proxy === args?.firstOrNull()
      "hashCode" -> System.identityHashCode(proxy)
      "toString" -> "PulseVpnPlatformInterface"
      else -> defaultValue(method.returnType)
    }
  }
}

private class CommandServerHandler : InvocationHandler {
  override fun invoke(proxy: Any, method: Method, args: Array<out Any?>?): Any? {
    return when (method.name) {
      "serviceStop", "serviceReload", "postServiceClose" -> null
      "equals" -> proxy === args?.firstOrNull()
      "hashCode" -> System.identityHashCode(proxy)
      "toString" -> "PulseVpnCommandServerHandler"
      else -> defaultValue(method.returnType)
    }
  }
}

private object EmptyIteratorProxy {
  fun create(type: Class<*>): Any? {
    if (!type.isInterface) return null
    return Proxy.newProxyInstance(type.classLoader, arrayOf(type)) { proxy, method, args ->
      when (method.name) {
        "hasNext" -> false
        "next" -> null
        "equals" -> proxy === args?.firstOrNull()
        "hashCode" -> System.identityHashCode(proxy)
        "toString" -> "EmptyIterator"
        else -> defaultValue(method.returnType)
      }
    }
  }
}

private fun defaultValue(type: Class<*>): Any? = when (type) {
  java.lang.Boolean.TYPE -> false
  java.lang.Byte.TYPE -> 0.toByte()
  java.lang.Short.TYPE -> 0.toShort()
  java.lang.Integer.TYPE -> 0
  java.lang.Long.TYPE -> 0L
  java.lang.Float.TYPE -> 0f
  java.lang.Double.TYPE -> 0.0
  java.lang.Character.TYPE -> 0.toChar()
  java.lang.Void.TYPE -> null
  else -> null
}

private fun Any.call(name: String, vararg args: Any?): Any? {
  val method = javaClass.methods.firstOrNull { it.name == name && it.parameterTypes.size == args.size }
    ?: return null
  return method.invoke(this, *args)
}

private fun Any.set(name: String, value: Any) {
  val setter = "set" + name.replaceFirstChar { it.uppercase() }
  javaClass.methods.firstOrNull { it.name == setter && it.parameterTypes.size == 1 }?.invoke(this, value)
    ?: runCatching { javaClass.getField(name).set(this, value) }.getOrThrow()
}

private fun Any.stringValue(vararg names: String): String? {
  for (name in names) {
    val value = call(name) ?: runCatching { javaClass.getField(name).get(this) }.getOrNull()
    if (value != null) return value.toString()
  }
  return null
}

private fun Any.intValue(vararg names: String): Int? = longValue(*names)?.toInt()

private fun Any.longValue(vararg names: String): Long? {
  for (name in names) {
    val value = call(name) ?: runCatching { javaClass.getField(name).get(this) }.getOrNull()
    if (value is Number) return value.toLong()
  }
  return null
}

private fun Any.booleanValue(vararg names: String): Boolean? {
  for (name in names) {
    val value = call(name) ?: runCatching { javaClass.getField(name).get(this) }.getOrNull()
    if (value is Boolean) return value
  }
  return null
}

private fun Any.iterator(vararg names: String): LibboxIterator? {
  for (name in names) {
    val value = call(name) ?: runCatching { javaClass.getField(name).get(this) }.getOrNull()
    if (value != null) return LibboxIterator(value)
  }
  return null
}

private class LibboxIterator(private val iterator: Any) {
  fun forEachRemaining(block: (Any) -> Unit) {
    while (iterator.call("hasNext") == true) {
      val next = iterator.call("next") ?: break
      block(next)
    }
  }
}
