document.addEventListener('DOMContentLoaded', function() {
    const saveBtn = document.getElementById('saveBtn');
    const fillBtn = document.getElementById('fillBtn');
    const clearBtn = document.getElementById('clearBtn');
    const debugBtn = document.getElementById('debugBtn');
    const statusDiv = document.getElementById('status');
    
    // Load saved data when popup opens
    loadSavedData();
    
    saveBtn.addEventListener('click', saveData);
    fillBtn.addEventListener('click', fillForm);
    clearBtn.addEventListener('click', clearData);
    debugBtn.addEventListener('click', debugForm);
    
    function loadSavedData() {
        chrome.storage.sync.get(['passengerData'], function(result) {
            if (result.passengerData) {
                const data = result.passengerData;
                document.getElementById('name').value = data.name || '';
                document.getElementById('age').value = data.age || '';
                document.getElementById('gender').value = data.gender || '';
                document.getElementById('berth').value = data.berth || '';
                document.getElementById('mobile').value = data.mobile || '';
            }
        });
    }
    
    function saveData() {
        const name = document.getElementById('name').value.trim();
        const age = document.getElementById('age').value.trim();
        const gender = document.getElementById('gender').value;
        const berth = document.getElementById('berth').value;
        const mobile = document.getElementById('mobile').value.trim();
        
        if (!name || !age || !gender) {
            showStatus('Please fill Name, Age, and Gender', 'error');
            return;
        }
        
        if (mobile && !/^\d{10}$/.test(mobile)) {
            showStatus('Please enter a valid 10-digit mobile number', 'error');
            return;
        }
        
        const passengerData = {
            name: name,
            age: age,
            gender: gender,
            berth: berth,
            mobile: mobile
        };
        
        chrome.storage.sync.set({passengerData: passengerData}, function() {
            showStatus('Data saved successfully!', 'success');
        });
    }
    
    function fillForm() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const tab = tabs[0];
            
            if (!tab.url.includes('irctc.co.in')) {
                showStatus('Please open IRCTC website first', 'error');
                return;
            }
            
            chrome.storage.sync.get(['passengerData'], function(result) {
                if (!result.passengerData) {
                    showStatus('No saved data found. Please save data first.', 'error');
                    return;
                }
                
                chrome.tabs.sendMessage(tab.id, {
                    action: 'fillForm',
                    data: result.passengerData
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        showStatus('Error: Please refresh the IRCTC page', 'error');
                    } else if (response && response.success) {
                        showStatus('Form filled successfully!', 'success');
                    } else {
                        showStatus('Could not fill form. Make sure you are on the passenger details page.', 'error');
                    }
                });
            });
        });
    }
    
    function clearData() {
        document.getElementById('name').value = '';
        document.getElementById('age').value = '';
        document.getElementById('gender').value = '';
        document.getElementById('berth').value = '';
        document.getElementById('mobile').value = '';
        
        chrome.storage.sync.remove(['passengerData'], function() {
            showStatus('Data cleared successfully!', 'success');
        });
    }
    
    function debugForm() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const tab = tabs[0];
            
            if (!tab.url.includes('irctc.co.in')) {
                showStatus('Please open IRCTC website first', 'error');
                return;
            }
            
            chrome.tabs.sendMessage(tab.id, {
                action: 'debugForm'
            }, function(response) {
                if (chrome.runtime.lastError) {
                    showStatus('Error: Please refresh the IRCTC page', 'error');
                } else {
                    showStatus('Debug info logged to console. Press F12 to view.', 'success');
                }
            });
        });
    }
    
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        
        setTimeout(function() {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }
});