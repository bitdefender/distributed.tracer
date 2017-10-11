import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response, URLSearchParams } from '@angular/http';

@Injectable()
export class CorpusService {

  constructor(private http: Http) { }

  getStats(id: string) {
    return this.http.get(
      '/api/corpus/' + id + '/stats', 
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
    });
  }

  getTest(execId: string, testId: string) {
    return this.http.get(
      '/api/corpus/' + execId + '/' + testId,
      this.jwt(false)
    ).map((response:Response) => {
      return response.json();
    });
  }

  getTests(execId: string, first: number = 0, count: number = 64, exclude: string[] = []) {
    var search = new URLSearchParams();

    if (0 != first) {
      search.set("first", first + "");
    }

    if (64 != count) {
      search.set("count", count + "");
    }

    for (let k in exclude) {
        search.append("exclude[]", exclude[k]);
    }

    var rq = this.jwt(false);
    rq.search = search;

    return this.http.get(
      '/api/corpus/' + execId + '/list',
      rq
    ).map((response:Response) => {
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
