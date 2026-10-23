(() => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('contactFormStatus');
    const motion = document.getElementById('sendMotion');
    const lottieContainer = document.getElementById('sendLottie');
    const stage = document.getElementById('sendFlightStage');
    const flightArt = document.getElementById('sendFlightArt');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let sendAnimation;
    let lottieReady = false;
    let requestSettled = false;
    let sendSucceeded = false;
    let flightFinished = false;
    let closing = false;
    let holdTimer;
    let fallbackTimer;

    const initializeLottie = () => {
        if (!window.lottie || sendAnimation) return;
        sendAnimation = window.lottie.loadAnimation({
            container: lottieContainer,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: './Send.json'
        });
        sendAnimation.addEventListener('DOMLoaded', () => {
            lottieReady = true;
            sendAnimation.goToAndStop(0, true);
            if (!button.classList.contains('is-launching')) button.classList.add('lottie-ready');
        });
        sendAnimation.addEventListener('enterFrame', event => {
            if (!stage.hidden && !requestSettled && event.currentTime >= 60) sendAnimation.pause();
        });
        sendAnimation.addEventListener('complete', () => {
            if (stage.hidden) return;
            sendAnimation.goToAndStop(sendAnimation.totalFrames - 1, true);
            flightFinished = true;
            finishFlight();
        });
    };

    if (window.lottie) initializeLottie();
    else document.getElementById('sendLottiePlayer')?.addEventListener('load', initializeLottie, { once: true });

    const closeFlight = () => {
        if (closing || stage.hidden) return;
        closing = true;
        stage.classList.add('is-closing');
        setTimeout(() => {
            stage.hidden = true;
            stage.classList.remove('is-active', 'is-closing', 'is-complete', 'is-fallback');
            if (lottieReady) {
                motion.append(lottieContainer);
                sendAnimation.setSpeed(1);
                sendAnimation.goToAndStop(0, true);
                sendAnimation.resize();
                button.classList.add('lottie-ready');
            }
            button.classList.remove('is-launching');
            button.disabled = false;
            closing = false;
        }, 450);
    };

    const finishFlight = () => {
        if (!requestSettled || !flightFinished || stage.hidden) return;
        if (!sendSucceeded) {
            closeFlight();
            return;
        }
        stage.classList.add('is-complete');
        holdTimer = setTimeout(closeFlight, 3500);
    };

    const startFlight = () => {
        const rect = motion.getBoundingClientRect();
        stage.style.setProperty('--send-start-x', `${rect.left + rect.width / 2 - innerWidth / 2}px`);
        stage.style.setProperty('--send-start-y', `${rect.top + rect.height / 2 - innerHeight / 2}px`);
        stage.hidden = false;
        stage.style.setProperty('--send-start-scale', String(rect.width / flightArt.getBoundingClientRect().width));
        stage.classList.add('is-active');
        button.classList.add('is-launching');
        if (lottieReady) {
            flightArt.append(lottieContainer);
            sendAnimation.resize();
            sendAnimation.setSpeed(.625);
            sendAnimation.goToAndPlay(0, true);
        } else {
            stage.classList.add('is-fallback');
            fallbackTimer = setTimeout(() => {
                flightFinished = true;
                finishFlight();
            }, 4000);
        }
    };

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity() || button.disabled) return;
        if (form.elements._honey.value) return;

        clearTimeout(holdTimer);
        clearTimeout(fallbackTimer);
        requestSettled = false;
        sendSucceeded = false;
        flightFinished = false;
        button.disabled = true;
        status.dataset.state = '';
        status.textContent = 'Sending your message…';
        if (!reduceMotion.matches) startFlight();

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
            sendSucceeded = true;
            status.dataset.state = 'success';
            status.textContent = 'Message submitted. Thanks for reaching out!';
        } catch {
            status.dataset.state = 'error';
            status.textContent = 'Your message could not be sent. Please try again or use the email link beside the form.';
        } finally {
            clearTimeout(timeout);
            requestSettled = true;
            if (reduceMotion.matches) button.disabled = false;
            else if (!sendSucceeded) closeFlight();
            else {
                if (lottieReady && !stage.classList.contains('is-fallback') && !flightFinished) sendAnimation.play();
                finishFlight();
            }
        }
    });
})();
