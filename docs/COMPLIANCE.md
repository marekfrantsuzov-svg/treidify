# Compliance review items

Treidify's design choices (no execution, no custody, no signals, educational framing) reduce regulatory exposure. **They do not exempt it from regulation.** Everything below needs qualified legal review in each target market before release. Guideline numbers refer to the App Review Guidelines as I understand them (training data to mid-2026). **Re-read the live guidelines before building Milestone 2 and again before submission.**

## 1. Financial regulation (requires counsel, per jurisdiction)

| Feature | Risk | Notes |
|---|---|---|
| AI coach and personalised reviews (M5) | **High** | Commentary tailored to a user's own positions and history can look like *personal recommendation* (EU MiFID II investment advice, UK FCA PERG 8/13). The US publisher's exclusion (Lowe v. SEC) covers impersonal, general-circulation content and may not reach personalised output. Gold spot and FX commentary can also raise CFTC/NFA commodity trading advisor questions. Keep output descriptive (what happened, measured against the user's own rules), never prescriptive (what to trade next). |
| Market bias, scenarios, invalidation levels | Medium | Kept conditional and reproducible ("a close below X would invalidate…"), with no entry, stop or target instructions. Australia (ASIC) may still need a general-advice warning. |
| News impact classification (bullish/bearish) | Medium | Same analysis as above. Classifications must be justified and shown with opposing evidence, as implemented. |
| MT5 read-only analytics | Low–medium | Data protection is the main issue (financial data is sensitive in practice). No broker referral or affiliate links in V1. |
| Marketing claims | High if wrong | No profit, accuracy or win-rate claims in metadata, screenshots or onboarding. |

## 2. App Store Review Guidelines

| Guideline | Status / action |
|---|---|
| 2.1 App completeness | Nothing should be a dead end. In this build, unavailable features say so plainly ("Not available yet") rather than being non-functional buttons. Before submission, either ship them or remove the rows. A reviewer demo mode exists (Settings > Data). |
| 2.3 Accurate metadata | Describe the app as information, analytics and education. Screenshots must show demo data only if labelled, and real data only from licensed providers. |
| 3.1.1 / 3.1.2 In-app purchase | Premium unlock and subscriptions must use StoreKit (M6). **See §3 on the trial.** |
| 3.2.1 Financial apps | Treidify does not facilitate trading, so the "submitted by the financial institution" requirement for trading apps should not apply. Confirm when the MT5 integration is designed, and never add order placement. |
| 4.8 Login services | Google Sign-In requires an equivalent privacy-focused option. Sign in with Apple satisfies this and is planned. |
| 5.1.1 Data collection | Account deletion must be available in-app once accounts exist (M2). Data export is planned. |
| 5.1.2 Data use and sharing | Sending trade history to a third-party AI (Claude API) needs clear disclosure and consent before sharing. Recent guideline revisions explicitly address third-party AI, so check the current wording. |
| 5.2 Intellectual property | No Bloomberg, Forex Factory, MetaQuotes or broker names or logos used as endorsements. "MetaTrader 5" may be used descriptively; check MetaQuotes' trademark terms. "DXY" / "US Dollar Index" is an ICE trademark (see DATA_PROVIDERS.md). |
| Privacy manifest | `PrivacyInfo.xcprivacy` declares UserDefaults (CA92.1), no tracking and no collected data. Update it as M2+ adds data collection and SDKs (the Google Sign-In SDK ships its own manifest). |
| Privacy nutrition label | Currently "Data Not Collected". This changes with accounts, MT5 data and analytics. |

## 3. The 72-hour no-payment trial (decision needed before M2)

The spec asks for an app-managed, server-controlled 72-hour trial with no payment card and no automatic billing. **Guideline 3.1.1 says non-subscription apps that offer a time-based free trial should do it through a non-consumable IAP priced at zero, named in the form "72-hour Trial".** An entitlement that the app grants itself to unlock paid digital features, outside StoreKit, risks rejection.

Recommended design, which still meets every requirement in the spec:
1. Create a **$0 non-consumable IAP "72-hour Premium Trial"** in App Store Connect.
2. Show an explicit *Start Free Trial* button that buys it through StoreKit 2. There is no charge and no renewal. Confirm whether a payment method is required for a $0 item.
3. The app sends the signed transaction (JWS) to the backend. The backend verifies it with the App Store Server API, records `trial_started_at` against the **account identity** and the original transaction ID, and enforces expiry server-side. This means reinstalling or using another device cannot reset the trial.
4. When the trial expires, the free tier continues and an optional subscription offer is shown (M6). Nothing is charged automatically.

Alternative: offer the trial as an introductory free trial on the subscription itself. This is rejected here, because it auto-renews into a paid plan unless the user cancels, which the spec forbids.

## 4. Disclaimers and legal documents

- The disclaimer text is used verbatim in onboarding (acknowledgement required, versioned in `AppSettings.currentDisclosureVersion`) and in Settings > Legal.
- The privacy policy and terms in `LegalText.swift` are **drafts labelled as drafts**. They must be replaced with counsel-approved text, hosted at public URLs and linked in App Store Connect.

## 5. Security notes for later milestones

- No secrets in the app binary. Provider keys, the Anthropic key and App Store Server API keys stay on the server.
- MT5: request the **investor (read-only) password** only, never the master or trading password, and never withdrawal credentials. Encrypt it at rest with KMS, give the user a revoke/disconnect action, and prefer connectors that avoid storing credentials at all.
- Keychain for session tokens; `LAContext` for Face ID with device-passcode fallback. No biometric data is ever accessed or stored.
