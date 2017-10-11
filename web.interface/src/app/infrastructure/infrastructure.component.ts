import { Component, OnInit } from '@angular/core';

import { InfrastructureService } from '../infrastructure.service';

@Component({
  selector: 'app-infrastructure',
  templateUrl: './infrastructure.component.html',
  styleUrls: ['./infrastructure.component.css']
})
export class InfrastructureComponent implements OnInit {
  model: any = {};
  modelKeys: string[] = [];
  loading = false;
  editable: boolean = false;

  constructor(
    private infrastructureService : InfrastructureService
  ) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.infrastructureService.getStatus()
      .subscribe(
        data => {
          this.model = data;
          this.modelKeys = Object.keys(data);
          this.loading = false;
        },
        error => {
          this.loading = false;
        }
      );
  }

  toggleEdit() {
    this.editable = !this.editable;
  }

  terminateProcess(pmid) {
    this.infrastructureService.terminateProcess(pmid)
      .subscribe(
        data => {
          this.loadData();
        },
        error => {
        }
      );
  }
}
