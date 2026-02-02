require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Book Editor Backend is running' });
});

// ============================================================================
// AI EDITING ENDPOINT
// ============================================================================

const STYLE_GUIDE = `REACH PUBLISHERS HOUSE STYLE GUIDE

All edits follow UK English (Oxford Style Manual by R.M. Ritter)

KEY RULES:
• UK spelling: -ise not -ize (realise, organise), honour not honor, travelled not traveled
• Metric system: metres, centimetres, kilometres
• Special care with apostrophes - never for plurals (CDs not CD's, 1960s not 1960's)
• your vs you're, its vs it's
• Race terms: Black, White, Coloured (capitalized in South African context)
• who for people, that/which for things
• Numbers 1-9 spelled out, 10+ numerical (unless starting sentence)
• Italics for: foreign words, slang, emphasis, book/magazine/newspaper titles, internal thoughts
• Proper nouns capitalized: "Can Dad come?" vs "my dad is here"
• Hyphens: "two years old" vs "two-year-old boy"
• Times: 4am, four o'clock (not 16h00)
• Book/movie titles in italics: The Great Gatsby
• Direct dialogue: double quotes, new speaker = new line
• Comma before dialogue tag: "No," she said.
• Watch for repetition, consistency, concord errors
• Replace difficult/uncommon words with simpler alternatives
• No deletions without author consent
• Highlight all changes so author can review

CRITICAL: All changes must be highlighted/tracked.`;

app.post('/api/edit-chunk', async (req, res) => {
  try {
    const { text, styleGuide, isFirst } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    const systemPrompt = `You are a professional book editor for Reach Publishers. You MUST follow the Reach Publishers House Style Guide strictly and without exception.

${STYLE_GUIDE}

${isFirst 
  ? 'Edit this text following ALL the rules above. Fix grammar, spelling, punctuation, consistency, clarity, and style. Maintain the author\'s voice while improving readability.' 
  : `Edit this text following ALL the rules above AND maintain consistency with this established style from earlier sections: ${styleGuide}`
}

Return ONLY the edited text with no preamble, no explanations, no comments - just the corrected text ready for publication.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    
    if (!data.content || !data.content[0]) {
      throw new Error('Invalid API response');
    }
    
    res.json({ editedText: data.content[0].text });
    
  } catch (error) {
    console.error('Edit chunk error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// STYLE GUIDE GENERATION ENDPOINT
// ============================================================================

app.post('/api/generate-style-guide', async (req, res) => {
  try {
    const { text } = req.body;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Based on this edited text, create a brief style guide (3-4 sentences) noting: tone, formality level, punctuation preferences, and any special terminology. Text: ${text.substring(0, 1000)}`
        }]
      })
    });
    
    if (!response.ok) {
      return res.json({ styleGuide: 'Professional, clear, and engaging style following Reach Publishers standards.' });
    }
    
    const data = await response.json();
    res.json({ styleGuide: data.content[0].text });
    
  } catch (error) {
    res.json({ styleGuide: 'Professional, clear, and engaging style following Reach Publishers standards.' });
  }
});

// ============================================================================
// DOCUMENT GENERATION ENDPOINT
// ============================================================================

app.post('/api/generate-docx', async (req, res) => {
  try {
    const { originalText, editedText, fileName } = req.body;
    
    if (!originalText || !editedText) {
      return res.status(400).json({ error: 'Missing originalText or editedText' });
    }
    
    console.log('Generating document with Track Changes...');
    
    const doc = createDocumentWithTrackChanges(originalText, editedText);
    const buffer = await Packer.toBuffer(doc);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName || 'edited_document.docx'}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TRACK CHANGES DOCUMENT CREATION
// ============================================================================

function createDocumentWithTrackChanges(original, edited) {
  const originalParas = original.split(/\n+/).filter(p => p.trim());
  const editedParas = edited.split(/\n+/).filter(p => p.trim());
  
  const paragraphs = [];
  const maxParas = Math.max(originalParas.length, editedParas.length);
  
  for (let i = 0; i < maxParas; i++) {
    const origPara = originalParas[i] || '';
    const editPara = editedParas[i] || '';
    
    if (origPara === editPara) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: origPara })]
      }));
    } else {
      paragraphs.push(createTrackedParagraph(origPara, editPara));
    }
  }
  
  return new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
}

function createTrackedParagraph(original, edited) {
  const changes = simpleWordDiff(original, edited);
  const textRuns = [];
  
  for (const change of changes) {
    if (change.type === 'equal') {
      textRuns.push(new TextRun({ text: change.text }));
    } else if (change.type === 'delete') {
      textRuns.push(
        new TextRun({
          text: change.text,
          strike: true,
          color: 'FF0000'
        })
      );
    } else if (change.type === 'insert') {
      textRuns.push(
        new TextRun({
          text: change.text,
          underline: {},
          color: '0000FF'
        })
      );
    }
  }
  
  return new Paragraph({ children: textRuns });
}

function simpleWordDiff(original, edited) {
  const originalWords = original.split(/(\s+)/).filter(w => w);
  const editedWords = edited.split(/(\s+)/).filter(w => w);
  
  const changes = [];
  let i = 0, j = 0;
  
  while (i < originalWords.length || j < editedWords.length) {
    if (i >= originalWords.length) {
      changes.push({ type: 'insert', text: editedWords[j] });
      j++;
    } else if (j >= editedWords.length) {
      changes.push({ type: 'delete', text: originalWords[i] });
      i++;
    } else if (originalWords[i] === editedWords[j]) {
      changes.push({ type: 'equal', text: originalWords[i] });
      i++;
      j++;
    } else {
      const origInEdited = editedWords.indexOf(originalWords[i], j);
      const editInOrig = originalWords.indexOf(editedWords[j], i);
      
      if (origInEdited > -1 && origInEdited - j < 5) {
        changes.push({ type: 'insert', text: editedWords[j] });
        j++;
      } else if (editInOrig > -1 && editInOrig - i < 5) {
        changes.push({ type: 'delete', text: originalWords[i] });
        i++;
      } else {
        changes.push({ type: 'delete', text: originalWords[i] });
        changes.push({ type: 'insert', text: editedWords[j] });
        i++;
        j++;
      }
    }
  }
  
  return changes;
}

// ============================================================================
// CATCH-ALL: Serve React app for any other routes
// ============================================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('==================================================');
  console.log('Book Editor Server is running');
  console.log(`Port: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log('API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'Yes' : 'NO - CHECK .env FILE');
  console.log('==================================================');
});
