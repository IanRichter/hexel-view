import { JSValueExpression } from '../js-types';
import { CaseNode } from './case-node';
import { DefaultCaseNode } from './default-case-node';
import { Node } from './node';

export class SwitchNode extends Node {

	public expression: JSValueExpression = null;
	public cases: CaseNode[] = [];
	public defaultCase: DefaultCaseNode = null;

}