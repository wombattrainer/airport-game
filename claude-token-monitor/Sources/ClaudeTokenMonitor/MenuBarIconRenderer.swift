import AppKit

enum MenuBarIconRenderer {
    /// Draws a compact fill-bar icon like VS Code's context window indicator.
    /// Returns an NSImage sized for the status bar button.
    static func makeIcon(percentageRemaining: Double, size: NSSize = NSSize(width: 26, height: 16)) -> NSImage {
        let image = NSImage(size: size, flipped: false) { rect in
            let barHeight: CGFloat = 6
            let barY = (rect.height - barHeight) / 2
            let barRect = NSRect(x: 1, y: barY, width: rect.width - 2, height: barHeight)

            // Track outline
            NSColor.secondaryLabelColor.withAlphaComponent(0.35).setFill()
            NSBezierPath(roundedRect: barRect, xRadius: barHeight / 2, yRadius: barHeight / 2).fill()

            // Fill (remaining portion)
            let fillWidth = barRect.width * CGFloat(max(0, min(1, percentageRemaining)))
            if fillWidth > 1 {
                let fillRect = NSRect(x: barRect.minX, y: barRect.minY,
                                     width: fillWidth, height: barRect.height)
                fillColor(for: percentageRemaining).setFill()
                NSBezierPath(roundedRect: fillRect, xRadius: barHeight / 2, yRadius: barHeight / 2).fill()
            }
            return true
        }
        image.isTemplate = false
        return image
    }

    /// A "loading" icon shown while fetching data.
    static func makeLoadingIcon() -> NSImage {
        let size = NSSize(width: 16, height: 16)
        let image = NSImage(size: size, flipped: false) { rect in
            let center = NSPoint(x: rect.midX, y: rect.midY)
            let radius: CGFloat = 6
            let path = NSBezierPath()
            path.appendArc(withCenter: center, radius: radius,
                           startAngle: 90, endAngle: -270, clockwise: false)
            path.lineWidth = 1.5
            NSColor.secondaryLabelColor.setStroke()
            path.stroke()
            return true
        }
        return image
    }

    /// An error icon shown when the API call fails.
    static func makeErrorIcon() -> NSImage {
        let size = NSSize(width: 16, height: 16)
        let image = NSImage(size: size, flipped: false) { _ in
            let attrs: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 12, weight: .medium),
                .foregroundColor: NSColor.systemOrange
            ]
            ("!" as NSString).draw(at: NSPoint(x: 5, y: 1), withAttributes: attrs)
            return true
        }
        return image
    }

    private static func fillColor(for remaining: Double) -> NSColor {
        switch remaining {
        case 0.5...:  return NSColor.systemGreen
        case 0.2..<0.5: return NSColor.systemYellow
        default:      return NSColor.systemRed
        }
    }
}
