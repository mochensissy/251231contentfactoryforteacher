/**
 * 测试图片生成功能
 * 测试完整的流程：文章生成 -> AI生成提示词 -> 可灵模型生成图片
 */

async function testImageGeneration() {
  console.log('🧪 开始测试图片生成功能...\n')

  const testData = {
    topic: 'AI技术在内容创作中的应用',
    description: '探讨人工智能如何改变内容创作的方式，包括文字生成、图片生成等方面',
    wordCount: '500-800',
    style: 'professional',
    imageCount: 3, // 测试生成3张图片
  }

  console.log('📋 测试参数:')
  console.log(`   - 选题: ${testData.topic}`)
  console.log(`   - 字数: ${testData.wordCount}`)
  console.log(`   - 风格: ${testData.style}`)
  console.log(`   - 配图: ${testData.imageCount}张\n`)

  try {
    console.log('🚀 调用内容生成API...')
    const startTime = Date.now()

    const response = await fetch('http://localhost:3002/api/content-generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API调用失败: ${response.status} - ${errorData.error}`)
    }

    const result = await response.json()
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`\n✅ 测试成功！总耗时: ${duration}秒\n`)

    // 输出结果
    console.log('📊 生成结果:')
    console.log(`   - 标题: ${result.data.title}`)
    console.log(`   - 摘要: ${result.data.summary.slice(0, 100)}...`)
    console.log(`   - 内容长度: ${result.data.content.length}字符`)
    console.log(`   - 生成图片数量: ${result.data.images.length}张\n`)

    console.log('🖼️  生成的图片URL:')
    result.data.images.forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`)
    })

    console.log('\n📝 文章内容预览:')
    console.log(result.data.content.slice(0, 500))
    console.log('...\n')

    // 检查图片是否成功插入到文章中
    const imageMatches = result.data.content.match(/!\[.*?\]\((https?:\/\/.*?)\)/g)
    console.log(`✅ 文章中成功插入了 ${imageMatches ? imageMatches.length : 0} 张图片`)

    return true

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    console.error(error)
    return false
  }
}

// 运行测试
testImageGeneration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
