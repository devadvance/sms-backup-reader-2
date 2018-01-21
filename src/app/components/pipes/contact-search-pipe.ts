import { PipeTransform, Pipe } from '@angular/core';

@Pipe({
    name: 'contactSearchPipe',
    pure: true
})
export class ContactSearchPipe implements PipeTransform {
    transform(data: any[], searchTerm: string): any[] {
        if(!data || !searchTerm){
            return data;
        }
        searchTerm = searchTerm;
        return data.filter(item => {
            return item.address.indexOf(searchTerm) !== -1 
        });
    }
}