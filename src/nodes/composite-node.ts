import { Position } from '../position';
import { Node } from './node';

export class CompositeNode extends Node {

	public childNodes: Node[];

	public constructor(position: Position, childNodes: Node[] = []) {
		super(position);
		this.childNodes = childNodes;
	}

	public getFirstChild<T extends Node>(): T {
		if (this.childNodes.length === 0) {
			return null;
		}

		return this.childNodes[0] as T;
	}

}