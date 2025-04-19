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
        
        // Find or create the "Open Windows" section
        let openWindowsSection = null;
        let openWindowsLabel = null;
        
        // First try to find existing section
        for (let item of items) {
            if (item.label && item.label.text === 'Open Windows') {
                openWindowsLabel = item;
                // The section should be the next item
                let idx = items.indexOf(item);
                if (idx >= 0 && idx + 1 < items.length) {
                    openWindowsSection = items[idx + 1];
                }
                break;
            }
        }
        
        // If we didn't find the section, create it
        if (!openWindowsSection) {
            log('AppMenu Debug: Creating new Open Windows section');
            if (!openWindowsLabel) {
                openWindowsLabel = new PopupMenu.PopupMenuItem('Open Windows', { reactive: false });
                menu.addMenuItem(openWindowsLabel);
            }
            openWindowsSection = new PopupMenu.PopupMenuSection();
            menu.addMenuItem(openWindowsSection);
        }
        
        // Get the app info from the menu
        let appInfo = menu._app;
        if (!appInfo) {
            log('AppMenu Debug: Could not find app info');
            return;
        }
        log(`AppMenu Debug: App info found: ${appInfo.get_id()}`);
        
        // Get all windows from the window manager
        let appWindows = [];
        try {
            let windowManager = global.window_manager;
            if (windowManager) {
                let activeWorkspace = global.workspace_manager.get_active_workspace();
                let allWindows = activeWorkspace.list_windows();
                log(`AppMenu Debug: Window manager reports ${allWindows.length} windows on active workspace`);
                
                // Filter windows for this application
                let baseAppName = appInfo.get_id().split('.')[0];
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
            }
        } catch (e) {
            log(`AppMenu Debug: Error accessing window manager: ${e.message}`);
            return;
        }
        
        log(`AppMenu Debug: Found ${appWindows.length} windows for current application`);
        
        // Sort windows by title
        appWindows.sort((a, b) => {
            let titleA = typeof a.get_title === 'function' ? a.get_title() : '';
            let titleB = typeof b.get_title === 'function' ? b.get_title() : '';

            // Special case: plain "Mozilla Firefox" should come first
            if (titleA === 'Mozilla Firefox') return -1;
            if (titleB === 'Mozilla Firefox') return 1;

            // Remove emoji and other special characters for sorting
            const cleanTitle = (title) => {
                // Remove emoji and other special characters but keep spaces and standard punctuation
                return title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
                    .replace(/^[^a-zA-Z0-9]+/, '') // Remove leading special characters
                    .trim();
            };

            let cleanA = cleanTitle(titleA);
            let cleanB = cleanTitle(titleB);

            return cleanA.localeCompare(cleanB);
        });
        
        // Clear existing items in the section
        openWindowsSection.removeAll();
        
        // Add window items to the section
        log('AppMenu Debug: Creating menu items for windows');
        for (let win of appWindows) {
            try {
                let title = typeof win.get_title === 'function' ? win.get_title() : '';
                log(`AppMenu Debug: Creating menu item for window: "${title}"`);
                
                let menuItem = new PopupMenu.PopupMenuItem(title);
                menuItem.connect('activate', () => {
                    win.activate(global.get_current_time());
                });
                
                openWindowsSection.addMenuItem(menuItem);
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
