import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { GraphService } from '../graph.service';

@Component({
  selector: 'app-executable-details-graph',
  templateUrl: './executable-details-graph.component.html',
  styleUrls: ['./executable-details-graph.component.css']
})
export class ExecutableDetailsGraphComponent implements OnInit {
    public id: string;
    private loading: Boolean = false;
    public model: any;

    private top: number;
    private bottom: number;
    private left: number;
    private right: number;
    private centerX: number;
    private centerY: number;
    
    private canvasWidth: number;
    private canvasHeight: number;

    private maxZoom: number = 5;
    private minZoom: number = 0;
    private zoomLevel: number = 1;
    private zoomRatio: number = 0;
    private tx: number = 0;
    private ty: number = 0;
    private startPos: any = {
        x: 0,
        y: 0
    };
    //private image: HTMLImageElement = new Image();
  
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private graphService: GraphService
    ) { }

    ngOnInit() {
        this.id = this.route.pathFromRoot[1].snapshot.url[1].path;

        this.loadData();
    }
  
    loadData() {
        this.loading = true;
        //this.image.src = "/api/graph/" + this.id + "?type=SVG";
        /*this.graphService.getGraph(this.id).subscribe(
            data => {
                this.loading = false;
            },
            error => {
                this.loading = false;
                this.router.navigate(["/err404"], { replaceUrl:true });
            }
        );*/
    }

    private ClampZoomLevel(zoomLevel: number): number {
        var clamped = zoomLevel;

        if (this.minZoom != undefined) clamped = Math.max(this.minZoom, clamped);
        if (this.maxZoom != undefined) clamped = Math.min(this.maxZoom, clamped);

        return clamped;
    }

    MouseWheel(event: WheelEvent) {
        event.preventDefault();
        
        var scrollDelta = event.deltaY ? 
            (event.deltaY / 100) : (event.detail / 3);

        var px = event.offsetX - this.tx;
        var py = event.offsetY - this.ty;

        var previousZoomRatio = this.zoomRatio;
        var newZoomRatio = this.ClampZoomLevel(previousZoomRatio - scrollDelta);

        this.zoomRatio = newZoomRatio;
        this.zoomLevel = Math.pow(2, newZoomRatio);
        
        var zoomScale = this.zoomLevel / Math.pow(2, previousZoomRatio);

        this.tx -= (zoomScale - 1) * px;
        this.ty -= (zoomScale - 1) * py;
    }

    private MouseDown(event : MouseEvent) {
        event.preventDefault();
        this.startPos = { x: event.offsetX, y: event.offsetY };
    }

    private MouseMove(event : MouseEvent) {
        event.preventDefault();
        
        if (event.buttons > 0) {
            if (this.startPos == null) {
                this.startPos = { x: event.offsetX, y: event.offsetY };
            }

            var dx = event.movementX; //event.offsetX - this.startPos.x;
            var dy = event.movementY; //event.offsetY - this.startPos.y;

            this.tx += dx;
            this.ty += dy;
            //this.startPos = { x: event.offsetX, y: event.offsetY };
        }
    }


}
