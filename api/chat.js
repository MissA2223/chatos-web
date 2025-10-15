<script>
  // --- DOM elements (IDs must match your HTML) ---
  const chatBox   = document.getElementById('chat-box');
  const userInput = document.getElementById('user-input');
  const sendBtn   = document.getElementById('sendBtn');
  const form      = document.getElementById('chat-form');

  // --- Render a message bubble ---
  function addMessage(text, who = 'bot') {
    const div = document.createElement('div');
    div.className = 'message ' + who; // optional classes if you style them
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight; // auto-scroll to bottom
  }

  // --- Send the user's message to the API ---
  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = '';
    sendBtn.disabled = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }) // <— sends { message: "..." }
      });

      const data = await res.json();
      addMessage(data.reply || data.error || 'No response.', 'bot');
    } catch (err) {
      addMessage('Error: ' + err.message, 'bot');
    } finally {
      sendBtn.disabled = false;
      userInput.focus();
    }
  }

  // --- Wire up submit + Enter key + button click ---
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
  });

  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sendMessage();
  });

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Optional: greet
  addMessage("Hi! I'm online. Ask me anything.", 'bot');
</script>
