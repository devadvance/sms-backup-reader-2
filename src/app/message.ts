export class Message {
	constructor(
        public contact: string,
        public timestamp: string,	
        public type: number,
        public body: string,
        public date?: Date) { }
}