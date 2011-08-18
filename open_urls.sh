#!/usr/bin/env sh

for i in $(cat *.txt | sort | uniq | grep -v "shindanmaker.com" | grep -v "foursquare.com" | grep -v "30thou.com" | grep -v "amazon.co.jp" | grep -v "nicovideo.jp/" | grep -v "youtube.com" | grep -v "gigazine.net"); do open -a "Google Chrome Canary" $i; done
