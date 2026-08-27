// Main Application Logic

// Global state
let schema = null;
let ajv = new Ajv({ allErrors: true, verbose: true, schemaId: 'id' });
let configData = {};
let originalData = null;
let properties = null;
const tooltip = document.getElementById('tooltip');
let editor;
let currentFormat = 'json'; // track current editor format (json or yaml)
let lastSchemaLoadTime = null;

// Load schema from MeshCentral repository
async function loadSchema() {
    // Initialize version selector first
    const versionInfo = await initVersionSelector();
    const versionToLoad = versionInfo ? versionInfo.versionToLoad : 'master';

    // Load the schema for the selected version
    await loadSchemaVersion(versionToLoad);
}

// Load schema for a specific version
async function loadSchemaVersion(version) {
    try {
        const schemaUrl = getSchemaUrl(version);
        const response = await fetch(schemaUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        schema = await response.json();
        properties = schema.properties;

        // Clear and regenerate form
        const formContainer = document.getElementById('formContainer');
        formContainer.innerHTML = '';
        originalData = null; // Clear any loaded data

        generateForm(properties, '', formContainer, 0, false);
        updatePreview();

        // Update validation message with version info
        lastSchemaLoadTime = Date.now();
        const versionText = version === 'master' ? 'master (development)' : `v${version}`;
        const msgContainer = document.getElementById('validationMsg');

        msgContainer.innerHTML = `
            <span class="schema-status-container" style="position:relative; cursor:help; display:inline-flex; align-items:center; gap:5px;">
                <span style="color:var(--text-schema, #0f0)">
                    <a href="${schemaUrl}" target="_blank" style="color:var(--text-schema, #0f0); text-decoration:underline;">Schema ${versionText}</a> loaded, ready to go!
                </span>
                <span class="help-icon" style="font-size:1em; margin:0;">?</span>
                <div class="help-tooltip" style="top: 1rem; left: 50%; transform: translateX(-50%); width: max-content; z-index: 100;">
                    <span id="schemaLastLoadedTime">just now</span>
                </div>
            </span>`;

        const statusContainer = msgContainer.querySelector('.schema-status-container');
        const tooltipDiv = msgContainer.querySelector('.help-tooltip');
        const timeSpan = msgContainer.querySelector('#schemaLastLoadedTime');

        if (statusContainer && tooltipDiv && timeSpan) {
            statusContainer.addEventListener('mouseenter', () => {
                timeSpan.textContent = formatRelativeTime(lastSchemaLoadTime);
                tooltipDiv.style.display = 'block';
            });
            statusContainer.addEventListener('mouseleave', () => {
                tooltipDiv.style.display = 'none';
            });
        }

    } catch (e) {
        const schemaUrl = getSchemaUrl(version);
        document.getElementById('validationMsg').innerHTML = `<span style="color:red">Error loading <a href="${schemaUrl}" target="_blank" style="color:red; text-decoration:underline;">schema</a>: ${e.message}</span>`;
    }
}

// Update JSON/YAML preview
function updatePreview() {
    const data = collectData();
    if (currentFormat === 'yaml') {
        try {
            editor.setValue(jsyaml.dump(data, { indent: 2, lineWidth: -1 }));
        } catch (e) {
            editor.setValue(JSON.stringify(data, null, 2));
        }
    } else {
        editor.setValue(JSON.stringify(data, null, 2));
    }
}

// Populate form with data
function populateForm(data) {
    // Non-radio inputs
    const nonRadioInputs = document.querySelectorAll('#formContainer input[type="text"], input[type="number"], textarea, select');
    nonRadioInputs.forEach(input => {
        if (input.id === 'newDomainName') return;
        const val = getNestedValue(data, input.id, true);
        if (val !== undefined) {
            input.value = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
            expandPathTo(input);
        }
    });
    // Toggles
    const toggles = document.querySelectorAll('.three-state-toggle');
    toggles.forEach(t => {
        const val = getNestedValue(data, t.id, true);
        let state = 'unset';
        if (typeof val === 'boolean') {
            state = val ? 'true' : 'false';
        }
        t.dataset.state = state;
        t.querySelector('.label').textContent = state;
        expandPathTo(t);
    });
    // Array builders
    const arrayBuilders = document.querySelectorAll('.array-builder');
    arrayBuilders.forEach(builder => {
        const fullId = builder.dataset.fullId;
        const val = getNestedValue(data, fullId, true);
        if (Array.isArray(val) && val.length > 0) {
            builder.querySelectorAll('.array-item-row').forEach(row => row.remove());
            val.forEach(item => {
                addArrayItem(builder, { items: { type: builder.dataset.arrayType } }, item);
            });
        }
    });
    // Special for sms
    const providerSelect = document.getElementById('sms.provider');
    if (providerSelect) {
        const smsData = getNestedValue(data, 'sms', true);
        if (smsData && smsData.provider) {
            providerSelect.value = smsData.provider;
            const content = providerSelect.closest('.content');
            content.querySelectorAll('.section[data-provider]').forEach(s => { s.style.display = 'none'; });
            const selectedSection = content.querySelector(`.section[data-provider="${smsData.provider}"]`);
            if (selectedSection) {
                selectedSection.style.display = 'flex';
            }
        }
    }

    // Special for customFiles
    if (data.domains) {
        Object.keys(data.domains).forEach(domainKey => {
            const domainData = data.domains[domainKey];
            if (domainData && domainData.customFiles) {
                const parentKey = domainKey === '' ? 'domains.' : `domains.${domainKey}`;
                const contentId = `${parentKey}.customFiles.content`;
                const content = document.getElementById(contentId);
                if (content) {
                    // Clear existing sets first
                    const existingSets = content.querySelectorAll('.section[data-customfile-set]');
                    existingSets.forEach(s => s.remove());

                    loadCustomFileSets(content, domainData.customFiles, parentKey);

                    // Expand the section if it has data
                    if (Object.keys(domainData.customFiles).length > 0) {
                        content.style.display = 'flex';
                        expandPathTo(content);
                    }
                }
            }
        });
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize CodeMirror
    editor = CodeMirror.fromTextArea(document.getElementById('jsonPreview'), {
        mode: { name: "javascript", json: true },
        theme: 'dracula',
        lineNumbers: true,
        readOnly: true,
        viewportMargin: Infinity
    });

    // Load schema and generate form
    loadSchema();

    // Initialize template selector
    if (typeof initTemplateSelector === 'function') {
        initTemplateSelector();
    }

    // Initialize all UI handlers
    initUIHandlers();
});
