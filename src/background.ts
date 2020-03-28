import { browser, Tabs, WebRequest, Windows } from 'webextension-polyfill-ts';

/** last opened tab, actually it is current tab */
export let lastTab: Tabs.Tab;

/** Filters Model */
export class FiltersModel {
    /** allowed sites list */
    allowedSites: Array<string> = [];
    /** forbidden sites list */
    forbiddenSites: Array<string> = [];
    /** allowed protocols list */
    allowedProtocols: Array<string> = [];
}

/** define default filters */
export const filters: FiltersModel = {
    allowedSites: ['(mozilla).org', '(firefox|github)\\.com'],
    forbiddenSites: [],
    allowedProtocols: ['https']
};

/** get user defined filters */
browser.storage.sync.get()
    .then(value => {
        if (value !== undefined && value.filters !== undefined) {
            filters.allowedSites.push(value.filters.allowedSites.replace(/\r/gui, '').split('\n'));
            filters.forbiddenSites.push(value.filters.forbiddenSites.replace(/\r/gui, '').split('\n'));
            filters.allowedProtocols.push(value.filters.allowedProtocols.replace(/\r/gui, '').split('\n'));
        }
        console.log('filters', filters);
    }).catch(reason => {
        console.error(reason);
    });

/** open url in incognito mode */
export const openInIncognitoMode = (url: string, tab?: Tabs.Tab): void => {
    // ASYNC NOTE: when we make this function async, Browser can't open new incognito tabs, we will fix it later
    console.debug('openInIncognitoMode:started');
    // tslint:disable-next-line: all
    let incognitoWindow: Windows.Window | undefined;
    /*const allWindows = await browser.windows.getAll();
    if (allWindows !== undefined) {
        for (const window of allWindows) {
            if (window.incognito && window.type === 'normal') {
                incognitoWindow = window;
                break;
            }
        }
    }*/
    if (incognitoWindow) {
        console.debug('openInIncognitoMode:incognitoWindow:windowId:', incognitoWindow.id);
        // tslint:disable-next-line: all
        browser.tabs.create({url, windowId: incognitoWindow.id});
    } else if (lastTab !== undefined && lastTab.incognito) {
        console.debug('openInIncognitoMode:lastTab:windowId:', lastTab.windowId);
        // tslint:disable-next-line: all
        browser.tabs.create({url, windowId: lastTab.windowId});
    } else {
        console.debug('openInIncognitoMode:browser.windows.create:incognito:true');
        // tslint:disable-next-line: all
        browser.windows.create({url, incognito: true});
    }
    if (tab !== undefined && tab.id !== undefined) {
        // tslint:disable-next-line: all
        browser.tabs.remove(tab.id);
        // browser.tabs.create({'url': 'about:blank'});
    } else if (lastTab !== undefined && lastTab.id !== undefined) {
        // tslint:disable-next-line: all
        browser.tabs.remove(lastTab.id);
    }
    console.debug('openInIncognitoMode:done');
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

/** check url and fix it, also open it in incognito mode if it is not allowed */
export const checkAndFix = (requestDetails: WebRequest.OnBeforeRequestDetailsType): WebRequest.BlockingResponse => {
    console.debug('checkAndFix:started');
    const url = requestDetails.url;
    if (!lastTab.incognito && !isTabAllowed(url)) {
        openInIncognitoMode(url);

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
    console.debug('checkAndFix:done');

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
