const { Renderer } = require('../src/');

async function main(): Promise<void> {
	let renderer = new Renderer({
		views: './test/views',
		cache: false,
		writeGeneratedViews: true
	});

	let result = renderer.render('test.html', {});
	console.log(result);
}

main().catch(console.error);