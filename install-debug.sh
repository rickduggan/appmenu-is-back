#!/bin/bash

#cd ..
#pwd
rm appmenu-is-back@rickduggan.shell-extension.zip
gnome-extensions pack appmenu-is-back
gnome-extensions uninstall appmenu-is-back@rickduggan
gnome-extensions install appmenu-is-back@rickduggan.shell-extension.zip
echo 'Alt+F2 r'
#read -p 'Alt+F2 r'
#gnome-extensions enable appmenu-is-back@rickduggan
