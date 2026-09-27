import SwiftUI

enum SignalWordColor {
    static let canvas = Color(red: 0.043, green: 0.051, blue: 0.063)       // #0B0D10
    static let surface = Color(red: 0.071, green: 0.082, blue: 0.102)      // #12151A
    static let secondarySurface = Color(red: 0.094, green: 0.110, blue: 0.133) // #181C22
    static let primaryText = Color(red: 0.961, green: 0.969, blue: 0.980) // #F5F7FA
    static let secondaryText = Color(red: 0.663, green: 0.690, blue: 0.737) // #A9B0BC
    static let mutedText = Color(red: 0.439, green: 0.471, blue: 0.529)   // #707887
    static let action = Color(red: 0.478, green: 0.435, blue: 0.941)      // #7A6FF0
    static let ready = Color(red: 0.180, green: 0.812, blue: 0.569)       // #2ECF91
    static let attention = Color(red: 0.949, green: 0.725, blue: 0.373)   // #F2B95F
    static let critical = Color(red: 1.000, green: 0.384, blue: 0.384)    // #FF6262
    static let separator = Color(red: 0.180, green: 0.200, blue: 0.231)
    static let track = Color(red: 0.157, green: 0.173, blue: 0.204)
    static let calm = Color(red: 0.08, green: 0.10, blue: 0.13)
}

enum SignalWordSpacing {
    static let compact: CGFloat = 8
    static let control: CGFloat = 12
    static let standard: CGFloat = 16
    static let card: CGFloat = 18
    static let page: CGFloat = 22
    static let section: CGFloat = 24
}

enum SignalWordRadius {
    static let row: CGFloat = 15
    static let control: CGFloat = 17
    static let card: CGFloat = 21
    static let panel: CGFloat = 28
}

enum SignalWordMotion {
    static let pressDuration: Double = 0.16
}

struct SignalWordCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(SignalWordSpacing.card)
            .background(SignalWordColor.surface, in: RoundedRectangle(cornerRadius: SignalWordRadius.card, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: SignalWordRadius.card, style: .continuous)
                    .stroke(SignalWordColor.separator.opacity(0.5), lineWidth: 0.7)
            }
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
        case .ready: SignalWordColor.ready
        case .actionNeeded: SignalWordColor.attention
        case .optional: SignalWordColor.secondaryText
        }
    }
}
