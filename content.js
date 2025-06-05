// Content script for IRCTC auto-fill
console.log('IRCTC Auto-fill extension loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'fillForm') {
        console.log('Received fill form request');
        try {
            const success = fillPassengerForm(request.data);
            sendResponse({success: success});
        } catch (error) {
            console.error('Error in message listener:', error);
            sendResponse({success: false});
        }
    } else if (request.action === 'debugForm') {
        console.log('Received debug form request');
        debugFormFields();
        sendResponse({success: true});
    }
    return true; // Keep message channel open for async response
});

function fillPassengerForm(data) {
    console.log('Starting fillPassengerForm with data:', data);
    
    // First, try to fill immediately
    let success = fillFormFields(data);
    
    // If not successful, wait and try again
    if (!success) {
        setTimeout(() => {
            console.log('Retrying form fill after delay...');
            fillFormFields(data);
        }, 2000);
    }
    
    return true; // Always return true to avoid popup errors
}

function fillFormFields(data) {
    console.log('Filling form fields with data:', data);
    
    // Updated selectors for current IRCTC website (Next Gen)
    const selectors = {
        name: [
            // Current IRCTC selectors
            'input[formControlName="passengerName"]',
            'input[placeholder*="Passenger Name"]',
            'input[name*="passengerName"]',
            'input[id*="passengerName"]',
            'input[placeholder*="Name"]',
            'input[class*="passenger-name"]',
            'input[ng-reflect-name*="passengerName"]',
            '.passenger-details input[type="text"]',
            'input[data-cy*="passenger-name"]',
            // Generic fallbacks
            'input[type="text"]:not([placeholder*="Mobile"]):not([placeholder*="Age"])'
        ],
        age: [
            'input[formControlName="passengerAge"]',
            'input[placeholder*="Age"]',
            'input[name*="passengerAge"]',
            'input[id*="passengerAge"]',
            'input[type="number"]',
            'input[class*="passenger-age"]',
            'input[ng-reflect-name*="passengerAge"]',
            'input[data-cy*="passenger-age"]'
        ],
        gender: [
            'select[formControlName="passengerGender"]',
            'select[name*="passengerGender"]',
            'select[id*="passengerGender"]',
            'select[placeholder*="Gender"]',
            'select[class*="passenger-gender"]',
            'select[ng-reflect-name*="passengerGender"]',
            'select[data-cy*="passenger-gender"]',
            // Look for dropdown that contains gender options
            'select option[value="M"]'
        ],
        berth: [
            'select[formControlName="berthChoice"]',
            'select[formControlName="passengerBerthChoice"]',
            'select[name*="berthChoice"]',
            'select[id*="berthChoice"]',
            'select[placeholder*="Berth"]',
            'select[class*="berth-preference"]',
            'select[ng-reflect-name*="berthChoice"]',
            'select[data-cy*="berth"]'
        ],
        mobile: [
            'input[formControlName="mobileNo"]',
            'input[formControlName="passengerMobile"]',
            'input[placeholder*="Mobile"]',
            'input[name*="mobileNo"]',
            'input[id*="mobileNo"]',
            'input[type="tel"]',
            'input[class*="mobile-number"]',
            'input[ng-reflect-name*="mobileNo"]',
            'input[data-cy*="mobile"]'
        ]
    };
    
    let filledCount = 0;
    
    // Fill name
    if (fillField(selectors.name, data.name)) {
        filledCount++;
        console.log('✓ Name filled successfully');
    }
    
    // Fill age
    if (fillField(selectors.age, data.age)) {
        filledCount++;
        console.log('✓ Age filled successfully');
    }
    
    // Fill gender
    if (fillSelectField(selectors.gender, data.gender)) {
        filledCount++;
        console.log('✓ Gender filled successfully');
    }
    
    // Fill berth preference
    if (data.berth && fillSelectField(selectors.berth, data.berth)) {
        filledCount++;
        console.log('✓ Berth preference filled successfully');
    }
    
    // Fill mobile
    if (data.mobile && fillField(selectors.mobile, data.mobile)) {
        filledCount++;
        console.log('✓ Mobile filled successfully');
    }
    
    console.log(`Form filling completed. ${filledCount} fields filled.`);
    
    // Show a visual indicator
    if (filledCount > 0) {
        showSuccessMessage(`Auto-filled ${filledCount} field(s)!`);
    }
    
    return filledCount > 0;
}

function fillField(selectors, value) {
    if (!value) return false;
    
    console.log(`Attempting to fill field with value: ${value}`);
    console.log(`Trying selectors:`, selectors);
    
    for (let selector of selectors) {
        try {
            const elements = document.querySelectorAll(selector);
            console.log(`Selector "${selector}" found ${elements.length} elements`);
            
            for (let element of elements) {
                if (element && isElementVisible(element) && !element.disabled && !element.readOnly) {
                    console.log(`Found suitable element:`, element);
                    
                    // Clear the field first
                    element.value = '';
                    
                    // Set the value
                    element.value = value;
                    
                    // Trigger events to ensure the framework detects the change
                    triggerInputEvents(element);
                    
                    console.log(`Successfully filled field with selector: ${selector}, value: ${value}`);
                    return true;
                }
            }
        } catch (error) {
            console.warn(`Error with selector "${selector}":`, error);
        }
    }
    console.warn(`Could not find suitable field for value: ${value}`);
    return false;
}

function fillSelectField(selectors, value) {
    if (!value) return false;
    
    console.log(`Attempting to fill select field with value: ${value}`);
    
    for (let selector of selectors) {
        try {
            const elements = document.querySelectorAll(selector);
            console.log(`Select selector "${selector}" found ${elements.length} elements`);
            
            for (let element of elements) {
                if (element && isElementVisible(element) && !element.disabled) {
                    console.log(`Found suitable select element:`, element);
                    
                    // Try to find option by value first
                    let option = element.querySelector(`option[value="${value}"]`);
                    
                    // If not found by exact value, try variations
                    if (!option) {
                        const options = element.querySelectorAll('option');
                        for (let opt of options) {
                            const optValue = opt.value.toUpperCase();
                            const optText = opt.textContent.toUpperCase().trim();
                            const searchValue = value.toUpperCase();
                            
                            if (optValue === searchValue || 
                                optText.includes(searchValue) ||
                                optValue.includes(searchValue)) {
                                option = opt;
                                break;
                            }
                        }
                    }
                    
                    if (option) {
                        element.value = option.value;
                        triggerInputEvents(element);
                        console.log(`Successfully selected option: ${option.textContent} (${option.value})`);
                        return true;
                    } else {
                        console.log(`No matching option found for value: ${value}`);
                        console.log('Available options:', Array.from(element.options).map(opt => `${opt.value}: ${opt.textContent}`));
                    }
                }
            }
        } catch (error) {
            console.warn(`Error with select selector "${selector}":`, error);
        }
    }
    console.warn(`Could not find suitable select field for value: ${value}`);
    return false;
}

function isElementVisible(element) {
    return element.offsetParent !== null && 
           element.offsetWidth > 0 && 
           element.offsetHeight > 0 &&
           window.getComputedStyle(element).visibility !== 'hidden' &&
           window.getComputedStyle(element).display !== 'none';
}

function triggerInputEvents(element) {
    // Comprehensive event triggering for modern frameworks
    const events = [
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new Event('blur', { bubbles: true, cancelable: true }),
        new KeyboardEvent('keyup', { bubbles: true, cancelable: true }),
        new Event('focusout', { bubbles: true, cancelable: true })
    ];
    
    events.forEach(event => {
        try {
            element.dispatchEvent(event);
        } catch (e) {
            console.warn('Event dispatch failed:', e);
        }
    });
    
    // Additional Angular-specific events
    if (window.ng) {
        try {
            element.dispatchEvent(new CustomEvent('ngModelChange', { bubbles: true }));
        } catch (e) {
            console.warn('Angular event failed:', e);
        }
    }
}

function showSuccessMessage(message) {
    // Create and show a temporary success message
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Enhanced auto-fill on page load
window.addEventListener('load', function() {
    console.log('Page loaded, checking for auto-fill opportunity');
    setTimeout(() => {
        if (shouldAutoFill()) {
            chrome.storage.sync.get(['passengerData'], function(result) {
                if (result.passengerData) {
                    console.log('Auto-filling passenger details on page load...');
                    fillFormFields(result.passengerData);
                }
            });
        }
    }, 3000); // Increased delay for better reliability
});

function shouldAutoFill() {
    // Check if we're on IRCTC and have passenger form fields
    const isIRCTC = window.location.href.includes('irctc.co.in');
    const hasPassengerFields = document.querySelector([
        'input[formControlName="passengerName"]',
        'input[placeholder*="Passenger Name"]',
        'input[placeholder*="Name"]',
        '.passenger-details input'
    ].join(','));
    
    console.log('Auto-fill check:', { isIRCTC, hasPassengerFields: !!hasPassengerFields });
    return isIRCTC && hasPassengerFields;
}

// Enhanced mutation observer for dynamic content
let observerTimeout;
const observer = new MutationObserver(function(mutations) {
    // Debounce the observer to avoid excessive calls
    clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
        for (let mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if passenger form elements were added
                if (shouldAutoFill()) {
                    console.log('Detected passenger form after DOM change, auto-filling...');
                    chrome.storage.sync.get(['passengerData'], function(result) {
                        if (result.passengerData) {
                            fillFormFields(result.passengerData);
                        }
                    });
                    break; // Exit after first match
                }
            }
        }
    }, 1000); // Debounce delay
});

// Start observing with more specific configuration
if (document.body) {
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false // Disable attribute observation for better performance
    });
} else {
    // If body is not ready, wait for it
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });
    });
}

// Debug function to help users
function debugFormFields() {
    console.log('=== IRCTC Form Debug Info ===');
    console.log('Current URL:', window.location.href);
    
    const allInputs = document.querySelectorAll('input');
    const allSelects = document.querySelectorAll('select');
    
    console.log('All input fields:', Array.from(allInputs).map(input => ({
        tag: input.tagName,
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        formControlName: input.getAttribute('formControlName'),
        classes: input.className
    })));
    
    console.log('All select fields:', Array.from(allSelects).map(select => ({
        tag: select.tagName,
        name: select.name,
        id: select.id,
        formControlName: select.getAttribute('formControlName'),
        classes: select.className,
        options: Array.from(select.options).map(opt => opt.value + ': ' + opt.textContent)
    })));
}

// Make debug function available globally
window.debugIRCTCForm = debugFormFields;

console.log('IRCTC Auto-fill extension fully loaded. Use debugIRCTCForm() in console for field info.');