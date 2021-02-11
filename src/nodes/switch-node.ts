import { JSExpression } from '../js-expression';
import { Position } from '../position';
import { Node } from './node';

export class SwitchNode extends Node {

	public expression: JSExpression = null;
	public cases: Node[] = [];
	public defaultCase: Node = null;

}