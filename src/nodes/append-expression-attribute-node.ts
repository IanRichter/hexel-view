import { JSValueExpression } from '../js-types';
import { ElementAttributeNode } from './element-attribute-node';

export class AppendExpressionAttributeNode extends ElementAttributeNode {

	public value: string = null;
	public condition: JSValueExpression = null;

}