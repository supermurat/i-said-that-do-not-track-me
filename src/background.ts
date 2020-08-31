import { browser, Tabs, WebRequest, Windows } from 'webextension-polyfill-ts';

import { FilterSettingModel, FiltersModel } from './models';

/** last opened tab, actually it is current tab */
export let lastTab: Tabs.Tab;

/** define default filters */
export const defaultFilters: FilterSettingModel = {
    allowedSites: '(mozilla).org\r\n(firefox|github)\\.com',
    forbiddenSites: '',
    allowedProtocols: 'https'
};

/** define filters */
export const filters: FiltersModel = {
    allowedSites: [],
    forbiddenSites: [],
    allowedProtocols: []
};

/** set filter */
export const setFilter = (filterList: Array<string>, newFilters: string): void => {
    if (newFilters !== undefined && newFilters.replace(/\r/gui, '').replace(/\n/gui, '') !== '') {
        filterList.push(...newFilters.replace(/\r/gui, '').split('\n'));
    }
};

/** reset filters */
export const resetFilters = (): void => {
    filters.allowedSites = [];
    filters.forbiddenSites = [];
    filters.allowedProtocols = [];
    setFilter(filters.allowedSites, defaultFilters.allowedSites);
    setFilter(filters.forbiddenSites, defaultFilters.forbiddenSites);
    setFilter(filters.allowedProtocols, defaultFilters.allowedProtocols);
};

/** populate filters */
export const populateFilters = (filterSetting: FilterSettingModel): void => {
    resetFilters();
    console.log('populateFilters:filterSetting', filterSetting);
    if (filterSetting !== undefined) {
        setFilter(filters.allowedSites, filterSetting.allowedSites);
        setFilter(filters.forbiddenSites, filterSetting.forbiddenSites);
        setFilter(filters.allowedProtocols, filterSetting.allowedProtocols);
    }
    console.log('populateFilters:filters', filters);
};

/** check if is url allowed to open in normal window */
export const isTabAllowed = (url: string): boolean => {
    if (!url) {
        return false;
    }
    for (const forbiddenSite of filters.forbiddenSites) {
        if (new RegExp(
            `^http(s)?:\\/\\/(www\\.)?([-a-zA-Z0-9@:%_+.~#?&/=]*)${
                forbiddenSite
            }([-a-zA-Z0-9@:%_+.~#?&/=]*)`,
            'gui')
            .test(url)) {
            console.log('Forbidden Site:', forbiddenSite);

            return false;
        }
    }
    let isAllowed = false;
    for (const allowedProtocol of filters.allowedProtocols) {
        if (url.startsWith(allowedProtocol)) {
            console.log('Allowed Protocol:', allowedProtocol, url);
            isAllowed = true;
            break;
        }
    }
    if (!isAllowed) {
        console.log('Disallowed Protocol:', url);
    } else {
        isAllowed = false;
        for (const allowedSite of filters.allowedSites) {
            if (new RegExp(
                `^http(s)?:\\/\\/(www\\.)?([-a-zA-Z0-9@:%_+.~#?&/=]*)${
                    allowedSite
                }([-a-zA-Z0-9@:%_+.~#?&/=]*)`,
                'gui')
                .test(url)) {
                console.log('Allowed Site:', allowedSite, url);
                isAllowed = true;
                break;
            }
        }
        if (!isAllowed) {
            console.log('Disallowed URL:', url);
        }
    }

    return isAllowed;
};

/** open url in incognito mode */
export const openInIncognitoMode = async (url: string, tab?: Tabs.Tab): Promise<void> => {
    // ASYNC NOTE: when we make this function async, Browser can't open new incognito tabs, we will fix it later
    console.debug('openInIncognitoMode:started');
    // tslint:disable-next-line: all
    let incognitoWindow: Windows.Window | undefined;
    const allWindows = await browser.windows.getAll();
    if (allWindows !== undefined) {
        for (const window of allWindows) {
            if (window.incognito && window.type === 'normal') {
                incognitoWindow = window;
                break;
            }
        }
    }
    if (incognitoWindow) {
        console.debug('openInIncognitoMode:incognitoWindow:windowId:', incognitoWindow.id);
        // tslint:disable-next-line: all
        browser.tabs.create({url, windowId: incognitoWindow.id});
    } else if (tab !== undefined && tab.incognito) {
        console.debug('openInIncognitoMode:lastTab:windowId:', tab.windowId);
        // tslint:disable-next-line: all
        browser.tabs.create({url, windowId: tab.windowId});
    } else {
        console.debug('openInIncognitoMode:browser.windows.create:incognito:true');
        // tslint:disable-next-line: all
        browser.windows.create({url, incognito: true});
    }
    if (tab !== undefined) {
        console.debug('openInIncognitoMode:tab', tab);
        if (tab.id !== undefined) {
            // tslint:disable-next-line: all
            browser.tabs.remove(tab.id);
        }
    }
    console.debug('openInIncognitoMode:done:url', url);
};

/** check url and fix it, also open it in incognito mode if it is not allowed */
export const checkAndFix = (requestDetails: WebRequest.OnBeforeRequestDetailsType): WebRequest.BlockingResponse => {
    console.debug('checkAndFix:started', requestDetails);
    const url = requestDetails.url;
    if (!requestDetails.incognito && !lastTab.incognito && !isTabAllowed(url)) {
        openInIncognitoMode(url, lastTab)
            .then(r => {
                // ignore me, I have already done what I have to do.
            })
            .catch(reason => {
                console.error(reason);
            });

        return {cancel: true};
    }
    if (url.indexOf('?') < url.indexOf('utm_')) {
        const fixedURL = url
            .replace(/\?utm_([-a-zA-Z0-9@:%_+.~#?/=]*)/gui, '?')
            .replace(/&utm_([-a-zA-Z0-9@:%_+.~#?/=]*)/gui, '');
        if (fixedURL !== url) {
            console.debug('checkAndFix:fixedURL', fixedURL);

            return {redirectUrl: fixedURL};
        }
    }
    console.debug('checkAndFix:done:url', url);

    return {};
};

browser.webRequest.onBeforeRequest.addListener(
    checkAndFix,
    {urls: ['<all_urls>'], types: ['main_frame']},
    ['blocking']
);

browser.tabs.onCreated.addListener(tab => {
    lastTab = tab;
});

resetFilters();

/** get user defined filters */
browser.storage.sync.get()
    .then(value => {
        console.log('browser.storage.sync.get', value);
        if (value !== undefined) {
            populateFilters(value.filters);
        }
    }).catch(reason => {
    console.error(reason);
});

browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
        console.log('browser.storage.onChanged', changes);
        if (changes.filters !== undefined) {
            populateFilters(changes.filters.newValue);
        }
    }
});
