import { TestBed } from '@angular/core/testing';

import { SmsStoreService } from './sms-store.service';

describe('SmsStoreService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SmsStoreService],
        });
    });

    it('should be created', () => {
        const service = TestBed.inject(SmsStoreService);
        expect(service).toBeTruthy();
    });
});
