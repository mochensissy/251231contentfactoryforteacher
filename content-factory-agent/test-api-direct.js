// 测试第三方API
const API_KEY = 'JZL34baea50c020a325'
const API_URL = 'https://www.dajiala.com/fbmain/monitor/v3/kw_search'

async function testAPI() {
  const requestBody = {
    kw: "Gemini",
    sort_type: 1,
    mode: 1,
    period: 7,
    page: 1,
    key: API_KEY,
    any_kw: '',
    ex_kw: '',
    verifycode: '',
    type: 1,
  }

  console.log('发送请求:', JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('响应状态:', response.status)
    console.log('响应头:', Object.fromEntries(response.headers.entries()))

    const text = await response.text()
    console.log('原始响应文本:', text)

    try {
      const data = JSON.parse(text)
      console.log('解析后的JSON:', JSON.stringify(data, null, 2))
    } catch (e) {
      console.error('无法解析JSON:', e.message)
    }
  } catch (error) {
    console.error('请求失败:', error)
  }
}

testAPI()
