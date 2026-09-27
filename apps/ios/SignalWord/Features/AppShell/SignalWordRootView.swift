import SwiftUI
import Observation

private enum SignalTab: Hashable {
    case home, people, settings

    var title: String {
        switch self {
        case .home: "Home"
        case .people: "People"
        case .settings: "Settings"
        }
    }

    var symbol: String {
        switch self {
        case .home: "house.fill"
        case .people: "person.2.fill"
        case .settings: "slider.horizontal.3"
        }
    }
}

struct SignalWordRootView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var network: ContactNetworkModel = {
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            return ContactNetworkModel(api: ProcessInfo.processInfo.arguments.contains("--network-ui-testing") ? UITestNetworkService() : nil)
        }
        #endif
        return ContactNetworkModel(api: AppCompositionRoot.lifecycleAPI)
    }()
    @State private var timer: CheckInModel = {
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            return CheckInModel(api: ProcessInfo.processInfo.arguments.contains("--timer-ui-testing") ? UITestCheckInService() : nil,
                preferences: UserDefaults(suiteName: "SignalWord.UIJourney")!, remindersEnabled: false)
        }
        #endif
        return CheckInModel(api: AppCompositionRoot.lifecycleAPI)
    }()
    @Bindable var model: AppShellModel
    @State private var selectedTab: SignalTab = .home
    @State private var showDeleteConfirmation = false
    @State private var showContactEditor = false

    var body: some View {
        Group {
            if model.hasEnteredDashboard {
                mainTabs
            } else {
                SignalWordSetupFlow(model: model)
            }
        }
        .environment(network)
        .environment(timer)
        .onChange(of: timer.snapshot?.incidentId) { _, incident in
            if incident != nil { Task { await model.recover() } }
        }
        .onChange(of: model.hasEnteredDashboard) { _, entered in if !entered { network.clear(); timer.clear() } }
        .tint(SignalWordColor.action)
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showContactEditor, onDismiss: { model.cancelContactEdit() }) {
            ContactEditorSheet(model: model)
        }
        .task { await model.recover() }
        .task(id: scenePhase) {
            guard scenePhase == .active else { return }
            while !Task.isCancelled {
                await model.recover()
                if model.identityReady {
                    await network.refresh(eventID: model.currentAlertEventID)
                    await timer.refresh()
                }
                do { try await Task.sleep(for: .seconds(10)) } catch { return }
            }
        }
        .confirmationDialog(
            "Delete all SignalWord data?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete account and data", role: .destructive) {
                Task { await model.deleteAccount() }
            }
            .accessibilityIdentifier("account.confirmDeletion")
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This revokes alert links, removes your contact and alerts, deletes the identity, and clears this device session. This cannot be undone.")
        }
    }

    private var mainTabs: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeScreen(
                    model: model,
                    openPeople: { selectedTab = .people },
                    openSettings: { selectedTab = .settings },
                    openRehearsal: { selectedTab = .people }
                )
            }
            .tabItem { Label(SignalTab.home.title, systemImage: SignalTab.home.symbol) }
            .tag(SignalTab.home)

            NavigationStack {
                PeopleScreen(model: model, editContact: showContactEditorFlow)
            }
            .tabItem { Label(SignalTab.people.title, systemImage: SignalTab.people.symbol) }
            .tag(SignalTab.people)

            NavigationStack {
                SettingsScreen(
                    model: model,
                    openPeople: { selectedTab = .people },
                    openDeleteConfirmation: { showDeleteConfirmation = true }
                )
            }
            .tabItem { Label(SignalTab.settings.title, systemImage: SignalTab.settings.symbol) }
            .tag(SignalTab.settings)
        }
        .background(SignalWordColor.canvas.ignoresSafeArea())
        .toolbarBackground(SignalWordColor.canvas, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
    }

    private func showContactEditorFlow() {
        model.editContact()
        showContactEditor = true
    }
}
