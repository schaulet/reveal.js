/**
 * Reveal.js Presentation Editor
 * 
 * Features:
 * - Markdown to slides conversion
 * - WYSIWYG slide editing
 * - Live preview
 * - Slide management (add, delete, reorder)
 * - Export to HTML
 * - Local storage persistence
 */

class PresentationEditor {
	constructor() {
		this.slides = [];
		this.currentSlideIndex = 0;
		this.theme = 'black';
		this.reveal = null;
		
		// Initialize with blank presentation
		this.init();
	}
	
	init() {
		// Load from localStorage or create blank
		const saved = localStorage.getItem('reveal-editor-data');
		if (saved) {
			const data = JSON.parse(saved);
			this.slides = data.slides || [];
			this.theme = data.theme || 'black';
		} else {
			this.createBlankPresentation();
		}
		
		this.bindEvents();
		this.render();
		this.startAutoSave();
	}
	
	createBlankPresentation() {
		this.slides = [
			{
				type: 'title',
				content: '# Ma Présentation\n\nCliquez pour modifier ce texte',
				backgroundColor: '#000000',
				transition: ''
			}
		];
		this.theme = 'black';
	}
	
	bindEvents() {
		// File import/export
		document.getElementById('btn-import').addEventListener('click', () => this.importMarkdown());
		document.getElementById('btn-export').addEventListener('click', () => this.exportHTML());
		document.getElementById('btn-new').addEventListener('click', () => this.newPresentation());
		
		// Slide management
		document.getElementById('btn-add-slide').addEventListener('click', () => this.addSlide());
		
		// Editor toolbar
		document.getElementById('slide-layout').addEventListener('change', (e) => this.applyLayout(e.target.value));
		document.getElementById('slide-bg-color').addEventListener('input', (e) => this.setBackgroundColor(e.target.value));
		document.getElementById('slide-transition').addEventListener('change', (e) => this.setTransition(e.target.value));
		document.getElementById('presentation-theme').addEventListener('change', (e) => this.setTheme(e.target.value));
		
		// Content editor
		const editor = document.getElementById('slide-editor');
		editor.addEventListener('input', () => this.onContentChange());
		editor.addEventListener('keydown', (e) => this.handleEditorKeys(e));
		
		// Preview play button
		document.getElementById('btn-play').addEventListener('click', () => this.playPresentation());
		
		// Help modal
		document.getElementById('btn-help').addEventListener('click', () => this.showHelp());
		document.getElementById('modal-close').addEventListener('click', () => this.hideHelp());
		
		// Keyboard shortcuts
		document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
		
		// File input change
		document.getElementById('file-input').addEventListener('change', (e) => this.handleFileImport(e));
	}
	
	// MARK: - Slide Management
	
	addSlide() {
		const newSlide = {
			type: 'bullets',
			content: '## Nouveau Slide\n\n- Point 1\n- Point 2\n- Point 3',
			backgroundColor: '',
			transition: ''
		};
		this.slides.splice(this.currentSlideIndex + 1, 0, newSlide);
		this.currentSlideIndex++;
		this.render();
	}
	
	deleteSlide(index) {
		if (this.slides.length <= 1) {
			alert('Vous devez avoir au moins une slide.');
			return;
		}
		this.slides.splice(index, 1);
		if (this.currentSlideIndex >= this.slides.length) {
			this.currentSlideIndex = this.slides.length - 1;
		}
		this.render();
	}
	
	selectSlide(index) {
		if (index >= 0 && index < this.slides.length) {
			this.currentSlideIndex = index;
			this.renderSlideEditor();
			this.renderPreview();
		}
	}
	
	moveSlide(fromIndex, toIndex) {
		if (toIndex < 0 || toIndex >= this.slides.length) return;
		
		const slide = this.slides.splice(fromIndex, 1)[0];
		this.slides.splice(toIndex, 0, slide);
		this.currentSlideIndex = Math.min(this.currentSlideIndex, this.slides.length - 1);
		this.render();
	}
	
	// MARK: - Content Editing
	
	onContentChange() {
		const editor = document.getElementById('slide-editor');
		const content = editor.innerHTML;
		this.slides[this.currentSlideIndex].content = this.convertHtmlToMarkdown(content);
		this.renderPreview();
	}
	
	currentContentAsHtml() {
		const editor = document.getElementById('slide-editor');
		return editor.innerHTML;
	}
	
	getEditorText() {
		const editor = document.getElementById('slide-editor');
		return editor.innerText;
	}
	
	setEditorContent(markdown) {
		const html = this.markdownToHtml(markdown);
		const editor = document.getElementById('slide-editor');
		editor.innerHTML = html;
	}
	
	handleEditorKeys(e) {
		// Handle Enter for new bullet points
		// Handle Tab for indentation
		// More advanced editing features can be added here
	}
	
	// MARK: - Layout Management
	
	applyLayout(layout) {
		const templates = {
			'': '# Titre Principal\n\nSous-titre',
			'bullets': '## Titre\n\n- Point 1\n- Point 2\n- Point 3',
			'two-column': '## Titre\n\n<div class="two-col">\n\n- Colonne 1\n\n---\n\n- Colonne 2\n</div>',
			'code': '## Code Example\n\n```javascript\nconst hello = "world";\nconsole.log(hello);\n```',
			'image': '## Image Title\n\n![Description](image-url)',
			'blank': ''
		};
		
		if (templates[layout] !== undefined) {
			this.slides[this.currentSlideIndex].content = templates[layout];
			this.slides[this.currentSlideIndex].type = layout;
			this.renderSlideEditor();
			this.renderPreview();
		}
	}
	
	setBackgroundColor(color) {
		this.slides[this.currentSlideIndex].backgroundColor = color;
		this.renderPreview();
	}
	
	setTransition(transition) {
		this.slides[this.currentSlideIndex].transition = transition;
		this.renderPreview();
	}
	
	setTheme(theme) {
		this.theme = theme;
		document.getElementById('editor-theme').href = `dist/theme/${theme}.css`;
		this.renderPreview();
	}
	
	// MARK: - Markdown Conversion
	
	markdownToHtml(markdown) {
		if (!markdown) return '<p>Empty slide</p>';
		
		let html = markdown
			// Escape HTML entities (but keep markdown symbols)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			
			// Headers
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			
			// Bold and Italic
			.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
			.replace(/__(.+?)__/g, '<strong>$1</strong>')
			.replace(/_(.+?)_/g, '<em>$1</em>')
			
			// Code blocks
			.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
			.replace(/`(.+?)`/g, '<code>$1</code>')
			
			// Links
			.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
			
			// Images
			.replace(/!\[(.+?)\]\((.+?)\)/g, '<img alt="$1" src="$2">')
			
			// Horizontal rule
			.replace(/^---$/gm, '<hr>')
			
			// Two column layout
			.replace(/---/g, '</div><div class="column">')
			
			// Lists - process first (before bullets within paragraphs)
			.replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>')
			.replace(/^\* (.+)$/gm, '<ul><li>$1</li></ul>')
			.replace(/^\d+\. (.+)$/gm, '<ol><li>$1</li></ol>')
			
			// Blockquotes
			.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
			
			// Paragraphs - wrap everything else
			.split('\n\n')
			.filter(p => p.trim())
			.map(p => {
				// Wrap in paragraph if not already wrapped
				if (!p.match(/^<(h[1-6]|ul|ol|pre|blockquote|div|img|a|p)/)) {
					return `<p>${p}</p>`;
				}
				return p;
			})
			.join('\n');
		
		// Clean up lists - merge adjacent
		html = this.mergeLists(html);
		
		// Process two-column divs
		if (html.includes('</div><div class="column">')) {
			html = '<div class="r-stack"><div class="column">' + html + '</div></div>';
		}
		
		// Clean up multiple newlines
		html = html.replace(/\n/g, '');
		
		return html;
	}
	
	mergeLists(html) {
		// Merge consecutive ul/ol tags
		return html.replace(/<\/ul>\s*<ul>/g, '').replace(/<\/ol>\s*<ol>/g, '');
	}
	
	convertHtmlToMarkdown(html) {
		if (!html) return '';
		
		let md = html
			// Headers
			.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n')
			.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n')
			.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n')
			
			// Code
			.replace(/<pre><code class="([^"]+)">([\s\S]*?)<\/code><\/pre>/gi, '```$1\n$2```\n')
			.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
			
			// Bold/Italic
			.replace(/<strong><em>([\s\S]*?)<\/em><\/strong>/gi, '***$1***')
			.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
			.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
			
			// Links
			.replace(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
			
			// Images
			.replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
			
			// Lists
			.replace(/<li>([\s\S]*?)<\/li>/gi, '- $1\n')
			.replace(/<(ul|ol)>([\s\S]*)<\/(ul|ol)>/gi, '$2')
			
			// Blockquotes
			.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
			
			// Horizontal rule
			.replace(/<hr\s*\/?>/gi, '\n---\n')
			
			// Line breaks
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/p>/gi, '\n\n')
			.replace(/<p>/gi, '')
			
			// Clean up remaining tags
			.replace(/<[^>]+>/g, '')
			
			// Decode entities
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"');
		
		return md.trim();
	}
	
	parseMarkdownFromContent(markdown) {
		// Parse markdown content and split into slides
		// Slides are separated by ---
		const slideContents = markdown.split(/\n(?=---)/);
		return slideContents.map(content => ({
			type: 'custom',
			content: content.trim(),
			backgroundColor: '',
			transition: ''
		}));
	}
	
	// MARK: - Rendering
	
	render() {
		this.renderSlideList();
		this.renderSlideEditor();
		this.renderPreview();
		this.fillToolbarSettings();
	}
	
	renderSlideList() {
		const container = document.getElementById('slides-list');
		container.innerHTML = '';
		
		this.slides.forEach((slide, index) => {
			const thumb = document.createElement('div');
			thumb.className = 'slide-thumb' + (index === this.currentSlideIndex ? ' active' : '');
			thumb.dataset.index = index;
			
			// Generate thumbnail preview
			const content = slide.content.substring(0, 100).replace(/\n/g, '<br>');
			thumb.innerHTML = `
				<div class="thumb-number">${index + 1}</div>
				<div class="thumb-content">${content}</div>
				<button class="thumb-delete" data-index="${index}" title="Delete slide">🗑</button>
			`;
			
			thumb.addEventListener('click', (e) => {
				if (!e.target.classList.contains('thumb-delete')) {
					this.selectSlide(index);
				}
			});
			
			thumb.querySelector('.thumb-delete').addEventListener('click', (e) => {
				e.stopPropagation();
				this.deleteSlide(index);
			});
			
			// Drag and drop for reordering
			thumb.draggable = true;
			thumb.addEventListener('dragstart', (e) => {
				e.dataTransfer.setData('text/plain', index);
			});
			thumb.addEventListener('dragover', (e) => e.preventDefault());
			thumb.addEventListener('drop', (e) => {
				e.preventDefault();
				const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
				this.moveSlide(fromIndex, index);
			});
			
			container.appendChild(thumb);
		});
	}
	
	renderSlideEditor() {
		const slide = this.slides[this.currentSlideIndex];
		if (!slide) return;
		
		const html = this.markdownToHtml(slide.content);
		const editor = document.getElementById('slide-editor');
		editor.innerHTML = html;
		
		// Apply background color if set
		if (slide.backgroundColor) {
			editor.style.backgroundColor = slide.backgroundColor;
		} else {
			editor.style.backgroundColor = '';
		}
	}
	
	renderPreview() {
		const container = document.getElementById('preview-slides');
		container.innerHTML = '';
		
		this.slides.forEach(slide => {
			const section = document.createElement('section');
			
			// Apply slide attributes
			if (slide.backgroundColor) {
				section.setAttribute('data-background-color', slide.backgroundColor);
			}
			if (slide.backgroundImage) {
				section.setAttribute('data-background-image', slide.backgroundImage);
			}
			if (slide.transition) {
				section.setAttribute('data-transition', slide.transition);
			}
			
			const html = this.markdownToHtml(slide.content);
			section.innerHTML = html;
			
			container.appendChild(section);
		});
		
		// Reinitialize Reveal.js
		this.initReveal();
	}
	
	initReveal() {
		// Destroy existing instance
		if (this.reveal) {
			this.reveal.destroy();
		}
		
		// Wait for DOM update
		setTimeout(() => {
			this.reveal = new Reveal({
				embedded: true,
				hash: false,
				slideNumber: false,
				keyboard: false,
				overview: false,
				transition: 'none'
			});
			this.reveal.initialize({
				plugins: [],
				embedded: true
			});
		}, 100);
	}
	
	fillToolbarSettings() {
		const slide = this.slides[this.currentSlideIndex];
		if (!slide) return;
		
		document.getElementById('slide-layout').value = slide.type || '';
		document.getElementById('slide-bg-color').value = slide.backgroundColor || '#000000';
		document.getElementById('slide-transition').value = slide.transition || '';
		document.getElementById('presentation-theme').value = this.theme;
	}
	
	// MARK: - Import/Export
	
	importMarkdown() {
		document.getElementById('file-input').click();
	}
	
	handleFileImport(e) {
		const file = e.target.files[0];
		if (!file) return;
		
		const reader = new FileReader();
		reader.onload = (event) => {
			const markdown = event.target.result;
			this.loadFromMarkdown(markdown);
		};
		reader.readAsText(file);
		
		// Reset input
		e.target.value = '';
	}
	
	loadFromMarkdown(markdown) {
		// Parse markdown into slides
		// Use --- as separator between slides
		const slideContents = markdown.split(/\n(?=---|\n## )/);
		
		this.slides = slideContents.map((content, index) => ({
			type: 'custom',
			content: content.replace(/^---\n/, '').trim(),
			backgroundColor: '',
			transition: ''
		}));
		
		if (this.slides.length === 0) {
			this.createBlankPresentation();
		}
		
		this.currentSlideIndex = 0;
		this.render();
	}
	
	exportHTML() {
		const html = this.generateFullHTML();
		this.downloadFile(html, 'presentation.html');
	}
	
	generateFullHTML() {
		const slidesHtml = this.slides.map(slide => {
			const html = this.markdownToHtml(slide.content);
			let attrs = '';
			if (slide.backgroundColor) attrs += ` data-background-color="${slide.backgroundColor}"`;
			if (slide.backgroundImage) attrs += ` data-background-image="${slide.backgroundImage}"`;
			if (slide.transition) attrs += ` data-transition="${slide.transition}"`;
			return `<section${attrs}>${html}</section>`;
		}).join('\n');
		
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>My Presentation</title>
	<link rel="stylesheet" href="dist/reset.css">
	<link rel="stylesheet" href="dist/reveal.css">
	<link rel="stylesheet" href="dist/theme/${this.theme}.css">
	<link rel="stylesheet" href="plugin/highlight/monokai.css">
</head>
<body>
	<div class="reveal">
		<div class="slides">
			${slidesHtml}
		</div>
	</div>
	<script src="dist/reveal.js"></script>
	<script src="dist/plugin/markdown.js"></script>
	<script src="dist/plugin/highlight.js"></script>
	<script src="dist/plugin/notes.js"></script>
	<script>
		Reveal.initialize({
			controls: true,
			progress: true,
			center: true,
			hash: true,
			transition: 'slide',
			plugins: [RevealMarkdown, RevealHighlight, RevealNotes]
		});
	</script>
</body>
</html>`;
	}
	
	downloadFile(content, filename) {
		const blob = new Blob([content], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
	
	newPresentation() {
		if (confirm('Créer une nouvelle présentation? Les modifications non enregistrées seront perdues.')) {
			this.slides = [];
			this.createBlankPresentation();
			this.currentSlideIndex = 0;
			this.render();
		}
	}
	
	// MARK: - Play Presentation
	
	playPresentation() {
		// Generate full page HTML and open in new window
		const html = this.generateFullHTML();
		const blob = new Blob([html], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
	}
	
	// MARK: - Help
	
	showHelp() {
		document.getElementById('help-modal').style.display = 'flex';
	}
	
	hideHelp() {
		document.getElementById('help-modal').style.display = 'none';
	}
	
	// MARK: - Keyboard Shortcuts
	
	handleKeyboardShortcuts(e) {
		// Ctrl/Cmd + S = Save
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			this.saveToLocalStorage();
		}
		
		// Ctrl/Cmd + N = New
		if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
			e.preventDefault();
			this.newPresentation();
		}
		
		// Ctrl/Cmd + Enter = Play
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			e.preventDefault();
			this.playPresentation();
		}
		
		// Alt + Arrow = Navigate slides
		if (e.altKey && e.key === 'ArrowRight') {
			this.selectSlide(Math.min(this.currentSlideIndex + 1, this.slides.length - 1));
		}
		if (e.altKey && e.key === 'ArrowLeft') {
			this.selectSlide(Math.max(this.currentSlideIndex - 1, 0));
		}
	}
	
	// MARK: - Persistence
	
	startAutoSave() {
		setInterval(() => this.saveToLocalStorage(), 5000);
	}
	
	saveToLocalStorage() {
		const data = {
			slides: this.slides,
			theme: this.theme
		};
		localStorage.setItem('reveal-editor-data', JSON.stringify(data));
	}
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	window.editor = new PresentationEditor();
});