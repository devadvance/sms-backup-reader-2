import { TestBed } from '@angular/core/testing';

import { VcfStoreService } from './vcf-store.service';

describe('VcfStoreService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VcfStoreService],
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(VcfStoreService);
    expect(service).toBeTruthy();
  });
});
