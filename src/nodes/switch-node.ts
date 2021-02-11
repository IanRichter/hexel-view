import { JSExpression } from '../js-expression';
import { CaseNode } from './case-node';
import { DefaultCaseNode } from './default-case-node';
import { Node } from './node';

export class SwitchNode extends Node {

	public expression: JSExpression = null;
	public cases: CaseNode[] = [];
	public defaultCase: DefaultCaseNode = null;

}