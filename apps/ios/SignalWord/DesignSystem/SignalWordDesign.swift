import SwiftUI

enum SignalWordColor {
    static let action = Color(red: 0.10, green: 0.36, blue: 0.32)
    static let attention = Color(red: 0.76, green: 0.30, blue: 0.18)
    static let calm = Color(red: 0.90, green: 0.96, blue: 0.94)
}

struct SignalWordCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(.separator.opacity(0.25), lineWidth: 1)
            }
    }
}

struct StatusRow: View {
    let title: String
    let detail: String
    let state: ReadinessState

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: state.symbolName)
                .foregroundStyle(state.color)
                .frame(width: 24, height: 24)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline)
                Text(detail).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            Text(state.label)
                .font(.caption.bold())
                .foregroundStyle(state.color)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title), \(state.label). \(detail)")
    }
}

enum ReadinessState: Equatable {
    case ready, actionNeeded, optional

    var symbolName: String {
        switch self {
        case .ready: "checkmark.circle.fill"
        case .actionNeeded: "exclamationmark.circle.fill"
        case .optional: "minus.circle.fill"
        }
    }

    var label: String {
        switch self {
        case .ready: "Ready"
        case .actionNeeded: "Action needed"
        case .optional: "Optional"
        }
    }

    var color: Color {
        switch self {
        case .ready: SignalWordColor.action
        case .actionNeeded: SignalWordColor.attention
        case .optional: .secondary
        }
    }
}
