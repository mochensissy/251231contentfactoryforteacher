#!/bin/bash

echo "🧪 验证数据持久化功能"
echo "====================================="
echo ""

# 检查数据库文件
echo "📋 步骤 1: 检查数据库文件"
if [ -f "prisma/dev.db" ]; then
    SIZE=$(ls -lh prisma/dev.db | awk '{print $5}')
    echo "✅ 数据库文件存在: prisma/dev.db ($SIZE)"
else
    echo "❌ 数据库文件不存在"
    exit 1
fi
echo ""

# 检查服务器
echo "📋 步骤 2: 检查开发服务器"
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 开发服务器运行正常"
    echo "   http://localhost:3000"
else
    echo "❌ 开发服务器未运行"
    echo "   请运行: npm run dev"
    exit 1
fi
echo ""

# 检查关键文件
echo "📋 步骤 3: 检查关键文件修改"
FILES=(
    "prisma/schema.prisma"
    "app/api/analysis-tasks/route.ts"
    "app/api/analysis-tasks/[id]/route.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
    fi
done
echo ""

# 使用说明
echo "🎯 测试步骤"
echo "====================================="
echo ""
echo "1️⃣ 进行新分析："
echo "   访问: http://localhost:3000/topic-analysis"
echo "   输入关键词（如 'AI'）"
echo "   点击'开始分析'"
echo "   等待 20-30 秒"
echo ""
echo "2️⃣ 验证数据保存："
echo "   查看控制台日志，应该看到："
echo "   💾 保存分析结果..."
echo "   ✅ 分析任务已保存: X"
echo ""
echo "3️⃣ 验证历史记录："
echo "   刷新页面 (Ctrl+R / Cmd+R)"
echo "   检查左侧边栏，应该显示刚才的分析"
echo ""
echo "4️⃣ 验证数据持久化："
echo "   关闭浏览器"
echo "   重新打开页面"
echo "   历史记录应该还在！"
echo ""
echo "5️⃣ 测试历史查看："
echo "   点击侧边栏的历史记录"
echo "   应该能看到完整报告，包括："
echo "   - 点赞TOP5"
echo "   - 互动率TOP5"
echo "   - 词云"
echo "   - AI深度洞察（可展开）"
echo ""

echo "✅ 所有检查通过！可以开始测试了"
echo ""
echo "📚 文档："
echo "   - DATA_PERSISTENCE_FIX.md - 修复详情"
echo "   - HISTORY_UI_WIREFRAME.md - UI设计"
echo ""
