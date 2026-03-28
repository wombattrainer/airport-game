import AppKit

class StatusBarController {
    private var statusItem: NSStatusItem
    private var refreshTimer: Timer?
    private let apiClient = AnthropicAPIClient()
    private var currentSnapshot: UsageSnapshot?
    private var lastError: String?
    private var isLoading = false

    // Menu items
    private var usageTitleItem: NSMenuItem!
    private var percentageBarItem: NSMenuItem!
    private var detailsItem: NSMenuItem!
    private var modelBreakdownMenu: NSMenu!
    private var lastUpdatedItem: NSMenuItem!
    private var refreshItem: NSMenuItem!

    init() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        setupStatusButton()
        setupMenu()
        refresh()
        scheduleTimer()
    }

    // MARK: - Setup

    private func setupStatusButton() {
        guard let button = statusItem.button else { return }
        button.image = MenuBarIconRenderer.makeLoadingIcon()
        button.imagePosition = .imageLeft
        button.title = " ---%"
    }

    private func setupMenu() {
        let menu = NSMenu()

        // Header: app name
        let headerItem = NSMenuItem(title: "Claude Token Monitor", action: nil, keyEquivalent: "")
        headerItem.isEnabled = false
        menu.addItem(headerItem)

        menu.addItem(.separator())

        // Usage title (e.g. "This month: 12.3M / 50M tokens")
        usageTitleItem = NSMenuItem(title: "Fetching usage...", action: nil, keyEquivalent: "")
        usageTitleItem.isEnabled = false
        menu.addItem(usageTitleItem)

        // Inline visual bar (rendered as attributed string)
        percentageBarItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        percentageBarItem.isEnabled = false
        menu.addItem(percentageBarItem)

        menu.addItem(.separator())

        // Details: remaining + period end
        detailsItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        detailsItem.isEnabled = false
        menu.addItem(detailsItem)

        // Model breakdown submenu
        let breakdownItem = NSMenuItem(title: "By model", action: nil, keyEquivalent: "")
        modelBreakdownMenu = NSMenu()
        breakdownItem.submenu = modelBreakdownMenu
        menu.addItem(breakdownItem)

        menu.addItem(.separator())

        // Last updated
        lastUpdatedItem = NSMenuItem(title: "Last updated: never", action: nil, keyEquivalent: "")
        lastUpdatedItem.isEnabled = false
        menu.addItem(lastUpdatedItem)

        // Refresh now
        refreshItem = NSMenuItem(title: "Refresh Now", action: #selector(refreshNow), keyEquivalent: "r")
        refreshItem.target = self
        menu.addItem(refreshItem)

        menu.addItem(.separator())

        // Preferences
        let prefsItem = NSMenuItem(title: "Preferences...", action: #selector(openPreferences), keyEquivalent: ",")
        prefsItem.target = self
        menu.addItem(prefsItem)

        // Quit
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
        let interval = Preferences.refreshInterval
        refreshTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.refresh()
        }
    }

    func refresh() {
        guard !isLoading else { return }
        isLoading = true
        updateButton(loading: true)

        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let snapshot = try await self.apiClient.fetchUsage()
                self.currentSnapshot = snapshot
                self.lastError = nil
                self.updateUI(with: snapshot)
            } catch {
                self.lastError = error.localizedDescription
                self.updateErrorUI(error.localizedDescription)
            }
            self.isLoading = false
        }
    }

    // MARK: - UI Updates

    private func updateButton(loading: Bool) {
        guard let button = statusItem.button else { return }
        if loading && currentSnapshot == nil {
            button.image = MenuBarIconRenderer.makeLoadingIcon()
            button.title = " ..."
        }
    }

    private func updateUI(with snapshot: UsageSnapshot) {
        guard let button = statusItem.button else { return }

        let pct = snapshot.percentageRemaining
        let pctInt = Int(pct * 100)

        // Update status bar button
        button.image = MenuBarIconRenderer.makeIcon(percentageRemaining: pct)
        button.imagePosition = .imageLeft
        button.title = " \(pctInt)%"

        // Usage title
        usageTitleItem.title = "This month: \(snapshot.formattedUsed) / \(snapshot.formattedLimit) tokens"

        // Visual bar in menu (ASCII-style for simplicity)
        percentageBarItem.attributedTitle = makeBarAttributedString(pct: pct)

        // Details
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        dateFormatter.timeStyle = .none
        let periodEndStr = dateFormatter.string(from: snapshot.periodEnd)
        detailsItem.title = "\(snapshot.formattedRemaining) remaining · resets \(periodEndStr)"

        // Model breakdown
        modelBreakdownMenu.removeAllItems()
        if snapshot.modelBreakdown.isEmpty {
            let emptyItem = NSMenuItem(title: "No breakdown available", action: nil, keyEquivalent: "")
            emptyItem.isEnabled = false
            modelBreakdownMenu.addItem(emptyItem)
        } else {
            let sorted = snapshot.modelBreakdown.sorted { $0.value > $1.value }
            for (model, tokens) in sorted {
                let shortModel = model.replacingOccurrences(of: "claude-", with: "")
                let item = NSMenuItem(title: "\(shortModel): \(formatTokenCount(tokens))", action: nil, keyEquivalent: "")
                item.isEnabled = false
                modelBreakdownMenu.addItem(item)
            }
        }

        // Last updated
        let timeFormatter = DateFormatter()
        timeFormatter.timeStyle = .short
        lastUpdatedItem.title = "Last updated: \(timeFormatter.string(from: Date()))"
    }

    private func updateErrorUI(_ message: String) {
        guard let button = statusItem.button else { return }
        button.image = MenuBarIconRenderer.makeErrorIcon()
        button.title = " !"

        usageTitleItem.title = "Error fetching usage"
        percentageBarItem.title = message.prefix(60).description
        detailsItem.title = "Check API key in Preferences"
        lastUpdatedItem.title = "Failed: \(DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short))"
    }

    private func makeBarAttributedString(pct: Double) -> NSAttributedString {
        let totalBlocks = 20
        let filledBlocks = Int(pct * Double(totalBlocks))
        let emptyBlocks = totalBlocks - filledBlocks

        let filled = String(repeating: "█", count: filledBlocks)
        let empty = String(repeating: "░", count: emptyBlocks)
        let bar = "[\(filled)\(empty)] \(Int(pct * 100))%"

        let color: NSColor
        switch pct {
        case 0.5...:    color = .systemGreen
        case 0.2..<0.5: color = .systemYellow
        default:         color = .systemRed
        }

        return NSAttributedString(string: bar, attributes: [
            .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .regular),
            .foregroundColor: color
        ])
    }

    // MARK: - Actions

    @objc private func refreshNow() {
        refresh()
    }

    @objc private func openPreferences() {
        PreferencesWindowController.shared.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}
