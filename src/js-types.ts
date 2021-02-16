import * as Types from '@babel/types';

export type JSValueExpression = Types.Expression;
export type JSExpressionStatement = Types.ExpressionStatement | Types.VariableDeclaration;
export type JSPrintStatement = Types.ExpressionStatement;