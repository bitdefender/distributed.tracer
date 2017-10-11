import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbRadioGroup } from '@ng-bootstrap/ng-bootstrap';
import { NotificationsService } from 'angular2-notifications';

import { ExecutableService } from '../executable.service';
import { Executable } from '../models/executable';

@Component({
    selector: 'app-add-executable',
    templateUrl: './add-executable.component.html',
    styleUrls: ['./add-executable.component.css']
})
export class AddExecutableComponent implements OnInit {
    model: any = {
      executableName: "",
      platform: "Windows",
      execution: "Inprocess",
      hasMemPatch: false,
      hasCorpus: false,
      hasFuzzer: false
    };
    
    binary: any = {
      file: File,
      name: ""
    };

    mempatch: any = {
      file: File,
      name: ""
    };

    corpus: any = {
      file: File,
      name: ""
    };

    fuzzer: any = {
      file: File,
      name: ""
    };
    
    loading = false;

    constructor(
        private router: Router,
        private executableService:ExecutableService,
        private notificationsService:NotificationsService
    ) { }

    ngOnInit() {
    }
    
    clearForm() {
        this.model.executableName = "";
        this.model.platform = "Windows";
        this.model.execution = "Inprocess";
        this.model.hasMemPatch = false;
        this.model.hasCorpus = false;
        this.model.hasFuzzer = false;
        this.binary.file = undefined;
        this.binary.name = "";
        this.mempatch.file = undefined;
        this.mempatch.name = "";
        this.corpus.file = undefined;
        this.corpus.name = "";
        this.fuzzer.file = undefined;
        this.fuzzer.name = "";
    }

    register() {
        this.loading = true;
        this.executableService.create(this.model, this.binary.file, this.mempatch.file, this.corpus.file, this.fuzzer.file)
            .subscribe(
                data => {
                    console.log(data);
                    let name = this.model.executableName;
                    this.loading = false;
                    this.clearForm();
                    this.notificationsService.success(
                        "Added executable!",
                        "Executable " + name + " has been added"
                    );
                    this.router.navigate(["/executables"]);
                },
                error => {
                    this.loading = false;
                    this.notificationsService.error(
                        "Couldn't add executable!",
                        error
                    );
                }
            );
    }

}
