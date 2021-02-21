import { parse, parseExpression } from '@babel/parser';
import * as Types from '@babel/types';
import { Lexer } from './lexer';
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

	public constructor(options: ParserOptions) {
		this.options = options;
	}

	public parse(source: string, filePath: string): ViewNode {
		this.lexer = new Lexer(source, this.options.tags, this.options.tabSize);

		let viewNode = new ViewNode(source, filePath);

		if (this.lexer.matches(TokenType.Layout)) {
			viewNode.layoutNode = this.parseLayoutNode();
		}

		while (!this.lexer.isEOF()) {
			viewNode.childNodes.push(this.parseNode());
		}

		return viewNode;
	}

	// ========================================================================

	private parseLayoutNode(): LayoutNode {
		let node = new LayoutNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Layout);

		let valueNode = this.parseBlockValueNode();
		node.value = valueNode.value.trim();
		if (node.value.length === 0) {
			this.lexer.throwError('Expected a view path.', valueNode.position);
		}

		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.ForwardSlash);
		this.lexer.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseNode(): Node {
		if (this.lexer.isEOF()) {
			this.lexer.throwError('Unexpected end of file.');
		}

		switch (this.lexer.peek().type) {
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
				this.lexer.throwError('Layout node must be the first statement in the view.');
				break;

			// Invalid node start tokens
			case TokenType.ElementClosingStart:
			case TokenType.ElseIf:
			case TokenType.Else:
			case TokenType.Case:
			case TokenType.DefaultCase:
			case TokenType.BlockClosingStart:
			case TokenType.ExpressionEnd:
				this.lexer.throwError('Encountered unexpected token.');
				break;
		}

		return this.parseTextNode();
	}

	private parseNodesUntilMatches(tokenType: TokenType): Node[] {
		let nodes = [];

		while (!this.lexer.matches(tokenType)) {
			nodes.push(this.parseNode());
		}

		return nodes;
	}

	private parseWhitespaceNode(): WhitespaceNode {
		let node = new WhitespaceNode(this.lexer.getPosition());
		node.textContent = this.lexer.expect(TokenType.Whitespace).symbol;
		return node;
	}

	private parseTextNode(): TextNode {
		let node = new TextNode(this.lexer.getPosition());

		while (!this.lexer.isEOF() && !this.lexer.matchesOneOf(INVALID_TEXT_TOKENS)) {
			switch (this.lexer.peek().type) {
				// case TokenType.ExpressionStartEscape:
				// case TokenType.ExpressionEndEscape:
				// 	node.textContent += this.lexer.consume().value;
				// 	break;
				default:
					node.textContent += this.lexer.consume().symbol;
			}
		}

		return node;
	}

	private parseEmbeddedLanguageTextNode(tagName: string): TextNode {
		let node = new TextNode(this.lexer.getPosition());
		node.textContent = this.lexer.consumeWhile(() => !this.lexer.matches(TokenType.ElementClosingStart) || this.lexer.peek().properties.get('tagName') !== tagName);
		return node;
	}

	private parseCommentNode(): CommentNode {
		let node = new CommentNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.CommentStart);
		node.textContent = this.lexer.consumeWhile(() => !this.lexer.matches(TokenType.CommentEnd));
		this.lexer.expect(TokenType.CommentEnd);
		return node;
	}

	private parseCDataNode(): CDataNode {
		let node = new CDataNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.CDataStart);
		node.textContent = this.lexer.consumeWhile(() => !this.lexer.matches(TokenType.CDataEnd));
		this.lexer.expect(TokenType.CDataEnd);
		return node;
	}

	private parseDoctypeNode(): DoctypeNode {
		let node = new DoctypeNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Doctype);
		this.lexer.expect(TokenType.Whitespace);
		this.lexer.expectWithSymbol(TokenType.Letters, 'html');
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseElementNode(): ElementNode {
		let node = new ElementNode(this.lexer.getPosition());
		node.tagName = this.lexer.expect(TokenType.ElementStart).properties.get('tagName');
		node.isVoid = VOID_ELEMENTS.includes(node.tagName);
		this.lexer.consumeOptional(TokenType.Whitespace);

		let terminatingTokens = [TokenType.ForwardSlash, TokenType.RightAngleBrace];
		while (!this.lexer.matchesOneOf(terminatingTokens)) {
			node.attributes.push(this.parseAttributeNode());
			this.lexer.consumeOptional(TokenType.Whitespace);
		}

		if (this.lexer.matches(TokenType.ForwardSlash)) {
			this.lexer.consume();
			node.isSelfClosing = true;
		}

		this.lexer.expect(TokenType.RightAngleBrace);

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
			this.lexer.throwError('Encountered mismatched closing tag.', node.closingNode.position);
		}

		return node;
	}

	private parseElementClosingNode(): ElementClosingNode {
		let node = new ElementClosingNode(this.lexer.getPosition());
		node.tagName = this.lexer.expect(TokenType.ElementClosingStart).properties.get('tagName');
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseAttributeNode(): ElementAttributeNode {
		let position = this.lexer.getPosition();

		if (!this.lexer.matches(TokenType.LeftSquareBrace)) {
			return this.parseNormalAttributeNode(position);
		}

		this.lexer.expect(TokenType.LeftSquareBrace);

		if (this.lexer.matches(TokenType.QuestionMark)) {
			return this.parseConditionalAttributeNode(position);
		}

		let name = this.parseAttributeName();

		if (this.lexer.matches(TokenType.Dot)) {
			return this.parseAppendAttributeNode(position, name);
		}

		return this.parseExpressionAttributeNode(position, name);
	}

	private parseNormalAttributeNode(position: Position): NormalAttributeNode {
		let node = new NormalAttributeNode(position);
		node.name = this.parseAttributeName();
		this.lexer.consumeOptional(TokenType.Whitespace);

		if (!this.lexer.matches(TokenType.Equals)) {
			return node;
		}

		this.lexer.expect(TokenType.Equals);
		this.lexer.consumeOptional(TokenType.Whitespace);
		node.quote = this.lexer.expectOneOf(HTML_QUOTE_TOKENS);

		node.values = [];
		while (!this.lexer.isEOF() && !this.lexer.matches(node.quote.type)) {
			switch (this.lexer.peek().type) {
				case TokenType.PrintExpressionStart: {
					this.lexer.consume();
					node.values.push(
						this.parseJSValueExpression(this.parseValueNode(TokenType.ExpressionEnd))
					);
					this.lexer.expect(TokenType.ExpressionEnd);
					break;
				}
				case TokenType.ExpressionStart:
				case TokenType.CommentExpressionStart:
					this.lexer.consume();
					this.lexer.consumeWhile(() => !this.lexer.matches(TokenType.ExpressionEnd));
					this.lexer.expect(TokenType.ExpressionEnd);
					break;
				case TokenType.ExpressionEnd:
					this.lexer.throwError('Encountered unexpected token.');
					break;
				// case TokenType.ExpressionStartEscape:
				// case TokenType.ExpressionEndEscape:
				// 	node.values.push(this.lexer.consume().value);
				// 	break;
				default: {
					let value = this.lexer.consumeWhile(() => !this.lexer.matches(node.quote.type) && !this.lexer.matchesOneOf(NORMAL_ATTRIBUTE_STRING_TERMINATING_TOKENS));
					node.values.push(value);
				}
			}
		}

		this.lexer.expect(node.quote.type);
		return node;
	}

	private parseConditionalAttributeNode(position: Position): ConditionalAttributeNode {
		let node = new ConditionalAttributeNode(position);
		this.lexer.expect(TokenType.QuestionMark);
		node.name = this.parseAttributeName();
		this.lexer.expect(TokenType.RightSquareBrace);
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.Equals);
		this.lexer.consumeOptional(TokenType.Whitespace);
		node.quote = this.lexer.expectOneOf(HTML_QUOTE_TOKENS);
		node.condition = this.parseJSValueExpression(this.parseValueNode(node.quote.type));
		this.lexer.expect(node.quote.type);
		return node;
	}

	private parseAppendAttributeNode(position: Position, name: string): AppendAttributeNode {
		let node = new AppendAttributeNode(position);
		node.name = name;
		this.lexer.expect(TokenType.Dot);
		node.value = this.lexer.consumeWhile(() => !this.lexer.matchesOneOf(ATTRIBUTE_NAME_TERMINATING_TOKENS));
		this.lexer.expect(TokenType.RightSquareBrace);
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.Equals);
		this.lexer.consumeOptional(TokenType.Whitespace);
		node.quote = this.lexer.expectOneOf(HTML_QUOTE_TOKENS);
		node.condition = this.parseJSValueExpression(this.parseValueNode(node.quote.type));
		this.lexer.expect(node.quote.type);
		return node;
	}

	private parseExpressionAttributeNode(position: Position, name: string): ExpressionAttributeNode {
		let node = new ExpressionAttributeNode(position);
		node.name = name;
		this.lexer.expect(TokenType.RightSquareBrace);
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.Equals);
		this.lexer.consumeOptional(TokenType.Whitespace);
		node.quote = this.lexer.expectOneOf(HTML_QUOTE_TOKENS);
		node.expression = this.parseJSValueExpression(this.parseValueNode(node.quote.type));
		this.lexer.expect(node.quote.type);
		return node;
	}

	private parseAttributeName(): string {
		let name = this.lexer.consumeWhile(() => !this.lexer.matchesOneOf(ATTRIBUTE_NAME_TERMINATING_TOKENS));

		if (name.length === 0) {
			this.lexer.throwError('Expected valid attribute name.');
		}

		return name;
	}

	private parseScopeNode(): ScopeNode {
		let node = new ScopeNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Scope);
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseIfNode(): IfNode {
		let node = new IfNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.If);
		node.condition = this.parseJSValueExpression(this.parseBlockValueNode());
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		while (!this.lexer.isEOF()) {
			if (this.lexer.matches(TokenType.Whitespace)) {
				this.lexer.consume();
			}
			else if (this.lexer.matches(TokenType.CommentExpressionStart)) {
				this.parseCommentExpressionNode();
			}
			else if (this.lexer.matches(TokenType.ElseIf)) {
				node.alternateNode = this.parseElseIfNode();
				break;
			}
			else if (this.lexer.matches(TokenType.Else)) {
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
		let node = new ElseIfNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.ElseIf);
		node.condition = this.parseJSValueExpression(this.parseBlockValueNode());
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		while (!this.lexer.isEOF()) {
			if (this.lexer.matches(TokenType.Whitespace)) {
				this.lexer.consume();
			}
			else if (this.lexer.matches(TokenType.CommentExpressionStart)) {
				this.parseCommentExpressionNode();
			}
			else if (this.lexer.matches(TokenType.ElseIf)) {
				node.alternateNode = this.parseElseIfNode();
				break;
			}
			else if (this.lexer.matches(TokenType.Else)) {
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
		let node = new ElseNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Else);
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseSwitchNode(): SwitchNode {
		let node = new SwitchNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Switch);
		node.expression = this.parseJSValueExpression(this.parseBlockValueNode());
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);

		while (!this.lexer.isEOF() && !this.lexer.matches(TokenType.BlockClosingStart)) {
			if (this.lexer.matches(TokenType.Whitespace)) {
				this.lexer.consume();
			}
			else if (this.lexer.matches(TokenType.CommentExpressionStart)) {
				this.parseCommentExpressionNode();
			}
			else if (this.lexer.matches(TokenType.Case)) {
				node.cases.push(this.parseCaseNode());
			}
			else if (this.lexer.matches(TokenType.DefaultCase)) {
				if (node.defaultCase) {
					this.lexer.throwError('Encountered multiple default block tokens.');
				}

				node.defaultCase = this.parseDefaultCaseNode();
			}
			else {
				this.lexer.throwError('Encountered unexpected token.');
			}
		}

		this.parseBlockClosingNode();
		return node;
	}

	private parseCaseNode(): CaseNode {
		let node = new CaseNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Case);
		node.expression = this.parseJSValueExpression(this.parseBlockValueNode());
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseDefaultCaseNode(): DefaultCaseNode {
		let node = new DefaultCaseNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.DefaultCase);
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseForeachNode(): ForeachNode {
		let node = new ForeachNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Foreach);
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.Equals);
		this.lexer.consumeOptional(TokenType.Whitespace);
		let quote = this.lexer.expectOneOf(HTML_QUOTE_TOKENS);

		while (!this.lexer.isEOF()) {
			if (node.identifiers.length > 0) {
				this.lexer.expect(TokenType.Comma);
			}

			this.lexer.consumeOptional(TokenType.Whitespace);
			let identifier = this.parseVariableNameValueNode();

			if (node.hasIdentifier(identifier)) {
				this.lexer.throwError('Encountered duplicate identifier in foreach.', identifier.position);
			}

			node.identifiers.push(identifier);
			this.lexer.consumeOptional(TokenType.Whitespace);

			if (!this.lexer.matches(TokenType.Comma)) {
				break;
			}
		}

		if (node.identifiers.length === 0) {
			this.lexer.throwError('Expected one of more identifiers.');
		}

		this.lexer.expect(TokenType.InKeyword);
		this.lexer.consumeOptional(TokenType.Whitespace);
		node.collection = this.parseJSValueExpression(this.parseValueNode(quote.type));
		this.lexer.expect(quote.type);
		this.lexer.consumeOptional(TokenType.Whitespace);

		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		return node;
	}

	private parseWhileNode(): WhileNode {
		let node = new WhileNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.While);
		node.condition = this.parseJSValueExpression(this.parseBlockValueNode());
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseRenderNode(): RenderNode {
		let node = new RenderNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Render);
		node.viewPath = this.parseBlockValueNode().value.trim();
		this.lexer.consumeOptional(TokenType.Whitespace);

		if (this.lexer.matches(TokenType.ContextAttributeKeyword)) {
			this.lexer.consume();
			node.context = this.parseJSValueExpression(this.parseBlockValueNode());
			this.lexer.consumeOptional(TokenType.Whitespace);
		}

		this.lexer.expect(TokenType.ForwardSlash);
		this.lexer.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseRenderContentNode(): RenderContentNode {
		let node = new RenderContentNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.RenderContent);
		this.lexer.consumeOptional(TokenType.Whitespace);

		if (this.lexer.matches(TokenType.Equals)) {
			node.slotName = this.parseBlockValueNode().value.trim();
		}

		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.ForwardSlash);
		this.lexer.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseContentForNode(): ContentForNode {
		let node = new ContentForNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.ContentFor);
		node.slotName = this.parseBlockValueNode().value.trim();
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parsePrintNode(): PrintNode {
		let node = new PrintNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.Print);
		node.expression = this.parseJSValueExpression(this.parseBlockValueNode());
		this.lexer.consumeOptional(TokenType.Whitespace);

		if (this.lexer.matches(TokenType.BlockAttributeKeyword)) {
			this.lexer.consume();
			this.lexer.consumeOptional(TokenType.Whitespace);
			this.lexer.expect(TokenType.Equals);
			this.lexer.consumeOptional(TokenType.Whitespace);
			let quote = this.lexer.expectOneOf(HTML_QUOTE_TOKENS);
			while (!this.lexer.isEOF()) {
				this.lexer.consumeOptional(TokenType.Whitespace);

				if (this.lexer.matches(quote.type)) {
					break;
				}

				if (node.blockArgs.length > 0) {
					this.lexer.expect(TokenType.Comma);
					this.lexer.consumeOptional(TokenType.Whitespace);
				}

				node.blockArgs.push(this.parseVariableNameValueNode());
			}

			this.lexer.expect(quote.type);

			if (node.blockArgs.length === 0) {
				this.lexer.throwError('Expected one or more arguments.');
			}

			this.lexer.consumeOptional(TokenType.Whitespace);
		}

		if (this.lexer.matches(TokenType.ForwardSlash)) {
			if (node.blockArgs.length > 0) {
				this.lexer.throwError('Expected block body.');
			}

			this.lexer.expect(TokenType.ForwardSlash);
			this.lexer.expect(TokenType.RightAngleBrace);
		}
		else {
			node.hasBlock = true;
			this.lexer.expect(TokenType.RightAngleBrace);
			node.childNodes = this.parseNodesUntilMatches(TokenType.BlockClosingStart);
			this.parseBlockClosingNode();
		}

		return node;
	}

	private parseBlockClosingNode(): BlockClosingNode {
		let node = new BlockClosingNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.BlockClosingStart);
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseBlockValueNode(): ValueNode {
		this.lexer.consumeOptional(TokenType.Whitespace);
		this.lexer.expect(TokenType.Equals);
		this.lexer.consumeOptional(TokenType.Whitespace);
		let quote = this.lexer.expectOneOf(HTML_QUOTE_TOKENS);
		let node = this.parseValueNode(quote.type);
		this.lexer.expect(quote.type);
		return node;
	}

	private parseExpressionNode(): ExpressionNode {
		let node = new ExpressionNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.ExpressionStart);
		node.statement = this.parseJSExpressionStatement(this.parseValueNode(TokenType.ExpressionEnd));
		this.lexer.expect(TokenType.ExpressionEnd);
		return node;
	}

	private parsePrintExpressionNode(): PrintExpressionNode {
		let node = new PrintExpressionNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.PrintExpressionStart);
		node.statement = this.parseJSPrintStatement(this.parseValueNode(TokenType.ExpressionEnd));
		this.lexer.expect(TokenType.ExpressionEnd);
		return node;
	}

	private parseCommentExpressionNode(): CommentExpressionNode {
		let node = new CommentExpressionNode(this.lexer.getPosition());
		this.lexer.expect(TokenType.CommentExpressionStart);
		node.textContent = this.lexer.consumeWhile(() => !this.lexer.matches(TokenType.ExpressionEnd));
		this.lexer.expect(TokenType.ExpressionEnd);
		return node;
	}

	// ========================================================================

	private parseValueNode(terminatingToken: TokenType): ValueNode {
		let node = new ValueNode(this.lexer.getPosition());
		node.value = this.lexer.consumeWhile(() => !this.lexer.matches(terminatingToken));
		return node;
	}

	private parseVariableNameValueNode(): ValueNode {
		let node = new ValueNode(this.lexer.getPosition());
		node.value = this.lexer.expectOneOf(VARIABLE_NAME_START_TOKENS).symbol;
		node.value += this.lexer.consumeWhile(() => this.lexer.matchesOneOf(VARIABLE_NAME_VALID_TOKENS));
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
			this.lexer.throwError(`Variable declarations are not allowed in this context.`, valueNode.position);
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
			this.lexer.throwError('Expected exactly 1 statement.', valueNode.position);
		}

		let statement = result.program.body[0];

		if (!Types.isExpressionStatement(statement) && !Types.isVariableDeclaration(statement)) {
			this.lexer.throwError('Encountered unsupported statement.', valueNode.position);
		}

		if (Types.isVariableDeclaration(statement) && statement.kind !== 'let') {
			this.lexer.throwError(`Variable declarations are only supported for the 'let' keyword.`, valueNode.position);
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

}
