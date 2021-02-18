import generate from '@babel/generator';
import * as Types from '@babel/types';
import Module from 'module';
import { AppendAttributeNode } from './nodes/append-attribute-node';
import { CaseNode } from './nodes/case-node';
import { CDataNode } from './nodes/cdata-node';
import { CommentExpressionNode } from './nodes/comment-expression-node';
import { CommentNode } from './nodes/comment-node';
import { ConditionalAttributeNode } from './nodes/conditional-attribute-node';
import { ContentForNode } from './nodes/content-for-node';
import { DefaultCaseNode } from './nodes/default-case-node';
import { DoctypeNode } from './nodes/doctype-node';
import { ElementNode } from './nodes/element-node';
import { ElseIfNode } from './nodes/else-if-node';
import { ElseNode } from './nodes/else-node';
import { ExpressionAttributeNode } from './nodes/expression-attribute-node';
import { ExpressionNode } from './nodes/expression-node';
import { ForeachNode } from './nodes/foreach-node';
import { IfNode } from './nodes/if-node';
import { LayoutNode } from './nodes/layout-node';
import { Node } from './nodes/node';
import { NormalAttributeNode } from './nodes/normal-attribute-node';
import { PrintExpressionNode } from './nodes/print-expression-node';
import { PrintNode } from './nodes/print-node';
import { RenderContentNode } from './nodes/render-content-node';
import { RenderNode } from './nodes/render-node';
import { ScopeNode } from './nodes/scope-node';
import { SwitchNode } from './nodes/switch-node';
import { TextNode } from './nodes/text-node';
import { ViewNode } from './nodes/view-node';
import { WhileNode } from './nodes/while-node';
import { WhitespaceNode } from './nodes/whitespace-node';
import { Position } from './position';
import { View } from './view';

interface ViewModule extends Module {
	_compile(code: string, filename: string): void;
}

const MODULE_IDENTIFIER: string = '__module__';
const REQUIRE_IDENTIFIER: string = '__require__';
const RENDER_FUNCTION_IDENTIFIER: string = '__RenderView__';
const RUNTIME_IDENTIFIER: string = '__runtime__';
const PARTIAL_IDENTIFIER: string = '__isPartial__';
const BLOCK_IDENTIFIER: string = '$block';

// TODO: Figure out how to handle sourcemaps for views created from strings (fake path maybe?)
// TODO: Add positions to scope calls for better error messages.
/**
 * Compiles an Abstract Syntax Tree into a Render Function.
 */
export class Compiler {

	public compile(viewNode: ViewNode, viewSourcemaps: Record<string, unknown>): View {
		// Build view module AST
		let program = Types.program([
			...this.createViewModuleHeaders(),
			this.compileViewNode(viewNode)
		]);

		// Generate view module code and sourcemap
		let {
			code: viewModuleCode,
			map: viewModuleSourcemap
		} = generate(
			program,
			{
				compact: false,
				concise: false,
				sourceMaps: true,
				sourceFileName: viewNode.filePath
			},
			viewNode.source
		);

		// Append view module sourcemap to code
		let base64Sourcemap = Buffer.from(JSON.stringify(viewModuleSourcemap)).toString('base64');
		viewModuleCode += `\n\n//# sourceMappingURL=data:application/json;charset=utf8;base64,${base64Sourcemap}`;

		// Compile view module
		let viewModule = new Module(viewNode.filePath) as ViewModule;
		viewModule.paths = process.mainModule.paths;
		viewModule._compile(viewModuleCode, viewNode.filePath);

		// Inject view module sourcemap into exports
		viewModule.exports.sourcemaps = viewSourcemaps;
		viewSourcemaps[viewNode.filePath] = {
			url: viewNode.filePath,
			map: viewModuleSourcemap
		};

		// Create and configure view
		let view = new View({
			source: viewNode.source,
			filePath: viewNode.filePath,
			ast: viewNode,
			code: viewModuleCode,
			renderFunction: viewModule.exports.renderFunction
		});

		return view;
	}

	private createViewModuleHeaders(): Types.Statement[] {
		return [
			Types.expressionStatement(
				Types.assignmentExpression(
					'=',
					Types.identifier(MODULE_IDENTIFIER),
					Types.identifier('module')
				)
			),
			Types.expressionStatement(
				Types.assignmentExpression(
					'=',
					Types.identifier(REQUIRE_IDENTIFIER),
					Types.identifier('require')
				)
			),
			Types.expressionStatement(
				Types.assignmentExpression(
					'=',
					Types.identifier('module'),
					Types.assignmentExpression(
						'=',
						Types.identifier('require'),
						Types.identifier('undefined')
					)
				)
			),
			Types.expressionStatement(
				Types.callExpression(
					Types.memberExpression(
						Types.callExpression(
							Types.identifier(REQUIRE_IDENTIFIER),
							[
								Types.stringLiteral('source-map-support')
							]
						),
						Types.identifier('install')
					),
					[
						Types.objectExpression([
							Types.objectProperty(
								Types.identifier('retrieveSourceMap'),
								Types.arrowFunctionExpression(
									[
										Types.identifier('source')
									],
									Types.conditionalExpression(
										Types.binaryExpression(
											'in',
											Types.identifier('source'),
											Types.memberExpression(
												Types.memberExpression(
													Types.identifier(MODULE_IDENTIFIER),
													Types.identifier('exports')
												),
												Types.identifier('sourcemaps')
											)
										),
										Types.memberExpression(
											Types.memberExpression(
												Types.memberExpression(
													Types.identifier(MODULE_IDENTIFIER),
													Types.identifier('exports')
												),
												Types.identifier('sourcemaps')
											),
											Types.identifier('source'),
											true
										),
										Types.nullLiteral()
									)
								)
							)
						])
					]
				)
			)
		];
	}

	private compileViewNode(node: ViewNode): Types.Statement {
		let bodyStatements = [];

		if (node.layoutNode) {
			bodyStatements.push(
				this.compileLayoutNode(node.layoutNode)
			);
		}

		bodyStatements.push(
			...this.compileNodes(node.childNodes)
		);

		return Types.expressionStatement(
			Types.assignmentExpression(
				'=',
				Types.memberExpression(
					Types.memberExpression(
						Types.identifier(MODULE_IDENTIFIER),
						Types.identifier('exports')
					),
					Types.identifier('renderFunction')
				),
				Types.functionExpression(
					Types.identifier(RENDER_FUNCTION_IDENTIFIER),
					[
						Types.identifier(RUNTIME_IDENTIFIER),
						Types.identifier(PARTIAL_IDENTIFIER)
					],
					Types.blockStatement(
						bodyStatements
					),
					false,
					true
				)
			)
		);
	}

	private compileLayoutNode(node: LayoutNode): Types.Statement {
		return Types.ifStatement(
			Types.unaryExpression(
				'!',
				Types.identifier(PARTIAL_IDENTIFIER)
			),
			Types.blockStatement([
				Types.expressionStatement(
					this.createRuntimeCall('setLayout', node.position, [
						Types.stringLiteral(node.value)
					])
				)
			])
		);
	}

	private compileNodes(nodes: Node[]): Types.Statement[] {
		return nodes
			.flatMap(node => this.compileNode(node))
			.filter(statement => statement);
	}

	private compileNode(node: Node): Types.Statement | Types.Statement[] {
		switch (node.constructor) {
			// Standard HTML
			case WhitespaceNode:
				return this.compileWhitespaceNode(node as WhitespaceNode);
			case TextNode:
				return this.compileTextNode(node as TextNode);
			case CommentNode:
				return this.compileCommentNode(node as CommentNode);
			case CDataNode:
				return this.compileCDataNode(node as CDataNode);
			case DoctypeNode:
				return this.compileDoctypeNode(node as DoctypeNode);
			case ElementNode:
				return this.compileElementNode(node as ElementNode);

			// Custom Syntax
			case ScopeNode:
				return this.compileScopeNode(node as ScopeNode);
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
			case RenderContentNode:
				return this.compileRenderContentNode(node as RenderContentNode);
			case ContentForNode:
				return this.compileContentForNode(node as ContentForNode);
			case PrintNode:
				return this.compilePrintNode(node as PrintNode);
			case ExpressionNode:
				return this.compileExpressionNode(node as ExpressionNode);
			case PrintExpressionNode:
				return this.compilePrintExpressionNode(node as PrintExpressionNode);
			case CommentExpressionNode:
				return this.compileCommentExpressionNode(node as CommentExpressionNode);

			default:
				throw new Error('Failed to compile unknown node.');
		}
	}

	private compileWhitespaceNode(node: WhitespaceNode): Types.Statement {
		return Types.expressionStatement(
			this.createRuntimeCall('renderText', node.position, [
				Types.stringLiteral(node.textContent)
			])
		);
	}

	private compileTextNode(node: TextNode): Types.Statement {
		return Types.expressionStatement(
			this.createRuntimeCall('renderText', node.position, [
				Types.stringLiteral(node.textContent)
			])
		);
	}

	private compileCommentNode(node: CommentNode): Types.Statement {
		return Types.expressionStatement(
			this.createRuntimeCall('renderComment', node.position, [
				Types.stringLiteral(node.textContent)
			])
		);
	}

	private compileCDataNode(node: CDataNode): Types.Statement {
		return Types.expressionStatement(
			this.createRuntimeCall('renderCData', node.position, [
				Types.stringLiteral(node.textContent)
			])
		);
	}

	private compileDoctypeNode(node: DoctypeNode): Types.Statement {
		return Types.expressionStatement(
			this.createRuntimeCall('renderDoctype', node.position)
		);
	}

	private compileElementNode(node: ElementNode): Types.Statement[] {
		let statements = [];

		let attributeExpressions = node.attributes.map(attributeNode => {
			switch (attributeNode.constructor) {
				case NormalAttributeNode:
					return this.compileNormalAttributeNode(attributeNode as NormalAttributeNode);
				case ExpressionAttributeNode:
					return this.compileExpressionAttributeNode(attributeNode as ExpressionAttributeNode);
				case ConditionalAttributeNode:
					return this.compileConditionalAttributeNode(attributeNode as ConditionalAttributeNode);
				case AppendAttributeNode:
					return this.compileAppendAttributeNode(attributeNode as AppendAttributeNode);
				default:
					throw new Error('Encountered unsupported attribute node.');
			}
		});

		statements.push(
			Types.expressionStatement(
				this.createRuntimeCall('renderElementOpenTag', node.position, [
					Types.stringLiteral(node.tagName),
					Types.arrayExpression(
						attributeExpressions
					)
				])
			)
		);

		if (node.isVoid) {
			return statements;
		}

		if (!node.isSelfClosing) {
			statements.push(
				...this.compileNodes(node.childNodes)
			);
		}

		statements.push(
			Types.expressionStatement(
				this.createRuntimeCall('renderElementCloseTag', node.position, [
					Types.stringLiteral(node.tagName)
				])
			)
		);

		return statements;
	}

	private compileNormalAttributeNode(node: NormalAttributeNode): Types.CallExpression {
		let quoteExpression;
		if (node.quote) {
			quoteExpression = Types.stringLiteral(node.quote.symbol);
		}
		else {
			quoteExpression = Types.nullLiteral();
		}

		let valuesExpression;
		if (node.values) {
			valuesExpression = Types.arrayExpression(
				node.values.map(value => {
					if (typeof value === 'string') {
						return Types.stringLiteral(value);
					}
					else {
						return value;
					}
				})
			);
		}
		else {
			valuesExpression = Types.nullLiteral();
		}

		return this.createRuntimeCall('createNormalAttribute', node.position, [
			Types.stringLiteral(node.name),
			quoteExpression,
			valuesExpression
		]);
	}

	private compileExpressionAttributeNode(node: ExpressionAttributeNode): Types.CallExpression {
		return this.createRuntimeCall('createExpressionAttribute', node.position, [
			Types.stringLiteral(node.name),
			Types.stringLiteral(node.quote.symbol),
			node.expression
		]);
	}

	private compileConditionalAttributeNode(node: ConditionalAttributeNode): Types.CallExpression {
		return this.createRuntimeCall('createConditionalAttribute', node.position, [
			Types.stringLiteral(node.name),
			node.condition
		]);
	}

	private compileAppendAttributeNode(node: AppendAttributeNode): Types.CallExpression {
		return this.createRuntimeCall('createAppendAttribute', node.position, [
			Types.stringLiteral(node.name),
			Types.stringLiteral(node.quote.symbol),
			Types.stringLiteral(node.value),
			node.condition
		]);
	}

	private compileScopeNode(node: ScopeNode): Types.Statement {
		return Types.blockStatement(
			this.compileNodes(node.childNodes)
		);
	}

	private compileIfNode(node: IfNode | ElseIfNode): Types.Statement {
		let alternateStatement = null;
		if (node.alternateNode instanceof ElseIfNode) {
			alternateStatement = this.compileElseIfNode(node.alternateNode);
		}
		else if (node.alternateNode instanceof ElseNode) {
			alternateStatement = this.compileElseNode(node.alternateNode);
		}

		return this.setNodePosition(
			node.position,
			Types.ifStatement(
				node.condition,
				Types.blockStatement(
					this.compileNodes(node.childNodes)
				),
				alternateStatement
			)
		);
	}

	private compileElseIfNode(node: ElseIfNode): Types.Statement {
		return this.compileIfNode(node);
	}

	private compileElseNode(node: ElseNode): Types.Statement {
		return Types.blockStatement(
			this.compileNodes(node.childNodes)
		);
	}

	private compileSwitchNode(node: SwitchNode): Types.Statement {
		let cases = node.cases.map(caseNode => this.compileCaseNode(caseNode));
		if (node.defaultCase) {
			cases.push(this.compileDefaultCaseNode(node.defaultCase));
		}

		return this.setNodePosition(
			node.position,
			Types.switchStatement(
				node.expression,
				cases
			)
		);
	}

	private compileCaseNode(node: CaseNode): Types.SwitchCase {
		return this.setNodePosition(
			node.position,
			Types.switchCase(
				node.expression,
				[
					Types.blockStatement(
						this.compileNodes(node.childNodes)
					),
					Types.breakStatement()
				]
			)
		);
	}

	private compileDefaultCaseNode(node: DefaultCaseNode): Types.SwitchCase {
		return this.setNodePosition(
			node.position,
			Types.switchCase(
				null,
				[
					Types.blockStatement(
						this.compileNodes(node.childNodes)
					),
					Types.breakStatement()
				]
			)
		);
	}

	private compileForeachNode(node: ForeachNode): Types.Statement {
		return this.setNodePosition(
			node.position,
			Types.forOfStatement(
				Types.variableDeclaration(
					'let',
					[
						Types.variableDeclarator(
							Types.arrayPattern(
								node.identifiers.map(identifier => {
									return this.setNodePosition(
										identifier.position,
										Types.identifier(identifier.value)
									);
								})
							)
						)
					]
				),
				this.createRuntimeCall('createCollection', node.position, [
					node.collection,
					this.createPositionExpression(node.position)
				]),
				Types.blockStatement(
					this.compileNodes(node.childNodes)
				)
			)
		);
	}

	private compileWhileNode(node: WhileNode): Types.Statement {
		return this.setNodePosition(
			node.position,
			Types.whileStatement(
				node.condition,
				Types.blockStatement(
					this.compileNodes(node.childNodes)
				)
			)
		);
	}

	private compileRenderNode(node: RenderNode): Types.Statement {
		return Types.expressionStatement(
			Types.awaitExpression(
				this.createRuntimeCall('renderPartialView', node.position, [
					Types.stringLiteral(node.viewPath),
					Types.thisExpression(),
					node.context
				])
			)
		);
	}

	private compileRenderContentNode(node: RenderContentNode): Types.Statement {
		return Types.expressionStatement(
			this.createRuntimeCall('renderContent', node.position, [
				node.slotName ? Types.stringLiteral(node.slotName) : Types.nullLiteral()
			])
		);
	}

	private compileContentForNode(node: ContentForNode): Types.Statement {
		return Types.blockStatement([
			Types.expressionStatement(
				this.createRuntimeCall('saveRenderTarget')
			),

			...this.compileNodes(node.childNodes),

			Types.expressionStatement(
				this.createRuntimeCall('mergeRenderTarget', null, [
					Types.stringLiteral(node.slotName)
				])
			)
		]);
	}

	private compilePrintNode(node: PrintNode): Types.Statement {
		let statements = [];

		if (node.hasBlock) {
			statements.push(
				Types.variableDeclaration(
					'const',
					[
						Types.variableDeclarator(
							Types.identifier(BLOCK_IDENTIFIER),
							Types.arrowFunctionExpression(
								node.blockArgs.map(blockArg => Types.identifier(blockArg.value)),
								Types.blockStatement([
									Types.expressionStatement(
										this.createRuntimeCall('saveRenderTarget')
									),

									...this.compileNodes(node.childNodes),

									Types.returnStatement(
										Types.callExpression(
											Types.memberExpression(
												Types.callExpression(
													Types.memberExpression(
														Types.identifier(RUNTIME_IDENTIFIER),
														Types.identifier('restoreRenderTarget')
													),
													[]
												),
												Types.identifier('getDefault')
											),
											[]
										)
									)
								]),
								true
							)
						)
					]
				)
			);
		}

		statements.push(
			Types.expressionStatement(
				Types.awaitExpression(
					this.createRuntimeCall('renderValue', node.position, [
						node.expression
					])
				)
			)
		);

		return Types.blockStatement(statements);
	}

	private compileExpressionNode(node: ExpressionNode): Types.Statement {
		return node.statement;
	}

	private compilePrintExpressionNode(node: PrintExpressionNode): Types.Statement {
		return Types.expressionStatement(
			Types.awaitExpression(
				this.createRuntimeCall('renderValue', node.position, [
					node.statement.expression
				])
			)
		);
	}

	private compileCommentExpressionNode(node: CommentExpressionNode): null {
		return null;
	}

	private createRuntimeCall(methodName: string, position: Position = null, argumentExpressions: Types.Expression[] = []): Types.CallExpression {
		return this.setNodePosition(
			position,
			Types.callExpression(
				Types.memberExpression(
					Types.identifier(RUNTIME_IDENTIFIER),
					Types.identifier(methodName)
				),
				argumentExpressions
			)
		);
	}

	private setNodePosition<T extends Types.Node>(position: Position, node: T): T {
		if (!position) {
			return node;
		}

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

	private createPositionExpression(position: Position): Types.ArrayExpression {
		return Types.arrayExpression([
			Types.numericLiteral(position.line),
			Types.numericLiteral(position.column)
		]);
	}

}