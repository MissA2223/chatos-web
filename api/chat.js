// DOM
const chatBox   = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const form      = document.getElementById('chat-form');
const sendBtn   = document.getElementById('send-btn');

function addBubble(text, who = 'bot') {
  const d = document.createElement('div');
  d.className = `bubble ${who === 'user' ? 'me' : 'bot'}`;
  d.textContent = text;
  chatBox.appendChild(d);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addSources(sources = []) {
  if (!sources.length) return;
  const d = document.createElement('div');
  d.className = 'sources';
  d.innerHTML = 'Sources: ' + sources.map((s, i) =>
    `<a href="${s.url}" target="_blank">[${i+1}] ${s.title || s.url}</a>`
  ).join('  ');
  chatBox.appendChild(d);
  chatBox.scrollTop = chatBox.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  addBubble(message, 'user');
  userInput.value = '';
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    if (res.ok) {
      addBubble(data.reply || 'No response.', 'bot');
      if (data.sources) addSources(data.sources);
    } else {
      addBubble(data.error || 'Error.', 'bot');
    }
  } catch (err) {
    addBubble('Network error: ' + err.message, 'bot');
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
});

// Greeting
addBubble("Hi! I'm online. Ask me anything.", 'bot');
