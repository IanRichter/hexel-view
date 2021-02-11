import { JSExpression } from '../js-expression';
import { CompositeNode } from './composite-node';
import { Node } from './node';

export class ElseIfNode extends CompositeNode {

	public condition: JSExpression = null;
	public alternateNode: Node = null;

}