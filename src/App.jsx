import React, { useState, useRef, useEffect } from 'react'
import Markdown from 'react-markdown'// Necessary to use states
import './App.css'          


const DR_ARIS_STRICT_PERSONA = `
[ROLE]: Academic English Editor
[TASK]: CEFR Detection & 1-to-1 Word Replacement

[FORMAT]:
### Proficiency Level [CEFR_LEVEL]
### Full Corrected Version: [Corrected Text]

[RULES]:
- NO explanations. NO alternatives. NO chatter.
- Highlight every changed word with **double asterisks**.
`;

const DR_ARIS_FLUID_PERSONA = `
You are Dr. Aris, a Sophisticated Academic Mentor and CEFR Examiner. Your goal is to accurately assess and refine English prose to an Oxford-tier standard.

### MANDATORY PROTOCOL:
1. ### Proficiency Level
Analyze the input for complex structures (Inversion, Conditionals, Passive Voice). 
Categorize strictly by CEFR levels. 
IMPORTANT: You must provide the level in square brackets, e.g., [B1] or [C2]. 
If the level is borderline, use a range like [A1-B1].

- [C1/C2]: Complex grammar (Inversion), nuanced vocabulary.
- [B2]: Detailed text, clear professional flow.
- [A1-B1]: Foundational or intermediate daily English.

2. ### Acknowledgment
A sophisticated observation on the user's statement.

3. ### Analysis
A Markdown table: | Original | Upgrade | Reason |.

4. ### Full Corrected Version
The elegant, refined version of the user's sentence.

### RULES:
- ACCURACY: You must not default to B2. If the user uses advanced inversion or academic jargon, you MUST label it C1 or C2.
- NO FABRICATION: Do not add new facts.
- BOLDING: Wrap every changed word in **double asterisks**.
- HEADINGS: Every section MUST start with "### ".
`;

// Ensure these match your 'ollama list' output exactly


const MODEL_SETTINGS = {
  "llama3.2:latest": {
  persona: DR_ARIS_STRICT_PERSONA,
  options: { 
    temperature: 0,
    top_k: 1, 
    top_p: 0.1,
    repeat_penalty: 1.0, // FIX: Allows the AI to use your words
    num_predict: 80,     // FIX: Physical limit on how much it can talk
    stop: ["\n\n", "Input:", "Note:", "Alternative"] 
  }
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
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [userInputname, setUserInputname] = useState(() => {
    return localStorage.getItem('username') || '';
  });
  const [userInputpassword, setUserInputpassword] = useState(() => {
    return localStorage.getItem('password') || '';
  });
  // CHANGE THIS: At the top of your App function
const [levels, setLevels] = useState(() => {
  const saved = localStorage.getItem('levelsHistory');
  return saved ? JSON.parse(saved) : []; // Recalls the array or starts fresh
});
  const [mostfrequentLevel, setfrequentLevel] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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

    const username = localStorage.getItem('username');
    const password = localStorage.getItem('password');
    console.log("Retrieved username:", username);
    console.log("Retrieved password:", password);
    if (username && password) {
      setIsLoginOpen(false);
    } else {
      setIsLoginOpen(true);
    }
    // 1. Load the Chat Library (You already have this)
    const savedLibrary = localStorage.getItem('chatLibrary');
    if (savedLibrary) setLibrary(JSON.parse(savedLibrary));

    // 2. RE-CALCULATE WINNER FROM HISTORY (Add this part)
    const savedHistory = localStorage.getItem('levelsHistory');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      
      // Frequency Logic
      const counts = {};
      parsedHistory.forEach(lvl => counts[lvl] = (counts[lvl] || 0) + 1);

      let winner = null;
      let max = 0;
      for (const lvl in counts) {
        if (counts[lvl] > max) {
          max = counts[lvl];
          winner = lvl;
        }
      }
      // Set the initial frequent level on start
      setfrequentLevel(winner);
    }
  }, []); // Run only once on mount

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
    const isSmall = currentModel.includes('3.2');

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: currentModel,
       messages: isSmall 
  ? [
      { role: 'system', content: DR_ARIS_STRICT_PERSONA },
      { role: 'user', content: `Input: "${userInput}"` },
      { role: 'assistant', content: '### Proficiency Level' } // Use H3 syntax here
    ] // ... rest of your existing logic
  : [
      { role: 'system', content: DR_ARIS_FLUID_PERSONA },
      { role: 'user', content: userInput },
      { role: 'assistant', content: '### Proficiency Level' } 
    ],
        options: isSmall ? {
          // The "Muzzle" settings for the 3B model
          temperature: 0.0,
          top_k: 1, 
          top_p: 0.1,
          repeat_penalty: 1.0, 
          num_predict: 100,
          stop: ["Input:", "Note:", "Alternative", "\n\n"]
        } : {
          // The "Genius" settings for Llama 3 (remains untouched)
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 800,
          stop: ["User:"]
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

// 1. CLEAN UP
finalText = finalText
  .replace(/\\\|/g, '|')          
  .replace(/\\\*/g, '*')          
  .split(/Note:|Assistant:|This revised/i)[0] 
  .trim();

// 2. HEADER REPAIR: Specifically force "Full Corrected Version" to be a Green Heading
let formattedOutput = finalText;

// Ensure the first header is present
if (!formattedOutput.includes("### Proficiency Level")) {
  formattedOutput = `### Proficiency Level\n${formattedOutput.replace(/^[:\s\n]+/, '')}`;
}

// FORCE THE SECOND HEADER (This makes it green)
// It finds the phrase "Full Corrected Version" and replaces it with a proper Heading line
formattedOutput = formattedOutput.replace(
  /(Full Corrected Version:?)/i,
  "\n\n### Full Corrected Version\n"
);

// 3. YOUR EXISTING HISTORY LOGIC (Unchanged)
// This looks for ANY of your levels inside the brackets, even if there's a dash like [A1-B1]
// 3. IMPROVED HISTORY LOGIC
const levelsarr = ["A1", "A2", "B1", "B2", "C1", "C2"];

// This finds the level even if the AI forgot the brackets []
const hasLevel = levelsarr.find(level => {
  // We look for the level (like A1) as a standalone word in the text
  // The \b ensures we don't accidentally match "A1" inside a longer word
  const regex = new RegExp(`\\b${level}\\b`);
  return regex.test(finalText);
});

if (hasLevel) {
  const updatedLevels = [...levels, hasLevel]; 
  localStorage.setItem('levelsHistory', JSON.stringify(updatedLevels));
  setLevels(updatedLevels);

  const counts = {};
  updatedLevels.forEach(lvl => {
    counts[lvl] = (counts[lvl] || 0) + 1;
  });

  let winner = null;
  let max = 0;
  for (const lvl in counts) {
    if (counts[lvl] > max) {
      max = counts[lvl];
      winner = lvl;
    }
  }
  setfrequentLevel(winner);
}

// 4. UI UPDATE
setSavedMessage(formattedOutput);
setDisplayedMessage(formattedOutput);

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

  const Profiletab = () => {
    setIsProfileOpen(!isProfileOpen);
    console.log(isProfileOpen)


  }

  const Login = (event) => {
    event.preventDefault()
    setUserInputname(event.target.value);
    console.log(userInputname)
  }

  const Login2 = (event) => {
    event.preventDefault()
    setUserInputpassword(event.target.value);
    console.log(userInputpassword)
  }
 
  const saveData = () => {
    localStorage.setItem('username', userInputname);
    console.log("Saved username:", userInputname);
    localStorage.setItem('password', userInputname);
    console.log("Saved password:", userInputpassword);
    setIsLoginOpen(false);

  }

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
    
     <div className="sidebar-toggle" onClick={Profiletab} >☰
        </div>
      <div className={`sidebar-profile ${isProfileOpen ? 'visible' : 'hidden'}`}>
          <div className="profileimage">
  <svg 
    viewBox="0 0 32 32" 
    xmlSpace="preserve"
    style={{ display: 'block' }} // Style is now an object
  >
    <path d="M16 31C7.729 31 1 24.271 1 16S7.729 1 16 1s15 6.729 15 15-6.729 15-15 15zm0-28C8.832 3 3 8.832 3 16s5.832 13 13 13 13-5.832 13-13S23.168 3 16 3z"/>
    <circle cx="16" cy="15.133" r="4.267"/>
    <path d="M16 30c2.401 0 4.66-.606 6.635-1.671-.425-3.229-3.18-5.82-6.635-5.82s-6.21 2.591-6.635 5.82A13.935 13.935 0 0 0 16 30z"/>
  </svg>
</div>
          <div className="profile-name">{userInputname}</div>
          <div className="ENLevel">{mostfrequentLevel}</div>
    </div>
    <div className="loginform" style={{ display: isLoginOpen ? 'flex' : 'none' }}>
      <h2>Login</h2>
      <input type="text" placeholder="Username"  onChange={Login} />
      <input type="password" placeholder="Password" onChange={Login2}/>
      <a href="/setup.bat" download="setup.bat" style="text-decoration: none;">
        <button type="button" id="dependencies">Download depedencies</button>
      </a>
      <button onClick={saveData}>Login</button>
    </div>
    <div 
  className="App" 
  style={{ filter: isProfileOpen ? 'blur(8px)' : 'none' }}
>
   
      
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

localStorage.clear();

