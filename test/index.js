const { Renderer } = require('../dist/');

async function main() {
	let renderer = new Renderer({
		views: './test/views'
	});

	let result = renderer.render('test.html', {});
	console.log(result);
}

main().catch(console.error);