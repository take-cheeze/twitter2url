#!/usr/bin/env sh

for i in $(cat *.txt | sort | uniq | grep -v "shindanmaker.com" | grep -v "foursquare.com" | grep -v "30thou.com"); do open -a "Google Chrome Canary" $i; done
