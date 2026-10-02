# Open-source release process

1. Create a separate public GitHub repository for Kopy Notes and push this project; no IPEC files, API keys, keystores or data should be included.
2. Enable GitHub Actions and private vulnerability reporting. Review LICENSE and THIRD_PARTY.md, and identify yourself as the maintainer in the repository description.
3. CI checks the web build and creates unsigned Windows and debug Android test artifacts. Download them under Actions. These test artifacts are not production-trusted releases.
4. Generate a dedicated Android release keystore through Android Studio's Generate Signed Bundle/APK wizard. Back up the keystore, alias and passwords outside Git. Add `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` as repository Actions **secrets**. Copy the full file's Base64 in PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\private\kopy-notes-release.jks')) | Set-Clipboard`. Never share the password or rotate the key between updates.
5. Update package.json version and CHANGELOG.md, run checks and test real smartboard hardware. Create a matching `v0.2.0-dev.1` tag and push the tag. The release workflow requires all three builds; a missing Android key stops publication instead of distributing a debug key.
6. The workflow creates a **draft prerelease** with web ZIP, Windows installer, signed APK, checksums and source archives. Windows is currently unsigned; say so in release notes. Review artifacts and device results before manually publishing the draft.

No release has been published yet. Runtime icon/name customization cannot rename the OS launcher/package after installation; customize build assets and IDs for a fork. Signing helps establish update identity, but does not guarantee Play Protect or SmartScreen will accept a new application.
