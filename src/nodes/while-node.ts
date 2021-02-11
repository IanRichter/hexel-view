import { JSExpression } from '../js-expression';
import { CompositeNode } from './composite-node';

export class WhileNode extends CompositeNode {

	public condition: JSExpression = null;

}