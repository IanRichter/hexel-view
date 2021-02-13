import { parse } from '@babel/parser';
import * as Types from '@babel/types';
import { Lexer } from './lexer';
import { TemplateNode } from './nodes/template-node';
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
import { RenderDefaultSlotNode } from './nodes/render-default-slot-node';
import { RenderSlotNode } from './nodes/render-slot-node';
import { ContentForNode } from './nodes/content-for-node';
import { BlockClosingNode } from './nodes/block-closing-node';
import { ExpressionNode } from './nodes/expression-node';
import { ExpressionCommentNode } from './nodes/expression-comment-node';
import { CommentNode } from './nodes/comment-node';
import { CDataNode } from './nodes/cdata-node';
import { DoctypeNode } from './nodes/doctype-node';
import { ElementNode } from './nodes/element-node';
import { ElementClosingNode } from './nodes/element-closing-node';
import { ElementAttributeNode } from './nodes/element-attribute-node';
import { NormalAttributeNode } from './nodes/normal-attribute-node';
import { BooleanExpressionAttributeNode } from './nodes/boolean-expression-attribute-node';
import { AppendExpressionAttributeNode } from './nodes/append-expression-attribute-node';
import { OutputExpressionAttributeNode } from './nodes/output-expression-attribute-node';
import { WhitespaceNode } from './nodes/whitespace-node';
import { TextNode } from './nodes/text-node';
import { ParserOptions } from './parser-options';
import { JSValueExpression, JSStatement } from './js-types';

export class Parser {

	private lexer: Lexer;

	private blockTagName: string;
	private expressionStartDelimiter: string;
	private expressionStartEscapeDelimiter: string;
	private expressionCommentStartDelimiter: string;
	private expressionEndDelimiter: string;
	private expressionEndEscapeDelimiter: string;

	// ========================================================================

	public constructor({
		blockTagName = 'js',
		expressionStartDelimiter = '{{',
		expressionStartEscapeDelimiter = '{{{',
		expressionCommentStartDelimiter = '{{#',
		expressionEndDelimiter = '}}',
		expressionEndEscapeDelimiter = '}}}'
	}: ParserOptions = {}) {
		this.blockTagName = blockTagName;
		this.expressionStartDelimiter = expressionStartDelimiter;
		this.expressionStartEscapeDelimiter = expressionStartEscapeDelimiter;
		this.expressionCommentStartDelimiter = expressionCommentStartDelimiter;
		this.expressionEndDelimiter = expressionEndDelimiter;
		this.expressionEndEscapeDelimiter = expressionEndEscapeDelimiter;
	}

	public parse(filename: string, viewSource: string): TemplateNode {
		this.lexer = new Lexer({
			inputString: viewSource,
			blockTagName: this.blockTagName,
			expressionStartDelimiter: this.expressionStartDelimiter,
			expressionStartEscapeDelimiter: this.expressionStartEscapeDelimiter,
			expressionCommentStartDelimiter: this.expressionCommentStartDelimiter,
			expressionEndDelimiter: this.expressionEndDelimiter,
			expressionEndEscapeDelimiter: this.expressionEndEscapeDelimiter
		});

		return this.parseTemplate(filename, viewSource);
	}

	// ========================================================================

	private parseTemplate(filename: string, viewSource: string): TemplateNode {
		let node = new TemplateNode(this.lexer.getPosition(), filename, viewSource);

		while (!this.isEOF()) {
			node.childNodes.push(this.parseNode());
		}

		if (!this.isEOF()) {
			throw new ParseError('Failed to parse entire template.', this.lexer.getPosition());
		}

		return node;
	}

	private parseNode(): Node {
		if (this.isEOF()) {
			throw new ParseError('Unexpected end of file.', this.lexer.getPosition());
		}

		switch (this.peek().type) {
			case TokenType.Scope:
				return this.parseScopeNode();
			case TokenType.Print:
				return this.parsePrintNode();
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
			case TokenType.RenderDefaultSlot:
				return this.parseRenderDefaultSlotNode();
			case TokenType.RenderSlot:
				return this.parseRenderSlotNode();
			case TokenType.ContentFor:
				return this.parseContentForNode();
			case TokenType.ExpressionStart:
				return this.parseExpressionNode();
			case TokenType.ExpressionCommentStart:
				return this.parseExpressionCommentNode();
			case TokenType.CommentStart:
				return this.parseCommentNode();
			case TokenType.CDataStart:
				return this.parseCDataNode();
			case TokenType.Doctype:
				return this.parseDoctypeNode();
			case TokenType.ElementStart:
				return this.parseElementNode();
			case TokenType.Whitespace:
				return this.parseWhitespaceNode();
		}

		if (this.matchesOneOf(INVALID_NODE_START_TOKENS)) {
			throw new ParseError('Encountered unexpected token.', this.getTokenPostion());
		}

		return this.parseTextNode();
	}

	private parseNodeUntilMatches(tokenType: TokenType): Node[] {
		let nodes = [];
		while (!this.matches(tokenType)) {
			nodes.push(this.parseNode());
		}
		return nodes;
	}

	private parseScopeNode(): ScopeNode {
		let node = new ScopeNode(this.getTokenPostion());
		this.expect(TokenType.Scope);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parsePrintNode(): PrintNode {
		let node = new PrintNode(this.getTokenPostion());
		this.expect(TokenType.Print);
		node.expression = this.parseJSValueExpression(this.parseBlockValueString());
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
					this.consume();
					break;
				}

				if (node.blockArgs.length > 0) {
					this.expect(TokenType.Comma);
					this.consumeOptional(TokenType.Whitespace);
				}

				node.blockArgs.push(this.parseVariableName());
			}

			if (node.blockArgs.length === 0) {
				throw new ParseError('Expected one or more arguments.', this.getTokenPostion());
			}

			this.consumeOptional(TokenType.Whitespace);
		}

		if (node.blockArgs.length === 0 && this.matches(TokenType.ForwardSlash)) {
			this.expect(TokenType.ForwardSlash);
			this.expect(TokenType.RightAngleBrace);
		}
		else {
			node.hasBlock = true;
			this.expect(TokenType.RightAngleBrace);
			node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
			this.parseBlockClosingNode();
		}

		return node;
	}

	private parseIfNode(): IfNode {
		let node = new IfNode(this.getTokenPostion());
		this.expect(TokenType.If);
		node.condition = this.parseJSValueExpression(this.parseBlockValueString());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		while (!this.isEOF()) {
			if (this.matches(TokenType.Whitespace)) {
				this.consume();
			}
			else if (this.matches(TokenType.ExpressionCommentStart)) {
				this.parseExpressionCommentNode();
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
		let node = new ElseIfNode(this.getTokenPostion());
		this.expect(TokenType.ElseIf);
		node.condition = this.parseJSValueExpression(this.parseBlockValueString());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		while (!this.isEOF()) {
			if (this.matches(TokenType.Whitespace)) {
				this.consume();
			}
			else if (this.matches(TokenType.ExpressionCommentStart)) {
				this.parseExpressionCommentNode();
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
		let node = new ElseNode(this.getTokenPostion());
		this.expect(TokenType.Else);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseSwitchNode(): SwitchNode {
		let node = new SwitchNode(this.getTokenPostion());
		this.expect(TokenType.Switch);
		node.expression = this.parseJSValueExpression(this.parseBlockValueString());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);

		while (!this.isEOF() && !this.matches(TokenType.BlockClosingStart)) {
			if (this.matches(TokenType.Whitespace)) {
				this.consume();
			}
			else if (this.matches(TokenType.ExpressionCommentStart)) {
				this.parseExpressionCommentNode();
			}
			else if (this.matches(TokenType.Case)) {
				node.cases.push(this.parseCaseNode());
			}
			else if (this.matches(TokenType.DefaultCase)) {
				if (node.defaultCase) {
					throw new ParseError('Encountered multiple default block tokens.', this.getTokenPostion());
				}

				node.defaultCase = this.parseDefaultCaseNode();
			}
			else {
				throw new ParseError('Encountered unexpected token.', this.getTokenPostion());
			}
		}

		this.parseBlockClosingNode();
		return node;
	}

	private parseCaseNode(): CaseNode {
		let node = new CaseNode(this.getTokenPostion());
		this.expect(TokenType.Case);
		node.expression = this.parseJSValueExpression(this.parseBlockValueString());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseDefaultCaseNode(): DefaultCaseNode {
		let node = new DefaultCaseNode(this.getTokenPostion());
		this.expect(TokenType.DefaultCase);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseForeachNode(): ForeachNode {
		let node = new ForeachNode(this.getTokenPostion());
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
			let identifier = this.parseVariableName();

			if (node.identifiers.includes(identifier)) {
				throw new ParseError('Encountered duplicate identifier in foreach.', this.lexer.getPosition());
			}

			node.identifiers.push(identifier);
			this.consumeOptional(TokenType.Whitespace);

			if (!this.matches(TokenType.Comma)) {
				break;
			}
		}

		if (node.identifiers.length === 0) {
			throw new ParseError('Expected one or more identifiers.', this.getTokenPostion());
		}

		this.expect(TokenType.InKeyword);
		this.consumeOptional(TokenType.Whitespace);
		node.collection = this.parseJSValueExpression({
			position: this.getTokenPostion(),
			valueString: this.consumeWhile(() => !this.matches(quote.type))
		});
		this.expect(quote.type);
		this.consumeOptional(TokenType.Whitespace);

		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();

		while (!this.isEOF()) {
			if (this.matches(TokenType.Whitespace)) {
				this.consume();
			}
			else if (this.matches(TokenType.ExpressionCommentStart)) {
				this.parseExpressionCommentNode();
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

	private parseWhileNode(): WhileNode {
		let node = new WhileNode(this.getTokenPostion());
		this.expect(TokenType.While);
		node.condition = this.parseJSValueExpression(this.parseBlockValueString());
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseRenderNode(): RenderNode {
		let node = new RenderNode(this.getTokenPostion());
		this.expect(TokenType.Render);
		let { valueString: templatePath } = this.parseBlockValueString();
		node.templatePath = templatePath;
		this.consumeOptional(TokenType.Whitespace);

		if (this.matches(TokenType.ContextAttributeKeyword)) {
			this.consume();
			node.context = this.parseJSValueExpression(this.parseBlockValueString());
			this.consumeOptional(TokenType.Whitespace);
		}

		this.expect(TokenType.ForwardSlash);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseRenderDefaultSlotNode(): RenderDefaultSlotNode {
		let node = new RenderDefaultSlotNode(this.getTokenPostion());
		this.expect(TokenType.RenderDefaultSlot);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.ForwardSlash);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseRenderSlotNode(): RenderSlotNode {
		let node = new RenderSlotNode(this.getTokenPostion());
		this.expect(TokenType.RenderSlot);
		let { valueString: slotName } = this.parseBlockValueString();
		node.slotName = slotName;
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.ForwardSlash);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseContentForNode(): ContentForNode {
		let node = new ContentForNode(this.getTokenPostion());
		this.expect(TokenType.ContentFor);
		let { valueString: slotName } = this.parseBlockValueString();
		node.slotName = slotName;
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		node.childNodes = this.parseNodeUntilMatches(TokenType.BlockClosingStart);
		this.parseBlockClosingNode();
		return node;
	}

	private parseBlockClosingNode(): BlockClosingNode {
		let node = new BlockClosingNode(this.getTokenPostion());
		this.expect(TokenType.BlockClosingStart);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseBlockValueString(): BlockValue {
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		let quote = this.expectOneOf(HTML_QUOTE_TOKENS);
		let position = this.lexer.getPosition();
		let valueString = this.lexer.consumeRawUntilMatches(quote.symbol).trim();
		this.expect(quote.type);
		return {
			position,
			valueString
		};
	}

	private parseVariableName(): string {
		let name = this.expectOneOf(VARIABLE_NAME_START_TOKENS).symbol;
		name += this.consumeWhile(() => this.matchesOneOf(VARIABLE_NAME_VALID_TOKENS));
		return name;
	}

	private parseExpressionNode(): ExpressionNode {
		let node = new ExpressionNode(this.getTokenPostion());
		this.expect(TokenType.ExpressionStart);
		node.statement = this.parseJSStatement({
			position: this.getTokenPostion(),
			valueString: this.consumeWhile(() => !this.matches(TokenType.ExpressionEnd))
		});
		this.expect(TokenType.ExpressionEnd);
		return node;
	}

	private parseExpressionCommentNode(): ExpressionCommentNode {
		let node = new ExpressionCommentNode(this.getTokenPostion());
		this.expect(TokenType.ExpressionCommentStart);
		node.textContent = this.consumeWhile(() => !this.matches(TokenType.ExpressionEnd));
		this.expect(TokenType.ExpressionEnd);
		return node;
	}

	private parseCommentNode(): CommentNode {
		let node = new CommentNode(this.getTokenPostion());
		this.expect(TokenType.CommentStart);
		node.textContent = this.consumeWhile(() => !this.matches(TokenType.CommentEnd));
		this.expect(TokenType.CommentEnd);
		return node;
	}

	private parseCDataNode(): CDataNode {
		let node = new CDataNode(this.getTokenPostion());
		this.expect(TokenType.CDataStart);
		node.textContent = this.consumeWhile(() => !this.matches(TokenType.CDataEnd));
		this.expect(TokenType.CDataEnd);
		return node;
	}

	private parseDoctypeNode(): DoctypeNode {
		let node = new DoctypeNode(this.getTokenPostion());
		this.expect(TokenType.Doctype);
		this.expect(TokenType.Whitespace);
		this.expectWithSymbol(TokenType.Letters, 'html');
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseElementNode(): ElementNode {
		let node = new ElementNode(this.getTokenPostion());
		node.tagName = this.expect(TokenType.ElementStart).tagName;
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
			node.childNodes = this.parseNodeUntilMatches(TokenType.ElementClosingStart);
		}

		let closingNode = this.parseElementClosingNode();

		if (closingNode.tagName !== node.tagName) {
			throw new ParseError('Encountered mismatched closing tag.', closingNode.position);
		}

		return node;
	}

	private parseElementClosingNode(): ElementClosingNode {
		let node = new ElementClosingNode(this.getTokenPostion());
		node.tagName = this.expect(TokenType.ElementClosingStart).tagName;
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.RightAngleBrace);
		return node;
	}

	private parseAttributeNode(): ElementAttributeNode {
		let position = this.getTokenPostion();

		if (!this.matches(TokenType.LeftSquareBrace)) {
			return this.parseNormalAttributeNode(position);
		}

		this.expect(TokenType.LeftSquareBrace);

		if (this.matches(TokenType.QuestionMark)) {
			return this.parseBooleanExpressionAttributeNode(position);
		}

		let name = this.parseAttributeName();

		if (this.matches(TokenType.Dot)) {
			return this.parseAppendExpressionAttributeNode(position, name);
		}

		return this.parseOutputExpressionAttributeNode(position, name);
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
		while (!this.isEOF()  && !this.matches(node.quote.type)) {
			switch (this.peek().type) {
				case TokenType.ExpressionStart: {
					this.consume();
					node.values.push(this.parseJSValueExpression({
						position: this.getTokenPostion(),
						valueString: this.consumeWhile(() => !this.matches(TokenType.ExpressionEnd))
					}));
					this.expect(TokenType.ExpressionEnd);
					break;
				}
				case TokenType.ExpressionEnd:
					throw new ParseError('Encountered unexpected token.', this.getTokenPostion());
				case TokenType.ExpressionCommentStart:
					this.consume();
					this.consumeWhile(() => !this.matches(TokenType.ExpressionEnd));
					this.expect(TokenType.ExpressionEnd);
					break;
				case TokenType.ExpressionStartEscape:
					this.consume();
					node.values.push(this.lexer.expressionStartDelimiter);
					break;
				case TokenType.ExpressionEndEscape:
					this.consume();
					node.values.push(this.lexer.expressionEndDelimiter);
					break;
				default: {
					let value = this.consumeWhile(() => !this.matches(node.quote.type) && !this.matchesOneOf(NORMAL_ATTRIBUTE_STRING_TERMINATING_TOKENS));
					node.values.push(value);
				}
			}
		}

		this.expect(node.quote.type);
		return node;
	}

	private parseBooleanExpressionAttributeNode(position: Position): BooleanExpressionAttributeNode {
		let node = new BooleanExpressionAttributeNode(position);
		this.expect(TokenType.QuestionMark);
		node.name = this.parseAttributeName();
		this.expect(TokenType.RightSquareBrace);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		node.quote = this.expectOneOf(HTML_QUOTE_TOKENS);
		node.condition = this.parseJSValueExpression({
			position: this.lexer.getPosition(),
			valueString: this.lexer.consumeRawUntilMatches(node.quote.symbol)
		});
		this.expect(node.quote.type);
		return node;
	}

	private parseAppendExpressionAttributeNode(position: Position, name: string): AppendExpressionAttributeNode {
		let node = new AppendExpressionAttributeNode(position);
		node.name = name;
		this.expect(TokenType.Dot);
		node.value = this.consumeWhile(() => !this.matchesOneOf(ATTRIBUTE_NAME_TERMINATING_TOKENS));
		this.expect(TokenType.RightSquareBrace);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		node.quote = this.expectOneOf(HTML_QUOTE_TOKENS);
		node.condition = this.parseJSValueExpression({
			position: this.lexer.getPosition(),
			valueString: this.lexer.consumeRawUntilMatches(node.quote.symbol)
		});
		this.expect(node.quote.type);
		return node;
	}

	private parseOutputExpressionAttributeNode(position: Position, name: string): OutputExpressionAttributeNode {
		let node = new OutputExpressionAttributeNode(position);
		node.name = name;
		this.expect(TokenType.RightSquareBrace);
		this.consumeOptional(TokenType.Whitespace);
		this.expect(TokenType.Equals);
		this.consumeOptional(TokenType.Whitespace);
		node.quote = this.expectOneOf(HTML_QUOTE_TOKENS);
		node.expression = this.parseJSValueExpression({
			position: this.lexer.getPosition(),
			valueString: this.lexer.consumeRawUntilMatches(node.quote.symbol)
		});
		this.expect(node.quote.type);
		return node;
	}

	private parseAttributeName(): string {
		let name = this.consumeWhile(() => !this.matchesOneOf(ATTRIBUTE_NAME_TERMINATING_TOKENS));

		if (name.length === 0) {
			throw new ParseError('Expected valid attribute name.', this.getTokenPostion());
		}

		return name;
	}

	private parseWhitespaceNode(): WhitespaceNode {
		let node = new WhitespaceNode(this.getTokenPostion());
		node.textContent = this.expect(TokenType.Whitespace).symbol;
		return node;
	}

	private parseTextNode(): TextNode {
		let node = new TextNode(this.getTokenPostion());
		node.textContent = '';

		while (!this.isEOF() && !this.matchesOneOf(INVALID_TEXT_TOKENS)) {
			if (this.matches(TokenType.ExpressionStartEscape)) {
				this.consume();
				node.textContent += this.lexer.expressionStartDelimiter;
			}
			else if (this.matches(TokenType.ExpressionEndEscape)) {
				this.consume();
				node.textContent += this.lexer.expressionEndDelimiter;
			}
			else {
				node.textContent += this.consume().symbol;
			}
		}

		return node;
	}

	private parseEmbeddedLanguageTextNode(tagName: string): TextNode {
		let node = new TextNode(this.getTokenPostion());
		node.textContent = this.consumeWhile(() => !this.matches(TokenType.ElementClosingStart) || this.peek().tagName !== tagName);
		return node;
	}

	private parseJSValueExpression(blockValue: BlockValue): JSValueExpression {
		let statement = this.parseJSCode(blockValue.position, blockValue.valueString);

		if (statement.type !== 'ExpressionStatement') {
			throw new ParseError('Encountered unsupported expression', blockValue.position);
		}

		return statement.expression as JSValueExpression;
	}

	private parseJSStatement(blockValue: BlockValue): JSStatement {
		let statement = this.parseJSCode(blockValue.position, blockValue.valueString);

		let allowedTypes = ['ExpressionStatement', 'VariableDeclaration'];
		if (!allowedTypes.includes(statement.type)) {
			throw new ParseError('Encountered unsupported expression.', blockValue.position);
		}

		if (statement.type === 'VariableDeclaration' && statement.kind !== 'let') {
			throw new ParseError(`Encountered unsupported variable declaration. Only 'let' is allowed.`, blockValue.position);
		}

		return statement as JSStatement;
	}

	private parseJSCode(position: Position, code: string): Types.Node {
		if (['{', '"', '\'', '`'].includes(code[0])) {
			code = `(${code})`;
		}

		let { program } = parse(code, {
			allowAwaitOutsideFunction: true
		});

		if (program.body.length === 0) {
			throw new ParseError('Expected a statement or expression.', position);
		}

		if (program.body.length > 1) {
			throw new ParseError('Cannot have more than one expression here.', position);
		}

		return program.body[0];
	}

	// ========================================================================

	private isEOF(): boolean {
		return this.lexer.getToken() === null;
	}

	private peek(): Token {
		return this.lexer.getToken();
	}

	private matches(tokenType: TokenType): boolean {
		let token = this.lexer.getToken();
		return token && token.type === tokenType;
	}

	private matchesOneOf(tokenTypes: TokenType[]): boolean {
		return tokenTypes.some(tokenType => this.matches(tokenType));
	}

	private matchesWithSymbol(tokenType: TokenType, symbol: string): boolean {
		let token = this.lexer.getToken();
		return token && token.type === tokenType && token.symbol === symbol;
	}

	private consume(): Token {
		return this.lexer.consumeToken();
	}

	private consumeOptional(tokenType: TokenType): Token {
		let token = this.lexer.getToken();

		if (!token || token.type !== tokenType) {
			return null;
		}

		return this.lexer.consumeToken();
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
			throw new ParseError('Unexpected end of file.', this.lexer.getPosition());
		}

		let token = this.lexer.consumeToken();

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

		throw new ParseError('Encountered unexpected token.', this.getTokenPostion());
	}

	private expectWithSymbol(tokenType: TokenType, symbol: string): Token {
		if (!this.matchesWithSymbol(tokenType, symbol)) {
			throw new ParseError('Encountered unexpected token.', this.getTokenPostion());
		}

		return this.consume();
	}

	private getTokenPostion(): Position {
		let token = this.lexer.getToken();
		return token ? token.position : null;
	}

}

interface BlockValue {
	position: Position;
	valueString: string;
}

const VOID_ELEMENTS: string[] = [
	'area',
	'base',
	'br',
	'col',
	'command',
	'embed',
	'hr',
	'img',
	'input',
	'keygen',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
];

const HTML_QUOTE_TOKENS: TokenType[] = [
	TokenType.DoubleQuote,
	TokenType.SingleQuote
];

const INVALID_NODE_START_TOKENS: TokenType[] = [
	TokenType.ElseIf,
	TokenType.Else,
	TokenType.Case,
	TokenType.DefaultCase,

	TokenType.BlockClosingStart,

	TokenType.ExpressionEnd,

	TokenType.ElementClosingStart
];

const INVALID_TEXT_TOKENS: TokenType[] = [
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
	TokenType.ExpressionCommentStart,
	TokenType.ExpressionEnd,

	TokenType.CommentStart,
	TokenType.CDataStart,
	TokenType.Doctype,
	TokenType.ElementStart,
	TokenType.ElementClosingStart
];

const ATTRIBUTE_NAME_TERMINATING_TOKENS: TokenType[] = [
	TokenType.Whitespace,
	TokenType.Equals,
	TokenType.Dot,
	TokenType.RightSquareBrace,
	TokenType.ForwardSlash,
	TokenType.RightAngleBrace,
	...HTML_QUOTE_TOKENS
];

const NORMAL_ATTRIBUTE_STRING_TERMINATING_TOKENS: TokenType[] = [
	TokenType.ExpressionStart,
	TokenType.ExpressionEnd,
	TokenType.ExpressionCommentStart,
	TokenType.ExpressionStartEscape,
	TokenType.ExpressionEndEscape
];

const VARIABLE_NAME_START_TOKENS: TokenType[] = [
	TokenType.Letters,
	TokenType.Underscore,
	TokenType.Dollar
];

const VARIABLE_NAME_VALID_TOKENS: TokenType[] = [
	TokenType.Letters,
	TokenType.Numbers,
	TokenType.Underscore,
	TokenType.Dollar
];