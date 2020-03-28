import { browser } from 'webextension-polyfill-ts';

/** allowed sites input */
const allowedSitesInput: HTMLTextAreaElement | null = document.querySelector('#allowedSitesInput');
/** forbidden sites input */
const forbiddenSitesInput: HTMLTextAreaElement | null = document.querySelector('#forbiddenSitesInput');
/** allowed protocols input */
const allowedProtocolsInput: HTMLTextAreaElement | null = document.querySelector('#allowedProtocolsInput');

/** Store the currently selected settings using browser.storage.sync. */
const storeSettings = (): void => {
    // tslint:disable-next-line: all
    browser.storage.sync.set({
        filters: {
            allowedSites: allowedSitesInput ? allowedSitesInput.value : '',
            forbiddenSites: forbiddenSitesInput ? forbiddenSitesInput.value : '',
            allowedProtocols: allowedProtocolsInput ? allowedProtocolsInput.value : ''
        }
    });
    console.debug('storeSettings');
};

/**
 * Update the options UI with the settings values retrieved from storage,
 * or the default settings if the stored settings are empty.
 */
const updateUI = (restoredSettings: any): void => {
    console.debug('updateUI:restoredSettings', restoredSettings);
    if (allowedSitesInput && forbiddenSitesInput && allowedProtocolsInput && restoredSettings && restoredSettings.filters) {
        allowedSitesInput.value = restoredSettings.filters.allowedSites;
        forbiddenSitesInput.value = restoredSettings.filters.forbiddenSites;
        allowedProtocolsInput.value = restoredSettings.filters.allowedProtocols;
    }
};

/** On opening the options page, fetch stored settings and update the UI with them. */
const gettingStoredSettings = browser.storage.sync.get();
gettingStoredSettings.then(updateUI, (e: any): void => {
    console.error(e);
});

/** On blur, save the currently selected settings. */
if (allowedSitesInput && forbiddenSitesInput && allowedProtocolsInput) {
    allowedSitesInput.addEventListener('blur', storeSettings);
    forbiddenSitesInput.addEventListener('blur', storeSettings);
    allowedProtocolsInput.addEventListener('blur', storeSettings);
}
