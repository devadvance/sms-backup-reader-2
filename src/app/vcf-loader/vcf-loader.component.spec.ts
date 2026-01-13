import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VcfLoaderComponent } from './vcf-loader.component';
import { VcfLoaderService } from '../vcf-loader.service';

describe('VcfLoaderComponent', () => {
  let component: VcfLoaderComponent;
  let fixture: ComponentFixture<VcfLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VcfLoaderComponent ],
      providers: [VcfLoaderService],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VcfLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
