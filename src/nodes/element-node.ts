import { CompositeNode } from './composite-node';
import { ElementAttributeNode } from './element-attribute-node';

export class ElementNode extends CompositeNode {

	public tagName: string = null;
	public isVoid: boolean = false;
	public isSelfClosing: boolean = false;
	public attributes: ElementAttributeNode[] = [];

}