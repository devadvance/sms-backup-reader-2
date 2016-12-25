/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { SmsLoaderService } from './sms-loader.service';

describe('SmsLoaderService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SmsLoaderService]
        });
    });

    it('should ...', inject([SmsLoaderService], (service: SmsLoaderService) => {
        expect(service).toBeTruthy();
    }));
});
