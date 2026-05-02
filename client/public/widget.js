(function() {
    // Prevent multiple initializations
    if (window.NexAICallWidgetInitialized) return;
    window.NexAICallWidgetInitialized = true;

    // Get configuration from script tag
    const scriptTag = document.currentScript;
    if (!scriptTag) {
        console.error("NexAI Widget: Could not find script tag.");
        return;
    }

    const companyId = scriptTag.getAttribute('data-company-id');
    if (!companyId) {
        console.error("NexAI Widget: data-company-id attribute is missing.");
        return;
    }

    // Base URL is where the script is loaded from
    const scriptUrl = new URL(scriptTag.src);
    const baseUrl = scriptUrl.origin;

    // Inject styles
    const style = document.createElement('style');
    style.innerHTML = `
        .nexai-widget-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 64px;
            height: 64px;
            background: linear-gradient(to bottom right, #7c3aed, #4f46e5);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 2px solid rgba(255,255,255,0.1);
        }
        .nexai-widget-btn:hover {
            transform: scale(1.1);
        }
        .nexai-widget-btn svg {
            width: 32px;
            height: 32px;
            fill: white;
        }
        .nexai-widget-iframe-container {
            position: fixed;
            bottom: 100px;
            right: 24px;
            width: 380px;
            height: 650px;
            max-height: calc(100vh - 120px);
            background: #000;
            border-radius: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 999999;
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px) scale(0.95);
            transform-origin: bottom right;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .nexai-widget-iframe-container.open {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0) scale(1);
        }
        .nexai-widget-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        @media (max-width: 480px) {
            .nexai-widget-iframe-container {
                width: 100%;
                height: 100%;
                bottom: 0;
                right: 0;
                max-height: 100vh;
                border-radius: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Create iframe container
    const container = document.createElement('div');
    container.className = 'nexai-widget-iframe-container';
    
    const iframe = document.createElement('iframe');
    iframe.className = 'nexai-widget-iframe';
    iframe.allow = "microphone"; // VERY IMPORTANT FOR WEBRTC
    iframe.src = `${baseUrl}/?companyId=${companyId}&widget=true`;
    container.appendChild(iframe);
    
    document.body.appendChild(container);

    // Create floating button
    const btn = document.createElement('div');
    btn.className = 'nexai-widget-btn';
    const phoneIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.03 21c.53 0 .96-.36.96-.9v-3.73c0-.53-.45-.99-.98-.99z"/></svg>';
    const closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>';
    
    btn.innerHTML = phoneIcon;
    document.body.appendChild(btn);

    // Toggle logic
    let isOpen = false;
    btn.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            container.classList.add('open');
            btn.innerHTML = closeIcon;
        } else {
            container.classList.remove('open');
            btn.innerHTML = phoneIcon;
        }
    });

})();
