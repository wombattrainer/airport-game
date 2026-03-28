import AppKit

class StatusBarController {
    private var statusItem: NSStatusItem
    private var refreshTimer: Timer?
    private let apiClient = AnthropicAPIClient()
    private var currentWindows: UsageWindows?
    private var isLoading = false

    // Menu items — one row per window
    private var monthlyRowItem: NSMenuItem!
    private var weeklyRowItem: NSMenuItem!
    private var hourlyRowItem: NSMenuItem!
    private var resetsItem: NSMenuItem!
    private var modelBreakdownMenu: NSMenu!
    private var lastUpdatedItem: NSMenuItem!
    private var refreshItem: NSMenuItem!

    init() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        setupStatusButton()
        setupMenu()
        refresh()
        scheduleTimer()
        NotificationCenter.default.addObserver(
            self, selector: #selector(prefsChanged),
            name: .preferencesDidChange, object: nil
        )
    }

    // MARK: - Setup

    private func setupStatusButton() {
        guard let button = statusItem.button else { return }
        button.image = MenuBarIconRenderer.makeLoadingIcon()
        button.imagePosition = .imageLeft
        button.title = " ..."
    }

    private func setupMenu() {
        let menu = NSMenu()

        let headerItem = NSMenuItem(title: "Claude Token Monitor", action: nil, keyEquivalent: "")
        headerItem.isEnabled = false
        menu.addItem(headerItem)

        menu.addItem(.separator())

        // Three window rows
        monthlyRowItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        monthlyRowItem.isEnabled = false
        menu.addItem(monthlyRowItem)

        weeklyRowItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        weeklyRowItem.isEnabled = false
        menu.addItem(weeklyRowItem)

        hourlyRowItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        hourlyRowItem.isEnabled = false
        menu.addItem(hourlyRowItem)

        menu.addItem(.separator())

        // Reset times
        resetsItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        resetsItem.isEnabled = false
        menu.addItem(resetsItem)

        // Model breakdown submenu
        let breakdownItem = NSMenuItem(title: "By model", action: nil, keyEquivalent: "")
        modelBreakdownMenu = NSMenu()
        breakdownItem.submenu = modelBreakdownMenu
        menu.addItem(breakdownItem)

        menu.addItem(.separator())

        lastUpdatedItem = NSMenuItem(title: "Last updated: —", action: nil, keyEquivalent: "")
        lastUpdatedItem.isEnabled = false
        menu.addItem(lastUpdatedItem)

        refreshItem = NSMenuItem(title: "Refresh Now", action: #selector(refreshNow), keyEquivalent: "r")
        refreshItem.target = self
        menu.addItem(refreshItem)

        menu.addItem(.separator())

        let prefsItem = NSMenuItem(title: "Preferences...", action: #selector(openPreferences), keyEquivalent: ",")
        prefsItem.target = self
        menu.addItem(prefsItem)

        let quitItem = NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    // MARK: - Refresh

    func stopMonitoring() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    private func scheduleTimer() {
        refreshTimer?.invalidate()
        refreshTimer = Timer.scheduledTimer(
            withTimeInterval: Preferences.refreshInterval, repeats: true
        ) { [weak self] _ in self?.refresh() }
    }

    func refresh() {
        guard !isLoading else { return }
        isLoading = true
        if currentWindows == nil { updateButton(loading: true) }

        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let windows = try await self.apiClient.fetchAllWindows()
                self.currentWindows = windows
                self.updateUI(with: windows)
            } catch {
                self.updateErrorUI(error.localizedDescription)
            }
            self.isLoading = false
        }
    }

    // MARK: - UI Updates

    private func updateButton(loading: Bool) {
        guard let button = statusItem.button else { return }
        button.image = MenuBarIconRenderer.makeLoadingIcon()
        button.title = " ..."
    }

    private func updateUI(with windows: UsageWindows) {
        guard let button = statusItem.button else { return }

        // The icon tracks whichever window is most constrained
        let (constrainedKind, constrained) = windows.mostConstrained
        let pct = constrained.percentageRemaining
        button.image = MenuBarIconRenderer.makeIcon(percentageRemaining: pct)
        button.imagePosition = .imageLeft
        button.title = " \(Int(pct * 100))%"

        // If not the monthly window, show a label so the user knows what's constrained
        if constrainedKind != .monthly {
            button.title = " \(constrainedKind.displayName.prefix(1)) \(Int(pct * 100))%"
        }

        // Window rows
        monthlyRowItem.attributedTitle = makeWindowRow(windows.monthly, label: "Monthly ")
        weeklyRowItem.attributedTitle  = makeWindowRow(windows.weekly,  label: "Weekly  ")
        hourlyRowItem.attributedTitle  = makeWindowRow(windows.hourly,  label: "Hourly  ")

        // Reset times summary
        resetsItem.attributedTitle = makeResetsString(windows)

        // Model breakdown (from monthly snapshot — largest token set)
        modelBreakdownMenu.removeAllItems()
        let breakdown = windows.monthly.modelBreakdown
        if breakdown.isEmpty {
            let empty = NSMenuItem(title: "No breakdown available", action: nil, keyEquivalent: "")
            empty.isEnabled = false
            modelBreakdownMenu.addItem(empty)
        } else {
            for (model, tokens) in breakdown.sorted(by: { $0.value > $1.value }) {
                let shortModel = model.replacingOccurrences(of: "claude-", with: "")
                let item = NSMenuItem(
                    title: "\(shortModel): \(formatTokenCount(tokens))",
                    action: nil, keyEquivalent: ""
                )
                item.isEnabled = false
                modelBreakdownMenu.addItem(item)
            }
        }

        let tf = DateFormatter()
        tf.timeStyle = .short
        lastUpdatedItem.title = "Last updated: \(tf.string(from: windows.fetchedAt))"
    }

    private func updateErrorUI(_ message: String) {
        guard let button = statusItem.button else { return }
        button.image = MenuBarIconRenderer.makeErrorIcon()
        button.title = " !"
        monthlyRowItem.title = "Error fetching usage"
        weeklyRowItem.title  = ""
        hourlyRowItem.title  = message.prefix(55).description
        resetsItem.title     = "Check API key in Preferences"
        lastUpdatedItem.title = "Failed: \(DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short))"
    }

    // MARK: - String builders

    /// One row: "Monthly  [████████░░░░░░░░░░░░] 40%  20M / 50M"
    private func makeWindowRow(_ snapshot: UsageSnapshot, label: String) -> NSAttributedString {
        let pct = snapshot.percentageRemaining
        let totalBlocks = 16
        let filled = Int(pct * Double(totalBlocks))
        let empty = totalBlocks - filled
        let bar = String(repeating: "█", count: filled) + String(repeating: "░", count: empty)
        let pctStr = String(format: "%3d%%", Int(pct * 100))
        let text = "\(label)[\(bar)] \(pctStr)  \(snapshot.formattedUsed) / \(snapshot.formattedLimit)"

        let color: NSColor
        switch pct {
        case 0.5...:    color = .systemGreen
        case 0.2..<0.5: color = .systemYellow
        default:         color = .systemRed
        }

        return NSAttributedString(string: text, attributes: [
            .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .regular),
            .foregroundColor: color
        ])
    }

    /// "Resets: monthly Apr 1 · weekly Thu · hourly 6:42 PM"
    private func makeResetsString(_ windows: UsageWindows) -> NSAttributedString {
        let df = DateFormatter()

        df.dateFormat = "MMM d"
        let monthlyReset = df.string(from: windows.monthly.periodEnd)

        df.dateFormat = "EEE"
        let weeklyReset = df.string(from: windows.weekly.periodEnd)

        df.dateStyle = .none
        df.timeStyle = .short
        let hourlyReset = df.string(from: windows.hourly.periodEnd)

        let hours = Preferences.hourlyWindowHours
        let text = "Resets: monthly \(monthlyReset) · weekly \(weeklyReset) · \(hours)h window \(hourlyReset)"

        return NSAttributedString(string: text, attributes: [
            .font: NSFont.systemFont(ofSize: 10),
            .foregroundColor: NSColor.secondaryLabelColor
        ])
    }

    // MARK: - Actions

    @objc private func refreshNow() { refresh() }

    @objc private func prefsChanged() {
        scheduleTimer()
        refresh()
    }

    @objc private func openPreferences() {
        PreferencesWindowController.shared.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func quit() { NSApp.terminate(nil) }
}
