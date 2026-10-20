import SwiftUI
import Observation

struct PeopleScreen: View {
    @Environment(\.dynamicTypeSize) private var textSize
    @Bindable var model: AppShellModel
    let editContact: () -> Void
    @State private var showWithdrawalConfirmation = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                PageHeading(
                    eyebrow: "YOUR CIRCLE",
                    title: "People",
                    detail: "Choose who receives your alerts. Share a private link. Each person enters and verifies their own email before you approve them."
                )
                if !model.canEditContact {
                    InlineMessage("Your saved contact is unavailable until account loading succeeds. Retry before making changes.", kind: .attention)
                    SecondaryButton(title: model.requiresSessionRecovery ? "Sign in again" : "Retry account loading", symbol: "arrow.clockwise") {
                        Task { if model.requiresSessionRecovery { await model.signInAgain() } else { await model.recover() } }
                    }
                } else if model.hasContactDraft && model.contactStatus != "disabled" {
                    recipientCard
                    if model.contactStatus != "confirmed" {
                        SecondaryButton(title: "Check confirmation", symbol: "arrow.clockwise") {
                            Task { await model.refreshContact() }
                        }
                    }
                    if model.contactStatus == "confirmed" {
                        testPanel
                    } else {
                        InlineMessage("TEST and REAL alerts stay unavailable until the person confirms their email.", kind: .attention)
                    }
                    if model.currentAlertPresentation != nil { AlertProgressCard(model: model) }
                    Button("Withdraw this contact", role: .destructive) { showWithdrawalConfirmation = true }
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 48)
                    .accessibilityIdentifier("people.withdraw")
                } else {
                    SignalWordCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Image(systemName: "person.2.wave.2")
                                .font(.system(size: 28, weight: .regular))
                                .foregroundStyle(SignalWordColor.action)
                                .accessibilityHidden(true)
                            Text("No trusted person yet").font(.headline)
                            Text("Add someone you trust so SignalWord knows who can receive an alert.")
                                .font(.subheadline)
                                .foregroundStyle(SignalWordColor.secondaryText)
                            PrimaryButton(title: "Add trusted person", symbol: "plus", action: editContact)
                        }
                    }
                }
                ContactEnrollmentPanel(model: model)
                ContactNetworkPanel()
                if let message = model.contactMessage { InlineMessage(message, kind: .attention) }
                if let message = model.accountMessage { InlineMessage(message, kind: .attention) }
                Text("TEST messages are labelled TEST. Acknowledgement does not identify the reader or mean help is coming.")
                    .font(.caption)
                    .foregroundStyle(SignalWordColor.mutedText)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("people.footer")
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, SignalWordSpacing.page)
            .padding(.top, 18)
            .padding(.bottom, 32)
            .frame(maxWidth: .infinity)
        }
        .background(SignalWordBackground())
        .toolbar(.hidden, for: .navigationBar)
        .confirmationDialog("Withdraw this person’s consent?", isPresented: $showWithdrawalConfirmation, titleVisibility: .visible) {
            Button("Withdraw consent", role: .destructive) { Task { await model.withdrawContact() } }
            Button("Keep contact", role: .cancel) {}
        } message: {
            Text("This stops future alerts and unclaimed sends. Messages already submitted to an email provider cannot be recalled.")
        }
    }

    private var recipientCard: some View {
        SignalWordCard {
            Group {
                if textSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack { recipientAvatar; Spacer(); recipientBadge }
                        recipientIdentity
                    }
                } else {
                    HStack(spacing: 14) {
                        recipientAvatar
                        recipientIdentity
                        Spacer(minLength: 0)
                        recipientBadge
                    }
                }
            }
            .accessibilityElement(children: .combine)
        }
    }

    private var recipientAvatar: some View {
        Text(initials)
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(SignalWordColor.link)
            .frame(width: 52, height: 52)
            .background(SignalWordColor.action.opacity(0.14), in: Circle())
            .accessibilityHidden(true)
    }

    private var recipientBadge: some View {
        Image(systemName: model.contactStatus == "confirmed" ? "checkmark.shield.fill" : "envelope.badge")
            .font(.system(size: 22))
            .foregroundStyle(statusColor)
            .accessibilityHidden(true)
    }

    private var recipientIdentity: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(model.contactName.isEmpty ? "Trusted person" : model.contactName)
                .font(.headline)
                .fixedSize(horizontal: false, vertical: true)
            Label(statusLabel, systemImage: model.contactStatus == "confirmed" ? "checkmark.circle" : "clock")
                .font(.caption.weight(.medium))
                .foregroundStyle(SignalWordColor.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var testPanel: some View {
        SignalWordCard {
            VStack(alignment: .leading, spacing: 12) {
                Text("TEST — NO EMERGENCY")
                    .font(.caption.weight(.bold))
                    .tracking(0.7)
                    .foregroundStyle(SignalWordColor.action)
                Text("Send a clearly labelled rehearsal message to see what your person receives.")
                    .font(.subheadline)
                    .foregroundStyle(SignalWordColor.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
                PrimaryButton(title: "Send TEST alert", symbol: "paperplane") {
                    Task { await model.runRehearsal() }
                }
                .disabled(!model.canStartNewRealAlert)
                if !model.canStartNewRealAlert {
                    Text("Review or resolve the current alert on Home before starting another TEST.")
                        .font(.caption)
                        .foregroundStyle(SignalWordColor.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text("\(model.acknowledgedTestCount) of 2 distinct TEST alerts acknowledged")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(SignalWordColor.primaryText)
                if model.acknowledgedTestEvents.isEmpty {
                    Text("Acknowledged TEST messages will appear here as separate rehearsal evidence.")
                        .font(.caption)
                        .foregroundStyle(SignalWordColor.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    VStack(spacing: 0) {
                        ForEach(model.acknowledgedTestEvents, id: \.eventID) { event in
                            Button { model.selectAlert(event) } label: {
                                HStack(spacing: 10) {
                                    Image(systemName: "checkmark.message.fill")
                                        .foregroundStyle(SignalWordColor.ready)
                                        .accessibilityHidden(true)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text("TEST alert acknowledged")
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(SignalWordColor.primaryText)
                                        Text(event.triggeredAt.formatted(date: .abbreviated, time: .shortened))
                                            .font(.caption)
                                            .foregroundStyle(SignalWordColor.secondaryText)
                                    }
                                    Spacer(minLength: 0)
                                    Image(systemName: "chevron.right")
                                        .font(.caption2.weight(.bold))
                                        .foregroundStyle(SignalWordColor.mutedText)
                                        .accessibilityHidden(true)
                                }
                                .frame(minHeight: 48)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("test.evidence.\(event.eventID.uuidString)")
                        }
                    }
                }
                if model.canReportLockedTestForCurrentEvent {
                    SecondaryButton(title: "I used the locked TEST shortcut", symbol: "lock.iphone") {
                        model.recordLockedTestReport()
                    }
                }
                Text("Locked TEST use is a separate user report. SignalWord cannot inspect how iOS triggered an alert.")
                    .font(.caption)
                    .foregroundStyle(SignalWordColor.mutedText)
            }
        }
    }

    private var initials: String {
        model.contactName.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined().uppercased().ifEmpty("SW")
    }

    private var statusLabel: String {
        switch model.contactStatus {
        case "confirmed": "Email confirmed"
        case "pending": "Waiting for email confirmation"
        case "disabled": "Consent withdrawn"
        default: "Confirmation needed"
        }
    }

    private var statusColor: Color {
        model.contactStatus == "confirmed" ? SignalWordColor.ready : SignalWordColor.attention
    }
}

struct ContactEditorSheet: View {
    @Bindable var model: AppShellModel
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                ContactEnrollmentPanel(model: model)
                    .padding(SignalWordSpacing.page)
            }
            .background(SignalWordBackground())
            .navigationTitle("Private invitation")
            .toolbar { Button("Done") { dismiss() } }
        }
        .presentationDetents([.large])
    }
}

struct ContactEnrollmentPanel: View {
    @Bindable var model: AppShellModel
    @Environment(ContactEnrollmentModel.self) private var enrollment
    @Environment(ContactNetworkModel.self) private var network
    @State private var selected: ContactCandidate?
    @State private var label = "Trusted person"
    @State private var confirmed = false
    @State private var closing: ContactInvitation?

    var body: some View {
        SignalWordCard {
            VStack(alignment: .leading, spacing: 16) {
                Text("Invite someone privately").font(.headline)
                Text("Share the link yourself with one person you trust. SignalWord does not ask you for their email or send an invitation email. They enter their own email, consent and verify it, then you approve the request.")
                    .font(.subheadline).fixedSize(horizontal: false, vertical: true)
                TextField("Your name", text: $model.displayName).textContentType(.name)
                Text("Your name is shown on new invitations so your person recognises you.").font(.caption)
                if let url = enrollment.shareURL {
                    ShareLink(item: url) { Label("Share invitation", systemImage: "square.and.arrow.up") }
                        .accessibilityIdentifier("enrollment.share")
                    Text("Keep this link private. Creating or sharing it does not approve a contact. If you lose it, close the invitation before creating another.").font(.caption)
                } else {
                    Button("Create private invitation") { Task { if await model.saveInvitationProfile() { await enrollment.create() } } }
                        .accessibilityIdentifier("enrollment.create")
                }
                Button("Refresh invitations") { Task { selected = nil; confirmed = false; await enrollment.refresh(); await model.refreshContact(); await network.refresh(eventID: model.currentAlertEventID) } }
                    .accessibilityIdentifier("enrollment.refresh")
                ForEach(enrollment.invitations) { invitation in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(invitation.isOpen ? "Waiting for your person" : "Invitation closed or expired").font(.headline)
                        Text("Created for \(invitation.displayName) · expires \(invitation.expiresAt.formatted())").font(.caption)
                        if invitation.isOpen {
                            Button("Review verified requests") { Task { selected = nil; confirmed = false; await enrollment.review(invitation.id) } }
                            Button("Close invitation", role: .destructive) { closing = invitation }
                        }
                        if enrollment.reviewing == invitation.id {
                            if enrollment.candidates.isEmpty { Text("No verified request yet. Ask your person to complete the link, then review again.").font(.caption) }
                            ForEach(enrollment.candidates) { candidate in
                                Button("Review \(candidate.emailHint)") { label = "Trusted person"; confirmed = false; selected = candidate }
                            }
                        }
                    }
                    Divider()
                }
                if let message = model.contactMessage { Text(message).font(.footnote) }
                if let message = enrollment.message { Text(message).font(.footnote).accessibilityIdentifier("enrollment.message") }
                Text("Existing confirmed contacts stay available. Close an unused invitation to free its slot; withdraw an existing contact separately. Up to three contact slots, including open invitations.").font(.caption)
            }
            .buttonStyle(.bordered)
            .buttonBorderShape(.roundedRectangle)
            .disabled(enrollment.busy || model.isSavingContact || !model.canEditContact)
        }
        .task { await enrollment.refresh() }
        .sheet(item: $selected) { candidate in
            NavigationStack {
                Form {
                    Text("Verified email: \(candidate.emailHint)")
                    Text("A verified mailbox and masked hint do not establish identity. Confirm with the person you intended to invite using a channel you already trust. Do not approve an unfamiliar request.")
                    TextField("Contact label", text: $label).textContentType(.nickname)
                    Toggle("I confirmed this is my intended person", isOn: $confirmed)
                        .accessibilityIdentifier("enrollment.confirmPerson")
                    if let message = enrollment.message { Text(message) }
                    Button("Approve trusted person") {
                        Task {
                            if await enrollment.approve(candidate, name: label, intendedPersonConfirmed: confirmed) {
                                selected = nil; confirmed = false
                                await model.refreshContact()
                                await network.refresh(eventID: model.currentAlertEventID)
                            }
                        }
                    }.disabled(!confirmed || label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || label.count > 80 || candidate.expiresAt <= Date() || enrollment.busy)
                    Text("Approval enables TEST and REAL alerts. It does not send an alert. Ask before rehearsing.")
                }
                .navigationTitle("Review your person")
                .toolbar { Button("Cancel") { selected = nil; confirmed = false }.disabled(enrollment.busy) }
                .interactiveDismissDisabled(enrollment.busy)
            }
        }
        .confirmationDialog("Close this invitation?", isPresented: Binding(get: { closing != nil }, set: { if !$0 { closing = nil } })) {
            if let invitation = closing { Button("Close invitation", role: .destructive) { Task { await enrollment.revoke(invitation.id) }; closing = nil } }
        } message: { Text("This prevents new approval through this link. Existing approved contacts must be withdrawn separately.") }
    }
}
