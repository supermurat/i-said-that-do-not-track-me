import { browser } from 'webextension-polyfill-ts';

/** open options button */
const openOptions: HTMLTextAreaElement | null = document.querySelector('#openOptions');

if (openOptions) {
    openOptions.addEventListener('click', e => {
        // tslint:disable-next-line: all
        browser.runtime.openOptionsPage();
    });
}
