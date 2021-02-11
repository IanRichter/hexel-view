const { Renderer } = require('../dist/');

async function main() {
	let renderer = new Renderer({
		views: './test/views'
	});

	let result = renderer.renderAST('test.html', {});
	console.log(result);
}

main().catch(console.error);