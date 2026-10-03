# Development UI review | 0.2.0-dev.2

A separate criticism agent reviewed the source. These issues were corrected and covered where practical by behavior checks; this is not a claim of complete Note3 parity or physical-device validation.

| Before | After | Why |
| --- | --- | --- |
| Import settings appeared before file selection with mixed inline/stacked fields. | File selection first; stacked controls and responsive margin columns. | Easier sequence and consistent alignment. |
| Invalid margins removed the preview without explanation. | Immediate error message and disabled Import until corrected. | Prevent confusing failed imports. |
| File and pen menus could extend off short screens; dock CSS hid later menu items. | Bounded scrolling and independent menu-row sizing. | Every action remains reachable. |
| Undo/select shortcuts could act on the board while editing fields. | Field/dialog guards; temporary Space panning ignores text controls. | Typing remains separate from drawing. |
| Floating panels clamped against an assumed height. | Measured bounds and viewport resize observation. | Header and contents remain reachable. |
| Native confirmation/alert dialogs interrupted the UI. | Styled lesson-deletion confirmation and inline icon errors. | Consistent application feedback. |
| Scrollbars and field appearances differed. | Shared theme scrollbars, focus rings and field styles. | Consistent visual and keyboard feedback. |

Native select option popups and operating-system file/color pickers retain their accessible platform behavior. Future hardware testing should cover different smartboard touch drivers, long recordings and high-DPI displays.
