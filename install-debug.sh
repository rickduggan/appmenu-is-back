#!/bin/bash
set -e

cd "$(dirname "$0")"
gnome-extensions pack --force --extra-source=appMenuButton.js .
gnome-extensions install --force appmenu-is-back@rickduggan.shell-extension.zip
rm appmenu-is-back@rickduggan.shell-extension.zip
gnome-extensions enable appmenu-is-back@rickduggan
echo 'Installed. Log out and back in to load the new version.'
