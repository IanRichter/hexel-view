import * as Types from '@babel/types';

// Valid types
// Types.Expression -> Output expressions
// Types.VariableDeclaration -> Expression block



// type OutputExpression =
// 	// Value access
// 	Types.Identifier |
// 	Types.MemberExpression |
// 	Types.CallExpression |
// 	Types.AwaitExpression |

// 	// Literals
// 	Types.StringLiteral |
// 	Types.NumericLiteral |
// 	Types.NullLiteral |
// 	Types.BooleanLiteral |
// 	Types.RegExpLiteral |
// 	Types.TemplateLiteral |
// 	Types.BigIntLiteral |
// 	Types.DecimalLiteral |

// 	// Structures
// 	Types.ObjectExpression |
// 	Types.ArrayExpression |
// 	Types.NewExpression;


type DeclarationStatement =
	Types.VariableDeclaration |
	Types.FunctionDeclaration |
	Types.ClassDeclaration;

type OtherStatement =
	Types.BlockStatement |
	Types.EmptyStatement;

type DisallowedStatements =
	Types.BreakStatement |
	Types.ContinueStatement |
	Types.ReturnStatement |
	Types.DebuggerStatement |
	Types.LabeledStatement;