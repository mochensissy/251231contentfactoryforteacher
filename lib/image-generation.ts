
export interface GenerateImageOptions {
    apiKey: string;
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    model?: string;
}

export async function generateImagewithDashscope(options: GenerateImageOptions): Promise<string> {
    const { apiKey, prompt, negativePrompt, width = 1024, height = 576, model = 'wanx2.1-t2i-turbo' } = options;
    const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';

    // 1. Submit Task
    const submitResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
            model,
            input: {
                prompt,
                negative_prompt: negativePrompt || '低质量, 模糊, 变形, 丑陋, 水印, 文字',
            },
            parameters: {
                size: `${width}*${height}`,
                n: 1,
                seed: Math.floor(Math.random() * 2147483647),
            }
        }),
    });

    if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`阿里云图片生成提交失败: ${submitResponse.status} - ${errorText}`);
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.output?.task_id;

    if (!taskId) {
        throw new Error('阿里云图片生成未返回任务ID');
    }

    // 2. Poll for results
    const taskStatusUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const statusResponse = await fetch(taskStatusUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!statusResponse.ok) {
            attempts++;
            continue;
        }

        const statusData = await statusResponse.json();
        const taskStatus = statusData.output?.task_status;

        if (taskStatus === 'SUCCEEDED') {
            const images = statusData.output?.results?.map((r: { url: string }) => r.url) || [];
            if (images.length > 0) {
                return images[0];
            }
            throw new Error('任务成功但未返回图片');
        } else if (taskStatus === 'FAILED') {
            throw new Error(`图片生成任务失败: ${statusData.output?.message || '未知错误'}`);
        }

        attempts++;
    }

    throw new Error('图片生成任务超时');
}

export async function generateImageWithSiliconFlow(options: GenerateImageOptions): Promise<string> {
    const { apiKey, prompt, width = 1024, height = 576, model = 'black-forest-labs/FLUX.1-schnell' } = options;
    const apiUrl = 'https://api.siliconflow.cn/v1/images/generations';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            prompt,
            image_size: `${width}x${height}`,
            num_inference_steps: 20,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SiliconFlow图片生成失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // SiliconFlow API returns images in 'images' array (new format) or 'data' array (old format)
    const images = data.images || data.data;

    if (images && images.length > 0) {
        return images[0].url;
    }

    throw new Error('SiliconFlow未返回图片URL');
}
