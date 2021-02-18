import { Express } from 'express';
import { RendererOptions } from './renderer-options';
import { ExpressionTags } from './expression-tags';
import { Environment } from './environment';
import { Runtime } from './runtime';
import { Context } from './context';

/**
 * Pipeline:
 * Source -> Lexer(s) -> MultiLexer -> Parser -> Compiler -> Runtime
 */

/**
 * Provides an interface for rendering Views and integrates with Express.js
 */
export class Renderer {

	private environment: Environment;

	public constructor({
		views = './views',
		cache = true,
		tags = {
			blockTagName: 'js',
			expressionStart: '{%',
			expressionEnd: '%}',
			printStart: '{%=',
			commentStart: '{%#'
		},
		tabSize = 4
	}: RendererOptions = {}) {
		this.verifyTags(tags);

		this.environment = new Environment({
			rootViewsPath: views,
			cacheViews: cache,
			tags,
			tabSize
		});
	}

	public setupExpress(expressApp: Express): void {
		let fileExtension = 'html';

		expressApp.engine(fileExtension, async (viewPath, context, callback) => {
			let html = await this.render(viewPath, context as Context);
			callback(null, html);
		});

		expressApp.set('view engine', fileExtension);
	}

	public async render(relativeViewPath: string, context: Context = {}, layoutViewPath: string = null): Promise<string> {
		let view = this.environment.getView(relativeViewPath);
		let runtime = new Runtime(this.environment);
		await view.render(runtime, context, layoutViewPath);
		return runtime.getResult();
	}

	public async renderPartial(relativeViewPath: string, context: Context = {}): Promise<string> {
		let view = this.environment.getView(relativeViewPath);
		let runtime = new Runtime(this.environment);
		await view.renderPartial(runtime, context);
		return runtime.getResult();
	}

	// TODO: Generated unique fakepath for string views
	public async renderFromString(source: string, context: Context = {}): Promise<string> {
		let view = this.environment.createView(source, '');
		let runtime = new Runtime(this.environment);
		await view.render(runtime, context);
		return runtime.getResult();
	}

	private verifyTags(tags: ExpressionTags): void {
		if (tags.expressionStart.length < 2) {
			throw new Error('expressionStart must be at least 2 characters long.');
		}

		if (tags.expressionEnd.length < 2) {
			throw new Error('expressionEnd must be at least 2 characters long.');
		}

		if (tags.printStart.substring(0, tags.expressionStart.length) !== tags.expressionStart) {
			throw new Error('printStart must start with the same characters as expressionStart.');
		}

		if (tags.commentStart.substring(0, tags.expressionStart.length) !== tags.expressionStart) {
			throw new Error('commentStart must start with the same characters as expressionStart.');
		}
	}

}