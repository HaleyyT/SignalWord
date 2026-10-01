# Required iOS build configuration

Debug and Release now fail closed when their backend configuration is absent or wrong. There is no simulator/test bypass. Supply the intended external xcconfig when building or archiving.

The pinned project is signalword-dev, ref voepalyamwgenceawdvl. Config/validate-build-environment.py is the reviewed source of this expected identity. Changing environments requires an explicit source change and renewed acceptance; changing only an external URL cannot silently redirect the build.

Checks before compilation:
- Supabase URL, user API URL and public/anon key must be populated, trimmed and resolved.
- URLs must exactly equal the expected HTTPS origin and its /functions/v1/user-api endpoint. Localhost, HTTP, placeholder hosts, alternate projects, credentials, query strings and unexpected paths fail in both configurations.
- Legacy JWT must identify role anon and the expected project. Secret/service-role and placeholder keys fail. An opaque sb_publishable key must have the public format; actual server-side membership cannot be established offline and still needs hosted login verification.

A second always-run phase reads the processed app Info.plist, compares all three values byte-for-byte with build settings, and also compares verification URL, Turnstile site key and RevenueCat public key. Mismatch or missing plist fails the build before signing. Both phases run on incremental builds as well. Diagnostics name the invalid setting without printing its contents.

Example for this machine:

```sh
xcodebuild -project apps/ios/SignalWord.xcodeproj -scheme SignalWord \
  -configuration Release -xcconfig /private/tmp/signalword-signing-preparation/Development.xcconfig \
  -destination 'generic/platform=iOS' archive
```

UI runner accepts the same external configuration:

```sh
SIGNALWORD_XCCONFIG=/private/tmp/signalword-signing-preparation/Development.xcconfig \
  bash scripts/test-ios-ui.sh
```

The external file is machine-local; do not commit credentials or use a failed build's retained older app as a new candidate. These guards prove configuration consistency, not production readiness, endpoint availability, or successful reviewer authentication.
