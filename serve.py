#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""站点服务入口 —— 替代平台默认的 `python3 -m http.server`

【为什么需要它】2026-09-23 定案
  平台默认用 `python3 -m http.server` 提供静态文件，它**不发任何 Cache-Control**。
  上游 EdgeOne（响应头 `Server: CloudStudio Gateway`）对没有缓存指令的响应套用
  默认策略 → **连 HTML 一起缓存**，并且**重新部署不会失效该缓存**。
  实测：裸地址 `/` 一直返回 20 小时前的副本（`Eo-Cache-Status: HIT` +
  `Last-Modified` 停在上一版），而带任意 query 的请求会回源拿新版。
  表面症状就是「每次发布，裸地址都要等很久才更新，必须手动加 ?v=」。

【本服务只做一件事】
  给 **HTML 发 no-cache**（裸地址每次回源 → 永远最新）
  给 **带版本号的静态资源发长缓存**（它们的引用都带 ?v=<BUILD>，发布即换 URL）

【为什么不担心跑崩】
  结构与 `python -m http.server` 完全一致（同一个 SimpleHTTPRequestHandler +
  ThreadingHTTPServer，同端口同绑定），只多发了几个响应头。
  连"不支持 Range"这个特性都保持一致，因此音频等资源行为不会变化。

本地自测：
    PORT=8899 python serve.py
    curl -sI http://127.0.0.1:8899/index.html | grep -i cache-control
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))

HTML_EXT = ('.html', '.htm')
ASSET_EXT = ('.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico',
             '.css', '.js', '.mp3', '.wav', '.m4a', '.mp4', '.webm',
             '.woff', '.woff2', '.ttf', '.otf', '.json', '.txt')


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split('?')[0].split('#')[0]
        low = path.lower()

        if low.endswith(HTML_EXT) or path.endswith('/'):
            # 页面：一律不缓存。这一行就是「每次发布裸地址立即生效」的关键。
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        elif low.endswith(ASSET_EXT):
            # 资源：可长缓存（引用带 ?v=<BUILD>，构建号一变就是新 URL）
            self.send_header('Cache-Control', 'public, max-age=604800')
        else:
            self.send_header('Cache-Control', 'no-cache')

        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))


def main():
    port = int(os.environ.get('PORT') or 3000)
    os.chdir(ROOT)
    ThreadingHTTPServer.allow_reuse_address = True
    with ThreadingHTTPServer(('0.0.0.0', port), Handler) as httpd:
        sys.stderr.write('serving %s on 0.0.0.0:%d\n' % (ROOT, port))
        httpd.serve_forever()


if __name__ == '__main__':
    main()
