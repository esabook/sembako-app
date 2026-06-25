export function emailInput(node: HTMLInputElement) {
	node.type = 'email';
	node.pattern = '[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$';
}
