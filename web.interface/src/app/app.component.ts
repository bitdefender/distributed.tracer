import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  appTitle = 'Cardinal';
  pages = [ 
    { 
      name:'Executables',
      href:'/executables'
    }, { 
      name:'Infrastructure',
      href:'/infrastructure'
    }];

    public notificationOptions = {
        timeOut: 5000,
        lastOnBottom: true,
        clickToClose: true,
        maxLength: 0,
        maxStack: 7,
        showProgressBar: true,
        pauseOnHover: true,
        preventDuplicates: false,
        preventLastDuplicates: false,
        rtl: false,
        animate: 'scale',
        position: ['right', 'bottom']
    };


  constructor(private title:Title) {
    title.setTitle(this.appTitle);
  }
}
