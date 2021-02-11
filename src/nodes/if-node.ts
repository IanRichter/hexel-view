import { JSExpression } from '../js-expression';
import { CompositeNode } from './composite-node';
import { ElseIfNode } from './else-if-node';
import { ElseNode } from './else-node';

export class IfNode extends CompositeNode {

	public condition: JSExpression = null;
	public alternateNode: ElseIfNode | ElseNode = null;

}