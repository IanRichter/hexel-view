import { JSValueExpression } from '../js-types';
import { ElementAttributeNode } from './element-attribute-node';

export class BooleanAttributeNode extends ElementAttributeNode {

	public condition: JSValueExpression = null;

}