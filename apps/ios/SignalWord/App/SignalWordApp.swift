import SwiftUI

@main
struct SignalWordApp: App {
    @State private var model = AppShellModel.live()

    var body: some Scene {
        WindowGroup {
            SignalWordRootView(model: model)
                .tint(SignalWordColor.action)
        }
    }
}
