# Pulse VPN

React Native + Expo bare/dev-client VPN-клиент для списков подписок VLESS. Приложение загружает удаленный список, парсит ссылки `vless://`, опрашивает хосты, ранжирует кандидатов и запускает нативный VPN-мост.

Подписка по умолчанию:

```text
https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt
```

## Текущий статус сборки

- Локальная сборка Android APK в режиме release проходит успешно: `dist/android/app-release.apk`.
- Сборка для симулятора iOS проходит успешно.
- Файл iOS IPA не был создан на этом компьютере, так как в Связке ключей Xcode есть сертификат подписи, но нет вошедшего в систему аккаунта Apple или профилей подготовки (provisioning profiles) для `com.pulsevpn.app` и `com.pulsevpn.app.PacketTunnel`.
- Реальный трафик VPN требует сборки sing-box/libbox. Android-мост настроен на вызов `io.nekohasekai.libbox` через `VpnService`, когда добавлен файл `libbox.aar`. Таргет iOS Packet Tunnel присутствует, но `Libbox.xcframework` еще предстоит подключить и завершить реализацию интерфейса платформы.

Приложение не имитирует подключенный туннель: отсутствие ядра/ошибки подписи приводят к явным нативным ошибкам.

## Требования

- Node.js 20+ и npm.
- Xcode с поддержкой симулятора/устройств iOS.
- CocoaPods.
- Android SDK.
- JDK 17. На этой машине используется: `/opt/homebrew/opt/openjdk@17`.
- Необязательно для сборки реального ядра: Go, gomobile, Android NDK и инструменты сборки sing-box/libbox.

## Установка

```bash
npm ci
cd ios && pod install && cd ..
```

## Запуск

```bash
npm run start
npm run android
npm run ios
```

Expo Go не поддерживается, так как приложение использует нативные модули VPN.

## Сборка Android APK

```bash
npm run build:android:apk
```

Результат:

```text
dist/android/app-release.apk
```

Для реальной маршрутизации VLESS в Android добавьте официальный `libbox.aar` от sing-box в classpath Android-приложения, чтобы класс `io.nekohasekai.libbox.*` был доступен во время выполнения. Без него APK установится, разрешение на VPN и сервис будут присутствовать, но туннель не сможет маршрутизировать трафик.

## Сборка iOS IPA

1. Откройте Xcode и войдите в систему в Settings -> Accounts.
2. Создайте явные App ID для:
   - `com.pulsevpn.app`
   - `com.pulsevpn.app.PacketTunnel`
3. Включите Network Extensions / Packet Tunnel Provider и App Groups для обоих таргетов.
4. Установите одну и ту же команду (team) для `PulseVPN` и `PacketTunnel`.
5. Запустите:

```bash
APPLE_TEAM_ID=<ВАШ_TEAM_ID> npm run build:ios:ipa
```

Результат при успешной подписи:

```text
dist/ios/App.ipa
```

Бесплатные аккаунты Apple обычно не могут создавать/распространять универсальные IPA с NetworkExtension. В этом случае используйте Xcode для запуска напрямую на подключенном iPhone с автоматической подписью.

## Настройка URL-адреса подписки

Измените его в настройках приложения во время выполнения или отредактируйте:

```text
src/utils/constants.ts
app.config.ts
```

Приложение кеширует последний успешно загруженный список и использует его в качестве резервного, если удаленный URL недоступен.

## Диагностика

- `npm run test`: тесты парсера и ранжирования.
- `npm run typecheck`: проверка типов TypeScript.
- `npm run lint`: ESLint.
- Логи Android: `adb logcat | grep PulseVpn`.
- Логи iOS: консоль Xcode Devices and Simulators, фильтр по `PacketTunnel` или `PulseVpnBridge`.

## Конфиденциальность и безопасность

- UUID VLESS и полные URL-адреса не отображаются в обычных логах интерфейса.
- Приложение обращается к настроенному URL подписки и выбранному серверу VPN.
- `ipapi.co` используется только после попытки подключения для отображения метаданных внешнего IP.
- Настройки и кешированные публичные данные подписки хранятся в локальном хранилище приложения. Перенесите приватные платные конфигурации в Keychain/Keystore перед использованием в продакшене.

## GitHub

```bash
git remote add origin <MY_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```

## Устранение неполадок

- `PulseVpnBridge is unavailable`: используйте нативную сборку или dev-клиент, а не Expo Go.
- `ClassNotFoundException: io.nekohasekai.libbox.Libbox`: добавьте `libbox.aar`.
- `Libbox.xcframework is not linked`: соберите/подключите sing-box libbox для iOS.
- iOS `No Account for Team`: войдите в Xcode Accounts и создайте профили подготовки.
- Диалоговое окно VPN не появляется: проверьте манифест `VpnService` в Android или entitlements NetworkExtension в iOS.
- Список пуст/сломан: парсер сохраняет ошибки сборки, и интерфейс должен оставаться работоспособным даже при отсутствии рабочих серверов.
