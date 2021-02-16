# Hexel View
A fully featured HTML view renderer for NodeJS.

```
npm install hexel-view
```

## TODO
- Rename `BlockValue` for Parser
- Split expression into two types: Output and non-output
- Add `@layout` support
- Write tests

## Bugs
- Doctype must be case insensitive
- CData must be case insensitive

## Features
- Standard HTML5
- Embedded JavaScript expressions
- Enhanced HTML attributes
- Scope blocks
- Control flow statements
- Partials
- Layouts

## Standard HTML5
Most of the HTML5 specification is supported, with some limitations applied:
- Non-void elements must always have closing tags.
- Only the HTML5 doctype is supported.
- Element attributes must always be quoted using either single or double quotes.

Some additional conveniences have also been added:
- Any element can use the self-closing element syntax: `<element />`

## Embedded JavaScript expressions
### Expression (ExpressionNode)
```
{% expression %}
```

### Print expression (PrintExpressioNode)
```html
{%= expression %}
```

### Variable declaration (ExpressionNode)
```html
{% let value = expression %}
```

### Expression comment (ExpressionCommentNode)
```html
{%# Comment text %}
```

## Enhanced HTML attributes

### Attribute value interpolation (NormalAttributeNode)
```html
<element attribute="{{ expression }}">

E.g.
<a href="/items/{{ item.id }}/edit">
```

### Attribute value as expression (BoundAttributeNode)
```html
<element [attribute]="<expression>">

E.g.
<a [href]="showPath">
```

### Append attribute value (AppendAttributeNode)
```html
<element [attribute.value]="<expression>">

E.g.
<div [class.is-open]="isOpen">
```

### Boolean attribute (BooleanAttributeNode)
```html
<element [?attribute]="<expression>">

E.g.
<input [?checked]="isChecked">
```

## Scope blocks
```html
<js>
	...
</js>
```

## Print block
```html
<js @print="<expression>" />
```

```html
<js @print="method($block)" @block="arg1, arg2">
	...
</js>
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

### Empty iteration alternative
```html
<js @foreach="...">
	...
</js>
<js @else>
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
```html
<js @render="<partial-view-path>" @context="<expression>" />
```

## Layouts and slots

### Extending views
```html
<js @extend="<parent-view-path>" />
```

### Slot content
```html
<js @content-for="<slot-name>">
	...
</js>
```

### Render slot
```html
<js @render-slot="<slot-name>" />
```

### Render default slot
```html
<js @render-default-slot />
```