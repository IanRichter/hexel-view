import { AttributeSet } from './attribute-set';
import { Context } from './context';
import { Environment } from './environment';
import { RenderTarget } from './render-target';
import { TemplateError } from './template-error';

type AttributeBuilder = (attributeSet: AttributeSet) => void;
type Collection = unknown[] | Record<string, unknown> | Iterable<unknown>;

export class Runtime {

	private environment: Environment;
	private renderTargetStack: RenderTarget[] = [];
	private renderTarget: RenderTarget;
	private layoutViewStack: string[] = [];
	private layoutViewPath: string = null;

	public constructor(environment: Environment) {
		this.environment = environment;
		this.renderTarget = new RenderTarget();
	}

	public getResult(): string {
		return this.renderTarget.getDefault();
	}

	public saveRenderTarget(): void {
		this.renderTargetStack.push(this.renderTarget);
		this.renderTarget = new RenderTarget();
	}

	public restoreRenderTarget(): RenderTarget {
		let renderTarget = this.renderTarget;
		this.renderTarget = this.renderTargetStack.pop();
		return renderTarget;
	}

	public mergeRenderTarget(slotName: string): void {
		let renderTarget = this.renderTarget;
		this.renderTarget = this.renderTargetStack.pop();
		this.renderTarget.merge(renderTarget, slotName);
	}

	public renderText(textContent: string): void {
		this.renderTarget.append(textContent);
	}

	public renderComment(textContent: string): void {
		this.renderTarget.append(`<!--${textContent}-->`);
	}

	public renderCData(textContent: string): void {
		this.renderTarget.append(`<![CDATA[${textContent}]]>`);
	}

	public renderDoctype(): void {
		this.renderTarget.append('<!DOCTYPE html>');
	}

	public renderElementOpenTag(tagName: string, attributes: AttributeBuilder[]): void {
		let attributeSet = new AttributeSet();
		attributes.forEach(attribute => attribute(attributeSet));

		this.renderTarget.append(`<${tagName}`);
		this.renderTarget.append(attributeSet.toString());
		this.renderTarget.append('>');
	}

	public renderElementCloseTag(tagName: string): void {
		this.renderTarget.append(`</${tagName}>`);
	}

	public createNormalAttribute(name: string, quote: string, values: unknown[]): AttributeBuilder {
		return attributeSet => {
			if (values) {
				let valueString = values.map(this.toStringValue.bind(this)).join('');
				attributeSet.setValue(name, quote, valueString);
			}
			else {
				attributeSet.setBooleanValue(name);
			}
		};
	}

	public createExpressionAttribute(name: string, quote: string, value: unknown): AttributeBuilder {
		return attributeSet => {
			attributeSet.setValue(name, quote, this.toStringValue(value));
		};
	}

	public createConditionalAttribute(name: string, condition: boolean): AttributeBuilder {
		return attributeSet => {
			if (condition) {
				attributeSet.setBooleanValue(name);
			}
		};
	}

	public createAppendAttribute(name: string, quote: string, value: string, condition: boolean): AttributeBuilder {
		return attributeSet => {
			if (condition) {
				attributeSet.appendValue(name, quote, this.toStringValue(value));
			}
		};
	}

	// TODO: Add support for generic Iterables
	public createCollection(collection: Collection, position: [number, number]): Iterable<unknown> {
		if (!collection) {
			throw new TemplateError('collection cannot be null.', position);
		}

		if (Array.isArray(collection)) {
			return collection.map((item, index) => [item, index]);
		}
		else {
			return Object.entries(collection)
				.map(([key, value], index) => [key, value, index]);
		}
		// else if (Symbol.iterator in collection) {
		// 	return collection;
		// }
	}

	public async renderPartialView(viewPath: string, currentContext: Context, partialContext: Context): Promise<void> {
		let partialView = this.environment.getView(viewPath);
		await partialView.renderPartial(this, {
			...currentContext,
			...partialContext
		});
	}

	public async renderValue(inputValue: unknown | Promise<unknown>): Promise<void> {
		let outputValue = await Promise.resolve(inputValue);
		if (outputValue !== undefined && outputValue !== null) {
			this.renderTarget.append(this.toStringValue(outputValue));
		}
	}

	public renderContent(slotName: string): void {
		if (slotName) {
			this.renderTarget.append(this.renderTarget.get(slotName));
		}
		else {
			this.renderTarget.append(this.renderTarget.getLayoutContent());
		}
	}

	public setLayout(layoutViewPath: string): void {
		// Change for adjust whether inline layouts can override procedural layouts
		if (this.layoutViewPath) {
			return;
		}

		this.environment.verifyViewPath(layoutViewPath);
		this.layoutViewPath = layoutViewPath;
	}

	public hasLayout(): boolean {
		return Boolean(this.layoutViewPath);
	}

	public async renderLayout(context: Context): Promise<void> {
		if (!this.layoutViewPath) {
			return;
		}

		if (this.layoutViewStack.includes(this.layoutViewPath)) {
			// TODO: Include cycle in error
			throw new Error('Cycle detected in view layouts.');
		}

		let layoutView = this.environment.getView(this.layoutViewPath);
		this.layoutViewStack.push(this.layoutViewPath);
		this.layoutViewPath = null;

		this.renderTarget.startLayout();
		await layoutView.render(this, context);
	}

	// TODO: Add support for HTMLSafeString, otherwise escape the value
	private toStringValue(value: unknown): string {
		if (value === undefined || value === null) {
			return '';
		}
		else {
			return value.toString();
		}
	}

}
