/**
 * PPTX to Reveal.js Converter
 * Uses node-pptx-parser to extract slides and convert to reveal.js format
 */

const PptxParser = require('node-pptx-parser');
const fs = require('fs');
const path = require('path');

/**
 * Parse a PPTX file and convert to reveal.js Markdown format
 * @param {string} pptxPath - Path to the PPTX file
 * @returns {Promise<string>} Markdown content for reveal.js
 */
async function convertPPTX(pptxPath) {
  const parser = new PptxParser();
  const presentation = await parser.parseFile(pptxPath);
  
  const slides = presentation.getSlides();
  const markdownParts = [];
  
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    
    // Get slide title and content
    const title = slide.title || `Slide ${i + 1}`;
    const shapes = slide.shapes || [];
    
    // Build slide content
    let slideContent = '';
    
    if (i === 0) {
      // First slide is typically the title slide
      slideContent = `# ${title}\n\n`;
      
      // Add subtitle if present
      if (shapes.length > 1) {
        const subtitle = shapes.slice(1).map(s => s.text).filter(t => t).join('\n');
        if (subtitle) {
          slideContent += `${subtitle}\n`;
        }
      }
    } else {
      // Regular slide
      slideContent = `## ${title}\n\n`;
      
      // Process shapes content
      for (const shape of shapes) {
        if (shape.text) {
          // Check if it's a bullet point
          const text = shape.text.trim();
          if (text.startsWith('•') || text.startsWith('-') || text.startsWith('*')) {
            slideContent += `${text}\n`;
          } else if (text.match(/^\d+\./)) {
            // Numbered list
            slideContent += `${text}\n`;
          } else if (text.length > 0) {
            slideContent += `- ${text}\n`;
          }
        }
      }
      
      // Check for notes
      if (slide.notes && slide.notes.length > 0) {
        slideContent += `\nNote: ${slide.notes[0]}\n`;
      }
    }
    
    markdownParts.push(slideContent);
    
    // Add slide separator (except for last slide)
    if (i < slides.length - 1) {
      markdownParts.push('\n---\n');
    }
  }
  
  return markdownParts.join('\n');
}

/**
 * Convert PPTX to complete HTML reveal.js presentation
 * @param {string} pptxPath - Path to PPTX file
 * @param {string} outputPath - Path for output HTML file
 * @param {Object} options - Options for the presentation
 * @returns {Promise<string>} Path to the generated HTML file
 */
async function convertPPTXToHTML(pptxPath, outputPath, options = {}) {
  const markdown = await convertPPTX(pptxPath);
  
  const theme = options.theme || 'black';
  const transition = options.transition || 'slide';
  
  // Generate reveal.js HTML
  const html = generateRevealHTML(markdown, {
    title: options.title || path.basename(pptxPath, '.pptx'),
    theme,
    transition
  });
  
  // Write the output file
  fs.writeFileSync(outputPath, html, 'utf-8');
  
  return outputPath;
}

/**
 * Generate a reveal.js HTML presentation from markdown
 */
function generateRevealHTML(markdown, options = {}) {
  const { title = 'Presentation', theme = 'black', transition = 'slide' } = options;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="dist/reset.css">
  <link rel="stylesheet" href="dist/reveal.css">
  <link rel="stylesheet" href="dist/theme/${theme}.css">
</head>
<body>
  <div class="reveal">
    <div class="slides" data-markdown>
      <section data-markdown>
        <script type="text/template">
${markdown}
        </script>
      </section>
    </div>
  </div>
  <script src="dist/reveal.js"></script>
  <script src="dist/plugin/markdown.js"></script>
  <script>
    Reveal.initialize({
      controls: true,
      progress: true,
      center: true,
      hash: true,
      transition: '${transition}',
      plugins: [RevealMarkdown]
    });
  </script>
</body>
</html>`;
}

module.exports = {
  convertPPTX,
  convertPPTXToHTML,
  generateRevealHTML
};

// If run directly
if (require.main === module) {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3] || inputFile.replace('.pptx', '.html');
  
  if (inputFile) {
    convertPPTXToHTML(inputFile, outputFile)
      .then(output => console.log(`Converted: ${output}`))
      .catch(err => console.error('Error:', err));
  } else {
    console.log('Usage: node pptx-converter.js <input.pptx> [output.html]');
  }
}