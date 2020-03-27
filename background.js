let lastTab = undefined;

const browser = chrome ? chrome : browser;

const openInIncognitoMode = function (url, tab) {
    console.debug('openInIncognitoMode:started');
    let incognitoWindow = undefined;
    if (browser.windows.getAll()) {
        for (const window of browser.windows.getAll()) {
            if (window.incognito && window.type === 'normal') {
                incognitoWindow = window;
                break;
            }
        }
    }
    if (incognitoWindow) {
        browser.tabs.create({"url": url, windowId: incognitoWindow.id});
    } else if (lastTab && lastTab.incognito) {
        browser.tabs.create({"url": url, windowId: lastTab.windowId});
    } else {
        browser.windows.create({"url": url, "incognito": true});
    }
    if (tab && tab.id) {
        browser.tabs.remove(tab.id);
        // browser.tabs.create({"url": "about:blank"});
    } else if (lastTab) {
        browser.tabs.remove(lastTab.id);
    }
    console.debug('openInIncognitoMode:done');
};

const isTabAllowed = function (tab) {
    const forbiddenSites = [
        'news.google?\\.com'
    ];
    for (const forbiddenSite of forbiddenSites) {
        if (new RegExp(
            "^http(s)?:\\/\\/(www\\.)?([-a-zA-Z0-9@:%_\+.~#?&/=]*)" +
            forbiddenSite +
            "([-a-zA-Z0-9@:%_\+.~#?&/=]*)", "gui")
            .test(tab.url)) {
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
    if (!tab.url.startsWith('http') && !tab.url.startsWith('ftp')) {
        console.log('Allowed Protocol:', tab.url);
        isAllowed = true;
    } else {
        for (const allowedSite of allowedSites) {
            if (new RegExp(
                "^http(s)?:\\/\\/(www\\.)?([-a-zA-Z0-9@:%_\+.~#?&/=]*)" +
                allowedSite +
                "([-a-zA-Z0-9@:%_\+.~#?&/=]*)", "gui")
                .test(tab.url)) {
                console.log('Allowed Site:', allowedSite, tab.url);
                isAllowed = true;
                break;
            }
        }
        if (!isAllowed) {
            console.log('Disallowed URL:', tab.url);
        }
    }

    return isAllowed;
};

const checkAndFix = function (requestDetails) {
    console.debug('checkAndFix:started');
    const url = requestDetails.url;
    const tab = {url, id: undefined};
    if (!lastTab.incognito && !isTabAllowed(tab)) {
        openInIncognitoMode(url, tab);
        console.debug('checkAndFix:openedInIncognitoMode', url);
        return {cancel: true};
    }
    if (url.indexOf('?') < url.indexOf('utm_')) {
        const fixedURL = url
            .replace(/\?utm_([-a-zA-Z0-9@:%_\+.~#?/=]*)/gui, '?')
            .replace(/&utm_([-a-zA-Z0-9@:%_\+.~#?/=]*)/gui, '');
        if (fixedURL !== url) {
            console.debug('checkAndFix:fixedURL', fixedURL);
            return {redirectUrl: fixedURL};
        }
    }
    console.debug('checkAndFix:done');
};

browser.webRequest.onBeforeRequest.addListener(
    checkAndFix,
    {urls: ["<all_urls>"], types: ['main_frame']},
    ['blocking']
);

browser.tabs.onCreated.addListener(function (tab) {
    lastTab = tab;
});
