import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { CountrySelectComponent } from './country-select.component';
import { SmsStoreService } from '../sms-store.service';
import { VcfStoreService } from '../vcf-store.service';

describe('CountrySelectComponent', () => {
    let component: CountrySelectComponent;
    let fixture: ComponentFixture<CountrySelectComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FormsModule],
            declarations: [ CountrySelectComponent ],
            providers: [SmsStoreService, VcfStoreService],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        })
        .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CountrySelectComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
