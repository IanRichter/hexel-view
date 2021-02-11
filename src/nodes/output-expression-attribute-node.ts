import { JSExpression } from '../js-expression';
import { ElementAttributeNode } from './element-attribute-node';

export class OutputExpressionAttributeNode extends ElementAttributeNode {

	public expression: JSExpression = null;

}