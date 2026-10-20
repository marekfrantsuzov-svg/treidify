import SwiftUI
import TreidifyCore

struct NewsView: View {
    enum Section: String, CaseIterable, Hashable {
        case intelligence = "Intelligence"
        case calendar = "Calendar"
    }

    enum ImportanceFilter: String, CaseIterable, Hashable {
        case all = "All"
        case mediumPlus = "Medium+"
        case high = "High"

        func includes(_ importance: EventImportance) -> Bool {
            switch self {
            case .all: true
            case .mediumPlus: importance >= .medium
            case .high: importance == .high
            }
        }
    }

    @Environment(AppModel.self) private var app
    @State private var section: Section = .intelligence
    @State private var filter: ImportanceFilter = .all
    @State private var stories: Loadable<Sourced<[NewsStory]>> = .loading
    @State private var calendar: Loadable<Sourced<[EconomicEvent]>> = .loading

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()
                ScrollView {
                    VStack(spacing: Spacing.m) {
                        PillPicker(options: Section.allCases, selection: $section, title: \.rawValue, accessibilityTitle: "News section")
                            .frame(maxWidth: .infinity, alignment: .leading)
                        if app.settings.demoModeEnabled { DemoModeBanner() }
                        switch section {
                        case .intelligence: storiesList
                        case .calendar: calendarList
                        }
                    }
                    .padding(.horizontal, Spacing.screenHorizontal)
                    .padding(.bottom, Spacing.xl)
                }
                .scrollIndicators(.hidden)
                .navigationDestination(for: NewsStory.self) { StoryDetailView(story: $0) }
            }
            .navigationTitle("Global Intelligence")
            .navigationBarTitleDisplayMode(.inline)
        }
        .task(id: app.dataContext) { await load() }
    }

    private func load() async {
        let repo = app.intelligence
        do { stories = .loaded(try await repo.stories(limit: 20)) } catch { stories = .failed(error.localizedDescription) }
        let now = Date()
        do {
            calendar = .loaded(try await repo.calendar(from: now.addingTimeInterval(-2 * 86_400), to: now.addingTimeInterval(7 * 86_400)))
        } catch {
            calendar = .failed(error.localizedDescription)
        }
    }

    @ViewBuilder private var storiesList: some View {
        switch stories {
        case .loading:
            ProgressView().padding(.top, 60)
        case .failed(let message):
            GlassCard { UnavailableState(title: "News unavailable", message: message, systemImage: "newspaper") }
        case .loaded(let sourced):
            ForEach(sourced.value) { story in
                NavigationLink(value: story) {
                    GlassCard { StoryRow(story: story) }
                }
                .buttonStyle(PressableButtonStyle())
            }
            Text("Every story names its original source and keeps publication time separate from event time. Treidify does not generate news.")
                .font(.caption2)
                .foregroundStyle(Theme.textTertiary)
                .multilineTextAlignment(.center)
        }
    }

    @ViewBuilder private var calendarList: some View {
        switch calendar {
        case .loading:
            ProgressView().padding(.top, 60)
        case .failed(let message):
            GlassCard { UnavailableState(title: "Calendar unavailable", message: message, systemImage: "calendar") }
        case .loaded(let sourced):
            PillPicker(options: ImportanceFilter.allCases, selection: $filter, title: \.rawValue, accessibilityTitle: "Importance filter")
                .frame(maxWidth: .infinity, alignment: .leading)
            let events = sourced.value.filter { filter.includes($0.importance) }.sorted { $0.scheduledAt < $1.scheduledAt }
            let days = Dictionary(grouping: events) { Calendar.current.startOfDay(for: $0.scheduledAt) }
            ForEach(days.keys.sorted(), id: \.self) { day in
                GlassCard {
                    VStack(alignment: .leading, spacing: Spacing.s) {
                        Text(day, format: .dateTime.weekday(.wide).day().month())
                            .font(.tdSectionTitle)
                            .foregroundStyle(Theme.textPrimary)
                            .accessibilityAddTraits(.isHeader)
                        ForEach(days[day] ?? []) { event in
                            EventRow(event: event)
                            if event.id != days[day]?.last?.id { Divider().overlay(Theme.hairline) }
                        }
                    }
                }
            }
            if events.isEmpty {
                GlassCard { UnavailableState(title: "No events", message: "No releases match this filter.", systemImage: "calendar") }
            }
            SourceFootnote(source: sourced.source, asOf: sourced.asOf)
        }
    }
}

struct EventRow: View {
    let event: EconomicEvent
    @State private var expanded = false
    @Environment(AppModel.self) private var app
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button {
            app.feedback.play(.cardExpand)
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.22)) { expanded.toggle() }
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: Spacing.xs) {
                    Text(event.scheduledAt, format: .dateTime.hour().minute())
                        .font(.tdNumericSmall)
                        .foregroundStyle(Theme.textSecondary)
                        .frame(width: 52, alignment: .leading)
                    ImportanceDots(importance: event.importance)
                    Text(event.currency)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Theme.textTertiary)
                    Text(event.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(2)
                    Spacer(minLength: 0)
                    Text(event.status.label)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(event.status == .scheduled ? Theme.textTertiary : Theme.accent)
                }
                HStack(spacing: Spacing.s) {
                    value("Actual", event.actual, emphasised: true)
                    value("Forecast", event.forecast)
                    value("Previous", event.revisedPrevious ?? event.previous)
                }
                if expanded {
                    Text(event.surpriseExplanation)
                        .font(.footnote)
                        .foregroundStyle(Theme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .transition(.opacity)
                    SourceFootnote(source: event.source)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityHint(expanded ? "Hides explanation" : "Explains forecast versus actual")
    }

    private func value(_ label: String, _ v: Double?, emphasised: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label).font(.caption2).foregroundStyle(Theme.textTertiary)
            Text(v.map { EconomicEventFormat.value($0) + event.unit } ?? "—")
                .font(emphasised ? .tdNumeric : .tdNumericSmall)
                .foregroundStyle(emphasised ? Theme.textPrimary : Theme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

enum EconomicEventFormat {
    static func value(_ v: Double) -> String { v.formatted(.number.precision(.fractionLength(0...2))) }
}

struct ImportanceDots: View {
    let importance: EventImportance

    var body: some View {
        HStack(spacing: 2) {
            ForEach(1...3, id: \.self) { level in
                Circle()
                    .fill(level <= importance.rawValue ? tone : Theme.hairline)
                    .frame(width: 5, height: 5)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(importance.label) importance")
    }

    private var tone: Color {
        switch importance {
        case .high: Theme.bearish
        case .medium: Theme.warning
        case .low: Theme.neutral
        }
    }
}

/// The nine-part intelligence breakdown required for every important story.
struct StoryDetailView: View {
    let story: NewsStory

    var body: some View {
        ZStack {
            AmbientBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.m) {
                    if story.provider.isDemo { DemoModeBanner() }
                    Text(story.headline)
                        .font(.tdTitle)
                        .foregroundStyle(Theme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    GlassCard {
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            detailRow("Original source", story.originalSource)
                            detailRow("Published", story.publishedAt.formatted(date: .abbreviated, time: .shortened))
                            detailRow("Event time", story.eventTime?.formatted(date: .abbreviated, time: .shortened) ?? "Not specified")
                            if let url = story.sourceURL { Link("Open original report", destination: url).font(.footnote.weight(.semibold)) }
                        }
                    }
                    block("What happened", text: story.whatHappened)
                    impactBlock("Why it may affect gold", story.goldImpact)
                    impactBlock("Why it may affect the dollar (DXY)", story.usdImpact)
                    list("Market mechanisms", story.mechanisms, icon: "gearshape.2")
                    list("Supporting evidence", story.supportingEvidence, icon: "plus.circle")
                    list("Opposing evidence", story.opposingEvidence, icon: "minus.circle")
                    list("What to monitor", story.watchItems, icon: "eye")
                    block("What would invalidate this reading", text: story.invalidation)
                    block("Observed price reaction",
                          text: story.observedReaction ?? "No observed reaction is recorded. The impacts above are theoretical expectations, not measured moves.")
                    DisclaimerFootnote()
                }
                .padding(.horizontal, Spacing.screenHorizontal)
                .padding(.bottom, Spacing.xl)
            }
        }
        .navigationTitle("Story")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func detailRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label).font(.caption).foregroundStyle(Theme.textTertiary)
            Spacer()
            Text(value).font(.footnote.weight(.medium)).foregroundStyle(Theme.textPrimary).multilineTextAlignment(.trailing)
        }
        .accessibilityElement(children: .combine)
    }

    private func block(_ title: String, text: String) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SectionHeader(title: title)
                Text(text).font(.tdCallout).foregroundStyle(Theme.textSecondary).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func impactBlock(_ title: String, _ impact: ImpactAssessment) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SectionHeader(title: title) {
                    Text(impact.direction.label)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(impact.direction.color)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(impact.direction.color.opacity(0.12), in: Capsule())
                }
                Text(impact.explanation).font(.tdCallout).foregroundStyle(Theme.textSecondary).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func list(_ title: String, _ items: [String], icon: String) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SectionHeader(title: title)
                if items.isEmpty {
                    Text("None recorded.").font(.footnote).foregroundStyle(Theme.textTertiary)
                }
                ForEach(items, id: \.self) { item in
                    Label(item, systemImage: icon)
                        .font(.footnote)
                        .foregroundStyle(Theme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

#Preview("News") {
    NewsView()
        .environment(AppModel.preview())
}

#Preview("Story detail") {
    NavigationStack {
        StoryDetailView(story: DemoIntelligence.stories(now: .now)[1])
    }
    .environment(AppModel.preview())
}
