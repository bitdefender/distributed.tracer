import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CorpusService } from '../corpus.service';

@Component({
  selector: 'app-tests',
  templateUrl: './tests.component.html',
  styleUrls: ['./tests.component.css']
})
export class TestsComponent implements OnInit {
  private execId: string;
  private testId: string;
  private model: any;
  private loading: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private corpusService: CorpusService
  ) { }

  ngOnInit() {
    this.execId = this.route.snapshot.params['execId'];
    this.testId = this.route.snapshot.params['testId'];
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.corpusService.getTest(this.execId, this.testId)
      .subscribe(
        data => {
          this.model = data;
          this.loading = false;
        },
        error => {
          this.loading = false;
          this.router.navigate(["/err404"], { replaceUrl:true });
        }
      );
  }
}
