import { JSExpression } from '../js-expression';
import { CompositeNode } from './composite-node';
import { ElseNode } from './else-node';

export class ForeachNode extends CompositeNode {

	public identifiers: string[] = [];
	public collection: JSExpression = null;
	public alternateNode: ElseNode = null;

}