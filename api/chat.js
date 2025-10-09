const API_KEY = "YOUR_OPENAI_SECRET_KEY"; // we'll set this in environment later

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

async function sendMessage(message) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }]
    })
  });

  const data = await res.json();
  const reply = data.choices[0].message.content;
  const div = document.createElement("div");
  div.textContent = `🤖 ${reply}`;
  chatBox.appendChild(div);
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = userInput.value;
  const userDiv = document.createElement("div");
  userDiv.textContent = `👩 ${message}`;
  chatBox.appendChild(userDiv);
  sendMessage(message);
  userInput.value = "";
});
