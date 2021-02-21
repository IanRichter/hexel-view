# Hexel View

A fully featured HTML view renderer for NodeJS.

```
npm install hexel-view
```

**Note:** Hexel View is still in the early stages of development, and as such it has not
been thoroughly tested or documented yet. Caution is adviced when using this library
in production environments.

## Features
- Standard HTML5
- Embedded JavaScript expressions
- Enhanced HTML attributes
- Scope blocks
- Control flow statements
- Partials
- Layouts
- API

## Standard HTML5
Most of the HTML5 specification is supported, with some limitations applied:
- Non-void elements must always have closing tags.
- Only the HTML5 doctype is supported.
- Element attributes must always be quoted using either single or double quotes.

Some additional conveniences have also been added:
- Any element can use the self-closing element syntax: `<element />`

## Embedded JavaScript expressions
### Expression
The expression will be evaluated, but not output to your template, allowing you
to perform operations like you would in Javascript. Only a single expression is
allowed.
```html
{% expression %}
```

### Print expression
These work just like the normal expression, except they will output the return
value of the expression. If the return value is `null` or `undefined`, then
nothing will be printed.
```html
{%= expression %}
```

### Variable declaration
Variables can be defined in your views like you would do in plain Javascript.
You're limited to `let` declarations though.
```html
{% let value = expression %}
```

### Expression comment
These expression comments allow you to add comments to your views that won't be
printed into the rendered result.
```html
{%# Comment text %}
```

## Enhanced HTML attributes

### Attribute value interpolation
Element attributes may contain expression statements like any other part of the
view.
```html
<element attribute="{%= expression %}">

E.g.
<a href="/items/{%= item.id %}/edit">
```

### Attribute value as expression
You can also bind the value of an attribute to the return value of an expression
without needing to use the expression tags in the attribute value.
```html
<element [attribute]="<expression>">

E.g.
<a [href]="showPath">
```

### Append attribute value
This syntax allows you to append a value to an attribute value, based on an
expression. If the expression evaluates to a truthy value, then the value after
the dot (`.`) will be appended to the base value of the attribute, separated by
a space. The append value may not contain any space characters, to ensure that
it complies with value HTML syntax.
```html
<element [attribute.value]="<expression>">

E.g.
<div [class.is-open]="isOpen">
```

### Boolean attribute
By using a boolean attribute expression you can add a boolean attribute to an
element if the value of its expression evaluated to a truthy value.
```html
<element [?attribute]="<expression>">

E.g.
<input [?checked]="isChecked">
```

## Scope blocks
Sometimes it is useful to simply scope some variables in Javascript. You can
achieve this in Hexel by using a plain `js` block.
```html
<js>
	...
</js>
```

## Print block
Print blocks are an alternative syntax to be output expression.
```html
<js @print="<expression>" />
```

These statements also support block content as an argument in your expressions.
The `$block` variable will be injected into your expression as a function which
will return the rendered content of the `@print` block. You can also pass arguments
to the `$block` function, which will be exposed in the view block.
```html
<js @print="method($block)" @block="arg1, arg2">
	...
</js>
```

The format of the `$block` function is:
```javascript
function $block(...args: unknown[]): Promise<string>;
```

## If statement
```html
<js @if="<condition>">
	...
</js>
<js @else-if="<condition>">
	...
</js>
<js @else>
	...
</js>
```

## Switch statement
```html
<js @switch="<expression>">
	<js @case="<expression>">
		...
	</js>
	<js @case="<expression>">
		...
	</js>
	<js @default>
		...
	</js>
</js>
```

## Foreach statement

### Array iteration
```html
<js @foreach="<value>[, <index>] in <array>">
	...
</js>
```

### Object iteration
```html
<js @foreach="<key>[, <value>[, <index>]] in <object>">
	...
</js>
```

## While statement
```html
<js @while="<condition>">
	...
</js>
```

## Render statement
You can render partial views in other views using the `@render` declaration.
```html
<js @render="<partial-view-path>" @context="<expression>" />
```

## Layouts and slots
Hexel supports layouts and content slots, making composing complex templates much
easier.

### Layouts
To define the layout for a view inline, just add an `@layout` declaration to the
start of your template.

**Note:** Partial views cannot define a layout to use inline.

```html
<js @layout="<layout-view-path>" />
```
Now any content you write in your view will be considered part of the "default"
content slot, which can be renderer in the layout view.

### Render default slot
You can render the content for the default slot in a layout view using the
`@render-content` declaration.
```html
<js @render-content />
```

### Slot content
You can also specify content for a specific named slot in your view.
```html
<js @content-for="<slot-name>">
	...
</js>
```

### Render slot
To render the content for a named slot, simply add an `@render-content` declaration
with the desired slot name. If no content has been rendered for that slot, it won't
output anything.
```html
<js @render-content="<slot-name>" />
```

## Example
```html
<js @if="items.length > 0">
    <ul class="list">
        <js @foreach="item, index in items">
            <li>
                <a class="link"
                   href="/items/{{ item.id }}"
                   [data-id]="item.id"
                   [?hidden]="!item.isVisible"
                   [class.is-active]="index === 0">
                    {{ item.name }}
                </a>
            </li>
        </js>
    </ul>
</js>
<js @else>
	<div class="empty">No items</div>
</js>
```

## API

### 1. Import the Renderer
```javascript
// ES6 Modules
import { Renderer } from 'hexel-view';

// CommonJS Modules
const { Renderer } = require('hexel-view');
```

### 2. Setup the Renderer
```javascript
// Default options
let renderer = new Renderer();

// With options
let renderer = new Renderer({
	// ...
});
```

The `Renderer` supports various options, which are listed below:
```typescript
interface RendererOptions {
	views?: string = 'views';
	cache?: boolean = true;
	tags?: {
		blockTagName: string = 'js';
		expressionStart: string = '{%';
		expressionEnd: string = '%}';
		printStart: string = '{%=';
		commentStart: string = '{%#';
	};
	layout?: string = null;
	tabSize?: number = 4;
}
```

### 3. ExpressJS integration (optional)
Hexel integrates seamlessly with ExpressJS. All you have to do is to
call the setup method with your express server instance:
```javascript
renderer.setupExpress(expressApp, {
	// ...
});
```

You can configure the integration using the options listed below:
```typescript
interface ExpressOptions {
	extension?: string = 'html';
	isDefault?: boolean = true;
}
```
