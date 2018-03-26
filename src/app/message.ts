export class Message {
	constructor(
        public contactAddress: string,
        public contactName: string,
        public timestamp: string,	
        public type: number,
        public body: string,
        public date?: Date) { }
}