import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: ''
	}
});

export default app;

//	<h2>Hello {name}!</h2>
//	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
	