import { Context } from './context';
import { Runtime } from './runtime';
import { Source } from './source';

export type RenderFunction = (runtime: Runtime, isPartial: boolean) => Promise<string>;

/**
 * Represents a compiled view template that can be rendered.
 */
export class View {

	private renderFunction: RenderFunction;
	public readonly source: Source;
	public readonly code: string;

	public constructor(source: Source, renderFunction: RenderFunction, code: string) {
		this.source = source;
		this.renderFunction = renderFunction;
		this.code = code;
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