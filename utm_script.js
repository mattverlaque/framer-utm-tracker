<script>
// UTM and Referrer Attribution Script for Framer Sites

// Function to get UTM parameters from URL
function getUTMParameters() {
    const utmParams = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split('&');

    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        if (pair[0].startsWith('utm_')) {
            utmParams[pair[0]] = decodeURIComponent(pair[1] || '');
        }
    }
    return utmParams;
}

// Function to get referrer
function getReferrer() {
    const referrer = document.referrer;
    const currentDomain = window.location.hostname;
    
    // Check if referrer is not from the same domain or its subdomains
    if (referrer && !referrer.includes(currentDomain)) {
        return referrer;
    } else if (!referrer) {
        return "direct entry";
    }
    return null;
}

// Function to get current page URL
function getCurrentPageURL() {
    return window.location.href;
}

// Function to set cookie
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
}

// Function to get cookie
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

// Function to store UTM parameters and referrer in cookie
function storeParams() {
    const newUTMParams = getUTMParameters();
    const referrer = getReferrer();
    const currentPageURL = getCurrentPageURL();
    let existingParams = {};
    const existingParamsStr = getCookie('attribution_params');
    
    if (existingParamsStr) {
        try {
            existingParams = JSON.parse(existingParamsStr);
        } catch (e) {
            console.log('Error parsing existing params');
        }
    }

    // Merge new UTM parameters with existing ones
    const mergedParams = { ...existingParams, ...newUTMParams };

    // Add or update referrer only if it doesn't exist or if there are new UTM parameters
    if (referrer && (!existingParams.referrer || Object.keys(newUTMParams).length > 0)) {
        mergedParams.referrer = referrer;
    }

    // Always update the current page URL
    mergedParams.page_url = currentPageURL;

    if (Object.keys(mergedParams).length > 0) {
        setCookie('attribution_params', JSON.stringify(mergedParams), 30);
    }
}

// Function to add parameters to form with verification
function addParamsToForm(form) {
    const paramsStr = getCookie('attribution_params');
    if (!paramsStr) return;

    try {
        const params = JSON.parse(paramsStr);
        // Update the page_url to the current page before adding to form
        params.page_url = getCurrentPageURL();
        
        // First, verify all fields exist
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined) {
                let input = form.querySelector(`input[name="${key}"]`);
                if (!input) {
                    input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.className = 'utm-tracking-field';
                    form.appendChild(input);
                }
                input.value = value;
            }
        }

        // Double-check all fields are present with correct values
        for (const [key, value] of Object.entries(params)) {
            const input = form.querySelector(`input[name="${key}"]`);
            if (!input || input.value !== value) {
                const newInput = document.createElement('input');
                newInput.type = 'hidden';
                newInput.name = key;
                newInput.className = 'utm-tracking-field';
                newInput.value = value;
                if (input) {
                    form.removeChild(input);
                }
                form.appendChild(newInput);
            }
        }

        // Update the cookie with the new page_url
        setCookie('attribution_params', JSON.stringify(params), 30);
    } catch (e) {
        console.log('Error adding params to form:', e);
    }
}

// Function to log parameters
function logParams() {
    const paramsStr = getCookie('attribution_params');
    if (paramsStr) {
        try {
            console.log('Attribution Parameters:', JSON.parse(paramsStr));
        } catch (e) {
            console.log('Error parsing attribution parameters');
        }
    } else {
        console.log('Attribution cookie not set');
    }
}

// Function to handle form submission
function handleFormSubmit(event) {
    const form = event.target;
    
    // First attempt at adding parameters
    addParamsToForm(form);
    
    // Double check parameters were added
    const paramsStr = getCookie('attribution_params');
    if (paramsStr) {
        const params = JSON.parse(paramsStr);
        const missingFields = Object.keys(params).filter(key => !form.querySelector(`input[name="${key}"]`));
        
        if (missingFields.length > 0) {
            // If any fields are missing, try adding them again
            addParamsToForm(form);
        }
    }
}

// Function to initialize tracking
function initTracking() {
    // Check if we're in the Framer preview
    const isFramerPreview = window.location.hostname.includes('framer.website');

    if (!isFramerPreview) {
        // Only run on the actual published site
        storeParams();
        logParams();

        // Function to attach form handlers
        function attachFormHandlers(form) {
            // Remove any existing handlers
            form.removeEventListener('submit', handleFormSubmit);
            
            // Add the submit event listener
            form.addEventListener('submit', handleFormSubmit);
            
            // Also watch for direct submits
            const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
            submitButtons.forEach(button => {
                button.addEventListener('click', () => {
                    addParamsToForm(form);
                });
            });
        }

        // Add parameters to existing forms
        const forms = document.getElementsByTagName('form');
        for (let i = 0; i < forms.length; i++) {
            attachFormHandlers(forms[i]);
        }

        // Enhanced MutationObserver to watch for dynamically added forms
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Look for new forms
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'FORM') {
                        attachFormHandlers(node);
                    }
                    // Also look for forms within added nodes
                    if (node.querySelectorAll) {
                        const forms = node.querySelectorAll('form');
                        forms.forEach(form => attachFormHandlers(form));
                    }
                });

                // Check for attribute changes on forms
                if (mutation.target.nodeName === 'FORM') {
                    attachFormHandlers(mutation.target);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['action', 'method']
        });

        // Periodically verify forms have parameters
        setInterval(() => {
            const forms = document.getElementsByTagName('form');
            for (let i = 0; i < forms.length; i++) {
                const form = forms[i];
                if (!form.querySelector('.utm-tracking-field')) {
                    attachFormHandlers(form);
                }
            }
        }, 2000);
    }
}

// Utility function to clear attribution cookie
function clearAttributionCookie() {
    document.cookie = "attribution_params=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    console.log("Attribution cookie cleared");
}

// Run the initialization when the page loads
document.addEventListener('DOMContentLoaded', initTracking);

// Handle Framer route changes
window.addEventListener('popstate', () => {
    storeParams();
    logParams();
});

// Make utility functions available globally
window.clearAttributionCookie = clearAttributionCookie;
window.logParams = logParams;
</script>
