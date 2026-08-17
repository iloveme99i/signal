#!/bin/zsh

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
export ALL_PROXY="socks5h://127.0.0.1:7898"
export all_proxy="socks5h://127.0.0.1:7898"
export PATH="/Users/belief/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "/Users/belief/Documents/工作/signal" || exit 1
exec "/Users/belief/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node" "/usr/local/lib/node_modules/npm/bin/npm-cli.js" run dev -- --port 3001
