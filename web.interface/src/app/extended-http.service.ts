import { Injectable, Injector } from '@angular/core';
import { Request, XHRBackend, RequestOptions, Response, Http, RequestOptionsArgs, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Router } from '@angular/router';
import { AuthenticationService } from './authentication.service';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';

@Injectable()
export class ExtendedHttpService extends Http {
  private authService: AuthenticationService;

  constructor(backend: XHRBackend, defaultOptions: RequestOptions, private router: Router, private injector: Injector) {
    super(backend, defaultOptions);

    setTimeout(() => this.authService = injector.get(AuthenticationService));
  }

  request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    //do whatever 
    if (typeof url === 'string') {
      if (!options) {
        options = { headers: new Headers() };
      }
      //this.setHeaders(options);
    } else {
      //this.setHeaders(url);
    }

    return super.request(url, options).catch(this.catchErrors());
  }

  private catchErrors() {
    return (res: Response) => {
      if (res.status === 401) {
        this.router.navigate(['login']);
      }

      if (res.status === 403) {
        this.router.navigate(['err403']);
      }
      return Observable.throw(res);
    };
  }

  /*private setHeaders(objectToSetHeadersTo: Request | RequestOptionsArgs) {
    //add whatever header that you need to every request
    //in this example I add header token by using authService that I've created
    objectToSetHeadersTo.headers.set('Token', this.authService.getToken());
  }*/
}