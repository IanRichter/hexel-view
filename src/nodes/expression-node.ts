import * as Types from '@babel/types';
import { JSStatement } from '../js-types';
import { Node } from './node';

export class ExpressionNode extends Node {

	public statement: JSStatement = null;

}