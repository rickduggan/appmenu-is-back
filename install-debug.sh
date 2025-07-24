#!/bin/bash

cd ..
pwd
rm appmenu-is-back@rickduggan.shell-extension.zip
gnome-extensions pack --force appmenu-is-back@rickduggan 
gnome-extensions uninstall appmenu-is-back@rickduggan
gnome-extensions install --force appmenu-is-back@rickduggan.shell-extension.zip
echo 'Alt+F2 r'
#read -p 'Alt+F2 r'
#gnome-extensions enable appmenu-is-back@rickduggan
cd appmenu-is-back@rickduggan
