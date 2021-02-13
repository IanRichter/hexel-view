import { JSValueExpression } from '../js-types';
import { CompositeNode } from './composite-node';
import { ElseNode } from './else-node';

export class ForeachNode extends CompositeNode {

	public identifiers: string[] = [];
	public collection: JSValueExpression = null;
	public alternateNode: ElseNode = null;

}