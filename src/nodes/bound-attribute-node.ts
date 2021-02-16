import { JSValueExpression } from '../js-types';
import { ElementAttributeNode } from './element-attribute-node';

export class BoundAttributeNode extends ElementAttributeNode {

	public expression: JSValueExpression = null;

}