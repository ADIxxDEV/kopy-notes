# Contributing

Use a feature branch, run typecheck/tests/build, and add behavior tests for persistence or geometry changes. Include touch/keyboard screenshots for UI changes. Follow the reference layout; do not add tool panels permanently covering the writing area. Respect reduced motion and keep tool buttons large enough for smartboards. New tools must work offline or clearly document their optional local server. Avoid paid or proprietary dependencies.

Never rename or delete stored fields without a migration. Keep portable archives backward compatible; version the manifest when necessary. Never execute scripts from imported files. Release APK/EXE artifacts only after native testing and record which devices were tested.

## Community development

Anyone can fork the public repository, open an issue, or propose a pull request. Start with a small reproducible classroom problem; attach synthetic samples rather than real teacher/student files. Please discuss larger changes in an issue before implementation. Use semantic development versions such as 0.2.0-dev.1; stable labels require documented device validation. Maintainers review contributions before merging.
