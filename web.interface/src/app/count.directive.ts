import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appCount]'
})
export class CountDirective {

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) { }

  @Input('appCount') set count(c:number) {
    this.viewContainer.clear();
    for(var i = 0; i < c; i++) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
