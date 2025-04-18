import { htmlspecialchars } from './utils/escape';

let ws;

window.addEventListener('DOMContentLoaded', () => {
  const csrfTokenInput = document.getElementById('_csrf');
  const tokenInput = document.getElementById('token');
  if (!csrfTokenInput || !tokenInput) {
    console.error('Invaild Access');
    return;
  }

  const csrfToken = csrfTokenInput.value;
  const token = tokenInput.value;

  let name;
  let times = 1;
  while (!name) {
    name = prompt(`名前を入れてください。(${times}回目)`);
    if (!name) {
      alert('名前を入れてね^^');
    }
    times++;
  }

  document.getElementById('name').value = name;

  fetch('/api/config')
    .then(response => response.json())
    .then(config => {
      console.log('Received config:', config);

      console.log('Attempting to connect to WebSocket...');
      ws = new WebSocket(`${config.websocketUrl}?token=${token}`);

      function connectWebSocket() {
        ws.addEventListener('open', () => {
          console.log('WebSocket connection opened.');
          ws.send(JSON.stringify({
            user: htmlspecialchars(name),
            method: 'connect',
            csrfToken
          }));
        });

        ws.addEventListener('close', (event) => {
          console.log('WebSocket closed: ', event);
        });

        ws.addEventListener('error', (error) => {
          console.error('WebSocket error: ', error);
        });

        ws.addEventListener('message', (message) => {
          const json = JSON.parse(message.data);
          handleWebSocketMessage(json);
        });
      }

      connectWebSocket();

      const input = document.getElementById('input');

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      document.getElementById('send').addEventListener('click', () => {
        sendMessage();
      });

      function sendMessage() {
        const text = input.value;
        if (text.length > 0) {
          console.log('WebSocket readyState:', ws.readyState);
          if (ws.readyState === WebSocket.OPEN) {
            const json = {
              user: htmlspecialchars(name),
              message: htmlspecialchars(text),
              csrfToken
            };
            ws.send(JSON.stringify(json));
            input.value = '';
          } else {
            console.error('WebSocket is not open.');
          }
        }
      }

      function handleWebSocketMessage(json) {
        const output = document.getElementById('output');
        const line = document.createElement('div');

        if (json.clients != null) {
          document.getElementById('n-client').innerHTML = `只今、${json.clients.length}人が接続しています。`;
          if (json.method === 'connect') {
            line.innerHTML = htmlspecialchars(json.user) + 'が接続しました。';
          } else if (json.method === 'close') {
            line.innerHTML = htmlspecialchars(json.user) + 'が切断しました。';
          } else {
            alert('不正なメソッド: ', json.method);
          }
          output.appendChild(line);
        } else if (json.message != null) {
          line.innerHTML = htmlspecialchars(json.user) + ' > ' + htmlspecialchars(json.message);
          output.appendChild(line);
        } else {
          alert('不正なデータ形式です。');
        }

        output.scrollTop = output.scrollHeight;
      }
    })
    .catch(error => {
      console.error('Failed to fetch config: ', error);
    });
});
