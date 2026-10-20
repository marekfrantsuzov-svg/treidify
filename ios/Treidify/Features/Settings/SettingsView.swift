import SwiftUI
import TreidifyCore

struct SettingsView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss

    /// True when pushed inside another navigation stack (from More).
    var embedded = false

    var body: some View {
        if embedded {
            form
        } else {
            NavigationStack {
                form.toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { dismiss() }
                    }
                }
            }
        }
    }

    private var form: some View {
        @Bindable var settings = app.settings
        return Form {
                Section("Appearance") {
                    Picker("Theme", selection: $settings.appearance) {
                        ForEach(AppSettings.Appearance.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: settings.appearance) { _, _ in app.feedback.play(.themeSwitch) }
                }

                Section {
                    Toggle("Haptic feedback", isOn: $settings.hapticsEnabled)
                    Toggle("Interface sounds", isOn: $settings.soundsEnabled)
                        .onChange(of: settings.soundsEnabled) { _, on in if on { app.feedback.play(.buttonTap) } }
                } header: {
                    Text("Feedback")
                } footer: {
                    Text("Sounds follow the silent switch and are muted while VoiceOver is running.")
                }

                Section {
                    Toggle("Demo mode", isOn: $settings.demoModeEnabled)
                    if settings.demoModeEnabled {
                        Toggle("Demo MT5 account", isOn: $settings.demoAccountConnected)
                    }
                } header: {
                    Text("Data")
                } footer: {
                    Text(settings.demoModeEnabled
                         ? "Demo mode shows generated sample data, labelled DEMO everywhere."
                         : "No licensed market-data or news provider is configured in this build, so live sections show as unavailable.")
                }

                Section("Accounts") {
                    LabeledContent("MetaTrader 5", value: "Not available yet")
                    LabeledContent("Sign in", value: "Not available yet")
                }

                Section("Legal") {
                    NavigationLink("Risk disclosure") { LegalTextView(title: "Risk disclosure", text: LegalText.riskDisclosure) }
                    NavigationLink("Privacy policy") { LegalTextView(title: "Privacy policy", text: LegalText.privacyPolicy) }
                    NavigationLink("Terms of service") { LegalTextView(title: "Terms of service", text: LegalText.termsOfService) }
                    NavigationLink("Data sources") { LegalTextView(title: "Data sources", text: LegalText.dataSources) }
                }

                Section("About") {
                    LabeledContent("Version", value: Bundle.main.appVersion)
                    LabeledContent("Analytics", value: MarketBiasEngine.algorithmVersion)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct LegalTextView: View {
    let title: String
    let text: String

    var body: some View {
        ScrollView {
            Text(text)
                .font(.body)
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.m)
                .textSelection(.enabled)
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

extension Bundle {
    var appVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "—"
        return "\(version) (\(build))"
    }
}

#Preview("Settings") {
    SettingsView()
        .environment(AppModel.preview())
}
