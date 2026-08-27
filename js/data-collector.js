// Data Collection Functions

// Collect array builder values
function collectArrayBuilder(fullId) {
    const builder = document.querySelector(`.array-builder[data-full-id="${fullId}"]`);
    if (!builder) return undefined;
    const items = [];
    const itemInputs = builder.querySelectorAll('.array-item-input');
    itemInputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
            const itemType = input.dataset.arrayItemType || 'string';
            if (itemType === 'number' || itemType === 'integer') {
                items.push(Number(input.value));
            } else {
                items.push(input.value);
            }
        }
    });
    if (items.length > 0) {
        return items;
    }
    return null;
}

// Collect top-level leaf values
function collectTopLeaf(fullId) {
    let val;
    const builder = document.querySelector(`.array-builder[data-full-id="${fullId}"]`);
    if (builder) {
        val = collectArrayBuilder(fullId);
        if (val === null || val === undefined) {
            return undefined;
        }
        return val;
    }
    const element = document.getElementById(fullId);
    if (element) {
        if (element.classList && element.classList.contains('three-state-toggle')) {
            const state = element.dataset.state;
            if (state !== 'unset') {
                val = state === 'true';
            }
        } else if (element.value && element.value.trim() !== '' && element.id !== 'newDomainName') {
            const activeType = element.dataset.activeType;
            if (activeType === 'array') {
                val = collectArrayBuilder(fullId);
            } else if (activeType === 'number' || activeType === 'integer') {
                val = Number(element.value);
            } else if (activeType === 'string') {
                val = element.value;
            } else if (element.type === 'number') {
                val = Number(element.value);
            } else if (element.tagName.toLowerCase() === 'textarea') {
                try {
                    val = JSON.parse(element.value);
                } catch (e) {
                    val = element.value;
                }
            } else {
                val = element.value;
            }
            if (activeType !== 'string' && activeType !== 'array' && activeType !== 'number' && activeType !== 'integer') {
                val = convertStringValue(val, { type: 'string' });
            }
        }
    }
    return val;
}

// Collect sub-object data
function collectSub(props, parentKey) {
    const sub = {};
    Object.keys(props).forEach(key => {
        if (key.startsWith('_')) return;
        const fullId = parentKey + '.' + key;
        const prop = props[key];

        if (key === 'customFiles') {
            const content = document.getElementById(fullId + '.content');
            if (content) {
                const customFilesObj = {};
                const sets = content.querySelectorAll('.section[data-customfile-set]');
                sets.forEach(set => {
                    const nameInput = set.querySelector('input[data-field="name"]');
                    const cssInput = set.querySelector('input[data-field="css"]');
                    const jsInput = set.querySelector('input[data-field="js"]');
                    const scopeInput = set.querySelector('input[data-field="scope"]');

                    if (nameInput && nameInput.value) {
                        const name = nameInput.value;
                        const fileSet = {};
                        if (cssInput && cssInput.value) {
                            fileSet.css = cssInput.value.split(',').map(s => s.trim()).filter(s => s !== '');
                        }
                        if (jsInput && jsInput.value) {
                            fileSet.js = jsInput.value.split(',').map(s => s.trim()).filter(s => s !== '');
                        }
                        if (scopeInput && scopeInput.value) {
                            fileSet.scope = scopeInput.value.split(',').map(s => s.trim()).filter(s => s !== '');
                        }

                        if (Object.keys(fileSet).length > 0) {
                            customFilesObj[name] = fileSet;
                        }
                    }
                });
                if (Object.keys(customFilesObj).length > 0) {
                    sub[key] = customFilesObj;
                }
            }
            return; // Skip default processing for customFiles
        }

        if ((prop.type === 'object' || (Array.isArray(prop.type) && prop.type.includes('object'))) && prop.properties) {
            // Check for boolean toggle in header
            const toggleElement = document.getElementById(fullId);
            if (toggleElement && toggleElement.classList.contains('three-state-toggle')) {
                const state = toggleElement.dataset.state;
                if (state === 'true' || state === 'false') {
                    sub[key] = state === 'true';
                } else {
                    // Toggle is 'unset', collect sub-properties
                    const subSub = collectSub(prop.properties, fullId);
                    if (Object.keys(subSub).length > 0) {
                        sub[key] = subSub;
                    }
                }
            } else {
                const subSub = collectSub(prop.properties, fullId);
                if (Object.keys(subSub).length > 0) {
                    sub[key] = subSub;
                }
            }
        } else {
            let val;
            const builder = document.querySelector(`.array-builder[data-full-id="${fullId}"]`);
            if (builder) {
                val = collectArrayBuilder(fullId);
                if (val !== null && val !== undefined) {
                    sub[key] = val;
                }
            } else {
                const element = document.getElementById(fullId);
                if (element) {
                    if (element.classList && element.classList.contains('three-state-toggle')) {
                        const state = element.dataset.state;
                        if (state !== 'unset') {
                            val = state === 'true';
                        }
                    } else if (element.value && element.value.trim() !== '' && element.id !== 'newDomainName') {
                        const activeType = element.dataset.activeType;
                        if (activeType === 'array') {
                            val = collectArrayBuilder(fullId);
                        } else if (activeType === 'number' || activeType === 'integer') {
                            val = Number(element.value);
                        } else if (activeType === 'string') {
                            val = element.value;
                        } else if (element.type === 'number') {
                            val = Number(element.value);
                        } else if (element.tagName.toLowerCase() === 'textarea') {
                            try {
                                val = JSON.parse(element.value);
                            } catch (e) {
                                val = element.value;
                            }
                        } else {
                            val = element.value;
                        }
                        if (activeType !== 'string' && activeType !== 'array' && activeType !== 'number' && activeType !== 'integer') {
                            val = convertStringValue(val, prop);
                        }
                    }
                }
            }
            if (val !== undefined && val !== null) {
                sub[key] = val;
            }
        }
    });
    return sub;
}

// Collect SMS-specific data
function collectSubForSms() {
    const smsObj = {};
    const providerVal = collectTopLeaf('sms.provider');
    if (providerVal && providerVal !== '') {
        smsObj.provider = providerVal;
    }
    const fields = ['sid', 'auth', 'from', 'id', 'token', 'apikey', 'url'];
    fields.forEach(f => {
        const fullId = 'sms.' + f;
        const val = collectTopLeaf(fullId);
        if (val !== undefined && (typeof val !== 'string' || val.trim() !== '')) {
            smsObj[f] = val;
        }
    });
    if (smsObj.provider) {
        return smsObj;
    } else {
        return undefined;
    }
}

// Main data collection function
function collectData() {
    // Start with a clean base. If originalData exists, use it after cleaning.
    // Otherwise, start with an empty object.
    let obj = {};
    if (originalData) {
        obj = JSON.parse(JSON.stringify(originalData)); // Deep copy originalData
        delete obj["$schema"]; // Remove schema if present
        obj = cleanUnderscore(obj); // Clean keys starting with '_'
    }

    const topProps = schema.properties;
    Object.keys(topProps).forEach(key => {
        if (key.startsWith('_')) return; // Skip internal properties

        // Special handling for 'domains'
        if (key === 'domains') {
            const domainProps = topProps.domains.additionalProperties.properties;
            // Initialize domains object if it doesn't exist
            if (!obj.domains) obj.domains = {};

            // Collect default domain values
            const defaultCollected = collectSub(domainProps, 'domains.');
            obj.domains[''] = deepMerge(obj.domains[''] || {}, defaultCollected, true);

            // Collect values for dynamically added domains
            const domainsContent = document.getElementById('domainsContent');
            if (domainsContent) {
                const sections = domainsContent.querySelectorAll('div[data-domain-name]'); // Select div.section
                sections.forEach(section => {
                    const domainName = section.dataset.domainName;
                    const collected = collectSub(domainProps, `domains.${domainName}`);
                    obj.domains[domainName] = deepMerge(obj.domains[domainName] || {}, collected, true);
                });
            }
        }
        // Special handling for 'settings'
        else if (key === 'settings') {
            const settingsProps = topProps.settings.properties;
            const subObj = collectSub(settingsProps, 'settings');
            obj.settings = deepMerge(obj.settings || {}, subObj, true);
        }
        // Special handling for 'sms'
        else if (key === 'sms') {
            const sub = collectSubForSms();
            if (sub !== undefined) {
                obj.sms = deepMerge(obj.sms || {}, sub, true);
            }
        }
        // General handling for other properties
        else {
            const prop = topProps[key];
            // If it's an object with sub-properties
            if ((prop.type === 'object' || (Array.isArray(prop.type) && prop.type.includes('object'))) && prop.properties) {
                const subObj = collectSub(prop.properties, key);
                if (Object.keys(subObj).length > 0) {
                    obj[key] = deepMerge(obj[key] || {}, subObj, true);
                }
            }
            // If it's a leaf property (not an object with sub-properties)
            else {
                const val = collectTopLeaf(key);
                if (val !== undefined) {
                    obj[key] = val; // Direct assignment for top-level leaves
                } else if (obj.hasOwnProperty(key)) {
                    // This was already here, but good/redundant
                    delete obj[key];
                }
            }
        }
    });

    // Cleanup empty fields (post-processing to remove keys that were cleared in form)
    cleanupEmptyFields(obj, topProps, '');

    return { "$schema": schema.id, ...obj };
}

// Recursively remove keys if their form fields are empty/unset
function cleanupEmptyFields(obj, props, parentKey) {
    if (!obj || !props) return;

    Object.keys(props).forEach(key => {
        if (key.startsWith('_')) return;

        const prop = props[key];
        const fullId = parentKey ? parentKey + '.' + key : key;

        // Special handling for domains
        if (key === 'domains' && obj.domains) {
            const domainProps = prop.additionalProperties.properties;
            Object.keys(obj.domains).forEach(d => {
                const pKey = d === '' ? 'domains.' : `domains.${d}`;
                cleanupEmptyFields(obj.domains[d], domainProps, pKey);
            });
            return;
        }

        // Special customFiles
        if (key === 'customFiles') {
            const content = document.getElementById(fullId + '.content');
            if (content) {
                const sets = content.querySelectorAll('.section[data-customfile-set]');
                if (sets.length === 0) {
                    delete obj[key];
                }
            }
            return;
        }

        // Object recursion
        if ((prop.type === 'object' || (Array.isArray(prop.type) && prop.type.includes('object'))) && prop.properties) {
            // Check for boolean toggle
            const toggleElement = document.getElementById(fullId);
            if (toggleElement && toggleElement.classList.contains('three-state-toggle')) {
                if (toggleElement.dataset.state === 'unset') {
                    // Toggle is unset, check if sub-properties are empty
                    if (!obj[key] || Object.keys(obj[key]).length === 0) {
                        delete obj[key];
                    }
                }
                // If toggle is true/false, keep the value
                return;
            }
            if (obj[key]) {
                cleanupEmptyFields(obj[key], prop.properties, fullId);
                if (Object.keys(obj[key]).length === 0) {
                    delete obj[key];
                }
            }
            return;
        }

        // Leaf values
        const builder = document.querySelector(`.array-builder[data-full-id="${fullId}"]`);
        if (builder) {
            const items = builder.querySelectorAll('.array-item-input');
            let hasItems = false;
            items.forEach(input => {
                if (input.value && input.value.trim() !== '') hasItems = true;
            });
            if (!hasItems) {
                delete obj[key];
            }
        } else {
            const element = document.getElementById(fullId);
            if (element) {
                let isEmpty = false;
                if (element.classList.contains('three-state-toggle')) {
                    if (element.dataset.state === 'unset') isEmpty = true;
                } else if (element.value !== undefined && element.value.trim() === '') {
                    isEmpty = true;
                }

                if (isEmpty) {
                    delete obj[key];
                }
            }
        }
    });
}
