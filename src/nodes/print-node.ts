import { JSExpression } from '../js-expression';
import { CompositeNode } from './composite-node';

export class PrintNode extends CompositeNode {

	public expression: JSExpression = null;
	public blockArgs: string[] = [];

}