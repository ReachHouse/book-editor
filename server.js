require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, InsertedTextRun, DeletedTextRun } = require('docx');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Trust proxy for accurate IP detection behind Nginx
app.set('trust proxy', 1);

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

function validateEnvironment() {
  const issues = [];
  
  if (!process.env.ANTHROPIC_API_KEY) {
    issues.push('ANTHROPIC_API_KEY is not set');
  } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    issues.push('ANTHROPIC_API_KEY appears to be invalid (should start with sk-ant-)');
  }
  
  return issues;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  const envIssues = validateEnvironment();
  res.json({ 
    status: envIssues.length === 0 ? 'ok' : 'warning',
    message: 'Book Editor Backend is running',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    issues: envIssues.length > 0 ? envIssues : undefined
  });
});

// ============================================================================
// API STATUS - Check configuration without exposing secrets
// ============================================================================

app.get('/api/status', (req, res) => {
  const envIssues = validateEnvironment();
  res.json({
    status: envIssues.length === 0 ? 'ready' : 'configuration_needed',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY
  });
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
      return res.status(500).json({ 
        error: 'API key not configured. Please set ANTHROPIC_API_KEY environment variable.' 
      });
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
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({ styleGuide: 'Professional, clear, and engaging style following Reach Publishers standards.' });
    }
    
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
    
    console.log('Generating document with Native Track Changes...');
    console.log('Original length:', originalText.length);
    console.log('Edited length:', editedText.length);
    
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
// NATIVE TRACK CHANGES DOCUMENT CREATION
// ============================================================================

function createDocumentWithTrackChanges(original, edited) {
  const originalParas = original.split(/\n+/).filter(p => p.trim());
  const editedParas = edited.split(/\n+/).filter(p => p.trim());
  
  const paragraphs = [];
  const maxParas = Math.max(originalParas.length, editedParas.length);
  
  // Track revision ID for unique IDs
  let revisionId = 0;
  const timestamp = new Date().toISOString();
  
  for (let i = 0; i < maxParas; i++) {
    const origPara = originalParas[i] || '';
    const editPara = editedParas[i] || '';
    
    if (origPara === editPara) {
      // No changes - just add the text
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: origPara })]
      }));
    } else if (!origPara && editPara) {
      // Entire paragraph is new (insertion)
      paragraphs.push(new Paragraph({
        children: [
          new InsertedTextRun({
            text: editPara,
            id: revisionId++,
            author: "AI Editor",
            date: timestamp,
          })
        ]
      }));
    } else if (origPara && !editPara) {
      // Entire paragraph deleted
      paragraphs.push(new Paragraph({
        children: [
          new DeletedTextRun({
            text: origPara,
            id: revisionId++,
            author: "AI Editor",
            date: timestamp,
          })
        ]
      }));
    } else {
      // Paragraph has changes - do word-level diff
      const trackedPara = createTrackedParagraph(origPara, editPara, revisionId, timestamp);
      revisionId = trackedPara.nextId;
      paragraphs.push(trackedPara.paragraph);
    }
  }
  
  return new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
}

function createTrackedParagraph(original, edited, startId, timestamp) {
  const changes = computeWordDiff(original, edited);
  const textRuns = [];
  let currentId = startId;
  
  for (const change of changes) {
    if (change.type === 'equal') {
      textRuns.push(new TextRun({ text: change.text }));
    } else if (change.type === 'delete') {
      textRuns.push(
        new DeletedTextRun({
          text: change.text,
          id: currentId++,
          author: "AI Editor",
          date: timestamp,
        })
      );
    } else if (change.type === 'insert') {
      textRuns.push(
        new InsertedTextRun({
          text: change.text,
          id: currentId++,
          author: "AI Editor",
          date: timestamp,
        })
      );
    }
  }
  
  return {
    paragraph: new Paragraph({ children: textRuns }),
    nextId: currentId
  };
}

// ============================================================================
// IMPROVED WORD DIFF ALGORITHM
// Shows deletions immediately followed by insertions for clearer replacements
// ============================================================================

function computeWordDiff(original, edited) {
  // Split into tokens (words and whitespace)
  const originalTokens = tokenize(original);
  const editedTokens = tokenize(edited);
  
  // Use Longest Common Subsequence approach for better diff
  const lcs = computeLCS(originalTokens, editedTokens);
  
  const changes = [];
  let origIndex = 0;
  let editIndex = 0;
  let lcsIndex = 0;
  
  while (origIndex < originalTokens.length || editIndex < editedTokens.length) {
    if (lcsIndex < lcs.length) {
      const lcsItem = lcs[lcsIndex];
      
      // Collect deletions and insertions before this LCS point
      const deletions = [];
      const insertions = [];
      
      while (origIndex < lcsItem.origIndex) {
        deletions.push(originalTokens[origIndex]);
        origIndex++;
      }
      
      while (editIndex < lcsItem.editIndex) {
        insertions.push(editedTokens[editIndex]);
        editIndex++;
      }
      
      // Add deletions first, then insertions (shows as replacement in Word)
      if (deletions.length > 0) {
        changes.push({ type: 'delete', text: deletions.join('') });
      }
      if (insertions.length > 0) {
        changes.push({ type: 'insert', text: insertions.join('') });
      }
      
      // Add the matching token
      changes.push({ type: 'equal', text: originalTokens[origIndex] });
      origIndex++;
      editIndex++;
      lcsIndex++;
    } else {
      // No more LCS items - remaining are deletions/insertions
      const deletions = [];
      const insertions = [];
      
      while (origIndex < originalTokens.length) {
        deletions.push(originalTokens[origIndex]);
        origIndex++;
      }
      while (editIndex < editedTokens.length) {
        insertions.push(editedTokens[editIndex]);
        editIndex++;
      }
      
      if (deletions.length > 0) {
        changes.push({ type: 'delete', text: deletions.join('') });
      }
      if (insertions.length > 0) {
        changes.push({ type: 'insert', text: insertions.join('') });
      }
    }
  }
  
  // Merge consecutive changes of the same type
  return mergeConsecutiveChanges(changes);
}

function tokenize(text) {
  // Split by word boundaries, keeping whitespace as separate tokens
  return text.split(/(\s+)/).filter(t => t.length > 0);
}

function computeLCS(arr1, arr2) {
  const m = arr1.length;
  const n = arr2.length;
  
  // For very large arrays, use a more memory-efficient approach
  if (m * n > 10000000) {
    return computeLCSOptimized(arr1, arr2);
  }
  
  // Create DP table
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find LCS with indices
  const lcs = [];
  let i = m, j = n;
  
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift({ origIndex: i - 1, editIndex: j - 1, value: arr1[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

// Memory-optimized LCS for very large documents
function computeLCSOptimized(arr1, arr2) {
  const m = arr1.length;
  const n = arr2.length;
  
  // Use only two rows instead of full matrix
  let prev = Array(n + 1).fill(0);
  let curr = Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  
  // Simplified backtrack - find matching elements
  const lcs = [];
  let i = 0, j = 0;
  
  while (i < m && j < n) {
    if (arr1[i] === arr2[j]) {
      lcs.push({ origIndex: i, editIndex: j, value: arr1[i] });
      i++;
      j++;
    } else {
      // Greedy approach - try to find next match
      let foundInOrig = arr1.indexOf(arr2[j], i);
      let foundInEdit = arr2.indexOf(arr1[i], j);
      
      if (foundInOrig === -1) foundInOrig = m;
      if (foundInEdit === -1) foundInEdit = n;
      
      if (foundInOrig - i <= foundInEdit - j) {
        i++;
      } else {
        j++;
      }
    }
  }
  
  return lcs;
}

function mergeConsecutiveChanges(changes) {
  if (changes.length === 0) return changes;
  
  const merged = [];
  let current = { ...changes[0] };
  
  for (let i = 1; i < changes.length; i++) {
    if (changes[i].type === current.type) {
      current.text += changes[i].text;
    } else {
      merged.push(current);
      current = { ...changes[i] };
    }
  }
  merged.push(current);
  
  return merged;
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

const envIssues = validateEnvironment();

app.listen(PORT, '0.0.0.0', () => {
  console.log('==================================================');
  console.log('Book Editor Server is running');
  console.log(`Port: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log('API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'Yes' : 'NO - CHECK .env FILE');
  console.log('Track Changes: NATIVE WORD FORMAT');
  if (envIssues.length > 0) {
    console.log('WARNINGS:', envIssues.join(', '));
  }
  console.log('==================================================');
});
