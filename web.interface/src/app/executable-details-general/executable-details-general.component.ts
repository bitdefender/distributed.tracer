import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ExecutableService } from '../executable.service';
import { Executable } from '../models/executable';

@Component({
  selector: 'app-executable-details-general',
  templateUrl: './executable-details-general.component.html',
  styleUrls: ['./executable-details-general.component.css']
})
export class ExecutableDetailsGeneralComponent implements OnInit {

  private id: string;
  model: Executable;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private executableService: ExecutableService
  ) { }

  ngOnInit() {
    this.id = this.route.pathFromRoot[1].snapshot.url[1].path;
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
