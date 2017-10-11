/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { InfrastructureService } from './infrastructure.service';

describe('InfrastructureService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InfrastructureService]
    });
  });

  it('should ...', inject([InfrastructureService], (service: InfrastructureService) => {
    expect(service).toBeTruthy();
  }));
});
