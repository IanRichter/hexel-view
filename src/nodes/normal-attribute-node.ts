import { JSExpression } from '../js-expression';
import { ElementAttributeNode } from './element-attribute-node';

export class NormalAttributeNode extends ElementAttributeNode {

	public values: (JSExpression | string)[] = [];

}