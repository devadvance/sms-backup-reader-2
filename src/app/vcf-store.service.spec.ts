import { TestBed, inject } from '@angular/core/testing';

import { VcfStoreService } from './vcf-store.service';

describe('VcfStoreService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VcfStoreService]
    });
  });

  it('should be created', inject([VcfStoreService], (service: VcfStoreService) => {
    expect(service).toBeTruthy();
  }));
});
