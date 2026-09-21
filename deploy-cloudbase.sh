#!/usr/bin/env bash
# CloudBase 静态托管部署脚本（国内访问稳定）
# 用法：bash deploy-cloudbase.sh
set -e

PROJ="D:/workbuddy/2026-09-18-10-01-59/1919-1949"
ENV_ID="workbuddy-d4g9xyztobd4d2920"
CLI="C:/Users/gentl/.workbuddy/binaries/node/cli-connector-packages/node_modules/@cloudbase/cli/bin/tcb"
NODE="C:/Users/gentl/.workbuddy/binaries/node/versions/22.22.2-3/node.exe"
TMP="$TEMP/cb-deploy-$$"

# 只上传站点文件：排除 .git / _test / hist / 本地工具脚本
rm -rf "$TMP"; mkdir -p "$TMP"
cp "$PROJ/index.html" "$TMP/"
cp -r "$PROJ/assets" "$PROJ/events" "$PROJ/docs" "$TMP/"

echo "=== 部署 $(find "$TMP" -type f 2>/dev/null | wc -l) 个文件 ==="
"$NODE" "$CLI" hosting deploy "$TMP" / -e "$ENV_ID"

rm -rf "$TMP"
echo "=== 完成 ==="
echo "线上地址：https://workbuddy-d4g9xyztobd4d2920-1474095971.tcloudbaseapp.com/"
