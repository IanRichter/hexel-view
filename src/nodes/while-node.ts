import { JSValueExpression } from '../js-types';
import { CompositeNode } from './composite-node';

export class WhileNode extends CompositeNode {

	public condition: JSValueExpression = null;

}