import { PipeTransform, Pipe } from '@angular/core';
import { Contact } from '../../contact';
@Pipe({
    name: 'contactSearchPipe',
    pure: true
})
export class ContactSearchPipe implements PipeTransform {
    transform(data: Contact[], searchTerm: string): Contact[] {
        if(!data || !searchTerm){
            return data;
        }
        searchTerm = searchTerm.toUpperCase();
        return data.filter(item => {
            if (item !== null) {
                return (item.address.indexOf(searchTerm) !== -1 || 
                                ((item!== null) && (item?.name !== null) && item?.name?.toUpperCase().indexOf(searchTerm) !== -1)); 
            } else {
                    return false;
            }
        });
    }
}