export interface Attribute {
	boolean: boolean;
	quote: string;
	value: string;
}

export class AttributeSet {

	private attributes: Map<string, Attribute>;

	public constructor() {
		this.attributes = new Map();
	}

	public setValue(name: string, quote: string, value: string): void {
		this.attributes.set(name, {
			boolean: false,
			quote,
			value
		});
	}

	public setBooleanValue(name: string): void {
		this.attributes.set(name, {
			boolean: true,
			quote: null,
			value: null
		});
	}

	public appendValue(name: string, quote: string, value: string): void {
		if (!this.attributes.has(name)) {
			this.attributes.set(name, {
				boolean: false,
				quote,
				value
			});
		}
		else {
			this.attributes.get(name).value += ` ${value}`;
		}
	}

	public toString(): string {
		if (this.attributes.size > 0) {
			let str = Array.from(this.attributes.entries())
				.map(([name, { boolean, quote, value }]) => {
					if (boolean) {
						return name;
					}
					else {
						return `${name}=${quote}${value}${quote}`;
					}
				})
				.join(' ');

			return ' ' + str;
		}
		else {
			return '';
		}
	}

}