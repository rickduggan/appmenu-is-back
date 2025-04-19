//    App Menu Is Back
//    GNOME Shell extension
//    @fthx 2025


import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';

export default class AppMenuIsBackExtension {
    _sortMenuItems(menu) {
        // Get all menu items
        let items = menu._getMenuItems();
        log('AppMenu Debug: Starting to collect window items');
        log(`AppMenu Debug: Total menu items found: ${items.length}`);
        
        // Find the "Open Windows" section
        let openWindowsSection = null;
        let openWindowsIndex = -1;
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (item.label && item.label.text === 'Open Windows') {
                openWindowsSection = item;
                openWindowsIndex = i;
                log('AppMenu Debug: Found "Open Windows" section');
                break;
            }
        }
        
        if (!openWindowsSection) {
            log('AppMenu Debug: "Open Windows" section not found');
            return;
        }

        // Store the original items after the "Open Windows" section
        let itemsToRemove = [];
        for (let i = openWindowsIndex + 1; i < items.length; i++) {
            itemsToRemove.push(items[i]);
        }
        
        // Find the app menu item that corresponds to the current application
        let appMenuItem = null;
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (item.label && item.label.text && item.label.text !== 'Open Windows') {
                appMenuItem = item;
                log(`AppMenu Debug: Found app menu item: "${item.label.text}"`);
                break;
            }
        }
        
        if (!appMenuItem) {
            log('AppMenu Debug: Could not find app menu item');
            return;
        }
        
        // Get the app info from the app menu item
        let appInfo = null;
        try {
            if (menu._app) {
                appInfo = menu._app;
                log(`AppMenu Debug: Found app info from menu._app`);
            }
            
            if (appInfo) {
                log(`AppMenu Debug: App info found: ${appInfo.get_id()}`);
            } else {
                log('AppMenu Debug: Could not find app info');
                return;
            }
        } catch (e) {
            log(`AppMenu Debug: Error getting app info: ${e.message}`);
            return;
        }
        
        // Get all windows from the window manager
        let allWindows = [];
        try {
            let windowManager = global.window_manager;
            if (windowManager) {
                let activeWorkspace = global.workspace_manager.get_active_workspace();
                allWindows = activeWorkspace.list_windows();
                log(`AppMenu Debug: Window manager reports ${allWindows.length} windows on active workspace`);
            }
        } catch (e) {
            log(`AppMenu Debug: Error accessing window manager: ${e.message}`);
            return;
        }
        
        // Filter windows to only include those for the current application
        let appWindows = [];
        try {
            let appId = appInfo.get_id();
            let baseAppName = appId.split('.')[0];
            
            for (let win of allWindows) {
                try {
                    let winWmClass = typeof win.get_wm_class === 'function' ? win.get_wm_class() : '';
                    if (winWmClass && winWmClass.toLowerCase() === baseAppName.toLowerCase()) {
                        appWindows.push(win);
                        log(`AppMenu Debug: Found matching window: ${win.get_title()}`);
                    }
                } catch (e) {
                    log(`AppMenu Debug: Error checking window: ${e.message}`);
                }
            }
            
            log(`AppMenu Debug: Found ${appWindows.length} windows for current application`);
        } catch (e) {
            log(`AppMenu Debug: Error filtering windows: ${e.message}`);
            return;
        }
        
        // Sort windows by title
        appWindows.sort((a, b) => {
            let titleA = typeof a.get_title === 'function' ? a.get_title() : '';
            let titleB = typeof b.get_title === 'function' ? b.get_title() : '';
            return titleA.localeCompare(titleB);
        });

        // Remove old window items
        for (let item of itemsToRemove) {
            item.destroy();
        }
        
        // Create menu items for each window
        log('AppMenu Debug: Creating menu items for windows');
        for (let win of appWindows) {
            try {
                let title = typeof win.get_title === 'function' ? win.get_title() : '';
                log(`AppMenu Debug: Creating menu item for window: "${title}"`);
                
                let menuItem = new PopupMenu.PopupMenuItem(title);
                menuItem.connect('activate', () => {
                    win.activate(global.get_current_time());
                });
                
                menu.addMenuItem(menuItem, openWindowsIndex + 1);
                log(`AppMenu Debug: Added menu item: "${title}"`);
            } catch (e) {
                log(`AppMenu Debug: Error creating menu item: ${e.message}`);
            }
        }
    }

    enable() {
        log('AppMenu Extension enabled!');  // Test log
        if (!Main.sessionMode.panel.left.includes('appMenu')) {
            log('AppMenu Debug: Adding app menu to session mode');
            Main.sessionMode.panel.left.push('appMenu');
            Main.panel._updatePanel();
            
            // Get the app menu
            const appMenu = Main.panel.statusArea.appMenu;
            log('AppMenu Debug: Checking app menu initialization');
            if (appMenu && appMenu.menu) {
                log('AppMenu Debug: App menu found');
                
                // Connect to the menu's open signal
                this._menuOpenId = appMenu.menu.connect('open-state-changed', (menu, isOpen) => {
                    if (isOpen) {
                        log('AppMenu Debug: Menu opened, sorting items');
                        this._sortMenuItems(menu);
                    }
                });
                
                // Initial sort
                log('AppMenu Debug: Performing initial sort');
                this._sortMenuItems(appMenu.menu);
            } else {
                log('AppMenu Debug: App menu or menu not found');
            }

            Main.panel.statusArea.appMenu._container.remove_child(
                Main.panel.statusArea.appMenu._spinner
            );
        }
        log('AppMenu Debug: App menu added to session mode');
        this._shiftPlacesMenu();
    }

    disable() {
        if (Main.sessionMode.panel.left.includes('appMenu')) {
            // Disconnect the signal if we connected it
            if (this._menuOpenId) {
                const appMenu = Main.panel.statusArea.appMenu;
                if (appMenu && appMenu.menu) {
                    appMenu.menu.disconnect(this._menuOpenId);
                }
                this._menuOpenId = null;
            }

            Main.sessionMode.panel.left.pop();
            Main.panel._updatePanel();

            Main.panel.statusArea.appMenu._container.add_child(
                Main.panel.statusArea.appMenu._spinner
            );
            Main.panel.statusArea.appMenu?.destroy();
        }

        this._shiftPlacesMenu();

        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
    }

    _shiftPlacesMenu() {
        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            let placesIndicator = Main.panel.statusArea['places-menu'];

            if (placesIndicator) {
                Main.panel._leftBox.remove_child(placesIndicator.container);
                Main.panel._leftBox.insert_child_at_index(placesIndicator.container, 1);
            }

            this._timeout = null;
            return GLib.SOURCE_REMOVE;
        });
    }
}
