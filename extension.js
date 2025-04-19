//    App Menu Is Back
//    GNOME Shell extension
//    @fthx 2025


import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';


export default class AppMenuIsBackExtension {
    _sortMenuItems(menu) {
        // Get all window items
        let windowItems = [];
        let items = menu._getMenuItems();
        
        log('AppMenu Debug: Starting to collect window items');
        
        // Collect window items and remove them from menu
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (item.window) {
                let title = item.window.get_title();
                log(`AppMenu Debug: Found window with title: "${title}"`);
                windowItems.push(item);
                item.destroy(); // Remove from menu
            }
        }

        log(`AppMenu Debug: Found ${windowItems.length} windows total`);

        // Sort window items by title
        windowItems.sort((a, b) => {
            let titleA = a.window.get_title() || '';
            let titleB = b.window.get_title() || '';
            
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

        log('AppMenu Debug: Finished sorting, adding items back to menu');
        
        // Add sorted items back to menu
        for (let item of windowItems) {
            log(`AppMenu Debug: Adding window "${item.window.get_title()}" to menu`);
            menu.addMenuItem(item);
        }
    }

    enable() {
        log('Extension enabled!');  // Test log
        if (!Main.sessionMode.panel.left.includes('appMenu')) {
            Main.sessionMode.panel.left.push('appMenu');
            Main.panel._updatePanel();
            
            // Get the app menu
            const appMenu = Main.panel.statusArea.appMenu;
            if (appMenu && appMenu.menu) {
                // Store original updateWindowList function
                this._originalUpdateWindowList = appMenu.menu._updateWindowList;
                
                // Override updateWindowList with our sorted version
                appMenu.menu._updateWindowList = () => {
                    this._originalUpdateWindowList.call(appMenu.menu);
                    this._sortMenuItems(appMenu.menu);
                };
            }

            Main.panel.statusArea.appMenu._container.remove_child(
                Main.panel.statusArea.appMenu._spinner
            );
        }

        this._shiftPlacesMenu();
    }

    disable() {
        if (Main.sessionMode.panel.left.includes('appMenu')) {
            // Restore original updateWindowList function
            const appMenu = Main.panel.statusArea.appMenu;
            if (appMenu && appMenu.menu && this._originalUpdateWindowList) {
                appMenu.menu._updateWindowList = this._originalUpdateWindowList;
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
