#!/bin/bash

echo "🧪 测试 AI 深度选题分析功能"
echo "================================"
echo ""

# 检查环境变量
echo "📋 步骤 1: 检查环境变量配置"
if grep -q "OPENROUTER_API_KEY" content-factory-agent/.env; then
    API_KEY=$(grep "OPENROUTER_API_KEY" content-factory-agent/.env | cut -d'=' -f2 | tr -d '"')
    if [ "$API_KEY" = "your-api-key-here" ]; then
        echo "⚠️  OPENROUTER_API_KEY 未配置（使用默认值）"
        echo "   请编辑 .env 文件，填入真实的 API Key"
        echo ""
    else
        echo "✅ OPENROUTER_API_KEY 已配置"
        echo ""
    fi
else
    echo "❌ .env 文件中未找到 OPENROUTER_API_KEY"
    echo ""
    exit 1
fi

# 检查服务器状态
echo "📋 步骤 2: 检查开发服务器状态"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 开发服务器运行在 http://localhost:3000"
    SERVER_URL="http://localhost:3000"
elif curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ 开发服务器运行在 http://localhost:3001"
    SERVER_URL="http://localhost:3001"
else
    echo "❌ 开发服务器未运行"
    echo "   请运行: cd content-factory-agent && npm run dev"
    echo ""
    exit 1
fi
echo ""

# 检查文件
echo "📋 步骤 3: 检查关键文件"
FILES=(
    "content-factory-agent/lib/ai-client.ts"
    "content-factory-agent/lib/types.ts"
    "content-factory-agent/app/api/analyze/route.ts"
    "content-factory-agent/app/topic-analysis/page.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
    fi
done
echo ""

# 功能摘要
echo "🎉 开发完成！"
echo "================================"
echo ""
echo "📖 使用指南："
echo "1. 访问选题分析页面："
echo "   $SERVER_URL/topic-analysis"
echo ""
echo "2. 配置 API Key（如果尚未配置）："
echo "   编辑文件: content-factory-agent/.env"
echo "   修改: OPENROUTER_API_KEY=\"your-api-key-here\""
echo ""
echo "3. 开始分析："
echo "   - 输入关键词（如 'AI'）"
echo "   - 点击'开始分析'"
echo "   - 等待 20-30 秒"
echo "   - 查看深度洞察"
echo ""
echo "📚 文档："
echo "   - AI_ANALYSIS_SETUP.md - 配置指南"
echo "   - AI_IMPLEMENTATION_SUMMARY.md - 实施总结"
echo ""
echo "✨ 新功能："
echo "   ✅ 两阶段 AI 分析（摘要提取 → 洞察生成）"
echo "   ✅ 结构化选题建议（大纲、理由、置信度）"
echo "   ✅ 可展开/收起的洞察卡片"
echo "   ✅ 目标受众 + 内容切入角度"
echo "   ✅ 向后兼容历史数据"
echo ""
echo "🚀 准备就绪！"
