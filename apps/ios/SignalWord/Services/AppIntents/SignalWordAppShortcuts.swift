#if canImport(AppIntents)
import AppIntents

@available(iOS 18.0, *)
struct SignalWordAppShortcuts: AppShortcutsProvider {
    static let shortcutTileColor: ShortcutTileColor = .red

    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TriggerAlertIntent(),
            phrases: [
                "Trigger alert in \(.applicationName)",
                "Send my alert with \(.applicationName)",
            ],
            shortTitle: "Trigger Alert",
            systemImageName: "exclamationmark.shield"
        )
    }
}
#endif
