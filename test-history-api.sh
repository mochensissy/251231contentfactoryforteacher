#!/bin/bash

echo "=== 测试历史记录API ==="

echo ""
echo "1. 测试GET /api/analysis-tasks (获取历史列表)"
curl -s http://localhost:3000/api/analysis-tasks?limit=5 | jq '.'

echo ""
echo "2. 测试GET /api/analysis-tasks/1 (获取单条记录)"
curl -s http://localhost:3000/api/analysis-tasks/1 | jq '.success, .error' 2>/dev/null || echo "请求失败或数据格式错误"

echo ""
echo "测试完成"
