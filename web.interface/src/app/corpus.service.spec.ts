/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { CorpusService } from './corpus.service';

describe('CorpusService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CorpusService]
    });
  });

  it('should ...', inject([CorpusService], (service: CorpusService) => {
    expect(service).toBeTruthy();
  }));
});
