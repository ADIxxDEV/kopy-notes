# Open-source release process

Kopy Notes belongs in a separate public GitHub repository. Keep IPEC files, API keys, keystores and private data out of it. Enable GitHub Actions and private vulnerability reporting, review LICENSE and THIRD_PARTY.md, and identify the maintainer in the repository description.

## Development prereleases

1. Update package.json, package-lock.json and CHANGELOG.md to the same `X.Y.Z-dev.N` version, such as `0.2.0-dev.2`. Run the checks and test real smartboard hardware.
2. Commit the changes, create the matching tag (`git tag v0.2.0-dev.2`) and push the commit and tag to the public repository.
3. The release workflow validates the tag/version, runs web tests and browser checks, and builds all three platforms. Once every job succeeds, it automatically publishes a public **prerelease** with a clearly named debug Android APK, unsigned Windows installer, web ZIP, SHA256SUMS.txt, and GitHub source archives. It never marks the prerelease as the latest stable release.

Development tags need no Android signing secrets. The APK uses a temporary debug key, not the stable release key. Android may refuse to update a debug installation from another workflow run or replace a stable signed installation. Export notes before uninstalling an existing app. The unsigned Windows installer may trigger SmartScreen. These are development builds, not production trusted or store approved releases.

Manual runs use the same rules: select an existing matching version **tag** under Run workflow. Selecting a branch, a mismatched tag, or an unsupported prerelease version fails validation before any build or publication. Pushing a matching development tag is the normal automatic release path.

## Stable version tags

Stable tags such as `v0.2.0` require the dedicated Android release key. Generate it through Android Studio's Generate Signed Bundle/APK wizard, back up the keystore, alias and passwords outside Git, and configure these repository Actions **secrets**:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Copy the full keystore's Base64 in PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\private\kopy-notes-release.jks')) | Set-Clipboard`. Never share passwords or rotate the key between updates.

Update version metadata and changelog, commit, and push a matching stable tag. Missing signing secrets stop the release; stable tags never substitute a debug key. The workflow creates a **draft prerelease** containing the signed Android APK, unsigned Windows installer, web ZIP and checksums. Review artifacts and device results before publishing it and deciding whether to change its prerelease status. Signing establishes update identity but does not guarantee Play Protect or SmartScreen acceptance.

## Verify downloaded files

Download SHA256SUMS.txt, the APK, EXE and web ZIP into one directory. On systems with sha256sum, run `sha256sum -c SHA256SUMS.txt`. In PowerShell, use `Get-FileHash -Algorithm SHA256 <filename>` and compare each result with SHA256SUMS.txt. Checksums detect changed bytes; they do not imply a signed or store approved application.

CI also supplies unsigned Windows and debug Android test artifacts under Actions. Runtime icon/name customization cannot rename the OS launcher/package after installation; customize build assets and IDs for a fork.

## Packaging dependency pins

Use Node 24 as in the workflows. The scoped app-builder-lib override selects @electron/get 5.1.0, whose native fetch downloader removes the affected HTTP-cache dependency chain. Capacitor CLI 8.4.3 remains on the compatible 8.x line and avoids the legacy UUID chain; Android core stays 8.5.2. Review these pins when upgrading, run npm audit, and verify fresh native builds. The release web job must pass the high-severity audit before publishing.
