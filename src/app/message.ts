export class Message {
	constructor(        
        public contactNumber: string,
        public timestamp: string,	
        public type: number,
        public body: string,
        public contactName?: string,
        public date?: Date) { }
}