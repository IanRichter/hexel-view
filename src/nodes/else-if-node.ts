import { JSValueExpression } from '../js-types';
import { CompositeNode } from './composite-node';
import { ElseNode } from './else-node';

export class ElseIfNode extends CompositeNode {

	public condition: JSValueExpression = null;
	public alternateNode: ElseIfNode | ElseNode = null;

}