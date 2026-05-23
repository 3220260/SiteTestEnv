(function () {
  const CHATBOT_URL = 'https://chat-bot-flame-six.vercel.app/';

  function createChatbotRoot() {
    const root = document.createElement('div');
    root.id = 'syn-chat-root';
    root.className = 'syn-chat-root';

    root.innerHTML = `
      <button type="button" id="syn-chat-toggle" class="syn-chat-toggle" aria-expanded="false" aria-controls="syn-chat-panel">
        <span class="syn-chat-toggle-icon" aria-hidden="true">
          <i class="fa-solid fa-message"></i>
        </span>
        <span class="syn-chat-toggle-text">Sofia</span>
      </button>

      <section id="syn-chat-panel" class="syn-chat-panel" hidden aria-label="Sofia Chatbot">
        <iframe
          id="syn-chat-iframe"
          class="syn-chat-embed"
          src="${CHATBOT_URL}"
          loading="lazy"
          allow="clipboard-write"
          referrerpolicy="strict-origin-when-cross-origin"
          title="Sofia Chatbot"
        ></iframe>
      </section>
    `;

    document.body.appendChild(root);
    return root;
  }

  function init() {
    if (document.getElementById('syn-chat-root')) return;

    const root = createChatbotRoot();
    const panel = root.querySelector('#syn-chat-panel');
    const toggle = root.querySelector('#syn-chat-toggle');
    const iframe = root.querySelector('#syn-chat-iframe');

    function notifyChat(type) {
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage(type, '*');
    }

    function openPanel() {
      panel.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      root.classList.add('is-open');
      document.body.classList.add('syn-chat-open');
      notifyChat('restoreChat');
    }

    function closePanel() {
      panel.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
      root.classList.remove('is-open');
      document.body.classList.remove('syn-chat-open');
    }

    toggle.addEventListener('click', function () {
      if (panel.hasAttribute('hidden')) {
        openPanel();
      } else {
        closePanel();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hasAttribute('hidden')) {
        closePanel();
      }
    });

    window.addEventListener('message', function (event) {
      if (!iframe || event.source !== iframe.contentWindow) return;

      const type = event.data;
      if (type === 'closeChat' || type === 'minimizeChat') {
        closePanel();
      }

      if (type === 'restoreChat') {
        openPanel();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
