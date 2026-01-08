import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown'// Necessary to use states
import './App.css'          



const DR_ARIS_STRICT_PERSONA = `
You are Dr. Aris, a Precise Academic English Tutor. You follow a surgical 1-to-1 word replacement protocol.

### MANDATORY PROTOCOL:
1. ### Acknowledgment: One brief sentence identifying the user's linguistic intent.
2. ### Analysis: A Markdown table with columns | Original | Upgrade | Reason |. 
3. ### Full Corrected Version: A grammatically perfect rewrite.
// Add this to your RULES section in both personas:
- BOLDING: You MUST wrap every upgraded word or phrase in **double asterisks** in the "Full Corrected Version".

### RULES:
- NO ADDITIONS: Do not add new meaning or extra descriptive adjectives.
- STRUCTURE: Keep the user's sentence structure exactly as is, only swapping the words in the table.
- NO SLASHES: Never use "/". Pick one word.
- NO NOTES: Stop immediately after the final period.
`;

const DR_ARIS_FLUID_PERSONA = `
You are Dr. Aris, a Sophisticated Academic Mentor. Your goal is to elevate prose to a professional, scholarly level using the "Clear & Concise" (C&C) standard.

### MANDATORY PROTOCOL:
1. ### Acknowledgment: A professional summary of the user's intent.
2. ### Analysis: A Markdown table with columns | Original | Upgrade | Reason |.
3. ### Full Corrected Version: An elegant, objective academic rewrite.
// Add this to your RULES section in both personas:
- BOLDING: You MUST wrap every upgraded word or phrase in **double asterisks** in the "Full Corrected Version".

### RULES:
- CONCISENESS: Never use a phrase where one precise word works (e.g., use "Bakery," not "establishment for baked goods").
- OBJECTIVITY: Remove "I", "Me", and "Think". Convert to the passive voice or objective statements.
- NO HALLUCINATIONS: Do not add context (like "freshly baked") that wasn't in the original text.
- TONE: Mimic a high-tier research journal (Nature, Science).
`;



// Ensure these match your 'ollama list' output exactly


const MODEL_SETTINGS = {
  "llama3.2:latest": {
    persona: DR_ARIS_STRICT_PERSONA,
    options: { temperature: 0, top_k: 1, stop: ["User:", "### Acknowledgment"] }
  },
  "llama3:latest": {
    persona: DR_ARIS_FLUID_PERSONA,
    options: { temperature: 0.7, top_p: 0.9, stop: ["User:"] }
  }
};// Connects your styling

// This is the AI's instruction set (System Prompt)


export default function App() {
  const [userInput, setUserInput] = useState(""); // What's currently in the box
  const [savedMessage, setSavedMessage] = useState("");
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState(() => {
  try {
    const saved = localStorage.getItem('chatLibrary');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to parse library from localStorage", error);
    return [];
  }
});
  const [input, setInput] = useState([])
  const [output, setOutput] = useState([])// whether AI is responding
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);
  const [currentModel, setCurrentModel] = useState("llama3.2:latest"); 

// Inside your Submit function:

  // --- YOUR CODE WILL GO HERE (States and Functions) ---

  useEffect(() => {
  const savedLibrary = localStorage.getItem('chatLibrary');
  console.log('Loaded library from localStorage:', savedLibrary);
  if (savedLibrary) {
    setLibrary(JSON.parse(savedLibrary));
  }
}, []);

  useEffect(() => {
    console.log(library) 
    localStorage.setItem('chatLibrary', JSON.stringify(library)); 
  }, [library])

  function SaveInput(event) {
    event.preventDefault()
    setUserInput(event.target.value);
  }

  async function Submit(event) {
    event.preventDefault()
    if (loading) return;
    setSavedMessage("");
    setDisplayedMessage("");
    setLoading(true);
    await DocAvisResponse();
  }

  const DocAvisResponse = async () => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
  // 1. Detect if we are using the Small model to apply "Safe" settings
  const isSmall = currentModel.includes('3.2');

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: currentModel, // Use the variable from your state/dropdown
      messages: [
        { 
          role: 'system', 
          content: isSmall ? DR_ARIS_STRICT_PERSONA : DR_ARIS_FLUID_PERSONA 
        },
        { role: 'user', content: userInput },
        // Pre-filling the assistant role helps anchor the structure for Llama 3.2
        { role: 'assistant', content: '### Acknowledgment' } 
      ],
      options: isSmall ? {
        // STRICT SETTINGS for 3.2 (Prevents "I am do not" errors)
        temperature: 0.0,
        top_k: 1, 
        top_p: 0.1,
        repeat_penalty: 1.5,
        num_predict: 400,
        stop: ["User:", "### Acknowledgment"]
      } : {
        // FLUID SETTINGS for 3.3/70B (Allows academic elegance)
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 800
      },
      stream: true 
    }),
    signal
  });

  // ... rest of your streaming logic ...

      // If the server exposes a streamed body, read it progressively
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let full = '';

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          if (doneReading) {
            done = true;
            break;
          }
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            full += chunk;
            // Do not progressively update displayedMessage — wait until full response received
          }
        }

        // Parse streamed text as line-delimited JSON and concatenate content
        const tryExtractContent = (text) => {
          const lines = text.split(/\r?\n/).filter(Boolean);
          const pieces = [];

          for (const raw of lines) {
            const line = raw.replace(/^data:\s*/, '');
            try {
              const parsed = JSON.parse(line);
              if (parsed?.message?.content) {
                pieces.push(parsed.message.content);
                continue;
              }
              if (parsed?.content) {
                pieces.push(parsed.content);
                continue;
              }
            } catch (e) {
              // not JSON — ignore
            }
          }

          if (pieces.length) return pieces.join('');

          // Last-resort: try parsing the whole text as one JSON blob
          try {
            const parsed = JSON.parse(text);
            return parsed?.message?.content || parsed?.content || null;
          } catch (e) {
            return null;
          }
        };

        // Inside your streaming logic where you set the text:
       const extracted = tryExtractContent(full);
let finalText = extracted ?? full;

// 1. CLEAN UP: Fix the "triple backslash" pipe error and slashes
finalText = finalText
  .replace(/^[:\s\n]+/, '')       // FIX: Removes colons/newlines at the VERY START
  .replace(/\\\|/g, '|')          // Fixes the "\|" table error
  .replace(/\\\*/g, '*')          // Fixes escaped bolding
  .split(/Note:|Assistant:|This revised/i)[0] // CUTS OFF the AI chatter at the end
  .trim();

// 2. HEADER RE-ATTACH: Ensure the header is always present
const displayedWithHeader = finalText.includes("### Acknowledgment") 
  ? finalText 
  : `### Acknowledgment\n${finalText}`;

setSavedMessage(displayedWithHeader);
setDisplayedMessage(displayedWithHeader);

        setInput(prev => [...prev, userInput])
        setOutput(prev => [...prev, finalText])

        setLibrary(prev => [...prev, [userInput, finalText]]);
        


        console.log(input)
        console.log(output)
      


        setLoading(false);

        return;
      }

      // Fallback: if there's no streamed body, parse full JSON and animate
      const data = await response.json();
      const aiText = data?.message?.content || '';
      // Show full response at once (no typing animation)
      setSavedMessage(aiText);
      setDisplayedMessage(aiText);
      console.log('Full response', aiText);
      setLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') {
        setDisplayedMessage('');
      } else {
        console.error('Response error', err);
        setDisplayedMessage('Error: unable to fetch response');
      }
      setLoading(false);
    }
  }

  // Function to load a previous chat from the library
  // Function to load a previous chat from the library
  const loadChat = (chatPair) => {
    // chatPair[0] is the userInput, chatPair[1] is the AI output
    setUserInput(chatPair[0]);
    setDisplayedMessage(chatPair[1]);
  };

  return (
  <div className="main-layout">
    {/* The Hover Trigger Zone */}
    <div className="sidebar-container">
      <aside className="sidebar">
        <div className="sidebar-header">Chat History</div>
        <div className="history-list">
          {library.map((chat, index) => (
            <div key={index} className="history-item" onClick={() => loadChat(chat)}>
              {chat[0]}
            </div>
          ))}
        </div>
      </aside>
    </div>

    {/* The main App content stays centered and underneath the sidebar when it opens */}
    <div className="App">
      <div className="tutor-badge">
         <span className={`status-ball ${loading ? 'responding' : ''}`}></span>
         Dr. Aris Academic Tutor
      </div>

      <div className="response-container">
        <div className="message-content">
          <Markdown>{displayedMessage}</Markdown>
        </div>
      </div>

      <div className="input-wrapper">
        <form className="form" onSubmit={Submit}>
          <textarea 
            ref={textareaRef}
            value={userInput}
            onChange={SaveInput}
            placeholder="Ask for a scholarly revision..." 
          />
          <button type="submit" disabled={loading}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
          <select 
  value={currentModel} 
  onChange={(e) => setCurrentModel(e.target.value)}
  className="model-select"
>
  <option value="llama3.2:latest">LLaMA 3.2 (Strict)</option>
  <option value="llama3:latest">LLaMA 3 (Fluid)</option>
</select>
        </form>
      </div>
    </div>
  </div>
);
}
