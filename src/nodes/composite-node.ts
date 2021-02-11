import { Position } from '../position';
import { Node } from './node';

export class CompositeNode extends Node {

	public childNodes: Node[];

	constructor(position: Position, childNodes: Node[] = []) {
		super(position);
		this.childNodes = childNodes;
	}

}