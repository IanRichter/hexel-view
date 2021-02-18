import { Context } from './context';
import { ViewNode } from './nodes/view-node';
import { Runtime } from './runtime';

export type RenderFunction = (runtime: Runtime, isPartial: boolean) => Promise<string>;

export interface ViewOptions {
	source: string;
	filePath: string;
	ast: ViewNode;
	code: string;
	renderFunction: RenderFunction;
}

/**
 * Represents a compiled view template that can be rendered.
 */
export class View {

	public readonly source: string;
	public readonly filePath: string;
	public ast: ViewNode;
	public readonly code: string;
	private renderFunction: RenderFunction;

	public constructor(options: ViewOptions) {
		this.source = options.source;
		this.filePath = options.filePath;
		this.ast = options.ast;
		this.code = options.code;
		this.renderFunction = options.renderFunction;
	}

	public async render(runtime: Runtime, context: Context, layoutViewPath: string = null): Promise<void> {
		if (layoutViewPath) {
			runtime.setLayout(layoutViewPath);
		}

		await this.renderFunction.call(context, runtime, false);

		if (runtime.hasLayout()) {
			await runtime.renderLayout(context);
		}
	}

	public async renderPartial(runtime: Runtime, context: Context): Promise<void> {
		await this.renderFunction.call(context, runtime, true);
	}

}