import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CorpusService } from '../corpus.service';
//import { ExecutableService } from '../executable.service';

@Component({
  selector: 'app-executable-details-corpus',
  templateUrl: './executable-details-corpus.component.html',
  styleUrls: ['./executable-details-corpus.component.css']
})
export class ExecutableDetailsCorpusComponent implements OnInit {

  private id: string;
  private loading: Boolean = false;
  private model: any = {
    corpus: 0,
    traced: 0,
  };

  private config: any = {
    refresh: "0",
    rcr: null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private corpusService: CorpusService
  ) { }

  ngOnInit() {
    this.id = this.route.pathFromRoot[1].snapshot.url[1].path;
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.corpusService.getStats(this.id)
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

  refresh(evt) {
    var r; 
    
    if (evt.srcElement) {
      r = evt.srcElement.value;
    } else if ((evt.target) && (evt.target.value)) {
      r = evt.target.value;
    }

    if (r != this.config.refresh) {
      if (null != this.config.rcr) {
        clearInterval(this.config.rcr);
      }

      if ("0" == r) {
        this.config.rcr = null;
      } else {
        this.config.rcr = setInterval(this.loadData.bind(this), r * 1000);
      }
    }
  }
}
