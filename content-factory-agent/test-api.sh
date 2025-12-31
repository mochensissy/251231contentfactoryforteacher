#!/bin/bash

# 选题分析API测试脚本

echo "======================================"
echo "  内容工厂 Agent - 选题分析API测试"
echo "======================================"
echo ""

# 测试1: 获取公众号文章
echo "测试1: 获取公众号文章"
echo "关键词: AI"
echo ""

curl -X POST http://localhost:3000/api/wechat-articles \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "AI",
    "page": 1,
    "period": 7
  }' \
  -s | jq '.' || echo "请安装 jq: brew install jq"

echo ""
echo "======================================"
echo ""

# 如果需要测试分析API，取消下面的注释
# echo "测试2: 分析文章数据"
# echo ""
#
# # 这里需要先从测试1获取真实的文章数据
# curl -X POST http://localhost:3000/api/analyze \
#   -H "Content-Type: application/json" \
#   -d '{
#     "articles": [...]
#   }' \
#   -s | jq '.'
