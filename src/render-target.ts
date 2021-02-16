export class RenderTarget {

	private slots: object = {};
	private defaultSlot: string = '';
	private layoutContent: string = '';

	public merge(other: RenderTarget, defaultSlotTarget: string): void {
		for (let slotName in other.slots) {
			this.appendTo(slotName, other.get(slotName));
		}

		if (defaultSlotTarget) {
			this.appendTo(defaultSlotTarget, other.getDefault());
		}
		else {
			this.append(other.getDefault());
		}
	}

	public getDefault(): string {
		return this.defaultSlot;
	}

	public get(slotName: string): string {
		return this.slots[slotName] || '';
	}

	public append(text: string): void {
		this.defaultSlot += text;
	}

	public appendTo(slotName: string, text: string): void {
		if (!(slotName in this.slots)) {
			this.slots[slotName] = text;
		}
		else {
			this.slots[slotName] += text;
		}
	}

	public getLayoutContent(): string {
		return this.layoutContent;
	}

	public startLayout(): void {
		this.layoutContent = this.defaultSlot;
		this.defaultSlot = '';
	}

}