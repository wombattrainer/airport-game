import AppKit

class PreferencesWindowController: NSWindowController {
    static let shared = PreferencesWindowController()

    private var apiKeyField: NSSecureTextField!
    private var tokenLimitField: NSTextField!
    private var refreshIntervalPopup: NSPopUpButton!
    private var launchAtLoginCheck: NSButton!
    private var statusLabel: NSTextField!
    private var saveButton: NSButton!

    private init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 420, height: 300),
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
        var y = padding

        // Save button (bottom)
        saveButton = NSButton(title: "Save", target: self, action: #selector(save))
        saveButton.bezelStyle = .rounded
        saveButton.keyEquivalent = "\r"
        saveButton.frame = NSRect(x: contentView.bounds.width - 100 - padding,
                                  y: y, width: 100, height: 28)
        saveButton.autoresizingMask = [.minXMargin, .maxYMargin]
        contentView.addSubview(saveButton)

        // Status label
        statusLabel = NSTextField(labelWithString: "")
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.font = .systemFont(ofSize: 11)
        statusLabel.frame = NSRect(x: padding, y: y + 6, width: 240, height: 16)
        statusLabel.autoresizingMask = [.maxXMargin, .maxYMargin]
        contentView.addSubview(statusLabel)

        y += 48

        // Separator
        let sep = NSBox()
        sep.boxType = .separator
        sep.frame = NSRect(x: padding, y: y, width: contentView.bounds.width - padding * 2, height: 1)
        sep.autoresizingMask = [.width, .maxYMargin]
        contentView.addSubview(sep)
        y += 16

        // Launch at login
        launchAtLoginCheck = NSButton(checkboxWithTitle: "Launch at login", target: nil, action: nil)
        launchAtLoginCheck.frame = NSRect(x: padding, y: y, width: 200, height: 22)
        contentView.addSubview(launchAtLoginCheck)
        y += 36

        // Refresh interval
        addLabel("Refresh interval:", x: padding, y: y, in: contentView)
        refreshIntervalPopup = NSPopUpButton(frame: NSRect(x: 140, y: y - 2, width: 160, height: 24))
        refreshIntervalPopup.addItems(withTitles: ["30 seconds", "1 minute", "5 minutes", "15 minutes"])
        refreshIntervalPopup.tag = 0
        contentView.addSubview(refreshIntervalPopup)
        y += 36

        // Monthly token limit
        addLabel("Monthly limit:", x: padding, y: y, in: contentView)
        tokenLimitField = NSTextField(frame: NSRect(x: 140, y: y - 2, width: 160, height: 22))
        tokenLimitField.placeholderString = "e.g. 50000000"
        tokenLimitField.bezelStyle = .roundedBezel
        contentView.addSubview(tokenLimitField)
        addLabel("tokens", x: 308, y: y, in: contentView)
        y += 36

        // API Key
        addLabel("Anthropic API key:", x: padding, y: y, in: contentView)
        apiKeyField = NSSecureTextField(frame: NSRect(x: 140, y: y - 2, width: 240, height: 22))
        apiKeyField.placeholderString = "sk-ant-..."
        apiKeyField.bezelStyle = .roundedBezel
        contentView.addSubview(apiKeyField)
        y += 36

        // Title
        let titleLabel = NSTextField(labelWithString: "Claude Token Monitor")
        titleLabel.font = .boldSystemFont(ofSize: 14)
        titleLabel.frame = NSRect(x: padding, y: y, width: 300, height: 20)
        contentView.addSubview(titleLabel)
    }

    @discardableResult
    private func addLabel(_ text: String, x: CGFloat, y: CGFloat, in view: NSView) -> NSTextField {
        let label = NSTextField(labelWithString: text)
        label.alignment = .right
        label.frame = NSRect(x: x, y: y + 2, width: 115, height: 17)
        view.addSubview(label)
        return label
    }

    // MARK: - Load / Save

    private func loadCurrentValues() {
        let client = AnthropicAPIClient()
        if let key = client.apiKey {
            apiKeyField.stringValue = key
        }

        tokenLimitField.stringValue = "\(Preferences.monthlyTokenLimit)"
        launchAtLoginCheck.state = Preferences.launchAtLogin ? .on : .off

        let interval = Preferences.refreshInterval
        switch interval {
        case 30:   refreshIntervalPopup.selectItem(at: 0)
        case 300:  refreshIntervalPopup.selectItem(at: 2)
        case 900:  refreshIntervalPopup.selectItem(at: 3)
        default:   refreshIntervalPopup.selectItem(at: 1) // 60s default
        }
    }

    @objc private func save() {
        let client = AnthropicAPIClient()
        let keyValue = apiKeyField.stringValue.trimmingCharacters(in: .whitespaces)
        client.apiKey = keyValue.isEmpty ? nil : keyValue

        if let limit = Int(tokenLimitField.stringValue.filter { $0.isNumber }), limit > 0 {
            Preferences.monthlyTokenLimit = limit
        }

        let intervals: [TimeInterval] = [30, 60, 300, 900]
        Preferences.refreshInterval = intervals[refreshIntervalPopup.indexOfSelectedItem]

        Preferences.launchAtLogin = launchAtLoginCheck.state == .on
        configureLaunchAtLogin(enabled: Preferences.launchAtLogin)

        statusLabel.stringValue = "Saved."
        statusLabel.textColor = .systemGreen

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.statusLabel.stringValue = ""
        }

        // Notify the status bar controller to refresh immediately
        NotificationCenter.default.post(name: .preferencesDidChange, object: nil)
    }

    private func configureLaunchAtLogin(enabled: Bool) {
        // Uses SMAppService on macOS 13+; requires the app to be in /Applications
        // or registered as a Login Item. Handled via bundle ID in a real distribution.
        // For development builds, this is a no-op placeholder.
    }
}

extension Notification.Name {
    static let preferencesDidChange = Notification.Name("ClaudeTokenMonitorPreferencesDidChange")
}
