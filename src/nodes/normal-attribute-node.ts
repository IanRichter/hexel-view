import { JSValueExpression } from '../js-types';
import { ElementAttributeNode } from './element-attribute-node';

export class NormalAttributeNode extends ElementAttributeNode {

	public values: (JSValueExpression | string)[] = [];

}