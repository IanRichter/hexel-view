import { JSExpression } from '../js-expression';
import { CompositeNode } from './composite-node';
import { Node } from './node';

export class ForeachNode extends CompositeNode {

	public identifiers: string[] = [];
	public collection: JSExpression = null;
	public alternateNode: Node = null;

}