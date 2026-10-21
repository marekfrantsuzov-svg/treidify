# Install the Treidify test builds (no Xcode needed)

Every push to `main` runs the **Test builds** workflow on GitHub. It produces two downloads of the real app, built from the same code:

| Download | For | Contents |
|---|---|---|
| `Treidify-Mac-buildN` | Your Mac (Apple silicon or Intel, macOS 14 or later) | `Treidify-Mac-buildN.dmg`: the Mac version of the app (Mac Catalyst), in a phone-shaped window |
| `Treidify-iPhone-buildN` | Your iPhone (iOS 17 or later) | `Treidify-iPhone-buildN-unsigned.ipa`, which Sideloadly signs with your free Apple ID |

## Download
1. Sign in to GitHub and open **github.com/marekfrantsuzov-svg/treidify/actions/workflows/test-builds.yml**.
2. Click the newest run that has a green tick.
3. Scroll down to **Artifacts** and click the one you want. GitHub downloads it as a `.zip` file.
4. Double-click the `.zip` in Downloads to get the `.dmg` or `.ipa`.

Downloads are kept for 30 days. To make a fresh build, click **Run workflow** on the same page.

## Mac
1. Double-click `Treidify-Mac-buildN.dmg`, then drag **Treidify** onto **Applications**.
2. Open Treidify from Applications. macOS will warn that it cannot verify the developer. This happens because the build is signed for testing, not by a paid Apple Developer account. Click **Done**.
3. Open **System Settings**, then **Privacy & Security**, and scroll to the bottom. Next to "Treidify was blocked", click **Open Anyway**, then enter your password.
4. Treidify opens. You only need to do this once per build.

If macOS says the app "is damaged", run this once in Terminal, then open it again:
```bash
xattr -dr com.apple.quarantine /Applications/Treidify.app
```

## iPhone (free Apple ID, using Sideloadly)
1. Download **Sideloadly** for macOS from **sideloadly.io**, the official site, and install it.
2. Connect your iPhone with a cable, unlock it and tap **Trust This Computer**.
3. Open Sideloadly. Drag `Treidify-iPhone-buildN-unsigned.ipa` into it, enter your Apple ID email and click **Start**.
   - Sideloadly asks for your Apple ID password, and a verification code if you use two-factor authentication.
   - The password goes to Apple to create a free development certificate. Use an Apple ID you are comfortable using for this.
4. **Turn on Developer Mode:** on the iPhone, open Settings, then Privacy & Security, then **Developer Mode**, and turn it on. The iPhone restarts; confirm when asked.
5. **Trust your certificate:** open Settings, then General, then **VPN & Device Management**, tap your Apple ID, then **Trust**.
6. Open Treidify from the Home Screen.

### Free Apple ID limits
- The iPhone app stops opening after **7 days**. Run Sideloadly again with the same IPA, or a newer one, to renew it. Your app data is kept.
- A free Apple ID can have up to 3 sideloaded apps on a device at a time.

## What works and what is demo data
| Area | State |
|---|---|
| All five tabs, onboarding, settings, themes, haptics (iPhone), sounds | Working |
| Bias, support and resistance, volatility, journal statistics and coach observations | Working calculations (unit-tested), run on demo data |
| Prices, candles, news, calendar and the MT5 account | **Demo data**, labelled DEMO. No live provider is connected yet |
| Live prices, live news, MT5 connection, trial and subscription | Not built yet |
| App icon and logo | Empty until the approved artwork is supplied |

The Mac version has no haptics, and the chart is inspected by clicking and dragging.

## Later: App Store and TestFlight
`.github/workflows/testflight.yml` and `docs/TESTFLIGHT.md` are kept for when you join the Apple Developer Program. Nothing above depends on them.
