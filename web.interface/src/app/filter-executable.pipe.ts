import { Pipe, PipeTransform } from '@angular/core';

import { Executable } from './models/executable';

@Pipe({
  name: 'filterExecutable'
})
export class FilterExecutablePipe implements PipeTransform {

  transform(items: Executable[], value : string): Executable[] {  
    if (!items) return [];        
    return items.filter(it => it.name.toLowerCase().indexOf(value) > -1);
  }
}
