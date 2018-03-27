import { PipeTransform, Pipe } from '@angular/core';
import { Contact } from '../../contact';
@Pipe({
    name: 'contactSearchPipe',
    pure: true
})
export class ContactSearchPipe implements PipeTransform {
    transform(data: Contact[], searchTerm: string): any[] {
        if(!data || !searchTerm){
            return data;
        }
        searchTerm = searchTerm.toUpperCase();
        return data.filter(item => {
            return (item.address.indexOf(searchTerm) !== -1 || 
                (item.name !== null && item.name.toUpperCase().indexOf(searchTerm) !== -1)); 
        });
    }
}