import { JSValueExpression } from '../js-types';
import { ElementAttributeNode } from './element-attribute-node';

export class OutputExpressionAttributeNode extends ElementAttributeNode {

	public expression: JSValueExpression = null;

}