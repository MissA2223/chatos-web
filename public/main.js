// DOM
const chatBox   = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn   = document.getElementById('send-btn');
const form      = document.getElementById('chat-form');

function addMessage(text, who = 'bot') {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

function addSources(sources) {
  if (!sources || !sources.length) return;
  const div = document.createElement('div');
  div.className = 'srcs';
  div.innerHTML = 'Sources: ' + sources.map((s,i)=>`[${i+1}] <a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>`).join(' ');
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = userInput.value.trim();
  if (!msg) return;

  addMessage(msg, 'user');
  userInput.value = '';
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || 'Server error');

    addMessage(data.reply || '(no reply)', 'bot');
    addSources(data.sources);
  } catch (err) {
    addMessage('Error: ' + err.message, 'bot');
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
});

// greet
addMessage("Hi! I'm online. Ask me anything.");
