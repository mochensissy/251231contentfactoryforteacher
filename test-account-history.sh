#!/bin/bash

echo "🧪 测试公众号历史分析功能"
echo "================================"
echo ""

# 测试1: 获取公众号历史文章
echo "📋 测试1: 获取公众号历史文章（通过名称）"
echo "-----------------------------------"
curl -s -X POST http://localhost:3000/api/wechat-articles/history \
  -H "Content-Type: application/json" \
  -d '{
    "name": "36氪",
    "page": 1
  }' | jq -r '.success, .data.mpInfo.nickname, .data.top20 | length'

echo ""
echo ""

# 测试2: 分析API（准备数据）
echo "📊 测试2: 准备测试数据"
echo "-----------------------------------"

# 先获取文章数据
ARTICLES=$(curl -s -X POST http://localhost:3000/api/wechat-articles/history \
  -H "Content-Type: application/json" \
  -d '{
    "name": "人民日报",
    "page": 1
  }' | jq -c '.data.top20[:5]')

MP_NAME=$(echo $ARTICLES | jq -r '.[0].wx_name // "测试公众号"')

echo "✅ 获取到 $(echo $ARTICLES | jq '. | length') 篇文章"
echo "✅ 公众号名称: $MP_NAME"
echo ""
echo ""

# 测试3: 保存分析任务（包含新字段）
echo "💾 测试3: 保存分析任务（包含新字段）"
echo "-----------------------------------"

curl -s -X POST http://localhost:3000/api/analysis-tasks \
  -H "Content-Type: application/json" \
  -d "{
    \"keyword\": \"$MP_NAME\",
    \"sourceType\": \"account_history\",
    \"mpName\": \"$MP_NAME\",
    \"mpGhid\": \"test_ghid_123\",
    \"articles\": $ARTICLES,
    \"analysisResult\": {
      \"topLikesArticles\": [],
      \"topEngagementArticles\": [],
      \"wordCloud\": [],
      \"insights\": []
    }
  }" | jq '.success, .data'

echo ""
echo ""

# 测试4: 查看历史记录列表（验证新字段返回）
echo "📜 测试4: 查看历史记录列表"
echo "-----------------------------------"
curl -s http://localhost:3000/api/analysis-tasks?limit=3 | jq '.data[] | {id, keyword, sourceType, mpName, totalArticles}'

echo ""
echo ""
echo "✅ 所有测试完成！"
