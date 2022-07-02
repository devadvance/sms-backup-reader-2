# SMS Backup Reader 2

[![Build Status](https://travis-ci.org/devadvance/sms-backup-reader-2.svg?branch=master)](https://travis-ci.org/devadvance/sms-backup-reader-2)

This is an Angular-based web app designed to read the XML backup files produced by the Android app SMS Backup & Restore by Ritesh. It is designed to work in modern browsers, including Chrome, Firefox, Edge, and Safari. This app works locally and your SMS data **does not** leave your machine.

This app is currently in alpha.

**You can access the app here: [http://mattj.io/sms-backup-reader-2/](http://mattj.io/sms-backup-reader-2/)**

## Features
* update to last version angular/cli: ~14.0.2 (JLTRY)
* Load SMS backup files produced by and Android app SMS Backup & Restore by Ritesh
* International support (non-latin character) and emoji support
* MSS support (thanks to JLTRY)
* VCF support (thanks to JLTRY)

## Issues

* Styles need serious work and overall UX is clunky
* All data is loaded into JS memory, which means:
* Large backups (>3,000 SMS) will freeze the UI until they are loaded
* Loading specific conversations may be slow and freeze the UI
* App breaks when using settings after loading data

If you encounter other issues, please add the issues here: [https://github.com/devadvance/sms-backup-reader-2/issues](https://github.com/devadvance/sms-backup-reader-2/issues).

## Roadmap (no timeline defined)

* Export SMS to CSV or TXT
* Support for exporting media from MMS
* More?

## Note about emoji and text handing in this app (mostly for devs)

SMS Backup & Restore saves emojis and other special characters in a very interesting way.

Likely, it goes back to how characters are encoded in SMS.

* If all characters in the SMS are English + a few extra, then it essentially stores them all as ASCII*
* If even one of the characters in the SMS is beyond the base character set, then the entire message is stored as UTF-16*

\*Not actually ASCII or UTF-16. There are GSM semi-equivalents. Of course it's not easy.

## License

SMS Backup Reader 2 is made available under the MIT license. See the LICENSE file for details.