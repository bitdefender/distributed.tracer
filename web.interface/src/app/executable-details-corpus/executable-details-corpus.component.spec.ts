/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { ExecutableDetailsCorpusComponent } from './executable-details-corpus.component';

describe('ExecutableDetailsCorpusComponent', () => {
  let component: ExecutableDetailsCorpusComponent;
  let fixture: ComponentFixture<ExecutableDetailsCorpusComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExecutableDetailsCorpusComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExecutableDetailsCorpusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
