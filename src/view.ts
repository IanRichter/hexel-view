import { Runtime } from './runtime';
import { Source } from './source';

export type RenderFunction = (context: object, runtime: Runtime) => string;

/**
 * Represents a compiled view template that can be rendered.
 */
export class View {

	private filePath: string;
	private renderFunction: RenderFunction;
	private source: Source;
	public readonly code: string;

	public constructor(filePath: string, renderFunction: RenderFunction, source: Source, code: string) {
		this.filePath = filePath;
		this.renderFunction = renderFunction;
		this.source = source;
		this.code = code;
	}

	public async render(runtime: Runtime, context: object, layoutViewPath: string = null): Promise<void> {
		if (layoutViewPath) {
			runtime.setLayout(layoutViewPath);
		}

		await this.renderFunction.call(context, runtime, false);

		if (runtime.hasLayout()) {
			await runtime.renderLayout(context);
		}
	}

	public async renderPartial(runtime: Runtime, context: object): Promise<void> {
		await this.renderFunction.call(context, runtime, true);
	}

}