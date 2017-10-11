import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'text'
})
export class TextPipe implements PipeTransform {

  transform(value: string, width: number = 65536): any {
    var v = atob(value);
    var ret = "";
    var w = 0;
    for (var i = 0; i < v.length; ++i) {
      var c = v.charCodeAt(i);
      if (c < 32) {
        ret += '.';
      } else if ((32 <= c) && (c < 128)) {
        ret += v.charAt(i);
      } else {
        ret += '.';
      }

      w++;

      if (width == w) {
        ret += '\n';
        w = 0;
      }
    }

    return ret;
  }

}
