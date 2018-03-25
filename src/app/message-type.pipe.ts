import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'messageType'
})
export class MessageTypePipe implements PipeTransform {

    transform(value: number, args?: any): any {
        switch (value) {
            case 1:
			case 3:
				return 'Received';
            case 2:
			case 4:
				return 'Sent';			
            default:
				return 'Unknown message type';
        }
    }

}
