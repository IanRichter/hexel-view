// TODO: Refactor to take Position object and only be used by ViewScope methods
export class TemplateError extends Error {

	public constructor(message: string, [ line, column ]: Array<number>) {
		super(`Line ${line}:${column}: ${message}`);
	}

}