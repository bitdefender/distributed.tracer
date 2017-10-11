import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Subject }    from 'rxjs/Subject';

import { FileUploader } from 'ng2-file-upload';

import { Executable } from './models/executable';

@Injectable()
export class ExecutableService {
  private fileUploader = new FileUploader({});
  private fileQueue = [];

  constructor(private http: Http) { }
  
  getAll() {
    return this.http.get(
      '/api/executables',
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
    });
  }

  getById(id: string) {
    return this.http.get(
      '/api/executables/' + id, 
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
    });
  }

  private uploadQueue(done : Subject<any>) {
    var index = 0;

    var rUpload = () => {
      if (index == this.fileQueue.length) {
        done.next(true);
        return;
      }

      this.fileUploader.cancelAll();
      this.fileUploader.clearQueue();
      
      this.fileUploader.setOptions(this.fileQueue[index].opt);

      this.fileUploader.addToQueue([this.fileQueue[index].file]);
      this.fileUploader.uploadAll();
    };

    this.fileUploader.onCompleteItem = (item, response, status, headers) => {
      index++;
      rUpload();
    };

    rUpload();
  }

  create(executable: Executable, binary:File, mempatch:File, corpus:File, fuzzer:File) {
    var ret = new Subject<any>();

    this.http.post(
      '/api/executables/', 
      executable, 
      this.jwt(true)
    ).subscribe((response: Response) : any => {
      var resp = response.json();
      let currentUser = JSON.parse(localStorage.getItem('currentUser'));
      
      this.fileQueue = [];

      this.fileQueue.push({
        file: binary,
        opt: {
          url: '/api/executables/' + resp.id + '/uploadexecutable',
          headers: [
            {name : 'Authorization', value: 'Bearer ' + currentUser.token}
          ] 
        }
      });

      if ("undefined" !== typeof mempatch) {
        this.fileQueue.push({
          file: mempatch,
          opt: {
            url: '/api/executables/' + resp.id + '/uploadmempatch',
            headers: [
              {name : 'Authorization', value: 'Bearer ' + currentUser.token}
            ] 
          }
        });
      }
      
      if ("undefined" !== typeof corpus) {
        this.fileQueue.push({
          file: corpus,
          opt: {
            url: '/api/executables/' + resp.id + '/uploadcorpus',
            headers: [
              {name : 'Authorization', value: 'Bearer ' + currentUser.token}
            ] 
          }
        });
      }

      if ("undefined" !== typeof fuzzer) {
        this.fileQueue.push({
          file: fuzzer,
          opt: {
            url: '/api/executables/' + resp.id + '/uploadfuzzer',
            headers: [
              {name : 'Authorization', value: 'Bearer ' + currentUser.token}
            ] 
          }
        });
      }

      this.uploadQueue(ret);
    });
      
    return ret.asObservable();
  }

  update(executable: Executable) {
    return this.http.put(
      '/api/executables/' + executable.id, 
      executable, 
      this.jwt(true)
    ).map((response: Response) => {
      return response.json();
    });
  }

  delete(id: string) {
    return this.http.delete(
      '/api/executables/' + id, 
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
    });
  }


  // private helper methods
  private jwt(sendJson: boolean) {
    // create authorization header with jwt token
    let hdrs = {};
    
    if (sendJson) {
      hdrs['Content-Type'] = 'application/json';
    }
    
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.token) {
      hdrs['Authorization'] = 'Bearer ' + currentUser.token;
    }
    
    let ro = new RequestOptions({ headers: new Headers(hdrs)});
    return ro;
  }
}
