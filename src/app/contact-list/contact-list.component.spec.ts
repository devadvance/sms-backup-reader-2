import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { ContactListComponent } from './contact-list.component';
import { ContactSearchPipe } from '../components/pipes/contact-search-pipe';
import { SmsStoreService } from '../sms-store.service';

describe('ContactListComponent', () => {
    let component: ContactListComponent;
    let fixture: ComponentFixture<ContactListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FormsModule],
            declarations: [ ContactListComponent, ContactSearchPipe ],
            providers: [SmsStoreService],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        })
        .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ContactListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
