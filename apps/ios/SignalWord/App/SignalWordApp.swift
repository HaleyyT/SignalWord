#if canImport(SwiftUI)
import SwiftUI

@main
struct SignalWordApp: App {
    var body: some Scene {
        WindowGroup {
            ContentUnavailableView(
                "SignalWord setup required",
                systemImage: "exclamationmark.shield",
                description: Text("Complete trusted-contact setup before relying on this action.")
            )
        }
    }
}
#endif
