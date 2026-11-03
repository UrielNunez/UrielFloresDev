(() => {
    const selector = document.getElementById('portfolio-language');
    const storageKey = 'portfolio-language';
    const attributes = ['aria-label', 'placeholder', 'alt'];
    const originals = new WeakMap();
    const options = selector.querySelectorAll('button');
    let language = 'es';

    function translate(node, value, key) {
        const records = originals.get(node) ?? new Map();
        const previous = records.get(key);
        const source = previous?.translated === value ? previous.source : value;
        if (language === 'en') return source;
        const normalized = source.trim().replace(/\s+/g, ' ');
        const translated = (Object.hasOwn(spanish, normalized) ? spanish[normalized] : undefined) ??
            (normalized.startsWith('View credential: ') ? normalized.replace('View credential: ', 'Ver credencial: ') : undefined);
        const progress = /^Preparing experience (\d+%)$/.exec(normalized);
        const label = translated ?? (progress && 'Preparando la experiencia ' + progress[1]);
        if (!label) return source;
        const result = source.replace(/\S[\s\S]*\S|\S/, () => label);
        records.set(key, { source, translated: result });
        originals.set(node, records);
        return result;
    }

    function update(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.parentElement?.closest('script, style, .typedText, #portfolio-language')) return;
            const value = translate(node, node.data, 'text');
            if (node.data !== value) node.data = value;
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        for (const attribute of attributes) {
            const current = node.getAttribute(attribute);
            if (current === null) continue;
            const value = translate(node, current, attribute);
            if (current !== value) node.setAttribute(attribute, value);
        }
        for (const child of node.childNodes) update(child);
    }

    const observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'childList') {
                for (const node of record.addedNodes) update(node);
            } else {
                update(record.target);
            }
        }
    });

    function setLanguage(value) {
        language = value === 'en' ? 'en' : 'es';
        document.documentElement.lang = language;
        for (const option of options) {
            option.setAttribute('aria-pressed', String(option.value === language));
        }
        update(document.querySelector('title'));
        update(document.body);
        window.dispatchEvent(new Event('portfolio-language-change'));
    }

    let savedLanguage;
    try { savedLanguage = localStorage.getItem(storageKey); } catch {}
    setLanguage(savedLanguage);
    observer.observe(document.body, {
        subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: attributes
    });
    const transition = document.createElement('div');
    transition.className = 'language-status';
    transition.setAttribute('role', 'status');
    document.body.append(transition);
    let changing = false;

    for (const option of options) {
        option.addEventListener('click', async () => {
            if (changing || language === option.value) return;
            changing = true;
            const nextLanguage = option.value;
            const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!reducedMotion) {
                selector.dataset.slide = nextLanguage;
                option.setAttribute('aria-pressed', 'true');
                for (const other of options) {
                    if (other !== option) other.setAttribute('aria-pressed', 'false');
                }
                transition.lang = nextLanguage;
                transition.textContent = nextLanguage === 'es' ? 'Cargando idioma…' : 'Loading language…';
                document.body.classList.add('language-loading');
                await new Promise(resolve => setTimeout(resolve, 450));
            }
            setLanguage(nextLanguage);
            try { localStorage.setItem(storageKey, language); } catch {}
            if (!reducedMotion) {
                await new Promise(resolve => setTimeout(resolve, 330));
                document.body.classList.remove('language-loading');
                transition.textContent = '';
                delete selector.dataset.slide;
            }
            changing = false;
        });
    }
})();
