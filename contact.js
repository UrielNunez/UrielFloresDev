(() => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('contactFormStatus');

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity() || button.disabled) return;
        if (form.elements._honey.value) return;

        button.disabled = true;
        status.dataset.state = '';
        status.textContent = 'Sending your message…';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch('https://formsubmit.co/ajax/floresnunezuriel@gmail.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form))),
                signal: controller.signal
            });
            const result = await response.json();
            if (!response.ok || (result.success !== true && result.success !== 'true')) {
                throw new Error('The message was not accepted.');
            }

            form.reset();
            status.dataset.state = 'success';
            status.textContent = 'Message submitted. Thanks for reaching out!';
        } catch {
            status.dataset.state = 'error';
            status.textContent = 'Your message could not be sent. Please try again or use the email link beside the form.';
        } finally {
            clearTimeout(timeout);
            button.disabled = false;
        }
    });
})();
