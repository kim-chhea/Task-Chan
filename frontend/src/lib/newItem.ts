/** Any screen can open the "New item" dialog (it is mounted once, in AppLayout). */
const EVENT = 'worktracker:new-item';

export const openNewItem = () => window.dispatchEvent(new Event(EVENT));

export function onOpenNewItem(cb: () => void) {
    window.addEventListener(EVENT, cb);
    return () => window.removeEventListener(EVENT, cb);
}
