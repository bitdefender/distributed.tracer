import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable } from 'rxjs/Observable';

import { PaginationInstance } from 'ngx-pagination';

import { CorpusService } from '../corpus.service';

@Component({
  selector: 'app-executable-details-tests',
  templateUrl: './executable-details-tests.component.html',
  styleUrls: ['./executable-details-tests.component.css']
})
export class ExecutableDetailsTestsComponent implements OnInit {

  public id: string;
  private loading: Boolean = false;
  private tests: any[];
  private testsinfo: any[];

  private options = [
    {id: '1', name: 'pass', checked: true, icon: 'fa-check text-success'},
    {id: '2', name: 'fail', checked: true, icon: 'fa-times text-warning'}
  ]

  public config: PaginationInstance = {
      id: 'advanced',
      itemsPerPage: 10,
      currentPage: 1,
      totalItems: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private corpusService: CorpusService
  ) { }

  ngOnInit() {
    this.id = this.route.pathFromRoot[1].snapshot.url[1].path;
    this.loadData(0, this.config.itemsPerPage, this.getSelectedOptionsResult());
  }

  onPageChange(page: number) {
    this.loadData((page - 1) * this.config.itemsPerPage,
                  this.config.itemsPerPage, this.getSelectedOptionsResult());
  }

  onCheckResult(option) {
    this.loadData((this.config.currentPage - 1) * this.config.itemsPerPage,
                  this.config.itemsPerPage, this.getSelectedOptionsResult());
  }

  loadData(start: number, count: number, options) {
    this.loading = true;
    this.corpusService.getTests(this.id, start, count, options)
      .subscribe(
        data => {
          this.tests = data.tests;
          this.config.totalItems = data.total;
          this.config.currentPage = (start / this.config.itemsPerPage) + 1;
          this.loading = false;
        },
        error => {
          this.loading = false;
          this.router.navigate(["/err404"], { replaceUrl:true });
        }
      );
  }

  getSelectedOptionsResult() {
    return this.options
      .filter(opt => !opt.checked)
      .map(opt => opt.name);
  }

}
