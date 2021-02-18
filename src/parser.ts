import { parse, parseExpression } from '@babel/parser';
import * as Types from '@babel/types';
import { Lexer } from './lexer';
import { ParseError } from './parse-error';
import { Token } from './token';
import { TokenType } from './token-type';
import { Position } from './position';
import { Node } from './nodes/node';
import { ScopeNode } from './nodes/scope-node';
import { PrintNode } from './nodes/print-node';
import { IfNode } from './nodes/if-node';
import { ElseIfNode } from './nodes/else-if-node';
import { ElseNode } from './nodes/else-node';
import { SwitchNode } from './nodes/switch-node';
import { CaseNode } from './nodes/case-node';
import { DefaultCaseNode } from './nodes/default-case-node';
import { ForeachNode } from './nodes/foreach-node';
import { WhileNode } from './nodes/while-node';
import { RenderNode } from './nodes/render-node';
import { ContentForNode } from './nodes/content-for-node';
import { BlockClosingNode } from './nodes/block-closing-node';
import { ExpressionNode } from './nodes/expression-node';
import { CommentExpressionNode } from './nodes/comment-expression-node';
import { CommentNode } from './nodes/comment-node';
import { CDataNode } from './nodes/cdata-node';
import { DoctypeNode } from './nodes/doctype-node';
import { ElementNode } from './nodes/element-node';
import { ElementClosingNode } from './nodes/element-closing-node';
import { ElementAttributeNode } from './nodes/element-attribute-node';
import { NormalAttributeNode } from './nodes/normal-attribute-node';
import { AppendAttributeNode } from './nodes/append-attribute-node';
import { WhitespaceNode } from './nodes/whitespace-node';
import { TextNode } from './nodes/text-node';
import { JSValueExpression, JSExpressionStatement, JSPrintStatement } from './js-types';
import { PrintExpressionNode } from './nodes/print-expression-node';
import { ATTRIBUTE_NAME_TERMINATING_TOKENS, HTML_QUOTE_TOKENS, INVALID_TEXT_TOKENS, NORMAL_ATTRIBUTE_STRING_TERMINATING_TOKENS, VARIABLE_NAME_START_TOKENS, VARIABLE_NAME_VALID_TOKENS } from './token-constants';
import { ViewNode } from './nodes/view-node';
import { LayoutNode } from './nodes/layout-node';
import { VOID_ELEMENTS } from './constants';
import { ConditionalAttributeNode } from './nodes/conditional-attribute-node';
import { ExpressionAttributeNode } from './nodes/expression-attribute-node';
import { RenderContentNode } from './nodes/render-content-node';
import { ValueNode } from './nodes/value-node';
import { ParserOptions } from './parser-options';

// TODO: Improve how block nodes consume whitespace newlines (even in text) to "remove" them from the output HTML

/**
 * Parses tokens into a View Abstract Syntax Tree of Nodes.
 */
export class Parser {

	private options: ParserOptions;
	private lexer: Lexer;
	private tokenBuffer: Token;

	public constructor(options: ParserOptions) {
		this.options = options;
	}

	public parse(source: string, filePath: string): ViewNode {
		this.lexer = new Lexer(source, this.options.tags, this.options.tabSize);

		let viewNode = new ViewNode(source, filePath);

		if (this.matches(TokenType.Layout)) {
			viewNode.layoutNode = this.parseLayoutNode();
		}

		while (!this.isEOF()) {
			viewNode.childNodes.push(this.parseNode());
		}

		return viewNode;
	}

	// ========================================================================

	private parseLayoutNode(): LayoutNode {
		let node = new LayoutNode(this.getPosition());
		this.expect(TokenType.Layout);

		let valueNode = this.parseBlockValueNode();
		node.value = valueNode.value.trim();
		if (node.value.length === 0) {
			throw new ParseError('Expected a view path.', valueNode.position);
		}

		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.ForwardSlash);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseNode(): Node {
		if (this.isEOF()) {
			throw new ParseError('Unexpected end of file.', this.getPosition());
		}

		switch (this.peek().type) {
			// Standard HTML
			case TokenType.Whitespace:
				return this.parseWhitespaceNode();
			case TokenType.CommentStart:
				return this.parseCommentNode();
			case TokenType.CDataStart:
				return this.parseCDataNode();
			case TokenType.Doctype:
				return this.parseDoctypeNode();
			case TokenType.ElementStart:
				return this.parseElementNode();

			// Custom Syntax
			case TokenType.Scope:
				return this.parseScopeNode();
			case TokenType.If:
				return this.parseIfNode();
			case TokenType.Switch:
				return this.parseSwitchNode();
			case TokenType.Foreach:
				return this.parseForeachNode();
			case TokenType.While:
				return this.parseWhileNode();
			case TokenType.Render:
				return this.parseRenderNode();
			case TokenType.RenderContent:
				return this.parseRenderContentNode();
			case TokenType.ContentFor:
				return this.parseContentForNode();
			case TokenType.Print:
				return this.parsePrintNode();
			case TokenType.ExpressionStart:
				return this.parseExpressionNode();
			case TokenType.PrintExpressionStart:
				return this.parsePrintExpressionNode();
			case TokenType.CommentExpressionStart:
				return this.parseCommentExpressionNode();

			// Invalid location for layout node
			case TokenType.Layout:
				throw new ParseError('Layout node must be the first statement in the view.', this.getPosition());

			// Invalid node start tokens
			case TokenType.ElementClosingStart:
			case TokenType.ElseIf:
			case TokenType.Else:
			case TokenType.Case:
			case TokenType.DefaultCase:
			case TokenType.BlockClosingStart:
			case TokenType.ExpressionEnd:
				throw new ParseError('Encountered unexpected token.', this.getPosition());
		}

		return this.parseTextNode();
	}

	private parseNodesUntilMatches(tokenType: TokenType): Node[] {
		let nodes = [];

		while (!this.matches(tokenType)) {
			nodes.push(this.parseNode());
		}

		return nodes;
	}

	private parseWhitespaceNode(): WhitespaceNode {
		let node = new WhitespaceNode(this.getPosition());
		node.textContent = this.expect(TokenType.Whitespace).symbol;
		return node;
	}

	private parseTextNode(): TextNode {
		let node = new TextNode(this.getPosition());

		while (!this.isEOF() && !this.matchesOneOf(INVALID_TEXT_TOKENS)) {
			switch (this.peek().type) {
				// case TokenType.ExpressionStartEscape:
				// case TokenType.ExpressionEndEscape:
				// 	node.textContent += this.consume().value;
				// 	break;
				default:
					node.textContent += this.consume().symbol;
			}
		}

		return node;
	}

	private parseEmbeddedLanguageTextNode(tagName: string): TextNode {
		let node = new TextNode(this.getPosition());
		node.textContent = this.consumeWhile(() => !this.matches(TokenType.ElementClosingStart) || this.peek().properties.get('tagName') !== tagName);
		return node;
	}

	private parseCommentNode(): CommentNode {
		let node = new CommentNode(this.getPosition());
		this.expect(TokenType.CommentStart);
		node.textContent = this.consumeWhile(() => !this.matches(TokenType.CommentEnd));
		this.expect(TokenType.CommentEnd);
		return node;
	}

	private parseCDataNode(): CDataNode {
		let node = new CDataNode(this.getPosition());
		this.expect(TokenType.CDataStart);
		node.textContent = this.consumeWhile(() => !this.matches(TokenType.CDataEnd));
		this.expect(TokenType.CDataEnd);
		return node;
	}

	private parseDoctypeNode(): DoctypeNode {
		let node = new DoctypeNode(this.getPosition());
		this.expect(TokenType.Doctype);
		this.expect(TokenType.Whitespace);
		this.expectWithSymbol(TokenType.Letters, 'html');
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseElementNode(): ElementNode {
		let node = new ElementNode(this.getPosition());
		node.tagName = this.expect(TokenType.ElementStart).properties.get('tagName');
		node.isVoid = VOID_ELEMENTS.includes(node.tagName);
		this.consumeOptional(TokenType.Whitespace);

		let terminatingTokens = [TokenType.ForwardSlash, TokenType.RightAngleBrace];
		while (!this.matchesOneOf(terminatingTokens)) {
			node.attributes.push(this.parseAttributeNode());
			this.consumeOptional(TokenType.Whitespace);
		}

		if (this.matches(TokenType.ForwardSlash)) {
			this.consume();
			node.isSelfClosing = true;
		}

		this.expect(TokenType.RightAngleBrace);

		if (node.isVoid || node.isSelfClosing) {
			return node;
		}

		if (['script', 'style'].includes(node.tagName)) {
			node.childNodes = [this.parseEmbeddedLanguageTextNode(node.tagName)];
		}
		else {
			node.childNodes = this.parseNodesUntilMatches(TokenType.ElementClosingStart);
		}

		node.closingNode = this.parseElementClosingNode();

		if (node.closingNode.tagName !== node.tagName) {
			throw new ParseError('Encountered mismatched closing tag.', node.closingNode.position);
		}

		return node;
	}

	private parseElementClosingNode(): ElementClosingNode {
		let node = new ElementClosingNode(this.getPosition());
		node.tagName = this.expect(TokenType.ElementClosingStart).properties.get('tagName');
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseAttributeNode(): ElementAttributeNode {
		let position = this.getPosition();

		if (!this.matches(TokenType.LeftSquareBrace)) {
			return this.parseNormalAttributeNode(position);
		}

		this.expect(TokenType.LeftSquareBrace);

		if (this.matches(TokenType.QuestionMark)) {
			return this.parseConditionalAttributeNode(position);
		}

		let name = this.parseAttributeName();

		if (this.matches(TokenType.Dot)) {
			return this.parseAppendAttributeNode(position, name);
		}

		return this.parseExpressionAttributeNode(position, name);
	}

	private parseNormalAttributeNode(position: Position): NormalAttributeNode {
		let node = new NormalAttributeNode(position);
		node.name = this.parseAttributeName();
		this.consumeOptional(TokenType.Whitespace);

		if (!this.matches(TokenType.Equals)) {
			return node;
		}

		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		node.quote = this.expectOneOf(HTML_QUOTE_TOKENS);

		node.values = [];
		while (!this.isEOF() && !this.matches(node.quote.type)) {
			switch (this.peek().type) {
				case TokenType.PrintExpressionStart: {
					this.consume();
					node.values.push(
						this.parseJSValueExpression(this.parseValueNode(TokenType.ExpressionEnd))
					);
					this.expect(TokenType.ExpressionEnd);
					break;
				}
				case TokenType.ExpressionStart:
				case TokenType.CommentExpressionStart:
					this.consume();
					this.consumeWhile(() => !this.matches(TokenType.ExpressionEnd));
					this.expect(TokenType.ExpressionEnd);
					break;
				case TokenType.ExpressionEnd:
					throw new ParseError('Encountered unexpected token.', this.getPosition());
				// case TokenType.ExpressionStartEscape:
				// case TokenType.ExpressionEndEscape:
				// 	node.values.push(this.consume().value);
				// 	break;
				default: {
					let value = this.consumeWhile(() => !this.matches(node.quote.type) && !this.matchesOneOf(NORMAL_ATTRIBUTE_STRING_TERMINATING_TOKENS));
					node.values.push(value);
				}
			}
		}

		this.expect(node.quote.type);
		return node;
	}

	private parseConditionalAttributeNode(position: Position): ConditionalAttributeNode {
		let node = new ConditionalAttributeNode(position);
		this.expect(TokenType.QuestionMark);
		node.name = this.parseAttributeName();
		this.expect(TokenType.RightSquareBrace);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		node.quote = this.expectOneOf(HTML_QUOTE_TOKENS);
		node.condition = this.parseJSValueExpression(this.parseValueNode(node.quote.type));
		this.expect(node.quote.type);
		return node;
	}

	private parseAppendAttributeNode(position: Position, name: string): AppendAttributeNode {
		let node = new AppendAttributeNode(position);
		node.name = name;
		this.expect(TokenType.Dot);
		node.value = this.consumeWhile(() => !this.matchesOneOf(ATTRIBUTE_NAME_TERMINATING_TOKENS));
		this.expect(TokenType.RightSquareBrace);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		node.quote = this.expectOneOf(HTML_QUOTE_TOKENS);
		node.condition = this.parseJSValueExpression(this.parseValueNode(node.quote.type));
		this.expect(node.quote.type);
		return node;
	}

	private parseExpressionAttributeNode(position: Position, name: string): ExpressionAttributeNode {
		let node = new ExpressionAttributeNode(position);
		node.name = name;
		this.expect(TokenType.RightSquareBrace);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		node.quote = this.expectOneOf(HTML_QUOTE_TOKENS);
		node.expression = this.parseJSValueExpression(this.parseValueNode(node.quote.type));
		this.expect(node.quote.type);
		return node;
	}

	private parseAttributeName(): string {
		let name = this.consumeWhile(() => !this.matchesOneOf(ATTRIBUTE_NAME_TERMINATING_TOKENS));

		if (name.length === 0) {
			throw new ParseError('Expected valid attribute name.', this.getPosition());
		}

		return name;
	}

	private parseScopeNode(): ScopeNode {
		let node = new ScopeNode(this.getPosition());
		this.expect(TokenType.Scope);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseIfNode(): IfNode {
		let node = new IfNode(this.getPosition());
		this.expect(TokenType.If);
		node.condition = this.parseJSValueExpression(this.parseBlockValueNode());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		while (!this.isEOF()) {
			if (this.matches(TokenType.Whitespace)) {
				this.consume();
			}
			else if (this.matches(TokenType.CommentExpressionStart)) {
				this.parseCommentExpressionNode();
			}
			else if (this.matches(TokenType.ElseIf)) {
				node.alternateNode = this.parseElseIfNode();
				break;
			}
			else if (this.matches(TokenType.Else)) {
				node.alternateNode = this.parseElseNode();
				break;
			}
			else {
				break;
			}
		}

		return node;
	}

	private parseElseIfNode(): ElseIfNode {
		let node = new ElseIfNode(this.getPosition());
		this.expect(TokenType.ElseIf);
		node.condition = this.parseJSValueExpression(this.parseBlockValueNode());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		while (!this.isEOF()) {
			if (this.matches(TokenType.Whitespace)) {
				this.consume();
			}
			else if (this.matches(TokenType.CommentExpressionStart)) {
				this.parseCommentExpressionNode();
			}
			else if (this.matches(TokenType.ElseIf)) {
				node.alternateNode = this.parseElseIfNode();
				break;
			}
			else if (this.matches(TokenType.Else)) {
				node.alternateNode = this.parseElseNode();
				break;
			}
			else {
				break;
			}
		}

		return node;
	}

	private parseElseNode(): ElseNode {
		let node = new ElseNode(this.getPosition());
		this.expect(TokenType.Else);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseSwitchNode(): SwitchNode {
		let node = new SwitchNode(this.getPosition());
		this.expect(TokenType.Switch);
		node.expression = this.parseJSValueExpression(this.parseBlockValueNode());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);

		while (!this.isEOF() && !this.matches(TokenType.BlockClosingStart)) {
			if (this.matches(TokenType.Whitespace)) {
				this.consume();
			}
			else if (this.matches(TokenType.CommentExpressionStart)) {
				this.parseCommentExpressionNode();
			}
			else if (this.matches(TokenType.Case)) {
				node.cases.push(this.parseCaseNode());
			}
			else if (this.matches(TokenType.DefaultCase)) {
				if (node.defaultCase) {
					throw new ParseError('Encountered multiple default block tokens.', this.getPosition());
				}

				node.defaultCase = this.parseDefaultCaseNode();
			}
			else {
				throw new ParseError('Encountered unexpected token.', this.getPosition());
			}
		}

		this.parseBlockClosingNode();
		return node;
	}

	private parseCaseNode(): CaseNode {
		let node = new CaseNode(this.getPosition());
		this.expect(TokenType.Case);
		node.expression = this.parseJSValueExpression(this.parseBlockValueNode());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseDefaultCaseNode(): DefaultCaseNode {
		let node = new DefaultCaseNode(this.getPosition());
		this.expect(TokenType.DefaultCase);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseForeachNode(): ForeachNode {
		let node = new ForeachNode(this.getPosition());
		this.expect(TokenType.Foreach);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		let quote = this.expectOneOf(HTML_QUOTE_TOKENS);

		while (!this.isEOF()) {
			if (node.identifiers.length > 0) {
				this.expect(TokenType.Comma);
			}

			this.consumeOptional(TokenType.Whitespace);
			let identifier = this.parseVariableNameValueNode();

			if (node.hasIdentifier(identifier)) {
				throw new ParseError('Encountered duplicate identifier in foreach.', identifier.position);
			}

			node.identifiers.push(identifier);
			this.consumeOptional(TokenType.Whitespace);

			if (!this.matches(TokenType.Comma)) {
				break;
			}
		}

		if (node.identifiers.length === 0) {
			throw new ParseError('Expected one of more identifiers.', this.getPosition());
		}

		this.expect(TokenType.InKeyword);
		this.consumeOptional(TokenType.Whitespace);
		node.collection = this.parseJSValueExpression(this.parseValueNode(quote.type));
		this.expect(quote.type);
		this.consumeOptional(TokenType.Whitespace);

		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		return node;
	}

	private parseWhileNode(): WhileNode {
		let node = new WhileNode(this.getPosition());
		this.expect(TokenType.While);
		node.condition = this.parseJSValueExpression(this.parseBlockValueNode());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseRenderNode(): RenderNode {
		let node = new RenderNode(this.getPosition());
		this.expect(TokenType.Render);
		node.viewPath = this.parseBlockValueNode().value.trim();
		this.consumeOptional(TokenType.Whitespace);

		if (this.matches(TokenType.ContextAttributeKeyword)) {
			this.consume();
			node.context = this.parseJSValueExpression(this.parseBlockValueNode());
			this.consumeOptional(TokenType.Whitespace);
		}

		this.expect(TokenType.ForwardSlash);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseRenderContentNode(): RenderContentNode {
		let node = new RenderContentNode(this.getPosition());
		this.expect(TokenType.RenderContent);
		this.consumeOptional(TokenType.Whitespace);

		if (this.matches(TokenType.Equals)) {
			node.slotName = this.parseBlockValueNode().value.trim();
		}

		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.ForwardSlash);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseContentForNode(): ContentForNode {
		let node = new ContentForNode(this.getPosition());
		this.expect(TokenType.ContentFor);
		node.slotName = this.parseBlockValueNode().value.trim();
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parsePrintNode(): PrintNode {
		let node = new PrintNode(this.getPosition());
		this.expect(TokenType.Print);
		node.expression = this.parseJSValueExpression(this.parseBlockValueNode());
		this.consumeOptional(TokenType.Whitespace);

		if (this.matches(TokenType.BlockAttributeKeyword)) {
			this.consume();
			this.consumeOptional(TokenType.Whitespace);
			this.expect(TokenType.Equals);
			this.consumeOptional(TokenType.Whitespace);
			let quote = this.expectOneOf(HTML_QUOTE_TOKENS);
			while (!this.isEOF()) {
				this.consumeOptional(TokenType.Whitespace);

				if (this.matches(quote.type)) {
					break;
				}

				if (node.blockArgs.length > 0) {
					this.expect(TokenType.Comma);
					this.consumeOptional(TokenType.Whitespace);
				}

				node.blockArgs.push(this.parseVariableNameValueNode());
			}

			this.expect(quote.type);

			if (node.blockArgs.length === 0) {
				throw new ParseError('Expected one or more arguments.', this.getPosition());
			}

			this.consumeOptional(TokenType.Whitespace);
		}

		if (this.matches(TokenType.ForwardSlash)) {
			if (node.blockArgs.length > 0) {
				throw new ParseError('Expected block body.', this.getPosition());
			}

			this.expect(TokenType.ForwardSlash);
			this.expect(TokenType.RightAngleBrace);
		}
		else {
			node.hasBlock = true;
			this.expect(TokenType.RightAngleBrace);
			node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
			this.parseBlockClosingNode();
		}

		return node;
	}

	private parseBlockClosingNode(): BlockClosingNode {
		let node = new BlockClosingNode(this.getPosition());
		this.expect(TokenType.BlockClosingStart);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseBlockValueNode(): ValueNode {
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		let quote = this.expectOneOf(HTML_QUOTE_TOKENS);
		let node = this.parseValueNode(quote.type);
		this.expect(quote.type);
		return node;
	}

	private parseExpressionNode(): ExpressionNode {
		let node = new ExpressionNode(this.getPosition());
		this.expect(TokenType.ExpressionStart);
		node.statement = this.parseJSExpressionStatement(this.parseValueNode(TokenType.ExpressionEnd));
		this.expect(TokenType.ExpressionEnd);
		return node;
	}

	private parsePrintExpressionNode(): PrintExpressionNode {
		let node = new PrintExpressionNode(this.getPosition());
		this.expect(TokenType.PrintExpressionStart);
		node.statement = this.parseJSPrintStatement(this.parseValueNode(TokenType.ExpressionEnd));
		this.expect(TokenType.ExpressionEnd);
		return node;
	}

	private parseCommentExpressionNode(): CommentExpressionNode {
		let node = new CommentExpressionNode(this.getPosition());
		this.expect(TokenType.CommentExpressionStart);
		node.textContent = this.consumeWhile(() => !this.matches(TokenType.ExpressionEnd));
		this.expect(TokenType.ExpressionEnd);
		return node;
	}

	// ========================================================================

	private parseValueNode(terminatingToken: TokenType): ValueNode {
		let node = new ValueNode(this.getPosition());
		node.value = this.consumeWhile(() => !this.matches(terminatingToken));
		return node;
	}

	private parseVariableNameValueNode(): ValueNode {
		let node = new ValueNode(this.getPosition());
		node.value = this.expectOneOf(VARIABLE_NAME_START_TOKENS).symbol;
		node.value += this.consumeWhile(() => this.matchesOneOf(VARIABLE_NAME_VALID_TOKENS));
		return node;
	}

	// ========================================================================

	private parseJSValueExpression(valueNode: ValueNode): JSValueExpression {
		let expressionNode = parseExpression(valueNode.value, {
			sourceType: 'script',
			strictMode: true,
			allowAwaitOutsideFunction: true
		});

		return this.overrideJSNodePosition(expressionNode, valueNode.position) as JSValueExpression;
	}

	private parseJSExpressionStatement(valueNode: ValueNode): JSExpressionStatement {
		return this.parseJSStatement(valueNode) as JSExpressionStatement;
	}

	private parseJSPrintStatement(valueNode: ValueNode): JSPrintStatement {
		let statement = this.parseJSStatement(valueNode);

		if (Types.isVariableDeclaration(statement)) {
			throw new ParseError(`Variable declarations are not allowed in this context.`, valueNode.position);
		}

		return statement as JSPrintStatement;
	}

	private parseJSStatement(valueNode: ValueNode): Types.Node {
		let result = parse(valueNode.value, {
			sourceType: 'script',
			strictMode: true,
			allowAwaitOutsideFunction: true
		});

		if (result.program.body.length !== 1) {
			throw new ParseError('Expected exactly 1 statement.', valueNode.position);
		}

		let statement = result.program.body[0];

		if (!Types.isExpressionStatement(statement) && !Types.isVariableDeclaration(statement)) {
			throw new ParseError('Encountered unsupported statement.', valueNode.position);
		}

		if (Types.isVariableDeclaration(statement) && statement.kind !== 'let') {
			throw new ParseError(`Variable declarations are only supported for the 'let' keyword.`, valueNode.position);
		}

		return this.overrideJSNodePosition(statement, valueNode.position);
	}

	private overrideJSNodePosition(node: Types.Node, position: Position): Types.Node {
		node = Types.cloneDeepWithoutLoc(node);

		node.loc = {
			start: {
				line: position.line,
				column: position.column - 1
			},
			end: {
				line: position.line,
				column: position.column - 1
			}
		};

		return node;
	}

	// ========================================================================

	private getToken(): Token {
		if (!this.tokenBuffer) {
			this.tokenBuffer = this.lexer.parseToken();
		}

		return this.tokenBuffer;
	}

	private consumeToken(): Token {
		let token = this.getToken();

		if (token.type !== TokenType.EndOfFile) {
			this.tokenBuffer = null;
		}

		return token;
	}

	private getPosition(): Position {
		return this.getToken().position;
	}

	private isEOF(): boolean {
		return this.getToken().type === TokenType.EndOfFile;
	}

	private peek(): Token {
		return this.getToken();
	}

	private matches(tokenType: TokenType): boolean {
		return this.getToken().type === tokenType;
	}

	private matchesOneOf(tokenTypes: TokenType[]): boolean {
		return tokenTypes.some(tokenType => this.matches(tokenType));
	}

	private matchesWithSymbol(tokenType: TokenType, symbol: string): boolean {
		let token = this.getToken();
		return token.type === tokenType && token.symbol === symbol;
	}

	private consume(): Token {
		return this.consumeToken();
	}

	private consumeOptional(tokenType: TokenType): Token {
		let token = this.getToken();

		if (token.type !== tokenType) {
			return null;
		}

		return this.consumeToken();
	}

	private consumeWhile(conditionFunction: () => boolean): string {
		let string = '';
		while (conditionFunction()) {
			string += this.consume().symbol;
		}
		return string;
	}

	private expect(tokenType: TokenType): Token {
		if (this.isEOF()) {
			throw new ParseError('Unexpected end of file.', this.getPosition());
		}

		let token = this.consumeToken();

		if (token.type !== tokenType) {
			throw new ParseError('Encountered unexpected token.', token.position);
		}

		return token;
	}

	private expectOneOf(tokenTypes: TokenType[]): Token {
		for (let tokenType of tokenTypes) {
			if (this.matches(tokenType)) {
				return this.consume();
			}
		}

		throw new ParseError('Encountered unexpected token.', this.getPosition());
	}

	private expectWithSymbol(tokenType: TokenType, symbol: string): Token {
		if (!this.matchesWithSymbol(tokenType, symbol)) {
			throw new ParseError('Encountered unexpected token.', this.getPosition());
		}

		return this.consume();
	}

}
