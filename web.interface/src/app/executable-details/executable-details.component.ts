import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router, Routes } from '@angular/router';

import { NgbTabChangeEvent } from '@ng-bootstrap/ng-bootstrap';

import { Err404Component } from '../err404/err404.component';

import { ExecutableDetailsGeneralComponent } from '../executable-details-general/executable-details-general.component'
import { ExecutableDetailsCorpusComponent } from '../executable-details-corpus/executable-details-corpus.component';
import { ExecutableDetailsResourcesComponent } from '../executable-details-resources/executable-details-resources.component';
import { ExecutableDetailsTestsComponent } from '../executable-details-tests/executable-details-tests.component';
import { ExecutableDetailsGraphComponent } from '../executable-details-graph/executable-details-graph.component';

import { ExecutableService } from '../executable.service';
import { Executable } from '../models/executable';

@Component({
  selector: 'app-executable-details',
  templateUrl: './executable-details.component.html',
  styleUrls: ['./executable-details.component.css']
})
export class ExecutableDetailsComponent implements OnInit {

  private activeTab: string;
  private id: string;

  model: Executable;
  loading = false;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private executableService: ExecutableService
  ) { }

  ngOnInit() {
    //console.log(this.route.snapshot.url);
    this.id = this.route.snapshot.url[1].path;
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.executableService.getById(this.id)
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

export const ExecutablesRoutes: Routes = [
    {
        path: 'executables/:id',
        component: ExecutableDetailsComponent,
        children: [
            { path: '', redirectTo: 'general', pathMatch: 'full' },
            { path: 'general', component: ExecutableDetailsGeneralComponent },
            { path: 'corpus', component: ExecutableDetailsCorpusComponent },
            { path: 'resources', component: ExecutableDetailsResourcesComponent },
            { path: 'tests', component: ExecutableDetailsTestsComponent },
            { path: 'graph', component: ExecutableDetailsGraphComponent }
        ]
    }
];
