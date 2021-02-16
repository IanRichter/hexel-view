import { TokenType } from './token-type';

export const HTML_QUOTE_TOKENS: TokenType[] = [
	TokenType.DoubleQuote,
	TokenType.SingleQuote
];

export const INVALID_NODE_START_TOKENS: TokenType[] = [
	TokenType.ElseIf,
	TokenType.Else,
	TokenType.Case,
	TokenType.DefaultCase,

	TokenType.BlockClosingStart,

	TokenType.ExpressionEnd,

	TokenType.ElementClosingStart
];

export const INVALID_TEXT_TOKENS: TokenType[] = [
	TokenType.Scope,
	TokenType.Print,
	TokenType.If,
	TokenType.ElseIf,
	TokenType.Else,
	TokenType.Switch,
	TokenType.Case,
	TokenType.DefaultCase,
	TokenType.Foreach,
	TokenType.While,
	TokenType.Render,
	TokenType.RenderDefaultSlot,
	TokenType.RenderSlot,
	TokenType.ContentFor,

	TokenType.BlockClosingStart,

	TokenType.ExpressionStart,
	TokenType.ExpressionEnd,
	TokenType.PrintExpressionStart,
	TokenType.CommentExpressionStart,

	TokenType.CommentStart,
	TokenType.CDataStart,
	TokenType.Doctype,
	TokenType.ElementStart,
	TokenType.ElementClosingStart
];

export const ATTRIBUTE_NAME_TERMINATING_TOKENS: TokenType[] = [
	TokenType.Whitespace,
	TokenType.Equals,
	TokenType.Dot,
	TokenType.RightSquareBrace,
	TokenType.ForwardSlash,
	TokenType.RightAngleBrace,
	...HTML_QUOTE_TOKENS
];

export const NORMAL_ATTRIBUTE_STRING_TERMINATING_TOKENS: TokenType[] = [
	TokenType.ExpressionStart,
	TokenType.ExpressionEnd,
	TokenType.PrintExpressionStart,
	TokenType.CommentExpressionStart
];

export const VARIABLE_NAME_START_TOKENS: TokenType[] = [
	TokenType.Letters,
	TokenType.Underscore,
	TokenType.Dollar
];

export const VARIABLE_NAME_VALID_TOKENS: TokenType[] = [
	TokenType.Letters,
	TokenType.Numbers,
	TokenType.Underscore,
	TokenType.Dollar
];