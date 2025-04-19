//    App Menu Is Back
//    GNOME Shell extension
//    @fthx 2025


import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppMenu from 'resource:///org/gnome/shell/ui/appMenu.js';


export default class AppMenuIsBackExtension {
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

    _createSortedAppMenu() {
        // Create our sorted version of AppMenu
        const SortedAppMenu = GObject.registerClass(
        class SortedAppMenu extends AppMenu.AppMenu {
            _updateWindowList() {
                // First call parent's _updateWindowList to populate items
                super._updateWindowList();
                
                // Get all window items
                let windowItems = [];
                let items = this._getMenuItems();
                for (let i = 0; i < items.length; i++) {
                    let item = items[i];
                    // Only collect window items (skip separators and other items)
                    if (item.window) {
                        windowItems.push(item);
                        item.destroy(); // Remove from menu
                    }
                }

                // Sort window items
                windowItems.sort((a, b) => {
                    let titleA = a.window.get_title() || '';
                    let titleB = b.window.get_title() || '';
                    
                    // Function to extract numbers from start of string
                    const getLeadingNumber = (str) => {
                        const match = str.match(/^[0-9]+/);
                        return match ? parseInt(match[0]) : null;
                    };
                    
                    // Function to clean string for sorting
                    const cleanString = (str) => {
                        return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    };
                    
                    // Check for leading numbers first
                    const numA = getLeadingNumber(titleA);
                    const numB = getLeadingNumber(titleB);
                    
                    if (numA !== null && numB !== null) {
                        return numA - numB;
                    } else if (numA !== null) {
                        return -1;
                    } else if (numB !== null) {
                        return 1;
                    }
                    
                    // If no numbers, sort alphabetically ignoring special characters
                    return cleanString(titleA).localeCompare(cleanString(titleB));
                });

                // Add sorted items back to menu
                for (let item of windowItems) {
                    this.addMenuItem(item);
                }
            }
        });
        return SortedAppMenu;
    }

    enable() {
        if (!Main.sessionMode.panel.left.includes('appMenu')) {
            // Create and register our sorted app menu
            const SortedAppMenu = this._createSortedAppMenu();
            
            // Replace the standard AppMenu with our sorted version
            const originalAppMenu = Main.panel.statusArea.appMenu;
            if (originalAppMenu) {
                // Store original menu for restoration
                this._originalMenu = originalAppMenu.menu;
                // Create our sorted menu
                const sortedMenu = new SortedAppMenu(originalAppMenu);
                // Replace the menu
                originalAppMenu.setMenu(sortedMenu);
            }

            // Continue with normal enable process
            Main.sessionMode.panel.left.push('appMenu');
            Main.panel._updatePanel();
            Main.panel.statusArea.appMenu._container.remove_child(Main.panel.statusArea.appMenu._spinner);
        }

        this._shiftPlacesMenu();
    }

    disable() {
        if (Main.sessionMode.panel.left.includes('appMenu')) {
            // Restore original menu if we modified it
            if (this._originalMenu) {
                const appMenu = Main.panel.statusArea.appMenu;
                if (appMenu) {
                    appMenu.setMenu(this._originalMenu);
                }
            }
            Main.sessionMode.panel.left.pop();
            Main.panel._updatePanel();

            Main.panel.statusArea.appMenu._container.add_child(Main.panel.statusArea.appMenu._spinner);
            Main.panel.statusArea.appMenu?.destroy();
        }

        this._shiftPlacesMenu();

        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
    }
}
