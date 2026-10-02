# Drive, OneDrive and other storage destinations

Open **Backups**, select a destination label, then **Enable folder backup**. Choose a folder managed by your provider's installed desktop sync app. Repeat to add another destination. Kopy writes the three rotating `.kopy` files to every connected folder with permission. **Disconnect** stops future writes without deleting files.

For Google Drive, use a mirrored folder or a folder available offline in Drive for desktop. [Google's setup guide](https://support.google.com/drive/answer/13401938) explains the storage modes. For OneDrive, choose a local folder included in its sync settings. [Microsoft's sync guide](https://support.microsoft.com/en-us/onedrive/sync-your-computer-s-files-and-folders-with-onedrive) explains how local and online files are synchronized. Other folder destinations can be managed by a compatible installed provider.

Kopy reports successful **folder writes**, not completed cloud uploads. Check the provider's status before clearing local data or changing PCs. Provider sync must be installed, signed in and running. Desktop Chrome/Edge provides the folder picker; Android browsers can download a `.kopy` file and upload it through their provider app.

This is file backup and restoration. It does not merge simultaneous editing on several devices. Direct Google/Microsoft OAuth connections are not configured in this release; they require registered application credentials and redirects. No provider secret or paid API is bundled.
