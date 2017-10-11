import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'binary'
})
export class BinaryPipe implements PipeTransform {

  transform(value: string, width: number = 16): any {
    var v = atob(value);
    var ret = "";
    for (var i = 0; i < v.length; ++i) {
      if ((0 != i) && (0 == i % width)) {
        ret += '\n';
      }
      ret += ('00' + v.charCodeAt(i).toString(16)).slice(-2) + ' ';
    }

    return ret;
  }

}
