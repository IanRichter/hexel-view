import { JSValueExpression } from '../js-types';
import { CompositeNode } from './composite-node';
import { ElseNode } from './else-node';
import { ValueNode } from './value-node';

export class ForeachNode extends CompositeNode {

	public identifiers: ValueNode[] = [];
	public collection: JSValueExpression = null;
	public alternateNode: ElseNode = null;

	public hasIdentifier(identifier: ValueNode): boolean {
		return this.identifiers.some(testIdentifier => testIdentifier.value === identifier.value);
	}

}