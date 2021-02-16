import generate  from '@babel/generator';
import * as Types from '@babel/types';
import Module from 'module';
import { JSStatement, JSValueExpression } from './js-types';
import { AppendAttributeNode } from './nodes/append-attribute-node';
import { BooleanAttributeNode } from './nodes/boolean-attribute-node';
import { CaseNode } from './nodes/case-node';
import { CDataNode } from './nodes/cdata-node';
import { CommentNode } from './nodes/comment-node';
import { ContentForNode } from './nodes/content-for-node';
import { DefaultCaseNode } from './nodes/default-case-node';
import { DoctypeNode } from './nodes/doctype-node';
import { ElementNode } from './nodes/element-node';
import { ElseIfNode } from './nodes/else-if-node';
import { ElseNode } from './nodes/else-node';
import { CommentExpressionNode } from './nodes/comment-expression-node';
import { ExpressionNode } from './nodes/expression-node';
import { ForeachNode } from './nodes/foreach-node';
import { IfNode } from './nodes/if-node';
import { Node } from './nodes/node';
import { NormalAttributeNode } from './nodes/normal-attribute-node';
import { BoundAttributeNode } from './nodes/bound-attribute-node';
import { PrintNode } from './nodes/print-node';
import { RenderDefaultSlotNode } from './nodes/render-default-slot-node';
import { RenderNode } from './nodes/render-node';
import { RenderSlotNode } from './nodes/render-slot-node';
import { ScopeNode } from './nodes/scope-node';
import { SwitchNode } from './nodes/switch-node';
import { TemplateNode } from './nodes/template-node';
import { TextNode } from './nodes/text-node';
import { WhileNode } from './nodes/while-node';
import { WhitespaceNode } from './nodes/whitespace-node';
import { Position } from './position';
import { View } from './view';
import { PrintExpressionNode } from './nodes/print-expression-node';

interface CustomModule extends Module {
	_compile(code: string, filename: string): void;
}

const SCOPE_IDENTIFIER = '__scope__';
const RESOLVE_IDENTIFIER = '__resolve__';
const REJECT_IDENTIFIER = '__reject__';
const ERROR_IDENTIFIER = '__error__';
const COLLECTION_IDENTIFIER = '__collection__';

/**
 * Nodes with async support:
 * - OutputExpressionNode
 *
 * Nodes with potential async support:
 * - IfNode
 * - ElseIfNode
 * - SwitchNode
 * - ForeachNode
 * - WhileNode
 * - AttributeNodes
 */

// TODO: Fix source mapping
/**
 * Compiles an Abstract Syntax Tree into a View.
 */
export class Compiler {

	public compile(ast: TemplateNode): View {
		try {
			let transformedAst = this.compileTemplateNode(ast);

			let { code } = generate(
				transformedAst,
				{
					minified: false,
					compact: false
				}
			);

			let templateModule = new Module('') as CustomModule;
			templateModule._compile(code, ast.filename);
			let renderFunction = templateModule.exports;

			return new View(ast, code, renderFunction);
		}
		catch (error) {
			console.error(error);
			throw new Error('Failed to compile template.');
		}
	}

	// ========================================================================

	private compileTemplateNode(node: TemplateNode): Types.Statement {
		return Types.expressionStatement(
			Types.assignmentExpression(
				'=',
				Types.memberExpression(
					Types.identifier('module'),
					Types.identifier('exports')
				),
				Types.functionExpression(
					null,
					[
						Types.identifier(SCOPE_IDENTIFIER)
					],
					Types.blockStatement(
						this.mapChildNodes(node.childNodes)
					),
					false,
					true
				)
			)
		);
	}

	private compileNode(node: Node): Types.Statement | Types.VariableDeclaration[] {
		switch (node.constructor) {
			case ScopeNode:
				return this.compileScopeNode(node as ScopeNode);
			case PrintNode:
				return this.compilePrintNode(node as PrintNode);
			case IfNode:
				return this.compileIfNode(node as IfNode);
			case SwitchNode:
				return this.compileSwitchNode(node as SwitchNode);
			case ForeachNode:
				return this.compileForeachNode(node as ForeachNode);
			case WhileNode:
				return this.compileWhileNode(node as WhileNode);
			case RenderNode:
				return this.compileRenderNode(node as RenderNode);
			case RenderDefaultSlotNode:
				return this.compileRenderDefaultSlotNode(node as RenderDefaultSlotNode);
			case RenderSlotNode:
				return this.compileRenderSlotNode(node as RenderSlotNode);
			case ContentForNode:
				return this.compileContentForNode(node as ContentForNode);
			case ExpressionNode:
				return this.compileExpressionNode(node as ExpressionNode);
			case PrintExpressionNode:
				return this.compilePrintExpressionNode(node as PrintExpressionNode);
			case CommentExpressionNode:
				return null;
			case CommentNode:
				return this.compileCommentNode(node as CommentNode);
			case CDataNode:
				return this.compileCDataNode(node as CDataNode);
			case DoctypeNode:
				return this.compileDoctypeNode(node as DoctypeNode);
			case ElementNode:
				return this.compileElementNode(node as ElementNode);
			case WhitespaceNode:
				return this.compileWhitespaceNode(node as WhitespaceNode);
			case TextNode:
				return this.compileTextNode(node as TextNode);
			default:
				throw new Error('Failed to compile unknown node.');
		}
	}

	private compileScopeNode(node: ScopeNode): Types.Statement {
		return Types.blockStatement(
			this.mapChildNodes(node.childNodes)
		);
	}

	private compilePrintNode(node: PrintNode): Types.Statement {
		let expression = this.createWrapExpression(
			node.expression,
			node.position
		);

		let objectProperties = [
			Types.objectProperty(
				Types.identifier('expression'),
				expression
			)
		];

		if (node.hasBlock) {
			expression.params.push(
				Types.identifier('$block')
			);

			objectProperties.push(
				Types.objectProperty(
					Types.identifier('body'),
					Types.arrowFunctionExpression(
						node.blockArgs.map(blockArg => Types.identifier(blockArg)),
						Types.blockStatement(
							this.mapChildNodes(node.childNodes)
						),
						true
					)
				)
			);
		}

		return Types.expressionStatement(
			Types.awaitExpression(
				this.createScopeCall('renderPrint', node.position, [
					Types.objectExpression(objectProperties)
				])
			)
		);
	}

	private compileIfNode(node: IfNode | ElseIfNode): Types.Statement {
		let alternateStatement = null;
		if (node.alternateNode instanceof ElseIfNode) {
			alternateStatement = this.compileIfNode(node.alternateNode);
		}
		else if (node.alternateNode instanceof ElseNode) {
			alternateStatement = this.compileElseNode(node.alternateNode);
		}

		return Types.ifStatement(
			this.cloneExpressionAtPosition(
				node.condition,
				node.position
			),
			Types.blockStatement(
				this.mapChildNodes(node.childNodes)
			),
			alternateStatement
		);
	}

	private compileElseNode(node: ElseNode): Types.Statement {
		return Types.blockStatement(
			this.mapChildNodes(node.childNodes)
		);
	}

	private compileSwitchNode(node: SwitchNode): Types.Statement {
		let cases = node.cases.map(caseNode => this.compileCaseNode(caseNode));
		if (node.defaultCase) {
			cases.push(this.compileDefaultCaseNode(node.defaultCase));
		}

		return Types.switchStatement(
			this.cloneExpressionAtPosition(
				node.expression,
				node.position
			),
			cases
		);
	}

	private compileCaseNode(node: CaseNode): Types.SwitchCase {
		return Types.switchCase(
			this.cloneExpressionAtPosition(
				node.expression,
				node.position
			),
			[
				Types.blockStatement(
					this.mapChildNodes(node.childNodes)
				),
				Types.breakStatement()
			]
		);
	}

	private compileDefaultCaseNode(node: DefaultCaseNode): Types.SwitchCase {
		return Types.switchCase(
			null,
			[
				Types.blockStatement(
					this.mapChildNodes(node.childNodes)
				),
				Types.breakStatement()
			]
		);
	}

	private compileForeachNode(node: ForeachNode): Types.Statement {
		let collectionDeclaration = Types.variableDeclaration(
			'const',
			[
				Types.variableDeclarator(
					Types.identifier(COLLECTION_IDENTIFIER),
					this.createScopeCall('collection', node.position, [
						this.createWrapExpression(
							node.collection,
							node.position
						)
					])
				)
			]
		);

		let loopConditional = Types.ifStatement(
			Types.callExpression(
				Types.memberExpression(
					Types.identifier(COLLECTION_IDENTIFIER),
					Types.identifier('hasAny')
				),
				[]
			),
			Types.blockStatement([
				Types.forOfStatement(
					Types.variableDeclaration(
						'let',
						[
							Types.variableDeclarator(
								Types.arrayPattern(
									node.identifiers.map(identifier => Types.identifier(identifier))
								)
							)
						]
					),
					Types.identifier(COLLECTION_IDENTIFIER),
					Types.blockStatement(
						this.mapChildNodes(node.childNodes)
					)
				)
			]),

		);

		if (node.alternateNode) {
			loopConditional.alternate = this.compileElseNode(node.alternateNode);
		}

		return Types.blockStatement([
			collectionDeclaration,
			loopConditional
		]);
	}

	private compileWhileNode(node: WhileNode): Types.Statement {
		return Types.whileStatement(
			this.cloneExpressionAtPosition(
				node.condition,
				node.position
			),
			Types.blockStatement(
				this.mapChildNodes(node.childNodes)
			)
		);
	}

	private compileRenderNode(node: RenderNode): Types.Statement {
		return Types.expressionStatement(
			Types.awaitExpression(
				this.createScopeCall('renderPartial', node.position, [
					Types.objectExpression([
						Types.objectProperty(
							Types.identifier('templatePath'),
							Types.stringLiteral(node.templatePath)
						),
						Types.objectProperty(
							Types.identifier('currentContext'),
							Types.thisExpression()
						),
						Types.objectProperty(
							Types.identifier('context'),
							Types.arrowFunctionExpression(
								[],
								this.cloneExpressionAtPosition(
									node.context,
									node.position
								)
							)
						)
					])
				])
			)
		);
	}

	private compileRenderDefaultSlotNode(node: RenderDefaultSlotNode): Types.Statement {
		return Types.expressionStatement(
			this.createScopeCall('renderDefaultSlot', node.position)
		);
	}

	private compileRenderSlotNode(node: RenderSlotNode): Types.Statement {
		return Types.expressionStatement(
			this.createScopeCall('renderSlot', node.position, [
				Types.stringLiteral(node.slotName)
			])
		);
	}

	private compileContentForNode(node: ContentForNode): Types.Statement {
		return Types.expressionStatement(
			Types.awaitExpression(
				this.createScopeCall('contentFor', node.position, [
					Types.stringLiteral(node.slotName),
					Types.arrowFunctionExpression(
						[],
						Types.blockStatement(
							this.mapChildNodes(node.childNodes)
						),
						true
					)
				])
			)
		);
	}

	// TODO: Fix sourcemaps
	private compileExpressionNode(node: ExpressionNode): JSStatement {
		return this.cloneStatementAtPosition(
			node.statement,
			node.position
		);
	}

	// TODO: Fix sourcemaps
	private compilePrintExpressionNode(node: PrintExpressionNode): Types.ExpressionStatement {
		return Types.expressionStatement(
			this.createAwaitExpressionIf(
				this.isAwaitExpression(node.statement.expression),
				this.createScopeCall('renderExpression', node.position, [
					this.createWrapExpression(
						node.statement.expression,
						node.position
					)
				])
			)
		);
	}

	private compileCommentNode(node: CommentNode): Types.ExpressionStatement {
		return Types.expressionStatement(
			this.createScopeCall('renderComment', node.position, [
				Types.stringLiteral(node.textContent)
			])
		);
	}

	private compileCDataNode(node: CDataNode): Types.Statement {
		return Types.expressionStatement(
			this.createScopeCall('renderCData', node.position, [
				Types.stringLiteral(node.textContent)
			])
		);
	}

	private compileDoctypeNode(node: DoctypeNode): Types.Statement {
		return Types.expressionStatement(
			this.createScopeCall('renderDoctype', node.position)
		);
	}

	// TODO: Fix source mapping
	private compileElementNode(node: ElementNode): Types.Statement {
		let attributeExpressions = node.attributes.map(attributeNode => {
			switch (attributeNode.constructor) {
				case NormalAttributeNode:
					return this.compileNormalAttributeNode(attributeNode as NormalAttributeNode);
				case BoundAttributeNode:
					return this.compileOutputExpressionAttributeNode(attributeNode as BoundAttributeNode);
				case AppendAttributeNode:
					return this.compileAppendExpressionAttributeNode(attributeNode as AppendAttributeNode);
				case BooleanAttributeNode:
					return this.compileBooleanExpressionAttributeNode(attributeNode as BooleanAttributeNode);
				default:
					throw new Error('Encountered unsupported attribute node.');
			}
		});

		return Types.expressionStatement(
			Types.awaitExpression(
				this.createScopeCall('renderElement', node.position, [
					Types.objectExpression(
						[
							Types.objectProperty(
								Types.identifier('tagName'),
								Types.stringLiteral(node.tagName)
							),
							Types.objectProperty(
								Types.identifier('isVoid'),
								Types.booleanLiteral(node.isVoid)
							),
							Types.objectProperty(
								Types.identifier('isSelfClosing'),
								Types.booleanLiteral(node.isSelfClosing)
							),
							Types.objectProperty(
								Types.identifier('attributes'),
								Types.arrayExpression(
									attributeExpressions
								)
							),
							Types.objectProperty(
								Types.identifier('body'),
								Types.arrowFunctionExpression(
									[],
									Types.blockStatement(
										this.mapChildNodes(node.childNodes)
									),
									true
								)
							)
						]
					)
				])
			)
		);
	}

	// TODO: Fix source mapping
	private compileNormalAttributeNode(node: NormalAttributeNode): Types.Expression {
		let quoteExpression;
		if (node.quote) {
			quoteExpression = Types.stringLiteral(node.quote.symbol)
		}
		else {
			quoteExpression = Types.nullLiteral();
		}

		let valuesExpression = Types.arrayExpression(
			node.values.map(value => {
				if (typeof value === 'string') {
					return Types.stringLiteral(
						value
					);
				}
				else {
					return this.createWrapExpression(
						value,
						node.position
					);
				}
			})
		);

		return this.createScopeCall('createNormalAttribute', node.position, [
			Types.objectExpression([
				Types.objectProperty(
					Types.identifier('name'),
					Types.stringLiteral(node.name)
				),
				Types.objectProperty(
					Types.identifier('quote'),
					quoteExpression
				),
				Types.objectProperty(
					Types.identifier('values'),
					valuesExpression
				)
			])
		]);
	}

	// TODO: Fix source mapping
	private compileOutputExpressionAttributeNode(node: BoundAttributeNode): Types.Expression {
		return this.createScopeCall('createBoundAttribute', node.position, [
			Types.objectExpression([
				Types.objectProperty(
					Types.identifier('name'),
					Types.stringLiteral(node.name)
				),
				Types.objectProperty(
					Types.identifier('quote'),
					Types.stringLiteral(node.quote.symbol)
				),
				Types.objectProperty(
					Types.identifier('value'),
					this.createWrapExpression(
						node.expression,
						node.position
					)
				)
			])
		]);
	}

	// TODO: Fix source mapping
	private compileAppendExpressionAttributeNode(node: AppendAttributeNode): Types.Expression {
		return this.createScopeCall('createAppendAttribute', node.position, [
			Types.objectExpression([
				Types.objectProperty(
					Types.identifier('name'),
					Types.stringLiteral(node.name)
				),
				Types.objectProperty(
					Types.identifier('quote'),
					Types.stringLiteral(node.quote.symbol)
				),
				Types.objectProperty(
					Types.identifier('value'),
					Types.stringLiteral(node.value)
				),
				Types.objectProperty(
					Types.identifier('condition'),
					this.createWrapExpression(
						node.condition,
						node.position
					)
				)
			])
		]);
	}

	// TODO: Fix source mapping
	private compileBooleanExpressionAttributeNode(node: BooleanAttributeNode): Types.Expression {
		return this.createScopeCall('createBooleanAttribute', node.position, [
			Types.objectExpression([
				Types.objectProperty(
					Types.identifier('name'),
					Types.stringLiteral(node.name)
				),
				Types.objectProperty(
					Types.identifier('quote'),
					Types.stringLiteral(node.quote.symbol)
				),
				Types.objectProperty(
					Types.identifier('condition'),
					this.createWrapExpression(
						node.condition,
						node.position
					)
				)
			])
		]);
	}

	private compileWhitespaceNode(node: WhitespaceNode): Types.Statement {
		return Types.expressionStatement(
			this.createScopeCall('renderText', node.position, [
				Types.stringLiteral(node.textContent)
			])
		);
	}

	private compileTextNode(node: TextNode): Types.Statement {
		return Types.expressionStatement(
			this.createScopeCall('renderText', node.position, [
				Types.stringLiteral(node.textContent)
			])
		);
	}

	// ========================================================================

	private mapChildNodes(childNodes: Node[]): Types.Statement[] {
		return childNodes
			.flatMap(childNode => this.compileNode(childNode))
			.filter(expression => expression);
	}

	createAwaitExpressionIf(condition, expression) {
		if (condition) {
			return Types.awaitExpression(expression);
		}
		else {
			return expression;
		}
	}

	// TODO: Check for Async expressions inside arguments
	// TODO: Assign position to node
	private createScopeCall(methodName: string, position: Position, argumentExpressions: Types.Expression[] = []): Types.CallExpression {
		return Types.callExpression(
			Types.memberExpression(
				Types.identifier(SCOPE_IDENTIFIER),
				Types.identifier(methodName)
			),
			argumentExpressions
		);
	}

	private createWrapExpression(expression: JSValueExpression, position: Position): Types.ArrowFunctionExpression {
		return Types.arrowFunctionExpression(
			[],
			this.cloneExpressionAtPosition(
				expression,
				position
			),
			this.isAwaitExpression(expression)
		);
	}

	private createPositionExpression(position: Position): Types.Expression {
		return Types.arrayExpression([
			Types.numericLiteral(position.line),
			Types.numericLiteral(position.column)
		]);
	}

	private isAwaitExpression(expressionNode: Types.Expression | Types.VariableDeclaration): boolean {
		if (Types.isVariableDeclaration(expressionNode)) {
			return expressionNode.declarations.some(declarationNode => {
				return Types.isAwaitExpression(declarationNode.init);
			});
		}
		else if (Types.isBinaryExpression(expressionNode)) {
			return (
				Types.isAwaitExpression(
					expressionNode.left
				)
				||
				Types.isAwaitExpression(
					expressionNode.right
				)
			);
		}
		else if (Types.isUnaryExpression(expressionNode)) {
			return Types.isAwaitExpression(
				expressionNode.argument
			);
		}
		else {
			return Types.isAwaitExpression(expressionNode);
		}
	}

	// TODO: Add position data to cloned node using 'loc' property
	private cloneExpressionAtPosition(node: JSValueExpression, position: Position): JSValueExpression {
		return Types.cloneDeepWithoutLoc(node);
	}

	// TODO: Add position data to cloned node using 'loc' property
	private cloneStatementAtPosition(node: JSStatement, position: Position): JSStatement {
		return Types.cloneDeepWithoutLoc(node);
	}

}