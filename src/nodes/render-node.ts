import { JSValueExpression } from '../js-types';
import { Node } from './node';

export class RenderNode extends Node {

	public templatePath: string = null;
	public context: JSValueExpression = null;

}