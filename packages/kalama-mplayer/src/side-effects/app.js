import { shutdown, stepBack, stepForward, togglePause } from '../ducks/tracks';

let screen;
export const appSetScreen = s => {
    //TODO: unsubscribe from keybindibgs if screen already exists
    screen = s;
};

export const appKeyboardInit = dispatch => {
    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
        dispatch(shutdown());
    });

    screen.key(['left'], function(ch, key) {
        dispatch(stepBack());
    });

    screen.key(['right'], function(ch, key) {
        dispatch(stepForward());
    });

    screen.key(['space'], function(ch, key) {
        dispatch(togglePause());
    });
};

export const appExit = () => {
    process.exit(0);
};
