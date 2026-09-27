import SwiftUI

@main
struct SignalWordApp: App {
    @State private var model: AppShellModel = {
        #if DEBUG && targetEnvironment(simulator)
        if let testModel = UITestComposition.makeModel() { return testModel }
        #endif
        return AppShellModel.live()
    }()

    var body: some Scene {
        WindowGroup {
            SignalWordRootView(model: model)
                .tint(SignalWordColor.action)
                .preferredColorScheme(.dark)
        }
    }
}
