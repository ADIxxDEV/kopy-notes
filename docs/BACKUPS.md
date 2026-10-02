# Backups and recovery

Completed board edits are saved after a short 100 ms delay. Every 30 seconds while a lesson is open, the app makes a portable snapshot including its pages and imported files, retaining three versions. A snapshot is also taken before deleting a page or lesson. Storage failures block the destructive operation.

Open **Backups** at the upper left and choose **Enable folder backup** in desktop Chrome or Edge. Select a folder outside the app installation and browser profile. Three `.kopy` files rotate per lesson. Writes replace a slot only when its new file is closed successfully. The app reports local-only status when folder permission is unavailable; re-enable permission after a restart when needed. Android and browsers without a folder picker can use **Download backup**.

Local recovery copies remain in browser storage and are erased when all site data is cleared. Only files saved outside that storage survive site-data clearing or app uninstall, provided the folder itself is retained. A folder on the same PC does not protect against disk failure: periodically copy it to a different drive. No browser can guarantee the last uncommitted stroke or in-progress file write survives sudden power loss.

**Restore as copy** preserves the current lesson. After reinstalling or clearing site data, create a lesson, open **Import**, and choose a saved `.kopy` file. Reconnect the backup folder to resume automatic external copies. Recordings are downloaded separately and are not inside lesson backups.
