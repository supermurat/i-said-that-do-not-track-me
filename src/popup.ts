
/** test */
const leftPadForm = document.getElementById('leftpad-form');
/** test */
const padBG = document.getElementById('pad-bg');

if (leftPadForm && padBG) {
    leftPadForm.addEventListener(
        'submit',
        e => {
            e.preventDefault();

            console.log('padding');
            // resultNode.value = textNode.value;
        },
        false);

    padBG.addEventListener('click', e => {
        console.log('click');
    });
}
