import { JSValueExpression } from '../js-types';
import { CompositeNode } from './composite-node';
import { ValueNode } from './value-node';

export class PrintNode extends CompositeNode {

	public expression: JSValueExpression = null;
	public hasBlock: boolean = false;
	public blockArgs: ValueNode[] = [];

}