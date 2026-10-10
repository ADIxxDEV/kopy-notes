# Releases and large assets

Release files are generated from a version tag that matches package.json, package-lock.json and CHANGELOG.md. Development tags use vX.Y.Z-dev.N. Manual release runs must select a matching tag, not main.

1. Update the version and changelog, then run npm test, npm run build and node scripts/check-release.mjs.
2. Push the changes and wait for Build and test to pass on the exact commit.
3. Create and push the matching version tag. The Build release workflow builds web, Windows and Android and runs the browser/device checks.
4. Publishing requires every build and check to succeed. The release includes the web ZIP, unsigned Windows installer, Android APK and SHA256SUMS.txt.

Development releases are marked as prereleases. Development APKs use a temporary debug key; stable Android builds require the documented signing secrets. Stable releases remain drafts for review. Installer and APK files belong in GitHub Release assets, not the source repository.

## Git LFS

Current tracked files are all below 1 MB. Small PNG icons, screenshots and the JSON theme pack remain ordinary Git files.

.gitattributes configures LFS for large source formats: PSD, Krita, XCF, Blender and MP4. Workflow checkouts hydrate LFS objects before building. Before adding these formats, run git lfs install. For a different large binary source, run git lfs track with its specific file path and commit .gitattributes together with the file.

Do not migrate existing history or put build outputs, APKs, installers, private notes or keystores in LFS. Exported user lessons and generated release files remain ignored.
