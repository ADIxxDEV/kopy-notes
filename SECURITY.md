# Security

Report vulnerabilities privately to the repository owner's GitHub security advisory page. Enable private vulnerability reporting when publishing this repository. Do not put teacher/student data, signing keys, recordings or exploit credentials into public issues.

This version stores data locally and does not implement accounts or a multi-user server. Anyone with access to the same device/browser profile can open that library. Exported lesson archives are not encrypted. Use OS accounts and disk encryption where needed. Cloud sync must add authorization, quotas and recovery before deployment; never expose the obsolete experimental server routes.

Imported DOCX HTML is sanitized, the app does not run embedded PDF action scripts, and native shells isolate web content from Node. Native permissions are requested only for a selected camera/recording action. Keep dependencies current. Compressed document inputs can still exhaust resources; import trusted classroom materials and do not treat the app as a malware scanner.

## Automated checks

Security and privacy uses checksum-verified open-source Gitleaks for redacted history scans, source/build credential and personal-path checks, and dependency advisories. Checks cannot prove the absence of every leak. Lessons stay local unless explicitly exported; AI sends only typed prompts. No analytics endpoint is configured.
