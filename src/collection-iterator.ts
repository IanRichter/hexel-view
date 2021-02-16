// export class CollectionIterator {

// 	private collection: never;
// 	private iterable: Iterable;
// 	private valueBuffer: never = null;


// 	public constructor(collection: never) {
// 		this.collection = collection;
// 		this.iterable = collection[Symbol.iterator]();
// 	}

// 	public [Symbol.iterator](): Iterator {
// 		return this;
// 	}

// 	public next() {
// 		if (!this.valueBuffer) {
// 			this.valueBuffer = this.iterable.next();
// 		}

// 		let value = this.valueBuffer;
// 		this.valueBuffer = null;
// 		return value;
// 	}

// 	public hasAny() {
// 		this.valueBuffer = this.iterable.next();
// 		return this.valueBuffer && !this.valueBuffer.done;
// 	}

// }