/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { SmsStoreService } from './sms-store.service';

describe('SmsStoreService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SmsStoreService]
        });
    });

    it('should ...', inject([SmsStoreService], (service: SmsStoreService) => {
        expect(service).toBeTruthy();
    }));
});
