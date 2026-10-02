# Improve Kopy Notes

Prioritize classroom reliability before adding a large number of toolbar buttons.

1. **Writing quality:** test actual Android/Windows smartboards at 60/120 Hz; collect pointer latency, stylus pressure, palm rejection and eraser behavior. Add coalesced pointer samples and pressure-based stroke widths, then prevent accidental gesture erasure. Do not guess that every digitizer supports the same events.
2. **Geometry:** replace decorative guides with tools that constrain strokes to ruler edges and compass arcs. Add scalable, rotatable transparent instruments without rotating their control buttons. Calibrate physical units per display.
3. **Safe work:** local revision snapshots, trash/restore, reliable save-on-navigation, portable backups with all files, storage-use warnings and full multi-page PDF export. These should work without a server.
4. **Recording:** native disk streaming and recoverable chunks for long lessons; optional camera/mic selection; timestamps connecting recording to pages. Avoid keeping hours of encoded video only in browser memory.
5. **Reference parity:** multi-object groups/locks/layers, preparation/presentation/desktop modes, subject workspaces, reusable local resources and accurate subject tools. Use the feature matrix to check each behavior.
6. **Access:** Hindi/English translations, high contrast, keyboard controls, readable touch targets and arbitrary canvas/export aspect ratios. Test 4:3, 16:9, ultrawide and portrait.
7. **Recognition:** evaluate genuinely open models for handwriting/math recognition on a local machine; expose confidence and allow correction. Keep paid APIs optional and out of the default build.
8. **Sharing:** optional self-hosted sync with explicit permissions and conflict handling. Keep offline use possible. A teacher should never lose a lesson because a server is unavailable.

For each improvement: specify the behavior, implement it, test persistence/geometry where appropriate, compare against the supplied screenshot, and verify it on hardware before marking it complete.
