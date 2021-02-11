import { JSExpression } from '../js-expression';
import { Node } from './node';

export class RenderNode extends Node {

	public templatePath: string = null;
	public context: JSExpression = null;

}