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
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (item.label && item.label.text === 'Open Windows') {
                openWindowsSection = item;
                log('AppMenu Debug: Found "Open Windows" section');
                break;
            }
        }
        
        if (!openWindowsSection) {
            log('AppMenu Debug: "Open Windows" section not found');
            return;
        }
        
        // Get the children of the "Open Windows" section
        let openWindowsItems = openWindowsSection.get_children();
        log(`AppMenu Debug: Found ${openWindowsItems.length} items in "Open Windows" section`);
        
        // Find the "Open Windows" label (it should be the first child)
        let openWindowsLabel = null;
        if (openWindowsItems.length > 0) {
            openWindowsLabel = openWindowsItems[0];
            log('AppMenu Debug: Found "Open Windows" label');
        }
        
        // Remove all items except the "Open Windows" label
        for (let i = openWindowsItems.length - 1; i > 0; i--) {
            openWindowsSection.remove_child(openWindowsItems[i]);
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
            // Try to get the app info from the app menu item
            if (appMenuItem.app) {
                appInfo = appMenuItem.app;
                log(`AppMenu Debug: Found app info from app menu item`);
            } else if (appMenuItem._app) {
                appInfo = appMenuItem._app;
                log(`AppMenu Debug: Found app info from _app property`);
            } else if (appMenuItem.appInfo) {
                appInfo = appMenuItem.appInfo;
                log(`AppMenu Debug: Found app info from appInfo property`);
            } else {
                // Try to find the app info in the menu
                if (menu.app) {
                    appInfo = menu.app;
                    log(`AppMenu Debug: Found app info from menu.app`);
                } else if (menu._app) {
                    appInfo = menu._app;
                    log(`AppMenu Debug: Found app info from menu._app`);
                } else if (menu.appInfo) {
                    appInfo = menu.appInfo;
                    log(`AppMenu Debug: Found app info from menu.appInfo`);
                }
            }
            
            if (appInfo) {
                log(`AppMenu Debug: App info found: ${appInfo.get_id()}`);
            } else {
                log('AppMenu Debug: Could not find app info');
                return;
            }
        } catch (e) {
            log(`AppMenu Debug: Error getting app info: ${e.message}`);
            log(`AppMenu Debug: Error stack: ${e.stack}`);
            return;
        }
        
        // Get all windows from the window manager
        let allWindows = [];
        try {
            let windowManager = global.window_manager;
            if (windowManager) {
                // Get the active workspace
                let activeWorkspace = global.workspace_manager.get_active_workspace();
                log(`AppMenu Debug: Active workspace: ${activeWorkspace.index()}`);
                
                // Get windows on the active workspace
                allWindows = activeWorkspace.list_windows();
                log(`AppMenu Debug: Window manager reports ${allWindows.length} windows on active workspace`);
                
                // Log all windows from the window manager
                log('AppMenu Debug: All windows from window manager:');
                for (let i = 0; i < allWindows.length; i++) {
                    let win = allWindows[i];
                    log(`  Window ${i}:`);
                    log(`    - Title: ${typeof win.get_title === 'function' ? win.get_title() : 'No title method'}`);
                    log(`    - Class: ${typeof win.get_wm_class === 'function' ? win.get_wm_class() : 'No class method'}`);
                }
            } else {
                log('AppMenu Debug: Could not access window manager');
            }
        } catch (e) {
            log(`AppMenu Debug: Error accessing window manager: ${e.message}`);
            log(`AppMenu Debug: Error stack: ${e.stack}`);
        }
        
        // Filter windows to only include those for the current application
        let appWindows = [];
        try {
            // Get the app ID from the app info
            let appId = appInfo.get_id();
            log(`AppMenu Debug: Looking for windows with app ID: ${appId}`);
            
            // Extract the base app name from the app ID (e.g., "firefox" from "firefox.desktop")
            let baseAppName = appId.split('.')[0];
            log(`AppMenu Debug: Base app name: ${baseAppName}`);
            
            // Try to find windows that match the app ID
            for (let win of allWindows) {
                try {
                    // Try different methods to get the window's app ID
                    let winAppId = null;
                    let winWmClass = null;
                    
                    // Method 1: Try to get the window's app ID from the window object
                    if (typeof win.get_app_id === 'function') {
                        winAppId = win.get_app_id();
                        log(`AppMenu Debug: Window app ID from get_app_id(): ${winAppId}`);
                    }
                    
                    // Method 2: Try to get the window's app ID from the window's properties
                    if (!winAppId && win.app_id) {
                        winAppId = win.app_id;
                        log(`AppMenu Debug: Window app ID from app_id property: ${winAppId}`);
                    }
                    
                    // Method 3: Try to get the window's WM class
                    if (typeof win.get_wm_class === 'function') {
                        winWmClass = win.get_wm_class();
                        log(`AppMenu Debug: Window WM class: ${winWmClass}`);
                    }
                    
                    // Check if the window belongs to the current application
                    let isMatch = false;
                    
                    // Check 1: Exact match with app ID
                    if (winAppId && winAppId === appId) {
                        isMatch = true;
                        log(`AppMenu Debug: Window app ID matches app ID exactly`);
                    }
                    
                    // Check 2: WM class matches base app name
                    if (!isMatch && winWmClass && winWmClass.toLowerCase() === baseAppName.toLowerCase()) {
                        isMatch = true;
                        log(`AppMenu Debug: Window WM class matches base app name`);
                    }
                    
                    // Check 3: WM class is a substring of app ID or vice versa
                    if (!isMatch && winWmClass) {
                        if (appId.includes(winWmClass) || winWmClass.includes(baseAppName)) {
                            isMatch = true;
                            log(`AppMenu Debug: Window WM class is related to app ID`);
                        }
                    }
                    
                    if (isMatch) {
                        appWindows.push(win);
                        log(`AppMenu Debug: Window belongs to current application`);
                    } else {
                        log(`AppMenu Debug: Window does not belong to current application`);
                    }
                } catch (e) {
                    log(`AppMenu Debug: Error checking window app: ${e.message}`);
                }
            }
            
            log(`AppMenu Debug: Found ${appWindows.length} windows for current application`);
        } catch (e) {
            log(`AppMenu Debug: Error filtering windows: ${e.message}`);
            log(`AppMenu Debug: Error stack: ${e.stack}`);
        }
        
        // Sort windows by title
        appWindows.sort((a, b) => {
            let titleA = typeof a.get_title === 'function' ? a.get_title() : '';
            let titleB = typeof b.get_title === 'function' ? b.get_title() : '';
            
            log(`AppMenu Debug: Comparing "${titleA}" with "${titleB}"`);
            
            // Function to extract numbers from start of string
            const getLeadingNumber = (str) => {
                const match = str.match(/^[0-9]+/);
                const result = match ? parseInt(match[0]) : null;
                log(`AppMenu Debug: Leading number for "${str}" is ${result}`);
                return result;
            };
            
            // Function to clean string for sorting
            const cleanString = (str) => {
                const cleaned = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                log(`AppMenu Debug: Cleaned string "${str}" to "${cleaned}"`);
                return cleaned;
            };
            
            // Check for leading numbers first
            const numA = getLeadingNumber(titleA);
            const numB = getLeadingNumber(titleB);
            
            if (numA !== null && numB !== null) {
                log(`AppMenu Debug: Comparing numbers ${numA} and ${numB}`);
                return numA - numB;
            } else if (numA !== null) {
                log(`AppMenu Debug: ${titleA} has number, ${titleB} doesn't`);
                return -1;
            } else if (numB !== null) {
                log(`AppMenu Debug: ${titleB} has number, ${titleA} doesn't`);
                return 1;
            }
            
            // If no numbers, sort alphabetically ignoring special characters
            const result = cleanString(titleA).localeCompare(cleanString(titleB));
            log(`AppMenu Debug: Comparing cleaned strings, result: ${result}`);
            return result;
        });
        
        // Create menu items for each window
        log('AppMenu Debug: Creating menu items for windows');
        
        // Create menu items for each window
        for (let win of appWindows) {
            try {
                let title = typeof win.get_title === 'function' ? win.get_title() : '';
                log(`AppMenu Debug: Creating menu item for window: "${title}"`);
                
                // Create a menu item using the PopupMenu module
                let menuItem = new PopupMenu.PopupMenuItem(title);
                
                // Connect the activate signal to focus the window
                menuItem.connect('activate', () => {
                    log(`AppMenu Debug: Activating window: "${title}"`);
                    win.activate(global.get_current_time());
                });
                
                // Add the menu item directly to the section
                menu.addMenuItem(menuItem, menu._getMenuItems().indexOf(openWindowsSection) + 1);
                log(`AppMenu Debug: Added menu item to menu: "${title}"`);
            } catch (e) {
                log(`AppMenu Debug: Error creating menu item: ${e.message}`);
                log(`AppMenu Debug: Error stack: ${e.stack}`);
            }
        }
        
        log('AppMenu Debug: Finished adding windows to menu');
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
