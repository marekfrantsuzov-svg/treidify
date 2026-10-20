# Getting Treidify onto an iPhone with TestFlight

Two GitHub Actions workflows run on GitHub's macOS machines, so no Mac or Xcode is needed locally.

- `.github/workflows/ios-ci.yml` runs on every push. It builds the app and runs the core, app and UI tests in the iOS Simulator. It needs no Apple account.
- `.github/workflows/testflight.yml` is started by hand from the Actions tab. It archives a signed build and uploads it to TestFlight.

## One-time setup (owner)
1. Join the Apple Developer Program (developer.apple.com/programs, US$99 a year).
2. In App Store Connect, go to Apps, then "+", then New App. Use the bundle ID `app.treidify.ios` and the name Treidify. If the name is taken, choose another display name.
3. In App Store Connect, go to Users and Access, then Integrations, then App Store Connect API. Create a key with the **App Manager** role. Note the Key ID and Issuer ID, and download the `.p8` file (it can only be downloaded once).
4. In the GitHub repository, go to Settings, then Secrets and variables, then Actions. Add these secrets: `APPLE_TEAM_ID` (from developer.apple.com, Membership), `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_KEY_P8` (paste the whole `.p8` file, including the BEGIN and END lines).
5. Install TestFlight on the iPhone. In App Store Connect, open TestFlight, then Internal Testing, and add yourself as a tester.

Secrets stay in GitHub's encrypted store. They are never committed and never shipped in the app.

## Blocker: app icon
App Store Connect rejects uploads that have no app icon. The approved logo has not been supplied, and no substitute is drawn, so the TestFlight workflow stops with a clear error until `tools/make_app_icon.py` has been run on the real artwork.

## Not verified
These workflows have not been run yet: no repository exists so far. Runner image names and the installed Xcode versions change over time, so the first run may need small adjustments.
