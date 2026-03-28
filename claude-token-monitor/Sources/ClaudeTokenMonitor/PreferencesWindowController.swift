import AppKit

class PreferencesWindowController: NSWindowController {
    static let shared = PreferencesWindowController()

    private var apiKeyField: NSSecureTextField!
    private var monthlyLimitField: NSTextField!
    private var weeklyLimitField: NSTextField!
    private var hourlyLimitField: NSTextField!
    private var hourlyWindowPopup: NSPopUpButton!
    private var refreshIntervalPopup: NSPopUpButton!
    private var launchAtLoginCheck: NSButton!
    private var statusLabel: NSTextField!
    private var saveButton: NSButton!

    private init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 440, height: 440),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Claude Token Monitor — Preferences"
        window.center()
        window.isReleasedWhenClosed = false
        super.init(window: window)
        buildUI()
        loadCurrentValues()
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Build UI

    private func buildUI() {
        guard let contentView = window?.contentView else { return }

        let padding: CGFloat = 20
        let labelWidth: CGFloat = 150
        let fieldX: CGFloat = padding + labelWidth + 8
        var y = padding

        // Save / status row
        saveButton = NSButton(title: "Save", target: self, action: #selector(save))
        saveButton.bezelStyle = .rounded
        saveButton.keyEquivalent = "\r"
        saveButton.frame = NSRect(x: contentView.bounds.width - 100 - padding, y: y, width: 100, height: 28)
        saveButton.autoresizingMask = [.minXMargin, .maxYMargin]
        contentView.addSubview(saveButton)

        statusLabel = NSTextField(labelWithString: "")
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.font = .systemFont(ofSize: 11)
        statusLabel.frame = NSRect(x: padding, y: y + 6, width: 240, height: 16)
        statusLabel.autoresizingMask = [.maxXMargin, .maxYMargin]
        contentView.addSubview(statusLabel)
        y += 48

        addSeparator(y: y, in: contentView, width: contentView.bounds.width - padding * 2, x: padding)
        y += 16

        // Launch at login
        launchAtLoginCheck = NSButton(checkboxWithTitle: "Launch at login", target: nil, action: nil)
        launchAtLoginCheck.frame = NSRect(x: padding, y: y, width: 200, height: 22)
        contentView.addSubview(launchAtLoginCheck)
        y += 36

        // Refresh interval
        addLabel("Refresh interval:", x: padding, y: y, width: labelWidth, in: contentView)
        refreshIntervalPopup = NSPopUpButton(frame: NSRect(x: fieldX, y: y - 2, width: 160, height: 24))
        refreshIntervalPopup.addItems(withTitles: ["30 seconds", "1 minute", "5 minutes", "15 minutes"])
        contentView.addSubview(refreshIntervalPopup)
        y += 36

        addSeparator(y: y, in: contentView, width: contentView.bounds.width - padding * 2, x: padding)
        y += 12

        addSectionHeader("Token Limits  (tokens per window)", y: y, in: contentView, x: padding)
        y += 24

        let helpLabel = NSTextField(labelWithString: "Calibrate from your Anthropic console usage page.")
        helpLabel.textColor = .secondaryLabelColor
        helpLabel.font = .systemFont(ofSize: 10)
        helpLabel.frame = NSRect(x: padding, y: y, width: 380, height: 14)
        contentView.addSubview(helpLabel)
        y += 24

        // Hourly window width
        addLabel("Hourly window width:", x: padding, y: y, width: labelWidth, in: contentView)
        hourlyWindowPopup = NSPopUpButton(frame: NSRect(x: fieldX, y: y - 2, width: 140, height: 24))
        for h in [1, 2, 4, 6, 8, 12, 24] {
            hourlyWindowPopup.addItem(withTitle: "\(h) hour\(h == 1 ? "" : "s")")
            hourlyWindowPopup.lastItem?.tag = h
        }
        contentView.addSubview(hourlyWindowPopup)
        y += 34

        // Hourly limit
        addLabel("Hourly limit:", x: padding, y: y, width: labelWidth, in: contentView)
        hourlyLimitField = makeNumberField(frame: NSRect(x: fieldX, y: y - 2, width: 140, height: 22),
                                           placeholder: "e.g. 1000000")
        contentView.addSubview(hourlyLimitField)
        addLabel("tokens", x: fieldX + 148, y: y, width: 60, in: contentView)
        y += 34

        // Weekly limit
        addLabel("Weekly limit (7 days):", x: padding, y: y, width: labelWidth, in: contentView)
        weeklyLimitField = makeNumberField(frame: NSRect(x: fieldX, y: y - 2, width: 140, height: 22),
                                           placeholder: "e.g. 10000000")
        contentView.addSubview(weeklyLimitField)
        addLabel("tokens", x: fieldX + 148, y: y, width: 60, in: contentView)
        y += 34

        // Monthly limit
        addLabel("Monthly limit:", x: padding, y: y, width: labelWidth, in: contentView)
        monthlyLimitField = makeNumberField(frame: NSRect(x: fieldX, y: y - 2, width: 140, height: 22),
                                            placeholder: "e.g. 50000000")
        contentView.addSubview(monthlyLimitField)
        addLabel("tokens", x: fieldX + 148, y: y, width: 60, in: contentView)
        y += 34

        addSeparator(y: y, in: contentView, width: contentView.bounds.width - padding * 2, x: padding)
        y += 12

        // API Key
        addLabel("Anthropic API key:", x: padding, y: y, width: labelWidth, in: contentView)
        apiKeyField = NSSecureTextField(frame: NSRect(x: fieldX, y: y - 2, width: 240, height: 22))
        apiKeyField.placeholderString = "sk-ant-..."
        apiKeyField.bezelStyle = .roundedBezel
        contentView.addSubview(apiKeyField)
        y += 34

        // Title
        let title = NSTextField(labelWithString: "Claude Token Monitor")
        title.font = .boldSystemFont(ofSize: 14)
        title.frame = NSRect(x: padding, y: y, width: 300, height: 20)
        contentView.addSubview(title)
    }

    // MARK: - Layout helpers

    @discardableResult
    private func addLabel(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat, in view: NSView) -> NSTextField {
        let label = NSTextField(labelWithString: text)
        label.alignment = .right
        label.frame = NSRect(x: x, y: y + 2, width: width, height: 17)
        view.addSubview(label)
        return label
    }

    private func addSectionHeader(_ text: String, y: CGFloat, in view: NSView, x: CGFloat) {
        let label = NSTextField(labelWithString: text)
        label.font = .boldSystemFont(ofSize: 11)
        label.textColor = .secondaryLabelColor
        label.frame = NSRect(x: x, y: y, width: 380, height: 16)
        view.addSubview(label)
    }

    private func addSeparator(y: CGFloat, in view: NSView, width: CGFloat, x: CGFloat) {
        let sep = NSBox()
        sep.boxType = .separator
        sep.frame = NSRect(x: x, y: y, width: width, height: 1)
        sep.autoresizingMask = [.width, .maxYMargin]
        view.addSubview(sep)
    }

    private func makeNumberField(frame: NSRect, placeholder: String) -> NSTextField {
        let field = NSTextField(frame: frame)
        field.placeholderString = placeholder
        field.bezelStyle = .roundedBezel
        return field
    }

    // MARK: - Load / Save

    private func loadCurrentValues() {
        if let key = AnthropicAPIClient().apiKey {
            apiKeyField.stringValue = key
        }

        monthlyLimitField.stringValue = "\(Preferences.monthlyTokenLimit)"
        weeklyLimitField.stringValue  = "\(Preferences.weeklyTokenLimit)"
        hourlyLimitField.stringValue  = "\(Preferences.hourlyTokenLimit)"

        // Hourly window popup
        let targetHours = Preferences.hourlyWindowHours
        for i in 0..<hourlyWindowPopup.numberOfItems {
            if hourlyWindowPopup.item(at: i)?.tag == targetHours {
                hourlyWindowPopup.selectItem(at: i)
                break
            }
        }
        if hourlyWindowPopup.selectedItem == nil { hourlyWindowPopup.selectItem(at: 4) } // default 8h

        // Refresh interval popup
        switch Preferences.refreshInterval {
        case 30:  refreshIntervalPopup.selectItem(at: 0)
        case 300: refreshIntervalPopup.selectItem(at: 2)
        case 900: refreshIntervalPopup.selectItem(at: 3)
        default:  refreshIntervalPopup.selectItem(at: 1)
        }

        launchAtLoginCheck.state = Preferences.launchAtLogin ? .on : .off
    }

    @objc private func save() {
        let client = AnthropicAPIClient()
        let keyValue = apiKeyField.stringValue.trimmingCharacters(in: .whitespaces)
        client.apiKey = keyValue.isEmpty ? nil : keyValue

        if let v = parseTokens(monthlyLimitField.stringValue) { Preferences.monthlyTokenLimit = v }
        if let v = parseTokens(weeklyLimitField.stringValue)  { Preferences.weeklyTokenLimit  = v }
        if let v = parseTokens(hourlyLimitField.stringValue)  { Preferences.hourlyTokenLimit  = v }

        Preferences.hourlyWindowHours = hourlyWindowPopup.selectedItem?.tag ?? 8

        let intervals: [TimeInterval] = [30, 60, 300, 900]
        Preferences.refreshInterval = intervals[refreshIntervalPopup.indexOfSelectedItem]

        Preferences.launchAtLogin = launchAtLoginCheck.state == .on

        statusLabel.stringValue = "Saved."
        statusLabel.textColor = .systemGreen
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.statusLabel.stringValue = ""
        }

        NotificationCenter.default.post(name: .preferencesDidChange, object: nil)
    }

    private func parseTokens(_ raw: String) -> Int? {
        let digits = raw.filter { $0.isNumber }
        guard let v = Int(digits), v > 0 else { return nil }
        return v
    }
}

extension Notification.Name {
    static let preferencesDidChange = Notification.Name("ClaudeTokenMonitorPreferencesDidChange")
}
