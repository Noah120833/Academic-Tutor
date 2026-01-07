🍎 AI English Tutor
An interactive React application that provides instant feedback and suggestions for your English sentences using local AI.

Privacy First: Your sentences are never sent to a cloud server. Everything is processed locally on your machine using Ollama.

🚀 Quick Start Guide
1. Install Ollama
You need the Ollama backend to run the AI model.

Download it here: ollama.com

2. Download the AI "Tutor" Model
Open your terminal and run the following command to download the model used by this app:

Bash

ollama pull llama3
(Note: You can also use mistral or phi3 depending on your computer's speed.)

3. Start Ollama with Web Permissions
By default, browsers block websites from talking to local services. To allow the Tutor to work, you must restart Ollama with "CORS" enabled.

Windows (PowerShell):

PowerShell

$env:OLLAMA_ORIGINS="*"; ollama serve
Mac/Linux:

Bash

OLLAMA_ORIGINS="*" ollama serve
🛠️ How to Use
Open the App: [Insert your Vercel or GitHub Pages Link Here]

Enter a Sentence: Type an English sentence you want to check (e.g., "He don't like apples.")

Get Feedback: The AI will analyze your grammar, provide a corrected version, and explain the rule (e.g., "Subject-verb agreement: Use 'doesn't' for third-person singular.")

🧩 Features
Grammar Correction: Fixes syntax and spelling errors instantly.

Natural Suggestions: Suggests more natural or formal ways to say the same thing.

Local Processing: Fast response times and total data privacy.

⚠️ Troubleshooting
Connection Error: Ensure you ran the OLLAMA_ORIGINS="*" command in your terminal. If Ollama is already running in the background, close it first!

Model Not Found: Make sure you ran ollama pull llama3.

Slow Responses: AI speed depends on your computer's RAM and GPU. For faster results on older laptops, try running ollama pull phi3 and updating the settings in the app.

Developed with ❤️ using React and Ollama.
