import * as Types from '@babel/types';

export class JSExpression {

	public expression: Types.Expression | Types.VariableDeclaration;

	public constructor(expression: Types.Expression | Types.VariableDeclaration) {
		this.expression = expression;
	}

}