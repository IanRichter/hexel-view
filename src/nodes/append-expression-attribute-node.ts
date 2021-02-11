import { JSExpression } from '../js-expression';
import { ElementAttributeNode } from './element-attribute-node';

export class AppendExpressionAttributeNode extends ElementAttributeNode {

	public value: string = null;
	public condition: JSExpression = null;

}