import { SmsBackupReader2Page } from './app.po';

describe('sms-backup-reader-2 App', function() {
    let page: SmsBackupReader2Page;

    beforeEach(() => {
        page = new SmsBackupReader2Page();
    });

    it('should display message saying app works', () => {
        page.navigateTo();
        expect(page.getParagraphText()).toEqual('app works!');
    });
});
