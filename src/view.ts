import { TemplateNode } from './nodes/template-node';

export class View {

	public readonly ast: TemplateNode;
	public readonly code: string;
	private renderFunction: () => string;

	public constructor(ast: TemplateNode, code: string, renderFunction: () => string) {
		this.ast = ast;
		this.code = code;
		this.renderFunction = this.renderFunction;
	}

	public render(context: object): string {
		return '';
	}

}