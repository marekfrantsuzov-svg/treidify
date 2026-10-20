import SwiftUI

/// The primary floating surface: translucent glass with a hairline edge, a soft
/// top reflection and a restrained shadow.
///
/// - Reduce Transparency: switches to an opaque surface.
/// - iOS 26+: uses the system Liquid Glass material when built with Xcode 26.
/// The material is static (no animated blur), so it is cheap to scroll.
struct GlassCard<Content: View>: View {
    var padding: CGFloat = Spacing.m
    @ViewBuilder var content: Content

    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .modifier(GlassBackground(shape: shape, reduceTransparency: reduceTransparency))
            .overlay {
                shape.strokeBorder(
                    LinearGradient(colors: [Theme.reflection, Theme.hairline, Theme.hairline],
                                   startPoint: .top, endPoint: .bottom),
                    lineWidth: 0.75)
            }
            .shadow(color: Theme.shadow, radius: 16, x: 0, y: 8)
    }
}

private struct GlassBackground<S: Shape>: ViewModifier {
    let shape: S
    let reduceTransparency: Bool

    func body(content: Content) -> some View {
        if reduceTransparency {
            content.background(shape.fill(Theme.surfaceOpaque))
        } else {
            #if compiler(>=6.2)
            if #available(iOS 26.0, *) {
                content
                    .background(shape.fill(Theme.surfaceTint))
                    .glassEffect(.regular, in: shape)
            } else {
                content.background { materialFill }
            }
            #else
            content.background { materialFill }
            #endif
        }
    }

    private var materialFill: some View {
        shape.fill(.ultraThinMaterial).overlay(shape.fill(Theme.surfaceTint))
    }
}

/// A recessed area inside a card (e.g. a metric well).
struct InsetSurface<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(Spacing.s)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.surfaceInset, in: RoundedRectangle(cornerRadius: Radius.inner, style: .continuous))
    }
}

/// Near-invisible ambient background: two soft glows drifting very slowly.
/// Stops entirely with Reduce Motion. Only offsets are animated, which the
/// render server handles without re-rasterising the gradients.
struct AmbientBackground: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drift = false

    var body: some View {
        ZStack {
            LinearGradient(colors: [Theme.backgroundTop, Theme.backgroundBottom], startPoint: .top, endPoint: .bottom)
            RadialGradient(colors: [Theme.ambientGlow, .clear], center: .topTrailing, startRadius: 10, endRadius: 460)
                .offset(x: drift ? -24 : 16, y: drift ? 18 : -8)
            RadialGradient(colors: [Theme.ambientGlowSecondary, .clear], center: .bottomLeading, startRadius: 10, endRadius: 520)
                .offset(x: drift ? 20 : -12, y: drift ? -16 : 10)
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 28).repeatForever(autoreverses: true)) { drift = true }
        }
    }
}
