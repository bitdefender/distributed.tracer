import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { InfrastructureService } from '../infrastructure.service';

@Component({
  selector: 'app-executable-details-resources',
  templateUrl: './executable-details-resources.component.html',
  styleUrls: ['./executable-details-resources.component.css']
})
export class ExecutableDetailsResourcesComponent implements OnInit {
  private id: string;
  loading = false;
  model: any = {};
  modelKeys: string[];
  values: any;
  oldValues: any;
  editable: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private infrastructureService : InfrastructureService
  ) { }

  ngOnInit() {
    this.id = this.route.pathFromRoot[1].snapshot.url[1].path;
    this.loadData();
  }

  toggleEdit() {
    this.editable = !this.editable;
  }

  setEditable() {
    this.oldValues = JSON.parse(JSON.stringify(this.values));
    this.editable = true;
  }

  runTest() {
    this.infrastructureService.runTest(this.id)
    .subscribe(
      data => {
        console.log("Run test OK");
      },
      error => {
        console.log("Run test failed");
      }
    );
  }

  applyEditable() {
    this.loading = true;
    this.infrastructureService.ensureRunning(this.id, this.values)
      .subscribe(
        data => {
          this.model = data;
          this.modelKeys = Object.keys(data);

          this.values = {};
          for (var i in this.modelKeys) {
            this.values[this.modelKeys[i]] = this.model[this.modelKeys[i]].running.length;
          }

          this.loading = false;
        },
        error => {
          this.loading = false;
        }
      );

    this.editable = false;
  }

  cancelEditable() {
    this.editable = false;
    this.values = this.oldValues;
  }

  loadData() {
    this.loading = true;
    this.infrastructureService.getExecStatus(this.id)
      .subscribe(
        data => {
          this.model = data;
          this.modelKeys = Object.keys(data);

          this.values = {};
          for (var i in this.modelKeys) {
            this.values[this.modelKeys[i]] = this.model[this.modelKeys[i]].running.length;
          }

          this.loading = false;
        },
        error => {
          this.loading = false;
        }
      );
  }

}
