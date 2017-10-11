import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';

var $ = require('jquery');
var scrollify = require('jquery-scrollify');

@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class SlideshowComponent implements OnInit {

  public hideGenerators: boolean = true;
  public hideWorkers: boolean = true;
  public hideState: boolean = true;

  @ViewChild('pGen') pGen: NgbPopover;
  @ViewChild('pWrk') pWrk: NgbPopover;
  @ViewChild('pGlo') pGlo: NgbPopover;

  constructor(
    //config: NgbPopoverConfig
  ) { 
    //config.placement = 'right';
    //config.triggers = 'hover';
  }

  ngOnInit() {
    //$.scrollify = scrollify;

    scrollify({
      section:".pnl",
      scrollbars:false,
      updateHash:true,
      before:function(i, panels) {

        var ref = panels[i].attr("data-section-name");

        $(".pags .active").removeClass("active");

        $(".pags").find("a[href=\"#" + ref + "\"]").addClass("active");
      }
    });

    var pagination = "<ul class=\"pags\">";
    var activeClass = "";
    $(".pnl").each(function(i) {
      activeClass = "";
      if(i===0) {
        activeClass = "active";
      }
      pagination += "<li><a class=\"" + activeClass + "\" href=\"#" + $(this).attr("data-section-name") + "\"><span class=\"hover-text\">" + $(this).attr("data-section-name").charAt(0).toUpperCase() + $(this).attr("data-section-name").slice(1) + "</span></a></li>";
    });

    pagination += "</ul>";

    $(".home").append(pagination);
    $(".pags a").on("click", scrollify.move);

    scrollify.instantMove("#home");

    this.pGen.shown.subscribe(() => {
      this.pGlo.close();
      this.pWrk.close();
    });

    this.pGlo.shown.subscribe(() => {
      this.pGen.close();
      this.pWrk.close();
    });

    this.pWrk.shown.subscribe(() => {
      this.pGen.close();
      this.pGlo.close();
    });
  }

  ngOnDestroy() {
    scrollify.destroy();
    $("body").css({"overflow":"visible"});
  }

  navigate(dest) {
    scrollify.move("#" + dest);
  }

  KeyPressed(event: KeyboardEvent) {
    if (event.keyCode == 32) {
      event.preventDefault();
      scrollify.next();
    }
  }
}
