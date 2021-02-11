import { JSExpression } from '../js-expression';
import { CompositeNode } from './composite-node';
import { ElseNode } from './else-node';

export class ElseIfNode extends CompositeNode {

	public condition: JSExpression = null;
	public alternateNode: ElseIfNode | ElseNode = null;

}