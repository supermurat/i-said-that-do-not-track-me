import { browser, Tabs, WebRequest, Windows } from 'webextension-polyfill-ts';

/** last opened tab, actually it is current tab */
export let lastTab: Tabs.Tab;

/** open url in incognito mode */
export const openInIncognitoMode = (url: string, tab?: Tabs.Tab): void => {
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
        // tslint:disable-next-line: all
        browser.tabs.create({url, windowId: incognitoWindow.id});
    } else if (lastTab !== undefined && lastTab.incognito) {
        // tslint:disable-next-line: all
        browser.tabs.create({url, windowId: lastTab.windowId});
    } else {
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
    const forbiddenSites = [
        'news.google?\\.com'
    ];
    for (const forbiddenSite of forbiddenSites) {
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
    const allowedSites = [
        '(mozilla)\\.org',
        '(firefox|github|google|youtube)\\.com',
        '(google)\\.com.tr'
    ];
    let isAllowed = false;
    if (!url.startsWith('http') && !url.startsWith('ftp')) {
        console.log('Allowed Protocol:', url);
        isAllowed = true;
    } else {
        for (const allowedSite of allowedSites) {
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
