import { JSValueExpression } from '../js-types';
import { Node } from './node';

export class RenderNode extends Node {

	public viewPath: string = '';
	public context: JSValueExpression = null;

}