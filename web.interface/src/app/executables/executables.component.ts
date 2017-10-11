import { ChangeDetectionStrategy, Component, Input, OnInit } from "@angular/core";
import { PaginationInstance } from 'ngx-pagination';

import { Executable } from '../models/executable';
import { ExecutableService } from '../executable.service';


@Component({
  selector: 'app-executables',
  templateUrl: './executables.component.html',
  styleUrls: ['./executables.component.css'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ExecutablesComponent implements OnInit {
  public filter: string = '';
  public config: PaginationInstance = {
      id: 'advanced',
      itemsPerPage: 10,
      currentPage: 1
  };

  private popped = [];

  model: Executable[] = [];
  loading = false;

  constructor(
    private executableService: ExecutableService
  ) { }

  ngOnInit() {
    this.loadData();
  }

  onPageChange(number: number) {
    this.config.currentPage = number;
  }

  loadData() {
    this.loading = true;
    this.executableService.getAll()
      .subscribe(
        data => {
          this.model = data;
          this.loading = false;
        },
        error => {
          this.loading = false;
        }
      );
  }

}
