#!/usr/bin/env sh

cat *.txt | sort | uniq > tmp.txt

# exclude some pattern
for i in \
    "30thou\.com" \
    "agilecat\.tumblr\.com" \
    "ataru-mix\.tumblr\.com" \
    "fanfou\.com" \
    "firela\.biz" \
    "foursquare\.com" \
    "hexe\.tumblr\.com" \
    "motomocomo\.tumblr\.com" \
    "odiva\.jp" \
    "paper\.li" \
    "shibats\.tumblr\.com" \
    "shindanmaker\.com" \
    ;
do
    grep -v $i tmp.txt > tmp_dst.txt
    cat tmp_dst.txt > tmp.txt
done

# open with Google Chrome Canary
counter=0
interval=30

for i in $(cat tmp.txt); do
    if [ `expr $counter % $interval` = 0 ] ; then
        echo "Open item $counter - $(expr $counter + $interval) (`wc tmp.txt`):"
        read
    fi
    open -a "Google Chrome Canary" $i
    counter=$(expr $counter + 1)
done
