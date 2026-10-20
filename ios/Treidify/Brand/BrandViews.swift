import SwiftUI
import UIKit

/// The approved Treidify symbol (blue/silver geometric T with ascending
/// candlesticks), loaded from the `BrandMark` image set.
///
/// The artwork is intentionally NOT redrawn in code: the official reference
/// file must be placed in Assets.xcassets/BrandMark.imageset (see
/// docs/BRAND_ASSETS.md). Until it is, nothing is drawn rather than an
/// invented substitute.
struct BrandMark: View {
    var size: CGFloat = 44

    static var isAvailable: Bool { UIImage(named: "BrandMark") != nil }

    var body: some View {
        if Self.isAvailable {
            Image("BrandMark")
                .resizable()
                .interpolation(.high)
                .scaledToFit()
                .frame(width: size, height: size)
                .accessibilityLabel("Treidify")
        }
    }
}

/// Typeset wordmark. Uses the system typeface until the approved wordmark
/// artwork (`Wordmark` image set) is supplied, at which point the image is used.
struct Wordmark: View {
    var showsTagline = false
    var textStyle: Font.TextStyle = .title

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if UIImage(named: "Wordmark") != nil {
                Image("Wordmark")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 28)
                    .accessibilityLabel("Treidify")
            } else {
                Text("Treidify")
                    .font(.system(textStyle, design: .default, weight: .semibold))
                    .tracking(0.5)
                    .foregroundStyle(
                        LinearGradient(colors: [Theme.textPrimary, Theme.silver], startPoint: .top, endPoint: .bottom)
                    )
            }
            if showsTagline {
                Text("Your Trading Intelligence.")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Theme.accent)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// Symbol + wordmark lockup for onboarding and headers.
struct BrandLockup: View {
    var showsTagline = true

    var body: some View {
        HStack(spacing: Spacing.s) {
            BrandMark(size: 52)
            Wordmark(showsTagline: showsTagline)
        }
    }
}
