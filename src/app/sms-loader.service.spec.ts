import { TestBed } from '@angular/core/testing';

import { SmsLoaderService } from './sms-loader.service';

describe('SmsLoaderService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SmsLoaderService],
        });
    });

    it('should be created', () => {
        const service = TestBed.inject(SmsLoaderService);
        expect(service).toBeTruthy();
    });
});
