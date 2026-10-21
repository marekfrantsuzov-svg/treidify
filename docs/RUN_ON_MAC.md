# Run Treidify on your Mac and iPhone

This guide uses a free Apple ID. No paid developer account, TestFlight or App Store Connect is needed.

## What you need
- **Xcode:** Xcode 26 is recommended. It needs macOS 15.6 or later, and it is required if your iPhone runs iOS 26.
  - Xcode 16 also builds the project (CI checks this), but it cannot install onto an iPhone running iOS 26.
- **Disk space:** about 40 GB free for Xcode and an iOS Simulator.
- **iPhone (optional):** iOS 17 or later, plus a USB cable.

## 1. Install Xcode (once)
1. Update macOS: open System Settings, then General, then Software Update.
2. Install **Xcode** from the Mac App Store, then open it once.
3. When Xcode asks which platforms to install, tick **iOS**. You can also add it later in Xcode, then Settings, then Components.

## 2. Get the project
Use either option.

**Option A: Xcode clone (best for ongoing updates)**
1. Xcode, then Settings, then Accounts, then **+**, then GitHub. Sign in.
2. Close Settings. In the Xcode welcome window, choose **Clone Git Repository**, then pick `marekfrantsuzov-svg/treidify` and choose a folder, for example `~/Developer`.
3. To get new versions later, use Integrate, then Pull, in Xcode's menu.

**Option B: Terminal**
```bash
mkdir -p ~/Developer && cd ~/Developer
git clone https://github.com/marekfrantsuzov-svg/treidify.git
open treidify/ios/Treidify.xcodeproj
```
The repository is private, so Git asks for your GitHub username and a personal access token. Your GitHub password does not work here.

For later updates: `cd ~/Developer/treidify && git pull`

## 3. Open the right project
Open **`ios/Treidify.xcodeproj`**, not the `Packages` folder. Xcode resolves the local `TreidifyCore` package automatically. There are no third-party dependencies to download, and you do not need XcodeGen.

## 4. Run in the iPhone Simulator
1. In the toolbar, check that the scheme says **Treidify**.
2. Click the device menu next to it and choose a simulator, for example **iPhone 17 Pro**.
3. Press **⌘R** (Product, then Run). The Simulator opens and Treidify launches with onboarding.

No signing is needed for the Simulator.

## 5. Run on your iPhone (free Apple ID)
1. **Add your Apple ID:** Xcode, then Settings, then Accounts, then **+**, then Apple ID.
2. **Set up signing:**
   - In the left sidebar, click the blue **Treidify** project, then the **Treidify** target, then the **Signing & Capabilities** tab.
   - Tick **Automatically manage signing**.
   - Set **Team** to *Your Name (Personal Team)*.
   - If Xcode reports that the bundle identifier is unavailable, change **Bundle Identifier** to something unique, such as `app.treidify.marek`.
3. **Connect your iPhone:** connect it with the cable, unlock it and tap **Trust This Computer**.
4. **Turn on Developer Mode:** on the iPhone, open Settings, then Privacy & Security, then **Developer Mode**, and turn it on. The iPhone restarts; confirm when it asks. The switch appears only after the iPhone has been connected to Xcode once.
5. **Install the app:** in Xcode's device menu, choose your iPhone, then press **⌘R**.
6. **Trust your certificate:** the first launch is blocked until you trust it. On the iPhone, open Settings, then General, then **VPN & Device Management**. Tap your Apple ID under Developer App, then **Trust**. Press ⌘R again.

### Limits of a free Apple ID
- The app stops opening after **7 days**. Connect the iPhone and press ⌘R to re-sign it. Your app data is kept.
- You can have up to 3 of your own apps on a device at a time.

## What is real and what is demo
| Area | State |
|---|---|
| Navigation, themes, haptics, sounds, onboarding, settings | Working |
| Bias, levels, volatility, performance and coach calculations | Working (deterministic, unit-tested), run on demo data |
| Prices, candles, news stories, calendar, MT5 account | **Demo data**, labelled DEMO. No live provider is connected yet |
| Live market data, live news, MT5 connection, trial and subscription | Not built yet (later milestones) |
| App icon and logo | Empty until the approved artwork is supplied |

## Troubleshooting
- **"No such module TreidifyCore":** use File, then Packages, then Reset Package Caches, then build again.
- **Signing errors after changing the Team:** use Product, then Clean Build Folder (⇧⌘K), then run again.
- **The iPhone shows as unavailable or "preparing":** keep it unlocked and connected. Xcode copies debug support for its iOS version the first time, which can take several minutes.
