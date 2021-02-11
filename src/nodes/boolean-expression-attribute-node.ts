import { JSExpression } from '../js-expression';
import { ElementAttributeNode } from './element-attribute-node';

export class BooleanExpressionAttributeNode extends ElementAttributeNode {

	public condition: JSExpression = null;

}